// Builds web/src = the Android app's unchanged src/ + the iPhone-only files from web/overrides/src.
// The original ../src is only ever read, never written.
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, '..');
const original = resolve(web, '..', 'src');
const target = resolve(web, 'src');
const overrides = resolve(web, 'overrides', 'src');

if (!existsSync(original)) throw new Error(`Original source not found at ${original}. web/ must sit next to src/.`);

rmSync(target, { recursive: true, force: true });
cpSync(original, target, { recursive: true, dereference: true });
cpSync(overrides, target, { recursive: true });

// Small text edits to shared screens. Each one must match exactly once, or the build stops:
// that way an upstream change to the Android screen is noticed instead of silently skipped.
const patches = [
  {
    file: 'screens/shared/AssignmentDetailScreen.tsx',
    edits: [
      [
        "if (result.ok) setCalendarNote({ tone: 'good', text: `Added to “${result.calendarName}” on your phone.` });",
        "if (result.ok) setCalendarNote({ tone: 'good', text: result.result === 'cancelled' ? 'Nothing was added.' : 'Ready. Choose Calendar (or open the file) to add it to your iPhone Calendar.' });",
      ],
      [
        "Put this one assignment on your phone's own calendar. This is separate from CSHARE's reminders, which keep working either way.",
        "Put this one assignment on your iPhone Calendar, with alerts. iPhones cannot ring CSHARE reminders by themselves, so the Calendar app does the reminding.",
      ],
    ],
  },
];

for (const { file, edits } of patches) {
  const path = resolve(target, file);
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`Patch for ${file} matched ${count} times (expected 1):\n${from}`);
    text = text.replace(from, () => to);
  }
  writeFileSync(path, text);
}
console.log('web/src prepared');
