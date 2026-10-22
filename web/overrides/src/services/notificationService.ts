import { Assignment } from '../types';

/**
 * iPhone version. iOS does not let a web app schedule local notifications or ring alarms while it
 * is closed, so the Android alarm machinery (Notifee) is not part of this build. Reminders on iPhone
 * come from the calendar file (see calendarService) and from the "Upcoming assignments" list.
 * Every function below keeps the signature the shared screens call, and does nothing on purpose.
 */

export interface ReminderCapability {
  notifications: boolean;
  exactAlarms: boolean;
}

export interface SyncResult {
  scheduled: number;
  blocked?: 'notifications';
}

export async function ensureChannels(): Promise<void> {}

// Reported as available so the Android-only "turn on reminders" warnings never appear on iPhone.
export async function getReminderCapability(): Promise<ReminderCapability> {
  return { notifications: true, exactAlarms: true };
}

export async function requestNotificationPermission(): Promise<boolean> {
  return true;
}

export async function openNotificationSettings(): Promise<void> {}
export async function openExactAlarmSettings(): Promise<void> {}

export async function syncLocalReminders(_a: Assignment[], _uid: string, _o: { remindersEnabled: boolean; callStyle: boolean }): Promise<SyncResult> {
  return { scheduled: 0 };
}

export async function cancelAllLocalReminders(): Promise<void> {}

export async function syncReportReminder(_dates: Date[], _monthKey: string, _done: boolean, _o: { remindersEnabled: boolean; callStyle: boolean }): Promise<void> {}

export async function scheduleTestReminder(_callStyle: boolean, _seconds = 8): Promise<void> {}

export function listenForNotificationPress(_onOpen: (assignmentId: string) => void, _onGroupOpen?: (groupId: string) => void): () => void {
  return () => {};
}

export async function getLaunchNotificationData(): Promise<Record<string, unknown> | undefined> {
  return undefined;
}

export async function registerPush(_uid: string, _onData: (data: { [k: string]: string | object } | undefined) => void): Promise<() => void> {
  return () => {};
}

export async function unregisterPush(_uid: string): Promise<void> {}
