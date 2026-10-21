# CSHARE → iPhone: Phase 1 Audit and Phase 2 Parity Plan

Source audited: `cshare-main.zip` (143 files, about 12,200 lines in `src/` plus rules, one Cloud Function and the Android project).
Nothing in the original project has been modified. This file lives in a separate directory.

## 1. Verdict in five lines

1. CSHARE is a **React Native 0.76 + TypeScript + Firebase** app (Auth, Firestore, FCM). There is **no custom backend**. All business logic is client-side plus Firestore rules.
2. A PWA port with high visual and functional fidelity is **feasible by running the existing code through React Native Web**. About 85% of `src/` (types, services, utils, screens, theme) can be reused unchanged. Only about 16 files touch Android-only APIs.
3. The Firebase backend and data model need **no change** for sign-in, assignments, weekly sheets, reports, groups, people management and settings. Offline reading and queued writes work through Firestore's IndexedDB cache.
4. **Three things cannot be matched on iPhone**: Android alarm-based reminders that ring with the app closed, the call-style full-screen alert, and background sync. The closest reliable substitutes are described in section 6.
5. **I could not install packages, type-check, run tests or build in this sandbox.** The network policy blocks `registry.npmjs.org` (HTTP 403 on CONNECT). Everything below is from reading the source. Nothing has been executed.

## 2. Architecture inventory (verified in code)

| Area | What the code does | Files |
|---|---|---|
| Framework | React Native 0.76.9, React 18.3.1, TypeScript 5.0.4, bare RN (not Expo at runtime; `app.json` has an `expo` key but no Expo packages) | `package.json`, `index.js` |
| Navigation | React Navigation 7. Root switch on auth state. Bottom tabs plus native stack, one navigator per role | `src/navigation/*` |
| State | Two contexts (`AuthContext`, `AppDataContext`), a `useLive` hook wrapping Firestore `onSnapshot`, `ThemeContext` (light/dark/system, saved in AsyncStorage) | `src/context/*`, `src/hooks/*` |
| Auth | Firebase email + password. Signup password policy: 10+ characters, upper, lower, digit, special, no spaces. Password reset email | `authService.ts`, `AuthScreen.tsx` |
| Offline | Firestore persistence on. `commit()` waits 4 s, then reports "queued" instead of freezing, and throws real errors such as permission denied | `firebase.ts`, `commit.ts` |
| Reminders | Notifee exact alarms scheduled on the phone, up to 3 per assignment, 60-day window, plus report reminders. Optional call-style final reminder via `CallActivity.kt` | `notificationService.ts`, `utils/reminders.ts`, `android/` |
| Background | `react-native-background-fetch` headless task, FCM data push handler, "announce new assignment" | `backgroundSync.ts`, `index.js` |
| Calendar | Android `CalendarModule.kt`: continuous one-way sync plus per-assignment "Add to phone" | `calendarService.ts`, `utils/calendarPlan.ts` |
| Server code | One optional Cloud Function file: silent push on assignment change, push to admin on "can't do", push to group overseer on new report | `functions/src/index.ts` |
| Email | EmailJS REST call straight from the client (public key, service id and template id are hard-coded) | `emailService.ts` |
| Tests | 86 Jest tests across 8 files for pure logic, plus 34 rules tests (Firestore emulator) | `__tests__/`, `tests/rules/` |
| CI | One manual GitHub workflow: unpack zip, build APK | `.github/workflows/cshare.yml` |
| Theme | Teal palette, light and dark, 52 px touch targets, radii 7/10/14, text styles title 25, heading 18, body 16, small 14 | `src/theme.ts`, `components/ui.tsx` |

### Firestore data model (collections used by the code)

