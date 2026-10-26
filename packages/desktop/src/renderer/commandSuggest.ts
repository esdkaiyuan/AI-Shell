// commandSuggest.ts
// Tab 命令自动补全的纯逻辑：从历史命令 / 快捷片段 / 常用命令里挑候选。
// 不依赖 DOM，便于单元测试。

export interface SuggestSource {
  command: string;
  /** 来源标记，展示用 */
  origin: 'history' | 'snippet' | 'common';
}

/** 常用命令词典（覆盖日常运维/开发高频命令） */
export const COMMON_COMMANDS: string[] = [
  'ls', 'ls -la', 'cd', 'pwd', 'cat', 'tail -f', 'grep -rn', 'find . -name',
  'mkdir', 'rm -rf', 'cp -r', 'mv', 'chmod', 'chown', 'ps aux', 'top', 'kill -9',
  'df -h', 'du -sh', 'free -h', 'uname -a', 'whoami', 'date', 'history',
  'git status', 'git diff', 'git log --oneline -20', 'git pull', 'git push',
  'git commit -m', 'git checkout -b', 'git branch', 'git stash', 'git clone',
  'npm install', 'npm run dev', 'npm run build', 'npm test', 'npm outdated',
  'pnpm install', 'pnpm dev', 'pnpm build', 'pnpm test',
  'yarn install', 'yarn dev', 'yarn build',
  'docker ps', 'docker images', 'docker logs -f', 'docker exec -it', 'docker compose up -d',
  'docker compose down', 'docker build -t', 'docker restart',
  'systemctl status', 'systemctl restart', 'systemctl enable', 'journalctl -u',
  'curl -X GET', 'curl -X POST', 'wget', 'ping', 'netstat -tlnp', 'ss -tlnp',
  'ssh', 'scp', 'rsync -avz', 'tar -xzf', 'tar -czf', 'zip -r', 'unzip',
  'python3', 'python3 -m venv', 'pip install', 'pip list',
  'node', 'npx', 'vue --version', 'kubectl get pods', 'kubectl logs -f',
];

export interface SuggestOptions {
  /** 最多返回几条 */
  limit?: number;
  /** 是否包含常用命令 */
  includeCommon?: boolean;
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
  const { limit = 8, includeCommon = true } = options;
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
    for (const cmd of COMMON_COMMANDS) push(cmd, 'common');
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
