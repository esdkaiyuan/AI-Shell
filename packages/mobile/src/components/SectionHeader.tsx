import type { FC } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  meta: {
    color: colors.textDim,
    fontSize: 12,
  },
});
