import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorage } from './local';

let directory: string | null = null;

afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = null;
});

describe('SSH config persistence', () => {
  it('round-trips the remote platform used for command completion', async () => {
    directory = mkdtempSync(join(tmpdir(), 'ai-shell-storage-'));
    const storage = new LocalStorage(join(directory, 'shell.db'));
    await storage.init();

    storage.saveSSHConfig({
      name: 'windows-host',
      host: '10.0.0.8',
      port: 22,
      username: 'admin',
      platform: 'windows-cmd',
    });

    expect(storage.getSSHConfig('windows-host')?.platform).toBe('windows-cmd');
    expect(storage.getSSHConfigs()[0].platform).toBe('windows-cmd');
  });
});
