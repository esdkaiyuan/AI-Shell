import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_TARGET, corner, grid } from '../hig';
import type { Theme } from '../theme';
import { useThemedStyles } from '../theme-context';

interface AIAssistButtonProps {
  onPress: () => void;
  /** Shows a subtle dot when the AI workspace has content worth returning to. */
  active?: boolean;
}

/**
 * HIG prominent tinted button. It is the single action on the terminal main
 * page: tapping it presents the trailing sheet with the AI assistant.
 */
export const AIAssistButton: FC<AIAssistButtonProps> = ({ onPress, active }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="AI 辅助"
      accessibilityHint="展开侧窗口，使用 AI 助手与全部功能"
      style={({ pressed }: { pressed: boolean }) => [styles.button, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
      <Text style={styles.label}>AI 辅助</Text>
      {active ? <View style={styles.dot} /> : null}
    </Pressable>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: grid.base,
    paddingVertical: grid.unit,
    borderRadius: corner.pill,
    backgroundColor: theme.system.systemBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // An iOS prominent button carries no shadow: a colored glow reads as a
    // Material elevation halo rather than an Apple surface lift.
  },
  pressed: { opacity: 0.72 },
  label: {
    color: '#FFFFFF',
    fontSize: theme.type.subheadline.fontSize,
    lineHeight: theme.type.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: theme.type.subheadline.letterSpacing,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  });
