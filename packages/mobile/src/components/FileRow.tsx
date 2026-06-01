import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FileItem } from '../data';
import { colors, radius, spacing } from '../theme';

interface FileRowProps {
  item: FileItem;
  active?: boolean;
  onPress: (itemId: string) => void;
}

export const FileRow: FC<FileRowProps> = ({ item, active = false, onPress }) => (
  <Pressable
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
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.panelHover,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  path: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
  },
  modified: {
    color: colors.textDim,
    fontSize: 10,
  },
  size: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Courier',
  },
});
