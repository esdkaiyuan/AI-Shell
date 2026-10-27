import { useEffect, useState } from 'react';
import {
  getLinuxStatus,
  installLinux,
  resetLinuxRuntime,
  nativeAvailable,
  type InstallProgress,
  type LinuxStatus,
} from '../native/nativeBridge';
import { configStore } from './config';

export interface RuntimeState {
  status: LinuxStatus;
  supported: boolean;
  installing: boolean;
  progress: number;
  phase: string;
  error?: string;
}

const EMPTY_STATUS: LinuxStatus = {
  installed: false,
  runtimeVersion: '',
  distro: '',
  abi: '',
};

type Listener = (state: RuntimeState) => void;

class RuntimeStore {
  private state: RuntimeState = {
    status: EMPTY_STATUS,
    supported: nativeAvailable,
    installing: false,
    progress: 0,
    phase: '',
  };
  private listeners = new Set<Listener>();
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        const status = await getLinuxStatus();
        this.setState({
          status,
          supported: nativeAvailable && status.abi !== 'unsupported',
        });
        if (status.installed) {
          // Wait for the encrypted config to load before writing environment info,
          // otherwise the default config could overwrite the stored providers.
          await configStore.init();
          await configStore.markEnvironment({
            installed: true,
            runtimeVersion: status.runtimeVersion,
            distro: status.distro,
            installedAt: status.installedAt,
          });
        }
      } catch (error) {
        this.setState({
          supported: nativeAvailable,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return this.initPromise;
  }

  get(): RuntimeState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async refresh(): Promise<void> {
    try {
      const status = await getLinuxStatus();
      this.setState({ status, supported: nativeAvailable && status.abi !== 'unsupported', error: undefined });
    } catch (error) {
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  async install(): Promise<void> {
    if (this.state.installing) return;
    this.setState({ installing: true, progress: 0, phase: '准备安装', error: undefined });
    try {
      const status = await installLinux((progress: InstallProgress) => {
        this.setState({ progress: progress.percent, phase: progress.phase });
      });
      this.setState({
        status,
        installing: false,
        progress: 100,
        phase: '完成',
        supported: true,
      });
      await configStore.markEnvironment({
        installed: true,
        runtimeVersion: status.runtimeVersion,
        distro: status.distro,
        installedAt: status.installedAt,
      });
    } catch (error) {
      this.setState({
        installing: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async reset(): Promise<void> {
    try {
      const status = await resetLinuxRuntime();
      this.setState({ status, progress: 0, phase: '', error: undefined });
      await configStore.markEnvironment({ installed: false });
    } catch (error) {
      this.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  private setState(patch: Partial<RuntimeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const runtimeStore = new RuntimeStore();

export const useRuntime = (): RuntimeState => {
  const [state, setState] = useState(runtimeStore.get());
  useEffect(() => runtimeStore.subscribe(setState), []);
  return state;
};
