import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AIAssistButton } from './src/components/AIAssistButton';
import {
  AI_CAPABILITIES,
  hasCapability,
  planAIActions,
  extractCommands,
  describeAIAction,
  type AIActionPlan,
} from './src/aiTerminal';
import { CommandChip } from './src/components/CommandChip';
import { FileRow } from './src/components/FileRow';
import { FunctionMenu } from './src/components/FunctionMenu';
import { ProfileHome } from './src/components/ProfileHome';
import { SectionHeader } from './src/components/SectionHeader';
import { SetupWizard } from './src/components/SetupWizard';
import { SidePanel } from './src/components/SidePanel';
import { StatusPill } from './src/components/StatusPill';
import { TerminalPreview } from './src/components/TerminalPreview';
import type { FileItem } from './src/data';
import {
  configStore,
  activeProvider,
  commandPlatformForTerminal,
  maskSecret,
  sshProfilePlatform,
  useAppConfig,
  type SSHProfile,
  type WorkspaceSession,
} from './src/services/config';
import { sendChat, type AIChatMessage } from './src/services/ai';
import {
  COMMAND_PLATFORM_LABELS,
  quickCommands as commandsForPlatform,
  suggestCommands,
} from './src/services/commandCatalog';
import { runtimeStore, useRuntime } from './src/services/runtimeStore';
import {
  getDeviceStats,
  getStorageInfo,
  listLinuxDirectory,
  readClipboard,
  readLinuxFile,
  type LinuxDirEntry,
  type LinuxStatus,
} from './src/native/nativeBridge';
import { useTerminalRuntime, type TerminalRuntimeApi } from './src/hooks/useTerminalRuntime';
import { useKeyboardVisible } from './src/hooks/useKeyboardVisible';
import {
  HORIZONTAL_FADE_LENGTH,
  contentMaxWidth,
  showAuxiliaryTools,
} from './src/layout';
import {
  MobileAction,
  MobileState,
  createInitialMobileState,
  desktopFeatureCoverage,
  getActivePane,
  getActiveTerminal,
  mobileReducer,
} from './src/mobileState';
import { colors, radius, spacing, surfaces, typography } from './src/theme';
import { barHeight, grid, systemColors, typeScale } from './src/hig';
import {
  isPanelOpen,
  type PanelDestination,
  type PanelSection,
  type TerminalAction,
} from './src/navigation';

type SetupStep = 'environment' | 'ai' | 'ssh' | 'finish';
type MobilePressEvent = { stopPropagation: () => void };

