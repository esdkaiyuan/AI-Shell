import { useCallback, useEffect, useRef } from 'react';
import {
  getActivePane,
  getActiveTerminal,
  type MobileAction,
  type MobileState,
} from '../mobileState';
import {
  copyToClipboard,
  onLinuxSessionEvent,
  startLinuxSession,
  stopLinuxSession,
  writeLinuxSession,
} from '../native/nativeBridge';
import {
  commandPlatformForTerminal,
  configStore,
  type SSHProfile,
} from '../services/config';

type AnsiState = 'normal' | 'esc' | 'csi' | 'osc' | 'charset';

/**
 * Stateful ANSI filter. PTY output arrives in arbitrary chunks, so escape
 * sequences can be split across reads; a per-session parser avoids leaking
 * fragments such as "[1;34m" into the terminal.
 */
class AnsiFilter {
  private state: AnsiState = 'normal';
  private csiParams = '';
  private oscEsc = false;
  clearRequested = false;

  push(chunk: string): string {
    let output = '';
    for (let index = 0; index < chunk.length; index += 1) {
      const char = chunk[index];
      switch (this.state) {
        case 'normal':
          if (char === '\x1b') this.state = 'esc';
          else output += char;
          break;
        case 'esc':
          if (char === '[') {
            this.state = 'csi';
            this.csiParams = '';
          } else if (char === ']') {
            this.state = 'osc';
            this.oscEsc = false;
          } else if (char === '(' || char === ')') {
            this.state = 'charset';
          } else {
            this.state = 'normal';
          }
          break;
        case 'csi':
          if (/[0-9;?! ]/.test(char)) {
            this.csiParams += char;
          } else {
            if (char === 'J' && /[23]/.test(this.csiParams)) this.clearRequested = true;
            this.state = 'normal';
            this.csiParams = '';
          }
          break;
        case 'osc':
          if (this.oscEsc && char === '\\') {
            this.state = 'normal';
            this.oscEsc = false;
          } else if (char === '\x07') {
            this.state = 'normal';
            this.oscEsc = false;
          } else {
            this.oscEsc = char === '\x1b';
          }
          break;
        case 'charset':
          this.state = 'normal';
          break;
      }
    }
    return output;
  }
}

interface SessionTarget {
  terminalId: string;
  paneId: string;
}

export interface TerminalRuntimeApi {
  writeActive: (data: string) => Promise<boolean>;
  sendKey: (data: string) => Promise<boolean>;
  runCommand: () => Promise<boolean>;
  copyOutput: () => Promise<boolean>;
  clearActive: () => Promise<void>;
  restartActive: () => Promise<void>;
}

export const isCurrentSession = (
  sessions: Map<string, SessionTarget>,
  target: SessionTarget,
  sessionId: string
): boolean => sessions.get(sessionId) === target;

export const terminalRuntimeKey = (state: MobileState): string =>
  `${state.activeTerminalId}|${state.terminals
    .map(
      terminal =>
        `${terminal.id}:${terminal.split.enabled ? 'split' : 'single'}:` +
        terminal.split.panes.map(pane => `${pane.id}:${pane.sessionId || ''}`).join(',')
    )
    .join('|')}`;

