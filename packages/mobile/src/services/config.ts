import { useEffect, useState } from 'react';
import { secureClear, secureLoad, secureSave } from '../native/nativeBridge';

export type ProviderProtocol = 'openai' | 'claude' | 'ollama' | 'wenxin' | 'xinghuo';

export interface ProviderPreset {
  id: string;
  name: string;
  displayName: string;
  description: string;
  protocol: ProviderProtocol;
  baseURL: string;
  models: string[];
  keyPlaceholder: string;
  keyFormat?: string;
  helpLink: string;
  isFree?: boolean;
  supportsModelList?: boolean;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT 系列 · 官方 API',
    protocol: 'openai',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.openai.com/api-keys',
    supportsModelList: true,
  },
  {
    id: 'claude',
    name: 'claude',
    displayName: 'Claude',
    description: 'Anthropic Claude 系列',
    protocol: 'claude',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    keyPlaceholder: 'sk-ant-...',
    helpLink: 'https://console.anthropic.com/',
    supportsModelList: true,
  },
  {
    id: 'deepseek',
    name: 'deepseek',
    displayName: 'DeepSeek',
    description: 'DeepSeek Chat / Reasoner',
    protocol: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.deepseek.com/api_keys',
    supportsModelList: true,
  },
  {
    id: 'glm',
    name: 'glm',
    displayName: '智谱 GLM',
    description: '智谱开放平台',
    protocol: 'openai',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-plus', 'glm-4-flash', 'glm-4'],
    keyPlaceholder: '...',
    helpLink: 'https://open.bigmodel.cn/usercenter/apikeys',
    supportsModelList: true,
  },
  {
    id: 'tongyi',
    name: 'tongyi',
    displayName: '通义千问',
    description: '阿里云 DashScope 兼容模式',
    protocol: 'openai',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://dashscope.console.aliyun.com/apiKey',
    supportsModelList: true,
  },
  {
    id: 'moonshot',
    name: 'moonshot',
    displayName: 'Moonshot / Kimi',
    description: '月之暗面长上下文模型',
    protocol: 'openai',
    baseURL: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    keyPlaceholder: 'sk-...',
    helpLink: 'https://platform.moonshot.cn/console/api-keys',
    supportsModelList: true,
  },
  {
    id: 'ollama',
    name: 'ollama',
    displayName: 'Ollama',
    description: '局域网或本机 Ollama 服务',
    protocol: 'ollama',
    baseURL: 'http://localhost:11434',
    models: ['qwen2.5', 'llama3.2', 'codellama'],
    keyPlaceholder: '本地服务无需 Key',
    helpLink: 'https://ollama.com/',
    isFree: true,
    supportsModelList: true,
  },
  {
    id: 'wenxin',
    name: 'wenxin',
    displayName: '文心一言',
    description: '百度千帆大模型平台',
    protocol: 'wenxin',
    baseURL: 'https://aip.baidubce.com',
    models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-128k'],
    keyPlaceholder: 'API_KEY:SECRET_KEY',
    keyFormat: '格式：API_KEY:SECRET_KEY',
    helpLink: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
  },
  {
    id: 'xinghuo',
    name: 'xinghuo',
    displayName: '讯飞星火',
    description: 'WebSocket 鉴权，移动端暂未接入',
    protocol: 'xinghuo',
    baseURL: 'https://spark-api.xf-yun.com/v3.5',
    models: ['spark-3.5', 'spark-3.0', 'spark-2.0'],
    keyPlaceholder: 'APPID:APISecret:APIKey',
    keyFormat: '该厂商需要 WebSocket 签名，当前版本请选择其他 Provider',
    helpLink: 'https://console.xfyun.cn/services/bm3',
  },
];

export interface AIProviderConfig {
  id: string;
  presetId: string;
  name: string;
  displayName: string;
  protocol: ProviderProtocol;
  baseURL: string;
  apiKey: string;
  model: string;
  models: string[];
  enabled: boolean;
  updatedAt: number;
}

