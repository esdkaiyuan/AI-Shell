// appSettings.ts
// 应用通用设置（终端外观等）的轻量级存储 + 订阅机制。
// - 持久化到 localStorage，跨会话保留
// - 终端组件订阅变化后实时应用（字体、字号、光标、主题等）

import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutMap,
  normalizeShortcutSchemes,
  type ShortcutMap,
  type ShortcutScheme,
} from './shortcuts';

export type TerminalThemeName = 'mono-dark' | 'classic-dark' | 'solarized-dark' | 'light';
export type CursorStyle = 'block' | 'underline' | 'bar';

export interface AppSettings {
  fontSize: number;
  fontFamily: string;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
  theme: TerminalThemeName;
  /** AI 面板在右侧停靠时的宽度（px） */
  aiPanelWidth: number;
  /** AI 面板在底部停靠时的高度（px） */
  aiPanelHeight: number;
  /** 分屏窗格比例（第一个窗格占比，0.2 ~ 0.8） */
  splitPaneRatio: number;
  /** AI 对话使用的提供商名称（空 = 自动选第一个可用） */
  aiProvider: string;
  /** AI 对话使用的模型名称（空 = 由提供商默认） */
  aiModel: string;
  /** 当前生效的全局快捷键 */
  shortcuts: ShortcutMap;
  /** 用户保存的快捷键方案 */
  shortcutSchemes: ShortcutScheme[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 13,
  fontFamily: "'SF Mono', 'Cascadia Code', Consolas, 'JetBrains Mono', monospace",
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 2000,
  theme: 'mono-dark',
  aiPanelWidth: 420,
  aiPanelHeight: 280,
  splitPaneRatio: 0.5,
  aiProvider: '',
  aiModel: '',
  shortcuts: { ...DEFAULT_SHORTCUTS },
  shortcutSchemes: [],
};

/** 面板尺寸边界，防止拖到看不见 */
export const PANEL_LIMITS = {
  aiPanelWidth: { min: 280, max: 720 },
  aiPanelHeight: { min: 160, max: 560 },
  splitPaneRatio: { min: 0.2, max: 0.8 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// 各主题对应的 xterm 配色
export const TERMINAL_THEMES: Record<TerminalThemeName, any> = {
  'mono-dark': {
    background: '#0a0a0b',
    foreground: '#e5e5ea',
    cursor: '#0a84ff',
    cursorAccent: '#0a0a0b',
    selectionBackground: '#264a73',
    black: '#1c1c1e',
    red: '#ff453a',
    green: '#30d158',
    yellow: '#ffd60a',
    blue: '#0a84ff',
    magenta: '#bf5af2',
    cyan: '#64d2ff',
    white: '#f5f5f7',
    brightBlack: '#6e6e73',
    brightRed: '#ff6961',
    brightGreen: '#5ee07c',
    brightYellow: '#ffe45c',
    brightBlue: '#409cff',
    brightMagenta: '#d58bff',
    brightCyan: '#8ae0ff',
    brightWhite: '#ffffff',
  },
  'classic-dark': {
    background: '#0c0c0c',
    foreground: '#cccccc',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: '#264f78',
    black: '#0c0c0c',
    red: '#c50f1f',
    green: '#13a10e',
    yellow: '#c19c00',
    blue: '#0037da',
    magenta: '#881798',
    cyan: '#3a96dd',
    white: '#cccccc',
    brightBlack: '#767676',
    brightRed: '#e74856',
    brightGreen: '#16c60c',
    brightYellow: '#f9f1a5',
    brightBlue: '#3b78ff',
    brightMagenta: '#b4009e',
    brightCyan: '#61d6d6',
    brightWhite: '#f2f2f2',
  },
  'solarized-dark': {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#93a1a1',
    cursorAccent: '#002b36',
    selectionBackground: '#073642',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#586e75',
    brightYellow: '#657b83',
    brightBlue: '#839496',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3',
  },
  light: {
    background: '#ffffff',
    foreground: '#2e2e2e',
    cursor: '#2e2e2e',
    cursorAccent: '#ffffff',
    selectionBackground: '#d0d0d0',
    black: '#2e2e2e',
    red: '#c0392b',
    green: '#27ae60',
    yellow: '#b9770e',
    blue: '#2980b9',
    magenta: '#8e44ad',
    cyan: '#16a085',
    white: '#dcdcdc',
    brightBlack: '#5a5a5a',
    brightRed: '#e74c3c',
    brightGreen: '#2ecc71',
    brightYellow: '#f1c40f',
    brightBlue: '#3498db',
    brightMagenta: '#9b59b6',
    brightCyan: '#1abc9c',
    brightWhite: '#ffffff',
  },
};

const STORAGE_KEY = 'shellai.appSettings';
type Listener = (settings: AppSettings) => void;

class AppSettingsStore {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          shortcuts: normalizeShortcutMap(parsed.shortcuts),
          shortcutSchemes: normalizeShortcutSchemes(parsed.shortcutSchemes),
        };
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      this.settings = {
        ...DEFAULT_SETTINGS,
        shortcuts: { ...DEFAULT_SHORTCUTS },
        shortcutSchemes: [],
      };
    }
  }

  get(): AppSettings {
    return {
      ...this.settings,
      shortcuts: { ...this.settings.shortcuts },
      shortcutSchemes: this.settings.shortcutSchemes.map(scheme => ({
        ...scheme,
        shortcuts: { ...scheme.shortcuts },
      })),
    };
  }

  update(partial: Partial<AppSettings>) {
    this.settings = {
      ...this.settings,
      ...partial,
      shortcuts: partial.shortcuts
        ? normalizeShortcutMap(partial.shortcuts)
        : { ...this.settings.shortcuts },
      shortcutSchemes: partial.shortcutSchemes
        ? normalizeShortcutSchemes(partial.shortcutSchemes)
        : this.settings.shortcutSchemes.map(scheme => ({
            ...scheme,
            shortcuts: { ...scheme.shortcuts },
          })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to persist app settings:', error);
    }
    this.emit();
  }

  reset() {
    this.settings = {
      ...DEFAULT_SETTINGS,
      shortcuts: { ...DEFAULT_SHORTCUTS },
      shortcutSchemes: this.settings.shortcutSchemes.map(scheme => ({
        ...scheme,
        shortcuts: { ...scheme.shortcuts },
      })),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to persist app settings:', error);
    }
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = this.get();
    this.listeners.forEach(l => l(snapshot));
  }
}

export const appSettings = new AppSettingsStore();
