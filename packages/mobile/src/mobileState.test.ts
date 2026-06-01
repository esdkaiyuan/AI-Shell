import { describe, expect, it } from 'vitest';
import {
  createInitialMobileState,
  desktopFeatureCoverage,
  getActivePane,
  getActiveProvider,
  getVisibleFiles,
  mobileReducer,
  mobileCatalog,
} from './mobileState';

describe('mobileReducer desktop parity', () => {
  it('creates local relay terminals and closes tabs like the desktop client', () => {
    const state = createInitialMobileState();
    const added = mobileReducer(state, { type: 'newLocalTerminal' });
    const closed = mobileReducer(added, {
      type: 'closeTerminal',
      terminalId: added.activeTerminalId,
    });

    expect(added.terminals).toHaveLength(2);
    expect(added.terminals.at(-1)?.type).toBe('relay');
    expect(closed.terminals).toHaveLength(1);
  });

  it('connects saved SSH configs as mobile terminal tabs', () => {
    const state = createInitialMobileState();

    const next = mobileReducer(state, { type: 'connectSsh', configId: 'prod' });

    expect(next.currentView).toBe('terminal');
    expect(next.terminals.at(-1)?.type).toBe('ssh');
    expect(next.terminals.at(-1)?.host).toContain('root@10.0.8.12');
  });

  it('toggles mobile split panes and focuses the new pane', () => {
    const state = createInitialMobileState();

    const split = mobileReducer(state, { type: 'toggleSplit' });

    expect(split.terminals[0].split.enabled).toBe(true);
    expect(split.terminals[0].split.panes).toHaveLength(2);
    expect(getActivePane(split).title).toBe('Split Relay');
  });

  it('runs commands in the active pane and keeps command history insert behavior separate', () => {
    const state = createInitialMobileState();
    const inserted = mobileReducer(state, {
      type: 'insertCommand',
      command: 'df -h',
    });
    const executed = mobileReducer(inserted, { type: 'runCommand' });

    expect(inserted.commandInput).toBe('df -h');
    expect(getActivePane(executed).lines).toContainEqual({ kind: 'prompt', text: '$ df -h' });
    expect(getActivePane(executed).lines.some(line => line.text.includes('Filesystem'))).toBe(true);
  });

  it('loads saved sessions into a terminal workspace', () => {
    const state = createInitialMobileState();

    const next = mobileReducer(state, { type: 'loadSession', sessionId: 'ops' });

    expect(next.currentView).toBe('terminal');
    expect(next.terminals.length).toBeGreaterThanOrEqual(2);
    expect(next.terminals.some(terminal => terminal.type === 'ssh')).toBe(true);
  });

  it('supports desktop-style read-only file explorer with hidden file toggle', () => {
    const state = createInitialMobileState();
    const hiddenOff = getVisibleFiles(state).some(file => file.hidden);
    const hiddenOnState = mobileReducer(state, { type: 'toggleHiddenFiles' });
    const hiddenOn = getVisibleFiles(hiddenOnState).some(file => file.hidden);

    const inLogs = mobileReducer(state, { type: 'openFileItem', itemId: 'logs' });
    const preview = mobileReducer(inLogs, { type: 'openFileItem', itemId: 'log-api' });

    expect(hiddenOff).toBe(false);
    expect(hiddenOn).toBe(true);
    expect(inLogs.currentPath).toBe('/shellai/logs');
    expect(preview.selectedFileId).toBe('log-api');
    expect(getActivePane(preview).lines.at(-1)?.text).toContain('tail -n 40');
  });

  it('routes AI provider suggestions back to the terminal command input', () => {
    const state = createInitialMobileState();
    const providerSelected = mobileReducer(state, {
      type: 'selectProvider',
      providerId: 'deepseek',
    });

    const next = mobileReducer(providerSelected, {
      type: 'askAi',
      prompt: '检查 nginx',
    });

    expect(next.aiProviderId).toBe('deepseek');
    expect(next.commandInput).toBe('systemctl status nginx');
    expect(getActivePane(next).lines.at(-1)?.text).toContain('DeepSeek');
  });

  it('opens the mobile AI assistant directly into chat mode from terminal context', () => {
    const state = createInitialMobileState();
    const modelsOpen = mobileReducer(state, { type: 'openAiProviders' });

    const chatOpen = mobileReducer(modelsOpen, { type: 'openAiChat' });

    expect(chatOpen.currentView).toBe('ai');
    expect(chatOpen.aiWorkspaceMode).toBe('chat');
  });

  it('keeps provider management reachable as a separate AI workspace mode', () => {
    const state = createInitialMobileState();

    const next = mobileReducer(state, { type: 'openAiProviders' });

    expect(next.currentView).toBe('ai');
    expect(next.aiWorkspaceMode).toBe('providers');
  });

  it('records AI chat messages when asking the mobile assistant', () => {
    const state = createInitialMobileState();
    const providerSelected = mobileReducer(state, {
      type: 'selectProvider',
      providerId: 'deepseek',
    });

    const next = mobileReducer(providerSelected, {
      type: 'askAi',
      prompt: '检查 nginx',
    });

    expect(next.currentView).toBe('ai');
    expect(next.aiWorkspaceMode).toBe('chat');
    expect(next.aiMessages).toEqual([
      { role: 'user', content: '检查 nginx' },
      {
        role: 'assistant',
        content: 'DeepSeek: 建议先执行 systemctl status nginx，再查看最近错误日志。',
      },
    ]);
  });

  it('imports desktop AI provider config into the mobile assistant without exposing secrets', () => {
    const state = createInitialMobileState();
    const desktopConfig = JSON.stringify({
      providers: [
        {
          name: 'openai',
          apiKey: 'sk-live-secret',
          baseURL: 'https://api.openai.com/v1',
          models: ['gpt-4o', 'gpt-4o-mini'],
          enabled: true,
        },
      ],
    });

    const withInput = mobileReducer(state, {
      type: 'setAiImportText',
      value: desktopConfig,
    });
    const imported = mobileReducer(withInput, { type: 'importAiProviders' });

    expect(imported.aiImportStatus?.tone).toBe('success');
    expect(imported.aiProviderId).toBe('openai');
    expect(getActiveProvider(imported).model).toBe('gpt-4o');
    expect(getActiveProvider(imported).endpoint).toBe('https://api.openai.com/v1');
    expect(getActiveProvider(imported).apiKeyPreview).toBe('sk-l********cret');
    expect(JSON.stringify(imported)).not.toContain('sk-live-secret');
  });

  it('reports invalid desktop AI provider imports without changing the active provider', () => {
    const state = createInitialMobileState();
    const withInput = mobileReducer(state, {
      type: 'setAiImportText',
      value: '{"providers":[]}',
    });
    const imported = mobileReducer(withInput, { type: 'importAiProviders' });

    expect(imported.aiProviderId).toBe('openai');
    expect(imported.aiImportStatus?.tone).toBe('error');
  });

  it('matches the desktop API import flow by selecting a provider template and fetching models', () => {
    const state = createInitialMobileState();
    const selected = mobileReducer(state, {
      type: 'selectAiImportTemplate',
      templateId: 'deepseek',
    });
    const withKey = mobileReducer(selected, {
      type: 'setAiImportApiKey',
      value: 'sk-deepseek-secret',
    });
    const fetched = mobileReducer(withKey, { type: 'fetchAiImportModels' });

    expect(fetched.aiImportDraft.templateId).toBe('deepseek');
    expect(fetched.aiImportDraft.baseURL).toBe('');
    expect(fetched.aiImportDraft.availableModels).toEqual(
      expect.arrayContaining(['deepseek-chat', 'deepseek-coder'])
    );
    expect(fetched.aiImportStatus?.tone).toBe('success');
  });

  it('uses the same AI provider vendors as the desktop settings import flow', () => {
    expect(mobileCatalog.aiProviderTemplates.map(template => template.id)).toEqual([
      'openai',
      'claude',
      'wenxin',
      'tongyi',
      'glm',
      'xinghuo',
      'moonshot',
      'deepseek',
      'ollama',
    ]);
    expect(mobileCatalog.aiProviderTemplates.map(template => template.displayName)).toEqual([
      'OpenAI',
      'Claude',
      '百度文心一言',
      '阿里通义千问',
      '智谱GLM',
      '讯飞星火',
      'Moonshot AI',
      'DeepSeek',
      'Ollama (本地)',
    ]);
  });

  it('requires API keys for paid desktop-style provider imports', () => {
    const state = createInitialMobileState();
    const selected = mobileReducer(state, {
      type: 'selectAiImportTemplate',
      templateId: 'openai',
    });

    const fetched = mobileReducer(selected, { type: 'fetchAiImportModels' });
    const saved = mobileReducer(selected, { type: 'saveAiImportProvider' });

    expect(fetched.aiImportStatus?.tone).toBe('error');
    expect(saved.aiImportStatus?.message).toContain('API Key');
  });

  it('saves a desktop-style API provider import with selected and manual models', () => {
    const state = createInitialMobileState();
    const selected = mobileReducer(state, {
      type: 'selectAiImportTemplate',
      templateId: 'openai',
    });
    const withKey = mobileReducer(selected, {
      type: 'setAiImportApiKey',
      value: 'sk-openai-secret',
    });
    const withManualInput = mobileReducer(withKey, {
      type: 'setAiImportManualModel',
      value: 'gpt-4.1',
    });
    const withManualModel = mobileReducer(withManualInput, { type: 'addAiImportManualModel' });
    const saved = mobileReducer(withManualModel, { type: 'saveAiImportProvider' });

    expect(saved.aiImportStatus?.tone).toBe('success');
    expect(saved.aiProviderId).toBe('openai');
    expect(getActiveProvider(saved).models).toEqual(expect.arrayContaining(['gpt-4.1']));
    expect(getActiveProvider(saved).apiKeyPreview).toBe('sk-o********cret');
    expect(JSON.stringify(saved)).not.toContain('sk-openai-secret');
  });

  it('documents mobile coverage for every major desktop feature', () => {
    expect(desktopFeatureCoverage).toEqual(
      expect.arrayContaining([
        '多标签终端',
        'SSH 配置与连接',
        '移动端分屏窗格',
        '搜索',
        '会话保存/恢复',
        'AI 助手与 Provider 管理',
        '命令历史',
        '只读资源管理器',
        '系统监控',
      ])
    );
  });
});
