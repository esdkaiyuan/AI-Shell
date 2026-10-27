import { quickCommands } from './data';

export type MainView =
  | 'terminal'
  | 'ssh'
  | 'sessions'
  | 'explorer'
  | 'ai'
  | 'history'
  | 'settings'
  | 'profile';
export type TerminalLineKind = 'prompt' | 'output' | 'info' | 'warning' | 'error';
export type TerminalType = 'local' | 'ssh';
export type PaneSessionStatus = 'idle' | 'starting' | 'ready' | 'exited' | 'error';

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
  /** True while more PTY chunks may still extend this line. */
  partial?: boolean;
}

export interface TerminalPane {
  id: string;
  title: string;
  type: TerminalType;
  host?: string;
  sshProfileId?: string;
  lines: TerminalLine[];
  sessionId?: string;
  sessionStatus: PaneSessionStatus;
}

export interface TerminalTab {
  id: string;
  title: string;
  type: TerminalType;
  host?: string;
  sshProfileId?: string;
  showSearch: boolean;
  split: {
    enabled: boolean;
    layout: 'stacked' | 'focus';
    activePaneId: string;
    panes: TerminalPane[];
  };
}

export type AIWorkspaceMode = 'chat' | 'providers';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MobileState {
  currentView: MainView;
  terminals: TerminalTab[];
  activeTerminalId: string;
  commandInput: string;
  searchQuery: string;
  currentPath: string;
  selectedFilePath?: string;
  aiPrompt: string;
  aiPanelMode: 'inline' | 'full';
  aiWorkspaceMode: AIWorkspaceMode;
  aiMessages: AIMessage[];
  aiLoading: boolean;
  aiError?: string;
  hiddenFilesVisible: boolean;
  systemStats: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
  };
}

export interface SSHProfileInput {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
}

export interface WorkspaceTerminalInput {
  title: string;
  type: TerminalType;
  sshProfileId?: string;
  host?: string;
}

export type MobileAction =
  | { type: 'setView'; view: MainView }
  | { type: 'newLocalTerminal' }
  | { type: 'connectSsh'; profile: SSHProfileInput }
  | { type: 'closeTerminal'; terminalId: string }
  | { type: 'selectTerminal'; terminalId: string }
  | { type: 'toggleSplit' }
  | { type: 'focusPane'; paneId: string }
  | { type: 'toggleSearch' }
  | { type: 'setSearchQuery'; query: string }
  | { type: 'insertCommand'; command: string }
  | { type: 'setCommandInput'; value: string }
  | { type: 'runCommand' }
  | { type: 'setCurrentPath'; path: string }
  | { type: 'setSelectedFile'; path?: string }
  | { type: 'toggleHiddenFiles' }
  | { type: 'setAiPrompt'; prompt: string }
  | { type: 'aiRequestStart'; content: string }
  | { type: 'aiResponse'; content: string }
  | { type: 'aiError'; message: string }
  | { type: 'clearAi' }
  | { type: 'openAiChat' }
  | { type: 'openAiProviders' }
  | { type: 'attachSession'; terminalId: string; paneId: string; sessionId: string }
  | { type: 'detachSession'; terminalId: string; paneId: string }
  | { type: 'setPaneStatus'; terminalId: string; paneId: string; status: PaneSessionStatus }
  | { type: 'clearPane'; terminalId: string; paneId: string }
  | {
      type: 'appendOutput';
      terminalId: string;
      paneId: string;
      text: string;
      kind?: TerminalLineKind;
    }
  | { type: 'setSystemStats'; stats: MobileState['systemStats'] }
  | { type: 'loadWorkspace'; terminals: WorkspaceTerminalInput[]; activeIndex?: number };

const MAX_TERMINAL_LINES = 800;

const createPane = (
  seed: Omit<TerminalPane, 'lines' | 'sessionStatus'>
): TerminalPane => ({
  ...seed,
  lines: [],
  sessionStatus: 'idle',
});

const createTerminal = (
  seed: Omit<TerminalTab, 'showSearch' | 'split'>
): TerminalTab => {
  const pane = createPane({
    id: `${seed.id}-pane-1`,
    title: seed.title,
    type: seed.type,
    host: seed.host,
    sshProfileId: seed.sshProfileId,
  });

  return {
    ...seed,
    showSearch: false,
    split: {
      enabled: false,
      layout: 'stacked',
      activePaneId: pane.id,
      panes: [pane],
    },
  };
};

