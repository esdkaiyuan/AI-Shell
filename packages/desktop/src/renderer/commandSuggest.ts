// commandSuggest.ts
// Tab 命令自动补全的纯逻辑：从历史命令 / 快捷片段 / 常用命令里挑候选。
// 不依赖 DOM，便于单元测试。

export interface SuggestSource {
  command: string;
  /** 来源标记，展示用 */
  origin: 'history' | 'snippet' | 'common' | 'path';
  /**
   * 从行缓冲的哪个下标开始替换。
   * 缺省 0 = 整行替换（命令补全）；路径补全只替换末尾 token。
   */
  replaceFrom?: number;
}

export type CommandPlatform = 'linux' | 'macos' | 'windows-powershell' | 'windows-cmd';

export const COMMAND_PLATFORM_LABELS: Record<CommandPlatform, string> = {
  linux: 'Linux',
  macos: 'macOS',
  'windows-powershell': 'Windows PowerShell',
  'windows-cmd': 'Windows CMD',
};

export const COMMAND_PLATFORM_OPTIONS: Array<{ platform: CommandPlatform; label: string }> = [
  { platform: 'linux', label: 'Linux' },
  { platform: 'macos', label: 'macOS' },
  { platform: 'windows-powershell', label: 'Windows PowerShell' },
  { platform: 'windows-cmd', label: 'Windows CMD' },
];

const CROSS_PLATFORM_COMMANDS = [
  'git status', 'git diff', 'git log --oneline -20', 'git pull', 'git push',
  'git commit -m', 'git checkout -b', 'git branch', 'git stash', 'git clone',
  'npm install', 'npm run dev', 'npm run build', 'npm test', 'npm outdated',
  'pnpm install', 'pnpm dev', 'pnpm build', 'pnpm test',
  'yarn install', 'yarn dev', 'yarn build',
  'docker ps', 'docker images', 'docker logs -f', 'docker exec -it', 'docker compose up -d',
  'docker compose down', 'docker build -t', 'docker restart',
  'ssh', 'scp', 'curl -X GET', 'curl -X POST',
  'node', 'npx', 'whoami', 'date',
];

const LINUX_COMMANDS = [
  'ls', 'ls -la', 'cd', 'pwd', 'cat', 'tail -f', 'grep -rn', 'find . -name',
  'mkdir', 'rm -rf', 'cp -r', 'mv', 'chmod', 'chown', 'ps aux', 'top', 'kill -9',
  'df -h', 'du -sh', 'free -h', 'uname -a', 'history',
  'systemctl status', 'systemctl restart', 'systemctl enable', 'journalctl -u',
  'wget', 'ping', 'netstat -tlnp', 'ss -tlnp', 'rsync -avz',
  'tar -xzf', 'tar -czf', 'zip -r', 'unzip',
  'python3', 'python3 -m venv', 'pip install', 'pip list',
  'vue --version', 'kubectl get pods', 'kubectl logs -f',
  ...CROSS_PLATFORM_COMMANDS,
];

const MACOS_COMMANDS = [
  'ls', 'ls -la', 'cd', 'pwd', 'cat', 'tail -f', 'grep -rn', 'find . -name',
  'mkdir', 'rm -rf', 'cp -r', 'mv', 'chmod', 'chown', 'ps aux', 'top -o cpu', 'kill -9',
  'df -h', 'du -sh', 'vm_stat', 'uname -a', 'history', 'sw_vers',
  'diskutil list', 'launchctl list', 'networksetup -listallhardwareports',
  'netstat -an', 'scutil --dns', 'open .', 'pbcopy', 'pbpaste', 'softwareupdate -l',
  'brew update', 'brew upgrade', 'brew install', 'brew list',
  'ping', 'rsync -avz', 'tar -xzf', 'tar -czf', 'zip -r', 'unzip',
  'python3', 'python3 -m venv', 'pip install', 'pip list',
  ...CROSS_PLATFORM_COMMANDS,
];

