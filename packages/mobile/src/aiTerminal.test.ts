import { describe, expect, it } from 'vitest';
import {
  AI_CAPABILITIES,
  DEFAULT_AI_CAPABILITIES,
  describeAIAction,
  extractCommands,
  hasCapability,
  planAIActions,
  toggleCapability,
} from './aiTerminal';

describe('AI terminal capabilities', () => {
  it('never grants PTY execution by default', () => {
    expect(DEFAULT_AI_CAPABILITIES).toEqual(['context', 'fill']);
    expect(hasCapability(DEFAULT_AI_CAPABILITIES, 'run')).toBe(false);
    expect(AI_CAPABILITIES.find(option => option.id === 'run')?.sensitive).toBe(true);
  });

  it('toggles a capability without mutating the source list', () => {
    const next = toggleCapability(DEFAULT_AI_CAPABILITIES, 'run');
    expect(next).toEqual(['context', 'fill', 'run']);
    expect(DEFAULT_AI_CAPABILITIES).toEqual(['context', 'fill']);
    expect(toggleCapability(next, 'fill')).toEqual(['context', 'run']);
  });
});

describe('command extraction safety', () => {
  it('ignores prose entirely', () => {
    expect(extractCommands('建议先检查磁盘空间，再决定是否需要清理。')).toEqual([]);
    expect(extractCommands('这里是一段说明文字\n还有第二行说明')).toEqual([]);
  });

  it('reads shell fenced blocks and strips prompts', () => {
    const answer = [
      '先看一下目录：',
      '```bash',
      '$ ls -la /root',
      'root@localhost:~# df -h',
      '```',
      '然后按结果处理。',
    ].join('\n');
    expect(extractCommands(answer)).toEqual(['ls -la /root', 'df -h']);
  });

  it('skips non-shell fenced blocks and comments', () => {
    const answer = [
      '配置如下：',
      '```json',
      '{ "ls": "not a command" }',
      '```',
      '```sh',
      '# 这是注释',
      'pwd',
      'uname -a',
      '```',
    ].join('\n');
    expect(extractCommands(answer)).toEqual(['pwd', 'uname -a']);
  });

  it('supports standalone inline code and deduplicates', () => {
    const answer = '`ls -la`\n`ls -la`\n`echo ok`\n普通说明';
    expect(extractCommands(answer)).toEqual(['ls -la', 'echo ok']);
  });

  it('caps the number of commands sent to the PTY', () => {
    const answer = ['```sh', 'pwd', 'ls', 'echo a', 'echo b', 'echo c', '```'].join('\n');
    expect(extractCommands(answer)).toHaveLength(3);
  });
});

describe('AI action planning', () => {
  const answer = ['```bash', 'ls -la', 'df -h', '```'].join('\n');

  it('only reads terminal context when allowed', () => {
    expect(planAIActions(answer, ['context']).includeContext).toBe(true);
    expect(planAIActions(answer, ['fill']).includeContext).toBe(false);
  });

  it('fills the input box but never writes to the PTY by default', () => {
    const plan = planAIActions(answer, DEFAULT_AI_CAPABILITIES);
    expect(plan.fill).toBe('ls -la');
    expect(plan.run).toEqual([]);
    expect(describeAIAction(plan)).toContain('填入');
  });

  it('requires an explicit run switch and then skips filling', () => {
    const plan = planAIActions(answer, ['context', 'fill', 'run']);
    expect(plan.run).toEqual(['ls -la', 'df -h']);
    expect(plan.fill).toBeUndefined();
    expect(describeAIAction(plan)).toContain('执行');
  });

  it('produces no action for a prose-only answer', () => {
    const plan = planAIActions('建议检查磁盘空间。', ['context', 'fill', 'run']);
    expect(plan.commands).toEqual([]);
    expect(plan.run).toEqual([]);
    expect(plan.fill).toBeUndefined();
    expect(describeAIAction(plan)).toBe('');
  });
});
