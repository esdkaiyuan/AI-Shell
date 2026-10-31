import type { FC } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface CommandChipProps {
  command: string;
  onPress: (command: string) => void;
}

export const CommandChip: FC<CommandChipProps> = ({ command, onPress }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`填入命令 ${command}`}
    onPress={() => onPress(command)}
    style={({ pressed }: { pressed: boolean }) => [styles.chip, pressed && styles.pressed]}
  >
    <Text numberOfLines={1} style={styles.text}>
      {command}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    maxWidth: 280,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.accentSoft,
  },
  text: {
    color: colors.textMuted,
    fontFamily: 'Courier',
    fontSize: 12.5,
  },
});
