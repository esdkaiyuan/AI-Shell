import { describe, it, expect } from 'vitest';
import { AgentRunner, DEFAULT_MAX_STEPS } from './loop';
import { BUILTIN_TOOLS, getTool, validateToolCall } from './tools';
import { AgentEvent, ToolCall, ToolResult } from './types';
import { AIMessage } from '../types';

describe('tool registry & validation', () => {
  it('exposes the builtin tools with unique names', () => {
    const names = BUILTIN_TOOLS.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('run_command');
    expect(names).toContain('write_file');
  });

  it('marks mutating tools as write risk', () => {
    expect(getTool('run_command')?.risk).toBe('write');
    expect(getTool('write_file')?.risk).toBe('write');
    expect(getTool('read_file')?.risk).toBe('read');
  });

  it('accepts a valid call', () => {
    expect(validateToolCall({ tool: 'read_file', args: { path: '/tmp/a' } })).toBeNull();
  });

  it('rejects unknown tools, missing and mistyped params', () => {
    expect(validateToolCall({ tool: 'nope', args: {} })).toContain('未知工具');
    expect(validateToolCall({ tool: 'read_file', args: {} })).toContain('path');
    expect(validateToolCall({ tool: 'read_file', args: { path: 1 } })).toContain('必须是字符串');
    expect(validateToolCall({ tool: 'run_command', args: { command: '   ' } })).toContain('command');
  });

  it('rejects a malformed call object', () => {
    expect(validateToolCall({ tool: '', args: {} })).toContain('缺少 tool');
  });
});

function toolBlock(tool: string, args: Record<string, unknown> = {}): string {
  return `\`\`\`tool\n${JSON.stringify({ tool, args })}\n\`\`\``;
}

