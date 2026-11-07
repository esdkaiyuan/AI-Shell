import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileItem } from '../data';
import { monoFont } from '../hig';
import { useThemedStyles, useTheme } from '../theme-context';
import { radius, spacing, type Theme } from '../theme';

interface FileRowProps {
  item: FileItem;
  active?: boolean;
  onPress: (itemId: string) => void;
}

export const FileRow: FC<FileRowProps> = ({ item, active = false, onPress }) => {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${item.type === 'directory' ? '目录' : '文件'} ${item.name}，路径 ${item.path}`}
    accessibilityState={{ selected: active }}
    onPress={() => onPress(item.id)}
    style={({ pressed }: { pressed: boolean }) => [
      styles.row,
      active && styles.active,
      pressed && styles.pressed,
    ]}
  >
    <Ionicons
      name={item.type === 'directory' ? 'folder-outline' : 'document-text-outline'}
      color={item.type === 'directory' ? theme.colors.accent : theme.colors.textMuted}
      size={20}
    />
    <View style={styles.body}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.path}>{item.path}</Text>
    </View>
    <View style={styles.trailing}>
      {item.modified ? <Text style={styles.modified}>{item.modified}</Text> : null}
      {item.size ? <Text style={styles.size}>{item.size}</Text> : null}
    </View>
  </Pressable>
);
};

const makeStyles = (theme: Theme) => StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: theme.colors.panelRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: theme.colors.selection,
  },
  active: {
    backgroundColor: theme.colors.selection,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.type.subheadline.fontSize,
    lineHeight: theme.type.subheadline.lineHeight,
    fontWeight: '500',
    letterSpacing: theme.type.subheadline.letterSpacing,
  },
  path: {
    color: theme.colors.textDim,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
    marginTop: 3,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  modified: {
    color: theme.colors.textDim,
    fontSize: theme.type.caption2.fontSize,
    lineHeight: theme.type.caption2.lineHeight,
  },
  size: {
    color: theme.colors.textMuted,
    fontSize: theme.type.caption1.fontSize,
    lineHeight: theme.type.caption1.lineHeight,
    fontFamily: monoFont.family,
  },
});
