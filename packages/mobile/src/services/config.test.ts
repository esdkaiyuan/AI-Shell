import { describe, expect, it, vi } from 'vitest';
import type { SSHProfile } from './config';
import * as configModule from './config';

vi.mock('react-native', () => ({
  DeviceEventEmitter: { addListener: vi.fn() },
  NativeModules: {},
  Platform: { OS: 'android' },
}));

const commandPlatformForTerminal = (
  configModule as unknown as {
    commandPlatformForTerminal: (
      type: 'local' | 'ssh',
      profileId: string | undefined,
      profiles: Pick<SSHProfile, 'id' | 'platform'>[]
    ) => string;
  }
).commandPlatformForTerminal;

describe('terminal command platform', () => {
  const profiles: Pick<SSHProfile, 'id' | 'platform'>[] = [
    { id: 'win', platform: 'windows-cmd' },
    { id: 'mac', platform: 'macos' },
  ];

  it('uses Alpine for local terminals', () => {
    expect(commandPlatformForTerminal('local', 'win', profiles)).toBe('alpine');
  });

  it('resolves the remote profile instead of a split pane type', () => {
    expect(commandPlatformForTerminal('ssh', 'win', profiles)).toBe('windows-cmd');
    expect(commandPlatformForTerminal('ssh', 'mac', profiles)).toBe('macos');
  });

  it('falls back to Linux when a saved profile is unavailable', () => {
    expect(commandPlatformForTerminal('ssh', 'deleted', profiles)).toBe('linux');
  });
});
