import {
  aiProviders,
  commandHistory,
  fileTree,
  quickCommands,
  savedSessions,
  sshConfigs,
} from './data';

export type MainView = 'terminal' | 'ssh' | 'sessions' | 'explorer' | 'ai' | 'history' | 'settings';
export type TerminalLineKind = 'prompt' | 'output' | 'info' | 'warning';
export type TerminalType = 'local' | 'ssh' | 'relay';

export interface TerminalLine {
  kind: TerminalLineKind;
  text: string;
}

export interface TerminalPane {
  id: string;
  title: string;
  type: TerminalType;
  host?: string;
  sshConfigId?: string;
  lines: TerminalLine[];
}

export interface TerminalTab {
  id: string;
  title: string;
  type: TerminalType;
  host?: string;
  sshConfigId?: string;
  showSearch: boolean;
  split: {
    enabled: boolean;
    layout: 'stacked' | 'focus';
    activePaneId: string;
    panes: TerminalPane[];
  };
}

export interface AIProviderTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  defaultModels: string[];
  defaultBaseURL?: string;
  keyPlaceholder: string;
  keyFormat?: string;
  helpLink: string;
  isFree: boolean;
}

export interface AIImportDraft {
  templateId: string;
  apiKeyPreview: string;
  baseURL: string;
  selectedModels: string[];
  availableModels: string[];
  manualModelInput: string;
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
  selectedFileId?: string;
  aiPrompt: string;
  aiProviderId: string;
  aiPanelMode: 'inline' | 'full';
  aiWorkspaceMode: AIWorkspaceMode;
  aiMessages: AIMessage[];
  aiImportText: string;
  aiImportStatus?: {
    tone: 'success' | 'error' | 'info';
    message: string;
  };
  aiImportDraft: AIImportDraft;
  importedAiProviders: typeof aiProviders;
  relayConnected: boolean;
  hiddenFilesVisible: boolean;
  systemStats: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
  };
}

export type MobileAction =
  | { type: 'setView'; view: MainView }
  | { type: 'newLocalTerminal' }
  | { type: 'connectSsh'; configId: string }
  | { type: 'closeTerminal'; terminalId: string }
  | { type: 'selectTerminal'; terminalId: string }
  | { type: 'toggleSplit' }
  | { type: 'focusPane'; paneId: string }
  | { type: 'toggleSearch' }
  | { type: 'setSearchQuery'; query: string }
  | { type: 'insertCommand'; command: string }
  | { type: 'setCommandInput'; value: string }
  | { type: 'runCommand' }
  | { type: 'openFileItem'; itemId: string }
  | { type: 'goUpDirectory' }
  | { type: 'toggleHiddenFiles' }
  | { type: 'setAiPrompt'; prompt: string }
  | { type: 'askAi'; prompt: string }
  | { type: 'openAiChat' }
  | { type: 'openAiProviders' }
  | { type: 'selectProvider'; providerId: string }
  | { type: 'setAiImportText'; value: string }
  | { type: 'importAiProviders' }
  | { type: 'selectAiImportTemplate'; templateId: string }
  | { type: 'setAiImportApiKey'; value: string }
  | { type: 'setAiImportBaseURL'; value: string }
  | { type: 'toggleAiImportModel'; model: string }
  | { type: 'fetchAiImportModels' }
  | { type: 'setAiImportManualModel'; value: string }
  | { type: 'addAiImportManualModel' }
  | { type: 'saveAiImportProvider' }
  | { type: 'loadSession'; sessionId: string }
  | { type: 'toggleRelay' };

