// terminalBus.test.ts
// 终端事件总线的单元测试（每例重载模块，避免单例状态串扰）
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestHandle {
  id: string;
  title: string;
  insert: (text: string) => void;
  run: (cmd: string) => void;
  getContext: (maxChars?: number) => string;
  copySelection: () => string;
  inserted: string[];
  ran: string[];
}

function createHandle(id: string): TestHandle {
  const inserted: string[] = [];
  const ran: string[] = [];
  return {
    id,
    title: `T-${id}`,
    insert: text => void inserted.push(text),
    run: cmd => void ran.push(cmd),
    getContext: () => `ctx-${id}`,
    copySelection: () => `sel-${id}`,
    inserted,
    ran,
  };
}

describe('terminalBus', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadBus() {
    const mod = await import('./terminalBus');
    return mod.terminalBus;
  }

  it('registers a handle and makes it active if none', async () => {
    const bus = await loadBus();
    const h = createHandle('a');
    bus.register(h as never);
    expect(bus.getActiveId()).toBe('a');
    expect(bus.getActive()?.title).toBe('T-a');
  });

  it('insertToActive dispatches to active handle', async () => {
    const bus = await loadBus();
    const h = createHandle('a');
    bus.register(h as never);
    const ok = bus.insertToActive('ls -la');
    expect(ok).toBe(true);
    expect(h.inserted).toEqual(['ls -la']);
  });

  it('runOnActive dispatches to active handle', async () => {
    const bus = await loadBus();
    const h = createHandle('a');
    bus.register(h as never);
    const ok = bus.runOnActive('pwd');
    expect(ok).toBe(true);
    expect(h.ran).toEqual(['pwd']);
  });

  it('returns false when no active handle', async () => {
    const bus = await loadBus();
    expect(bus.insertToActive('x')).toBe(false);
    expect(bus.runOnActive('x')).toBe(false);
  });

  it('switches active handle', async () => {
    const bus = await loadBus();
    const a = createHandle('a');
    const b = createHandle('b');
    bus.register(a as never);
    bus.register(b as never);
    bus.setActive('b');
    bus.insertToActive('from-b');
    expect(b.inserted).toEqual(['from-b']);
    expect(a.inserted).toEqual([]);
  });

  it('falls back to another handle on unregister of active', async () => {
    const bus = await loadBus();
    const a = createHandle('a');
    const b = createHandle('b');
    bus.register(a as never);
    bus.register(b as never);
    bus.setActive('a');
    bus.unregister('a');
    expect(bus.getActiveId()).toBe('b');
  });

  it('delivers error notifications to subscribers', async () => {
    const bus = await loadBus();
    const events: Array<{ terminalId: string; snippet: string }> = [];
    const unsub = bus.subscribeError(e => events.push(e));
    bus.notifyError('a', 'boom');
    expect(events).toEqual([{ terminalId: 'a', snippet: 'boom' }]);
    unsub();
    bus.notifyError('a', 'again');
    expect(events).toHaveLength(1);
  });

  it('notifies listeners on register/unregister', async () => {
    const bus = await loadBus();
    let calls = 0;
    const unsub = bus.subscribe(() => void calls++);
    const h = createHandle('c');
    bus.register(h as never);
    bus.unregister('c');
    expect(calls).toBeGreaterThanOrEqual(2);
    unsub();
  });

  it('getActiveContext returns context of active handle', async () => {
    const bus = await loadBus();
    const h = createHandle('a');
    bus.register(h as never);
    expect(bus.getActiveContext(100)).toContain('ctx-a');
    bus.unregister('a');
    expect(bus.getActiveContext(100)).toBe('');
  });
});
