export type CommandPlatform =
  | 'alpine'
  | 'linux'
  | 'macos'
  | 'windows-powershell'
  | 'windows-cmd';

export type RemoteCommandPlatform = Exclude<CommandPlatform, 'alpine'>;

const COMMAND_PLATFORMS: CommandPlatform[] = [
  'alpine',
  'linux',
  'macos',
  'windows-powershell',
  'windows-cmd',
];

export const isCommandPlatform = (value: unknown): value is CommandPlatform =>
  typeof value === 'string' && COMMAND_PLATFORMS.includes(value as CommandPlatform);

export const COMMAND_PLATFORM_LABELS: Record<CommandPlatform, string> = {
  alpine: 'Alpine',
  linux: 'Linux',
  macos: 'macOS',
  'windows-powershell': 'Windows PowerShell',
  'windows-cmd': 'Windows CMD',
};

export const COMMAND_PLATFORM_OPTIONS: Array<{
  platform: RemoteCommandPlatform;
  label: string;
  description: string;
}> = [
  { platform: 'linux', label: 'Linux', description: 'systemd / GNU 工具' },
  { platform: 'macos', label: 'macOS', description: 'launchctl / Homebrew' },
  {
    platform: 'windows-powershell',
    label: 'Windows PowerShell',
    description: 'PowerShell 命令',
  },
  { platform: 'windows-cmd', label: 'Windows CMD', description: 'OpenSSH 默认 Shell' },
];

export interface CommandEntry {
  command: string;
  description: string;
}

export interface CommandSuggestion extends CommandEntry {
  source: 'history' | 'catalog';
}

const entry = (command: string, description: string): CommandEntry => ({ command, description });

const COMMON_COMMANDS: CommandEntry[] = [
  entry('git status', '查看工作区状态'),
  entry('git diff', '查看未提交改动'),
  entry('git log --oneline -20', '查看最近提交'),
  entry('git pull', '拉取远端更新'),
  entry('git push', '推送当前分支'),
  entry('git branch', '列出本地分支'),
  entry('git checkout -b', '创建并切换分支'),
  entry('git clone', '克隆仓库'),
  entry('npm install', '安装 Node 依赖'),
  entry('npm run dev', '启动开发服务'),
  entry('npm run build', '执行生产构建'),
  entry('npm test', '运行测试'),
  entry('pnpm install', '安装 pnpm 依赖'),
  entry('pnpm dev', '启动开发服务'),
  entry('pnpm build', '执行生产构建'),
  entry('pnpm test', '运行测试'),
  entry('node --version', '查看 Node 版本'),
  entry('docker ps', '查看运行中的容器'),
  entry('docker logs -f', '持续查看容器日志'),
  entry('docker compose up -d', '后台启动 Compose 服务'),
  entry('docker compose down', '停止 Compose 服务'),
  entry('ssh', '连接远程主机'),
  entry('scp', '复制文件到远程主机'),
  entry('curl', '发送 HTTP 请求'),
  entry('whoami', '显示当前用户'),
  entry('date', '显示当前时间'),
];

const ALPINE_COMMANDS: CommandEntry[] = [
  entry('apk update', '更新软件包索引'),
  entry('apk upgrade', '升级已安装软件包'),
  entry('apk add', '安装 Alpine 软件包'),
  entry('apk del', '卸载 Alpine 软件包'),
  entry('apk info', '查看软件包信息'),
  entry('apk search', '搜索软件包'),
  entry('rc-service', '管理 OpenRC 服务'),
  entry('rc-update add', '设置开机启动服务'),
  entry('ls -la', '列出目录及隐藏文件'),
  entry('cd', '切换目录'),
  entry('pwd', '显示当前目录'),
  entry('cat', '查看文件内容'),
  entry('tail -f', '持续查看日志'),
  entry('grep -rn', '递归搜索文件内容'),
  entry('find . -name', '按名称查找文件'),
  entry('ps aux', '查看全部进程'),
  entry('top', '查看实时进程'),
  entry('kill -9', '强制结束进程'),
  entry('df -h', '查看磁盘空间'),
  entry('free -h', '查看内存使用'),
  entry('du -sh', '统计目录大小'),
  entry('ip addr', '查看网络地址'),
  entry('ss -tlnp', '查看监听端口'),
  entry('uname -a', '查看内核信息'),
  entry('chmod +x', '添加执行权限'),
  entry('tar -xzf', '解压 tar.gz 文件'),
  entry('tar -czf', '创建 tar.gz 压缩包'),
];

