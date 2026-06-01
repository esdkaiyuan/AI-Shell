import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { FC } from 'react';
import { useReducer } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CommandChip } from './src/components/CommandChip';
import { FileRow } from './src/components/FileRow';
import { SectionHeader } from './src/components/SectionHeader';
import { StatusPill } from './src/components/StatusPill';
import { TerminalPreview } from './src/components/TerminalPreview';
import {
  AIProviderItem,
  CommandHistoryItem,
  SavedSessionItem,
  SSHConfigItem,
  quickCommands,
} from './src/data';
import {
  MainView,
  MobileAction,
  MobileState,
  TerminalTab,
  createInitialMobileState,
  desktopFeatureCoverage,
  getActivePane,
  getActiveProvider,
  getAiProviders,
  getActiveTerminal,
  getSelectedFile,
  getVisibleFiles,
  mobileCatalog,
  mobileReducer,
} from './src/mobileState';
import { colors, radius, spacing } from './src/theme';

interface NavItem {
  key: MainView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const navItems: NavItem[] = [
  { key: 'terminal', label: '终端', icon: 'terminal-outline' },
  { key: 'ssh', label: 'SSH', icon: 'server-outline' },
  { key: 'sessions', label: '会话', icon: 'albums-outline' },
  { key: 'explorer', label: '文件', icon: 'folder-outline' },
  { key: 'ai', label: 'AI', icon: 'sparkles-outline' },
  { key: 'history', label: '历史', icon: 'time-outline' },
  { key: 'settings', label: '设置', icon: 'settings-outline' },
];

const App: FC = () => {
  const [state, dispatch] = useReducer(
    mobileReducer,
    undefined,
    createInitialMobileState
  ) as [MobileState, (action: MobileAction) => void];

  const activeTerminal = getActiveTerminal(state);
  const activePane = getActivePane(state);
  const activeProvider = getActiveProvider(state);
  const aiProviders = getAiProviders(state);
  const visibleFiles = getVisibleFiles(state);
  const selectedFile = getSelectedFile(state);

  const renderContent = () => {
    switch (state.currentView) {
      case 'terminal':
        return (
          <TerminalWorkspace
            state={state}
            activeTerminal={activeTerminal}
            activePane={activePane}
            dispatch={dispatch}
          />
        );
      case 'ssh':
        return <SSHWorkspace dispatch={dispatch} />;
      case 'sessions':
        return <SessionWorkspace dispatch={dispatch} />;
      case 'explorer':
        return (
          <ExplorerWorkspace
            state={state}
            files={visibleFiles}
            selectedFileName={selectedFile?.name}
            dispatch={dispatch}
          />
        );
      case 'ai':
        return <AIWorkspace state={state} activeProvider={activeProvider} providers={aiProviders} dispatch={dispatch} />;
      case 'history':
        return <HistoryWorkspace dispatch={dispatch} />;
      case 'settings':
        return <SettingsWorkspace state={state} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.appBar}>
        <View style={styles.brandMark}>
          <Ionicons name="terminal" color={colors.accent} size={18} />
        </View>
        <View style={styles.appBarText}>
          <Text style={styles.appName}>AI Shell</Text>
          <Text style={styles.appSub}>署名 esdkaiyuan</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={() => dispatch({ type: 'toggleSearch' })}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.statusStrip}>
        <Text numberOfLines={1} style={styles.statusStripText}>{activeTerminal.title}</Text>
        <Text style={styles.statusStripText}>{state.relayConnected ? 'Relay On' : 'Offline'}</Text>
        <Text style={styles.statusStripText}>UTF-8</Text>
      </View>

      <View style={styles.main}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navRail}
          contentContainerStyle={styles.navRailInner}
        >
          {navItems.map(item => {
            const active = state.currentView === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.navButton, active && styles.navButtonActive]}
                onPress={() => item.key === 'ai'
                  ? dispatch({ type: 'openAiChat' })
                  : dispatch({ type: 'setView', view: item.key })}
              >
                <Ionicons name={item.icon} size={18} color={active ? colors.accent : colors.textDim} />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {renderContent()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

interface WorkspaceProps {
  dispatch: (action: MobileAction) => void;
}

interface TerminalWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  activeTerminal: TerminalTab;
  activePane: ReturnType<typeof getActivePane>;
}

const TerminalWorkspace: FC<TerminalWorkspaceProps> = ({
  state,
  activeTerminal,
  activePane,
  dispatch,
}) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>Terminal Workspace</Text>
        <Text style={styles.title}>移动终端工作台</Text>
      </View>
      <StatusPill label={`${state.terminals.length} 标签`} tone="green" />
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
      {state.terminals.map(terminal => (
        <Pressable
          key={terminal.id}
          style={[styles.terminalTab, terminal.id === state.activeTerminalId && styles.terminalTabActive]}
          onPress={() => dispatch({ type: 'selectTerminal', terminalId: terminal.id })}
        >
          <Ionicons
            name={terminal.type === 'ssh' ? 'server-outline' : 'terminal-outline'}
            size={15}
            color={terminal.id === state.activeTerminalId ? colors.accent : colors.textDim}
          />
          <Text numberOfLines={1} style={styles.terminalTabText}>{terminal.title}</Text>
          <Pressable onPress={() => dispatch({ type: 'closeTerminal', terminalId: terminal.id })}>
            <Ionicons name="close" size={14} color={colors.textDim} />
          </Pressable>
        </Pressable>
      ))}
    </ScrollView>

    <View style={styles.toolbarGrid}>
      <ToolButton icon="add" label="本地" onPress={() => dispatch({ type: 'newLocalTerminal' })} />
      <ToolButton icon="git-compare-outline" label="分屏" onPress={() => dispatch({ type: 'toggleSplit' })} />
      <ToolButton icon="search-outline" label="查找" onPress={() => dispatch({ type: 'toggleSearch' })} />
      <ToolButton icon="sparkles-outline" label="AI" onPress={() => dispatch({ type: 'openAiChat' })} />
      <ToolButton icon="copy-outline" label="复制" onPress={() => dispatch({ type: 'insertCommand', command: 'copy-selection' })} />
      <ToolButton icon="clipboard-outline" label="粘贴" onPress={() => dispatch({ type: 'insertCommand', command: 'paste-buffer' })} />
      <ToolButton icon="expand-outline" label="全屏" onPress={() => dispatch({ type: 'setView', view: 'terminal' })} />
    </View>

    {activeTerminal.showSearch ? (
      <View style={styles.searchPanel}>
        <TextInput
          value={state.searchQuery}
          onChangeText={(query: string) => dispatch({ type: 'setSearchQuery', query })}
          placeholder="搜索终端输出"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
      </View>
    ) : null}

    {activeTerminal.split.enabled ? (
      <View style={styles.paneSelector}>
        {activeTerminal.split.panes.map(pane => (
          <Pressable
            key={pane.id}
            style={[styles.paneButton, pane.id === activeTerminal.split.activePaneId && styles.paneButtonActive]}
            onPress={() => dispatch({ type: 'focusPane', paneId: pane.id })}
          >
            <Text style={styles.paneButtonText}>{pane.title}</Text>
          </Pressable>
        ))}
      </View>
    ) : null}

    <TerminalPreview title={`${activePane.title} / ${activePane.type}`} lines={activePane.lines} />

    <View style={styles.commandBar}>
      <TextInput
        value={state.commandInput}
        onChangeText={(value: string) => dispatch({ type: 'setCommandInput', value })}
        placeholder="输入命令..."
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.commandInput}
      />
      <Pressable style={styles.runButton} onPress={() => dispatch({ type: 'runCommand' })}>
        <Ionicons name="play" size={17} color={colors.text} />
      </Pressable>
    </View>

