import { describe, expect, it } from 'vitest';
import {
  COMMAND_PLATFORM_OPTIONS,
  commandCatalog,
  quickCommands,
  suggestCommands,
  type CommandPlatform,
} from './commandCatalog';

const commands = (prefix: string, platform: CommandPlatform, history: string[] = []) =>
  suggestCommands(prefix, history, platform).map(item => item.command);

describe('multi-platform command catalog', () => {
  it('offers Alpine package and service commands for the built-in Linux', () => {
    expect(commands('apk ', 'alpine')).toContain('apk add');
    expect(commands('rc-', 'alpine')).toContain('rc-service');
    expect(commands('Get-', 'alpine')).toEqual([]);
  });

  it('offers Linux systemd and network commands', () => {
    expect(commands('systemctl ', 'linux')).toContain('systemctl status');
    expect(commands('journal', 'linux')).toContain('journalctl -u');
    expect(commands('Get-Service', 'linux')).toEqual([]);
  });

  it('offers macOS native administration commands', () => {
    expect(commands('brew ', 'macos')).toContain('brew install');
    expect(commands('diskutil', 'macos')).toContain('diskutil list');
    expect(commands('apk ', 'macos')).toEqual([]);
  });

  it('offers PowerShell commands for Windows over SSH', () => {
    expect(commands('Get-Pr', 'windows-powershell')).toContain('Get-Process');
    expect(commands('Test-Net', 'windows-powershell')).toContain('Test-NetConnection');
    expect(commands('dir', 'windows-powershell')).not.toContain('dir');
  });

  it('offers CMD commands for the default Windows shell', () => {
    expect(commands('task', 'windows-cmd')).toContain('tasklist');
    expect(commands('ipconfig', 'windows-cmd')).toContain('ipconfig /all');
    expect(commands('Get-Process', 'windows-cmd')).toEqual([]);
  });

  it('prioritizes matching history and removes duplicates', () => {
    const result = suggestCommands('git ', ['git status --short', 'git status'], 'linux');

    expect(result[0]).toMatchObject({
      command: 'git status --short',
      source: 'history',
    });
    expect(result.filter(item => item.command.toLowerCase() === 'git status')).toHaveLength(1);
  });

  it('builds complete quick command chips from the active platform', () => {
    expect(quickCommands('alpine').map(item => item.command)).toContain('apk update');
    expect(quickCommands('linux').map(item => item.command)).toContain('systemctl status');
    expect(quickCommands('windows-cmd').map(item => item.command)).toContain('dir');
    expect(quickCommands('windows-cmd')).toHaveLength(8);
    expect(quickCommands('alpine').map(item => item.command)).not.toContain('apk add');
  });

  it('does not expose duplicate catalog commands', () => {
    for (const platform of ['alpine', 'linux', 'macos', 'windows-powershell', 'windows-cmd'] as const) {
      const list = commandCatalog(platform).map(item => item.command.toLowerCase());
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('returns no suggestions for an empty prefix', () => {
    expect(suggestCommands('', [], 'alpine')).toEqual([]);
    expect(suggestCommands('   ', [], 'alpine')).toEqual([]);
  });

  it('exposes platform labels for SSH configuration and the terminal header', () => {
    expect(COMMAND_PLATFORM_OPTIONS.map(option => option.platform)).toEqual([
      'linux',
      'macos',
      'windows-powershell',
      'windows-cmd',
    ]);
  });
});
