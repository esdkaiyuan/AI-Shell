import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SSHConfigItem } from '../data';
import { colors, radius, spacing } from '../theme';
import { StatusPill } from './StatusPill';

interface SessionCardProps {
  session: SSHConfigItem;
  active?: boolean;
  onPress: (sessionId: string) => void;
}

const statusMeta = {
  online: { label: '在线', tone: 'green' as const },
  idle: { label: '空闲', tone: 'yellow' as const },
  offline: { label: '离线', tone: 'red' as const },
};

export const SessionCard: FC<SessionCardProps> = ({ session, active = false, onPress }) => {
  const status = statusMeta[session.status];

  return (
    <Pressable
      onPress={() => onPress(session.id)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        active && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconBox}>
        <Ionicons name="terminal-outline" color={colors.accent} size={20} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.name}>{session.name}</Text>
          <StatusPill label={status.label} tone={status.tone} />
        </View>
        <Text style={styles.host}>{session.username}@{session.host}:{session.port}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{session.auth}</Text>
          <Text style={styles.meta}>{session.latency}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 78,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: colors.panelHover,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  host: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Courier',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 6,
  },
  meta: {
    color: colors.textDim,
    fontSize: 11,
  },
});
