import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LocalStorage, AIServiceImpl, AIProvider, SSHConfig } from '@ai-shell/core';
import { ShellManager } from './shell/manager';
import { SSHManager } from './ssh/manager';

let mainWindow: BrowserWindow | null = null;
interface ShellManagerLike {
  storage: LocalStorage | null;
  setMainWindow(window: BrowserWindow): void;
  createSession(shell: string, cwd: string): string;
  write(sessionId: string, data: string): void;
  resize(sessionId: string, cols: number, rows: number): void;
  closeSession(sessionId: string): void;
}

interface SSHManagerLike {
  storage: LocalStorage | null;
  setMainWindow(window: BrowserWindow): void;
  connect(config: SSHConfig): Promise<string>;
  disconnect(sessionId: string): void;
  write(sessionId: string, data: string): void;
  resize(sessionId: string, cols: number, rows: number): void;
}

type StoredAIProvider = AIProvider;
type SanitizedAIProvider = Omit<AIProvider, 'apiKey'> & { apiKey: string };
type SanitizedSSHConfig = Omit<SSHConfig, 'password' | 'privateKey' | 'passphrase'> & {
  password?: undefined;
  privateKey?: undefined;
  passphrase?: undefined;
  hasPassword: boolean;
  hasPrivateKey: boolean;
  hasPassphrase: boolean;
};

let shellManager: ShellManagerLike | null = null;
let sshManager: SSHManagerLike | null = null;
let storage: LocalStorage;
let aiService: AIServiceImpl;
let ptyAvailable = false;

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  hidden: boolean;
}

const MAX_DIRECTORY_ENTRIES = 500;
const ENCRYPTED_PREFIX = 'enc:v1:';
const MIN_TERMINAL_SIZE = 1;
const MAX_TERMINAL_COLS = 500;
const MAX_TERMINAL_ROWS = 200;

function encryptSecret(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  if (!safeStorage.isEncryptionAvailable()) return value;
  return `${ENCRYPTED_PREFIX}${safeStorage.encryptString(value).toString('base64')}`;
}

