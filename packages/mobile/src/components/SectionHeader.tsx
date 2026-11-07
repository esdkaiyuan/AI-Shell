import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '../theme-context';
import { spacing, type Theme } from '../theme';

interface SectionHeaderProps {
  title: string;
  meta?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ title, meta }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.header}>
    <Text style={styles.title}>{title}</Text>
    {meta ? <Text style={styles.meta}>{meta}</Text> : null}
  </View>
);
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.type.subheadline.fontSize,
    lineHeight: theme.type.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: theme.type.subheadline.letterSpacing,
  },
  meta: {
    color: theme.colors.textDim,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
  },
});
