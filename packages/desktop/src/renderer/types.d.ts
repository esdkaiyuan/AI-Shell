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
  platform?: 'linux' | 'macos' | 'windows-powershell' | 'windows-cmd';
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

// 系统监控统计数据：CPU 占用率、内存占用率、系统运行时长（秒）、主进程内存（MB）
interface SystemStats {
  cpu: number;
  memory: number;
  uptimeSeconds: number;
  processMemoryMB: number;
}

// Agent 自主任务相关载荷
interface AgentToolCall {
  tool: string;
  args: Record<string, unknown>;
}

interface AgentToolResult {
  ok: boolean;
  output: string;
  durationMs?: number;
}

interface AgentEventPayload {
  type: 'step-start' | 'thinking' | 'tool-call' | 'tool-result' | 'final' | 'error' | 'limit';
  step: number;
  text?: string;
  content?: string;
  message?: string;
  reason?: string;
  call?: AgentToolCall;
  result?: AgentToolResult;
}

interface AgentRunOptions {
  terminalContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxSteps?: number;
  autoApprove?: boolean;
  provider?: string;
  model?: string;
}

interface AgentRunResult {
  content: string;
  steps: number;
  calls: AgentToolCall[];
  status: 'completed' | 'aborted' | 'limit' | 'error';
  error?: string;
}

interface AgentConfirmRequest {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'read' | 'write';
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
    ) => Promise<AIResponse> & { streamId: string };
    abortChatStream: (streamId: string) => Promise<boolean>;
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
  system: {
    platform: string;
    getStats: () => Promise<SystemStats>;
    onStats: (callback: (stats: SystemStats) => void) => () => void;
    onNavigate: (callback: (view: 'settings') => void) => () => void;
    setShortcutRecording: (active: boolean) => Promise<void>;
  };
  clipboard: {
    write: (text: string) => Promise<void>;
    read: () => Promise<string>;
  };
  agent: {
    run: (runId: string, task: string, options?: AgentRunOptions) => Promise<AgentRunResult>;
    onEvent: (callback: (runId: string, event: AgentEventPayload) => void) => () => void;
    onConfirm: (callback: (runId: string, request: AgentConfirmRequest) => void) => () => void;
    respondConfirm: (confirmId: string, approved: boolean) => Promise<boolean>;
    abort: (runId: string) => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