| Collection | Key fields | Who writes (per repo rules) |
|---|---|---|
| `users/{uid}` | name, email, phone, role (`admin`/`user`), active, developer, secretary, qualifications[], reportingType, groupId, dependents[], notificationPreferences, fcmTokens[], approvedAt, appVersion, lastActiveAt | Self create (inactive only). Self update limited fields. Admin updates the rest |
| `assignments/{id}` | weekId, typeId, requiredRole, meeting, title, date, startTime, endTime, startAt, assigneeIds[], assigneeNames{}, childAssignees[], status, responses{uid→{status,at,reason,adminId}}, reminderOffsetsMinutes[], sortOrder | Admin full. Assignee may change only their own `responses.{uid}` |
| `weeks/{YYYY-MM-DD Monday}` | midweek{title,date,startTime,program[]}, weekend{…}, startDate, endDate | Admin |
| `assignmentTypes/{id}` | name, category, kind, minutes, people, icon, meeting, requiredRole, active, sortOrder … | Admin |
| `settings/app`, `settings/update` | meeting days/times, names, minutes format, categories, reminder offsets, pioneer hour references; app update config | Admin (see finding F2) |
| `reports/{uid}_{YYYY-MM}` | uid, monthKey, reportingType, groupId, reporterName, participated, hours, bibleStudies, submittedAt | Create by owner (id must equal `uid_month`). Update by admin only. Delete never |
| `serviceEntries/{uid}/entries/{date}` | date, monthKey, hours, bibleStudies | **No rule in the repo** (finding F1) |
| `groups/{id}` | name, overseerId, sortOrder | Admin |

### Roles and permissions (code and rules agree unless noted)

| Role | How set | Can do |
|---|---|---|
| New user | Self sign-up | Sees "Waiting for approval". Nothing else |
| Active user | Admin approves | Own assignments, "seen" and "can't do" answers, own report, week sheets (current week onward), admin contact details |
| Admin | `role: admin` | Everything: people, qualifications, types, sheets, settings, groups, emergency email, all reports |
| Secretary | admin plus `secretary: true` | Views and edits all groups' monthly reports (UI gate). Rules treat as admin |
| Group overseer | `groups/{id}.overseerId == uid` | Reads reports whose `groupId` is their group |
| Developer | `developer: true` | Sees the "App update" section in Settings (UI gate only, see F2) |

## 3. Feature parity matrix

Legend: **R** = reused as is via React Native Web. **S** = reused with a web shim or `.web.tsx` override (Android files untouched). **N** = new iPhone-specific replacement. **L** = documented limitation.

