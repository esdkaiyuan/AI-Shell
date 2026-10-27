import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';

export interface LinuxStatus {
  installed: boolean;
  runtimeVersion: string;
  distro: string;
  abi: string;
  rootfsPath?: string;
  installedAt?: number;
  supportedAbis?: string;
}

export interface InstallProgress {
  phase: string;
  percent: number;
}

export interface LinuxSessionOptions {
  sessionId: string;
  mode?: 'shell' | 'ssh';
  cwd?: string;
  cols?: number;
  rows?: number;
  host?: string;
  port?: number;
  username?: string;
  privateKey?: string;
}

export interface LinuxSessionEvent {
  sessionId: string;
  type: 'output' | 'exit';
  data?: string;
  code?: number;
}

export interface LinuxDirEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  hidden: boolean;
}

export interface ReadFileResult {
  content: string;
  binary: boolean;
  truncated: boolean;
  size: number;
}

export interface DeviceStats {
  cpu: number;
  memory: number;
  disk: number;
  uptimeSeconds: number;
  processMemoryMB: number;
  network: number;
}

const LinuxRuntime = NativeModules.LinuxRuntime as
  | {
      getStatus: () => Promise<LinuxStatus>;
      install: () => Promise<LinuxStatus>;
      startSession: (options: LinuxSessionOptions) => Promise<{ sessionId: string }>;
      writeSession: (sessionId: string, data: string) => Promise<boolean>;
      resizeSession: (sessionId: string, cols: number, rows: number) => Promise<boolean>;
      stopSession: (sessionId: string) => Promise<boolean>;
      resetRuntime: () => Promise<LinuxStatus>;
      listDirectory: (path: string) => Promise<LinuxDirEntry[]>;
      readFile: (path: string) => Promise<ReadFileResult>;
      writeFile: (path: string, content: string) => Promise<boolean>;
    }
  | undefined;

const SecureConfig = NativeModules.SecureConfig as
  | {
      load: () => Promise<string>;
      save: (value: string) => Promise<boolean>;
      clear: () => Promise<boolean>;
      getStorageInfo: () => Promise<{ type: string; algorithm: string; available: boolean; hasConfig: boolean }>;
    }
  | undefined;

const DeviceUtility = NativeModules.DeviceUtility as
  | {
      copyToClipboard: (text: string) => Promise<boolean>;
      readClipboard: () => Promise<string>;
      getStats: () => Promise<DeviceStats>;
    }
  | undefined;

export const nativeAvailable = Boolean(LinuxRuntime && SecureConfig && DeviceUtility);

const WEB_CONFIG_KEY = 'shellai.mobile.config';

export const getLinuxStatus = async (): Promise<LinuxStatus> => {
  if (!LinuxRuntime) {
    return {
      installed: false,
      runtimeVersion: '',
      distro: '',
      abi: 'unsupported',
      supportedAbis: Platform.OS,
    };
  }
  return LinuxRuntime.getStatus();
};

export const installLinux = async (
  onProgress?: (progress: InstallProgress) => void
): Promise<LinuxStatus> => {
  if (!LinuxRuntime) {
    throw new Error('当前运行环境不支持内置 Linux，请安装带原生运行时的 APK。');
  }
  const subscription = DeviceEventEmitter.addListener(
    'aishell:install',
    (progress: InstallProgress) => onProgress?.(progress)
  );
  try {
    return await LinuxRuntime.install();
  } finally {
    subscription.remove();
  }
};

export const startLinuxSession = async (options: LinuxSessionOptions): Promise<{ sessionId: string }> => {
  if (!LinuxRuntime) throw new Error('内置 Linux 运行时不可用。');
  return LinuxRuntime.startSession(options);
};

export const writeLinuxSession = async (sessionId: string, data: string): Promise<boolean> => {
  if (!LinuxRuntime) return false;
  return LinuxRuntime.writeSession(sessionId, data);
};

export const resizeLinuxSession = async (
  sessionId: string,
  cols: number,
  rows: number
): Promise<boolean> => {
  if (!LinuxRuntime) return false;
  return LinuxRuntime.resizeSession(sessionId, cols, rows);
};

export const stopLinuxSession = async (sessionId: string): Promise<boolean> => {
  if (!LinuxRuntime) return false;
  return LinuxRuntime.stopSession(sessionId);
};

export const resetLinuxRuntime = async (): Promise<LinuxStatus> => {
  if (!LinuxRuntime) throw new Error('内置 Linux 运行时不可用。');
  return LinuxRuntime.resetRuntime();
};

export const onLinuxSessionEvent = (
  listener: (event: LinuxSessionEvent) => void
): (() => void) => {
  const subscription = DeviceEventEmitter.addListener('aishell:session', listener);
  return () => subscription.remove();
};

export const listLinuxDirectory = async (path: string): Promise<LinuxDirEntry[]> => {
  if (!LinuxRuntime) return [];
  return LinuxRuntime.listDirectory(path);
};

export const readLinuxFile = async (path: string): Promise<ReadFileResult> => {
  if (!LinuxRuntime) return { content: '', binary: false, truncated: false, size: 0 };
  return LinuxRuntime.readFile(path);
};

export const writeLinuxFile = async (path: string, content: string): Promise<boolean> => {
  if (!LinuxRuntime) throw new Error('内置 Linux 运行时不可用。');
  return LinuxRuntime.writeFile(path, content);
};

export const secureLoad = async (): Promise<string> => {
  if (SecureConfig) return SecureConfig.load();
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(WEB_CONFIG_KEY) ?? '';
  }
  return '';
};

export const secureSave = async (value: string): Promise<void> => {
  if (SecureConfig) {
    await SecureConfig.save(value);
    return;
  }
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(WEB_CONFIG_KEY, value);
  }
};

export const secureClear = async (): Promise<void> => {
  if (SecureConfig) {
    await SecureConfig.clear();
    return;
  }
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(WEB_CONFIG_KEY);
  }
};

export const getStorageInfo = async () => {
  if (SecureConfig) return SecureConfig.getStorageInfo();
  return {
    type: Platform.OS === 'web' ? 'localStorage（仅预览）' : '不可用',
    algorithm: '—',
    available: false,
    hasConfig: false,
  };
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (DeviceUtility) return DeviceUtility.copyToClipboard(text);
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
};

export const readClipboard = async (): Promise<string> => {
  if (DeviceUtility) return DeviceUtility.readClipboard();
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    return navigator.clipboard.readText();
  }
  return '';
};

export const getDeviceStats = async (): Promise<DeviceStats> => {
  if (DeviceUtility) return DeviceUtility.getStats();
  return {
    cpu: 0,
    memory: 0,
    disk: 0,
    uptimeSeconds: 0,
    processMemoryMB: 0,
    network: 0,
  };
};

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