const LINUX_COMMANDS: CommandEntry[] = [
  entry('ls -la', '列出目录及隐藏文件'),
  entry('cd', '切换目录'),
  entry('pwd', '显示当前目录'),
  entry('cat', '查看文件内容'),
  entry('tail -f', '持续查看日志'),
  entry('grep -rn', '递归搜索文件内容'),
  entry('find . -name', '按名称查找文件'),
  entry('ps aux', '查看全部进程'),
  entry('top', '查看实时进程'),
  entry('kill -9', '强制结束进程'),
  entry('systemctl status', '查看服务状态'),
  entry('systemctl restart', '重启服务'),
  entry('systemctl enable', '设置开机启动'),
  entry('journalctl -u', '查看服务日志'),
  entry('df -h', '查看磁盘空间'),
  entry('free -h', '查看内存使用'),
  entry('du -sh', '统计目录大小'),
  entry('ip addr', '查看网络地址'),
  entry('ss -tlnp', '查看监听端口'),
  entry('uname -a', '查看内核信息'),
  entry('chmod +x', '添加执行权限'),
  entry('tar -xzf', '解压 tar.gz 文件'),
  entry('tar -czf', '创建 tar.gz 压缩包'),
];

const MACOS_COMMANDS: CommandEntry[] = [
  entry('ls -la', '列出目录及隐藏文件'),
  entry('cd', '切换目录'),
  entry('pwd', '显示当前目录'),
  entry('cat', '查看文件内容'),
  entry('tail -f', '持续查看日志'),
  entry('grep -rn', '递归搜索文件内容'),
  entry('find . -name', '按名称查找文件'),
  entry('ps aux', '查看全部进程'),
  entry('top -o cpu', '按 CPU 查看进程'),
  entry('kill -9', '强制结束进程'),
  entry('vm_stat', '查看虚拟内存统计'),
  entry('df -h', '查看磁盘空间'),
  entry('du -sh', '统计目录大小'),
  entry('diskutil list', '列出磁盘和分区'),
  entry('sw_vers', '查看 macOS 版本'),
  entry('uname -a', '查看系统信息'),
  entry('launchctl list', '查看 launchd 服务'),
  entry('networksetup -listallhardwareports', '列出网络接口'),
  entry('netstat -an', '查看网络连接'),
  entry('scutil --dns', '查看 DNS 配置'),
  entry('brew update', '更新 Homebrew'),
  entry('brew upgrade', '升级 Homebrew 软件'),
  entry('brew install', '安装 Homebrew 软件'),
  entry('brew list', '列出 Homebrew 软件'),
  entry('softwareupdate -l', '检查系统更新'),
  entry('open .', '在访达中打开当前目录'),
  entry('pbcopy', '复制到系统剪贴板'),
  entry('pbpaste', '读取系统剪贴板'),
];

const POWERSHELL_COMMANDS: CommandEntry[] = [
  entry('Get-ChildItem', '列出目录内容'),
  entry('Get-ChildItem -Force', '包含隐藏项目'),
  entry('Set-Location', '切换目录'),
  entry('Get-Location', '显示当前目录'),
  entry('Get-Content', '读取文件内容'),
  entry('Copy-Item', '复制文件或目录'),
  entry('Move-Item', '移动文件或目录'),
  entry('Remove-Item', '删除文件或目录'),
  entry('New-Item -ItemType Directory', '创建目录'),
  entry('Get-Process', '查看进程'),
  entry('Stop-Process -Name', '结束进程'),
  entry('Get-Service', '查看服务'),
  entry('Start-Service', '启动服务'),
  entry('Stop-Service', '停止服务'),
  entry('Restart-Service', '重启服务'),
  entry('Get-NetTCPConnection', '查看 TCP 连接'),
  entry('Test-NetConnection', '测试网络连通性'),
  entry('Get-NetIPAddress', '查看 IP 地址'),
  entry('Resolve-DnsName', '解析 DNS'),
  entry('Get-ComputerInfo', '查看系统信息'),
  entry('Get-EventLog -LogName System -Newest 20', '查看系统事件'),
  entry('Get-CimInstance Win32_OperatingSystem', '查看操作系统信息'),
  entry('Get-Command', '查找命令'),
  entry('Get-Help', '查看命令帮助'),
  entry('Select-String', '搜索文本内容'),
  entry('Measure-Object', '统计对象属性'),
  entry('winget list', '列出已安装软件'),
  entry('winget install', '安装软件包'),
  entry('winget upgrade', '升级软件包'),
];

