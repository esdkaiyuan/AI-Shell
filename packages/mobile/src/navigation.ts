import type { Ionicons } from '@expo/vector-icons';
import type { MainView } from './mobileState';
import { systemColors } from './hig';

/**
 * Navigation model after the HIG restructure:
 * - `terminal` is the only main page; it doubles as "trailing sheet dismissed".
 * - every other destination lives inside the trailing sheet.
 * - `menu` is the sheet root (an inset-grouped list of destinations).
 * - terminal-scoped operations are actions launched from the sheet, never pages.
 */
export type PanelSection = MainView;
export type PanelDestination = Exclude<MainView, 'terminal' | 'menu'>;

/** Terminal-scoped operations reachable from the sheet. */
export type TerminalAction =
  | 'newLocalTerminal'
  | 'toggleSplit'
  | 'toggleSearch'
  | 'clearPane'
  | 'copyOutput'
  | 'paste';

interface PanelItemBase {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

export interface PanelDestinationItem extends PanelItemBase {
  kind: 'destination';
  key: PanelDestination;
}

export interface PanelActionItem extends PanelItemBase {
  kind: 'action';
  key: TerminalAction;
}

export type PanelItem = PanelDestinationItem | PanelActionItem;

export interface PanelGroup {
  title: string;
  footer?: string;
  items: PanelItem[];
}

/** HIG inset-grouped list shown at the sheet root. */
export const panelGroups: readonly PanelGroup[] = [
  {
    title: '智能辅助',
    footer: 'AI 会读取当前终端最近的命令输出作为上下文，不会自动执行命令。',
    items: [
      {
        kind: 'destination',
        key: 'ai',
        title: 'AI 助手',
        subtitle: '解释输出、生成命令、排查故障',
        icon: 'sparkles-outline',
        tint: systemColors.systemBlue,
      },
    ],
  },
  {
    title: '工作区',
    items: [
      {
        kind: 'destination',
        key: 'explorer',
        title: '文件',
        subtitle: '浏览内置 Linux 文件系统',
        icon: 'folder-outline',
        tint: systemColors.systemTeal,
      },
      {
        kind: 'destination',
        key: 'ssh',
        title: 'SSH',
        subtitle: '管理远程主机与私钥',
        icon: 'server-outline',
        tint: systemColors.systemIndigo,
      },
      {
        kind: 'destination',
        key: 'sessions',
        title: '会话',
        subtitle: '保存与恢复终端工作区',
        icon: 'albums-outline',
        tint: systemColors.systemPurple,
      },
      {
        kind: 'destination',
        key: 'history',
        title: '命令历史',
        subtitle: '查看并重新填入已提交命令',
        icon: 'time-outline',
        tint: systemColors.systemOrange,
      },
    ],
  },
  {
    title: '终端操作',
    footer: '操作会立即作用在当前终端，侧窗口随后收起。',
    items: [
      {
        kind: 'action',
        key: 'newLocalTerminal',
        title: '新建终端',
        subtitle: '打开一个新的本地 Linux 会话',
        icon: 'add-outline',
        tint: systemColors.systemGreen,
      },
      {
        kind: 'action',
        key: 'toggleSplit',
        title: '分屏',
        subtitle: '在双窗格与单窗格之间切换',
        icon: 'git-compare-outline',
        tint: systemColors.systemTeal,
      },
      {
        kind: 'action',
        key: 'toggleSearch',
        title: '查找输出',
        subtitle: '在当前终端输出中过滤关键字',
        icon: 'search-outline',
        tint: systemColors.systemIndigo,
      },
      {
        kind: 'action',
        key: 'copyOutput',
        title: '复制输出',
        subtitle: '把当前窗格的输出复制到剪贴板',
        icon: 'copy-outline',
        tint: systemColors.systemPurple,
      },
      {
        kind: 'action',
        key: 'paste',
        title: '粘贴到命令',
        subtitle: '把剪贴板内容追加到输入栏',
        icon: 'clipboard-outline',
        tint: systemColors.systemOrange,
      },
      {
        kind: 'action',
        key: 'clearPane',
        title: '清屏',
        subtitle: '清空当前窗格的显示内容',
        icon: 'refresh-outline',
        tint: systemColors.systemRed,
      },
    ],
  },
  {
    title: '偏好',
    items: [
      {
        kind: 'destination',
        key: 'settings',
        title: '设置',
        subtitle: '运行环境、AI 提供商与安全',
        icon: 'settings-outline',
        tint: '#8E8E93',
      },
      {
        kind: 'destination',
        key: 'profile',
        title: '我的',
        subtitle: '设备状态与已保存的配置',
        icon: 'person-circle-outline',
        tint: systemColors.systemGreen,
      },
    ],
  },
];

const titles: Record<PanelSection, string> = {
  menu: '功能',
  terminal: '终端',
  ai: 'AI 助手',
  explorer: '文件',
  ssh: 'SSH',
  sessions: '会话',
  history: '命令历史',
  settings: '设置',
  profile: '我的',
};

export const panelTitle = (section: PanelSection): string => titles[section];

/** The main page always shows the terminal; any other view means sheet open. */
export const isPanelOpen = (view: MainView): boolean => view !== 'terminal';

/** The sheet root is the only section without a back button. */
export const isPanelRoot = (section: PanelSection): boolean => section === 'menu';

/** All destinations that can be opened from the sheet root. */
export const panelDestinations: readonly PanelDestination[] = panelGroups.flatMap(group =>
  group.items.flatMap(item => (item.kind === 'destination' ? [item.key] : []))
);

/** All terminal actions that can be fired from the sheet root. */
export const panelActions: readonly TerminalAction[] = panelGroups.flatMap(group =>
  group.items.flatMap(item => (item.kind === 'action' ? [item.key] : []))
);

/**
 * The AI workspace owns its chat scroll view and composer, so it needs a
 * fixed-height flex container; every other section is ordinary scrollable
 * content. Keeping this a pure decision makes the layout testable.
 */
export type PanelContentMode = 'flex' | 'scroll';

export const panelContentMode = (section: PanelSection): PanelContentMode =>
  section === 'ai' ? 'flex' : 'scroll';
