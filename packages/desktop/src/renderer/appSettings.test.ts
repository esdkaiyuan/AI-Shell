// appSettings.test.ts
// 应用设置存储的单元测试（localStorage 用内存桩）
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

describe('appSettings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  async function load() {
    return await import('./appSettings');
  }

  it('returns defaults when nothing stored', async () => {
    const { appSettings, DEFAULT_SETTINGS } = await load();
    expect(appSettings.get().fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(appSettings.get().theme).toBe(DEFAULT_SETTINGS.theme);
    expect(appSettings.get().aiPanelWidth).toBe(DEFAULT_SETTINGS.aiPanelWidth);
  });

  it('update() merges partial settings and persists', async () => {
    const { appSettings } = await load();
    appSettings.update({ fontSize: 16, theme: 'light' });
    const s = appSettings.get();
    expect(s.fontSize).toBe(16);
    expect(s.theme).toBe('light');
    // 未指定字段保持默认
    expect(s.cursorBlink).toBe(true);

    vi.resetModules();
    const reloaded = await import('./appSettings');
    expect(reloaded.appSettings.get().fontSize).toBe(16);
  });

  it('update() stores AI provider/model preference', async () => {
    const { appSettings } = await load();
    appSettings.update({ aiProvider: 'openai', aiModel: 'gpt-4o' });
    const s = appSettings.get();
    expect(s.aiProvider).toBe('openai');
    expect(s.aiModel).toBe('gpt-4o');
  });

  it('reset() restores defaults', async () => {
    const { appSettings, DEFAULT_SETTINGS } = await load();
    appSettings.update({ fontSize: 20, splitPaneRatio: 0.7 });
    appSettings.reset();
    const s = appSettings.get();
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
    expect(s.splitPaneRatio).toBe(DEFAULT_SETTINGS.splitPaneRatio);
  });

  it('notifies subscribers on update', async () => {
    const { appSettings } = await load();
    const seen: number[] = [];
    const unsub = appSettings.subscribe(s => seen.push(s.fontSize));
    appSettings.update({ fontSize: 15 });
    expect(seen).toContain(15);
    unsub();
    appSettings.update({ fontSize: 18 });
    expect(seen.filter(v => v === 18)).toHaveLength(0);
  });

  it('get() returns a copy (mutating result does not affect store)', async () => {
    const { appSettings } = await load();
    const s = appSettings.get();
    s.fontSize = 99;
    expect(appSettings.get().fontSize).not.toBe(99);
  });

  it('clamp helper bounds values', async () => {
    const { clamp } = await load();
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-1, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});
