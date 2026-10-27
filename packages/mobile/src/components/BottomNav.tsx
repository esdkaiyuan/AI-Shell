import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MainView } from '../mobileState';
import { isViewActive, primaryNavItems, type PrimaryView } from '../navigation';
import { colors, spacing } from '../theme';

interface BottomNavProps {
  currentView: MainView;
  onSelect: (view: PrimaryView) => void;
}

export const BottomNav: FC<BottomNavProps> = ({ currentView, onSelect }) => (
  <View style={styles.bar}>
    {primaryNavItems.map(item => {
      const active = isViewActive(item.key, currentView);
      return (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: active }}
          onPress={() => onSelect(item.key)}
          style={({ pressed }: { pressed: boolean }) => [styles.item, active && styles.itemActive, pressed && styles.pressed]}
        >
          <Ionicons
            name={item.icon}
            size={21}
            color={active ? colors.accent : colors.textDim}
          />
          <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  bar: {
    minHeight: 62,
    paddingHorizontal: spacing.sm,
    paddingTop: 6,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
  },
  item: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemActive: { backgroundColor: colors.selection },
  pressed: { opacity: 0.72 },
  label: { color: colors.textDim, fontSize: 10, fontWeight: '500' },
  labelActive: { color: colors.accent, fontWeight: '600' },
});
