import type { Ionicons } from '@expo/vector-icons';
import type { MainView } from './mobileState';

export type PrimaryView = 'terminal' | 'ai' | 'explorer' | 'ssh' | 'profile';

export const primaryNavItems = [
  { key: 'terminal', label: '终端', icon: 'terminal-outline' },
  { key: 'ai', label: 'AI', icon: 'sparkles-outline' },
  { key: 'explorer', label: '文件', icon: 'folder-outline' },
  { key: 'ssh', label: 'SSH', icon: 'server-outline' },
  { key: 'profile', label: '我的', icon: 'person-circle-outline' },
] as const satisfies ReadonlyArray<{
  key: PrimaryView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}>;

const profileViews: MainView[] = ['profile', 'sessions', 'history', 'settings'];
const titles: Record<MainView, string> = {
  terminal: '终端',
  ai: 'AI 助手',
  explorer: '文件',
  ssh: 'SSH',
  profile: '我的',
  sessions: '会话',
  history: '命令历史',
  settings: '设置',
};

export const isViewActive = (primary: PrimaryView, current: MainView) =>
  primary === 'profile' ? profileViews.includes(current) : primary === current;

export const viewTitle = (view: MainView) => titles[view];
