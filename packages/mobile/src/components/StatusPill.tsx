import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, type Theme } from '../theme';
import { useTheme, useThemedStyles } from '../theme-context';

interface StatusPillProps {
  label: string;
  tone: 'green' | 'yellow' | 'red' | 'blue';
}

const toneColor = (theme: Theme, tone: StatusPillProps['tone']): string => {
  switch (tone) {
    case 'green':
      return theme.colors.green;
    case 'yellow':
      return theme.colors.yellow;
    case 'red':
      return theme.colors.red;
    default:
      return theme.colors.accent;
  }
};

export const StatusPill: FC<StatusPillProps> = ({ label, tone }) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = toneColor(theme, tone);
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    pill: {
      minHeight: 22,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      // A neutral system fill carries the pill; only the label carries meaning.
      backgroundColor: theme.system.systemFill,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    text: {
      fontSize: theme.type.caption2.fontSize,
      lineHeight: theme.type.caption2.lineHeight,
      fontWeight: '600',
      letterSpacing: theme.type.caption2.letterSpacing,
    },
  });