export interface SSHProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  updatedAt: number;
}

export interface CommandHistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  exitCode: number;
}

export interface EnvironmentConfig {
  installed: boolean;
  runtimeVersion?: string;
  distro?: string;
  installedAt?: number;
}

export interface WorkspaceSessionTerminal {
  title: string;
  type: 'local' | 'ssh';
  sshProfileId?: string;
  host?: string;
}

export interface WorkspaceSession {
  id: string;
  name: string;
  terminals: WorkspaceSessionTerminal[];
  activeIndex: number;
  updatedAt: number;
}

export interface AppConfig {
  version: 1;
  setupCompleted: boolean;
  aiProviders: AIProviderConfig[];
  activeProviderId: string;
  sshProfiles: SSHProfile[];
  workspaceSessions: WorkspaceSession[];
  history: CommandHistoryEntry[];
  environment: EnvironmentConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  setupCompleted: false,
  aiProviders: [],
  activeProviderId: '',
  sshProfiles: [],
  workspaceSessions: [],
  history: [],
  environment: { installed: false },
};

export const presetById = (id: string): ProviderPreset | undefined =>
  PROVIDER_PRESETS.find(preset => preset.id === id);

export const maskSecret = (secret?: string): string => {
  const value = (secret ?? '').trim();
  if (!value) return '';
  if (value === '********') return value;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
};

export const providerFromPreset = (
  preset: ProviderPreset,
  values: { apiKey: string; model?: string; baseURL?: string }
): AIProviderConfig => {
  const model = (values.model || preset.models[0] || '').trim();
  return {
    id: preset.id,
    presetId: preset.id,
    name: preset.name,
    displayName: preset.displayName,
    protocol: preset.protocol,
    baseURL: (values.baseURL || preset.baseURL).trim().replace(/\/+$/, ''),
    apiKey: values.apiKey.trim(),
    model,
    models: model && !preset.models.includes(model) ? [model, ...preset.models] : [...preset.models],
    enabled: true,
    updatedAt: Date.now(),
  };
};

export const activeProvider = (config: AppConfig): AIProviderConfig | undefined =>
  config.aiProviders.find(provider => provider.id === config.activeProviderId) ||
  config.aiProviders.find(provider => provider.enabled) ||
  config.aiProviders[0];

const normalizeConfig = (raw: unknown): AppConfig => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const value = raw as Partial<AppConfig>;
  const providers = Array.isArray(value.aiProviders)
    ? value.aiProviders
        .filter(provider => provider && typeof provider.id === 'string' && typeof provider.name === 'string')
        .map(provider => ({
          ...provider,
          presetId: provider.presetId || provider.id,
          displayName: provider.displayName || provider.name,
          protocol: provider.protocol || 'openai',
          baseURL: provider.baseURL || presetById(provider.id)?.baseURL || '',
          apiKey: provider.apiKey || '',
          models: Array.isArray(provider.models) ? provider.models : [],
          model: provider.model || provider.models?.[0] || '',
          enabled: provider.enabled !== false,
          updatedAt: provider.updatedAt || Date.now(),
        }))
    : [];
  const sshProfiles = Array.isArray(value.sshProfiles)
    ? value.sshProfiles.filter(profile => profile && typeof profile.host === 'string')
    : [];
  const history = Array.isArray(value.history)
    ? value.history.filter(item => item && typeof item.command === 'string').slice(0, 100)
    : [];
  const workspaceSessions = Array.isArray(value.workspaceSessions)
    ? value.workspaceSessions
        .filter(session => session && Array.isArray(session.terminals))
        .slice(0, 20)
    : [];
  return {
    version: 1,
    setupCompleted: value.setupCompleted === true,
    aiProviders: providers,
    activeProviderId:
      typeof value.activeProviderId === 'string' &&
      providers.some(provider => provider.id === value.activeProviderId)
        ? value.activeProviderId
        : providers[0]?.id || '',
    sshProfiles,
    workspaceSessions,
    history,
    environment:
      value.environment && typeof value.environment === 'object'
        ? { ...value.environment, installed: value.environment.installed === true }
        : { installed: false },
  };
};

