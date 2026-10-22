import { Assignment } from '../types';

/** iPhone version: iOS web apps have no background fetch. Data syncs live while the app is open. */

export type PushData = { [key: string]: string | object } | undefined;

export async function announceNew(_a: Assignment[], _uid: string, _enabled: boolean, _callStyle: boolean): Promise<void> {}
export async function runBackgroundSync(): Promise<void> {}
export async function handlePush(_data: PushData): Promise<void> {}
export async function startBackgroundSync(): Promise<void> {}