| # | Feature (original screen) | Roles | Firestore | Offline behaviour | iPhone approach | Expected parity | Test needed |
|---|---|---|---|---|---|---|---|
| 1 | Sign in, create account, forgot password (`AuthScreen`) | all | Auth, `users` | First sign-in needs internet. Session persists | R plus Firebase JS Auth with IndexedDB persistence | Full | Emulator: sign-in, bad password, persistence after reload |
| 2 | Profile setup (`SetupProfileScreen`) | new user | `users` create | Needs internet once | R | Full | Rules test already exists. Re-run |
| 3 | Waiting, turned off, needs internet, profile loading (`StatusScreens`) | new user | `users` | Uses `fromCache` flag | R. Needs `metadata.fromCache` to behave the same in JS SDK | Full, verify | Emulator |
| 4 | User Home: greeting, report card, group report card, upcoming assignments (`HomeScreen`, `MyAssignments`) | user | `assignments`, `groups`, `reports` | Cached listeners | R | Full | Render test, role gate test |
| 5 | My Week: my parts, midweek sheet, weekend sheet, week navigation, public-talk name masking (`MyWeekScreen`, `WeekNav`, `ProgramSheet`) | user | `weeks`, `assignments` | Weeks −2…+26 cached | R. `WeekNav` date picker → web date input (S) | Full | Mask test for publisher vs elder |
| 6 | Assignment detail: seen, status, co-assignees, instructions (`AssignmentDetailScreen`) | assignee | `assignments.responses.{uid}` | Queued write | R | Full | Rules plus write-queue test |
| 7 | "I can't do this": reason, choose admin, call or text (`CantDoScreen`, `contact.ts`) | assignee | `assignments.responses`, `users` (admins) | Queued write | R. `tel:` and `sms:` links work in Safari. `Alert` replaced (S) | Full | Emulator |
| 8 | Add to phone calendar (single assignment) | assignee | none | n/a | N: generate `.ics` file with alarms, opens in iOS Calendar | **Partial (L)** | Manual on iPhone |
| 9 | Phone calendar continuous sync (`calendarService`) | assignee | none | n/a | **Not possible on web (L)** | None | — |
| 10 | Local reminders (3 per assignment, 60-day window) | assignee | `weeks` for meeting start | Rings offline, app closed | **Not possible on iOS web (L).** Options in section 6 | Partial at best | Manual on iPhone |
| 11 | Call-style full-screen final reminder (`CallActivity`) | assignee | none | Works offline | **Impossible on iOS (L)** | None | — |
| 12 | Background sync and "New assignment" announcements | assignee | `assignments` | Runs every ~15 min | **Impossible on iOS web (L).** Replaced by sync on open and optional web push | Partial | Manual on iPhone |
| 13 | Contact admin (`ContactAdminScreen`) | user | `users` (active admins) | Cached | R | Full | Render |
| 14 | Settings for users: appearance, reminder prefs, calendar, my details, sign out (`ProfileScreen`, `ProfileSections`) | user | `users` self fields | Queued write | R. Reminder and calendar sections change to the iPhone options (S) | Full except 9, 10, 11 | Render, rules |
| 15 | Monthly report, publisher: yes/no plus Bible studies (`MyReportScreen`) | user | `reports` | Queued create | R | Full | Duplicate-id test, validation test |
| 16 | Monthly report, pioneer: daily hours and studies table, edit, month total, past months (`MyReportScreen`) | user | `serviceEntries`, `reports` | Queued | R. Live rules allow `serviceEntries` (F1 resolved) | Full, unverified | Emulator |
| 17 | Group monthly report, overseer and secretary views, unassigned reports, edit (`GroupReportScreen`) | overseer, secretary, admin | `reports`, `groups` | Cached | R | Full | Rules test already covers. Add UI role test |
| 18 | Admin Dashboard: attention list, "hasn't confirmed yet", upcoming, quick access (`DashboardScreen`) | admin | `assignments` | Cached | R | Full | Render |
| 19 | Admin Week sheet editor: start sheet, edit lines, add, remove, suggest people, delete sheet, change meeting details (`WeekScreen`, `RowEditorModal`, `MeetingDetailsModal`, `autoAssign`) | admin | `weeks`, `assignments` batch | Queued | R. `confirmAsync` replaced (S) | Full | autoAssign tests exist. Add batch-write test |
| 20 | Planner and date jump (`Planner`, `WeekNav`) | admin | `weeks` | Cached | R plus web date input (S) | Full | Render |
| 21 | Share sheet as text, Print / PDF (`SheetActions`) | admin | none | n/a | N: Web Share API and `window.print()` | Close | Manual on iPhone |
| 22 | People list, filters, search, approve, role, secretary, qualifications, reporting type, group, children without phones (`PeopleScreen`, `PersonEditScreen`) | admin | `users` | Queued | R | Full | Rules tests exist |
| 23 | Ministry groups, overseer, members (`GroupsScreen`, `GroupEditScreen`) | admin | `groups`, `users` | Queued | R | Full | Rules tests exist |
| 24 | Assignment types editor (`TypeEditScreen`) | admin | `assignmentTypes` | Queued | R | Full | Render |
| 25 | Settings (meetings, language template load, sections, hour references, reminders) (`SettingsScreen`) | admin | `settings`, `assignmentTypes` batch | Queued | R | Full | Batch-delete test (destructive, emulator only) |
| 26 | Emergency email to all, groups or specific people, via EmailJS (`EmergencyEmailScreen`) | admin | `users`, `groups` | Needs internet | R. Browser `fetch` to EmailJS | Full, verify CORS | Manual with a test address |
| 27 | App update notice and developer update controls (`AppUpdateNotice`) | all / developer | `settings/update` | Cached | S: APK link is meaningless on iPhone. Hide the notice on iOS | n/a | — |
| 28 | Offline banner, "Synced" flash, pull to refresh (`OfflineBanner`, `useOnlineStatus`, `Screen`) | all | none | n/a | S: `navigator.onLine` plus Firestore snapshot metadata. iOS `onLine` is unreliable, so I will also use listener errors and pending-write state | Close | Manual offline test on iPhone |
| 29 | Light, dark, system theme | all | none | n/a | S: localStorage in place of AsyncStorage | Full | Render |
| 30 | Safe areas, keyboard, scroll, touch targets | all | none | n/a | N: viewport meta, `env(safe-area-inset-*)`, standalone display | Close | Manual on iPhone |
| 31 | Push to overseers and admins ("can't do", new report) | admin, overseer | `users.fcmTokens` | Needs internet | **Requires backend change (L)**: web FCM token plus VAPID key plus function edits | Not in scope without approval | — |

