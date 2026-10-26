// snippets.test.ts
// 快捷命令片段库的单元测试（localStorage 用内存桩）
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 内存版 localStorage，供模块级单例使用
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

describe('snippetStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  async function loadStore() {
    const mod = await import('./snippets');
    return mod.snippetStore;
  }

  it('seeds default snippets on first use', async () => {
    const store = await loadStore();
    const all = store.getAll();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some(s => s.name === 'Git 状态')).toBe(true);
  });

  it('adds a snippet and it appears first', async () => {
    const store = await loadStore();
    store.add('我的命令', 'echo hello');
    const all = store.getAll();
    expect(all[0].name).toBe('我的命令');
    expect(all[0].command).toBe('echo hello');
    expect(all[0].group).toBe('自定义');
  });

  it('ignores empty name or command', async () => {
    const store = await loadStore();
    const before = store.getAll().length;
    store.add('', 'echo');
    store.add('name', '   ');
    expect(store.getAll().length).toBe(before);
  });

  it('updates an existing snippet', async () => {
    const store = await loadStore();
    store.add('旧名', '旧命令');
    const target = store.getAll()[0];
    store.update(target.id, { name: '新名', command: '新命令' });
    const updated = store.getAll().find(s => s.id === target.id);
    expect(updated?.name).toBe('新名');
    expect(updated?.command).toBe('新命令');
  });

  it('removes a snippet by id', async () => {
    const store = await loadStore();
    store.add('待删除', 'rm me');
    const target = store.getAll()[0];
    store.remove(target.id);
    expect(store.getAll().some(s => s.id === target.id)).toBe(false);
  });

  it('clearCustom keeps only default snippets', async () => {
    const store = await loadStore();
    store.add('自定义A', 'aaa');
    store.clearCustom();
    const all = store.getAll();
    expect(all.every(s => s.id.startsWith('default-'))).toBe(true);
  });

  it('suggest() filters by command prefix', async () => {
    const store = await loadStore();
    store.add('补全测试', 'my-unique-cmd run');
    const hits = store.suggest('my-unique');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].command).toBe('my-unique-cmd run');
  });

  it('suggest() returns empty for blank prefix', async () => {
    const store = await loadStore();
    expect(store.suggest('')).toEqual([]);
  });

  it('notifies subscribers on change', async () => {
    const store = await loadStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.add('通知测试', 'notify');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.add('再加一条', 'again');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('persists across re-import (same storage)', async () => {
    const store = await loadStore();
    store.add('持久化', 'persist-cmd');
    vi.resetModules();
    const store2 = await import('./snippets');
    expect(store2.snippetStore.getAll().some(s => s.command === 'persist-cmd')).toBe(true);
  });
});
