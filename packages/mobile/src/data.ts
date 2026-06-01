export interface SSHConfigItem {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth: 'password' | 'privateKey' | 'agent';
  status: 'online' | 'idle' | 'offline';
  latency: string;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'directory' | 'file';
  parentPath?: string;
  size?: string;
  modified?: string;
  hidden?: boolean;
}

export interface AIProviderItem {
  id: string;
  name: string;
  model: string;
  enabled: boolean;
  endpoint: string;
  models?: string[];
  apiKeyPreview?: string;
  imported?: boolean;
}

export interface CommandHistoryItem {
  id: string;
  command: string;
  cwd: string;
  exitCode: number;
  timestamp: string;
}

export interface SavedSessionItem {
  id: string;
  name: string;
  terminalCount: number;
  activeTitle: string;
  updatedAt: string;
}

export const sshConfigs: SSHConfigItem[] = [
  {
    id: 'prod',
    name: '生产服务器',
    host: '10.0.8.12',
    port: 22,
    username: 'root',
    auth: 'privateKey',
    status: 'online',
    latency: '28 ms',
  },
  {
    id: 'build',
    name: '构建节点',
    host: 'build-02',
    port: 22,
    username: 'deploy',
    auth: 'agent',
    status: 'idle',
    latency: '64 ms',
  },
  {
    id: 'jump',
    name: '跳板机',
    host: 'bastion.internal',
    port: 2222,
    username: 'ops',
    auth: 'password',
    status: 'offline',
    latency: '--',
  },
];

export const fileTree: FileItem[] = [
  { id: 'src', name: 'src', path: '/shellai/src', parentPath: '/shellai', type: 'directory', modified: '今天' },
  { id: 'logs', name: 'logs', path: '/shellai/logs', parentPath: '/shellai', type: 'directory', modified: '今天' },
  { id: 'env', name: '.env.example', path: '/shellai/.env.example', parentPath: '/shellai', type: 'file', size: '2.1 KB', modified: '昨天', hidden: true },
  { id: 'readme', name: 'README.md', path: '/shellai/README.md', parentPath: '/shellai', type: 'file', size: '14.1 KB', modified: '周一' },
  { id: 'log-api', name: 'api.log', path: '/shellai/logs/api.log', parentPath: '/shellai/logs', type: 'file', size: '88 KB', modified: '刚刚' },
  { id: 'log-worker', name: 'worker.log', path: '/shellai/logs/worker.log', parentPath: '/shellai/logs', type: 'file', size: '41 KB', modified: '3 分钟前' },
  { id: 'app-tsx', name: 'App.tsx', path: '/shellai/src/App.tsx', parentPath: '/shellai/src', type: 'file', size: '24 KB', modified: '今天' },
  { id: 'theme-ts', name: 'theme.ts', path: '/shellai/src/theme.ts', parentPath: '/shellai/src', type: 'file', size: '3.2 KB', modified: '今天' },
];

export const aiProviders: AIProviderItem[] = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', enabled: true, endpoint: 'api.openai.com' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', enabled: true, endpoint: 'api.deepseek.com' },
  { id: 'ollama', name: 'Ollama', model: 'qwen2.5', enabled: false, endpoint: 'desktop relay' },
];

export const commandHistory: CommandHistoryItem[] = [
  { id: 'h1', command: 'docker ps', cwd: '/shellai', exitCode: 0, timestamp: '21:10' },
  { id: 'h2', command: 'systemctl status nginx', cwd: '/etc/nginx', exitCode: 0, timestamp: '20:58' },
  { id: 'h3', command: 'tail -n 100 /var/log/app.log', cwd: '/var/log', exitCode: 0, timestamp: '20:31' },
  { id: 'h4', command: 'pnpm --filter @ai-shell/mobile test', cwd: '/shellai', exitCode: 0, timestamp: '19:42' },
];

export const savedSessions: SavedSessionItem[] = [
  { id: 'ops', name: '运维排障工作区', terminalCount: 3, activeTitle: '生产服务器', updatedAt: '刚刚' },
  { id: 'build-debug', name: '构建调试工作区', terminalCount: 2, activeTitle: '构建节点', updatedAt: '今天' },
];

export const quickCommands = [
  'systemctl status nginx',
  'tail -f /var/log/app.log',
  'docker ps --format "table {{.Names}}\\t{{.Status}}"',
  'df -h',
  'journalctl -u api -n 80',
];
