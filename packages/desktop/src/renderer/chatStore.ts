// chatStore.ts
// AI 对话持久化：保存多会话对话，支持新建/切换/重命名/删除。
// 持久化到 localStorage，刷新或重启应用后对话仍在。

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  commands?: string[];
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'shellai.chatConversations';
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;
const TITLE_MAX_LENGTH = 30;

type Listener = (state: ChatState) => void;

export interface ChatState {
  conversations: ChatConversation[];
  activeId: string;
}

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** 从首条用户消息推导会话标题 */
export function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '新对话';
  const text = firstUser.content.replace(/\s+/g, ' ').trim();
  if (!text) return '新对话';
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text;
}

class ChatStore {
  private conversations: ChatConversation[] = [];
  private activeId = '';
  private listeners = new Set<Listener>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.conversations)) {
          this.conversations = parsed.conversations.filter(
            (c: ChatConversation) => c && typeof c.id === 'string'
          );
          this.activeId =
            typeof parsed.activeId === 'string' &&
            this.conversations.some(c => c.id === parsed.activeId)
              ? parsed.activeId
              : this.conversations[0]?.id ?? '';
        }
      }
    } catch (error) {
      console.error('Failed to load chat conversations:', error);
      this.conversations = [];
      this.activeId = '';
    }
  }

  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversations: this.conversations, activeId: this.activeId })
      );
    } catch (error) {
      console.error('Failed to persist chat conversations:', error);
    }
  }

  private emit() {
    this.listeners.forEach(l => l(this.getState()));
  }

  getState(): ChatState {
    return {
      conversations: this.conversations.map(c => ({
        ...c,
        messages: c.messages.map(m => ({ ...m })),
      })),
      activeId: this.activeId,
    };
  }

  getActive(): ChatConversation | null {
    return this.conversations.find(c => c.id === this.activeId) ?? null;
  }

  getMessages(): ChatMessage[] {
    return this.getActive()?.messages ?? [];
  }

  /** 新建会话并设为当前 */
  create(): string {
    const id = generateId();
    const now = Date.now();
    this.conversations.unshift({
      id,
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    });
    if (this.conversations.length > MAX_CONVERSATIONS) {
      this.conversations = this.conversations.slice(0, MAX_CONVERSATIONS);
    }
    this.activeId = id;
    this.persist();
    this.emit();
    return id;
  }

  /** 切换当前会话；目标不存在时自动新建 */
  setActive(id: string) {
    if (this.conversations.some(c => c.id === id)) {
      this.activeId = id;
    } else {
      this.create();
      return;
    }
    this.persist();
    this.emit();
  }

  rename(id: string, title: string) {
    const trimmed = title.trim();
    this.conversations = this.conversations.map(c =>
      c.id === id ? { ...c, title: trimmed || '未命名对话', updatedAt: Date.now() } : c
    );
    this.persist();
    this.emit();
  }

  remove(id: string) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.activeId === id) {
      this.activeId = this.conversations[0]?.id ?? '';
    }
    this.persist();
    this.emit();
  }

  clearAll() {
    this.conversations = [];
    this.activeId = '';
    this.persist();
    this.emit();
  }

  /** 追加消息到当前会话 */
  appendMessage(message: ChatMessage) {
    let target = this.getActive();
    if (!target) {
      this.create();
      target = this.getActive();
    }
    if (!target) return;

    const messages = [...target.messages, message];
    const trimmed =
      messages.length > MAX_MESSAGES_PER_CONVERSATION
        ? messages.slice(messages.length - MAX_MESSAGES_PER_CONVERSATION)
        : messages;

    this.conversations = this.conversations.map(c =>
      c.id === target!.id
        ? {
            ...c,
            messages: trimmed,
            // 首条用户消息后自动生成标题（仅在标题还是默认值时）
            title: c.title === '新对话' ? deriveTitle(trimmed) : c.title,
            updatedAt: Date.now(),
          }
        : c
    );
    this.persist();
    this.emit();
  }

  /** 覆盖当前会话消息（流式结束后写回完整内容） */
  replaceMessages(messages: ChatMessage[]) {
    const target = this.getActive();
    if (!target) return;
    this.conversations = this.conversations.map(c =>
      c.id === target.id
        ? {
            ...c,
            messages: messages.map(m => ({ ...m })),
            title: c.title === '新对话' ? deriveTitle(messages) : c.title,
            updatedAt: Date.now(),
          }
        : c
    );
    this.persist();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const chatStore = new ChatStore();
