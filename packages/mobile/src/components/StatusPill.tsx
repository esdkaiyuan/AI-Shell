import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface StatusPillProps {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'blue';
}

const toneColor = {
  green: colors.green,
  yellow: colors.yellow,
  red: colors.red,
  blue: colors.accent,
};

const toneBackground = {
  green: 'rgba(48, 209, 88, 0.14)',
  yellow: 'rgba(255, 159, 10, 0.14)',
  red: 'rgba(255, 69, 58, 0.14)',
  blue: 'rgba(10, 132, 255, 0.16)',
};

export const StatusPill: FC<StatusPillProps> = ({ label, tone }) => (
  <View style={[styles.pill, { backgroundColor: toneBackground[tone] }]}>
    <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
    <Text style={[styles.text, { color: toneColor[tone] }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