function decryptSecret(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  if (!safeStorage.isEncryptionAvailable()) return undefined;

  try {
    return safeStorage.decryptString(Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64'));
  } catch (error) {
    console.error('Failed to decrypt saved secret:', error);
    return undefined;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function encryptAIProvider(provider: StoredAIProvider): StoredAIProvider {
  return {
    ...provider,
    apiKey: encryptSecret(provider.apiKey) || '',
  };
}

function decryptAIProvider(provider: StoredAIProvider): StoredAIProvider {
  return {
    ...provider,
    apiKey: decryptSecret(provider.apiKey) || '',
  };
}

function mergeExistingAISecret(provider: StoredAIProvider): StoredAIProvider {
  if (!provider?.name || provider.apiKey !== '********') return provider;
  const existing = storage.getAIProviders().find(p => p.name === provider.name);
  if (!existing) return provider;
  return {
    ...provider,
    apiKey: decryptSecret(existing.apiKey) || '',
  };
}

function encryptSSHConfig(config: SSHConfig): SSHConfig {
  return {
    ...config,
    password: encryptSecret(config.password),
    privateKey: encryptSecret(config.privateKey),
    passphrase: encryptSecret(config.passphrase),
  };
}

function mergeExistingSSHSecrets(config: SSHConfig): SSHConfig {
  const existing = config?.name ? decryptSSHConfig(storage.getSSHConfig(config.name)) : null;
  if (!existing) return config;

  return {
    ...config,
    password: config.password === undefined ? existing.password : config.password,
    privateKey: config.privateKey === undefined ? existing.privateKey : config.privateKey,
    passphrase: config.passphrase === undefined ? existing.passphrase : config.passphrase,
  };
}

function decryptSSHConfig(config?: SSHConfig | null): SSHConfig | null {
  if (!config) return null;
  return {
    ...config,
    password: decryptSecret(config.password),
    privateKey: decryptSecret(config.privateKey),
    passphrase: decryptSecret(config.passphrase),
  };
}

function sanitizeAIProvider(provider: StoredAIProvider): SanitizedAIProvider {
  const decrypted = decryptAIProvider(provider);
  return {
    ...decrypted,
    apiKey: decrypted.apiKey ? '********' : '',
  };
}

function sanitizeSSHConfig(config: SSHConfig): SanitizedSSHConfig {
  const decrypted = decryptSSHConfig(config);
  if (!decrypted) {
    throw new Error('SSH config is missing');
  }
  return {
    ...decrypted,
    password: undefined,
    privateKey: undefined,
    passphrase: undefined,
    hasPassword: Boolean(decrypted.password),
    hasPrivateKey: Boolean(decrypted.privateKey),
    hasPassphrase: Boolean(decrypted.passphrase),
  };
}

function expandHomePath(value: string): string {
  if (value === '~') return app.getPath('home');
  if (value.startsWith(`~${path.sep}`) || value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(app.getPath('home'), value.slice(2));
  }
  return value;
}

async function hydrateSSHPrivateKey(config: SSHConfig): Promise<SSHConfig> {
  if (!config.privateKey) return config;
  if (config.privateKey.includes('-----BEGIN')) return config;

  const keyPath = path.resolve(expandHomePath(config.privateKey));
  const privateKey = await fs.readFile(keyPath, 'utf8');
  return { ...config, privateKey };
}

function resolveExplorerRoot(root: 'workspace' | 'home'): string {
  return root === 'home' ? app.getPath('home') : process.cwd();
}

function isPathInsideRoot(targetPath: string, rootPath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeTerminalSize(cols: number, rows: number): { cols: number; rows: number } {
  const safeCols = Number.isFinite(cols) ? Math.trunc(cols) : 80;
  const safeRows = Number.isFinite(rows) ? Math.trunc(rows) : 30;
  return {
    cols: Math.min(Math.max(safeCols, MIN_TERMINAL_SIZE), MAX_TERMINAL_COLS),
    rows: Math.min(Math.max(safeRows, MIN_TERMINAL_SIZE), MAX_TERMINAL_ROWS),
  };
}

async function resolveShellCwd(cwd?: string): Promise<string> {
  const fallback = resolveExplorerRoot('workspace');
  if (!cwd) return fallback;
  const resolved = path.resolve(cwd);
  const stats = await fs.stat(resolved);
  if (!stats.isDirectory()) {
    throw new Error('Shell cwd must be a directory');
  }
  return resolved;
}

// Try to load native modules, gracefully degrade if unavailable
try {
  shellManager = new ShellManager(null);
  ptyAvailable = true;
} catch (error) {
  console.warn('node-pty not available, terminal feature disabled:', error);
}

try {
  sshManager = new SSHManager(null);
} catch (error) {
  console.warn('ssh2 not available, SSH feature disabled:', error);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#070a0e',
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false,
  });

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 设置管理器的窗口引用
  if (shellManager) {
    shellManager.setMainWindow(mainWindow);
  }
  if (sshManager) {
    sshManager.setMainWindow(mainWindow);
  }
}

async function initializeServices() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'ai-shell.db');

  try {
    storage = new LocalStorage(dbPath);
    await storage.init();

    // Load AI providers from storage
    const providers = storage.getAIProviders().map(decryptAIProvider);
    aiService = new AIServiceImpl(providers);

    // Set storage reference on managers (created at module load time)
    if (shellManager) {
      shellManager.storage = storage;
    }
    if (sshManager) {
      sshManager.storage = storage;
    }

    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    app.quit();
  }
}

