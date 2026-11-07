import { describe, it, expect } from 'vitest';
import { eventToStep, AgentEventLike } from './useAgentSession';

const NOW = 1_700_000_000_000;

function step(event: AgentEventLike, seq = 0) {
  return eventToStep(event, seq, NOW);
}

describe('eventToStep', () => {
  it('labels each reasoning round', () => {
    const item = step({ type: 'step-start', step: 3 });
    expect(item.title).toContain('第 3 轮');
    expect(item.kind).toBe('step-start');
    expect(item.ts).toBe(NOW);
    expect(item.detail).toBe('');
  });

  it('keeps thinking text as detail', () => {
    const item = step({ type: 'thinking', step: 1, text: '先检查目录结构' });
    expect(item.title).toBe('思考');
    expect(item.detail).toBe('先检查目录结构');
  });

  it('summarizes a tool call with its arguments', () => {
    const item = step({
      type: 'tool-call',
      step: 1,
      call: { tool: 'run_command', args: { command: 'pnpm build' } },
    });
    expect(item.title).toContain('run_command');
    expect(item.tool).toBe('run_command');
    expect(item.detail).toContain('pnpm build');
  });

  it('marks successful and failed tool results', () => {
    const ok = step({
      type: 'tool-result',
      step: 2,
      call: { tool: 'read_file', args: { path: 'a.ts' } },
      result: { ok: true, output: 'content' },
    });
    const failed = step({
      type: 'tool-result',
      step: 2,
      call: { tool: 'run_command', args: { command: 'false' } },
      result: { ok: false, output: 'exit 1' },
    });
    expect(ok.title).toContain('执行成功');
    expect(ok.ok).toBe(true);
    expect(ok.detail).toBe('content');
    expect(failed.title).toContain('执行失败');
    expect(failed.ok).toBe(false);
  });

  it('handles final, error and limit events', () => {
    expect(step({ type: 'final', step: 4, content: '已完成' }).detail).toBe('已完成');
    expect(step({ type: 'error', step: 2, message: '格式错误' }).title).toBe('需要修正');
    expect(step({ type: 'limit', step: 9, reason: '死循环' }).detail).toBe('死循环');
  });

  it('produces unique keys for repeated events in the same step', () => {
    const event: AgentEventLike = { type: 'tool-call', step: 1 };
    expect(step(event, 0).key).not.toBe(step(event, 1).key);
  });

  it('never throws on a partially filled event', () => {
    const item = step({ type: 'tool-result', step: 1 });
    expect(item.detail).toBe('');
    expect(item.title).toContain('执行失败');
  });
});