const AppContent: FC = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboardVisible = useKeyboardVisible();
  const showAuxiliary = showAuxiliaryTools({ width, height, keyboardVisible });
  const maxContentWidth = contentMaxWidth(width);
  const [state, dispatch] = useReducer(mobileReducer, undefined, createInitialMobileState) as [
    MobileState,
    (action: MobileAction) => void,
  ];
  const config = useAppConfig();
  const runtime = useRuntime();
  const [booted, setBooted] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<SetupStep>('environment');

  const terminalApi = useTerminalRuntime(
    state,
    dispatch,
    runtime.status.installed,
    config.sshProfiles
  );

  useEffect(() => {
    let alive = true;
    Promise.all([configStore.init(), runtimeStore.init()]).finally(() => {
      if (alive) setBooted(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!booted || config.setupCompleted) return;
    setWizardStep(runtime.status.installed ? 'ai' : 'environment');
    setWizardOpen(true);
  }, [booted, config.setupCompleted, runtime.status.installed]);

  useEffect(() => {
    if (!booted) return;
    let alive = true;
    const load = async () => {
      const stats = await getDeviceStats().catch(() => null);
      if (!alive || !stats) return;
      dispatch({
        type: 'setSystemStats',
        stats: {
          cpu: stats.cpu,
          memory: stats.memory,
          network: stats.network,
          disk: stats.disk,
        },
      });
    };
    load();
    const timer = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [booted]);

  const openSetup = useCallback(
    (step?: SetupStep) => {
      setWizardStep(step || (runtime.status.installed ? 'ai' : 'environment'));
      setWizardOpen(true);
    },
    [runtime.status.installed]
  );

  const activeTerminal = getActiveTerminal(state);
  const panelOpen = isPanelOpen(state.currentView);
  /** Keep the last section mounted while the closing animation runs. */
  const lastSection = useRef<PanelSection>('ai');
  if (panelOpen) lastSection.current = state.currentView as PanelSection;
  const panelSection = lastSection.current;
  const pageSubtitle = `${activeTerminal.title} · ${
    runtime.status.installed ? 'Linux 就绪' : '需要配置'
  }`;
  /**
   * A one-message conversation stays short; the card grows up to 62% as chat
   * builds. SidePanel compensates for the IME from its own measured height.
   */
  const aiCardRatio = Math.min(
    0.62,
    0.34 + Math.max(1, state.aiMessages.length + (state.aiLoading ? 1 : 0)) * 0.05
  );

  const openAiAssistant = () => dispatch({ type: 'openAiChat' });
  const closePanel = () => dispatch({ type: 'setView', view: 'terminal' });
  const openMenu = () => dispatch({ type: 'setView', view: 'menu' });
  const selectPanelDestination = (view: PanelDestination) => {
    if (view === 'ai') {
      dispatch({ type: 'openAiChat' });
    } else {
      dispatch({ type: 'setView', view });
    }
  };
  /** Terminal-scoped actions run in place, then dismiss the sheet back to the terminal. */
  const runTerminalAction = (action: TerminalAction) => {
    switch (action) {
      case 'newLocalTerminal':
        dispatch({ type: 'newLocalTerminal' });
        break;
      case 'toggleSplit':
        dispatch({ type: 'toggleSplit' });
        break;
      case 'toggleSearch':
        dispatch({ type: 'toggleSearch' });
        break;
      case 'clearPane':
        terminalApi.clearActive();
        break;
      case 'copyOutput':
        terminalApi.copyOutput();
        break;
      case 'paste':
        readClipboard()
          .then(text => {
            if (text) dispatch({ type: 'setCommandInput', value: state.commandInput + text });
          })
          .catch(() => undefined);
        break;
    }
    closePanel();
  };

  /** Every destination lives inside the trailing sheet; the main page is terminal only. */
  const renderPanelContent = () => {
    switch (panelSection) {
      case 'menu':
        return (
          <FunctionMenu
            section={panelSection}
            onSelect={selectPanelDestination}
            onAction={runTerminalAction}
          />
        );
      case 'terminal':
        return null;
      case 'ssh':
        return <SSHWorkspace config={config} dispatch={dispatch} onOpenSetup={openSetup} />;
      case 'sessions':
        return <SessionWorkspace config={config} state={state} dispatch={dispatch} />;
      case 'explorer':
        return (
          <ExplorerWorkspace
            state={state}
            dispatch={dispatch}
            runtime={runtime.status}
            onOpenSetup={openSetup}
          />
        );
      case 'ai':
        return (
          <AIWorkspace
            state={state}
            dispatch={dispatch}
            config={config}
            showAuxiliary={showAuxiliary}
            terminalApi={terminalApi}
            onClosePanel={closePanel}
            onOpenSetup={openSetup}
          />
        );
      case 'history':
        return <HistoryWorkspace config={config} dispatch={dispatch} />;
      case 'profile':
        return (
          <ProfileHome
            config={config}
            runtime={runtime.status}
            onOpen={view => dispatch({ type: 'setView', view })}
          />
        );
      case 'settings':
        return (
          <SettingsWorkspace
            config={config}
            runtime={runtime.status}
            state={state}
            onOpenSetup={openSetup}
            onReset={async () => {
              await runtimeStore.reset();
              openSetup('environment');
            }}
          />
        );
      default:
        return null;
    }
  };

  if (!booted) {
    return (
      <View style={[styles.boot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="light" />
        <View style={styles.bootMark}>
          <Ionicons name="terminal" size={28} color={colors.accent} />
        </View>
        <Text style={styles.bootTitle}>AI Shell</Text>
        <Text style={styles.bootSub}>正在加载内置 Linux 环境…</Text>
        <ActivityIndicator color={colors.accent} style={styles.bootSpinner} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <StatusBar style="light" />

        {/* HIG large-title navigation bar with a single prominent action. */}
        <View style={styles.titleBar}>
          <View style={styles.titleBarText}>
            <Text style={styles.largeTitle}>终端</Text>
            <Text numberOfLines={1} style={styles.titleSubtitle}>
              {pageSubtitle}
            </Text>
          </View>
          <AIAssistButton active={panelOpen} onPress={openAiAssistant} />
        </View>

        <View style={styles.main}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.fullHeightContent,
              maxContentWidth
                ? { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' }
                : null,
            ]}
          >
            <TerminalWorkspace
              state={state}
              dispatch={dispatch}
              config={config}
              runtime={runtime.status}
              terminalApi={terminalApi}
              showAuxiliary={showAuxiliary}
              onOpenSetup={openSetup}
            />
          </KeyboardAvoidingView>
        </View>

        <SetupWizard
          visible={wizardOpen}
          initialStep={wizardStep}
          onComplete={() => {
            setWizardOpen(false);
            runtimeStore.refresh();
          }}
          onClose={config.setupCompleted ? () => setWizardOpen(false) : undefined}
        />
      </View>

      {/* Trailing sheet overlays the whole window, including the status-bar area. */}
      <SidePanel
        open={panelOpen}
        section={panelSection}
        compact={panelSection === 'ai'}
        compactHeightRatio={aiCardRatio}
        onClose={closePanel}
        onBack={openMenu}
      >
        {renderPanelContent()}
      </SidePanel>
    </View>
  );
};

interface WorkspaceProps {
  dispatch: (action: MobileAction) => void;
}

interface TerminalWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  config: ReturnType<typeof useAppConfig>;
  runtime: LinuxStatus;
  terminalApi: TerminalRuntimeApi;
  showAuxiliary: boolean;
  onOpenSetup: (step?: SetupStep) => void;
}

const TerminalWorkspace: FC<TerminalWorkspaceProps> = ({
  state,
  dispatch,
  config,
  runtime,
  terminalApi,
  showAuxiliary,
  onOpenSetup,
}) => {
  const activeTerminal = getActiveTerminal(state);
  const activePane = getActivePane(state);
  const commandPlatform = commandPlatformForTerminal(
    activeTerminal.type,
    activeTerminal.sshProfileId,
    config.sshProfiles
  );
  const platformLabel = COMMAND_PLATFORM_LABELS[commandPlatform];
  const suggestions = useMemo(
    () =>
      suggestCommands(
        state.commandInput,
        config.history
          .filter(item => (item.platform || 'alpine') === commandPlatform)
          .map(item => item.command),
        commandPlatform
      ),
    [state.commandInput, config.history, commandPlatform]
  );
  const quickEntries = useMemo(() => commandsForPlatform(commandPlatform), [commandPlatform]);
  const query = state.searchQuery.trim();
  const visibleLines = query
    ? activePane.lines.filter(line => line.text.toLowerCase().includes(query.toLowerCase()))
    : activePane.lines;

  return (
    <>
      {!runtime.installed ? (
        <Pressable style={styles.runtimeBanner} onPress={() => onOpenSetup('environment')}>
          <View style={styles.runtimeBannerIcon}>
            <Ionicons name="download-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.runtimeBannerTitle}>内置 Linux 尚未安装</Text>
            <Text style={styles.runtimeBannerText}>安装 Alpine 根文件系统后即可离线执行命令</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        fadingEdgeLength={HORIZONTAL_FADE_LENGTH}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {state.terminals.map(terminal => {
          const active = terminal.id === state.activeTerminalId;
          return (
            <Pressable
              key={terminal.id}
              accessibilityRole="button"
              accessibilityLabel={`${terminal.title} 终端`}
              accessibilityState={{ selected: active }}
              style={[styles.terminalTab, active && styles.terminalTabActive]}
              onPress={() => dispatch({ type: 'selectTerminal', terminalId: terminal.id })}
            >
              <Ionicons
                name={terminal.type === 'ssh' ? 'server-outline' : 'terminal-outline'}
                size={15}
                color={active ? colors.accent : colors.textDim}
              />
              <Text numberOfLines={1} style={styles.terminalTabText}>
                {terminal.title}
              </Text>
              {state.terminals.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`关闭 ${terminal.title}`}
                  hitSlop={8}
                  style={styles.tabClose}
                  onPress={(event: MobilePressEvent) => {
                    event.stopPropagation();
                    dispatch({ type: 'closeTerminal', terminalId: terminal.id });
                  }}
                >
                  <Ionicons name="close" size={14} color={colors.textDim} />
                </Pressable>
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="新建本地终端"
          style={styles.addTab}
          onPress={() => dispatch({ type: 'newLocalTerminal' })}
        >
          <Ionicons name="add" size={18} color={colors.textMuted} />
        </Pressable>
      </ScrollView>

      {activeTerminal.showSearch ? (
        <View style={styles.searchPanel}>
          <Ionicons name="search" size={16} color={colors.textDim} />
          <TextInput
            value={state.searchQuery}
            onChangeText={(value: string) => dispatch({ type: 'setSearchQuery', query: value })}
            placeholder="过滤终端输出"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
          />
          {query ? <Text style={styles.searchCount}>{visibleLines.length}</Text> : null}
        </View>
      ) : null}

      {activeTerminal.split.enabled ? (
        <View style={styles.paneSelector}>
          {activeTerminal.split.panes.map(pane => (
            <Pressable
              key={pane.id}
              style={[
                styles.paneButton,
                pane.id === activeTerminal.split.activePaneId && styles.paneButtonActive,
              ]}
              onPress={() => dispatch({ type: 'focusPane', paneId: pane.id })}
            >
              <Text style={styles.paneButtonText}>{pane.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {activePane.sessionStatus === 'exited' ? (
        <Pressable style={styles.reconnectBanner} onPress={() => terminalApi.restartActive()}>
          <Ionicons name="refresh" size={16} color={colors.yellow} />
          <Text style={styles.reconnectText}>会话已结束，点击重新连接</Text>
        </Pressable>
      ) : null}

      <TerminalPreview
        title={`${activePane.title} / ${platformLabel}`}
        lines={visibleLines}
        status={activePane.sessionStatus}
      />

      <View style={styles.commandDock}>
        {/* Micro permission switches: they decide what AI may do to this terminal. */}
        <View style={styles.aiCapabilityBar}>
          <View style={styles.aiCapabilityBrand}>
            <Ionicons name="sparkles-outline" size={11} color={systemColors.systemBlue} />
            <Text style={styles.aiCapabilityBrandText}>AI</Text>
          </View>
          <View style={styles.aiCapabilityItems}>
            {AI_CAPABILITIES.map(option => {
              const checked = hasCapability(state.aiCapabilities, option.id);
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${option.label}：${option.hint}`}
                  hitSlop={{ top: 8, bottom: 8, left: 5, right: 5 }}
                  onPress={() =>
                    dispatch({ type: 'toggleAiCapability', capability: option.id })
                  }
                  style={styles.aiCapabilityItem}
                >
                  <View
                    style={[
                      styles.aiCheckbox,
                      checked && styles.aiCheckboxChecked,
                      option.sensitive && checked && styles.aiCheckboxSensitive,
                    ]}
                  >
                    {checked ? <Ionicons name="checkmark" size={9} color="#FFFFFF" /> : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.aiCapabilityLabel,
                      checked && styles.aiCapabilityLabelChecked,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {hasCapability(state.aiCapabilities, 'run') ? (
            <View style={styles.aiRunNotice}>
              <View style={styles.aiRunDot} />
              <Text numberOfLines={1} style={styles.aiRunNoticeText}>
                自动执行已开启
              </Text>
            </View>
          ) : null}
        </View>

        {showAuxiliary ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            fadingEdgeLength={HORIZONTAL_FADE_LENGTH}
            style={styles.horizontalStrip}
            contentContainerStyle={styles.keyRow}
          >
            <TerminalKey label="Ctrl+C" onPress={() => terminalApi.sendKey('\x03')} />
            <TerminalKey label="Tab" onPress={() => terminalApi.sendKey('\t')} />
            <TerminalKey label="↑" onPress={() => terminalApi.sendKey('\x1b[A')} />
            <TerminalKey label="↓" onPress={() => terminalApi.sendKey('\x1b[B')} />
            <TerminalKey label="Esc" onPress={() => terminalApi.sendKey('\x1b')} />
            <TerminalKey label="Enter" onPress={() => terminalApi.sendKey('\r')} />
            <TerminalKey
              label="|"
              onPress={() => dispatch({ type: 'setCommandInput', value: `${state.commandInput}|` })}
            />
            <TerminalKey
              label="/"
              onPress={() => dispatch({ type: 'setCommandInput', value: `${state.commandInput}/` })}
            />
          </ScrollView>
        ) : null}

        {showAuxiliary ? (
          state.commandInput.trim() ? (
            suggestions.length ? (
              <View style={styles.suggestionPanel}>
                <View style={styles.suggestionHeader}>
                  <Ionicons name="sparkles-outline" size={13} color={colors.accent} />
                  <Text style={styles.suggestionHeaderText}>补全 · {platformLabel}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  fadingEdgeLength={HORIZONTAL_FADE_LENGTH}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestionStrip}
                  contentContainerStyle={styles.suggestionRow}
                >
                  {suggestions.map(item => (
                    <Pressable
                      key={`${item.source}-${item.command}`}
                      accessibilityRole="button"
                      accessibilityLabel={`补全为 ${item.command}`}
                      style={styles.suggestionCard}
                      onPress={() => dispatch({ type: 'insertCommand', command: item.command })}
                    >
                      <Text numberOfLines={1} style={styles.suggestionCommand}>
                        {item.command}
                      </Text>
                      <Text numberOfLines={1} style={styles.suggestionDescription}>
                        {item.description}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null
          ) : (
            <View style={styles.quickPanel}>
              <Text style={styles.quickLabel}>常用 · {platformLabel}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                fadingEdgeLength={HORIZONTAL_FADE_LENGTH}
                style={styles.horizontalStrip}
                contentContainerStyle={styles.chipRow}
              >
                {quickEntries.map(item => (
                  <CommandChip
                    key={item.command}
                    command={item.command}
                    onPress={(value: string) => dispatch({ type: 'insertCommand', command: value })}
                  />
                ))}
              </ScrollView>
            </View>
          )
        ) : null}

        <View style={styles.commandBar}>
          <TextInput
            value={state.commandInput}
            onChangeText={(value: string) => dispatch({ type: 'setCommandInput', value })}
            placeholder={
              activePane.sessionStatus === 'ready' ? `输入 ${platformLabel} 命令…` : '等待会话就绪…'
            }
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => terminalApi.runCommand()}
            returnKeyType="send"
            style={styles.commandInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="执行命令"
            style={[
              styles.runButton,
              activePane.sessionStatus !== 'ready' && styles.runButtonDisabled,
            ]}
            onPress={() => terminalApi.runCommand()}
            disabled={activePane.sessionStatus !== 'ready'}
          >
            <Ionicons name="play" size={17} color="#fff" />
          </Pressable>
        </View>
      </View>
    </>
  );
};

const TerminalKey: FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <Pressable style={styles.keyButton} onPress={onPress}>
    <Text style={styles.keyText}>{label}</Text>
  </Pressable>
);

interface SSHWorkspaceProps extends WorkspaceProps {
  config: ReturnType<typeof useAppConfig>;
  onOpenSetup: (step?: SetupStep) => void;
}

const SSHWorkspace: FC<SSHWorkspaceProps> = ({ config, dispatch, onOpenSetup }) => {
  const removeProfile = (profile: SSHProfile) =>
    Alert.alert('删除 SSH 配置', `确定删除「${profile.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          configStore.removeSshProfile(profile.id).catch(() => undefined);
        },
      },
    ]);

  return (
    <>
      <View style={styles.pageActionRow}>
        <Text style={styles.pageActionLabel}>
          {config.sshProfiles.length
            ? `${config.sshProfiles.length} 个已保存连接`
            : 'OpenSSH 已内置'}
        </Text>
        <Pressable style={styles.smallAction} onPress={() => onOpenSetup('ssh')}>
          <Ionicons name="add" size={16} color={colors.text} />
          <Text style={styles.smallActionText}>新增连接</Text>
        </Pressable>
      </View>

      {config.sshProfiles.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="server-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>还没有 SSH 配置</Text>
          <Text style={styles.emptyText}>
            内置环境已包含 OpenSSH 客户端。添加主机后可直接在 Linux 终端中连接。
          </Text>
          <Pressable style={styles.emptyButton} onPress={() => onOpenSetup('ssh')}>
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={styles.emptyButtonText}>配置 SSH</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.stack}>
          {config.sshProfiles.map(profile => (
            <SSHCard
              key={profile.id}
              profile={profile}
              onConnect={() => dispatch({ type: 'connectSsh', profile })}
              onDelete={() => removeProfile(profile)}
            />
          ))}
        </View>
      )}
    </>
  );
};

const SSHCard: FC<{ profile: SSHProfile; onConnect: () => void; onDelete: () => void }> = ({
  profile,
  onConnect,
  onDelete,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`连接 ${profile.name}`}
    style={styles.card}
    onPress={onConnect}
  >
    <View style={styles.cardIcon}>
      <Ionicons name="server-outline" size={20} color={colors.accent} />
    </View>
    <View style={styles.cardBody}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{profile.name}</Text>
        <View style={styles.authPill}>
          <Text style={styles.authText}>{profile.privateKey ? '密钥' : '密码'}</Text>
        </View>
      </View>
      <Text style={styles.mono}>
        {profile.username}@{profile.host}:{profile.port}
      </Text>
      <Text style={styles.cardMeta}>
        {COMMAND_PLATFORM_LABELS[sshProfilePlatform(profile)]} · 点击在内置 Linux 中连接
      </Text>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`删除 ${profile.name}`}
      style={styles.cardDelete}
      onPress={(event: MobilePressEvent) => {
        event.stopPropagation();
        onDelete();
      }}
    >
      <Ionicons name="trash-outline" size={16} color={colors.red} />
    </Pressable>
  </Pressable>
);

interface SessionWorkspaceProps extends WorkspaceProps {
  config: ReturnType<typeof useAppConfig>;
  state: MobileState;
}

const SessionWorkspace: FC<SessionWorkspaceProps> = ({ config, state, dispatch }) => {
  const [name, setName] = useState('');

  const save = async () => {
    const activeIndex = Math.max(
      0,
      state.terminals.findIndex(terminal => terminal.id === state.activeTerminalId)
    );
    const session: WorkspaceSession = {
      id: `ws-${Date.now()}`,
      name: name.trim() || `工作区 ${new Date().toLocaleTimeString()}`,
      terminals: state.terminals.map(terminal => ({
        title: terminal.title,
        type: terminal.type,
        sshProfileId: terminal.sshProfileId,
        host: terminal.host,
      })),
      activeIndex,
      updatedAt: Date.now(),
    };
    await configStore.saveWorkspace(session);
    setName('');
  };

  return (
    <>
      <View style={styles.pageActionRow}>
        <Text style={styles.pageActionLabel}>保存当前终端标签布局</Text>
        <StatusPill label={`${config.workspaceSessions.length} 个`} tone="blue" />
      </View>

      <View style={styles.saveBar}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="会话名称（可选）"
          placeholderTextColor={colors.textDim}
          style={styles.saveInput}
        />
        <Pressable style={styles.smallAction} onPress={save}>
          <Ionicons name="save-outline" size={16} color={colors.text} />
          <Text style={styles.smallActionText}>保存</Text>
        </Pressable>
      </View>

      {config.workspaceSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="albums-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>还没有保存的工作区</Text>
          <Text style={styles.emptyText}>保存当前标签布局，下次可一键恢复。</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {config.workspaceSessions.map(session => (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              accessibilityLabel={`恢复工作区 ${session.name}`}
              style={styles.card}
              onPress={() =>
                dispatch({
                  type: 'loadWorkspace',
                  terminals: session.terminals,
                  activeIndex: session.activeIndex,
                })
              }
            >
              <View style={styles.cardIcon}>
                <Ionicons name="albums-outline" size={20} color={colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{session.name}</Text>
                  <Text style={styles.cardMeta}>
                    {new Date(session.updatedAt).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>
                  {session.terminals.length} 个标签 / 当前:{' '}
                  {session.terminals[session.activeIndex]?.title || '—'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`删除工作区 ${session.name}`}
                style={styles.cardDelete}
                onPress={(event: MobilePressEvent) => {
                  event.stopPropagation();
                  Alert.alert('删除工作区', `确定删除「${session.name}」吗？`, [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '删除',
                      style: 'destructive',
                      onPress: () => {
                        configStore.removeWorkspace(session.id).catch(() => undefined);
                      },
                    },
                  ]);
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.red} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
};

interface ExplorerWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  runtime: LinuxStatus;
  onOpenSetup: (step?: SetupStep) => void;
}

const formatSize = (size: number): string => {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const ExplorerWorkspace: FC<ExplorerWorkspaceProps> = ({
  state,
  dispatch,
  runtime,
  onOpenSetup,
}) => {
  const [entries, setEntries] = useState<LinuxDirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    name: string;
    path: string;
    content: string;
    binary: boolean;
    truncated: boolean;
    size: number;
  } | null>(null);

  const load = useCallback(
    async (path: string) => {
      if (!runtime.installed) {
        setError('内置 Linux 未安装，无法浏览文件。');
        setEntries([]);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const list = await listLinuxDirectory(path);
        setEntries(list);
        dispatch({ type: 'setCurrentPath', path });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [runtime.installed, dispatch]
  );

  useEffect(() => {
    load(state.currentPath);
  }, [state.currentPath, load]);

  const openEntry = async (entry: LinuxDirEntry) => {
    if (entry.type === 'directory') {
      dispatch({ type: 'setCurrentPath', path: entry.path });
      setPreview(null);
      return;
    }
    dispatch({ type: 'setSelectedFile', path: entry.path });
    try {
      const file = await readLinuxFile(entry.path);
      setPreview({
        name: entry.name,
        path: entry.path,
        content: file.binary ? '（二进制文件，未显示内容）' : file.content,
        binary: file.binary,
        truncated: file.truncated,
        size: file.size,
      });
    } catch (reason) {
      setPreview({
        name: entry.name,
        path: entry.path,
        content: reason instanceof Error ? reason.message : String(reason),
        binary: false,
        truncated: false,
        size: entry.size,
      });
    }
  };

  const parentPath = (() => {
    if (state.currentPath === '/' || !state.currentPath) return '/';
    const index = state.currentPath.lastIndexOf('/');
    return index <= 0 ? '/' : state.currentPath.slice(0, index);
  })();

  const items: FileItem[] = useMemo(
    () =>
      entries
        .filter(entry => state.hiddenFilesVisible || !entry.hidden)
        .map(entry => ({
          id: entry.path,
          name: entry.name,
          path: entry.path,
          type: entry.type,
          parentPath: state.currentPath,
          size: formatSize(entry.size),
          modified: new Date(entry.modifiedAt).toLocaleDateString(),
          hidden: entry.hidden,
        })),
    [entries, state.hiddenFilesVisible, state.currentPath]
  );

  return (
    <>
      {!runtime.installed ? (
        <Pressable style={styles.runtimeBanner} onPress={() => onOpenSetup('environment')}>
          <View style={styles.runtimeBannerIcon}>
            <Ionicons name="download-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.runtimeBannerTitle}>安装内置 Linux 后浏览文件</Text>
            <Text style={styles.runtimeBannerText}>文件系统位于 APK 的 Alpine 根目录</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>
      ) : (
        <>
          <View style={styles.pathBar}>
            <Pressable style={styles.pathButton} onPress={() => load(parentPath)}>
              <Ionicons name="arrow-up" size={16} color={colors.textMuted} />
            </Pressable>
            <Text numberOfLines={1} style={styles.pathText}>
              {state.currentPath}
            </Text>
            <Pressable
              style={styles.pathButton}
              onPress={() => dispatch({ type: 'toggleHiddenFiles' })}
            >
              <Ionicons
                name={state.hiddenFilesVisible ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
            <Pressable style={styles.pathButton} onPress={() => load(state.currentPath)}>
              <Ionicons name="refresh" size={16} color={colors.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.fileStatus}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.fileStatusText}>读取目录…</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.stack}>
            {items.map(item => (
              <FileRow
                key={item.id}
                item={item}
                active={item.id === state.selectedFilePath}
                onPress={() => {
                  const entry = entries.find(candidate => candidate.path === item.id);
                  if (entry) openEntry(entry);
                }}
              />
            ))}
          </View>

          {!loading && !error && items.length === 0 ? (
            <Text style={styles.fileStatusText}>这个目录为空。</Text>
          ) : null}

          {preview ? (
            <View style={styles.filePreview}>
              <View style={styles.filePreviewHeader}>
                <Text numberOfLines={1} style={styles.filePreviewName}>
                  {preview.name}
                </Text>
                <Text style={styles.cardMeta}>{formatSize(preview.size)}</Text>
              </View>
              <ScrollView style={styles.filePreviewScroll} nestedScrollEnabled>
                <Text selectable style={styles.filePreviewContent}>
                  {preview.content}
                </Text>
              </ScrollView>
              {preview.truncated ? (
                <Text style={styles.hintText}>文件较大，仅显示前 128 KB。</Text>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </>
  );
};

interface AIWorkspaceProps extends WorkspaceProps {
  state: MobileState;
  config: ReturnType<typeof useAppConfig>;
  showAuxiliary: boolean;
  terminalApi: TerminalRuntimeApi;
  onClosePanel: () => void;
  onOpenSetup: (step?: SetupStep) => void;
}

const AIWorkspace: FC<AIWorkspaceProps> = ({
  state,
  dispatch,
  config,
  showAuxiliary,
  terminalApi,
  onClosePanel,
  onOpenSetup,
}) => {
  const [actionNote, setActionNote] = useState('');
  const provider = activeProvider(config);
  const chatActive = state.aiWorkspaceMode === 'chat';
  const activeTerminal = getActiveTerminal(state);
  const includeContext = hasCapability(state.aiCapabilities, 'context');
  const platformLabel =
    COMMAND_PLATFORM_LABELS[
      commandPlatformForTerminal(
        activeTerminal.type,
        activeTerminal.sshProfileId,
        config.sshProfiles
      )
    ];

  /** Apply an answer to the live terminal, then reveal the terminal window. */
  const applyToTerminal = async (command: string, mode: 'fill' | 'run'): Promise<void> => {
    if (mode === 'fill') {
      dispatch({ type: 'insertCommand', command });
      setActionNote('已填入终端输入框');
    } else {
      const ok = await terminalApi.executeCommand(command);
      setActionNote(ok ? '已在终端执行，输出见终端窗口' : '终端未就绪，命令未执行');
    }
    onClosePanel();
  };

  const applyPlan = async (plan: AIActionPlan): Promise<void> => {
    if (plan.fill) dispatch({ type: 'insertCommand', command: plan.fill });
    if (plan.run.length) {
      let executed = 0;
      // Sequential writes keep dependent commands in order.
      await plan.run.reduce(
        (chain, command) =>
          chain.then(async () => {
            if (await terminalApi.executeCommand(command)) executed += 1;
          }),
        Promise.resolve()
      );
      setActionNote(
        executed ? `已在终端执行 ${executed} 条命令` : '终端未就绪，命令未执行'
      );
    } else {
      setActionNote(describeAIAction(plan));
    }
  };

  const send = async () => {
    const content = state.aiPrompt.trim();
    if (!content || state.aiLoading) return;
    if (!provider) {
      dispatch({ type: 'aiError', message: '尚未配置 AI 提供商，请先完成配置。' });
      return;
    }
    const history: AIChatMessage[] = state.aiMessages
      .filter(message => !message.content.startsWith('可以让我解释'))
      .map(message => ({ role: message.role, content: message.content }));
    const terminalContext = includeContext
      ? getActivePane(state)
          .lines.slice(-60)
          .map(line => line.text)
          .join('\n')
          .slice(-3000)
      : '';
    const basePrompt = `你是 AI Shell 手机端的运维助手。当前终端目标系统是 ${platformLabel}。回答要简洁、可执行，给出的命令请放进 \`\`\`bash 代码块，必须适用于该系统；不要编造未执行过的输出。`;
    const systemPrompt = terminalContext.trim()
      ? `${basePrompt}\n\n当前终端最近输出：\n\`\`\`\n${terminalContext}\n\`\`\``
      : basePrompt;
    dispatch({ type: 'aiRequestStart', content });
    try {
      const answer = await sendChat(
        provider,
        [...history, { role: 'user', content }],
        systemPrompt
      );
      dispatch({ type: 'aiResponse', content: answer });
      await applyPlan(planAIActions(answer, state.aiCapabilities));
    } catch (error) {
      dispatch({
        type: 'aiError',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <>
      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segmentButton, chatActive && styles.segmentButtonActive]}
          onPress={() => dispatch({ type: 'openAiChat' })}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={13}
            color={chatActive ? colors.text : colors.textDim}
          />
          <Text style={[styles.segmentText, chatActive && styles.segmentTextActive]}>对话</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, !chatActive && styles.segmentButtonActive]}
          onPress={() => dispatch({ type: 'openAiProviders' })}
        >
          <Ionicons
            name="key-outline"
            size={13}
            color={!chatActive ? colors.text : colors.textDim}
          />
          <Text style={[styles.segmentText, !chatActive && styles.segmentTextActive]}>模型</Text>
        </Pressable>
      </View>

      {chatActive ? (
        <>
          {showAuxiliary ? (
            <View style={styles.aiContextPanel}>
              <Ionicons name="terminal-outline" size={12} color={systemColors.systemBlue} />
              <Text numberOfLines={1} style={styles.aiContextLine}>
                {includeContext ? `${activeTerminal.title} · 已读取终端输出` : '未读取终端输出'} ·{' '}
                {provider ? provider.model : '未配置模型'}
              </Text>
              <Pressable
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={styles.aiContextAction}
                onPress={() => dispatch({ type: 'openAiProviders' })}
              >
                <Text style={styles.aiContextActionText}>模型</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView
            style={styles.chatPanel}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
          >
            {state.aiMessages.map((message, index) => {
              const user = message.role === 'user';
              const commands = user ? [] : extractCommands(message.content);
              return (
                <View
                  key={`${message.role}-${index}`}
                  style={[
                    styles.chatBubble,
                    user ? styles.chatBubbleUser : styles.chatBubbleAssistant,
                  ]}
                >
                  <Text style={[styles.chatRole, user && styles.chatRoleUser]}>
                    {user ? '你' : provider?.displayName || 'AI'}
                  </Text>
                  <Text style={[styles.chatText, user && styles.chatTextUser]}>
                    {message.content}
                  </Text>
                  {commands.length ? (
                    <View style={styles.messageActionRow}>
                      {commands.map((command, commandIndex) => (
                        <View
                          key={`${command}-${commandIndex}`}
                          style={styles.messageActionLine}
                        >
                          <Text numberOfLines={1} style={styles.messageActionCommand}>
                            {command}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`把 ${command} 填入终端输入框`}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={styles.messageActionButton}
                            onPress={() => applyToTerminal(command, 'fill')}
                          >
                            <Text style={styles.messageActionText}>填入</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`在终端执行 ${command}`}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={[
                              styles.messageActionButton,
                              styles.messageActionButtonRun,
                            ]}
                            onPress={() => applyToTerminal(command, 'run')}
                          >
                            <Text
                              style={[
                                styles.messageActionText,
                                styles.messageActionRunText,
                              ]}
                            >
                              执行
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
            {state.aiLoading ? (
              <View style={[styles.chatBubble, styles.chatBubbleAssistant]}>
                <View style={styles.typing}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            ) : null}
          </ScrollView>

          {state.aiError ? <Text style={styles.aiError}>{state.aiError}</Text> : null}

          {actionNote ? (
            <View style={styles.aiActionNote}>
              <Ionicons
                name="checkmark-circle-outline"
                size={12}
                color={systemColors.systemGreen}
              />
              <Text numberOfLines={1} style={styles.aiActionNoteText}>
                {actionNote}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清除 AI 操作提示"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => setActionNote('')}
              >
                <Ionicons name="close" size={11} color={colors.textDim} />
              </Pressable>
            </View>
          ) : null}

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="发送 AI 消息"
              style={[
                styles.sendButton,
                (!provider || state.aiLoading) && styles.sendButtonDisabled,
              ]}
              onPress={send}
              disabled={!provider || state.aiLoading}
            >
              {state.aiLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
          {!provider ? (
            <Pressable style={styles.emptyButton} onPress={() => onOpenSetup('ai')}>
              <Ionicons name="key-outline" size={16} color="#fff" />
              <Text style={styles.emptyButtonText}>配置 AI 提供商</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <ScrollView
          style={styles.providerScroll}
          contentContainerStyle={styles.providerScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {config.aiProviders.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={26} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>还没有 AI 提供商</Text>
              <Text style={styles.emptyText}>
                Key 使用 Android Keystore 加密保存。支持
                OpenAI、Claude、DeepSeek、GLM、通义、Kimi、Ollama 与文心。
              </Text>
              <Pressable style={styles.emptyButton} onPress={() => onOpenSetup('ai')}>
                <Ionicons name="add" size={17} color="#fff" />
                <Text style={styles.emptyButtonText}>添加提供商</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stack}>
              {config.aiProviders.map(item => {
                const active = item.id === config.activeProviderId;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`使用 ${item.displayName} ${item.model}`}
                    accessibilityState={{ selected: active }}
                    style={[styles.providerCard, active && styles.providerCardActive]}
                    onPress={() => configStore.setActiveProvider(item.id)}
                  >
                    <View style={styles.providerCardTop}>
                      <View style={styles.flexText}>
                        <Text style={styles.providerName}>{item.displayName}</Text>
                        <Text style={styles.providerEndpoint}>
                          {item.model} · {item.baseURL}
                        </Text>
                      </View>
                      {active ? <StatusPill label="当前" tone="blue" /> : null}
                    </View>
                    <Text style={styles.providerKey}>
                      {item.apiKey ? maskSecret(item.apiKey) : '本地服务 / 无 Key'}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.modelChipRow}
                    >
                      {item.models.map(model => {
                        const selected = item.model === model;
                        return (
                          <Pressable
                            key={model}
                            style={[styles.modelChip, selected && styles.modelChipActive]}
                            onPress={(event: MobilePressEvent) => {
                              event.stopPropagation();
                              configStore.setActiveProvider(item.id, model);
                            }}
                          >
                            <Text style={[styles.modelText, selected && styles.modelTextActive]}>
                              {model}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <View style={styles.providerActions}>
                      <Pressable
                        style={styles.secondaryAction}
                        onPress={(event: MobilePressEvent) => {
                          event.stopPropagation();
                          Alert.alert('删除 AI 提供商', `确定删除「${item.displayName}」吗？`, [
                            { text: '取消', style: 'cancel' },
                            {
                              text: '删除',
                              style: 'destructive',
                              onPress: () => {
                                configStore.removeProvider(item.id).catch(() => undefined);
                              },
                            },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.red} />
                        <Text style={[styles.secondaryActionText, styles.dangerText]}>删除</Text>
                      </Pressable>
                      {active ? (
                        <Pressable
                          style={styles.secondaryAction}
                          onPress={(event: MobilePressEvent) => {
                            event.stopPropagation();
                            onOpenSetup('ai');
                          }}
                        >
                          <Ionicons name="create-outline" size={15} color={colors.accent} />
                          <Text style={styles.secondaryActionText}>编辑</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
              <Pressable style={styles.emptyButton} onPress={() => onOpenSetup('ai')}>
                <Ionicons name="add" size={17} color="#fff" />
                <Text style={styles.emptyButtonText}>添加提供商</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.hintText}>移动端使用非流式请求；星火 WebSocket 鉴权暂未接入。</Text>
        </ScrollView>
      )}
    </>
  );
};

interface HistoryWorkspaceProps extends WorkspaceProps {
  config: ReturnType<typeof useAppConfig>;
}

const HistoryWorkspace: FC<HistoryWorkspaceProps> = ({ config, dispatch }) => (
  <>
    <View style={styles.pageActionRow}>
      <Text style={styles.pageActionLabel}>{config.history.length} 条已提交命令</Text>
      <Pressable
        style={[styles.smallAction, config.history.length === 0 && styles.runButtonDisabled]}
        onPress={() =>
          Alert.alert('清空命令历史', '将删除全部已提交命令记录，此操作无法撤销。', [
            { text: '取消', style: 'cancel' },
            {
              text: '清空',
              style: 'destructive',
              onPress: () => configStore.clearHistory().catch(() => undefined),
            },
          ])
        }
        disabled={config.history.length === 0}
      >
        <Ionicons name="trash-outline" size={16} color={colors.text} />
        <Text style={styles.smallActionText}>清空</Text>
      </Pressable>
    </View>

    {config.history.length === 0 ? (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="time-outline" size={26} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>还没有命令记录</Text>
        <Text style={styles.emptyText}>在终端执行的命令会自动保存在这里。</Text>
      </View>
    ) : (
      <View style={styles.stack}>
        {config.history.map(item => (
          <Pressable
            key={item.id}
            style={styles.historyRow}
            onPress={() => dispatch({ type: 'insertCommand', command: item.command })}
          >
            <Text numberOfLines={1} style={styles.historyCommand}>
              {item.command}
            </Text>
            <Text style={styles.historyMeta}>
              {new Date(item.timestamp).toLocaleString()} · 已提交 ·{' '}
              {COMMAND_PLATFORM_LABELS[item.platform || 'alpine']}
            </Text>
          </Pressable>
        ))}
      </View>
    )}
  </>
);

interface SettingsWorkspaceProps {
  config: ReturnType<typeof useAppConfig>;
  runtime: LinuxStatus;
  state: MobileState;
  onOpenSetup: (step?: SetupStep) => void;
  onReset: () => Promise<void>;
}

const SettingsWorkspace: FC<SettingsWorkspaceProps> = ({
  config,
  runtime,
  state,
  onOpenSetup,
  onReset,
}) => {
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getStorageInfo>> | null>(null);

  useEffect(() => {
    getStorageInfo()
      .then(setStorage)
      .catch(() => setStorage(null));
  }, []);

  const provider = activeProvider(config);

  return (
    <>
      <View style={styles.settingGroup}>
        <SettingRow
          icon="cube-outline"
          title="Linux 运行时"
          value={runtime.installed ? `${runtime.distro || 'Alpine'} · ${runtime.abi}` : '未安装'}
        />
        <SettingRow
          icon="sparkles-outline"
          title="AI 提供商"
          value={provider ? `${provider.displayName} / ${provider.model}` : '未配置'}
        />
        <SettingRow
          icon="server-outline"
          title="SSH 配置"
          value={config.sshProfiles.length ? `${config.sshProfiles.length} 个连接` : '未配置'}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          title="密钥存储"
          value={storage ? `${storage.type} · ${storage.algorithm}` : '读取中…'}
        />
        <SettingRow
          icon="stats-chart-outline"
          title="系统状态"
          value={`CPU ${state.systemStats.cpu.toFixed(0)}% · MEM ${state.systemStats.memory.toFixed(0)}% · DISK ${state.systemStats.disk.toFixed(0)}%`}
        />
        <SettingRow icon="person-circle-outline" title="署名" value="esdkaiyuan" />
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.secondaryAction} onPress={() => onOpenSetup('environment')}>
          <Ionicons name="settings-outline" size={16} color={colors.accent} />
          <Text style={styles.secondaryActionText}>环境与配置向导</Text>
        </Pressable>
        {runtime.installed ? (
          <Pressable
            style={[styles.secondaryAction, styles.dangerAction]}
            onPress={() =>
              Alert.alert(
                '重置内置 Linux',
                '将删除本地 Alpine 根文件系统与已安装工具，AI/SSH 配置会保留。',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '重置',
                    style: 'destructive',
                    onPress: () => {
                      onReset().catch(() => undefined);
                    },
                  },
                ]
              )
            }
          >
            <Ionicons name="trash-outline" size={16} color={colors.red} />
            <Text style={[styles.secondaryActionText, styles.dangerText]}>重置环境</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionHeader title="内置能力" />
      <View style={styles.coverageGrid}>
        {desktopFeatureCoverage.map(item => (
          <View key={item} style={styles.coverageItem}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.coverageText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hintText}>
        Linux 运行时来自 APK 内置 Alpine 3.20.3。第三方许可见 APK 的 licenses 资源；PRoot 采用
        GPL-2.0。
      </Text>
    </>
  );
};

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}

const SettingRow: FC<SettingRowProps> = ({ icon, title, value }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingIcon}>
      <Ionicons name={icon} size={18} color={colors.accent} />
    </View>
    <Text style={styles.settingTitle}>{title}</Text>
    <Text numberOfLines={1} style={styles.settingValue}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: systemColors.systemBackground },
  safeArea: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.appBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bootMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bootTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  bootSub: { color: colors.textDim, fontSize: 12 },
  bootSpinner: { marginTop: spacing.md },
  /** HIG large-title navigation bar: one title, one prominent action. */
  titleBar: {
    minHeight: barHeight.largeTitle + grid.tight,
    paddingHorizontal: grid.base,
    paddingTop: grid.unit,
    paddingBottom: grid.tight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: grid.tight,
    backgroundColor: systemColors.systemGroupedBackground,
  },
  titleBarText: { flex: 1, minWidth: 0, gap: 2 },
  largeTitle: {
    color: systemColors.label,
    fontSize: typeScale.title1.fontSize,
    lineHeight: typeScale.title1.lineHeight,
    fontWeight: '700',
    letterSpacing: typeScale.title1.letterSpacing,
  },
  titleSubtitle: {
    color: systemColors.secondaryLabel,
    fontSize: typeScale.footnote.fontSize,
    lineHeight: typeScale.footnote.lineHeight,
    letterSpacing: typeScale.footnote.letterSpacing,
  },
  main: { flex: 1 },
  fullHeightContent: { flex: 1, padding: spacing.lg },
  flexText: { flex: 1, minWidth: 0 },
  pageActionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pageActionLabel: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  stack: { gap: 10 },
  tabScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 54 },
  tabRow: { gap: spacing.sm, paddingBottom: 10, alignItems: 'center' },
  terminalTab: {
    height: 44,
    maxWidth: 192,
    paddingLeft: spacing.md,
    paddingRight: 4,
    borderRadius: 10,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  terminalTabActive: { backgroundColor: colors.selection },
  terminalTabText: { maxWidth: 112, color: colors.text, fontSize: 12.5, fontWeight: '600' },
  tabClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTab: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  runtimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.panel,
    marginBottom: spacing.md,
  },
  runtimeBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runtimeBannerTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  runtimeBannerText: { color: colors.textDim, fontSize: 11.5, marginTop: 3 },
  searchPanel: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 },
  searchCount: { color: colors.textDim, fontSize: 11, fontFamily: 'Courier' },
  paneSelector: { flexDirection: 'row', gap: spacing.sm, marginBottom: 10 },
  paneButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  paneButtonActive: { backgroundColor: colors.selection },
  paneButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    marginBottom: 8,
  },
  reconnectText: { color: colors.yellow, fontSize: 12, fontWeight: '500' },
  commandBar: { flexDirection: 'row', gap: spacing.sm, marginTop: 10 },
  commandInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.panel,
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 13,
  },
  runButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runButtonDisabled: { opacity: 0.4 },
  commandDock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: surfaces.dock,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  // Deliberately tiny: a 13px check square and 10px label keep the whole
  // permission row under 26px so the terminal output keeps its height.
  // hitSlop gives each switch a comfortable touch area without visual bulk.
  aiCapabilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
    paddingTop: 1,
    paddingBottom: 3,
  },
  aiCapabilityBrand: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  aiCapabilityBrandText: {
    color: systemColors.systemBlue,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  aiCapabilityItems: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiCapabilityItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiCheckbox: {
    width: 13,
    height: 13,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCheckboxChecked: {
    backgroundColor: systemColors.systemBlue,
    borderColor: systemColors.systemBlue,
  },
  aiCheckboxSensitive: {
    backgroundColor: systemColors.systemOrange,
    borderColor: systemColors.systemOrange,
  },
  aiCapabilityLabel: { color: colors.textDim, fontSize: 10.5 },
  aiCapabilityLabelChecked: { color: systemColors.label },
  aiRunNotice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiRunDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: systemColors.systemOrange,
  },
  aiRunNoticeText: { color: systemColors.systemOrange, fontSize: 9.5 },
  // A horizontal ScrollView without an explicit height grows into whatever
  // space the flex column has left, which pushes the command dock away from
  // the terminal output. Pin the strips so the output area owns the slack.
  horizontalStrip: { flexGrow: 0, flexShrink: 0, maxHeight: 52 },
  suggestionStrip: { flexGrow: 0, flexShrink: 0, maxHeight: 66 },
  keyRow: { gap: 6, paddingTop: spacing.xs, paddingRight: spacing.md },
  keyButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', fontFamily: 'Courier' },
  quickPanel: { gap: 5, paddingTop: 0 },
  quickLabel: {
    color: colors.textDim,
    fontSize: typography.caption,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  suggestionPanel: { gap: 5, paddingTop: 0 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 2 },
  suggestionHeaderText: { color: colors.accent, fontSize: typography.caption, fontWeight: '600' },
  suggestionRow: { gap: 7, paddingRight: spacing.lg },
  suggestionCard: {
    width: 214,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    gap: 3,
  },
  suggestionCommand: { color: colors.text, fontFamily: 'Courier', fontSize: 12 },
  suggestionDescription: { color: colors.textDim, fontSize: typography.caption },
  card: {
    minHeight: 78,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  cardMeta: { color: colors.textDim, fontSize: 11.5, marginTop: 4 },
  cardDelete: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mono: { color: colors.textMuted, fontFamily: 'Courier', fontSize: 12, marginTop: 4 },
  authPill: {
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
  },
  authText: { color: colors.accent, fontSize: 10, fontWeight: '600' },
  pathBar: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 10,
  },
  pathButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathText: { flex: 1, color: colors.textMuted, fontFamily: 'Courier', fontSize: 12 },
  fileStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fileStatusText: { color: colors.textDim, fontSize: 12 },
  errorText: { color: colors.red, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  filePreview: {
    marginTop: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.panel,
    padding: 14,
    gap: 8,
  },
  filePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filePreviewName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  filePreviewScroll: { maxHeight: 200 },
  filePreviewContent: {
    color: colors.textMuted,
    fontFamily: 'Courier',
    fontSize: 11.5,
    lineHeight: 17,
  },
  hintText: { color: colors.textDim, fontSize: 11, lineHeight: 17, marginTop: spacing.md },
  saveBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  saveInput: {
    flex: 1,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.panel,
    color: colors.text,
    fontSize: 13,
  },
  smallAction: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.panelRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  smallActionText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  emptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  emptyText: { color: colors.textDim, fontSize: 12.5, lineHeight: 19, textAlign: 'center' },
  emptyButton: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  emptyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  segmentedControl: {
    minHeight: 34,
    padding: 2,
    borderRadius: 9,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 30,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  segmentButtonActive: { backgroundColor: colors.panelRaised },
  segmentText: { color: colors.textDim, fontSize: 11, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  // One 28px meta line replaces the old two-line context card.
  aiContextPanel: {
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiContextLine: { flex: 1, color: colors.textMuted, fontSize: 10.5 },
  aiContextAction: { paddingHorizontal: 2 },
  aiContextActionText: { color: systemColors.systemBlue, fontSize: 10.5, fontWeight: '600' },
  chatPanel: { flex: 1, minHeight: 64, marginBottom: 5 },
  // Messages sit just above the composer rather than leaving a tall void below them.
  chatContent: {
    flexGrow: 1,
    gap: 6,
    paddingBottom: 2,
    justifyContent: 'flex-end',
  },
  providerScroll: { flex: 1 },
  providerScrollContent: { flexGrow: 1, paddingBottom: spacing.xl },
  chatBubble: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, maxWidth: '92%' },
  chatBubbleAssistant: {
    backgroundColor: colors.panel,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
  },
  chatBubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  chatRole: { color: colors.textDim, fontSize: 9.5, fontWeight: '600', marginBottom: 1 },
  chatRoleUser: { color: 'rgba(255,255,255,0.72)' },
  chatText: { color: colors.text, fontSize: 12, lineHeight: 17 },
  chatTextUser: { color: '#fff' },
  // Inline terminal actions: a command plus two 20px text buttons per row.
  messageActionRow: { gap: 3, marginTop: 6 },
  messageActionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 20,
    paddingTop: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  messageActionCommand: {
    flex: 1,
    minWidth: 0,
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'Courier',
  },
  messageActionButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: colors.panelRaised,
  },
  messageActionButtonRun: { backgroundColor: 'rgba(10, 132, 255, 0.16)' },
  messageActionText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  messageActionRunText: { color: systemColors.systemBlue },
  aiActionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    marginBottom: 4,
  },
  aiActionNoteText: { flex: 1, color: systemColors.systemGreen, fontSize: 10.5 },
  typing: { flexDirection: 'row', gap: 4, paddingVertical: 2 },
  typingDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.textDim },
  aiError: { color: colors.red, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  aiPromptInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 76,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.panel,
    color: colors.text,
    fontSize: 12.5,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  historyRow: {
    minHeight: 62,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.panel,
  },
  historyCommand: { color: colors.text, fontFamily: 'Courier', fontSize: 13 },
  historyMeta: { color: colors.textDim, fontSize: 11, marginTop: 5 },
  settingGroup: {
    marginTop: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.panel,
  },
  settingRow: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  settingValue: { color: colors.textDim, fontSize: 12, maxWidth: '54%', textAlign: 'right' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  secondaryAction: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  dangerAction: { backgroundColor: 'rgba(255, 69, 58, 0.1)' },
  dangerText: { color: colors.red },
  providerCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.panel,
    gap: 8,
  },
  providerCardActive: { backgroundColor: colors.selection },
  providerCardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  providerName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  providerEndpoint: { color: colors.textDim, fontSize: 11, marginTop: 3, fontFamily: 'Courier' },
  providerKey: { color: colors.green, fontSize: 11, fontFamily: 'Courier' },
  modelChipRow: { gap: 6, paddingRight: spacing.md },
  modelChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
  },
  modelChipActive: { backgroundColor: colors.accentSoft },
  modelText: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Courier' },
  modelTextActive: { color: colors.accent },
  providerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  coverageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  coverageItem: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coverageText: { color: colors.textMuted, fontSize: 11 },
});

const App: FC = () => (
  <SafeAreaProvider>
    <AppContent />
  </SafeAreaProvider>
);

export default App;
