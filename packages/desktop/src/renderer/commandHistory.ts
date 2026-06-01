// commandHistory.ts
// 记录 AI 生成并被「插入」或「执行」的命令，支持快速重新使用。
// 持久化到 localStorage，跨会话保留。

export interface CommandHistoryEntry {
  id: string;
  command: string;
  action: 'insert' | 'execute' | 'copy';
  ts: number;
}

const STORAGE_KEY = 'shellai.commandHistory';
const MAX_ENTRIES = 100;
type Listener = (entries: CommandHistoryEntry[]) => void;

class CommandHistoryStore {
  private entries: CommandHistoryEntry[] = [];
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
      this.entries = [];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch (error) {
      console.error('Failed to persist command history:', error);
    }
  }

  add(command: string, action: CommandHistoryEntry['action']) {
    const trimmed = command.trim();
    if (!trimmed) return;

    // 去重：若最近一条就是相同命令，则只更新时间戳
    const existing = this.entries[0];
    if (existing && existing.command === trimmed) {
      existing.ts = Date.now();
      existing.action = action;
    } else {
      this.entries.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        command: trimmed,
        action,
        ts: Date.now(),
      });
    }

    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.persist();
    this.emit();
  }

  remove(id: string) {
    this.entries = this.entries.filter(e => e.id !== id);
    this.persist();
    this.emit();
  }

  clear() {
    this.entries = [];
    this.persist();
    this.emit();
  }

  getAll(): CommandHistoryEntry[] {
    return [...this.entries];
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

export const commandHistory = new CommandHistoryStore();
