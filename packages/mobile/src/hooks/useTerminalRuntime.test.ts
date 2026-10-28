import { describe, expect, it, vi } from 'vitest';
import { createInitialMobileState, mobileReducer } from '../mobileState';
import * as runtime from './useTerminalRuntime';

const { terminalRuntimeKey } = runtime;

vi.mock('react-native', () => ({
  DeviceEventEmitter: { addListener: vi.fn() },
  NativeModules: {},
  Platform: { OS: 'android' },
}));

describe('terminal runtime startup key', () => {
  it('changes when a restored workspace activates another terminal', () => {
    let state = mobileReducer(createInitialMobileState(), { type: 'newLocalTerminal' });
    const first = state.activeTerminalId;
    const before = terminalRuntimeKey(state);
    const second = state.terminals.find(terminal => terminal.id !== first)!;
    state = mobileReducer(state, { type: 'selectTerminal', terminalId: second.id });

    expect(terminalRuntimeKey(state)).not.toBe(before);
  });

  it('rejects completion from a startup that has been replaced', () => {
    const targets = new Map([
      ['new-session', { terminalId: 'terminal-1', paneId: 'pane-1' }],
    ]);
    const target = { terminalId: 'terminal-1', paneId: 'pane-1' };
    const isCurrentSession = (runtime as unknown as {
      isCurrentSession: (
        sessions: Map<string, { terminalId: string; paneId: string }>,
        current: { terminalId: string; paneId: string },
        sessionId: string
      ) => boolean;
    }).isCurrentSession;

    expect(isCurrentSession(targets, target, 'old-session')).toBe(false);
  });
});
