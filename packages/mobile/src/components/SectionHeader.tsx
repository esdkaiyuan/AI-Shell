import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typeScale } from '../hig';
import { colors, spacing } from '../theme';

interface SectionHeaderProps {
  title: string;
  meta?: string;
}

export const SectionHeader: FC<SectionHeaderProps> = ({ title, meta }) => (
  <View style={styles.header}>
    <Text style={styles.title}>{title}</Text>
    {meta ? <Text style={styles.meta}>{meta}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.subheadline.letterSpacing,
  },
  meta: {
    color: colors.textDim,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
  },
});