export const useTerminalRuntime = (
  state: MobileState,
  dispatch: (action: MobileAction) => void,
  installed: boolean,
  sshProfiles: SSHProfile[]
): TerminalRuntimeApi => {
  const targets = useRef(new Map<string, SessionTarget>());
  const starting = useRef(new Set<string>());
  const filters = useRef(new Map<string, AnsiFilter>());

  useEffect(
    () =>
      onLinuxSessionEvent(event => {
        const target = targets.current.get(event.sessionId);
        if (!target) return;

        if (event.type === 'output' && event.data) {
          let filter = filters.current.get(event.sessionId);
          if (!filter) {
            filter = new AnsiFilter();
            filters.current.set(event.sessionId, filter);
          }
          const clean = filter.push(event.data);
          if (filter.clearRequested) {
            filter.clearRequested = false;
            dispatch({ type: 'clearPane', ...target });
          }
          if (clean.length) {
            dispatch({ type: 'appendOutput', ...target, text: clean });
          }
          return;
        }

        if (event.type === 'exit') {
          filters.current.delete(event.sessionId);
          dispatch({ type: 'setPaneStatus', ...target, status: 'exited' });
          dispatch({
            type: 'appendOutput',
            ...target,
            text: `\n[会话已结束${typeof event.code === 'number' ? ` · ${event.code}` : ''}]`,
            kind: 'info',
          });
          targets.current.delete(event.sessionId);
        }
      }),
    [dispatch]
  );

  const layoutKey = terminalRuntimeKey(state);

  useEffect(() => {
    if (!installed) return;
    const terminal = getActiveTerminal(state);
    terminal.split.panes.forEach(pane => {
      const key = `${terminal.id}:${pane.id}`;
      if (pane.sessionId || pane.sessionStatus === 'starting' || starting.current.has(key)) return;
      if (pane.sessionStatus === 'exited' || pane.sessionStatus === 'error') return;

      const profile =
        terminal.type === 'ssh'
          ? sshProfiles.find(item => item.id === terminal.sshProfileId)
          : undefined;

      if (terminal.type === 'ssh' && !profile) {
        dispatch({
          type: 'appendOutput',
          terminalId: terminal.id,
          paneId: pane.id,
          text: 'SSH 配置不存在或已被删除，请重新选择连接。',
          kind: 'error',
        });
        dispatch({ type: 'setPaneStatus', terminalId: terminal.id, paneId: pane.id, status: 'error' });
        return;
      }

      const sessionId = `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      starting.current.add(key);
      const target = { terminalId: terminal.id, paneId: pane.id };
      targets.current.set(sessionId, target);
      dispatch({
        type: 'attachSession',
        terminalId: terminal.id,
        paneId: pane.id,
        sessionId,
      });

      startLinuxSession({
        sessionId,
        mode: terminal.type === 'ssh' ? 'ssh' : 'shell',
        cwd: '/root',
        cols: 52,
        rows: 30,
        host: profile?.host,
        port: profile?.port,
        username: profile?.username,
        privateKey: profile?.privateKey,
      })
        .then(() => {
          starting.current.delete(key);
          if (!isCurrentSession(targets.current, target, sessionId)) {
            stopLinuxSession(sessionId).catch(() => undefined);
            return;
          }
          dispatch({
            type: 'setPaneStatus',
            terminalId: terminal.id,
            paneId: pane.id,
            status: 'ready',
          });
        })
        .catch(error => {
          starting.current.delete(key);
          if (!isCurrentSession(targets.current, target, sessionId)) return;
          dispatch({
            type: 'setPaneStatus',
            terminalId: terminal.id,
            paneId: pane.id,
            status: 'error',
          });
          dispatch({
            type: 'appendOutput',
            terminalId: terminal.id,
            paneId: pane.id,
            text: error instanceof Error ? error.message : String(error),
            kind: 'error',
          });
        });
    });
    // layoutKey captures pane/session changes; state is read through the current render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installed, layoutKey, sshProfiles]);

  useEffect(() => {
    const valid = new Set<string>();
    state.terminals.forEach(terminal => {
      terminal.split.panes.forEach(pane => valid.add(`${terminal.id}:${pane.id}`));
    });
    targets.current.forEach((target, sessionId) => {
      if (!valid.has(`${target.terminalId}:${target.paneId}`)) {
        stopLinuxSession(sessionId).catch(() => undefined);
        targets.current.delete(sessionId);
        filters.current.delete(sessionId);
      }
    });
  }, [state.terminals]);

  useEffect(
    () => () => {
      targets.current.forEach((_, sessionId) => {
        stopLinuxSession(sessionId).catch(() => undefined);
      });
      targets.current.clear();
      filters.current.clear();
    },
    []
  );

  const writeActive = useCallback(
    async (data: string): Promise<boolean> => {
      const pane = getActivePane(state);
      if (!pane.sessionId) {
        dispatch({
          type: 'appendOutput',
          terminalId: getActiveTerminal(state).id,
          paneId: pane.id,
          text: '终端尚未就绪，请稍候或重新连接。',
          kind: 'info',
        });
        return false;
      }
      try {
        await writeLinuxSession(pane.sessionId, data);
        return true;
      } catch (error) {
        dispatch({
          type: 'appendOutput',
          terminalId: getActiveTerminal(state).id,
          paneId: pane.id,
          text: error instanceof Error ? error.message : String(error),
          kind: 'error',
        });
        return false;
      }
    },
    [state, dispatch]
  );

  const runCommand = useCallback(async (): Promise<boolean> => {
    const command = state.commandInput.trim();
    if (!command) return false;
    const ok = await writeActive(`${command}\n`);
    if (ok) {
      const terminal = getActiveTerminal(state);
      const platform = commandPlatformForTerminal(
        terminal.type,
        terminal.sshProfileId,
        sshProfiles
      );
      dispatch({ type: 'runCommand' });
      configStore.addHistory(command, 0, platform).catch(() => undefined);
    }
    return ok;
  }, [state, sshProfiles, writeActive, dispatch]);

  const copyOutput = useCallback(async (): Promise<boolean> => {
    const pane = getActivePane(state);
    const text = pane.lines.map(line => line.text).join('\n');
    if (!text.trim()) return false;
    return copyToClipboard(text);
  }, [state]);

  const clearActive = useCallback(async (): Promise<void> => {
    const terminal = getActiveTerminal(state);
    const pane = getActivePane(state);
    if (pane.sessionId) {
      await writeLinuxSession(pane.sessionId, '\x0c').catch(() => undefined);
    }
    dispatch({ type: 'clearPane', terminalId: terminal.id, paneId: pane.id });
  }, [state, dispatch]);

  const restartActive = useCallback(async (): Promise<void> => {
    const terminal = getActiveTerminal(state);
    const pane = getActivePane(state);
    if (pane.sessionId) {
      await stopLinuxSession(pane.sessionId).catch(() => undefined);
    }
    targets.current.forEach((target, sessionId) => {
      if (target.terminalId === terminal.id && target.paneId === pane.id) {
        targets.current.delete(sessionId);
      }
    });
    starting.current.delete(`${terminal.id}:${pane.id}`);
    dispatch({ type: 'detachSession', terminalId: terminal.id, paneId: pane.id });
    dispatch({ type: 'clearPane', terminalId: terminal.id, paneId: pane.id });
  }, [state, dispatch]);

  return {
    writeActive,
    sendKey: writeActive,
    runCommand,
    copyOutput,
    clearActive,
    restartActive,
  };
};