    <SectionHeader title="快捷命令" meta="同步桌面历史" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {quickCommands.map(command => (
        <CommandChip
          key={command}
          command={command}
          onPress={(value: string) => dispatch({ type: 'insertCommand', command: value })}
        />
      ))}
    </ScrollView>
  </>
);

const SSHWorkspace: FC<WorkspaceProps> = ({ dispatch }) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>SSH Manager</Text>
        <Text style={styles.title}>连接配置</Text>
      </View>
      <ToolButton icon="add" label="新增" onPress={() => dispatch({ type: 'connectSsh', configId: 'prod' })} />
    </View>
    <View style={styles.stack}>
      {mobileCatalog.sshConfigs.map(config => (
        <SSHCard key={config.id} config={config} onConnect={() => dispatch({ type: 'connectSsh', configId: config.id })} />
      ))}
    </View>
  </>
);

const SessionWorkspace: FC<WorkspaceProps> = ({ dispatch }) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>Session Manager</Text>
        <Text style={styles.title}>会话保存与恢复</Text>
      </View>
      <StatusPill label="自动保存" tone="blue" />
    </View>
    <View style={styles.stack}>
      {mobileCatalog.savedSessions.map(session => (
        <SessionCard key={session.id} session={session} onLoad={() => dispatch({ type: 'loadSession', sessionId: session.id })} />
      ))}
    </View>
  </>
);

