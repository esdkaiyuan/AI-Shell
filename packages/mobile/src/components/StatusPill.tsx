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

export const StatusPill: FC<StatusPillProps> = ({ label, tone }) => (
  <View style={[styles.pill, { borderColor: toneColor[tone] }]}>
    <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
    <Text style={[styles.text, { color: toneColor[tone] }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    minHeight: 22,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel,
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