export const aiProviderTemplates: AIProviderTemplate[] = [
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    description: 'ChatGPT (GPT-3.5, GPT-4)',
    defaultModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.openai.com/api-keys',
    isFree: false,
  },
  {
    id: 'claude',
    name: 'claude',
    displayName: 'Claude',
    description: 'Anthropic Claude 3',
    defaultModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    keyPlaceholder: 'sk-ant-...',
    helpLink: 'https://console.anthropic.com/',
    isFree: false,
  },
  {
    id: 'wenxin',
    name: 'wenxin',
    displayName: '百度文心一言',
    description: '百度智能云 - 文心大模型',
    defaultModels: ['ernie-bot-4', 'ernie-bot', 'ernie-bot-turbo', 'ernie-speed'],
    keyPlaceholder: 'API_KEY:SECRET_KEY',
    keyFormat: '格式: API_KEY:SECRET_KEY (用冒号分隔)',
    helpLink: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    isFree: false,
  },
  {
    id: 'tongyi',
    name: 'tongyi',
    displayName: '阿里通义千问',
    description: '阿里云 - 通义千问大模型',
    defaultModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://dashscope.console.aliyun.com/apiKey',
    isFree: false,
  },
  {
    id: 'glm',
    name: 'glm',
    displayName: '智谱GLM',
    description: '智谱AI - ChatGLM大模型',
    defaultModels: ['glm-4', 'glm-3-turbo'],
    keyPlaceholder: '...',
    helpLink: 'https://open.bigmodel.cn/usercenter/apikeys',
    isFree: false,
  },
  {
    id: 'xinghuo',
    name: 'xinghuo',
    displayName: '讯飞星火',
    description: '科大讯飞 - 星火认知大模型',
    defaultModels: ['spark-3.5', 'spark-3.0', 'spark-2.0'],
    keyPlaceholder: 'APPID:APISecret:APIKey',
    keyFormat: '格式: APPID:APISecret:APIKey (用冒号分隔)',
    helpLink: 'https://console.xfyun.cn/services/bm3',
    isFree: false,
  },
  {
    id: 'moonshot',
    name: 'moonshot',
    displayName: 'Moonshot AI',
    description: 'Kimi - 月之暗面大模型',
    defaultModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.moonshot.cn/console/api-keys',
    isFree: false,
  },
  {
    id: 'deepseek',
    name: 'deepseek',
    displayName: 'DeepSeek',
    description: 'DeepSeek - 深度求索大模型',
    defaultModels: ['deepseek-chat', 'deepseek-coder'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.deepseek.com/api_keys',
    isFree: false,
  },
  {
    id: 'ollama',
    name: 'ollama',
    displayName: 'Ollama (本地)',
    description: '本地运行开源模型 - 完全免费',
    defaultModels: ['llama2', 'mistral', 'codellama', 'qwen'],
    defaultBaseURL: 'http://localhost:11434',
    keyPlaceholder: '本地模型无需API Key',
    helpLink: 'https://ollama.ai/',
    isFree: true,
  },
];

const createAiImportDraft = (template = aiProviderTemplates[0]): AIImportDraft => ({
  templateId: template.id,
  apiKeyPreview: '',
  baseURL: template.defaultBaseURL ?? '',
  selectedModels: [template.defaultModels[0]],
  availableModels: [...template.defaultModels],
  manualModelInput: '',
});

const localLines: TerminalLine[] = [
  { kind: 'info', text: 'AI Shell Mobile - device shell adapter' },
  { kind: 'warning', text: '本地 shell 在手机端通过安全中继或受限运行时执行' },
  { kind: 'prompt', text: '$ pwd' },
  { kind: 'output', text: '/shellai' },
];

const createPane = (seed: Omit<TerminalPane, 'lines'> & { lines?: TerminalLine[] }): TerminalPane => ({
  ...seed,
  lines: seed.lines ?? localLines,
});

