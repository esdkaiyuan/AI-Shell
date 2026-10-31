import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TerminalLine, PaneSessionStatus } from '../mobileState';
import { colors, radius, spacing } from '../theme';

interface TerminalPreviewProps {
  title: string;
  lines: TerminalLine[];
  status: PaneSessionStatus;
}

const statusMeta: Record<PaneSessionStatus, { label: string; color: string }> = {
  idle: { label: '待连接', color: colors.textDim },
  starting: { label: '启动中', color: colors.yellow },
  ready: { label: '已连接', color: colors.green },
  exited: { label: '已结束', color: colors.yellow },
  error: { label: '失败', color: colors.red },
};

const emptyText: Record<PaneSessionStatus, string> = {
  idle: '内置 Linux 尚未启动',
  starting: '正在启动 Alpine Linux 会话…',
  ready: '输入命令并回车开始',
  exited: '会话已结束，可在上方重新连接',
  error: '会话启动失败，请检查设置',
};

export const TerminalPreview: FC<TerminalPreviewProps> = ({ title, lines, status }) => {
  const scrollRef = useRef<ScrollView | null>(null);
  const meta = statusMeta[status];

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [lines.length]);

  return (
    <View style={styles.shell}>
      <View style={styles.topbar}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${meta.color}22` }]}>
          <View style={[styles.dot, { backgroundColor: meta.color }]} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.output}
        contentContainerStyle={styles.lines}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      >
        {lines.length === 0 ? (
          <Text style={styles.empty}>{emptyText[status]}</Text>
        ) : (
          lines.map((line, index) => (
            <Text
              key={`${index}-${line.text.slice(0, 12)}`}
              selectable
              style={[
                styles.line,
                line.kind === 'prompt' ? styles.prompt : null,
                line.kind === 'info' ? styles.info : null,
                line.kind === 'warning' ? styles.warning : null,
                line.kind === 'error' ? styles.error : null,
              ]}
            >
              {line.text}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 140,
    borderRadius: 14,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  topbar: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    minHeight: 20,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  output: {
    flex: 1,
  },
  lines: {
    flexGrow: 1,
    padding: 14,
  },
  empty: {
    color: colors.textDim,
    fontSize: 12.5,
    fontFamily: 'Courier',
    lineHeight: 20,
  },
  line: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12.5,
    lineHeight: 20,
  },
  prompt: { color: colors.green },
  info: { color: colors.cyan },
  warning: { color: colors.yellow },
  error: { color: colors.red },
});
