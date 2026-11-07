import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { systemColors, typeScale } from '../hig';
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
  <View style={styles.pill}>
    <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
    <Text style={[styles.text, { color: toneColor[tone] }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    minHeight: 22,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // A neutral system fill carries the pill; only the label carries meaning.
    backgroundColor: systemColors.systemFill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.caption2.letterSpacing,
  },
});
