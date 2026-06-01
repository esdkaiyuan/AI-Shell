import React, { useState, useEffect } from 'react';
import { PlusIcon, CloseIcon, CheckIcon, InfoIcon, RefreshIcon } from './Icons';
import { ProviderIcon } from './ProviderIcons';
import { appSettings, AppSettings, TERMINAL_THEMES, TerminalThemeName, CursorStyle } from '../appSettings';
import './Settings.css';

interface AIProvider {
  name: string;
  apiKey?: string;
  baseURL?: string;
  models: string[];
  enabled: boolean;
}

interface SSHConfigSummary {
  name: string;
  host: string;
  port: number;
  username: string;
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  hasPassphrase?: boolean;
}

interface ProviderTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  defaultModels: string[];
  defaultBaseURL?: string;
  keyPlaceholder: string;
  keyFormat?: string;
  helpLink: string;
  isFree?: boolean;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const PROVIDER_TEMPLATES: ProviderTemplate[] = [
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

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'ssh' | 'general'>('ai');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProviderTemplate>(PROVIDER_TEMPLATES[0]);
  const [formData, setFormData] = useState({
    apiKey: '',
    baseURL: '',
    selectedModels: [] as string[],
  });
  // 可供选择的模型池（默认建议 + 接口拉取 + 手动添加）
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchInfo, setFetchInfo] = useState('');
  const [manualModelInput, setManualModelInput] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    text: string;
    confirmLabel: string;
    run: () => void | Promise<void>;
  } | null>(null);

  // SSH 配置标签页状态
  const [sshConfigs, setSSHConfigs] = useState<SSHConfigSummary[]>([]);

  // 通用设置标签页状态
  const [generalSettings, setGeneralSettings] = useState<AppSettings>(appSettings.get());

  useEffect(() => {
    loadProviders();
    loadSSHConfigs();
  }, []);

  const loadSSHConfigs = async () => {
    try {
      const list = await window.electronAPI.ssh.listConfigs();
      setSSHConfigs(list || []);
    } catch (error) {
      console.error('Failed to load SSH configs:', error);
    }
  };

  const handleDeleteSSHConfig = async (name: string) => {
    try {
      await window.electronAPI.ssh.deleteConfig(name);
      await loadSSHConfigs();
      setPendingAction(null);
    } catch (error: unknown) {
      setNotice({ type: 'error', text: `删除失败：${getErrorMessage(error)}` });
    }
  };

  // 更新单项通用设置（即时持久化并应用到终端）
  const updateGeneralSetting = (partial: Partial<AppSettings>) => {
    appSettings.update(partial);
    setGeneralSettings(appSettings.get());
  };

  const handleResetGeneralSettings = () => {
    appSettings.reset();
    setGeneralSettings(appSettings.get());
    setPendingAction(null);
  };

  useEffect(() => {
    // 当选择模板变化时，重置表单
    setFormData({
      apiKey: '',
      baseURL: selectedTemplate.defaultBaseURL || '',
      selectedModels: [selectedTemplate.defaultModels[0]],
    });
    setAvailableModels([...selectedTemplate.defaultModels]);
    setFetchError('');
    setFetchInfo('');
    setManualModelInput('');
  }, [selectedTemplate]);

  const loadProviders = async () => {
    try {
      const list = await window.electronAPI.ai.listProviders();
      setProviders(list.map(provider => ({ ...provider, enabled: provider.enabled !== false })));
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
    }
  };

  const handleModelToggle = (model: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedModels.includes(model);
      if (isSelected) {
        // 至少保留一个模型
        if (prev.selectedModels.length === 1) {
          return prev;
        }
        return {
          ...prev,
          selectedModels: prev.selectedModels.filter(m => m !== model),
        };
      } else {
        return {
          ...prev,
          selectedModels: [...prev.selectedModels, model],
        };
      }
    });
  };

  // 通过 API 访问链接动态获取模型列表
  const handleFetchModels = async () => {
    setFetchError('');
    setFetchInfo('');

    if (!selectedTemplate.isFree && !formData.apiKey.trim()) {
      setFetchError('请先填写 API Key 再获取模型列表');
      return;
    }

    setFetchingModels(true);
    try {
      const models = await window.electronAPI.ai.listModelsForConfig({
        name: selectedTemplate.name,
        apiKey: formData.apiKey.trim(),
        baseURL: formData.baseURL.trim() || selectedTemplate.defaultBaseURL,
        models: selectedTemplate.defaultModels,
        enabled: true,
      });

      if (!models || models.length === 0) {
        setFetchError('接口未返回任何模型，请改用手动输入');
        return;
      }

      // 合并接口返回的模型与已有选项，去重
      setAvailableModels(prev => Array.from(new Set([...models, ...prev])));
      setFetchInfo(`成功获取 ${models.length} 个模型`);
    } catch (error: unknown) {
      setFetchError(
        `获取失败：${getErrorMessage(error) || '未知错误'}。该提供商可能不支持模型列表接口，请手动输入模型名。`
      );
    } finally {
      setFetchingModels(false);
    }
  };

  // 手动添加一个模型名到可选池并自动勾选
  const handleAddManualModel = () => {
    const name = manualModelInput.trim();
    if (!name) return;

    setAvailableModels(prev => (prev.includes(name) ? prev : [name, ...prev]));
    setFormData(prev => ({
      ...prev,
      selectedModels: prev.selectedModels.includes(name)
        ? prev.selectedModels
        : [...prev.selectedModels, name],
    }));
    setManualModelInput('');
    setFetchError('');
  };

  const handleAddProvider = async () => {
    // 验证
    if (!selectedTemplate.isFree && !formData.apiKey.trim()) {
      setNotice({ type: 'error', text: '请输入 API Key。' });
      return;
    }

    if (formData.selectedModels.length === 0) {
      setNotice({ type: 'error', text: '请至少选择一个模型。' });
      return;
    }

    // 检查是否已存在
    if (providers.some(p => p.name === selectedTemplate.name)) {
      setPendingAction({
        text: `已存在 ${selectedTemplate.displayName} 配置，是否覆盖？`,
        confirmLabel: '覆盖',
        run: () => {
          setPendingAction(null);
          void saveProvider();
        },
      });
      return;
    }

    await saveProvider();
  };

  const saveProvider = async () => {
    try {
      await window.electronAPI.ai.addProvider({
        name: selectedTemplate.name,
        apiKey: formData.apiKey.trim(),
        baseURL: formData.baseURL.trim() || selectedTemplate.defaultBaseURL,
        models: formData.selectedModels,
        enabled: true,
      });

      await loadProviders();
      setShowAddForm(false);
      setFormData({
        apiKey: '',
        baseURL: selectedTemplate.defaultBaseURL || '',
        selectedModels: [selectedTemplate.defaultModels[0]],
      });

      setNotice({ type: 'success', text: `${selectedTemplate.displayName} 添加成功。` });
    } catch (error: unknown) {
      setNotice({ type: 'error', text: `添加失败：${getErrorMessage(error)}` });
    }
  };

  const handleRemoveProvider = async (name: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.name === name);
    const displayName = template?.displayName || name;

    setPendingAction({
      text: `确定要删除 ${displayName} 吗？`,
      confirmLabel: '删除',
      run: async () => {
        try {
          await window.electronAPI.ai.removeProvider(name);
          await loadProviders();
          setPendingAction(null);
        } catch (error: unknown) {
          setNotice({ type: 'error', text: `删除失败：${getErrorMessage(error)}` });
        }
      },
    });
  };

  const getProviderDisplayName = (name: string) => {
    const template = PROVIDER_TEMPLATES.find(t => t.name === name);
    return template?.displayName || name;
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h2>设置</h2>
      </div>

      <div className="settings-content">
        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI 提供商
          </button>
          <button
            className={`tab ${activeTab === 'ssh' ? 'active' : ''}`}
            onClick={() => setActiveTab('ssh')}
          >
            SSH 配置
          </button>
          <button
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            通用设置
          </button>
        </div>

        <div className="settings-panel">
          {notice && (
            <div className={`settings-notice ${notice.type}`} role="status">
              {notice.text}
            </div>
          )}
          {pendingAction && (
            <div className="settings-confirm" role="alert">
              <span>{pendingAction.text}</span>
              <div className="settings-confirm-actions">
                <button className="btn-secondary" onClick={() => setPendingAction(null)}>
                  取消
                </button>
                <button className="btn-danger" onClick={() => void pendingAction.run()}>
                  {pendingAction.confirmLabel}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="ai-settings">
              <h3>AI 提供商管理</h3>
              <p className="description">
                配置AI提供商以启用智能命令功能。支持国内外多家主流AI服务。
              </p>

              {/* 已配置的提供商列表 */}
              {providers.length > 0 && (
                <div className="provider-list">
                  <h4>已配置的提供商 ({providers.length})</h4>
                  {providers.map(provider => (
                    <div key={provider.name} className="provider-item">
                      <div className="provider-info">
                        <div className="provider-header">
                          <span className="provider-icon">
                            <ProviderIcon provider={provider.name} size={20} />
                          </span>
                          <strong>{getProviderDisplayName(provider.name)}</strong>
                          <span className={`provider-badge ${provider.enabled ? 'enabled' : 'disabled'}`}>
                            {provider.enabled ? (
                              <>
                                <CheckIcon size={14} /> 已启用
                              </>
                            ) : (
                              <>
                                <CloseIcon size={14} /> 已禁用
                              </>
                            )}
                          </span>
                        </div>
                        <div className="provider-models">
                          模型: {provider.models.join(', ')}
                        </div>
                      </div>
                      <button
                        className="btn-danger"
                        onClick={() => handleRemoveProvider(provider.name)}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 添加新提供商按钮 */}
              {!showAddForm && (
                <button
                  className="btn-primary btn-large"
                  onClick={() => setShowAddForm(true)}
                >
                  <PlusIcon size={16} /> 添加 AI 提供商
                </button>
              )}

              {/* 添加表单 */}
              {showAddForm && (
                <div className="add-provider-form">
                  <div className="form-header">
                    <h4>添加新的 AI 提供商</h4>
                    <button className="btn-close" onClick={() => setShowAddForm(false)}>
                      <CloseIcon size={16} />
                    </button>
                  </div>

                  {/* 步骤1: 选择提供商 */}
                  <div className="form-section">
                    <label className="form-label">
                      <span className="step-number">1</span>
                      选择 AI 提供商
                    </label>
                    <div className="provider-grid">
                      {PROVIDER_TEMPLATES.map(template => (
                        <div
                          key={template.id}
                          className={`provider-card ${
                            selectedTemplate.id === template.id ? 'selected' : ''
                          }`}
                          onClick={() => handleTemplateChange(template.id)}
                        >
                          <div className="provider-card-icon">
                            <ProviderIcon provider={template.name} size={32} />
                          </div>
                          <div className="provider-card-name">{template.displayName}</div>
                          <div className="provider-card-desc">{template.description}</div>
                          {template.isFree && <div className="provider-card-badge">免费</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 步骤2: 输入API Key */}
                  <div className="form-section">
                    <label className="form-label">
                      <span className="step-number">2</span>
                      {selectedTemplate.isFree ? 'API Key (可选)' : '输入 API Key'}
                      <a
                        href={selectedTemplate.helpLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="help-link"
                      >
                        如何获取？
                      </a>
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      value={formData.apiKey}
                      onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder={selectedTemplate.keyPlaceholder}
                    />
                    {selectedTemplate.keyFormat && (
                      <div className="form-hint">{selectedTemplate.keyFormat}</div>
                    )}
                  </div>

                  {/* 步骤3: 选择模型 */}
                  <div className="form-section">
                    <label className="form-label">
                      <span className="step-number">3</span>
                      选择要使用的模型
                      <button
                        type="button"
                        className="fetch-models-btn"
                        onClick={handleFetchModels}
                        disabled={fetchingModels}
                        title="使用上方 API Key 访问提供商接口拉取可用模型"
                      >
                        <RefreshIcon size={14} />
                        {fetchingModels ? '获取中...' : '获取模型列表'}
                      </button>
                    </label>

                    {fetchInfo && <div className="fetch-info success">{fetchInfo}</div>}
                    {fetchError && <div className="fetch-info error">{fetchError}</div>}

                    <div className="model-list">
                      {availableModels.length === 0 ? (
                        <div className="model-empty">
                          暂无可选模型，请点击「获取模型列表」或在下方手动添加
                        </div>
                      ) : (
                        availableModels.map(model => (
                          <label key={model} className="model-checkbox">
                            <input
                              type="checkbox"
                              checked={formData.selectedModels.includes(model)}
                              onChange={() => handleModelToggle(model)}
                            />
                            <span>{model}</span>
                          </label>
                        ))
                      )}
                    </div>

                    {/* 手动输入模型名 */}
                    <div className="manual-model-row">
                      <input
                        type="text"
                        className="form-input"
                        value={manualModelInput}
                        onChange={e => setManualModelInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddManualModel();
                          }
                        }}
                        placeholder="手动输入模型名，例如 gpt-4o-mini"
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleAddManualModel}
                      >
                        <PlusIcon size={14} /> 添加
                      </button>
                    </div>
                    <div className="form-hint">
                      接口不支持或自建服务时，可手动填写模型名（按 Enter 快速添加）
                    </div>
                  </div>

                  {/* 步骤4: 高级设置（可选） */}
                  <details className="form-section advanced-section">
                    <summary>高级设置（可选）</summary>
                    <div className="form-group">
                      <label>自定义 API 地址</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.baseURL}
                        onChange={e => setFormData({ ...formData, baseURL: e.target.value })}
                        placeholder={selectedTemplate.defaultBaseURL || '使用默认地址'}
                      />
                      <div className="form-hint">
                        留空使用默认地址。如需使用代理或自建服务，请填写完整URL。
                      </div>
                    </div>
                  </details>

                  {/* 提交按钮 */}
                  <div className="form-actions">
                    <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                      取消
                    </button>
                    <button className="btn-primary" onClick={handleAddProvider}>
                      <CheckIcon size={16} /> 确定添加
                    </button>
                  </div>
                </div>
              )}

              {/* 帮助信息 */}
              {!showAddForm && (
                <div className="help-section">
                  <h4>
                    <InfoIcon size={18} /> 使用提示
                  </h4>
                  <ul>
                    <li>
                      <strong>国内用户推荐:</strong> 百度文心、阿里通义、智谱GLM、讯飞星火
                    </li>
                    <li>
                      <strong>国际用户推荐:</strong> OpenAI、Claude
                    </li>
                    <li>
                      <strong>本地免费:</strong> Ollama - 无需API Key，完全本地运行
                    </li>
                    <li>可以同时配置多个提供商，系统会使用第一个启用的提供商</li>
                    <li>API Key 会加密存储在本地，不会上传到任何服务器</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ssh' && (
            <div className="ssh-settings">
              <h3>SSH 配置</h3>
              <p className="description">
                管理已保存的远程服务器连接。新建/编辑连接请使用工具栏的 SSH 管理器。
              </p>

              {sshConfigs.length === 0 ? (
                <div className="empty-config-state">
                  <p>还没有保存任何 SSH 连接配置。</p>
                  <p className="form-hint">
                    点击顶部工具栏的「SSH 连接」图标来新建连接。
                  </p>
                </div>
              ) : (
                <div className="ssh-config-list">
                  <h4>已保存的连接 ({sshConfigs.length})</h4>
                  {sshConfigs.map(config => (
                    <div key={config.name} className="ssh-config-item">
                      <div className="ssh-config-info">
                        <strong>{config.name}</strong>
                        <span className="ssh-config-detail">
                          {config.username}@{config.host}:{config.port || 22}
                        </span>
                        <span className="ssh-config-auth">
                          {config.hasPrivateKey
                            ? config.hasPassphrase
                              ? '密钥认证（含密钥密码）'
                              : '密钥认证'
                            : config.hasPassword
                              ? '密码认证'
                              : '连接时输入认证'}
                        </span>
                      </div>
                      <button
                        className="btn-danger"
                        onClick={() =>
                          setPendingAction({
                            text: `确定删除连接 "${config.name}" 吗？`,
                            confirmLabel: '删除',
                            run: () => handleDeleteSSHConfig(config.name),
                          })
                        }
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-secondary" onClick={loadSSHConfigs} style={{ marginTop: 'var(--spacing-lg)' }}>
                <RefreshIcon size={14} /> 刷新列表
              </button>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="general-settings">
              <h3>通用设置</h3>
              <p className="description">配置终端外观，更改即时生效并保存。</p>

              <div className="general-form">
                {/* 主题 */}
                <div className="form-group">
                  <label>终端主题</label>
                  <div className="theme-grid">
                    {(Object.keys(TERMINAL_THEMES) as TerminalThemeName[]).map(themeName => {
                      const theme = TERMINAL_THEMES[themeName];
                      const labels: Record<TerminalThemeName, string> = {
                        'mono-dark': '黑白灰',
                        'classic-dark': '经典暗色',
                        'solarized-dark': 'Solarized',
                        light: '浅色',
                      };
                      return (
                        <button
                          key={themeName}
                          className={`theme-card ${generalSettings.theme === themeName ? 'selected' : ''}`}
                          onClick={() => updateGeneralSetting({ theme: themeName })}
                        >
                          <div
                            className="theme-preview"
                            style={{ background: theme.background, color: theme.foreground }}
                          >
                            <span style={{ color: theme.green }}>$</span>{' '}
                            <span style={{ color: theme.foreground }}>echo</span>{' '}
                            <span style={{ color: theme.yellow }}>hi</span>
                          </div>
                          <span className="theme-name">{labels[themeName]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 字号 */}
                <div className="form-group">
                  <label>字体大小：{generalSettings.fontSize}px</label>
                  <input
                    type="range"
                    min={10}
                    max={24}
                    step={1}
                    value={generalSettings.fontSize}
                    onChange={e => updateGeneralSetting({ fontSize: parseInt(e.target.value, 10) })}
                    className="form-range"
                  />
                </div>

                {/* 字体 */}
                <div className="form-group">
                  <label>字体</label>
                  <select
                    className="form-input"
                    value={generalSettings.fontFamily}
                    onChange={e => updateGeneralSetting({ fontFamily: e.target.value })}
                  >
                    <option value='"Consolas", "Courier New", "DejaVu Sans Mono", monospace'>
                      Consolas
                    </option>
                    <option value='"Courier New", monospace'>Courier New</option>
                    <option value='"DejaVu Sans Mono", monospace'>DejaVu Sans Mono</option>
                    <option value='"Cascadia Code", "Consolas", monospace'>Cascadia Code</option>
                    <option value='"Fira Code", "Consolas", monospace'>Fira Code</option>
                    <option value='monospace'>系统等宽字体</option>
                  </select>
                </div>

                {/* 光标样式 */}
                <div className="form-group">
                  <label>光标样式</label>
                  <div className="auth-type-selector">
                    {(['block', 'underline', 'bar'] as CursorStyle[]).map(style => {
                      const labels: Record<CursorStyle, string> = {
                        block: '方块',
                        underline: '下划线',
                        bar: '竖线',
                      };
                      return (
                        <button
                          key={style}
                          className={`auth-type-btn ${generalSettings.cursorStyle === style ? 'active' : ''}`}
                          onClick={() => updateGeneralSetting({ cursorStyle: style })}
                        >
                          {labels[style]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 光标闪烁 */}
                <div className="form-group">
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={generalSettings.cursorBlink}
                      onChange={e => updateGeneralSetting({ cursorBlink: e.target.checked })}
                    />
                    <span>光标闪烁</span>
                  </label>
                </div>

                {/* 回滚行数 */}
                <div className="form-group">
                  <label>回滚缓冲行数：{generalSettings.scrollback}</label>
                  <input
                    type="range"
                    min={100}
                    max={10000}
                    step={100}
                    value={generalSettings.scrollback}
                    onChange={e => updateGeneralSetting({ scrollback: parseInt(e.target.value, 10) })}
                    className="form-range"
                  />
                </div>

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setPendingAction({
                      text: '确定恢复默认设置吗？',
                      confirmLabel: '恢复',
                      run: handleResetGeneralSettings,
                    })
                  }
                >
                  恢复默认设置
                </button>

                <div className="about-card">
                  <div>
                    <div className="about-title">AI Shell</div>
                    <div className="about-meta">署名 / Credit</div>
                  </div>
                  <div className="about-signature">esdkaiyuan</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