Parity categories, kept separate as the prompt requires:

- **Visual parity:** high. Same components and tokens, rendered by React Native Web. Small differences expected in font rendering, the native Switch control and tab bar behaviour.
- **Functional parity:** full for items 1–7, 13–29 once verified. Partial for 8, 12 and 21. None for 9–11.
- **Backend compatibility:** unchanged collections, field names, ids and types. Android and iPhone share data.
- **Offline parity:** reading and queued writes yes. Alarms and background fetch no.
- **Native-platform parity:** not claimed.

## 4. Findings in the original project (not changed, you should know)

| ID | Finding | Risk |
|---|---|---|
| **F1** | `firestore.rules` in the repo had **no rule for `serviceEntries`**. **Resolved:** the live rules you sent include it (owner-only, pioneers only, hours ≤ 24). The repo copy is stale | None for the iPhone port. Consider updating the repo copy |
| **F2** | `updateService.ts` says "Firestore rules enforce that" only a developer can write `settings/update`. **Both repo and live rules allow any admin** to write `settings/{docId}` | An admin could publish a fake update link. UI gate only. Suggested fix is in `web/README_IPHONE.md`, not applied |
| **F3** | Live rules also allow `groupId: null` on reports; the repo copy does not | Repo copy is stale. Live rules are what matter |
| **F4** | EmailJS service id, template id and public key are hard-coded in client code | Public keys are designed to be exposed, but anyone can call the template. Consider EmailJS domain restrictions |
| **F5** | `.firebaserc` holds a placeholder project id | Web config received (`cshare-2fac4`) and used in `web/shims/firebaseApp.ts` |
| **F6** | `README` states the Android build, Firestore rules and Cloud Function were never run in the original sandbox | Your Android app works in production, but the repo's own verification table is old |
| **F7** | Older memory notes describe CSHARE as SQLite + PostgreSQL + REST. The code you sent is Firebase only. I treat **the code as the source of truth** | None, flagging the mismatch |

## 5. Recommended architecture

**React Native Web in a separate `web/` folder**, importing the existing `src/` unchanged.