export const createInitialMobileState = (): MobileState => ({
  currentView: 'terminal',
  terminals: [createTerminal({ id: 'local-1', title: 'Linux', type: 'local' })],
  activeTerminalId: 'local-1',
  commandInput: '',
  searchQuery: '',
  currentPath: '/root',
  selectedFilePath: undefined,
  aiPrompt: '',
  aiPanelMode: 'inline',
  aiWorkspaceMode: 'chat',
  aiMessages: [
    {
      role: 'assistant',
      content: '内置 Linux 已就绪后，可以让我解释命令输出、生成命令或排查 SSH / 服务问题。',
    },
  ],
  aiLoading: false,
  aiError: undefined,
  hiddenFilesVisible: false,
  systemStats: { cpu: 0, memory: 0, network: 0, disk: 0 },
});

export const getActiveTerminal = (state: MobileState): TerminalTab =>
  state.terminals.find(terminal => terminal.id === state.activeTerminalId) ?? state.terminals[0];

export const getActivePane = (state: MobileState): TerminalPane => {
  const terminal = getActiveTerminal(state);
  return (
    terminal.split.panes.find(pane => pane.id === terminal.split.activePaneId) ??
    terminal.split.panes[0]
  );
};

export const getPane = (
  state: MobileState,
  terminalId: string,
  paneId: string
): TerminalPane | undefined =>
  state.terminals
    .find(terminal => terminal.id === terminalId)
    ?.split.panes.find(pane => pane.id === paneId);

const updateTerminal = (
  state: MobileState,
  terminalId: string,
  updater: (terminal: TerminalTab) => TerminalTab
): MobileState => ({
  ...state,
  terminals: state.terminals.map(terminal =>
    terminal.id === terminalId ? updater(terminal) : terminal
  ),
});

const updatePane = (
  state: MobileState,
  terminalId: string,
  paneId: string,
  updater: (pane: TerminalPane) => TerminalPane
): MobileState =>
  updateTerminal(state, terminalId, terminal => ({
    ...terminal,
    split: {
      ...terminal.split,
      panes: terminal.split.panes.map(pane => (pane.id === paneId ? updater(pane) : pane)),
    },
  }));

