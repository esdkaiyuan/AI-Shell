import { useEffect, useMemo, useState, type FC } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeAvailable } from '../native/nativeBridge';
import { listProviderModels } from '../services/ai';
import {
  COMMAND_PLATFORM_LABELS,
  COMMAND_PLATFORM_OPTIONS,
  type RemoteCommandPlatform,
} from '../services/commandCatalog';
import {
  PROVIDER_PRESETS,
  activeProvider,
  configStore,
  presetById,
  providerFromPreset,
  sshProfilePlatform,
  useAppConfig,
  type ProviderPreset,
  type SSHProfile,
} from '../services/config';
import { runtimeStore, useRuntime } from '../services/runtimeStore';
import { pickPrivateKeyFile } from '../services/sshKeyFiles';
import { parsePrivateKey } from '../services/sshKeys';
import { colors, radius, spacing } from '../theme';

type StepKey = 'environment' | 'ai' | 'ssh' | 'finish';

interface SetupWizardProps {
  visible: boolean;
  initialStep?: StepKey;
  onComplete: () => void;
  onClose?: () => void;
}

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: 'environment', label: '环境' },
  { key: 'ai', label: 'AI' },
  { key: 'ssh', label: 'SSH' },
  { key: 'finish', label: '完成' },
];

const emptySshForm = {
  name: '',
  host: '',
  port: '22',
  username: 'root',
  privateKey: '',
  platform: 'linux' as RemoteCommandPlatform,
};

