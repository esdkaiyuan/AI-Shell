import { describe, it, expect } from 'vitest';
import { extractSubmittedCommand, hasControlCharacter } from './commandHistory';

describe('hasControlCharacter', () => {
  it('accepts ordinary command text', () => {
    expect(hasControlCharacter('ls -la')).toBe(false);
    expect(hasControlCharacter('git commit -m "fix: 修复登录"')).toBe(false);
  });

  it('detects control characters', () => {
    expect(hasControlCharacter('ls\u0008')).toBe(true);
    expect(hasControlCharacter('ls\u001b[A')).toBe(true);
    expect(hasControlCharacter('ls\u0003')).toBe(true);
    expect(hasControlCharacter('ls\u007f')).toBe(true);
  });
});

describe('extractSubmittedCommand', () => {
  it('extracts a command submitted with a newline', () => {
    expect(extractSubmittedCommand('ls -la\n')).toBe('ls -la');
    expect(extractSubmittedCommand('ls -la\r')).toBe('ls -la');
  });

  it('trims surrounding whitespace', () => {
    expect(extractSubmittedCommand('  pnpm build  \n')).toBe('pnpm build');
  });

  it('ignores input that has not been submitted yet', () => {
    expect(extractSubmittedCommand('ls -la')).toBeNull();
    expect(extractSubmittedCommand('partial')).toBeNull();
  });

  it('ignores an empty submitted line', () => {
    expect(extractSubmittedCommand('\n')).toBeNull();
    expect(extractSubmittedCommand('   \r')).toBeNull();
  });

  it('ignores control characters such as backspace and arrow keys', () => {
    // Typing then correcting leaves an escape sequence in the stream.
    expect(extractSubmittedCommand('lss\u0008s\n')).toBeNull();
    expect(extractSubmittedCommand('\u001b[A\u001b[B\n')).toBeNull();
    // Ctrl+C should never land in the history.
    expect(extractSubmittedCommand('\u0003\n')).toBeNull();
  });

  it('keeps unicode and quotes intact', () => {
    expect(extractSubmittedCommand('echo "你好，世界"\n')).toBe('echo "你好，世界"');
  });
});
