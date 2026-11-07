import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MIN_TOUCH_TARGET,
  corner,
  grid,
  systemColors,
} from '../hig';
import type { Theme } from '../theme';
import { useThemedStyles } from '../theme-context';
import {
  panelGroups,
  type PanelDestination,
  type PanelItem,
  type TerminalAction,
} from '../navigation';

interface FunctionMenuProps {
  /** Currently displayed section, used to mark the active row. */
  section: string;
  onSelect: (destination: PanelDestination) => void;
  onAction: (action: TerminalAction) => void;
}

const handleItemPress = (
  item: PanelItem,
  onSelect: (destination: PanelDestination) => void,
  onAction: (action: TerminalAction) => void
): void => {
  if (item.kind === 'destination') onSelect(item.key);
  else onAction(item.key);
};

/**
 * HIG inset-grouped list: a large title, grouped rounded containers, hairline
 * separators inset to the text, 44pt minimum rows and descriptive footers.
 */
export const FunctionMenu: FC<FunctionMenuProps> = ({ section, onSelect, onAction }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.container}>
    <Text style={styles.largeTitle}>功能</Text>
    <Text style={styles.intro}>
      所有功能都在侧窗口中展开。终端始终保持在主页面，随时可用。
    </Text>

    {panelGroups.map(group => (
      <View key={group.title} style={styles.group}>
        <Text style={styles.groupHeader}>{group.title}</Text>
        <View style={styles.card}>
          {group.items.map((item, index) => (
            <View key={item.key}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={item.subtitle}
                accessibilityState={{
                  selected: item.kind === 'destination' && section === item.key,
                }}
                style={({ pressed }: { pressed: boolean }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => handleItemPress(item, onSelect, onAction)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={item.icon} size={22} color={item.tint} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.rowSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name={item.kind === 'destination' ? 'chevron-forward' : 'flash-outline'}
                  size={17}
                  color={systemColors.tertiaryLabel}
                />
              </Pressable>
            </View>
          ))}
        </View>
        {group.footer ? <Text style={styles.groupFooter}>{group.footer}</Text> : null}
      </View>
    ))}
  </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  container: { gap: grid.loose },
  largeTitle: {
    color: theme.system.label,
    fontSize: theme.type.largeTitle.fontSize,
    lineHeight: theme.type.largeTitle.lineHeight,
    fontWeight: '400',
    letterSpacing: theme.type.largeTitle.letterSpacing,
  },
  intro: {
    color: theme.system.secondaryLabel,
    fontSize: theme.type.subheadline.fontSize,
    lineHeight: theme.type.subheadline.lineHeight,
    letterSpacing: theme.type.subheadline.letterSpacing,
    marginTop: grid.half,
  },
  group: { gap: grid.unit },
  groupHeader: {
    color: theme.system.secondaryLabel,
    fontSize: theme.type.footnote.fontSize,
    lineHeight: theme.type.footnote.lineHeight,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: grid.base,
  },
  groupFooter: {
    color: theme.system.tertiaryLabel,
    fontSize: theme.type.footnote.fontSize,
    lineHeight: theme.type.footnote.lineHeight,
    paddingHorizontal: grid.base,
  },
  card: {
    borderRadius: corner.grouped,
    backgroundColor: theme.system.tertiarySystemGroupedBackground,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.system.separator,
    marginLeft: grid.base * 2 + 32 + grid.tight,
  },
  row: {
    minHeight: MIN_TOUCH_TARGET + 20,
    paddingVertical: grid.tight,
    paddingHorizontal: grid.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: grid.tight,
  },
  rowPressed: { backgroundColor: theme.system.quaternarySystemFill },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: {
    color: theme.system.label,
    fontSize: theme.type.body.fontSize,
    lineHeight: theme.type.body.lineHeight,
    fontWeight: '500',
    letterSpacing: theme.type.body.letterSpacing,
  },
  rowSubtitle: {
    color: theme.system.secondaryLabel,
    fontSize: theme.type.footnote.fontSize,
    lineHeight: theme.type.footnote.lineHeight,
    letterSpacing: theme.type.footnote.letterSpacing,
  },
});
