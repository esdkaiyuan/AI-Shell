import { describe, it, expect } from 'vitest';
import {
  DANGEROUS_COMMAND_RULES,
  MAX_COMMAND_OUTPUT,
  detectDangerousCommand,
  truncateOutput,
} from './agentSafety';

describe('detectDangerousCommand', () => {
  it('blocks destructive system commands', () => {
    const blocked = [
      'rm -rf /',
      'sudo rm -rf / --no-preserve-root',
      'rm -rf ~/*',
      'format C:',
      'mkfs.ext4 /dev/sda1',
      'dd if=/dev/zero of=/dev/sda',
      'del /s /q C:\\Windows',
      ':(){ :|:& };:',
      'shutdown -h now',
      'chmod -R 777 /',
      'reg delete HKLM\\Software /f',
      'echo x > /dev/sda',
    ];
    for (const command of blocked) {
      expect(detectDangerousCommand(command), command).not.toBeNull();
    }
  });

  it('allows routine development commands', () => {
    const allowed = [
      'ls -la',
      'git status',
      'pnpm build',
      'rm -rf dist',
      'rm -f ./tmp.log',
      'npm test && echo done',
      'cat package.json | grep name',
      'echo shutdown > note.txt',
    ];
    for (const command of allowed) {
      expect(detectDangerousCommand(command), command).toBeNull();
    }
  });

  it('rejects empty and non-string input', () => {
    expect(detectDangerousCommand('   ')).toBe('命令不能为空');
    expect(detectDangerousCommand(undefined as unknown as string)).toBe('命令必须是字符串');
  });

  it('keeps every rule reason non-empty', () => {
    expect(DANGEROUS_COMMAND_RULES.length).toBeGreaterThan(5);
    expect(DANGEROUS_COMMAND_RULES.every(r => r.reason.length > 0)).toBe(true);
  });
});

describe('truncateOutput', () => {
  it('returns short text unchanged', () => {
    expect(truncateOutput('hello')).toBe('hello');
  });

  it('caps oversized output and marks truncation', () => {
    const result = truncateOutput('a'.repeat(MAX_COMMAND_OUTPUT + 100));
    expect(result.length).toBeLessThan(MAX_COMMAND_OUTPUT + 100);
    expect(result).toContain('输出已截断');
  });

  it('handles empty input', () => {
    expect(truncateOutput('')).toBe('');
  });
});