interface ExplorerWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  files: ReturnType<typeof getVisibleFiles>;
  selectedFileName?: string;
}

const ExplorerWorkspace: FC<ExplorerWorkspaceProps> = ({ state, files, selectedFileName, dispatch }) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>File Explorer</Text>
        <Text style={styles.title}>只读资源管理器</Text>
      </View>
      <StatusPill label={state.hiddenFilesVisible ? '隐藏已显示' : '安全只读'} tone="yellow" />
    </View>
    <View style={styles.pathBar}>
      <Pressable style={styles.pathButton} onPress={() => dispatch({ type: 'goUpDirectory' })}>
        <Ionicons name="arrow-up" size={16} color={colors.textMuted} />
      </Pressable>
      <Text numberOfLines={1} style={styles.pathText}>{state.currentPath}</Text>
      <Pressable style={styles.pathButton} onPress={() => dispatch({ type: 'toggleHiddenFiles' })}>
        <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
    <View style={styles.stack}>
      {files.map(item => (
        <FileRow
          key={item.id}
          item={item}
          active={item.id === state.selectedFileId}
          onPress={itemId => dispatch({ type: 'openFileItem', itemId })}
        />
      ))}
    </View>
    <View style={styles.previewPanel}>
      <Text style={styles.previewTitle}>桌面兼容行为</Text>
      <Text style={styles.previewText}>
        {selectedFileName
          ? `${selectedFileName} 已生成预览命令并送入当前终端。`
          : '移动端保持桌面端只读边界，文件操作通过终端命令确认。'}
      </Text>
    </View>
  </>
);

interface AIWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  activeProvider: AIProviderItem;
  providers: AIProviderItem[];
}

