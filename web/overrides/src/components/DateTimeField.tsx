import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, space, TOUCH } from '../theme';
import { formatDayLong, formatTime } from '../utils/dates';
import { Body, Label, Small } from './ui';

interface Props {
  label: string;
  mode: 'date' | 'time';
  /** 'YYYY-MM-DD' for dates, 'HH:mm' for times; empty when not set */
  value: string;
  onChange: (value: string) => void;
  /** lets the person remove an optional value */
  onClear?: () => void;
  placeholder?: string;
}

/**
 * Looks exactly like the Android field (a bordered box with the formatted date or time). Tapping it
 * opens Safari's own picker through a transparent <input> laid over the box.
 */
export function DateTimeField({ label, mode, value, onChange, onClear, placeholder }: Props) {
  const { palette } = useTheme();
  const shown = value ? (mode === 'date' ? formatDayLong(value) : formatTime(value)) : placeholder ?? 'Tap to choose';

  return (
    <View style={{ marginBottom: space.lg }}>
      <Label style={{ marginBottom: space.xs }}>{label}</Label>
      <View style={[styles.field, { borderColor: palette.line, backgroundColor: palette.surface }]}>
        <Body style={!value ? { color: palette.placeholder } : undefined}>{shown}</Body>
        <input
          type={mode}
          aria-label={`${label}: ${shown}`}
          value={value}
          onChange={e => {
            const v = e.target.value;
            if (v) onChange(v);
          }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, border: 0, padding: 0, margin: 0, fontSize: 16, cursor: 'pointer' }}
        />
      </View>
      {onClear && value ? (
        <Pressable accessibilityRole="button" onPress={onClear} style={{ paddingVertical: space.sm }}>
          <Small style={{ color: palette.primary, fontWeight: '700' }}>Remove {label.toLowerCase()}</Small>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: TOUCH, justifyContent: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.lg, position: 'relative', overflow: 'hidden' },
});