const CMD_COMMANDS: CommandEntry[] = [
  entry('dir', '列出目录内容'),
  entry('dir /a', '包含隐藏文件'),
  entry('cd', '切换目录'),
  entry('type', '读取文件内容'),
  entry('findstr /s /i', '递归搜索文本'),
  entry('where', '查找命令位置'),
  entry('copy', '复制文件'),
  entry('move', '移动文件'),
  entry('del', '删除文件'),
  entry('mkdir', '创建目录'),
  entry('rmdir /s /q', '递归删除目录'),
  entry('tasklist', '查看进程'),
  entry('taskkill /PID', '结束指定进程'),
  entry('sc query', '查看 Windows 服务'),
  entry('net start', '启动服务'),
  entry('net stop', '停止服务'),
  entry('netstat -ano', '查看端口与 PID'),
  entry('ipconfig /all', '查看网络配置'),
  entry('ping', '测试网络连通性'),
  entry('tracert', '跟踪网络路由'),
  entry('systeminfo', '查看系统信息'),
  entry('whoami', '显示当前用户'),
  entry('set', '查看环境变量'),
  entry('powershell', '启动 PowerShell'),
  entry('winget list', '列出已安装软件'),
  entry('winget install', '安装软件包'),
];

const uniqueEntries = (entries: CommandEntry[]): CommandEntry[] => {
  const seen = new Set<string>();
  return entries.filter(item => {
    const key = item.command.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const CATALOGS: Record<CommandPlatform, CommandEntry[]> = {
  alpine: uniqueEntries([...ALPINE_COMMANDS, ...COMMON_COMMANDS]),
  linux: uniqueEntries([...LINUX_COMMANDS, ...COMMON_COMMANDS]),
  macos: uniqueEntries([...MACOS_COMMANDS, ...COMMON_COMMANDS]),
  'windows-powershell': uniqueEntries([...POWERSHELL_COMMANDS, ...COMMON_COMMANDS]),
  'windows-cmd': uniqueEntries([...CMD_COMMANDS, ...COMMON_COMMANDS]),
};

const QUICK_COMMANDS: Record<CommandPlatform, string[]> = {
  alpine: [
    'apk update',
    'apk add htop',
    'df -h',
    'free -h',
    'ps aux | head -20',
    'ip addr',
    'uname -a',
    'git status',
  ],
  linux: [
    'systemctl status',
    'journalctl -u',
    'df -h',
    'free -h',
    'ps aux | head -20',
    'ss -tlnp',
    'uname -a',
    'git status',
  ],
  macos: [
    'sw_vers',
    'top -o cpu',
    'df -h',
    'diskutil list',
    'brew list',
    'ps aux | head -20',
    'networksetup -listallhardwareports',
    'git status',
  ],
  'windows-powershell': [
    'Get-Process',
    'Get-Service',
    'Get-ChildItem',
    'Get-NetTCPConnection',
    'Test-NetConnection',
    'Get-ComputerInfo',
    'winget list',
    'git status',
  ],
  'windows-cmd': [
    'dir',
    'tasklist',
    'ipconfig /all',
    'systeminfo',
    'netstat -ano',
    'sc query',
    'winget list',
    'git status',
  ],
};

export const commandCatalog = (platform: CommandPlatform): CommandEntry[] =>
  CATALOGS[platform] ?? CATALOGS.linux;

export const quickCommands = (platform: CommandPlatform, limit = 8): CommandEntry[] => {
  const catalog = commandCatalog(platform);
  return QUICK_COMMANDS[platform]
    .map(command => catalog.find(item => item.command === command) || entry(command, '常用命令'))
    .slice(0, limit);
};

export const suggestCommands = (
  input: string,
  history: string[],
  platform: CommandPlatform,
  limit = 6
): CommandSuggestion[] => {
  const prefix = input.trim().toLowerCase();
  if (!prefix) return [];

  const seen = new Set<string>();
  const results: CommandSuggestion[] = [];
  const push = (command: string, description: string, source: CommandSuggestion['source']) => {
    const trimmed = command.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key) || !key.startsWith(prefix)) return;
    seen.add(key);
    results.push({ command: trimmed, description, source });
  };

  for (const command of history) push(command, '历史命令', 'history');
  for (const item of commandCatalog(platform)) {
    push(item.command, item.description, 'catalog');
  }

  return results.slice(0, limit);
};
