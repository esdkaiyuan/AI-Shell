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
  platform?: 'linux' | 'macos' | 'windows-powershell' | 'windows-cmd';
  config?: Record<string, unknown>;
}

// 系统监控统计数据：CPU 占用率、内存占用率、系统运行时长（秒）、主进程内存（MB）
interface SystemStats {
  cpu: number;
  memory: number;
  uptimeSeconds: number;
  processMemoryMB: number;
}

interface AgentRunOptions {
  terminalContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxSteps?: number;
  autoApprove?: boolean;
  provider?: string;
  model?: string;
}

interface AgentEventPayload {
  type: string;
  step: number;
  [key: string]: unknown;
}

interface AgentRunResult {
  content: string;
  steps: number;
  calls: Array<{ tool: string; args: Record<string, unknown> }>;
  status: 'completed' | 'aborted' | 'limit' | 'error';
  error?: string;
}

interface AgentConfirmRequest {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'read' | 'write';
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
    // 流式对话：onChunk 增量回调；返回的 promise 带 streamId，供 abortChatStream 中断
    chatStream: (
      messages: AIMessage[],
      provider: string | undefined,
      model: string | undefined,
      onChunk: (chunk: {
        content: string;
        done: boolean;
        final?: boolean;
        aborted?: boolean;
        error?: string;
      }) => void
    ) => {
      const streamId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const listener = (
        _: Electron.IpcRendererEvent,
        id: string,
        payload: {
          content: string;
          done: boolean;
          final?: boolean;
          aborted?: boolean;
          error?: string;
        }
      ) => {
        if (id === streamId) onChunk(payload);
      };
      ipcRenderer.on('ai:chat-chunk', listener);
      const promise = ipcRenderer
        .invoke('ai:chat-stream', streamId, messages, provider, model)
        .finally(() => ipcRenderer.removeListener('ai:chat-chunk', listener));
      // 挂上 streamId，渲染层拿到后即可调用 abortChatStream
      return Object.assign(promise, { streamId });
    },
    // 中断指定流式请求
    abortChatStream: (streamId: string) => ipcRenderer.invoke('ai:chat-abort', streamId),
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

  // 系统监控
  system: {
    platform: process.platform,
    getStats: () => ipcRenderer.invoke('system:get-stats'),
    onStats: (callback: (stats: SystemStats) => void) => {
      const listener = (_: Electron.IpcRendererEvent, stats: SystemStats) => callback(stats);
      ipcRenderer.on('system:stats', listener);
      return () => ipcRenderer.removeListener('system:stats', listener);
    },
    onNavigate: (callback: (view: 'settings') => void) => {
      const listener = (_: Electron.IpcRendererEvent, view: 'settings') => callback(view);
      ipcRenderer.on('app:navigate', listener);
      return () => ipcRenderer.removeListener('app:navigate', listener);
    },
    setShortcutRecording: (active: boolean) =>
      ipcRenderer.invoke('app:shortcut-recording', active) as Promise<void>,
  },

  // Agent 自主任务：事件推送 + 人工确认
  agent: {
    run: (runId: string, task: string, options: AgentRunOptions = {}): Promise<AgentRunResult> =>
      ipcRenderer.invoke('agent:run', { runId, task, ...options }),
    onEvent: (callback: (runId: string, event: AgentEventPayload) => void) => {
      const listener = (_: Electron.IpcRendererEvent, id: string, payload: AgentEventPayload) =>
        callback(id, payload);
      ipcRenderer.on('agent:event', listener);
      return () => ipcRenderer.removeListener('agent:event', listener);
    },
    onConfirm: (callback: (runId: string, request: AgentConfirmRequest) => void) => {
      const listener = (_: Electron.IpcRendererEvent, id: string, request: AgentConfirmRequest) =>
        callback(id, request);
      ipcRenderer.on('agent:confirm', listener);
      return () => ipcRenderer.removeListener('agent:confirm', listener);
    },
    respondConfirm: (confirmId: string, approved: boolean): Promise<boolean> =>
      ipcRenderer.invoke('agent:confirm-response', confirmId, approved),
    abort: (runId: string): Promise<boolean> => ipcRenderer.invoke('agent:abort', runId),
  },

  // 剪贴板操作（工具栏复制/粘贴）
  clipboard: {
    write: (text: string) => ipcRenderer.invoke('clipboard:write', text),
    read: () => ipcRenderer.invoke('clipboard:read'),
  },
});
