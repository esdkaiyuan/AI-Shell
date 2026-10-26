// chatStore.test.ts
// AI 对话持久化的单元测试（localStorage 用内存桩）
import { describe, it, expect, beforeEach, vi } from 'vitest';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('chatStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  async function load() {
    const mod = await import('./chatStore');
    return mod;
  }

  it('derives title from first user message', async () => {
    const { deriveTitle } = await load();
    expect(deriveTitle([{ role: 'user', content: '帮我看下这个报错' }])).toBe(
      '帮我看下这个报错'
    );
    expect(deriveTitle([])).toBe('新对话');
    expect(deriveTitle([{ role: 'assistant', content: 'x' }])).toBe('新对话');
  });

  it('truncates long titles', async () => {
    const { deriveTitle } = await load();
    const long = 'a'.repeat(80);
    expect(deriveTitle([{ role: 'user', content: long }]).length).toBeLessThanOrEqual(31);
  });

  it('creates a conversation and sets it active', async () => {
    const { chatStore } = await load();
    const id = chatStore.create();
    expect(chatStore.getActive()?.id).toBe(id);
    expect(chatStore.getMessages()).toEqual([]);
  });

  it('auto-titles conversation after first user message', async () => {
    const { chatStore } = await load();
    chatStore.create();
    chatStore.appendMessage({ role: 'user', content: '部署失败了' });
    expect(chatStore.getActive()?.title).toBe('部署失败了');
  });

  it('switches between conversations', async () => {
    const { chatStore } = await load();
    const first = chatStore.create();
    chatStore.appendMessage({ role: 'user', content: 'A' });
    const second = chatStore.create();
    chatStore.appendMessage({ role: 'user', content: 'B' });

    expect(chatStore.getActive()?.id).toBe(second);
    chatStore.setActive(first);
    expect(chatStore.getMessages()).toEqual([{ role: 'user', content: 'A' }]);
  });

  it('renames a conversation', async () => {
    const { chatStore } = await load();
    const id = chatStore.create();
    chatStore.rename(id, '运维排查');
    expect(chatStore.getActive()?.title).toBe('运维排查');
  });

  it('falls back to default title on empty rename', async () => {
    const { chatStore } = await load();
    const id = chatStore.create();
    chatStore.rename(id, '   ');
    expect(chatStore.getActive()?.title).toBe('未命名对话');
  });

  it('removes a conversation and re-points active', async () => {
    const { chatStore } = await load();
    const first = chatStore.create();
    const second = chatStore.create();
    chatStore.remove(second);
    expect(chatStore.getActive()?.id).toBe(first);
    expect(chatStore.getState().conversations).toHaveLength(1);
  });

  it('replaceMessages overwrites the whole conversation', async () => {
    const { chatStore } = await load();
    chatStore.create();
    chatStore.replaceMessages([
      { role: 'user', content: 'Q' },
      { role: 'assistant', content: 'A' },
    ]);
    expect(chatStore.getMessages()).toHaveLength(2);
    expect(chatStore.getMessages()[1].content).toBe('A');
  });

  it('persists across re-import (same storage)', async () => {
    const { chatStore } = await load();
    chatStore.create();
    chatStore.replaceMessages([{ role: 'user', content: '持久化内容' }]);

    vi.resetModules();
    const mod2 = await import('./chatStore');
    expect(mod2.chatStore.getMessages()[0].content).toBe('持久化内容');
  });

  it('notifies subscribers on change', async () => {
    const { chatStore } = await load();
    const listener = vi.fn();
    const unsub = chatStore.subscribe(listener);
    chatStore.create();
    expect(listener).toHaveBeenCalled();
    unsub();
    const callsBefore = listener.mock.calls.length;
    chatStore.create();
    expect(listener.mock.calls.length).toBe(callsBefore);
  });

  it('caps messages per conversation', async () => {
    const { chatStore } = await load();
    chatStore.create();
    for (let i = 0; i < 260; i++) {
      chatStore.appendMessage({ role: 'user', content: `m${i}` });
    }
    const messages = chatStore.getMessages();
    expect(messages.length).toBeLessThanOrEqual(200);
    // 保留的是最新的消息
    expect(messages[messages.length - 1].content).toBe('m259');
  });
});