const createTerminal = (seed: Omit<TerminalTab, 'showSearch' | 'split'>): TerminalTab => {
  const pane = createPane({
    id: `${seed.id}-pane-1`,
    title: seed.title,
    type: seed.type,
    host: seed.host,
    sshConfigId: seed.sshConfigId,
    lines: seed.type === 'ssh'
      ? [
          { kind: 'prompt', text: `$ ssh ${seed.host}` },
          { kind: 'info', text: 'connected, mobile keyboard shortcuts enabled' },
          { kind: 'prompt', text: '$ docker ps' },
          { kind: 'output', text: 'api Up 19 minutes | worker Up 19 minutes' },
        ]
      : localLines,
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
  terminals: [createTerminal({ id: 'local-1', title: 'Local Relay', type: 'relay', host: 'device' })],
  activeTerminalId: 'local-1',
  commandInput: '',
  searchQuery: '',
  currentPath: '/shellai',
  selectedFileId: undefined,
  aiPrompt: '结合当前终端输出给出下一步排障命令',
  aiProviderId: 'openai',
  aiPanelMode: 'inline',
  aiWorkspaceMode: 'chat',
  aiMessages: [
    {
      role: 'assistant',
      content: '已连接当前终端上下文。可以让我解释输出、生成命令或排查 SSH/服务问题。',
    },
  ],
  aiImportText: '',
  aiImportStatus: undefined,
  aiImportDraft: createAiImportDraft(),
  importedAiProviders: [],
  relayConnected: true,
  hiddenFilesVisible: false,
  systemStats: { cpu: 32, memory: 58, network: 18, disk: 55 },
});

export const getActiveTerminal = (state: MobileState) =>
  state.terminals.find(terminal => terminal.id === state.activeTerminalId) ?? state.terminals[0];

export const getActivePane = (state: MobileState) => {
  const terminal = getActiveTerminal(state);
  return terminal.split.panes.find(pane => pane.id === terminal.split.activePaneId) ?? terminal.split.panes[0];
};

export const getVisibleFiles = (state: MobileState) =>
  fileTree.filter(item => item.parentPath === state.currentPath && (state.hiddenFilesVisible || !item.hidden));

export const getSelectedFile = (state: MobileState) =>
  state.selectedFileId ? fileTree.find(item => item.id === state.selectedFileId) : undefined;

export const getActiveProvider = (state: MobileState) =>
  getAiProviders(state).find(provider => provider.id === state.aiProviderId) ?? getAiProviders(state)[0];

export const getAiProviders = (state: MobileState) =>
  mergeAiProviders(aiProviders, state.importedAiProviders);

export const mobileReducer = (state: MobileState, action: MobileAction): MobileState => {
  switch (action.type) {
    case 'setView':
      return { ...state, currentView: action.view };
    case 'newLocalTerminal':
      return addTerminal(state, createTerminal({
        id: `local-${state.terminals.length + 1}`,
        title: `Local ${state.terminals.length + 1}`,
        type: state.relayConnected ? 'relay' : 'local',
        host: state.relayConnected ? 'desktop relay' : 'device',
      }));
    case 'connectSsh':
      return connectSsh(state, action.configId);
    case 'closeTerminal':
      return closeTerminal(state, action.terminalId);
    case 'selectTerminal':
      return { ...state, activeTerminalId: action.terminalId };
    case 'toggleSplit':
      return toggleSplit(state);
    case 'focusPane':
      return updateActiveTerminal(state, terminal => ({
        ...terminal,
        split: { ...terminal.split, activePaneId: action.paneId },
      }));
    case 'toggleSearch':
      return updateActiveTerminal(state, terminal => ({ ...terminal, showSearch: !terminal.showSearch }));
    case 'setSearchQuery':
      return { ...state, searchQuery: action.query };
    case 'insertCommand':
      return { ...state, commandInput: action.command };
    case 'setCommandInput':
      return { ...state, commandInput: action.value };
    case 'runCommand':
      return runCommand(state);
    case 'openFileItem':
      return openFileItem(state, action.itemId);
    case 'goUpDirectory':
      return goUpDirectory(state);
    case 'toggleHiddenFiles':
      return { ...state, hiddenFilesVisible: !state.hiddenFilesVisible };
    case 'setAiPrompt':
      return { ...state, aiPrompt: action.prompt };
    case 'askAi':
      return askAi(state, action.prompt);
    case 'openAiChat':
      return { ...state, currentView: 'ai', aiWorkspaceMode: 'chat' };
    case 'openAiProviders':
      return { ...state, currentView: 'ai', aiWorkspaceMode: 'providers' };
    case 'selectProvider':
      return { ...state, aiProviderId: action.providerId };
    case 'setAiImportText':
      return { ...state, aiImportText: action.value, aiImportStatus: undefined };
    case 'importAiProviders':
      return importAiProviders(state);
    case 'selectAiImportTemplate':
      return selectAiImportTemplate(state, action.templateId);
    case 'setAiImportApiKey':
      return {
        ...state,
        aiImportDraft: { ...state.aiImportDraft, apiKeyPreview: maskSecret(action.value) },
        aiImportStatus: undefined,
      };
    case 'setAiImportBaseURL':
      return {
        ...state,
        aiImportDraft: { ...state.aiImportDraft, baseURL: action.value },
        aiImportStatus: undefined,
      };
    case 'toggleAiImportModel':
      return toggleAiImportModel(state, action.model);
    case 'fetchAiImportModels':
      return fetchAiImportModels(state);
    case 'setAiImportManualModel':
      return {
        ...state,
        aiImportDraft: { ...state.aiImportDraft, manualModelInput: action.value },
      };
    case 'addAiImportManualModel':
      return addAiImportManualModel(state);
    case 'saveAiImportProvider':
      return saveAiImportProvider(state);
    case 'loadSession':
      return loadSession(state, action.sessionId);
    case 'toggleRelay':
      return { ...state, relayConnected: !state.relayConnected };
    default:
      return state;
  }
};

const addTerminal = (state: MobileState, terminal: TerminalTab): MobileState => ({
  ...state,
  terminals: [...state.terminals, terminal],
  activeTerminalId: terminal.id,
  currentView: 'terminal',
});

const updateActiveTerminal = (
  state: MobileState,
  updater: (terminal: TerminalTab) => TerminalTab
): MobileState => ({
  ...state,
  terminals: state.terminals.map(terminal =>
    terminal.id === state.activeTerminalId ? updater(terminal) : terminal
  ),
});

const updateActivePane = (
  state: MobileState,
  updater: (pane: TerminalPane) => TerminalPane
): MobileState =>
  updateActiveTerminal(state, terminal => ({
    ...terminal,
    split: {
      ...terminal.split,
      panes: terminal.split.panes.map(pane =>
        pane.id === terminal.split.activePaneId ? updater(pane) : pane
      ),
    },
  }));

const appendLines = (state: MobileState, lines: TerminalLine[]): MobileState =>
  updateActivePane(state, pane => ({
    ...pane,
    lines: [...pane.lines, ...lines].slice(-40),
  }));

const connectSsh = (state: MobileState, configId: string): MobileState => {
  const config = sshConfigs.find(item => item.id === configId);
  if (!config) return state;

  const terminal = createTerminal({
    id: `ssh-${config.id}-${Date.now()}`,
    title: config.name,
    type: 'ssh',
    host: `${config.username}@${config.host}:${config.port}`,
    sshConfigId: config.id,
  });
  return addTerminal(state, terminal);
};

const closeTerminal = (state: MobileState, terminalId: string): MobileState => {
  if (state.terminals.length === 1) return state;
  const terminals = state.terminals.filter(terminal => terminal.id !== terminalId);
  return {
    ...state,
    terminals,
    activeTerminalId: state.activeTerminalId === terminalId ? terminals[0].id : state.activeTerminalId,
  };
};

const toggleSplit = (state: MobileState): MobileState =>
  updateActiveTerminal(state, terminal => {
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
      title: 'Split Relay',
      type: 'relay',
      host: 'desktop relay',
      lines: [
        { kind: 'info', text: 'mobile split pane ready' },
        { kind: 'prompt', text: '$ ' },
      ],
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

const runCommand = (state: MobileState): MobileState => {
  const command = state.commandInput.trim();
  if (!command) return state;

  return {
    ...appendLines(state, [
      { kind: 'prompt', text: `$ ${command}` },
      ...getCommandResponse(command),
    ]),
    commandInput: '',
  };
};

const getCommandResponse = (command: string): TerminalLine[] => {
  if (command.includes('docker ps')) {
    return [
      { kind: 'output', text: 'NAME        STATUS              PORTS' },
      { kind: 'info', text: 'api         Up 19 minutes       0.0.0.0:8080' },
      { kind: 'info', text: 'worker      Up 19 minutes       internal' },
    ];
  }
  if (command.includes('tail') || command.includes('journalctl')) {
    return [
      { kind: 'info', text: '[info] health check ok' },
      { kind: 'warning', text: '[warn] retry budget at 72%' },
    ];
  }
  if (command.includes('df -h')) {
    return [
      { kind: 'output', text: 'Filesystem      Size  Used Avail Use%' },
      { kind: 'output', text: '/dev/vda1        80G   42G   35G  55%' },
    ];
  }
  if (command.includes('systemctl')) {
    return [
      { kind: 'info', text: 'nginx.service active (running)' },
      { kind: 'output', text: 'Main PID: 942  Memory: 34.8M' },
    ];
  }
  return [{ kind: 'output', text: 'command queued for mobile-safe execution' }];
};

const openFileItem = (state: MobileState, itemId: string): MobileState => {
  const item = fileTree.find(entry => entry.id === itemId);
  if (!item) return state;

  if (item.type === 'directory') {
    return { ...state, currentPath: item.path, selectedFileId: undefined };
  }

  return {
    ...appendLines({ ...state, selectedFileId: item.id }, [
      { kind: 'prompt', text: `$ tail -n 40 ${item.path}` },
    ]),
    currentView: 'explorer',
  };
};

const goUpDirectory = (state: MobileState): MobileState => {
  if (state.currentPath === '/shellai') return state;
  const parent = fileTree.find(item => item.type === 'directory' && item.path === state.currentPath)
    ?.parentPath;
  return { ...state, currentPath: parent ?? '/shellai', selectedFileId: undefined };
};

const askAi = (state: MobileState, prompt: string): MobileState => {
  const content = prompt.trim();
  if (!content) return { ...state, currentView: 'ai', aiWorkspaceMode: 'chat' };

  const providerName = getActiveProvider(state).name;
  const assistantContent = `${providerName}: 建议先执行 systemctl status nginx，再查看最近错误日志。`;
  const userMessage: AIMessage = { role: 'user', content };
  const assistantMessage: AIMessage = { role: 'assistant', content: assistantContent };
  const nextMessages: AIMessage[] = [
    ...state.aiMessages.filter(message =>
      !(message.role === 'assistant' && message.content.startsWith('已连接当前终端上下文'))
    ),
    userMessage,
    assistantMessage,
  ].slice(-12);

  return {
    ...appendLines(state, [
      { kind: 'prompt', text: `$ ai "${content}"` },
      {
        kind: 'info',
        text: assistantContent,
      },
    ]),
    currentView: 'ai',
    aiWorkspaceMode: 'chat',
    aiPrompt: content,
    aiMessages: nextMessages,
    commandInput: 'systemctl status nginx',
  };
};

interface DesktopAIProviderConfig {
  name?: unknown;
  apiKey?: unknown;
  baseURL?: unknown;
  endpoint?: unknown;
  models?: unknown;
  enabled?: unknown;
}

const importAiProviders = (state: MobileState): MobileState => {
  const result = parseDesktopAiProviders(state.aiImportText);
  if (!result.ok) {
    return {
      ...state,
      aiImportStatus: { tone: 'error', message: result.message },
    };
  }

  const providers = mergeAiProviders(state.importedAiProviders, result.providers);
  return {
    ...state,
    importedAiProviders: providers,
    aiProviderId: result.providers[0]?.id ?? state.aiProviderId,
    aiImportText: '',
    aiImportStatus: {
      tone: 'success',
      message: `已导入 ${result.providers.length} 个桌面端 AI Provider`,
    },
  };
};

const getAiImportTemplate = (state: MobileState) =>
  aiProviderTemplates.find(template => template.id === state.aiImportDraft.templateId) ?? aiProviderTemplates[0];

const selectAiImportTemplate = (state: MobileState, templateId: string): MobileState => {
  const template = aiProviderTemplates.find(item => item.id === templateId);
  if (!template) return state;
  return {
    ...state,
    aiImportDraft: createAiImportDraft(template),
    aiImportStatus: undefined,
  };
};

const fetchAiImportModels = (state: MobileState): MobileState => {
  const template = getAiImportTemplate(state);
  if (!template.isFree && !state.aiImportDraft.apiKeyPreview) {
    return {
      ...state,
      aiImportStatus: { tone: 'error', message: '请先填写 API Key 再获取模型列表' },
    };
  }

  const fetchedModels = getMockProviderModels(template.id);
  const availableModels = Array.from(new Set([...fetchedModels, ...state.aiImportDraft.availableModels]));
  return {
    ...state,
    aiImportDraft: {
      ...state.aiImportDraft,
      availableModels,
      selectedModels: state.aiImportDraft.selectedModels.length
        ? state.aiImportDraft.selectedModels
        : [availableModels[0]],
    },
    aiImportStatus: {
      tone: 'success',
      message: `成功获取 ${fetchedModels.length} 个模型`,
    },
  };
};

const getMockProviderModels = (templateId: string) => {
  const remoteModels: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1'],
    claude: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    wenxin: ['ernie-bot-4', 'ernie-bot', 'ernie-bot-turbo', 'ernie-speed'],
    tongyi: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    glm: ['glm-4', 'glm-3-turbo'],
    xinghuo: ['spark-3.5', 'spark-3.0', 'spark-2.0'],
    moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    ollama: ['llama2', 'mistral', 'codellama', 'qwen'],
  };
  return remoteModels[templateId] ?? [];
};

const toggleAiImportModel = (state: MobileState, model: string): MobileState => {
  const selectedModels = state.aiImportDraft.selectedModels.includes(model)
    ? state.aiImportDraft.selectedModels.length === 1
      ? state.aiImportDraft.selectedModels
      : state.aiImportDraft.selectedModels.filter(item => item !== model)
    : [...state.aiImportDraft.selectedModels, model];
  return {
    ...state,
    aiImportDraft: { ...state.aiImportDraft, selectedModels },
  };
};

const addAiImportManualModel = (state: MobileState): MobileState => {
  const model = state.aiImportDraft.manualModelInput.trim();
  if (!model) return state;

  return {
    ...state,
    aiImportDraft: {
      ...state.aiImportDraft,
      manualModelInput: '',
      availableModels: state.aiImportDraft.availableModels.includes(model)
        ? state.aiImportDraft.availableModels
        : [model, ...state.aiImportDraft.availableModels],
      selectedModels: state.aiImportDraft.selectedModels.includes(model)
        ? state.aiImportDraft.selectedModels
        : [...state.aiImportDraft.selectedModels, model],
    },
    aiImportStatus: undefined,
  };
};

const saveAiImportProvider = (state: MobileState): MobileState => {
  const template = getAiImportTemplate(state);
  if (!template.isFree && !state.aiImportDraft.apiKeyPreview) {
    return {
      ...state,
      aiImportStatus: { tone: 'error', message: '请输入 API Key。' },
    };
  }
  if (state.aiImportDraft.selectedModels.length === 0) {
    return {
      ...state,
      aiImportStatus: { tone: 'error', message: '请至少选择一个模型。' },
    };
  }

  const provider = {
    id: template.id,
    name: template.name,
    model: state.aiImportDraft.selectedModels[0],
    models: state.aiImportDraft.selectedModels,
    enabled: true,
    endpoint: state.aiImportDraft.baseURL.trim() || template.defaultBaseURL || 'default endpoint',
    apiKeyPreview: state.aiImportDraft.apiKeyPreview,
    imported: true,
  };

  return {
    ...state,
    importedAiProviders: mergeAiProviders(state.importedAiProviders, [provider]),
    aiProviderId: provider.id,
    aiImportStatus: { tone: 'success', message: `${template.displayName} 添加成功。` },
  };
};

const parseDesktopAiProviders = (
  text: string
): { ok: true; providers: typeof aiProviders } | { ok: false; message: string } => {
  try {
    const parsed = JSON.parse(text.trim());
    const rawProviders = Array.isArray(parsed) ? parsed : parsed?.providers;
    if (!Array.isArray(rawProviders) || rawProviders.length === 0) {
      return { ok: false, message: '未找到可导入的 providers 数组' };
    }

    const providers = rawProviders
      .map(normalizeDesktopProvider)
      .filter((provider): provider is typeof aiProviders[number] => Boolean(provider));

    if (providers.length === 0) {
      return { ok: false, message: 'Provider 缺少 name 或 models，无法导入' };
    }

    return { ok: true, providers };
  } catch {
    return { ok: false, message: 'JSON 格式不正确，请粘贴桌面端 AI Provider 配置' };
  }
};

const normalizeDesktopProvider = (provider: DesktopAIProviderConfig): typeof aiProviders[number] | null => {
  if (typeof provider?.name !== 'string' || provider.name.trim().length === 0) return null;
  const models = Array.isArray(provider.models)
    ? provider.models.filter((model): model is string => typeof model === 'string' && model.trim().length > 0)
    : [];
  if (models.length === 0) return null;

  const id = provider.name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  const endpoint = typeof provider.baseURL === 'string' && provider.baseURL.trim()
    ? provider.baseURL.trim()
    : typeof provider.endpoint === 'string' && provider.endpoint.trim()
      ? provider.endpoint.trim()
      : 'desktop import';

  return {
    id,
    name: provider.name.trim(),
    model: models[0],
    models,
    enabled: provider.enabled !== false,
    endpoint,
    apiKeyPreview: typeof provider.apiKey === 'string' ? maskSecret(provider.apiKey) : undefined,
    imported: true,
  };
};

const maskSecret = (secret: string) => {
  const value = secret.trim();
  if (!value) return '';
  if (value === '********') return value;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
};

const mergeAiProviders = (base: typeof aiProviders, incoming: typeof aiProviders): typeof aiProviders => {
  const byId = new Map(base.map(provider => [provider.id, provider]));
  incoming.forEach(provider => {
    byId.set(provider.id, { ...byId.get(provider.id), ...provider });
  });
  return [...byId.values()];
};

const loadSession = (state: MobileState, sessionId: string): MobileState => {
  const session = savedSessions.find(item => item.id === sessionId);
  if (!session) return state;

  const terminals = [
    createTerminal({ id: `${session.id}-local`, title: 'Local Relay', type: 'relay', host: 'desktop relay' }),
    createTerminal({ id: `${session.id}-prod`, title: session.activeTitle, type: 'ssh', host: 'root@10.0.8.12:22', sshConfigId: 'prod' }),
  ];
  return { ...state, terminals, activeTerminalId: terminals[1].id, currentView: 'terminal' };
};

export const desktopFeatureCoverage = [
  '多标签终端',
  'SSH 配置与连接',
  '移动端分屏窗格',
  '搜索',
  '复制/粘贴命令入口',
  '会话保存/恢复',
  'AI 助手与 Provider 管理',
  '桌面端 AI Provider 导入',
  '命令历史',
  '只读资源管理器',
  '系统监控',
  '移动中继与安全执行提示',
];

export const mobileCatalog = {
  sshConfigs,
  aiProviders,
  aiProviderTemplates,
  commandHistory,
  savedSessions,
  quickCommands,
};
