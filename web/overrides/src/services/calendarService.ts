import AsyncStorage from '@react-native-async-storage/async-storage';
import { Assignment, AppSettings, Week } from '../types';
import { eventFor } from '../utils/calendarPlan';
import { buildIcs, IcsEvent } from '../utils/ics';
import { logError } from '../utils/errors';

/**
 * iPhone version. A web app cannot write to the iPhone calendar by itself. Instead CSHARE builds a
 * standard calendar file (.ics) with the same title, time, notes and alerts the Android app puts in
 * its calendar. The person adds it with one tap. Every event has a fixed id, so adding the file again
 * later updates the events instead of duplicating them. There is no automatic background sync.
 */

export interface DeviceCalendar {
  id: number;
  name: string;
  account: string;
}

export interface CalendarPrefs {
  enabled: boolean;
  calendarId?: number;
  /** include the calendar's own alerts in the file */
  alerts: boolean;
}

const PREFS_KEY = 'cshare.calprefs.v1';

export async function getCalendarPrefs(): Promise<CalendarPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return { enabled: false, alerts: true, ...(JSON.parse(raw) as Partial<CalendarPrefs>) };
  } catch {
    // defaults
  }
  return { enabled: false, alerts: true };
}

export async function setCalendarPrefs(p: CalendarPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// Kept so shared code compiles; there is no device calendar API on the web.
export async function hasCalendarPermission(): Promise<boolean> {
  return false;
}
export async function requestCalendarPermission(): Promise<boolean> {
  return false;
}
export async function listCalendars(): Promise<DeviceCalendar[]> {
  return [];
}
export async function syncCalendar(_a: Assignment[], _uid: string, _s: Pick<AppSettings, 'midweekName' | 'weekendName'>, _w: Week[] = []): Promise<void> {}
export async function clearCalendar(_uid: string): Promise<void> {}

// ---------------------------------------------------------------- the calendar file

function toIcsEvent(a: Assignment, meetingName: string | undefined, meetingStartTime: string | undefined, alerts: boolean): IcsEvent {
  const spec = eventFor(a, { meetingName, meetingStartTime, alerts });
  return { uid: a.id, title: spec.title, description: spec.description, location: spec.location, startMs: spec.startMs, endMs: spec.endMs, alarms: spec.alarms };
}

/** Same selection rules as the Android calendar sync: scheduled, not declined, not already over. */
export function upcomingEvents(
  assignments: Assignment[],
  uid: string,
  settings: Pick<AppSettings, 'midweekName' | 'weekendName'>,
  weeks: Week[],
  alerts: boolean,
  now: Date = new Date(),
): IcsEvent[] {
  const out: IcsEvent[] = [];
  for (const a of assignments) {
    if (!a.assigneeIds.includes(uid) || a.status !== 'scheduled') continue;
    if (a.responses[uid]?.status === 'cannot_do') continue;
    const sheet = a.meeting ? weeks.find(w => w.id === a.weekId)?.sheets[a.meeting] : undefined;
    const meetingName = a.meeting ? (a.meeting === 'weekend' ? settings.weekendName : settings.midweekName) : undefined;
    const e = toIcsEvent(a, meetingName, sheet?.startTime?.trim() || undefined, alerts);
    if (e.startMs < now.getTime() - 3600000) continue;
    out.push(e);
  }
  return out.sort((x, y) => x.startMs - y.startMs);
}

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled';

/** Hands the file to iOS: the share sheet when Safari allows files, otherwise a download link. */
export async function deliverIcs(text: string, fileName: string): Promise<DeliverResult> {
  const file = new File([text], fileName, { type: 'text/calendar' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'CSHARE' });
      return 'shared';
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return 'cancelled';
      logError('share calendar file', e);
      // fall back to a download below
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}

export async function exportUpcoming(
  assignments: Assignment[],
  uid: string,
  settings: Pick<AppSettings, 'midweekName' | 'weekendName'>,
  weeks: Week[],
  alerts: boolean,
): Promise<{ count: number; result?: DeliverResult }> {
  const events = upcomingEvents(assignments, uid, settings, weeks, alerts);
  if (events.length === 0) return { count: 0 };
  return { count: events.length, result: await deliverIcs(buildIcs(events), 'cshare-assignments.ics') };
}

export type AddToPhoneResult =
  | { ok: true; calendarName: string; result: DeliverResult }
  | { ok: false; reason: 'unsupported' | 'permission_denied' | 'no_calendar' | 'error' };

/** "Add to phone" for one assignment. */
export async function addAssignmentToDeviceCalendar(
  a: Assignment,
  _uid: string,
  meetingName: string | undefined,
  meetingStartTime?: string,
): Promise<AddToPhoneResult> {
  try {
    const result = await deliverIcs(buildIcs([toIcsEvent(a, meetingName, meetingStartTime, true)]), 'cshare-assignment.ics');
    return { ok: true, calendarName: 'Calendar', result };
  } catch (e) {
    logError('add to phone calendar', e);
    return { ok: false, reason: 'error' };
  }
}