const POWERSHELL_COMMANDS = [
  'Get-ChildItem', 'Get-ChildItem -Force', 'Set-Location', 'Get-Location',
  'Get-Content', 'Copy-Item', 'Move-Item', 'Remove-Item',
  'New-Item -ItemType Directory', 'Get-Process', 'Stop-Process -Name',
  'Get-Service', 'Start-Service', 'Stop-Service', 'Restart-Service',
  'Get-NetTCPConnection', 'Test-NetConnection', 'Get-NetIPAddress', 'Resolve-DnsName',
  'Get-ComputerInfo', 'Get-EventLog -LogName System -Newest 20',
  'Get-CimInstance Win32_OperatingSystem', 'Get-Command', 'Get-Help',
  'Select-String', 'Measure-Object', 'winget list', 'winget install', 'winget upgrade',
  ...CROSS_PLATFORM_COMMANDS,
];

const CMD_COMMANDS = [
  'dir', 'dir /a', 'cd', 'type', 'findstr /s /i', 'where', 'copy', 'move', 'del',
  'mkdir', 'rmdir /s /q', 'tasklist', 'taskkill /PID', 'sc query', 'net start',
  'net stop', 'netstat -ano', 'ipconfig /all', 'ping', 'tracert', 'systeminfo',
  'set', 'powershell', 'winget list', 'winget install',
  ...CROSS_PLATFORM_COMMANDS,
];

const CATALOGS: Record<CommandPlatform, string[]> = {
  linux: LINUX_COMMANDS,
  macos: MACOS_COMMANDS,
  'windows-powershell': POWERSHELL_COMMANDS,
  'windows-cmd': CMD_COMMANDS,
};

/** 默认 Linux 常用命令词典（保持既有调用方兼容） */
export const COMMON_COMMANDS: string[] = [...CATALOGS.linux];

export const platformForLocalHost = (platform: string): CommandPlatform => {
  if (platform === 'win32') return 'windows-cmd';
  if (platform === 'darwin') return 'macos';
  return 'linux';
};

export const coerceCommandPlatform = (value: unknown): CommandPlatform =>
  COMMAND_PLATFORM_OPTIONS.some(option => option.platform === value)
    ? (value as CommandPlatform)
    : 'linux';

export interface SuggestOptions {
  /** 最多返回几条 */
  limit?: number;
  /** 是否包含常用命令 */
  includeCommon?: boolean;
  /** 目标本机或远端操作系统 */
  platform?: CommandPlatform;
}

/**
 * 根据当前输入前缀返回补全候选。
 * @param prefix 用户已输入的文本（通常是当前行）
 * @param history 历史命令（新→旧）
 * @param snippets 快捷片段命令
 */
export function suggestCommands(
  prefix: string,
  history: string[],
  snippets: string[],
  options: SuggestOptions = {}
): SuggestSource[] {
  const { limit = 8, includeCommon = true, platform = 'linux' } = options;
  const p = prefix.trim().toLowerCase();
  if (!p) return [];

  const seen = new Set<string>();
  const results: SuggestSource[] = [];

  const push = (command: string, origin: SuggestSource['origin']) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    // 必须以输入前缀开头（大小写不敏感）
    if (!key.startsWith(p)) return;
    seen.add(key);
    results.push({ command: trimmed, origin });
  };

  // 优先级：快捷片段 > 历史命令 > 常用命令
  for (const cmd of snippets) push(cmd, 'snippet');
  for (const cmd of history) push(cmd, 'history');
  if (includeCommon) {
    for (const cmd of CATALOGS[platform] ?? COMMON_COMMANDS) push(cmd, 'common');
  }

  return results.slice(0, limit);
}

/**
 * 提取当前终端行缓冲中的"当前词"，用于补全。
 * 例如 "git che|" → "git che"，"sudo apt inst|" → "sudo apt inst"（取整行做前缀更实用）。
 */
export function currentInputPrefix(lineBuffer: string): string {
  // 只取最后一个换行之后的内容（单行输入场景）
  const lastLine = lineBuffer.split('\n').pop() ?? '';
  return lastLine;
}

/** 输入行状态跟踪器：根据按键流维护当前输入缓冲 */
export class InputLineTracker {
  private buffer = '';