app.whenReady().then(async () => {
  await initializeServices();
  createWindow();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    try {
      storage?.close();
    } catch (error) {
      console.error('Failed to close storage:', error);
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  try {
    storage?.close();
  } catch (error) {
    console.error('Failed to close storage on quit:', error);
  }
});

function setupIPC() {
  // Shell operations
  ipcMain.handle('shell:create', async (_, shell: string, cwd: string) => {
    if (!shellManager) throw new Error('Terminal feature unavailable: node-pty not installed');
    try {
      return shellManager.createSession(shell, await resolveShellCwd(cwd));
    } catch (error: unknown) {
      console.error('Failed to create shell session:', error);
      throw new Error(`Failed to create shell session: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('shell:write', async (_, sessionId: string, data: string) => {
    if (!shellManager) return;
    try {
      shellManager.write(sessionId, data);
    } catch (error: unknown) {
      console.error('Failed to write to shell:', error);
      throw new Error(`Failed to write to shell: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('shell:resize', async (_, sessionId: string, cols: number, rows: number) => {
    if (!shellManager) return;
    try {
      const size = normalizeTerminalSize(cols, rows);
      shellManager.resize(sessionId, size.cols, size.rows);
    } catch (error: unknown) {
      console.error('Failed to resize shell:', error);
    }
  });

  ipcMain.handle('shell:close', async (_, sessionId: string) => {
    if (!shellManager) return;
    try {
      shellManager.closeSession(sessionId);
    } catch (error: unknown) {
      console.error('Failed to close shell session:', error);
    }
  });

  // SSH operations
  ipcMain.handle('ssh:connect', async (_, config: SSHConfig) => {
    if (!sshManager) throw new Error('SSH feature unavailable: ssh2 not installed');
    try {
      const fullConfig =
        config?.name && !config.password && !config.privateKey
          ? decryptSSHConfig(storage.getSSHConfig(config.name) || config)
          : config;
      if (!fullConfig) {
        throw new Error(`SSH config "${config?.name || 'unknown'}" was not found`);
      }
      return await sshManager.connect(await hydrateSSHPrivateKey(fullConfig));
    } catch (error: unknown) {
      console.error('Failed to connect SSH:', error);
      throw new Error(`Failed to connect SSH: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('ssh:disconnect', async (_, sessionId: string) => {
    if (!sshManager) return;
    try {
      sshManager.disconnect(sessionId);
    } catch (error: unknown) {
      console.error('Failed to disconnect SSH:', error);
    }
  });

  ipcMain.handle('ssh:write', async (_, sessionId: string, data: string) => {
    if (!sshManager) return;
    try {
      sshManager.write(sessionId, data);
    } catch (error: unknown) {
      console.error('Failed to write to SSH:', error);
      throw new Error(`Failed to write to SSH: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('ssh:resize', async (_, sessionId: string, cols: number, rows: number) => {
    if (!sshManager) return;
    try {
      const size = normalizeTerminalSize(cols, rows);
      sshManager.resize(sessionId, size.cols, size.rows);
    } catch (error: unknown) {
      console.error('Failed to resize SSH:', error);
    }
  });

  ipcMain.handle('ssh:list-configs', async () => {
    try {
      return storage.getSSHConfigs().map(sanitizeSSHConfig);
    } catch (error: unknown) {
      console.error('Failed to list SSH configs:', error);
      return [];
    }
  });

  ipcMain.handle('ssh:save-config', async (_, config: SSHConfig) => {
    try {
      storage.saveSSHConfig(encryptSSHConfig(mergeExistingSSHSecrets(config)));
    } catch (error: unknown) {
      console.error('Failed to save SSH config:', error);
      throw new Error(`Failed to save SSH config: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('ssh:delete-config', async (_, name: string) => {
    try {
      storage.deleteSSHConfig(name);
    } catch (error: unknown) {
      console.error('Failed to delete SSH config:', error);
      throw new Error(`Failed to delete SSH config: ${getErrorMessage(error)}`);
    }
  });

  // AI operations
  ipcMain.handle('ai:chat', async (_, messages, provider?: string, model?: string) => {
    try {
      return await aiService.chat(messages, provider, model);
    } catch (error: unknown) {
      console.error('AI chat error:', error);
      throw new Error(`AI chat error: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('ai:list-providers', async () => {
    try {
      return aiService.listProviders().map(sanitizeAIProvider);
    } catch (error: unknown) {
      console.error('Failed to list AI providers:', error);
      return [];
    }
  });

  ipcMain.handle('ai:add-provider', async (_, provider: StoredAIProvider) => {
    try {
      const mergedProvider = mergeExistingAISecret(provider);
      const decryptedProvider = decryptAIProvider(mergedProvider);
      aiService.addProvider(decryptedProvider);
      storage.saveAIProvider(encryptAIProvider(mergedProvider));
    } catch (error: unknown) {
      console.error('Failed to add AI provider:', error);
      throw new Error(`Failed to add AI provider: ${getErrorMessage(error)}`);
    }
  });

  ipcMain.handle('ai:remove-provider', async (_, name: string) => {
    try {
      aiService.removeProvider(name);
      storage.deleteAIProvider(name);
    } catch (error: unknown) {
      console.error('Failed to remove AI provider:', error);
      throw new Error(`Failed to remove AI provider: ${getErrorMessage(error)}`);
    }
  });

  // 获取某个已配置提供商的可用模型列表（通过 API 访问链接动态拉取）
  ipcMain.handle('ai:list-models', async (_, provider?: string) => {
    try {
      return await aiService.listModels(provider);
    } catch (error: unknown) {
      console.error('Failed to list AI models:', error);
      throw new Error(`Failed to list AI models: ${getErrorMessage(error)}`);
    }
  });

  // 用尚未保存的临时配置拉取模型列表（添加表单中点击「获取模型列表」时使用）
  ipcMain.handle('ai:list-models-for-config', async (_, config: StoredAIProvider) => {
    try {
      return await aiService.listModelsForConfig(decryptAIProvider(config));
    } catch (error: unknown) {
      console.error('Failed to list AI models for config:', error);
      throw new Error(`Failed to list AI models for config: ${getErrorMessage(error)}`);
    }
  });

  // History operations
  ipcMain.handle('history:get', async (_, limit?: number) => {
    try {
      return storage.getCommandHistory(limit);
    } catch (error: unknown) {
      console.error('Failed to get command history:', error);
      return [];
    }
  });

  ipcMain.handle('history:search', async (_, query: string, limit?: number) => {
    try {
      return storage.searchCommandHistory(query, limit);
    } catch (error: unknown) {
      console.error('Failed to search command history:', error);
      return [];
    }
  });

  ipcMain.handle('history:clear', async () => {
    try {
      storage.clearCommandHistory();
    } catch (error: unknown) {
      console.error('Failed to clear command history:', error);
      throw new Error(`Failed to clear command history: ${getErrorMessage(error)}`);
    }
  });

  // File explorer operations (read-only)
  ipcMain.handle('files:get-home', async () => {
    return resolveExplorerRoot('home');
  });

  ipcMain.handle('files:get-workspace', async () => {
    return resolveExplorerRoot('workspace');
  });

  ipcMain.handle('files:list-directory', async (_, dirPath: string, root: 'workspace' | 'home' = 'workspace'): Promise<FileEntry[]> => {
    try {
      const rootPath = resolveExplorerRoot(root);
      if (!isPathInsideRoot(dirPath, rootPath)) {
        throw new Error('Directory is outside the allowed explorer root');
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const limitedEntries = entries.slice(0, MAX_DIRECTORY_ENTRIES);
      const result = await Promise.all(
        limitedEntries.map(async entry => {
          const fullPath = path.join(dirPath, entry.name);
          try {
            const stats = await fs.lstat(fullPath);
            return {
              name: entry.name,
              path: fullPath,
              type: entry.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modifiedAt: stats.mtimeMs,
              hidden: entry.name.startsWith('.'),
            } satisfies FileEntry;
          } catch {
            return null;
          }
        })
      );

      return result.filter((entry): entry is FileEntry => entry !== null).sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
    } catch (error: unknown) {
      console.error('Failed to list directory:', error);
      throw new Error(`Failed to list directory: ${getErrorMessage(error)}`);
    }
  });
}
