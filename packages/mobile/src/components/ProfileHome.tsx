import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainView } from '../mobileState';
import type { LinuxStatus } from '../native/nativeBridge';
import { activeProvider, type AppConfig } from '../services/config';
import { corner, typeScale } from '../hig';
import { colors, radius, spacing } from '../theme';
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
  const provider = activeProvider(config);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View style={styles.mark}>
            <Ionicons name="terminal" size={24} color={colors.accent} />
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
            onPress={() => onOpen(destination.key)}
            style={({ pressed }: { pressed: boolean }) => [
              styles.row,
              index > 0 && styles.rowBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={destination.icon} size={19} color={colors.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{destination.title}</Text>
              <Text style={styles.rowSubtitle}>{destination.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={colors.textDim} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.footnote}>密钥由 Android Keystore 加密保存 · esdkaiyuan</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  summary: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.panelRaised,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mark: {
    width: 48,
    height: 48,
    borderRadius: corner.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  summaryText: { flex: 1, minWidth: 0 },
  title: {
    color: colors.text,
    fontSize: typeScale.title3.fontSize,
    lineHeight: typeScale.title3.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.title3.letterSpacing,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    marginTop: 3,
  },
  metrics: { marginTop: spacing.lg, gap: spacing.md },
  metric: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  metricLabel: {
    color: colors.textDim,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
  },
  metricValue: {
    flex: 1,
    color: colors.text,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    textAlign: 'right',
  },
  group: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.panelRaised },
  row: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  rowIcon: { width: 28, alignItems: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    color: colors.text,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.subheadline.letterSpacing,
  },
  rowSubtitle: {
    color: colors.textDim,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    marginTop: 3,
  },
  pressed: { backgroundColor: colors.selection },
  footnote: {
    color: colors.textDim,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    textAlign: 'center',
  },
});