  /** 处理一次终端输入数据，返回更新后的缓冲 */
  feed(data: string): string {
    for (const ch of data) {
      if (ch === '\r' || ch === '\n') {
        // 回车清空（命令已提交）
        this.buffer = '';
      } else if (ch === '\x7f' || ch === '\b') {
        // 退格
        this.buffer = this.buffer.slice(0, -1);
      } else if (ch === '\x03') {
        // Ctrl+C
        this.buffer = '';
      } else if (ch === '\x15') {
        // Ctrl+U 清行
        this.buffer = '';
      } else if (ch === '\x1b') {
        // 转义序列（方向键等）—— 忽略整段序列，这里粗略跳过
        // 后续字符由下一轮循环逐个处理；对补全场景足够
      } else if (ch >= ' ' || ch === '\t') {
        this.buffer += ch;
      }
    }
    return this.buffer;
  }

  get(): string {
    return this.buffer;
  }

  clear(): void {
    this.buffer = '';
  }
}

// ---- 路径补全 ----

export interface PathToken {
  /** 末尾 token 是否像路径（含分隔符 / \ 或以 ~ . 开头） */
  isPath: boolean;
  /** 末尾 token 在整行中的起始下标 */
  tokenStart: number;
  /** 末尾 token 原文 */
  token: string;
  /** 目录部分（含末尾分隔符），如 "src/" "~/" "/usr/" */
  dirPart: string;
  /** 目录之后正在输入的文件名前缀 */
  namePrefix: string;
}

/** 解析当前输入行末尾的路径 token */
export function parsePathToken(line: string): PathToken {
  // 取最后一个空白分隔的 token
  const match = /(\S*)$/.exec(line);
  const token = match?.[1] ?? '';
  const tokenStart = line.length - token.length;

  const lastSep = Math.max(token.lastIndexOf('/'), token.lastIndexOf('\\'));
  const looksLikePath =
    token.includes('/') ||
    token.includes('\\') ||
    token.startsWith('~') ||
    token.startsWith('.');

  if (!looksLikePath) {
    return { isPath: false, tokenStart, token, dirPart: '', namePrefix: token };
  }

  const dirPart = lastSep >= 0 ? token.slice(0, lastSep + 1) : '';
  const namePrefix = lastSep >= 0 ? token.slice(lastSep + 1) : token;
  return { isPath: true, tokenStart, token, dirPart, namePrefix };
}

export interface ResolvedDir {
  absDir: string;
  root: 'home' | 'workspace';
}

/**
 * 把 dirPart 解析为绝对目录 + 所属根（home/workspace）。
 * 解析不了（如绝对路径在两根之外）返回 null。
 */
export function resolveDir(
  dirPart: string,
  home: string,
  workspace: string
): ResolvedDir | null {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');

  if (dirPart === '' || dirPart === './') {
    return { absDir: workspace, root: 'workspace' };
  }

  if (dirPart.startsWith('~')) {
    const rest = dirPart.slice(1).replace(/^[\\/]/, '');
    const absDir = rest ? `${norm(home)}/${rest}` : home;
    return { absDir, root: 'home' };
  }

  const isAbsolute = dirPart.startsWith('/') || /^[A-Za-z]:[\\/]/.test(dirPart);
  if (isAbsolute) {
    const abs = norm(dirPart);
    const homeN = norm(home);
    const wsN = norm(workspace);
    const startsWith = (root: string) =>
      abs === root || abs.startsWith(root + '/');
    if (startsWith(wsN)) return { absDir: dirPart, root: 'workspace' };
    if (startsWith(homeN)) return { absDir: dirPart, root: 'home' };
    return null;
  }

  // 相对路径：相对 workspace
  return { absDir: `${norm(workspace)}/${dirPart}`.replace(/\/+$/, ''), root: 'workspace' };
}

/** 根据目录条目生成补全候选（替换末尾 token） */
export function buildPathSuggestions(
  pathToken: PathToken,
  entries: Array<{ name: string; type: 'file' | 'directory' }>,
  limit = 8
): SuggestSource[] {
  if (!pathToken.isPath) return [];
  const prefix = pathToken.namePrefix.toLowerCase();
  return entries
    .filter(e => e.name.toLowerCase().startsWith(prefix))
    .slice(0, limit)
    .map(e => ({
      command: pathToken.dirPart + e.name + (e.type === 'directory' ? '/' : ''),
      origin: 'path' as const,
      replaceFrom: pathToken.tokenStart,
    }));
}