describe('AgentRunner', () => {
  it('finishes immediately when the model returns plain text', async () => {
    const seen: AgentEvent[] = [];
    const runner = new AgentRunner({
      chat: async () => '已经完成，无需执行命令。',
      executeTool: async () => ({ ok: true, output: '' }),
      onEvent: e => seen.push(e),
    });
    const result = await runner.run('你好');
    expect(result.status).toBe('completed');
    expect(result.content).toContain('已经完成');
    expect(result.steps).toBe(1);
    expect(result.calls).toHaveLength(0);
    expect(seen.some(e => e.type === 'final')).toBe(true);
    expect(seen.some(e => e.type === 'tool-call')).toBe(false);
  });

  it('runs a multi-step loop and feeds tool results back to the model', async () => {
    const conversations: AIMessage[][] = [];
    let round = 0;
    const runner = new AgentRunner({
      chat: async messages => {
        conversations.push([...messages]);
        round++;
        return round === 1
          ? `先查目录。${toolBlock('list_directory', { path: '/workspace' })}`
          : round === 2
            ? `再读文件。${toolBlock('read_file', { path: '/workspace/a.ts' })}`
            : '文件里是旧配置，已确认问题。';
      },
      executeTool: async call => ({ ok: true, output: `${call.tool} output` }),
    });
    const result = await runner.run('排查配置问题');
    expect(result.status).toBe('completed');
    expect(result.steps).toBe(3);
    expect(result.calls.map(c => c.tool)).toEqual(['list_directory', 'read_file']);
    // 第二轮请求里应包含第一轮工具结果
    expect(conversations[1].some(m => m.content.includes('[工具结果]'))).toBe(true);
    expect(conversations[1].some(m => m.content.includes('list_directory output'))).toBe(true);
  });

  it('emits an ordered event stream', async () => {
    const types: AgentEvent['type'][] = [];
    const runner = new AgentRunner({
      chat: async () => `思考中。${toolBlock('get_terminal_context')}`,
      executeTool: async () => ({ ok: true, output: 'CTX' }),
      maxSteps: 1,
      onEvent: e => types.push(e.type),
    });
    await runner.run('看看终端');
    expect(types).toEqual(['step-start', 'thinking', 'tool-call', 'tool-result', 'limit']);
  });

  it('lets the model self-correct malformed tool blocks', async () => {
    let round = 0;
    const runner = new AgentRunner({
      chat: async messages => {
        round++;
        if (round === 1) return '```tool\n{broken json}\n```';
        expect(messages.some(m => m.content.includes('格式有误'))).toBe(true);
        return '已修正，任务完成。';
      },
      executeTool: async () => ({ ok: true, output: '' }),
    });
    const result = await runner.run('修正测试');
    expect(result.status).toBe('completed');
    expect(round).toBe(2);
    expect(result.calls).toHaveLength(0);
  });

  it('reports validation errors back instead of executing invalid calls', async () => {
    let executed = 0;
    let round = 0;
    const runner = new AgentRunner({
      chat: async messages => {
        round++;
        if (round === 1) return toolBlock('not_a_tool');
        expect(messages.some(m => m.content.includes('参数校验失败'))).toBe(true);
        return '抱歉，工具名写错了，任务结束。';
      },
      executeTool: async () => {
        executed++;
        return { ok: true, output: '' };
      },
    });
    const result = await runner.run('校验测试');
    expect(executed).toBe(0);
    expect(result.status).toBe('completed');
  });

  it('stops a repeated identical call as a loop', async () => {
    const runner = new AgentRunner({
      chat: async () => toolBlock('run_command', { command: 'echo same' }),
      executeTool: async () => ({ ok: true, output: 'same' }),
      repeatLimit: 2,
      maxSteps: 10,
    });
    const result = await runner.run('死循环测试');
    expect(result.status).toBe('limit');
    expect(result.error).toContain('死循环');
    expect(result.calls).toHaveLength(3);
  });

  it('respects maxSteps', async () => {
    const runner = new AgentRunner({
      chat: async () => toolBlock('search_history', { query: 'x' }),
      executeTool: async () => ({ ok: true, output: 'ok' }),
      maxSteps: 2,
      repeatLimit: 99,
    });
    const result = await runner.run('步数测试');
    expect(result.status).toBe('limit');
    expect(result.steps).toBe(2);
    expect(result.error).toContain('最大执行步数');
  });

  it('defaults maxSteps to a positive value', () => {
    expect(DEFAULT_MAX_STEPS).toBeGreaterThan(0);
  });

  it('returns aborted when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    let chatted = false;
    const runner = new AgentRunner({
      chat: async () => {
        chatted = true;
        return 'done';
      },
      executeTool: async () => ({ ok: true, output: '' }),
    });
    const result = await runner.run('任务', { signal: controller.signal });
    expect(result.status).toBe('aborted');
    expect(chatted).toBe(false);
  });

  it('returns aborted when the signal fires mid-run', async () => {
    const controller = new AbortController();
    let round = 0;
    const runner = new AgentRunner({
      chat: async () => {
        round++;
        return toolBlock('get_terminal_context');
      },
      executeTool: async () => {
        controller.abort();
        return { ok: true, output: 'x' };
      },
    });
    const result = await runner.run('中断测试', { signal: controller.signal });
    expect(round).toBe(1);
    expect(result.status).toBe('aborted');
  });

  it('surfaces chat errors', async () => {
    const runner = new AgentRunner({
      chat: async () => {
        throw new Error('API 429');
      },
      executeTool: async () => ({ ok: true, output: '' }),
    });
    const result = await runner.run('错误测试');
    expect(result.status).toBe('error');
    expect(result.error).toBe('API 429');
  });

  it('turns a thrown tool error into a failed result and continues', async () => {
    let round = 0;
    const runner = new AgentRunner({
      chat: async messages => {
        round++;
        if (round === 1) return toolBlock('run_command', { command: 'false' });
        expect(messages.some(m => m.content.includes('工具执行异常'))).toBe(true);
        return '命令执行失败了，已记录。';
      },
      executeTool: async (): Promise<ToolResult> => {
        throw new Error('spawn failed');
      },
    });
    const result = await runner.run('异常测试');
    expect(result.status).toBe('completed');
    expect(result.calls).toHaveLength(1);
  });

  it('executes multiple calls from one response in order', async () => {
    const executed: ToolCall[] = [];
    let round = 0;
    const runner = new AgentRunner({
      chat: async () => {
        round++;
        if (round === 1) {
          return `\`\`\`tool\n${JSON.stringify([
            { tool: 'read_file', args: { path: 'a' } },
            { tool: 'read_file', args: { path: 'b' } },
          ])}\n\`\`\``;
        }
        return '都读完了。';
      },
      executeTool: async call => {
        executed.push(call);
        return { ok: true, output: call.args.path as string };
      },
    });
    const result = await runner.run('批量读取');
    expect(executed.map(c => c.args.path)).toEqual(['a', 'b']);
    expect(result.calls).toHaveLength(2);
    expect(result.steps).toBe(2);
  });
});