type Listener = (config: AppConfig) => void;

class ConfigStore {
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private listeners = new Set<Listener>();
  private initPromise: Promise<void> | null = null;
  loaded = false;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        const raw = await secureLoad();
        if (raw) {
          this.config = normalizeConfig(JSON.parse(raw));
        }
      } catch {
        this.config = { ...DEFAULT_CONFIG };
        await secureClear().catch(() => undefined);
      } finally {
        this.loaded = true;
        this.emit();
      }
    })();
    return this.initPromise;
  }

  get(): AppConfig {
    return this.config;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async update(patch: Partial<AppConfig>): Promise<void> {
    this.config = normalizeConfig({ ...this.config, ...patch });
    await secureSave(JSON.stringify(this.config));
    this.emit();
  }

  async addProvider(provider: AIProviderConfig): Promise<void> {
    const providers = [
      ...this.config.aiProviders.filter(item => item.id !== provider.id),
      provider,
    ];
    await this.update({
      aiProviders: providers,
      activeProviderId: this.config.activeProviderId || provider.id,
    });
  }

  async removeProvider(id: string): Promise<void> {
    const providers = this.config.aiProviders.filter(item => item.id !== id);
    await this.update({
      aiProviders: providers,
      activeProviderId:
        this.config.activeProviderId === id ? providers[0]?.id || '' : this.config.activeProviderId,
    });
  }

  async setActiveProvider(id: string, model?: string): Promise<void> {
    const providers = this.config.aiProviders.map(provider =>
      provider.id === id && model ? { ...provider, model } : provider
    );
    await this.update({ aiProviders: providers, activeProviderId: id });
  }

  async addSshProfile(profile: SSHProfile): Promise<void> {
    await this.update({
      sshProfiles: [
        ...this.config.sshProfiles.filter(item => item.id !== profile.id),
        profile,
      ],
    });
  }

  async removeSshProfile(id: string): Promise<void> {
    await this.update({ sshProfiles: this.config.sshProfiles.filter(item => item.id !== id) });
  }

  async saveWorkspace(session: WorkspaceSession): Promise<void> {
    await this.update({
      workspaceSessions: [
        session,
        ...this.config.workspaceSessions.filter(item => item.id !== session.id),
      ].slice(0, 20),
    });
  }

  async removeWorkspace(id: string): Promise<void> {
    await this.update({
      workspaceSessions: this.config.workspaceSessions.filter(item => item.id !== id),
    });
  }

  async addHistory(command: string, exitCode = 0): Promise<void> {
    const trimmed = command.trim();
    if (!trimmed) return;
    const previous = this.config.history[0];
    if (previous && previous.command === trimmed) return;
    const entry: CommandHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      command: trimmed,
      timestamp: Date.now(),
      exitCode,
    };
    await this.update({ history: [entry, ...this.config.history].slice(0, 100) });
  }

  async clearHistory(): Promise<void> {
    await this.update({ history: [] });
  }

  async markEnvironment(environment: EnvironmentConfig): Promise<void> {
    await this.update({ environment });
  }

  async completeSetup(): Promise<void> {
    await this.update({ setupCompleted: true });
  }

  async reset(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await secureClear().catch(() => undefined);
    this.emit();
  }

  private emit() {
    this.listeners.forEach(listener => listener(this.config));
  }
}

export const configStore = new ConfigStore();

export const useAppConfig = (): AppConfig => {
  const [config, setConfig] = useState(configStore.get());
  useEffect(() => configStore.subscribe(setConfig), []);
  return config;
};
