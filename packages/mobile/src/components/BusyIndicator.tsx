import type { FC } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { radius, spacing, type Theme } from '../theme';
import { useThemedStyles } from '../theme-context';

interface BusyIndicatorProps {
  /** The tint of the spinner; falls back to the accent colour. */
  color?: string;
  /** Text shown in place of the spinner when Reduce Motion is on. */
  label?: string;
  size?: 'small' | 'large';
  /** Keeps the spinner on the accent surface, e.g. a filled button. */
  inverted?: boolean;
}

/**
 * A progress indicator that respects Reduce Motion.
 *
 * A continuously spinning circle is a problem for people with vestibular
 * disorders, so when the system asks for reduced motion the spinner is
 * replaced by a static label that still conveys "work in progress".
 */
export const BusyIndicator: FC<BusyIndicatorProps> = ({
  color,
  label = '处理中…',
  size = 'small',
  inverted = false,
}) => {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReduceMotion();

  if (reduceMotion) {
    return (
      <View
        accessible
        accessibilityLabel={label}
        accessibilityRole="progressbar"
        style={styles.static}
      >
        <View style={[styles.staticDot, { backgroundColor: color || styles.tint }]} />
        <Text style={[styles.staticText, inverted && styles.staticTextInverted]}>{label}</Text>
      </View>
    );
  }

  return (
    <ActivityIndicator
      size={size}
      color={color || styles.tint}
      accessibilityLabel={label}
    />
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    tint: theme.colors.accent,
    static: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    staticDot: {
      width: 6,
      height: 6,
      borderRadius: radius.pill,
    },
    staticText: {
      color: theme.colors.textMuted,
      fontSize: theme.type.footnote.fontSize,
      lineHeight: theme.type.footnote.lineHeight,
    },
    staticTextInverted: {
      color: '#FFFFFF',
    },
  });
