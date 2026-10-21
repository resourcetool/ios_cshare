import { describe, expect, it } from 'vitest';
import { upcomingEvents } from '../src/services/calendarService';
import type { Assignment } from '../src/types';

const base = (over: Partial<Assignment>): Assignment => ({
  id: 'a1',
  weekId: '2026-10-26',
  title: 'Bible Reading',
  description: '',
  category: 'Treasures',
  location: 'Hall',
  date: '2026-10-28',
  startTime: '19:10',
  startAt: new Date(2026, 9, 28, 19, 10),
  assigneeIds: ['u1'],
  assigneeNames: { u1: 'Ama' },
  childAssignees: [],
  requiresQualification: false,
  status: 'scheduled',
  responses: {},
  reminderOffsetsMinutes: [4320, 1440],
  sortOrder: 1,
  createdBy: 'admin',
  updatedBy: 'admin',
  ...over,
});

const settings = { midweekName: 'Midweek Meeting', weekendName: 'Weekend Meeting' };
const now = new Date(2026, 9, 21, 12, 0);

describe('upcomingEvents', () => {
  it('includes a scheduled upcoming part with its alerts', () => {
    const [e] = upcomingEvents([base({})], 'u1', settings, [], true, now);
    expect(e.uid).toBe('a1');
    expect(e.title).toBe('CSHARE: Bible Reading');
    expect(e.alarms).toEqual([4320, 1440]);
  });

  it('leaves out alerts when switched off', () => {
    const [e] = upcomingEvents([base({})], 'u1', settings, [], false, now);
    expect(e.alarms).toEqual([]);
  });

  it('skips cancelled, declined, other people and finished parts', () => {
    const list = [
      base({ id: 'c', status: 'cancelled' }),
      base({ id: 'd', responses: { u1: { status: 'cannot_do', at: new Date() } } }),
      base({ id: 'o', assigneeIds: ['u2'] }),
      base({ id: 'p', date: '2026-10-01', startAt: new Date(2026, 9, 1, 19, 10) }),
      base({ id: 'ok' }),
    ];
    expect(upcomingEvents(list, 'u1', settings, [], true, now).map(e => e.uid)).toEqual(['ok']);
  });

  it('uses the meeting start time from the sheet', () => {
    const weeks = [{ id: '2026-10-26', startDate: '2026-10-26', endDate: '2026-11-01', sheets: { midweek: { title: '', date: '2026-10-28', startTime: '19:00', program: [] } } }];
    const [e] = upcomingEvents([base({ meeting: 'midweek' })], 'u1', settings, weeks, true, now);
    expect(e.startMs).toBe(new Date(2026, 9, 28, 19, 0).getTime());
    expect(e.description).toContain('Midweek Meeting');
  });
});
