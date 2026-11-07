import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TerminalLine, PaneSessionStatus } from '../mobileState';
import { monoFont, systemColors, typeScale } from '../hig';
import { colors, radius, spacing, surfaces } from '../theme';

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

/** A second line explains what to do next, the way iOS empty states do. */
const emptyHint: Record<PaneSessionStatus, string> = {
  idle: '先在设置里完成环境准备，再回到终端',
  starting: '首次启动需要解压内置 Alpine 运行环境',
  ready: '在下方命令坞输入命令，回车即可执行',
  exited: '点上方状态条重新连接，或新建一个终端',
  error: '前往「设置」检查运行环境与权限',
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
        <View style={styles.badge}>
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{emptyText[status]}</Text>
            <Text style={styles.emptyHint}>{emptyHint[status]}</Text>
          </View>
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
    // The console is a window into the session, not a card: no radius and no
    // frame, just a hairline that separates it from the chrome above.
    marginHorizontal: -spacing.lg,
    backgroundColor: surfaces.terminal,
  },
  topbar: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.subheadline.letterSpacing,
  },
  badge: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // A system fill keeps the badge neutral; only the label carries meaning.
    backgroundColor: systemColors.systemFill,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: {
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.caption2.letterSpacing,
  },
  output: {
    flex: 1,
  },
  lines: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textDim,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    textAlign: 'center',
  },
  line: {
    color: colors.text,
    fontFamily: monoFont.family,
    fontSize: monoFont.size,
    lineHeight: monoFont.lineHeight,
  },
  prompt: { color: colors.green },
  info: { color: colors.cyan },
  warning: { color: colors.yellow },
  error: { color: colors.red },
});
