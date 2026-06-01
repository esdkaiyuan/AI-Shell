interface AIProviderConfig {
  name: string;
  apiKey: string;
  baseURL?: string;
  models: string[];
  enabled?: boolean;
}

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface SSHConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  hasPassphrase?: boolean;
  passphrase?: string;
  config?: Record<string, unknown>;
}

interface CommandHistoryItem {
  id: number;
  command: string;
  cwd: string;
  timestamp: number;
  exitCode: number;
}

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  hidden: boolean;
}

interface ElectronAPI {
  shell: {
    create: (shell: string, cwd: string) => Promise<string>;
    write: (sessionId: string, data: string) => Promise<void>;
    resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
    close: (sessionId: string) => Promise<void>;
    onData: (callback: (sessionId: string, data: string) => void) => () => void;
    onExit: (callback: (sessionId: string, exitCode: number) => void) => () => void;
  };
  ssh: {
    connect: (config: SSHConfig) => Promise<string>;
    disconnect: (sessionId: string) => Promise<void>;
    write: (sessionId: string, data: string) => Promise<void>;
    resize: (sessionId: string, cols: number, rows: number) => Promise<void>;
    listConfigs: () => Promise<SSHConfig[]>;
    saveConfig: (config: SSHConfig) => Promise<void>;
    deleteConfig: (name: string) => Promise<void>;
    onData: (callback: (sessionId: string, data: string) => void) => () => void;
    onClose: (callback: (sessionId: string) => void) => () => void;
  };
  ai: {
    chat: (messages: AIMessage[], provider?: string, model?: string) => Promise<AIResponse>;
    listProviders: () => Promise<AIProviderConfig[]>;
    addProvider: (provider: AIProviderConfig) => Promise<void>;
    removeProvider: (name: string) => Promise<void>;
    listModels: (provider?: string) => Promise<string[]>;
    listModelsForConfig: (config: AIProviderConfig) => Promise<string[]>;
  };
  history: {
    get: (limit?: number) => Promise<CommandHistoryItem[]>;
    search: (query: string, limit?: number) => Promise<CommandHistoryItem[]>;
    clear: () => Promise<void>;
  };
  files: {
    getHome: () => Promise<string>;
    getWorkspace: () => Promise<string>;
    listDirectory: (dirPath: string, root?: 'workspace' | 'home') => Promise<FileEntry[]>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
