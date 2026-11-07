import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AI_CAPABILITIES, hasCapability, type AICapability } from '../aiTerminal';

import { useThemedStyles, useTheme } from '../theme-context';
import { radius, spacing, type Theme } from '../theme';

interface AiCapabilitySwitcherProps {
  capabilities: AICapability[];
  onToggle: (id: AICapability) => void;
}

/**
 * The explicit permission boundary between an AI answer and the live terminal.
 * It belongs to the conversation, not to the terminal page: the switches decide
 * what the assistant may do with this terminal, so they sit in the AI panel
 * where the answers are produced. `run` stays opt-in and turns orange once on.
 */
export const AiCapabilitySwitcher: FC<AiCapabilitySwitcherProps> = ({
  capabilities,
  onToggle,
}) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.row}>
    {AI_CAPABILITIES.map(option => {
      const checked = hasCapability(capabilities, option.id);
      const sensitive = checked && option.sensitive === true;
      return (
        <Pressable
          key={option.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${option.label}：${option.hint}`}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          onPress={() => onToggle(option.id)}
          style={({ pressed }: { pressed: boolean }) => [
            styles.chip,
            checked && styles.chipChecked,
            sensitive && styles.chipSensitive,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={checked ? 'checkmark-circle' : 'ellipse-outline'}
            size={11}
            color={sensitive ? '#FFFFFF' : checked ? theme.system.systemBlue : theme.colors.textDim}
          />
          <Text numberOfLines={1} style={[styles.label, checked && styles.labelChecked]}>
            {option.label}
          </Text>
        </Pressable>
      );
    })}
    {hasCapability(capabilities, 'run') ? (
      <View style={styles.notice}>
        <View style={styles.noticeDot} />
        <Text numberOfLines={1} style={styles.noticeText}>
          自动执行已开启
        </Text>
      </View>
    ) : null}
  </View>
);
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderSoft,
  },
  chipChecked: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: 'rgba(10, 132, 255, 0.42)',
  },
  chipSensitive: {
    backgroundColor: theme.system.systemOrange,
    borderColor: theme.system.systemOrange,
  },
  pressed: { opacity: 0.6 },
  label: {
    color: theme.colors.textDim,
    fontSize: 10.5,
    fontWeight: '600',
  },
  labelChecked: { color: theme.colors.text },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noticeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.system.systemOrange,
  },
  noticeText: { color: theme.system.systemOrange, fontSize: 9.5 },
});
