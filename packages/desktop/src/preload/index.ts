import { contextBridge, ipcRenderer } from 'electron';

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
  passphrase?: string;
  config?: Record<string, unknown>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Shell operations
  shell: {
    create: (shell: string, cwd: string) => ipcRenderer.invoke('shell:create', shell, cwd),
    write: (sessionId: string, data: string) => ipcRenderer.invoke('shell:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('shell:resize', sessionId, cols, rows),
    close: (sessionId: string) => ipcRenderer.invoke('shell:close', sessionId),
    // 监听Shell数据
    onData: (callback: (sessionId: string, data: string) => void) => {
      const listener = (_: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on('shell:data', listener);
      return () => ipcRenderer.removeListener('shell:data', listener);
    },
    onExit: (callback: (sessionId: string, exitCode: number) => void) => {
      const listener = (_: Electron.IpcRendererEvent, sessionId: string, exitCode: number) =>
        callback(sessionId, exitCode);
      ipcRenderer.on('shell:exit', listener);
      return () => ipcRenderer.removeListener('shell:exit', listener);
    },
  },

  // SSH operations
  ssh: {
    connect: (config: SSHConfig) => ipcRenderer.invoke('ssh:connect', config),
    disconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId),
    write: (sessionId: string, data: string) => ipcRenderer.invoke('ssh:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.invoke('ssh:resize', sessionId, cols, rows),
    listConfigs: () => ipcRenderer.invoke('ssh:list-configs'),
    saveConfig: (config: SSHConfig) => ipcRenderer.invoke('ssh:save-config', config),
    deleteConfig: (name: string) => ipcRenderer.invoke('ssh:delete-config', name),
    // 监听SSH数据
    onData: (callback: (sessionId: string, data: string) => void) => {
      const listener = (_: Electron.IpcRendererEvent, sessionId: string, data: string) =>
        callback(sessionId, data);
      ipcRenderer.on('ssh:data', listener);
      return () => ipcRenderer.removeListener('ssh:data', listener);
    },
    onClose: (callback: (sessionId: string) => void) => {
      const listener = (_: Electron.IpcRendererEvent, sessionId: string) => callback(sessionId);
      ipcRenderer.on('ssh:close', listener);
      return () => ipcRenderer.removeListener('ssh:close', listener);
    },
  },

  // AI operations
  ai: {
    chat: (messages: AIMessage[], provider?: string, model?: string) =>
      ipcRenderer.invoke('ai:chat', messages, provider, model),
    listProviders: () => ipcRenderer.invoke('ai:list-providers'),
    addProvider: (provider: AIProviderConfig) => ipcRenderer.invoke('ai:add-provider', provider),
    removeProvider: (name: string) => ipcRenderer.invoke('ai:remove-provider', name),
    listModels: (provider?: string) => ipcRenderer.invoke('ai:list-models', provider),
    listModelsForConfig: (config: AIProviderConfig) =>
      ipcRenderer.invoke('ai:list-models-for-config', config),
  },

  // History operations
  history: {
    get: (limit?: number) => ipcRenderer.invoke('history:get', limit),
    search: (query: string, limit?: number) => ipcRenderer.invoke('history:search', query, limit),
    clear: () => ipcRenderer.invoke('history:clear'),
  },

  // File explorer operations
  files: {
    getHome: () => ipcRenderer.invoke('files:get-home'),
    getWorkspace: () => ipcRenderer.invoke('files:get-workspace'),
    listDirectory: (dirPath: string, root?: 'workspace' | 'home') =>
      ipcRenderer.invoke('files:list-directory', dirPath, root),
  },
});
