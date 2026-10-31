export type ShortcutAction =
  | 'newTerminal'
  | 'closeTerminal'
  | 'terminalSearch'
  | 'toggleSplit'
  | 'toggleSnippets'
  | 'toggleAIPanel'
  | 'clearTerminal';

export type ShortcutMap = Record<ShortcutAction, string>;

export type ShortcutPlatform = 'mac' | 'other';

export interface ShortcutDefinition {
  action: ShortcutAction;
  label: string;
  description: string;
}

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export interface ShortcutScheme {
  id: string;
  name: string;
  shortcuts: ShortcutMap;
  createdAt: number;
}

export const MAX_SHORTCUT_SCHEMES = 12;

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { action: 'newTerminal', label: '新建终端', description: '创建一个新的本地终端标签' },
  { action: 'closeTerminal', label: '关闭当前标签', description: '关闭当前激活的终端' },
  { action: 'terminalSearch', label: '查找终端内容', description: '在终端视图中打开搜索栏' },
  { action: 'toggleSplit', label: '切换分屏', description: '在当前标签中开启或取消分屏' },
  { action: 'toggleSnippets', label: '快捷命令', description: '打开或关闭快捷命令面板' },
  { action: 'toggleAIPanel', label: 'AI 停靠面板', description: '显示或隐藏右侧 AI 面板' },
  { action: 'clearTerminal', label: '清空终端', description: '向当前终端发送清屏指令' },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  newTerminal: 'Ctrl+T',
  closeTerminal: 'Ctrl+W',
  terminalSearch: 'Ctrl+F',
  toggleSplit: 'Ctrl+N',
  toggleSnippets: 'Ctrl+B',
  toggleAIPanel: 'Ctrl+Shift+A',
  clearTerminal: 'Ctrl+L',
};

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift', 'AltGraph']);

const normalizeKeyName = (key: string): string | null => {
  if (!key || MODIFIER_KEYS.has(key)) return null;
  if (key === ' ') return 'Space';
  if (key === 'Escape') return 'Esc';
  if (key.length === 1) return key.toUpperCase();
  return /^F([1-9]|1[0-2])$/.test(key) ? key : key;
};

export const normalizeShortcut = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const parts = value
    .split('+')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const keyPart = parts.pop();
  if (!keyPart) return null;
  const key = normalizeKeyName(keyPart);
  if (!key) return null;

  let ctrl = false;
  let alt = false;
  let shift = false;
  for (const part of parts) {
    const token = part.toLowerCase();
    if (
      token === 'ctrl' ||
      token === 'control' ||
      token === 'cmd' ||
      token === 'command' ||
      token === 'meta'
    ) {
      if (ctrl) return null;
      ctrl = true;
    } else if (token === 'alt' || token === 'option') {
      if (alt) return null;
      alt = true;
    } else if (token === 'shift') {
      if (shift) return null;
      shift = true;
    } else {
      return null;
    }
  }
  if (!ctrl && !alt) return null;

  return [ctrl ? 'Ctrl' : '', alt ? 'Alt' : '', shift ? 'Shift' : '', key]
    .filter(Boolean)
    .join('+');
};

export const shortcutFromEvent = (
  event: ShortcutKeyEvent,
  platform: ShortcutPlatform = 'other'
): string | null => {
  const key = normalizeKeyName(event.key);
  if (!key) return null;
  if (platform === 'mac' && event.ctrlKey) return null;

  const primary = platform === 'mac' ? event.metaKey : event.ctrlKey;
  if (!primary && !event.altKey) return null;
  if (platform === 'other' && event.metaKey && !event.ctrlKey) return null;

  return [primary ? 'Ctrl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', key]
    .filter(Boolean)
    .join('+');
};

export const matchesShortcut = (
  event: ShortcutKeyEvent,
  shortcut: string,
  platform: ShortcutPlatform = 'other'
): boolean => {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) return false;
  return shortcutFromEvent(event, platform) === normalized;
};

export const findShortcutAction = (
  event: ShortcutKeyEvent,
  shortcuts: ShortcutMap,
  platform: ShortcutPlatform = 'other'
): ShortcutAction | null => {
  for (const definition of SHORTCUT_DEFINITIONS) {
    if (matchesShortcut(event, shortcuts[definition.action], platform)) {
      return definition.action;
    }
  }
  return null;
};

const MAC_RESERVED_SHORTCUTS = new Set([
  'Ctrl+Q',
  'Ctrl+H',
  'Ctrl+Alt+H',
  'Ctrl+M',
  'Ctrl+A',
  'Ctrl+C',
  'Ctrl+V',
  'Ctrl+X',
  'Ctrl+Z',
  'Ctrl+Shift+Z',
  'Ctrl+Shift+3',
  'Ctrl+Shift+4',
  'Ctrl+Shift+5',
  'Ctrl+Tab',
  'Ctrl+Shift+Tab',
  'Ctrl+Space',
  'Ctrl+Alt+Esc',
  'Ctrl+Shift+W',
  'Ctrl+Shift+V',
  'Ctrl+,',
  'Ctrl+`',
]);

export const shortcutReservedReason = (shortcut: string, isMac = false): string | null => {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) return null;
  if (/^Ctrl\+[1-9]$/.test(normalized)) {
    return 'Ctrl/⌘ + 1…9 固定用于切换标签。';
  }
  if (isMac && MAC_RESERVED_SHORTCUTS.has(normalized)) {
    return '该组合键由 macOS 或系统菜单保留，请换一个组合。';
  }
  return null;
};

export const shortcutConflict = (
  shortcuts: ShortcutMap,
  action: ShortcutAction,
  candidate: string
): ShortcutAction | null => {
  const normalized = normalizeShortcut(candidate);
  if (!normalized) return action;
  for (const definition of SHORTCUT_DEFINITIONS) {
    if (definition.action === action) continue;
    if (normalizeShortcut(shortcuts[definition.action]) === normalized) {
      return definition.action;
    }
  }
  return null;
};

export const formatShortcut = (shortcut: string, isMac = false): string => {
  const normalized = normalizeShortcut(shortcut);
  if (!normalized) return shortcut;
  const parts = normalized.split('+');
  if (!isMac) return parts.join('+');
  return parts
    .map(part => {
      if (part === 'Ctrl') return '⌘';
      if (part === 'Alt') return '⌥';
      if (part === 'Shift') return '⇧';
      return part;
    })
    .join('');
};

export const normalizeShortcutMap = (raw: unknown): ShortcutMap => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const normalized = {} as ShortcutMap;
  for (const definition of SHORTCUT_DEFINITIONS) {
    normalized[definition.action] =
      normalizeShortcut(source[definition.action]) || DEFAULT_SHORTCUTS[definition.action];
  }
  return normalized;
};

export const normalizeShortcutSchemes = (raw: unknown): ShortcutScheme[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is { id: string; name: string; shortcuts: unknown; createdAt?: number } =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        item.name.trim().length > 0
    )
    .slice(0, MAX_SHORTCUT_SCHEMES)
    .map(item => ({
      id: item.id,
      name: item.name.trim().slice(0, 32),
      shortcuts: normalizeShortcutMap(item.shortcuts),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    }));
};

export const shortcutsEqual = (left: ShortcutMap, right: ShortcutMap): boolean =>
  SHORTCUT_DEFINITIONS.every(
    definition =>
      normalizeShortcut(left[definition.action]) === normalizeShortcut(right[definition.action])
  );
