import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { AppearanceMode, useTheme } from '../context/ThemeContext';
import { updateMyProfile } from '../services/userService';
import { exportUpcoming, getCalendarPrefs, setCalendarPrefs } from '../services/calendarService';
import { friendlyError, logError } from '../utils/errors';
import { space } from '../theme';
import { Body, Button, Card, Chip, ChipRow, Heading, Notice, Small, SwitchRow, TextField } from './ui';

const APPEARANCE_OPTIONS: { mode: AppearanceMode; label: string }[] = [
  { mode: 'system', label: 'System default' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

export function AppearanceSettings() {
  const { mode, setMode } = useTheme();
  return (
    <View>
      <ChipRow>
        {APPEARANCE_OPTIONS.map(o => (
          <Chip key={o.mode} label={o.label} selected={mode === o.mode} onPress={() => setMode(o.mode)} />
        ))}
      </ChipRow>
      <Small>"System default" follows your phone's own light/dark setting.</Small>
    </View>
  );
}

export function ProfileForm() {
  const { profile } = useAppData();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = name.trim() !== profile.name || phone.trim() !== profile.phone;

  const save = async () => {
    if (!name.trim()) return setMessage('Please enter your name.');
    setSaving(true);
    setMessage(null);
    try {
      const r = await updateMyProfile(profile.id, { name: name.trim(), phone: phone.trim() });
      setMessage(r === 'queued' ? 'Saved on this phone. It will be sent when you have internet.' : 'Saved.');
    } catch (e) {
      logError('save profile', e);
      setMessage(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <TextField label="Your name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" />
      <TextField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" hint="Administrators use this to reach you." />
      <TextField label="Email" value={profile.email} onChangeText={() => {}} editable={false} />
      {message ? <Notice tone="info" message={message} /> : null}
      <Button label="Save my details" onPress={save} loading={saving} disabled={!dirty} />
    </View>
  );
}

export function NotificationSettings() {
  return (
    <View>
      <Card>
        <Heading>Reminders on iPhone</Heading>
        <Body style={{ marginVertical: space.sm }}>
          iPhones do not let a web app ring alarms or show reminders while it is closed. To be reminded, add your assignments to your iPhone Calendar below: the Calendar app then alerts you on time, even without internet.
        </Body>
        <Small>Your reminder settings from the Android app are unchanged. Your upcoming assignments are always listed on the Home screen while CSHARE is open.</Small>
      </Card>
    </View>
  );
}

/** Builds a calendar file (.ics) of the person's upcoming parts for the iPhone Calendar app. */
export function CalendarSettings() {
  const { profile, settings, myAssignments, weeks } = useAppData();
  const [alerts, setAlerts] = useState(true);
  const [note, setNote] = useState<{ tone: 'good' | 'info' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCalendarPrefs()
      .then(p => setAlerts(p.alerts))
      .catch(e => logError('calendar settings', e));
  }, []);

  const changeAlerts = async (v: boolean) => {
    setAlerts(v);
    try {
      const p = await getCalendarPrefs();
      await setCalendarPrefs({ ...p, alerts: v });
    } catch (e) {
      logError('save calendar prefs', e);
    }
  };

  const addAll = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await exportUpcoming(myAssignments, profile.id, settings, weeks, alerts);
      if (r.count === 0) setNote({ tone: 'info', text: 'You have no upcoming assignments to add.' });
      else if (r.result === 'cancelled') setNote({ tone: 'info', text: 'Nothing was added.' });
      else setNote({ tone: 'good', text: `${r.count} ${r.count === 1 ? 'assignment is' : 'assignments are'} ready. Choose Calendar (or open the file) to add ${r.count === 1 ? 'it' : 'them'}.` });
    } catch (e) {
      logError('calendar export', e);
      setNote({ tone: 'bad', text: 'The calendar file could not be created. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Body style={{ marginBottom: space.md }}>
        Add your upcoming parts to the iPhone Calendar. Adding again later updates the same events instead of duplicating them, but it is not automatic: do it again after an administrator changes something.
      </Body>
      <SwitchRow label="Include calendar alerts" description="The Calendar app alerts you before each part, using the reminder times set for that assignment." value={alerts} onValueChange={changeAlerts} disabled={busy} />
      {note ? <Notice tone={note.tone} message={note.text} /> : null}
      <Button label="Add my upcoming assignments to Calendar" variant="secondary" onPress={addAll} loading={busy} />
    </View>
  );
}

export function AccountSection() {
  const { signOut } = useAuth();
  const { profile } = useAppData();
  const confirm = () =>
    Alert.alert('Sign out?', 'You will need internet to sign in again.', [
      { text: 'Stay signed in', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch(e => Alert.alert('Could not sign out', friendlyError(e))) },
    ]);
  return (
    <Card>
      <Heading>Account</Heading>
      <Body style={{ marginVertical: space.sm }}>Signed in as {profile.email}</Body>
      <Button label="Sign out" variant="secondary" onPress={confirm} />
    </Card>
  );
}
