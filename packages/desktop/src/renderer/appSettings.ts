// appSettings.ts
// 应用通用设置（终端外观等）的轻量级存储 + 订阅机制。
// - 持久化到 localStorage，跨会话保留
// - 终端组件订阅变化后实时应用（字体、字号、光标、主题等）

export type TerminalThemeName = 'mono-dark' | 'classic-dark' | 'solarized-dark' | 'light';
export type CursorStyle = 'block' | 'underline' | 'bar';

export interface AppSettings {
  fontSize: number;
  fontFamily: string;
  cursorStyle: CursorStyle;
  cursorBlink: boolean;
  scrollback: number;
  theme: TerminalThemeName;
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 13,
  fontFamily: '"Consolas", "Courier New", "DejaVu Sans Mono", monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 1000,
  theme: 'mono-dark',
};

// 各主题对应的 xterm 配色
export const TERMINAL_THEMES: Record<TerminalThemeName, any> = {
  'mono-dark': {
    background: '#070a0e',
    foreground: '#dce6f1',
    cursor: '#2f8cff',
    cursorAccent: '#07101b',
    selectionBackground: '#26384b',
    black: '#070a0e',
    red: '#ef5964',
    green: '#35c26b',
    yellow: '#d9a441',
    blue: '#2f8cff',
    magenta: '#b984ff',
    cyan: '#3fc5da',
    white: '#dce6f1',
    brightBlack: '#596574',
    brightRed: '#ff7a84',
    brightGreen: '#5edb8a',
    brightYellow: '#f0bf62',
    brightBlue: '#63a9ff',
    brightMagenta: '#cda7ff',
    brightCyan: '#69d8e9',
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
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  update(partial: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...partial };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to persist app settings:', error);
    }
    this.emit();
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
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
