import { describe, expect, it } from 'vitest';
import { buildIcs, icsDate, icsEscape, icsFold } from '../overrides/src/utils/ics';

describe('ics', () => {
  it('formats UTC dates', () => {
    expect(icsDate(Date.UTC(2026, 9, 21, 7, 5, 9))).toBe('20261021T070509Z');
  });

  it('escapes special characters', () => {
    expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
  });

  it('folds long lines at 75 bytes without splitting characters', () => {
    const long = 'SUMMARY:' + 'ɔ'.repeat(80);
    const folded = icsFold(long);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n ').join('')).toBe(long);
  });

  it('writes events with alarms and CRLF line ends', () => {
    const text = buildIcs(
      [{ uid: 'abc', title: 'CSHARE: Bible Reading', description: 'Midweek', location: 'Hall', startMs: Date.UTC(2026, 9, 28, 19, 0), endMs: Date.UTC(2026, 9, 28, 19, 4), alarms: [4320, 120] }],
      new Date(Date.UTC(2026, 9, 21, 12, 0)),
    );
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(text).toContain('UID:abc@cshare');
    expect(text).toContain('DTSTART:20261028T190000Z');
    expect(text).toContain('TRIGGER:-PT4320M');
    expect(text).toContain('TRIGGER:-PT120M');
    expect(text.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(text.split('\n').every((l, i, a) => i === a.length - 1 || l.endsWith('\r'))).toBe(true);
  });

  it('writes no alarms when none are given', () => {
    const text = buildIcs([{ uid: 'x', title: 't', description: '', location: '', startMs: 0, endMs: 1000, alarms: [] }]);
    expect(text).not.toContain('VALARM');
  });
});
