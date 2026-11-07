import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileItem } from '../data';
import { monoFont, typeScale } from '../hig';
import { colors, radius, spacing } from '../theme';

interface FileRowProps {
  item: FileItem;
  active?: boolean;
  onPress: (itemId: string) => void;
}

export const FileRow: FC<FileRowProps> = ({ item, active = false, onPress }) => (
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
      color={item.type === 'directory' ? colors.accent : colors.textMuted}
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

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.panelRaised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.selection,
  },
  active: {
    backgroundColor: colors.selection,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: typeScale.subheadline.fontSize,
    lineHeight: typeScale.subheadline.lineHeight,
    fontWeight: '500',
    letterSpacing: typeScale.subheadline.letterSpacing,
  },
  path: {
    color: colors.textDim,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    marginTop: 3,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  modified: {
    color: colors.textDim,
    fontSize: typeScale.caption2.fontSize,
    lineHeight: typeScale.caption2.lineHeight,
  },
  size: {
    color: colors.textMuted,
    fontSize: typeScale.caption1.fontSize,
    lineHeight: typeScale.caption1.lineHeight,
    fontFamily: monoFont.family,
  },
});