- Bundler: Vite or webpack with `react-native-web`, resolving `.web.ts` and `.web.tsx` first. Android's Metro build ignores `.web.*` files, so **the Android app is untouched**.
- Firebase: alias `@react-native-firebase/{app,auth,firestore,messaging}` to thin adapters over the Firebase JS SDK **compat** API. It has the same namespaced shape the services already use (`collection().where().onSnapshot`, `FieldValue.serverTimestamp`, `Timestamp`, `FieldPath.documentId`, `batch`, `metadata.fromCache`). This avoids rewriting any service.
- Shims: `notifee`, `background-fetch`, `sound` → no-op or web equivalents. `netinfo` → `navigator.onLine` plus Firestore state. `AsyncStorage` → `localStorage`. `datetimepicker` → `<input type=date|time>`. `Alert` (a no-op in React Native Web) → in-app confirm dialog. `Share` and `react-native-print` → Web Share and print.
- PWA: manifest, apple-touch icons, standalone display, service worker caching the app shell, offline fallback page.
- Hosting: GitHub Pages (free, fits your phone and GitHub workflow) or Firebase Hosting (same project). Needs HTTPS and the host added to Firebase Auth **Authorized domains**.
- CI: a new manual GitHub Actions workflow runs install, `tsc`, Jest, rules tests on the emulator, web build, then deploys. This is where all verification will happen, since my sandbox cannot reach npm.

Why not a rewrite in plain React: it would duplicate about 8,000 lines of working logic and screens, and visual parity would drift.

## 6. iPhone platform limits (honest list)

| Android capability | iPhone PWA reality | Closest reliable alternative |
|---|---|---|
| Alarms that ring offline, app closed | iOS web apps **cannot schedule local notifications** | (a) "Add to Calendar" `.ics` per assignment with alerts. iOS Calendar fires them offline, but it is manual and does not update itself. (b) Web Push (iOS 16.4+, installed to Home Screen, permission asked after a tap). It needs a **scheduled Cloud Function** (Blaze plan) plus a VAPID key. That is a backend change needing your approval |
| Call-style full-screen ring | Not available | Normal push, if (b) is approved |
| Background sync every ~15 min | Not available. Service workers cannot poll reliably on iOS | Sync on open, plus push if (b) |
| Continuous calendar sync | Not available | `.ics` per assignment only |
| Sign-in shared between Safari and the installed app | Storage is **separate**. You sign in again after installing | Documented in install steps |
| Offline cache durability | Installed Home Screen apps are generally exempt from Safari's 7-day script-storage cap. **I have not verified this on a device** | Verify on a real iPhone |

## 7. What I verified, and what I could not

| Check | Status |
|---|---|
| Read all services, auth, navigation, theme, contexts, user and shared screens, UI kit, notification, calendar, background sync entry points, Cloud Function, rules | Done |
| Skimmed admin screens for features and gates (headings, buttons, confirmations, role toggles). Did not read every line of `WeekScreen`, `EmergencyEmailScreen` and `MyReportScreen` | Partial. I will read them in full before shimming |
| `npm install`, `tsc`, ESLint, Jest, rules tests, any build | **Not run.** `registry.npmjs.org` is blocked in this sandbox (proxy policy 403) |
| Anything on a real iPhone | **Not possible here** |

## 8. Phases from here

| Phase | Output | Status |
|---|---|---|
| 1 Audit | This document | Done |
| 2 Parity plan | Sections 3, 5, 6 | Done, needs your decisions |
| 3 Baseline | Original untouched. All work in `web/` and `.github/workflows/web.yml` | Done |
| 4 Implementation | Adapters, shims, PWA shell, overrides. See `web/README_IPHONE.md` | **Written, not yet compiled** |
| 5–6 Integration and tests | CI: typecheck, Jest, rules emulator, build. Extra tests for adapters, confirm dialog, role gating, queued-write state | Runs in GitHub Actions |
| 7 Deployment | Pages or Hosting workflow, install steps for iPhone | After 6 |
| 8 Final audit | Matrix with real test evidence | After 7 |

## 9. What I need from you

1. **Your Firebase web config** (Firebase console → Project settings → Your apps → Add app → Web). These values are public identifiers, not secrets.
2. **Your live Firestore rules** (console → Firestore → Rules), pasted or exported, to resolve F1 to F3.
3. **Decisions** on hosting and on iPhone reminders (section 6).
4. Confirmation that the Firebase **Authorized domains** list can get the new web host added. This is a console setting, not a rules change.
