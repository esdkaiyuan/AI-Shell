// commandSuggest.test.ts
// Tab 补全纯逻辑的单元测试
import { describe, it, expect } from 'vitest';
import {
  suggestCommands,
  currentInputPrefix,
  InputLineTracker,
  parsePathToken,
  resolveDir,
  buildPathSuggestions,
  COMMON_COMMANDS,
} from './commandSuggest';

describe('suggestCommands', () => {
  it('returns empty for empty prefix', () => {
    expect(suggestCommands('', ['git status'], ['ls -la'])).toEqual([]);
    expect(suggestCommands('   ', ['git status'], ['ls -la'])).toEqual([]);
  });

  it('matches history commands by prefix (case-insensitive)', () => {
    const results = suggestCommands('git st', ['git status', 'git stash', 'ls'], []);
    expect(results.map(r => r.command)).toEqual(['git status', 'git stash']);
    expect(results[0].origin).toBe('history');
  });

  it('prioritizes snippets over history and common', () => {
    const results = suggestCommands('git', ['git status'], ['git my-snippet'], {
      includeCommon: true,
    });
    expect(results[0].command).toBe('git my-snippet');
    expect(results[0].origin).toBe('snippet');
  });

  it('deduplicates commands across sources', () => {
    const results = suggestCommands('ls', ['ls -la'], ['ls -la'], { includeCommon: true });
    const only = results.filter(r => r.command === 'ls -la');
    expect(only).toHaveLength(1);
  });

  it('respects limit option', () => {
    const history = ['echo 1', 'echo 2', 'echo 3', 'echo 4', 'echo 5'];
    const results = suggestCommands('echo', history, [], { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('excludes common commands when disabled', () => {
    const results = suggestCommands('doc', [], [], { includeCommon: false });
    expect(results).toEqual([]);
  });

  it('falls back to common command dictionary', () => {
    const results = suggestCommands('docker p', [], [], { includeCommon: true });
    expect(results.map(r => r.command)).toContain('docker ps');
  });

  it('skips empty or blank entries', () => {
    const results = suggestCommands('git', ['', '   ', 'git ok'], [], { includeCommon: false });
    expect(results.map(r => r.command)).toEqual(['git ok']);
  });
});

describe('currentInputPrefix', () => {
  it('returns last line only', () => {
    expect(currentInputPrefix('echo hi\ngit che')).toBe('git che');
    expect(currentInputPrefix('git che')).toBe('git che');
  });

  it('handles empty buffer', () => {
    expect(currentInputPrefix('')).toBe('');
  });
});

describe('InputLineTracker', () => {
  it('accumulates printable characters', () => {
    const tracker = new InputLineTracker();
    tracker.feed('git ');
    tracker.feed('st');
    expect(tracker.get()).toBe('git st');
  });

  it('clears on carriage return', () => {
    const tracker = new InputLineTracker();
    tracker.feed('ls');
    tracker.feed('\r');
    expect(tracker.get()).toBe('');
  });

  it('handles backspace', () => {
    const tracker = new InputLineTracker();
    tracker.feed('gitx');
    tracker.feed('\x7f');
    expect(tracker.get()).toBe('git');
  });

  it('clears on Ctrl+C and Ctrl+U', () => {
    const tracker = new InputLineTracker();
    tracker.feed('abc');
    tracker.feed('\x03');
    expect(tracker.get()).toBe('');

    tracker.feed('def');
    tracker.feed('\x15');
    expect(tracker.get()).toBe('');
  });

  it('supports clear() and multi-char paste', () => {
    const tracker = new InputLineTracker();
    tracker.feed('npm run build');
    expect(tracker.get()).toBe('npm run build');
    tracker.clear();
    expect(tracker.get()).toBe('');
  });

  it('does not keep escape character in buffer', () => {
    // 方向键产生 \x1b[A 等序列；ESC 本身不应进入缓冲
    const tracker = new InputLineTracker();
    tracker.feed('ab');
    tracker.feed('\x1b');
    expect(tracker.get()).not.toContain('\x1b');
    expect(tracker.get().startsWith('ab')).toBe(true);
  });
});

describe('COMMON_COMMANDS', () => {
  it('is a non-empty string array', () => {
    expect(Array.isArray(COMMON_COMMANDS)).toBe(true);
    expect(COMMON_COMMANDS.length).toBeGreaterThan(20);
    expect(COMMON_COMMANDS.every(c => typeof c === 'string')).toBe(true);
  });
});

describe('parsePathToken', () => {
  it('detects plain commands as non-path', () => {
    const r = parsePathToken('git status');
    expect(r.isPath).toBe(false);
  });

  it('parses relative path with prefix', () => {
    const r = parsePathToken('cat src/comp');
    expect(r.isPath).toBe(true);
    expect(r.dirPart).toBe('src/');
    expect(r.namePrefix).toBe('comp');
    expect(r.tokenStart).toBe(4);
  });

  it('parses absolute path', () => {
    const r = parsePathToken('ls /usr/lo');
    expect(r.isPath).toBe(true);
    expect(r.dirPart).toBe('/usr/');
    expect(r.namePrefix).toBe('lo');
  });

  it('parses home path', () => {
    const r = parsePathToken('cd ~/doc');
    expect(r.isPath).toBe(true);
    expect(r.dirPart).toBe('~/');
    expect(r.namePrefix).toBe('doc');
  });

  it('treats bare ~ as path', () => {
    const r = parsePathToken('cd ~');
    expect(r.isPath).toBe(true);
  });

  it('handles dot-relative path', () => {
    const r = parsePathToken('cat ./read');
    expect(r.isPath).toBe(true);
    expect(r.dirPart).toBe('./');
    expect(r.namePrefix).toBe('read');
  });

  it('handles trailing separator with empty prefix', () => {
    const r = parsePathToken('ls src/');
    expect(r.isPath).toBe(true);
    expect(r.dirPart).toBe('src/');
    expect(r.namePrefix).toBe('');
  });
});

describe('resolveDir', () => {
  const home = 'C:/Users/me';
  const workspace = 'D:/proj';

  it('resolves empty dirPart to workspace', () => {
    expect(resolveDir('', home, workspace)).toEqual({ absDir: workspace, root: 'workspace' });
    expect(resolveDir('./', home, workspace)).toEqual({ absDir: workspace, root: 'workspace' });
  });

  it('resolves home shorthand', () => {
    expect(resolveDir('~/', home, workspace)).toEqual({ absDir: home, root: 'home' });
    expect(resolveDir('~/docs', home, workspace)).toEqual({
      absDir: 'C:/Users/me/docs',
      root: 'home',
    });
  });

  it('resolves absolute path inside workspace', () => {
    expect(resolveDir('D:/proj/src/', home, workspace)).toEqual({
      absDir: 'D:/proj/src/',
      root: 'workspace',
    });
  });

  it('resolves absolute path inside home', () => {
    expect(resolveDir('C:/Users/me/bin/', home, workspace)?.root).toBe('home');
  });

  it('rejects absolute path outside both roots', () => {
    expect(resolveDir('/etc/', home, workspace)).toBeNull();
  });

  it('resolves relative path against workspace', () => {
    expect(resolveDir('src/', home, workspace)).toEqual({
      absDir: 'D:/proj/src',
      root: 'workspace',
    });
  });
});

describe('buildPathSuggestions', () => {
  const token = {
    isPath: true,
    tokenStart: 4,
    token: 'src/comp',
    dirPart: 'src/',
    namePrefix: 'comp',
  };

  it('filters by name prefix and marks replaceFrom', () => {
    const list = buildPathSuggestions(token, [
      { name: 'components', type: 'directory' },
      { name: 'complete.ts', type: 'file' },
      { name: 'other.ts', type: 'file' },
    ]);
    expect(list.map(s => s.command)).toEqual(['src/components/', 'src/complete.ts']);
    expect(list[0].origin).toBe('path');
    expect(list[0].replaceFrom).toBe(4);
  });

  it('appends slash for directories only', () => {
    const list = buildPathSuggestions(token, [
      { name: 'components', type: 'directory' },
      { name: 'complete.ts', type: 'file' },
    ]);
    expect(list[0].command.endsWith('/')).toBe(true);
    expect(list[1].command.endsWith('/')).toBe(false);
  });

  it('returns empty for non-path token', () => {
    expect(
      buildPathSuggestions({ ...token, isPath: false }, [{ name: 'comp', type: 'file' }])
    ).toEqual([]);
  });

  it('empty name prefix matches all up to limit', () => {
    const entries = Array.from({ length: 12 }, (_, i) => ({
      name: `f${i}`,
      type: 'file' as const,
    }));
    const list = buildPathSuggestions(
      { isPath: true, tokenStart: 0, token: 'src/', dirPart: 'src/', namePrefix: '' },
      entries
    );
    expect(list).toHaveLength(8);
  });
});
