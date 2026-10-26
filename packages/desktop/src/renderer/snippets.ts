// snippets.ts
// 快捷命令片段库：保存常用命令，一键插入 / 执行 / 复制。
// 持久化到 localStorage，跨会话保留。

export interface CommandSnippet {
  id: string;
  name: string;
  command: string;
  group: string;
  ts: number;
}

const STORAGE_KEY = 'shellai.snippets';
const MAX_ENTRIES = 200;
type Listener = (snippets: CommandSnippet[]) => void;

const DEFAULT_SNIPPETS: Array<Omit<CommandSnippet, 'id' | 'ts'>> = [
  { name: '查看目录', command: 'ls -la', group: '常用' },
  { name: '磁盘占用', command: 'df -h', group: '常用' },
  { name: '内存占用', command: 'free -h', group: '常用' },
  { name: '进程列表', command: 'ps aux | head -20', group: '常用' },
  { name: 'Git 状态', command: 'git status', group: 'Git' },
  { name: 'Git 日志', command: 'git log --oneline -20', group: 'Git' },
  { name: 'Git 差异', command: 'git diff', group: 'Git' },
  { name: '端口占用', command: 'netstat -tlnp 2>/dev/null || ss -tlnp', group: '网络' },
  { name: '本机 IP', command: 'ip addr 2>/dev/null || ifconfig', group: '网络' },
  { name: 'NPM 脚本', command: 'npm run', group: '开发' },
];

class SnippetStore {
  private snippets: CommandSnippet[] = [];
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.snippets = parsed;
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load snippets:', error);
    }
    // 首次使用：写入默认片段
    this.snippets = DEFAULT_SNIPPETS.map((s, i) => ({
      ...s,
      id: `default-${i}`,
      ts: Date.now(),
    }));
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.snippets));
    } catch (error) {
      console.error('Failed to persist snippets:', error);
    }
  }

  add(name: string, command: string, group = '自定义') {
    const trimmedName = name.trim();
    const trimmedCmd = command.trim();
    if (!trimmedName || !trimmedCmd) return;

    this.snippets.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      command: trimmedCmd,
      group,
      ts: Date.now(),
    });

    if (this.snippets.length > MAX_ENTRIES) {
      this.snippets = this.snippets.slice(0, MAX_ENTRIES);
    }
    this.persist();
    this.emit();
  }

  update(id: string, patch: Partial<Pick<CommandSnippet, 'name' | 'command' | 'group'>>) {
    this.snippets = this.snippets.map(s => (s.id === id ? { ...s, ...patch } : s));
    this.persist();
    this.emit();
  }

  remove(id: string) {
    this.snippets = this.snippets.filter(s => s.id !== id);
    this.persist();
    this.emit();
  }

  clearCustom() {
    this.snippets = this.snippets.filter(s => s.id.startsWith('default-'));
    this.persist();
    this.emit();
  }

  getAll(): CommandSnippet[] {
    return [...this.snippets];
  }

  /** 按命令前缀搜索（用于 Tab 补全） */
  suggest(prefix: string, limit = 8): CommandSnippet[] {
    const p = prefix.trim().toLowerCase();
    if (!p) return [];
    return this.snippets
      .filter(s => s.command.toLowerCase().startsWith(p))
      .slice(0, limit);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = this.getAll();
    this.listeners.forEach(l => l(snapshot));
  }
}

export const snippetStore = new SnippetStore();
