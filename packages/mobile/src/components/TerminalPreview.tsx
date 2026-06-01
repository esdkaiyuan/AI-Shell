import type { FC } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TerminalLine } from '../mobileState';
import { colors, radius, spacing } from '../theme';

interface TerminalPreviewProps {
  title: string;
  lines: TerminalLine[];
}

export const TerminalPreview: FC<TerminalPreviewProps> = ({ title, lines }) => (
  <View style={styles.shell}>
    <View style={styles.topbar}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.badge}>UTF-8</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.lines}>
        {lines.map((line, index) => (
          <Text
            key={`${line.text}-${index}`}
            style={[
              styles.line,
              line.kind === 'prompt' ? styles.prompt : null,
              line.kind === 'info' ? styles.info : null,
              line.kind === 'warning' ? styles.warning : null,
            ]}
          >
            {line.text}
          </Text>
        ))}
      </View>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  topbar: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: 'Courier',
  },
  lines: {
    minHeight: 210,
    padding: spacing.md,
  },
  line: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 19,
  },
  prompt: {
    color: colors.green,
  },
  info: {
    color: colors.cyan,
  },
  warning: {
    color: colors.yellow,
  },
});