const AIWorkspace: FC<AIWorkspaceProps> = ({ state, activeProvider, providers, dispatch }) => {
  const selectedTemplate = mobileCatalog.aiProviderTemplates.find(
    template => template.id === state.aiImportDraft.templateId
  ) ?? mobileCatalog.aiProviderTemplates[0];
  const chatActive = state.aiWorkspaceMode === 'chat';

  return (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>AI Assistant</Text>
        <Text style={styles.title}>{chatActive ? 'AI 对话助手' : 'AI 模型管理'}</Text>
      </View>
      <StatusPill label={activeProvider.name} tone="blue" />
    </View>

    <View style={styles.segmentedControl}>
      <Pressable
        style={[styles.segmentButton, chatActive && styles.segmentButtonActive]}
        onPress={() => dispatch({ type: 'openAiChat' })}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={15} color={chatActive ? colors.accent : colors.textDim} />
        <Text style={[styles.segmentText, chatActive && styles.segmentTextActive]}>对话</Text>
      </Pressable>
      <Pressable
        style={[styles.segmentButton, !chatActive && styles.segmentButtonActive]}
        onPress={() => dispatch({ type: 'openAiProviders' })}
      >
        <Ionicons name="key-outline" size={15} color={!chatActive ? colors.accent : colors.textDim} />
        <Text style={[styles.segmentText, !chatActive && styles.segmentTextActive]}>模型</Text>
      </Pressable>
    </View>

    {chatActive ? (
      <>
        <View style={styles.aiContextPanel}>
          <View style={styles.aiContextTop}>
            <View>
              <Text style={styles.aiRole}>当前上下文</Text>
              <Text style={styles.aiText}>已绑定活动终端、命令输入、文件预览和历史命令。</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => dispatch({ type: 'openAiProviders' })}>
              <Ionicons name="options-outline" size={15} color={colors.textMuted} />
              <Text style={styles.secondaryButtonText}>模型</Text>
            </Pressable>
          </View>
          <Text style={styles.providerModel}>{activeProvider.model} / {activeProvider.endpoint}</Text>
        </View>

        <View style={styles.chatPanel}>
          {state.aiMessages.map((message, index) => {
            const user = message.role === 'user';
            return (
              <View
                key={`${message.role}-${index}`}
                style={[styles.chatBubble, user ? styles.chatBubbleUser : styles.chatBubbleAssistant]}
              >
                <Text style={styles.chatRole}>{user ? '你' : activeProvider.name}</Text>
                <Text style={styles.chatText}>{message.content}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={state.aiPrompt}
            onChangeText={(prompt: string) => dispatch({ type: 'setAiPrompt', prompt })}
            placeholder="询问 AI，例如：分析当前报错并给出命令"
            placeholderTextColor={colors.textDim}
            multiline
            textAlignVertical="top"
            style={styles.aiPromptInput}
          />
          <Pressable style={styles.sendButton} onPress={() => dispatch({ type: 'askAi', prompt: state.aiPrompt })}>
            <Ionicons name="send" size={18} color={colors.text} />
          </Pressable>
        </View>
      </>
    ) : (
      <>
        <View style={styles.providerRow}>
      {providers.map(provider => (
        <Pressable
          key={provider.id}
          style={[styles.providerChip, provider.id === state.aiProviderId && styles.providerChipActive]}
          onPress={() => dispatch({ type: 'selectProvider', providerId: provider.id })}
        >
          <View style={styles.providerHeader}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.imported && <Text style={styles.providerBadge}>导入</Text>}
          </View>
          <Text style={styles.providerModel}>
            {provider.model}{provider.models && provider.models.length > 1 ? ` +${provider.models.length - 1}` : ''}
          </Text>
          <Text style={styles.providerEndpoint}>{provider.endpoint}</Text>
          {provider.apiKeyPreview && <Text style={styles.providerKey}>{provider.apiKeyPreview}</Text>}
        </Pressable>
      ))}
        </View>
        <View style={styles.importPanel}>
      <View style={styles.importHeader}>
        <View>
          <Text style={styles.aiRole}>添加 AI 提供商</Text>
          <Text style={styles.aiText}>仿照桌面端 API 导入：选提供商、填 Key、获取模型、保存。</Text>
        </View>
      </View>
      <View style={styles.formStep}>
        <Text style={styles.formLabel}>1 选择 AI 提供商</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {mobileCatalog.aiProviderTemplates.map(template => (
            <Pressable
              key={template.id}
              style={[
                styles.templateChip,
                template.id === state.aiImportDraft.templateId && styles.templateChipActive,
              ]}
              onPress={() => dispatch({ type: 'selectAiImportTemplate', templateId: template.id })}
            >
              <Text style={styles.templateName}>{template.displayName}</Text>
              <Text style={styles.templateDesc}>{template.description}</Text>
              {template.isFree && <Text style={styles.providerBadge}>免费</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={styles.formStep}>
        <Text style={styles.formLabel}>2 {selectedTemplate.isFree ? 'API Key 可选' : '输入 API Key'}</Text>
        <TextInput
          value={state.aiImportDraft.apiKeyPreview}
          onChangeText={(value: string) => dispatch({ type: 'setAiImportApiKey', value })}
          placeholder={selectedTemplate.keyPlaceholder}
          placeholderTextColor={colors.textDim}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        {selectedTemplate.keyFormat && <Text style={styles.formHint}>{selectedTemplate.keyFormat}</Text>}
      </View>
      <View style={styles.formStep}>
        <View style={styles.formLabelRow}>
          <Text style={styles.formLabel}>3 选择要使用的模型</Text>
          <Pressable style={styles.smallActionButton} onPress={() => dispatch({ type: 'fetchAiImportModels' })}>
            <Ionicons name="refresh" size={14} color={colors.text} />
            <Text style={styles.smallActionText}>获取模型列表</Text>
          </Pressable>
        </View>
        <View style={styles.modelGrid}>
          {state.aiImportDraft.availableModels.map(model => {
            const selected = state.aiImportDraft.selectedModels.includes(model);
            return (
              <Pressable
                key={model}
                style={[styles.modelChip, selected && styles.modelChipActive]}
                onPress={() => dispatch({ type: 'toggleAiImportModel', model })}
              >
                <Ionicons
                  name={selected ? 'checkbox-outline' : 'square-outline'}
                  size={15}
                  color={selected ? colors.accent : colors.textDim}
                />
                <Text style={styles.modelText}>{model}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.manualModelRow}>
          <TextInput
            value={state.aiImportDraft.manualModelInput}
            onChangeText={(value: string) => dispatch({ type: 'setAiImportManualModel', value })}
            placeholder="手动输入模型名，例如 gpt-4o-mini"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.manualModelInput}
          />
          <Pressable style={styles.smallActionButton} onPress={() => dispatch({ type: 'addAiImportManualModel' })}>
            <Ionicons name="add" size={14} color={colors.text} />
            <Text style={styles.smallActionText}>添加</Text>
          </Pressable>
        </View>
        <Text style={styles.formHint}>接口不支持或自建服务时，可手动填写模型名。</Text>
      </View>
      <View style={styles.formStep}>
        <Text style={styles.formLabel}>4 高级设置</Text>
        <TextInput
          value={state.aiImportDraft.baseURL}
          onChangeText={(value: string) => dispatch({ type: 'setAiImportBaseURL', value })}
          placeholder={selectedTemplate.defaultBaseURL || '使用默认地址'}
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Text style={styles.formHint}>留空使用默认地址；代理或自建服务填写完整 URL。</Text>
      </View>
      <TextInput
        value={state.aiImportText}
        onChangeText={(value: string) => dispatch({ type: 'setAiImportText', value })}
        placeholder='{"providers":[{"name":"openai","apiKey":"sk-...","models":["gpt-4o"]}]}'
        placeholderTextColor={colors.textDim}
        multiline
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.legacyImportInput}
      />
      <View style={styles.formActions}>
        <Pressable style={styles.secondaryButton} onPress={() => dispatch({ type: 'importAiProviders' })}>
          <Ionicons name="document-text-outline" size={15} color={colors.textMuted} />
          <Text style={styles.secondaryButtonText}>兼容 JSON</Text>
        </Pressable>
        <Pressable style={styles.importButton} onPress={() => dispatch({ type: 'saveAiImportProvider' })}>
          <Ionicons name="checkmark" size={16} color={colors.text} />
          <Text style={styles.importButtonText}>确定添加</Text>
        </Pressable>
      </View>
      {state.aiImportStatus && (
        <Text style={[
          styles.importStatus,
          state.aiImportStatus.tone === 'success' && styles.importStatusSuccess,
          state.aiImportStatus.tone === 'error' && styles.importStatusError,
        ]}>
          {state.aiImportStatus.message}
        </Text>
      )}
        </View>
      </>
    )}
  </>
  );
};

const HistoryWorkspace: FC<WorkspaceProps> = ({ dispatch }) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>Command History</Text>
        <Text style={styles.title}>历史记录</Text>
      </View>
      <ToolButton icon="trash-outline" label="清空" onPress={() => dispatch({ type: 'insertCommand', command: 'history --clear' })} />
    </View>
    <View style={styles.stack}>
      {mobileCatalog.commandHistory.map(item => (
        <HistoryRow key={item.id} item={item} onPress={() => dispatch({ type: 'insertCommand', command: item.command })} />
      ))}
    </View>
  </>
);

const SettingsWorkspace: FC<{ state: MobileState }> = ({ state }) => (
  <>
    <View style={styles.headerLine}>
      <View>
        <Text style={styles.eyebrow}>Settings</Text>
        <Text style={styles.title}>设置与能力覆盖</Text>
      </View>
      <StatusPill label="Xshell Dark" tone="blue" />
    </View>
    <View style={styles.settingGroup}>
      <SettingRow icon="phone-portrait-outline" title="移动中继" value={state.relayConnected ? '已连接' : '未连接'} />
      <SettingRow icon="shield-checkmark-outline" title="密钥存储" value="移动端安全存储" />
      <SettingRow icon="text-outline" title="终端字体" value="12 / monospace" />
      <SettingRow icon="stats-chart-outline" title="监控" value={`CPU ${state.systemStats.cpu}% / MEM ${state.systemStats.memory}%`} />
      <SettingRow icon="person-circle-outline" title="署名" value="esdkaiyuan" />
    </View>
    <SectionHeader title="桌面功能覆盖" />
    <View style={styles.coverageGrid}>
      {desktopFeatureCoverage.map(item => (
        <View key={item} style={styles.coverageItem}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={styles.coverageText}>{item}</Text>
        </View>
      ))}
    </View>
  </>
);

interface ToolButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const ToolButton: FC<ToolButtonProps> = ({ icon, label, onPress }) => (
  <Pressable style={styles.toolButton} onPress={onPress}>
    <Ionicons name={icon} size={16} color={colors.textMuted} />
    <Text style={styles.toolButtonText}>{label}</Text>
  </Pressable>
);

const SSHCard: FC<{ config: SSHConfigItem; onConnect: () => void }> = ({ config, onConnect }) => {
  const tone = config.status === 'online' ? 'green' : config.status === 'idle' ? 'yellow' : 'red';
  return (
    <Pressable style={styles.card} onPress={onConnect}>
      <View style={styles.cardIcon}>
        <Ionicons name="server-outline" size={20} color={colors.accent} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{config.name}</Text>
          <StatusPill label={config.status} tone={tone} />
        </View>
        <Text style={styles.mono}>{config.username}@{config.host}:{config.port}</Text>
        <Text style={styles.cardMeta}>{config.auth} / {config.latency}</Text>
      </View>
    </Pressable>
  );
};

const SessionCard: FC<{ session: SavedSessionItem; onLoad: () => void }> = ({ session, onLoad }) => (
  <Pressable style={styles.card} onPress={onLoad}>
    <View style={styles.cardIcon}>
      <Ionicons name="albums-outline" size={20} color={colors.accent} />
    </View>
    <View style={styles.cardBody}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{session.name}</Text>
        <Text style={styles.cardMeta}>{session.updatedAt}</Text>
      </View>
      <Text style={styles.cardMeta}>{session.terminalCount} terminals / active: {session.activeTitle}</Text>
    </View>
  </Pressable>
);

const HistoryRow: FC<{ item: CommandHistoryItem; onPress: () => void }> = ({ item, onPress }) => (
  <Pressable style={styles.historyRow} onPress={onPress}>
    <Text numberOfLines={1} style={styles.historyCommand}>{item.command}</Text>
    <Text style={styles.historyMeta}>{item.cwd} / exit {item.exitCode} / {item.timestamp}</Text>
  </Pressable>
);

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}

const SettingRow: FC<SettingRowProps> = ({ icon, title, value }) => (
  <View style={styles.settingRow}>
    <Ionicons name={icon} size={19} color={colors.accent} />
    <Text style={styles.settingTitle}>{title}</Text>
    <Text style={styles.settingValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  appBar: {
    height: 54,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.toolbar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarText: {
    flex: 1,
  },
  appName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  appSub: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStrip: {
    height: 26,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusStripText: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  main: {
    flex: 1,
  },
  navRail: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.toolbar,
  },
  navRailInner: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: spacing.sm,
  },
  navButton: {
    width: 58,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navButtonActive: {
    backgroundColor: colors.selection,
  },
  navLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  stack: {
    gap: spacing.sm,
  },
  tabRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  terminalTab: {
    maxWidth: 180,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  terminalTabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  terminalTabText: {
    maxWidth: 110,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toolButton: {
    minWidth: 70,
    height: 34,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.panelRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  toolButtonText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  searchPanel: {
    marginBottom: spacing.sm,
  },
  paneSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  paneButton: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  paneButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  paneButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  commandBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  commandInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  runButton: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  card: {
    minHeight: 74,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  cardMeta: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 4,
  },
  mono: {
    color: colors.textMuted,
    fontFamily: 'Courier',
    fontSize: 12,
    marginTop: 4,
  },
  pathBar: {
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pathButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathText: {
    flex: 1,
    color: colors.textMuted,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  previewPanel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  providerRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  providerChip: {
    minHeight: 48,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  providerChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  providerName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  providerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  providerModel: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 3,
  },
  providerEndpoint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 3,
  },
  providerKey: {
    color: colors.green,
    fontFamily: 'Courier',
    fontSize: 11,
    marginTop: 5,
  },
  segmentedControl: {
    minHeight: 38,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    gap: 3,
    marginBottom: spacing.md,
  },
  segmentButton: {
    flex: 1,
    minHeight: 30,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  segmentButtonActive: {
    backgroundColor: colors.selection,
  },
  segmentText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.accent,
  },
  importPanel: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.panelRaised,
    marginBottom: spacing.sm,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  formStep: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  formLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  formLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  formHint: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
  },
  templateRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  templateChip: {
    width: 132,
    minHeight: 76,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    gap: spacing.xs,
  },
  templateChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  templateName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  templateDesc: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  modelGrid: {
    gap: spacing.sm,
  },
  modelChip: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modelChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  modelText: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  manualModelRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualModelInput: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 12,
  },
  smallActionButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.panelHover,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  smallActionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  importButton: {
    minWidth: 74,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  importButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  importInput: {
    minHeight: 96,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
  legacyImportInput: {
    minHeight: 48,
    maxHeight: 72,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.textDim,
    fontFamily: 'Courier',
    fontSize: 10,
    lineHeight: 14,
    marginTop: spacing.md,
  },
  importStatus: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  importStatusSuccess: {
    color: colors.green,
  },
  importStatusError: {
    color: colors.red,
  },
  aiPanel: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    marginBottom: spacing.sm,
  },
  aiContextPanel: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.panelRaised,
    marginBottom: spacing.sm,
  },
  aiContextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  aiRole: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  aiText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  chatPanel: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chatBubble: {
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  chatBubbleAssistant: {
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  chatBubbleUser: {
    borderColor: colors.accent,
    backgroundColor: colors.selection,
  },
  chatRole: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  chatText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  aiPromptInput: {
    flex: 1,
    minHeight: 54,
    maxHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
  },
  input: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 13,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    minHeight: 58,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
  },
  historyCommand: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 12,
  },
  historyMeta: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 5,
  },
  settingGroup: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  settingRow: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  settingValue: {
    color: colors.textDim,
    fontSize: 12,
  },
  coverageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  coverageItem: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coverageText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});

export default App;
