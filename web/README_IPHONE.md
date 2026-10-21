# CSHARE on iPhone (installable web app)

The Android app's own `src/` code, built for the web with React Native Web. Nothing in `src/`, `android/`,
`functions/` or the Firebase project is changed by this folder. Android and iPhone use the same Firebase
project (`cshare-2fac4`), the same collections and the same accounts.

**Status: written but not yet built or tested.** The sandbox it was written in cannot reach npm, so the first
GitHub Actions run is the first time it is compiled. Expect to fix small build errors on that first run.

## What is in here

| Path | Purpose |
|---|---|
| `scripts/prepare.mjs` | Copies `../src` to `web/src` and lays `overrides/src` on top. Edits to shared screens are exact-match patches that fail loudly if the Android source changed |
| `overrides/src/` | The only iPhone-specific app code: calendar file export, no-op notification and background modules, Safari date pickers, settings text |
| `shims/` | `react-native` → react-native-web plus Alert/Share/Linking replacements; `@react-native-firebase/*` → Firebase JS SDK; storage, network status, print |
| `shims/firebaseApp.ts` | Your Firebase web config (public identifiers) |
| `public/` | Web manifest, service worker, icons (drawn from the Android launcher icon) |
| `reference/live-firestore.rules` | Copy of the live rules you sent. Not deployed by anything here |
| `../.github/workflows/web.yml` | Manual workflow: tests, build, optional Pages deploy |

## Deploy (all from GitHub in a browser)

1. Add the `web/` folder and `.github/workflows/web.yml` to the **root** of your CSHARE repository (next to `src/`).
2. Repository **Settings → Pages → Source: GitHub Actions**.
3. **Actions → CSHARE iPhone (web app) → Run workflow → `build-and-test`**. Fix anything it reports, then run again with **`deploy`**. The workflow prints the site address (`https://<you>.github.io/<repo>/`).
4. Firebase console → **Authentication → Settings → Authorized domains → Add domain** `<you>.github.io`. Without this, sign-in fails on the site. This is a console setting, not a rules change.
5. Recommended: Google Cloud console → APIs & Services → Credentials → your web API key → restrict to HTTP referrer `https://<you>.github.io/*`.

## Install on an iPhone

1. Open the site address in **Safari** (not Chrome or another browser).
2. Tap **Share → Add to Home Screen → Add**.
3. Open CSHARE from the Home Screen icon and **sign in again**. The Home Screen app does not share Safari's sign-in or saved data.
4. Open it once with internet so your information is saved. After that it opens offline.

## Rollback

Android and production data are not touched, so rollback is only about the web copy: **Settings → Pages → Unpublish site**, or delete `web/` and `web.yml`. Users can delete the Home Screen icon.

## How it differs from Android (by design)

| Android | iPhone |
|---|---|
| Alarm reminders ring offline with the app closed | Not possible for web apps on iOS. "Add to Calendar" files carry the same alerts, and the iPhone Calendar app does the reminding |
| Call-style full-screen alert | Not available |
| Background sync every ~15 minutes | None. Data syncs live while the app is open |
| Calendar sync runs by itself | You tap **Add my upcoming assignments to Calendar** again after changes. Same event ids, so events update rather than duplicate |
| APK update notice | Hidden |
| Push to admins and overseers | Not included (needs backend changes you have not approved) |

## Not yet verified (needs your iPhone)

- Build and tests (first Actions run).
- Sign-in persistence and offline opening from the Home Screen icon.
- Queued writes made offline reaching Firestore after reconnecting.
- Share sheet and `.ics` import into Calendar; Print/PDF from Safari.
- Safe areas, keyboard behaviour, tab bar, dark mode.
- EmailJS sending from the browser (Emergency email).

## Suggested rules change (NOT applied, for your decision)

Your live rules let **any admin** write `settings/update` (the developer-only app update setting). To limit it to developers:

```
match /settings/{docId} {
  allow read: if isActive();
  allow write: if isAdmin() && docId != 'update';
}
match /settings/update {
  allow read: if isActive();
  allow write: if isAdmin() && myProfile().get('developer', false) == true;
}
```
Test it on the Firestore emulator first. This is unrelated to the iPhone app.

## Hosting on Vercel (instead of GitHub Pages)

Vercel project settings: **Root Directory = `web`**, keep "Include source files outside of the Root Directory" ON (the build reads `../src`). `web/vercel.json` sets install, build and output. Then add `<project>.vercel.app` to Firebase Authentication → Authorized domains.