export const SetupWizard: FC<SetupWizardProps> = ({
  visible,
  initialStep,
  onComplete,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const runtime = useRuntime();
  const config = useAppConfig();
  const [step, setStep] = useState<StepKey>(initialStep || 'environment');

  const [presetId, setPresetId] = useState(PROVIDER_PRESETS[0].id);
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(PROVIDER_PRESETS[0].baseURL);
  const [model, setModel] = useState(PROVIDER_PRESETS[0].models[0]);
  const [models, setModels] = useState<string[]>(PROVIDER_PRESETS[0].models);
  const [showKey, setShowKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [sshForm, setSshForm] = useState(emptySshForm);
  const [sshMessage, setSshMessage] = useState<string | null>(null);
  const [pickingKey, setPickingKey] = useState(false);
  const [keyFileLabel, setKeyFileLabel] = useState('');

  const preset = useMemo(() => presetById(presetId) || PROVIDER_PRESETS[0], [presetId]);
  const platformDescription =
    COMMAND_PLATFORM_OPTIONS.find(option => option.platform === sshForm.platform)?.description ||
    '通用 Shell 命令';

  useEffect(() => {
    if (!visible) {
      setSshForm(emptySshForm);
      setKeyFileLabel('');
      return;
    }
    setKeyFileLabel('');
    setStep(initialStep || (runtime.status.installed ? 'ai' : 'environment'));
    const existing = config.aiProviders.find(provider => provider.id === config.activeProviderId);
    if (initialStep === 'ai' && existing) {
      setPresetId(existing.presetId);
      setApiKey(existing.apiKey);
      setBaseURL(existing.baseURL);
      setModel(existing.model);
      setModels(existing.models);
    }
  }, [visible, initialStep, runtime.status.installed]);

  useEffect(() => {
    if (!pickingKey || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const reset = () => setPickingKey(false);
    window.addEventListener('focus', reset, { once: true });
    return () => window.removeEventListener('focus', reset);
  }, [pickingKey]);

  const stepIndex = STEPS.findIndex(item => item.key === step);
  const runtimeReady = runtime.status.installed;
  const aiReady = config.aiProviders.length > 0;
  const finishTitle = runtimeReady
    ? '环境已就绪'
    : nativeAvailable
      ? '配置已保存，Linux 尚未安装'
      : '预览配置已完成';
  const finishDescription = runtimeReady
    ? '内置 Alpine Linux 与常用工具已经可用，后续无需依赖桌面端中继。'
    : nativeAvailable
      ? '可在「运行环境与设置」中安装 Alpine Linux，安装后即可使用真实终端。'
      : 'Web/Expo Go 预览不会安装内置 Linux；请安装 APK 以启用真实终端。';

  const selectPreset = (next: ProviderPreset) => {
    setPresetId(next.id);
    setBaseURL(next.baseURL);
    setModel(next.models[0] || '');
    setModels(next.models);
    setAiMessage(null);
    const existing = config.aiProviders.find(provider => provider.id === next.id);
    setApiKey(existing?.apiKey || '');
    if (existing) {
      setBaseURL(existing.baseURL);
      setModel(existing.model);
      setModels(existing.models);
    }
  };

  const handleFetchModels = async () => {
    if (!preset.isFree && !apiKey.trim()) {
      setAiMessage('请先填写 API Key。');
      return;
    }
    if (preset.protocol === 'xinghuo') {
      setAiMessage(preset.keyFormat || '当前版本暂不支持该提供商。');
      return;
    }
    setFetchingModels(true);
    setAiMessage(null);
    try {
      const provider = providerFromPreset(preset, { apiKey, model, baseURL });
      const list = await listProviderModels(provider);
      setModels(list);
      if (list.length && !list.includes(model)) setModel(list[0]);
      setAiMessage(list.length ? `已获取 ${list.length} 个模型` : '服务端未返回模型，请手动填写。');
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setFetchingModels(false);
    }
  };

  const saveAi = async () => {
    if (!preset.isFree && !apiKey.trim()) {
      setAiMessage('请输入 API Key。');
      return;
    }
    if (!model.trim()) {
      setAiMessage('请填写模型名称。');
      return;
    }
    if (preset.protocol === 'xinghuo') {
      setAiMessage('当前版本暂不支持讯飞星火，请选择其他提供商。');
      return;
    }
    setAiBusy(true);
    setAiMessage(null);
    try {
      await configStore.addProvider(providerFromPreset(preset, { apiKey, model, baseURL }));
      setAiBusy(false);
      setStep('ssh');
    } catch (error) {
      setAiBusy(false);
      setAiMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handlePickPrivateKey = async () => {
    setPickingKey(true);
    setSshMessage(null);
    try {
      const picked = await pickPrivateKeyFile();
      if (!picked) return;
      setSshForm(previous => ({ ...previous, privateKey: picked.pem }));
      setKeyFileLabel(`${picked.name} · ${picked.kind}`);
    } catch (error) {
      setSshMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPickingKey(false);
    }
  };

  const addSshProfile = async () => {
    const host = sshForm.host.trim();
    const username = sshForm.username.trim();
    const port = parseInt(sshForm.port, 10) || 22;
    if (!host || !username) {
      setSshMessage('主机地址和用户名不能为空。');
      return;
    }
    let privateKey: string | undefined;
    try {
      privateKey = sshForm.privateKey.trim() ? parsePrivateKey(sshForm.privateKey).pem : undefined;
    } catch (error) {
      setSshMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    const profile: SSHProfile = {
      id: `ssh-${Date.now()}`,
      name: sshForm.name.trim() || `${username}@${host}`,
      host,
      port: port > 0 && port < 65536 ? port : 22,
      username,
      privateKey,
      platform: sshForm.platform,
      updatedAt: Date.now(),
    };
    try {
      await configStore.addSshProfile(profile);
      setSshForm(emptySshForm);
      setKeyFileLabel('');
      setSshMessage('SSH 配置已保存。');
    } catch (error) {
      setSshMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const finish = async () => {
    await configStore.completeSetup();
    onComplete();
  };

  const canGoNext =
    step === 'environment' ? runtimeReady || !nativeAvailable : step === 'ai' ? true : true;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Ionicons name="terminal" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.eyebrow}>AI SHELL SETUP</Text>
                <Text style={styles.headerTitle}>配置内置环境</Text>
              </View>
            </View>
            {onClose ? (
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.stepBar}>
            {STEPS.map((item, index) => (
              <View key={item.key} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    index <= stepIndex && styles.stepDotActive,
                    index === stepIndex && styles.stepDotCurrent,
                  ]}
                >
                  <Text
                    style={[styles.stepDotText, index <= stepIndex && styles.stepDotTextActive]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepLabel, index === stepIndex && styles.stepLabelActive]}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'environment' ? <EnvironmentStep runtime={runtime} /> : null}

            {step === 'ai' ? (
              <View>
                <Text style={styles.title}>连接 AI 提供商</Text>
                <Text style={styles.subtitle}>
                  Key 会使用 Android Keystore 加密保存在本机，不会写入 APK 或上传到服务器。
                </Text>

                <Text style={styles.sectionLabel}>选择厂商</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {PROVIDER_PRESETS.map(item => {
                    const active = item.id === preset.id;
                    const unsupported = item.protocol === 'xinghuo';
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.providerChip, active && styles.providerChipActive]}
                        onPress={() => selectPreset(item)}
                      >
                        <Text style={[styles.providerName, active && styles.providerNameActive]}>
                          {item.displayName}
                        </Text>
                        <Text style={styles.providerDesc} numberOfLines={1}>
                          {unsupported ? '暂不支持' : item.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.card}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>
                      {preset.isFree ? 'API Key（可选）' : 'API Key'}
                    </Text>
                    <View style={styles.keyRow}>
                      <TextInput
                        value={apiKey}
                        onChangeText={setApiKey}
                        placeholder={preset.keyPlaceholder}
                        placeholderTextColor={colors.textDim}
                        secureTextEntry={!showKey}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.keyInput}
                      />
                      <Pressable
                        style={styles.eyeButton}
                        onPress={() => setShowKey(value => !value)}
                      >
                        <Ionicons
                          name={showKey ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    </View>
                    {preset.keyFormat ? <Text style={styles.hint}>{preset.keyFormat}</Text> : null}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>模型</Text>
                    <TextInput
                      value={model}
                      onChangeText={setModel}
                      placeholder="例如 gpt-4o-mini"
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.modelRow}
                    >
                      {models.map(item => {
                        const active = item === model;
                        return (
                          <Pressable
                            key={item}
                            style={[styles.modelChip, active && styles.modelChipActive]}
                            onPress={() => setModel(item)}
                          >
                            <Text style={[styles.modelText, active && styles.modelTextActive]}>
                              {item}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>API 地址</Text>
                    <TextInput
                      value={baseURL}
                      onChangeText={setBaseURL}
                      placeholder={preset.baseURL}
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                    <Text style={styles.hint}>留空使用默认地址；Ollama 可填局域网 IP。</Text>
                  </View>

                  <Pressable
                    style={styles.secondaryAction}
                    onPress={handleFetchModels}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons name="refresh" size={16} color={colors.accent} />
                    )}
                    <Text style={styles.secondaryActionText}>获取模型列表</Text>
                  </Pressable>

                  {aiMessage ? <Text style={styles.message}>{aiMessage}</Text> : null}
                </View>

                <Text style={styles.skipHint}>也可以稍后配置；未配置提供商时 AI 页面会提示。</Text>
              </View>
            ) : null}

            {step === 'ssh' ? (
              <View>
                <Text style={styles.title}>SSH 配置</Text>
                <Text style={styles.subtitle}>
                  可保存私钥并直接在内置 Linux 中连接。密码认证会在终端里交互输入。
                </Text>

                {config.sshProfiles.length > 0 ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionLabel}>已保存的连接</Text>
                    {config.sshProfiles.map(profile => (
                      <View key={profile.id} style={styles.profileRow}>
                        <View style={styles.profileInfo}>
                          <Text style={styles.profileName}>{profile.name}</Text>
                          <Text style={styles.profileHost}>
                            {profile.username}@{profile.host}:{profile.port} ·{' '}
                            {COMMAND_PLATFORM_LABELS[sshProfilePlatform(profile)]}
                            {profile.privateKey ? ' · 密钥' : ' · 密码'}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`删除 ${profile.name}`}
                          style={styles.removeButton}
                          onPress={() =>
                            Alert.alert('删除 SSH 配置', `确定删除「${profile.name}」吗？`, [
                              { text: '取消', style: 'cancel' },
                              {
                                text: '删除',
                                style: 'destructive',
                                onPress: () => configStore.removeSshProfile(profile.id),
                              },
                            ])
                          }
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.red} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.card}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>名称</Text>
                    <TextInput
                      value={sshForm.name}
                      onChangeText={(value: string) =>
                        setSshForm(prev => ({ ...prev, name: value }))
                      }
                      placeholder="生产服务器"
                      placeholderTextColor={colors.textDim}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[styles.field, styles.flex]}>
                      <Text style={styles.fieldLabel}>主机</Text>
                      <TextInput
                        value={sshForm.host}
                        onChangeText={(value: string) =>
                          setSshForm(prev => ({ ...prev, host: value }))
                        }
                        placeholder="192.168.1.10"
                        placeholderTextColor={colors.textDim}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={styles.input}
                      />
                    </View>
                    <View style={styles.portField}>
                      <Text style={styles.fieldLabel}>端口</Text>
                      <TextInput
                        value={sshForm.port}
                        onChangeText={(value: string) =>
                          setSshForm(prev => ({ ...prev, port: value }))
                        }
                        keyboardType="number-pad"
                        style={styles.input}
                      />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>用户名</Text>
                    <TextInput
                      value={sshForm.username}
                      onChangeText={(value: string) =>
                        setSshForm(prev => ({ ...prev, username: value }))
                      }
                      placeholder="root"
                      placeholderTextColor={colors.textDim}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>远端系统</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      accessibilityRole="radiogroup"
                      accessibilityLabel="远端系统"
                      contentContainerStyle={styles.platformRow}
                    >
                      {COMMAND_PLATFORM_OPTIONS.map(option => {
                        const active = sshForm.platform === option.platform;
                        return (
                          <Pressable
                            key={option.platform}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: active }}
                            style={[styles.platformChip, active && styles.platformChipActive]}
                            onPress={() =>
                              setSshForm(previous => ({
                                ...previous,
                                platform: option.platform,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.platformChipText,
                                active && styles.platformChipTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Text style={styles.hint}>
                      {platformDescription} · 用于匹配该系统的主机历史与补全指令集。
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>私钥（可选）</Text>
                    <TextInput
                      value={sshForm.privateKey}
                      onChangeText={(value: string) => {
                        setSshForm(prev => ({ ...prev, privateKey: value }));
                        setKeyFileLabel('');
                      }}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      placeholderTextColor={colors.textDim}
                      multiline
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[styles.input, styles.keyTextarea]}
                    />
                    <View style={styles.keyActionRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="从文件选择 SSH 私钥"
                        style={[styles.secondaryAction, styles.flex]}
                        onPress={handlePickPrivateKey}
                        disabled={pickingKey}
                      >
                        {pickingKey ? (
                          <ActivityIndicator size="small" color={colors.accent} />
                        ) : (
                          <Ionicons
                            name="document-attach-outline"
                            size={16}
                            color={colors.accent}
                          />
                        )}
                        <Text style={styles.secondaryActionText}>
                          {pickingKey ? '读取私钥…' : '从文件选择私钥'}
                        </Text>
                      </Pressable>
                      {sshForm.privateKey ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="清除私钥"
                          style={styles.clearKeyButton}
                          onPress={() => {
                            setSshForm(prev => ({ ...prev, privateKey: '' }));
                            setKeyFileLabel('');
                          }}
                        >
                          <Ionicons name="close" size={18} color={colors.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>
                    {keyFileLabel ? (
                      <Text numberOfLines={2} style={styles.keyFileLabel}>
                        {keyFileLabel}
                      </Text>
                    ) : null}
                    <Text style={styles.hint}>
                      支持 OpenSSH、RSA、ECDSA、PKCS#8 与加密 PEM；PuTTY .ppk
                      请先转换。加密私钥会在连接时提示输入口令。
                    </Text>
                  </View>
                  <Pressable style={styles.secondaryAction} onPress={addSshProfile}>
                    <Ionicons name="add" size={17} color={colors.accent} />
                    <Text style={styles.secondaryActionText}>保存 SSH 配置</Text>
                  </Pressable>
                  {sshMessage ? <Text style={styles.message}>{sshMessage}</Text> : null}
                </View>
              </View>
            ) : null}

            {step === 'finish' ? (
              <View>
                <View style={styles.finishIcon}>
                  <Ionicons name="checkmark" size={34} color={colors.green} />
                </View>
                <Text style={[styles.title, styles.centerText]}>{finishTitle}</Text>
                <Text style={[styles.subtitle, styles.centerText]}>{finishDescription}</Text>
                <View style={styles.card}>
                  <SummaryRow
                    icon="cube-outline"
                    label="Linux 运行时"
                    value={
                      runtimeReady
                        ? `${runtime.status.distro || 'Alpine'} · ${runtime.status.abi}`
                        : '未安装'
                    }
                  />
                  <SummaryRow
                    icon="sparkles-outline"
                    label="AI 提供商"
                    value={
                      aiReady
                        ? (() => {
                            const provider = activeProvider(config);
                            return provider
                              ? `${provider.displayName} / ${provider.model}`
                              : '稍后配置';
                          })()
                        : '稍后配置'
                    }
                  />
                  <SummaryRow
                    icon="server-outline"
                    label="SSH 配置"
                    value={
                      config.sshProfiles.length ? `${config.sshProfiles.length} 个连接` : '未配置'
                    }
                  />
                  <SummaryRow
                    icon="shield-checkmark-outline"
                    label="密钥存储"
                    value={nativeAvailable ? 'Android Keystore · AES-256-GCM' : '预览存储 · 未加密'}
                  />
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {stepIndex > 0 ? (
              <Pressable
                style={styles.backButton}
                onPress={() => setStep(STEPS[stepIndex - 1].key)}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
                <Text style={styles.backText}>上一步</Text>
              </Pressable>
            ) : (
              <View style={styles.flex} />
            )}

            {step === 'environment' ? (
              <Pressable
                style={[styles.primaryButton, !canGoNext && styles.primaryButtonDisabled]}
                disabled={!canGoNext}
                onPress={() => setStep('ai')}
              >
                <Text style={styles.primaryText}>下一步</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </Pressable>
            ) : null}

            {step === 'ai' ? (
              <Pressable style={styles.primaryButton} onPress={saveAi} disabled={aiBusy}>
                {aiBusy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryText}>保存并继续</Text>
                    <Ionicons name="arrow-forward" size={17} color="#fff" />
                  </>
                )}
              </Pressable>
            ) : null}

            {step === 'ai' && !aiReady ? (
              <Pressable style={styles.skipButton} onPress={() => setStep('ssh')}>
                <Text style={styles.skipText}>稍后配置</Text>
              </Pressable>
            ) : null}

            {step === 'ssh' ? (
              <Pressable style={styles.primaryButton} onPress={() => setStep('finish')}>
                <Text style={styles.primaryText}>继续</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </Pressable>
            ) : null}

            {step === 'finish' ? (
              <Pressable style={styles.primaryButton} onPress={finish}>
                <Text style={styles.primaryText}>进入工作台</Text>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const EnvironmentStep: FC<{ runtime: ReturnType<typeof useRuntime> }> = ({ runtime }) => (
  <View>
    <Text style={styles.title}>内置 Linux 环境</Text>
    <Text style={styles.subtitle}>
      APK 已打包 Alpine Linux、proot 与常用命令行工具。首次启动只需在本机解压，不下载任何运行时。
    </Text>

    <View style={styles.card}>
      <View style={styles.envHeader}>
        <View style={styles.envIcon}>
          <Ionicons name="layers-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.envTitle}>{runtime.status.distro || 'Alpine Linux 3.20.3'}</Text>
          <Text style={styles.envMeta}>
            离线根文件系统 · {runtime.status.abi || 'arm64-v8a'} · 约 100 MB
          </Text>
        </View>
        <View style={[styles.statusPill, runtime.status.installed && styles.statusPillReady]}>
          <Text style={[styles.statusText, runtime.status.installed && styles.statusTextReady]}>
            {runtime.status.installed ? '已就绪' : runtime.installing ? '安装中' : '待安装'}
          </Text>
        </View>
      </View>

      <View style={styles.bulletList}>
        <Bullet icon="terminal-outline" text="bash / coreutils / grep / sed / gawk" />
        <Bullet icon="git-branch-outline" text="git / curl / wget / nano / less / htop" />
        <Bullet icon="key-outline" text="OpenSSH 客户端，可直接连接服务器" />
        <Bullet icon="cube-outline" text="apk 包管理器，可在线扩展环境" />
      </View>

      {runtime.installing ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressPhase}>{runtime.phase}</Text>
            <Text style={styles.progressPercent}>{runtime.progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${runtime.progress}%` }]} />
          </View>
        </View>
      ) : runtime.status.installed ? (
        <View style={styles.successRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          <Text style={styles.successText}>Alpine Linux 已安装，可直接离线使用。</Text>
        </View>
      ) : (
        <Pressable
          style={[styles.installButton, !runtime.supported && styles.primaryButtonDisabled]}
          onPress={() => runtimeStore.install()}
          disabled={!runtime.supported || runtime.installing}
        >
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.installText}>
            {nativeAvailable ? '安装内置 Linux' : '需要安装 APK'}
          </Text>
        </Pressable>
      )}

      {runtime.error ? <Text style={styles.errorText}>{runtime.error}</Text> : null}
      {!nativeAvailable ? (
        <Text style={styles.hint}>
          当前为 Web/Expo Go 预览环境，原生 Linux 模块只有在安装 APK 后可用。
        </Text>
      ) : null}
    </View>
  </View>
);

const Bullet: FC<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = ({ icon, text }) => (
  <View style={styles.bullet}>
    <Ionicons name={icon} size={15} color={colors.textMuted} />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const SummaryRow: FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIcon}>
      <Ionicons name={icon} size={18} color={colors.accent} />
    </View>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 5 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.accentSoft },
  stepDotCurrent: { backgroundColor: colors.accent },
  stepDotText: { color: colors.textDim, fontSize: 11, fontWeight: '600' },
  stepDotTextActive: { color: colors.text },
  stepLabel: { color: colors.textDim, fontSize: 10, fontWeight: '500' },
  stepLabelActive: { color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.md, paddingRight: spacing.md },
  providerChip: {
    width: 132,
    minHeight: 64,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    gap: 3,
  },
  providerChipActive: { backgroundColor: colors.selection },
  providerName: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  providerNameActive: { color: colors.text },
  providerDesc: { color: colors.textDim, fontSize: 10 },
  card: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 14,
  },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keyInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 14,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: colors.textDim, fontSize: 11, lineHeight: 16 },
  modelRow: { gap: 6, paddingTop: 8, paddingRight: spacing.md },
  modelChip: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
  },
  modelChipActive: { backgroundColor: colors.accentSoft },
  modelText: { color: colors.textMuted, fontSize: 11, fontFamily: 'Courier' },
  modelTextActive: { color: colors.accent },
  secondaryAction: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.panelRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  secondaryActionText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  message: { color: colors.yellow, fontSize: 12, lineHeight: 18 },
  skipHint: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  portField: { width: 92, gap: 6 },
  keyTextarea: { minHeight: 110, textAlignVertical: 'top', fontFamily: 'Courier', fontSize: 11 },
  keyActionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 8 },
  clearKeyButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFileLabel: { color: colors.green, fontSize: 11, lineHeight: 16 },
  platformRow: { gap: 6, paddingRight: spacing.md },
  platformChip: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
  },
  platformChipActive: { backgroundColor: colors.accentSoft },
  platformChipText: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600' },
  platformChipTextActive: { color: colors.accent },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  profileHost: { color: colors.textDim, fontSize: 11, marginTop: 2, fontFamily: 'Courier' },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  envIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  envMeta: { color: colors.textDim, fontSize: 11, marginTop: 3 },
  statusPill: {
    minHeight: 24,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    justifyContent: 'center',
  },
  statusPillReady: { backgroundColor: 'rgba(48, 209, 88, 0.14)' },
  statusText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  statusTextReady: { color: colors.green },
  bulletList: { gap: 9 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bulletText: { color: colors.textMuted, fontSize: 12.5 },
  installButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  installText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  progressBlock: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPhase: { color: colors.textMuted, fontSize: 12 },
  progressPercent: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.panelRaised,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successText: { color: colors.green, fontSize: 12.5 },
  errorText: { color: colors.red, fontSize: 12, lineHeight: 18 },
  finishIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  centerText: { textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
  summaryValue: { color: colors.text, fontSize: 12, maxWidth: '52%', textAlign: 'right' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.bg,
  },
  primaryButton: {
    minHeight: 48,
    minWidth: 132,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  backButton: {
    height: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: { color: colors.textMuted, fontSize: 13 },
  skipButton: { height: 48, paddingHorizontal: spacing.md, justifyContent: 'center' },
  skipText: { color: colors.textMuted, fontSize: 12 },
});
