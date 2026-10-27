import { describe, expect, it } from 'vitest';
import {
  createInitialMobileState,
  getActivePane,
  getActiveTerminal,
  mobileReducer,
  type MobileState,
} from './mobileState';

const initial = (): MobileState => createInitialMobileState();

describe('mobile runtime state', () => {
  it('starts with one local Linux terminal and no fake output', () => {
    const state = initial();
    const terminal = getActiveTerminal(state);
    expect(state.terminals).toHaveLength(1);
    expect(terminal.type).toBe('local');
    expect(terminal.title).toBe('Linux');
    expect(getActivePane(state).lines).toEqual([]);
    expect(getActivePane(state).sessionStatus).toBe('idle');
    expect(state.currentPath).toBe('/root');
  });

  it('opens profile without replacing terminal or AI state', () => {
    const state = initial();
    const next = mobileReducer(state, { type: 'setView', view: 'profile' });
    expect(next.currentView).toBe('profile');
    expect(next.terminals).toBe(state.terminals);
    expect(next.activeTerminalId).toBe(state.activeTerminalId);
    expect(next.aiMessages).toBe(state.aiMessages);
  });

  it('creates and activates a new local terminal', () => {
    const state = mobileReducer(initial(), { type: 'newLocalTerminal' });
    expect(state.terminals).toHaveLength(2);
    expect(state.activeTerminalId).toBe(getActiveTerminal(state).id);
    expect(getActiveTerminal(state).type).toBe('local');
  });

  it('connects an SSH profile as a real SSH terminal', () => {
    const state = mobileReducer(initial(), {
      type: 'connectSsh',
      profile: {
        id: 'prod',
        name: '生产服务器',
        host: '10.0.8.12',
        port: 22,
        username: 'root',
        privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----',
      },
    });
    expect(state.terminals).toHaveLength(2);
    expect(getActiveTerminal(state).type).toBe('ssh');
    expect(getActiveTerminal(state).sshProfileId).toBe('prod');
    expect(state.currentView).toBe('terminal');
  });

  it('does not close the last terminal', () => {
    const state = initial();
    const next = mobileReducer(state, { type: 'closeTerminal', terminalId: state.activeTerminalId });
    expect(next.terminals).toHaveLength(1);
  });

  it('closes inactive terminals without changing the active one', () => {
    let state = mobileReducer(initial(), { type: 'newLocalTerminal' });
    const active = state.activeTerminalId;
    const inactive = state.terminals.find(terminal => terminal.id !== active)!;
    state = mobileReducer(state, { type: 'closeTerminal', terminalId: inactive.id });
    expect(state.terminals).toHaveLength(1);
    expect(state.activeTerminalId).toBe(active);
  });

  it('splits and collapses panes', () => {
    let state = mobileReducer(initial(), { type: 'toggleSplit' });
    expect(getActiveTerminal(state).split.enabled).toBe(true);
    expect(getActiveTerminal(state).split.panes).toHaveLength(2);

    const secondPane = getActiveTerminal(state).split.panes[1];
    state = mobileReducer(state, { type: 'focusPane', paneId: secondPane.id });
    expect(getActivePane(state).id).toBe(secondPane.id);

    state = mobileReducer(state, { type: 'toggleSplit' });
    expect(getActiveTerminal(state).split.enabled).toBe(false);
    expect(getActiveTerminal(state).split.panes).toHaveLength(1);
  });

  it('tracks sessions and appends streaming output', () => {
    const state = initial();
    const terminal = getActiveTerminal(state);
    const pane = getActivePane(state);

    let next = mobileReducer(state, {
      type: 'attachSession',
      terminalId: terminal.id,
      paneId: pane.id,
      sessionId: 'session-1',
    });
    expect(getActivePane(next).sessionId).toBe('session-1');

    next = mobileReducer(next, {
      type: 'setPaneStatus',
      terminalId: terminal.id,
      paneId: pane.id,
      status: 'ready',
    });
    expect(getActivePane(next).sessionStatus).toBe('ready');

    next = mobileReducer(next, {
      type: 'appendOutput',
      terminalId: terminal.id,
      paneId: pane.id,
      text: 'root@aishell:/root# ls\nREADME.md\n',
    });
    const lines = getActivePane(next).lines;
    expect(lines).toHaveLength(2);
    expect(lines[0].kind).toBe('prompt');
    expect(lines[1].text).toBe('README.md');

    next = mobileReducer(next, {
      type: 'appendOutput',
      terminalId: terminal.id,
      paneId: pane.id,
      text: 'root@',
    });
    next = mobileReducer(next, {
      type: 'appendOutput',
      terminalId: terminal.id,
      paneId: pane.id,
      text: 'aishell:~# ',
    });
    const streamed = getActivePane(next).lines;
    expect(streamed.at(-1)).toEqual({
      kind: 'prompt',
      text: 'root@aishell:~# ',
      partial: true,
    });

    next = mobileReducer(next, { type: 'clearPane', terminalId: terminal.id, paneId: pane.id });
    expect(getActivePane(next).lines).toEqual([]);

    next = mobileReducer(next, { type: 'detachSession', terminalId: terminal.id, paneId: pane.id });
    expect(getActivePane(next).sessionId).toBeUndefined();
    expect(getActivePane(next).sessionStatus).toBe('idle');
  });

  it('clears the command input after submitting', () => {
    let state = mobileReducer(initial(), { type: 'setCommandInput', value: 'uname -a' });
    expect(state.commandInput).toBe('uname -a');
    state = mobileReducer(state, { type: 'runCommand' });
    expect(state.commandInput).toBe('');
  });

  it('tracks AI request lifecycle', () => {
    let state = mobileReducer(initial(), { type: 'setAiPrompt', prompt: '查看磁盘' });
    expect(state.aiPrompt).toBe('查看磁盘');

    state = mobileReducer(state, { type: 'aiRequestStart', content: '查看磁盘' });
    expect(state.aiLoading).toBe(true);
    expect(state.aiPrompt).toBe('');
    expect(state.aiMessages.at(-1)).toEqual({ role: 'user', content: '查看磁盘' });

    state = mobileReducer(state, { type: 'aiResponse', content: 'df -h' });
    expect(state.aiLoading).toBe(false);
    expect(state.aiMessages.at(-1)).toEqual({ role: 'assistant', content: 'df -h' });

    state = mobileReducer(state, { type: 'aiError', message: '网络错误' });
    expect(state.aiError).toBe('网络错误');
    expect(state.aiLoading).toBe(false);

    state = mobileReducer(state, { type: 'clearAi' });
    expect(state.aiMessages).toEqual([]);
  });

  it('restores a saved workspace layout', () => {
    const state = mobileReducer(initial(), {
      type: 'loadWorkspace',
      terminals: [
        { title: 'Linux', type: 'local' },
        { title: '生产服务器', type: 'ssh', sshProfileId: 'prod', host: '10.0.8.12' },
      ],
      activeIndex: 1,
    });
    expect(state.terminals).toHaveLength(2);
    expect(state.currentView).toBe('terminal');
    expect(getActiveTerminal(state).title).toBe('生产服务器');
    expect(getActiveTerminal(state).type).toBe('ssh');
  });

  it('updates system stats and file browsing state', () => {
    let state = mobileReducer(initial(), {
      type: 'setSystemStats',
      stats: { cpu: 12, memory: 40, network: 0, disk: 55 },
    });
    expect(state.systemStats.cpu).toBe(12);

    state = mobileReducer(state, { type: 'setCurrentPath', path: '/root/projects' });
    expect(state.currentPath).toBe('/root/projects');
    state = mobileReducer(state, { type: 'setSelectedFile', path: '/root/projects/a.txt' });
    expect(state.selectedFilePath).toBe('/root/projects/a.txt');
    state = mobileReducer(state, { type: 'toggleHiddenFiles' });
    expect(state.hiddenFilesVisible).toBe(true);
  });
});
