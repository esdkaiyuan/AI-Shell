import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_TARGET, corner, grid, systemColors, typeScale } from '../hig';

interface AIAssistButtonProps {
  onPress: () => void;
  /** Shows a subtle dot when the AI workspace has content worth returning to. */
  active?: boolean;
}

/**
 * HIG prominent tinted button. It is the single action on the terminal main
 * page: tapping it presents the trailing sheet with the AI assistant.
 */
export const AIAssistButton: FC<AIAssistButtonProps> = ({ onPress, active }) => (
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

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: grid.base,
    paddingVertical: grid.unit,
    borderRadius: corner.pill,
    backgroundColor: systemColors.systemBlue,
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
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '600',
    letterSpacing: typeScale.subheadline.letterSpacing,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});
