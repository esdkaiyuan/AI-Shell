import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainView } from '../mobileState';
import type { LinuxStatus } from '../native/nativeBridge';
import { activeProvider, type AppConfig } from '../services/config';
import { corner } from '../hig';
import { useThemedStyles, useTheme } from '../theme-context';
import { radius, spacing, type Theme } from '../theme';
import { SectionHeader } from './SectionHeader';
import { StatusPill } from './StatusPill';

type ProfileDestination = Extract<MainView, 'sessions' | 'history' | 'settings'>;

interface ProfileHomeProps {
  config: AppConfig;
  runtime: LinuxStatus;
  onOpen: (view: ProfileDestination) => void;
}

const destinations: Array<{
  key: ProfileDestination;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'sessions',
    icon: 'albums-outline',
    title: '工作区会话',
    subtitle: '保存与恢复终端标签布局',
  },
  { key: 'history', icon: 'time-outline', title: '命令历史', subtitle: '查看和重新填入已提交命令' },
  {
    key: 'settings',
    icon: 'settings-outline',
    title: '运行环境与设置',
    subtitle: '查看 Alpine、密钥与危险操作',
  },
];

export const ProfileHome: FC<ProfileHomeProps> = ({ config, runtime, onOpen }) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const provider = activeProvider(config);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.mark}>
            <Ionicons name="terminal" size={24} color={theme.colors.accent} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.title}>AI Shell</Text>
            <Text numberOfLines={2} style={styles.subtitle}>
              本地 Linux 与远程运维工作台
            </Text>
          </View>
          <StatusPill
            label={runtime.installed ? '已就绪' : '待配置'}
            tone={runtime.installed ? 'green' : 'yellow'}
          />
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>运行环境</Text>
            <Text numberOfLines={1} style={styles.metricValue}>
              {runtime.installed ? `${runtime.distro || 'Alpine'} · ${runtime.abi}` : '未安装'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>AI 模型</Text>
            <Text numberOfLines={1} style={styles.metricValue}>
              {provider ? `${provider.displayName} · ${provider.model}` : '未配置'}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>SSH 配置</Text>
            <Text style={styles.metricValue}>{config.sshProfiles.length} 个</Text>
          </View>
        </View>
      </View>

      <SectionHeader title="工作区与偏好" />
      <View style={styles.group}>
        {destinations.map((destination, index) => (
          <Pressable
            key={`${destination.key}-${destination.title}`}
            accessibilityRole="button"
            accessibilityLabel={destination.title}
            accessibilityHint={destination.subtitle}
            onPress={() => onOpen(destination.key)}
            style={({ pressed }: { pressed: boolean }) => [
              styles.row,
              index > 0 && styles.rowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={destination.icon} size={19} color={theme.colors.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{destination.title}</Text>
              <Text style={styles.rowSubtitle}>{destination.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.textDim} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.footnote}>密钥由 Android Keystore 加密保存 · esdkaiyuan</Text>
    </View>
  );
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  container: { gap: spacing.md },
  summary: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: theme.colors.panelRaised,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mark: {
    width: 48,
    height: 48,
    borderRadius: corner.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentSoft,
  },
  summaryText: { flex: 1, minWidth: 0 },
  title: {
    color: theme.colors.text,
    fontSize: theme.type.title3.fontSize,
    lineHeight: theme.type.title3.lineHeight,
    fontWeight: '600',
    letterSpacing: theme.type.title3.letterSpacing,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
    marginTop: 3,
  },
  metrics: { marginTop: spacing.lg, gap: spacing.md },
  metric: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  metricLabel: {
    color: theme.colors.textDim,
    fontSize: theme.type.footnote.fontSize,
    lineHeight: theme.type.footnote.lineHeight,
  },
  metricValue: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.type.footnote.fontSize,
    lineHeight: theme.type.footnote.lineHeight,
    textAlign: 'right',
  },
  group: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: theme.colors.panelRaised },
  row: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.borderSoft },
  rowIcon: { width: 28, alignItems: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: theme.colors.text,
    fontSize: theme.type.subheadline.fontSize,
    lineHeight: theme.type.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: theme.type.subheadline.letterSpacing,
  },
  rowSubtitle: {
    color: theme.colors.textDim,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
    marginTop: 3,
  },
  pressed: { backgroundColor: theme.colors.selection },
  footnote: {
    color: theme.colors.textDim,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
    textAlign: 'center',
  },
});
