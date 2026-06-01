// terminalBus.ts
// 一个轻量级的终端事件总线，让 AI 助手面板可以：
//  1. 读取当前活动终端的输出/命令/报错上下文
//  2. 把 AI 生成的命令“插入”到终端输入框，或“一键执行”
//
// 设计：Terminal 组件在挂载时把自己注册进来，AIAssistantPanel 通过
// 这里暴露的方法读取上下文 / 派发命令，二者解耦。

export interface TerminalLine {
  type: 'input' | 'output';
  text: string;
  ts: number;
}

// 单个终端会话的运行时句柄
export interface TerminalHandle {
  id: string;
  title: string;
  // 把文本写入终端（不自动回车）—— 用于“插入到输入框”
  insert: (text: string) => void;
  // 把命令写入终端并回车 —— 用于“一键执行”
  run: (command: string) => void;
  // 取最近的上下文（命令 + 输出 + 报错），用于喂给 AI
  getContext: (maxChars?: number) => string;
}

type Listener = () => void;
type ErrorListener = (info: { terminalId: string; snippet: string }) => void;

class TerminalBus {
  private handles = new Map<string, TerminalHandle>();
  private activeId: string | null = null;
  private listeners = new Set<Listener>();
  private errorListeners = new Set<ErrorListener>();

  register(handle: TerminalHandle) {
    this.handles.set(handle.id, handle);
    if (!this.activeId) this.activeId = handle.id;
    this.emit();
  }

  unregister(id: string) {
    this.handles.delete(id);
    if (this.activeId === id) {
      this.activeId = this.handles.keys().next().value ?? null;
    }
    this.emit();
  }

  setActive(id: string) {
    if (this.handles.has(id) || id === null) {
      this.activeId = id;
      this.emit();
    } else {
      // 即使句柄还没注册，也先记录活动 id
      this.activeId = id;
      this.emit();
    }
  }

  getActive(): TerminalHandle | null {
    if (!this.activeId) return null;
    return this.handles.get(this.activeId) ?? null;
  }

  getActiveId(): string | null {
    return this.activeId;
  }

  // ---- 提供给 AI 面板的便捷方法 ----

  insertToActive(text: string): boolean {
    const h = this.getActive();
    if (!h) return false;
    h.insert(text);
    return true;
  }

  runOnActive(command: string): boolean {
    const h = this.getActive();
    if (!h) return false;
    h.run(command);
    return true;
  }

  getActiveContext(maxChars = 4000): string {
    const h = this.getActive();
    if (!h) return '';
    return h.getContext(maxChars);
  }

  // ---- 订阅活动终端变化 ----
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach(l => l());
  }

  // ---- 报错检测通知 ----
  // 终端检测到疑似报错时调用，通知订阅者（AI 面板）
  notifyError(terminalId: string, snippet: string) {
    this.errorListeners.forEach(l => l({ terminalId, snippet }));
  }

  subscribeError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

// 全局单例
export const terminalBus = new TerminalBus();