const lineKind = (text: string): TerminalLineKind => {
  if (/^[\w.-]+@[\w.-]+:[^#$]*[#$]\s/.test(text)) return 'prompt';
  if (/\b(error|not found|permission denied|fatal|failed)\b/i.test(text)) return 'error';
  return 'output';
};

const appendText = (pane: TerminalPane, text: string, kind?: TerminalLineKind): TerminalPane => {
  const lines = [...pane.lines];
  const previous = lines[lines.length - 1];
  const carried = previous?.partial ? previous.text : '';
  if (previous?.partial) lines.pop();

  const parts = (carried + text).replace(/\r/g, '').split('\n');
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    lines.push({ kind: kind || lineKind(part), text: part });
  }

  const remainder = parts[parts.length - 1];
  if (remainder.length) {
    lines.push({ kind: kind || lineKind(remainder), text: remainder, partial: true });
  }

  if (lines.length > MAX_TERMINAL_LINES) {
    lines.splice(0, lines.length - MAX_TERMINAL_LINES);
  }
  return { ...pane, lines };
};

const addTerminal = (state: MobileState, terminal: TerminalTab): MobileState => ({
  ...state,
  terminals: [...state.terminals, terminal],
  activeTerminalId: terminal.id,
  currentView: 'terminal',
});

const connectSsh = (state: MobileState, profile: SSHProfileInput): MobileState => {
  const terminal = createTerminal({
    id: `ssh-${profile.id}-${Date.now()}`,
    title: profile.name,
    type: 'ssh',
    host: profile.host,
    sshProfileId: profile.id,
  });
  return addTerminal(state, terminal);
};

const closeTerminal = (state: MobileState, terminalId: string): MobileState => {
  if (state.terminals.length === 1) return state;
  const terminals = state.terminals.filter(terminal => terminal.id !== terminalId);
  return {
    ...state,
    terminals,
    activeTerminalId:
      state.activeTerminalId === terminalId ? terminals[0].id : state.activeTerminalId,
  };
};

const toggleSplit = (state: MobileState): MobileState =>
  updateTerminal(state, state.activeTerminalId, terminal => {
    if (terminal.split.enabled) {
      const firstPane = terminal.split.panes[0];
      return {
        ...terminal,
        split: {
          enabled: false,
          layout: 'stacked',
          activePaneId: firstPane.id,
          panes: [firstPane],
        },
      };
    }

    const secondPane = createPane({
      id: `${terminal.id}-pane-2`,
      title: 'Linux Split',
      type: 'local',
    });
    return {
      ...terminal,
      split: {
        enabled: true,
        layout: 'stacked',
        activePaneId: secondPane.id,
        panes: [...terminal.split.panes, secondPane],
      },
    };
  });

export const mobileReducer = (state: MobileState, action: MobileAction): MobileState => {
  switch (action.type) {
    case 'setView':
      return { ...state, currentView: action.view };
    case 'newLocalTerminal':
      return addTerminal(
        state,
        createTerminal({
          id: `local-${Date.now()}`,
          title: `Linux ${state.terminals.length + 1}`,
          type: 'local',
        })
      );
    case 'connectSsh':
      return connectSsh(state, action.profile);
    case 'closeTerminal':
      return closeTerminal(state, action.terminalId);
    case 'selectTerminal':
      return { ...state, activeTerminalId: action.terminalId };
    case 'toggleSplit':
      return toggleSplit(state);
    case 'focusPane':
      return updateTerminal(state, state.activeTerminalId, terminal => ({
        ...terminal,
        split: { ...terminal.split, activePaneId: action.paneId },
      }));
    case 'toggleSearch':
      return updateTerminal(state, state.activeTerminalId, terminal => ({
        ...terminal,
        showSearch: !terminal.showSearch,
      }));
    case 'setSearchQuery':
      return { ...state, searchQuery: action.query };
    case 'insertCommand':
      return { ...state, commandInput: action.command };
    case 'setCommandInput':
      return { ...state, commandInput: action.value };
    case 'runCommand':
      return { ...state, commandInput: '' };
    case 'setCurrentPath':
      return { ...state, currentPath: action.path, selectedFilePath: undefined };
    case 'setSelectedFile':
      return { ...state, selectedFilePath: action.path };
    case 'toggleHiddenFiles':
      return { ...state, hiddenFilesVisible: !state.hiddenFilesVisible };
    case 'setAiPrompt':
      return { ...state, aiPrompt: action.prompt };
    case 'aiRequestStart':
      return {
        ...state,
        aiLoading: true,
        aiError: undefined,
        aiPrompt: '',
        aiMessages: [...state.aiMessages, { role: 'user', content: action.content }],
      };
    case 'aiResponse':
      return {
        ...state,
        aiLoading: false,
        aiMessages: [...state.aiMessages, { role: 'assistant', content: action.content }],
      };
    case 'aiError':
      return { ...state, aiLoading: false, aiError: action.message };
    case 'clearAi':
      return { ...state, aiMessages: [], aiError: undefined };
    case 'openAiChat':
      return { ...state, currentView: 'ai', aiWorkspaceMode: 'chat' };
    case 'openAiProviders':
      return { ...state, currentView: 'ai', aiWorkspaceMode: 'providers' };
    case 'attachSession':
      return updatePane(state, action.terminalId, action.paneId, pane => ({
        ...pane,
        sessionId: action.sessionId,
        sessionStatus: 'starting',
      }));
    case 'detachSession':
      return updatePane(state, action.terminalId, action.paneId, pane => ({
        ...pane,
        sessionId: undefined,
        sessionStatus: 'idle',
      }));
    case 'setPaneStatus':
      return updatePane(state, action.terminalId, action.paneId, pane => ({
        ...pane,
        sessionStatus: action.status,
      }));
    case 'clearPane':
      return updatePane(state, action.terminalId, action.paneId, pane => ({
        ...pane,
        lines: [],
      }));
    case 'appendOutput':
      return updatePane(state, action.terminalId, action.paneId, pane =>
        appendText(pane, action.text, action.kind)
      );
    case 'setSystemStats':
      return { ...state, systemStats: action.stats };
    case 'loadWorkspace': {
      const terminals = action.terminals.map((input, index) =>
        createTerminal({
          id: `restored-${Date.now()}-${index}`,
          title: input.title,
          type: input.type,
          host: input.host,
          sshProfileId: input.sshProfileId,
        })
      );
      if (terminals.length === 0) return state;
      return {
        ...state,
        terminals,
        activeTerminalId: terminals[action.activeIndex || 0]?.id || terminals[0].id,
        currentView: 'terminal',
      };
    }
    default:
      return state;
  }
};

export const desktopFeatureCoverage = [
  'APK 内置 Alpine Linux',
  '真实 PTY 终端',
  'OpenSSH 客户端',
  'AI Provider 直连',
  'Android Keystore 加密',
  '离线可用',
  'Linux 文件浏览',
  'apk 在线扩展',
];

export const mobileCatalog = {
  quickCommands,
};
