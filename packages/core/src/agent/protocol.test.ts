import { describe, it, expect } from 'vitest';
import {
  buildAgentSystemPrompt,
  buildAgentUserMessage,
  buildInitialMessages,
  formatToolResult,
  parseAgentResponse,
} from './protocol';
import { BUILTIN_TOOLS } from './tools';

describe('parseAgentResponse', () => {
  it('parses a single tool call and keeps surrounding text', () => {
    const raw = '先看看目录结构。\n```tool\n{"tool":"list_directory","args":{"path":"/tmp"}}\n```\n';
    const result = parseAgentResponse(raw);
    expect(result.text).toBe('先看看目录结构。');
    expect(result.calls).toEqual([{ tool: 'list_directory', args: { path: '/tmp' } }]);
    expect(result.parseErrors).toHaveLength(0);
  });

  it('returns plain text as final answer when there is no tool block', () => {
    const result = parseAgentResponse('任务已完成，共修改 2 个文件。');
    expect(result.calls).toHaveLength(0);
    expect(result.text).toBe('任务已完成，共修改 2 个文件。');
  });

  it('supports multiple fenced blocks and JSON arrays', () => {
    const raw = [
      '```tool',
      '[{"tool":"read_file","args":{"path":"a.ts"}},{"tool":"search_history","args":{"query":"build"}}]',
      '```',
      '中间说明',
      '```tool',
      '{"tool":"get_terminal_context","args":{}}',
      '```',
    ].join('\n');
    const result = parseAgentResponse(raw);
    expect(result.calls).toHaveLength(3);
    expect(result.calls[0].tool).toBe('read_file');
    expect(result.calls[2].args).toEqual({});
    expect(result.text).toBe('中间说明');
  });

  it('tolerates missing args and extra whitespace', () => {
    const result = parseAgentResponse('```tool\n  { "tool" : "get_terminal_context" }  \n```');
    expect(result.calls).toEqual([{ tool: 'get_terminal_context', args: {} }]);
  });

  it('reports invalid JSON without losing other valid calls', () => {
    const raw = '```tool\n{not json}\n```\n```tool\n{"tool":"read_file","args":{"path":"x"}}\n```';
    const result = parseAgentResponse(raw);
    expect(result.parseErrors).toHaveLength(1);
    expect(result.parseErrors[0]).toContain('不是合法 JSON');
    expect(result.calls).toHaveLength(1);
  });

  it('reports structurally invalid calls', () => {
    const result = parseAgentResponse('```tool\n{"args":{"path":"x"}}\n```');
    expect(result.parseErrors).toContain('工具调用缺少 tool 字段');
    expect(result.calls).toHaveLength(0);
  });

  it('rejects non-object args', () => {
    const result = parseAgentResponse('```tool\n{"tool":"run_command","args":"ls"}\n```');
    expect(result.parseErrors[0]).toContain('args 必须是对象');
  });

  it('does not treat ordinary json/bash fences as tool calls', () => {
    const raw = '```bash\nls -la\n```\n```json\n{"tool":"fake"}\n```';
    const result = parseAgentResponse(raw);
    expect(result.calls).toHaveLength(0);
    expect(result.text).toContain('```bash');
  });

  it('handles empty content', () => {
    expect(parseAgentResponse('')).toEqual({ text: '', calls: [], parseErrors: [] });
  });
});

describe('buildAgentSystemPrompt', () => {
  it('documents every builtin tool and the fence protocol', () => {
    const prompt = buildAgentSystemPrompt(BUILTIN_TOOLS);
    for (const tool of BUILTIN_TOOLS) expect(prompt).toContain(tool.name);
    expect(prompt).toContain('```tool');
    expect(prompt).toContain('无限循环');
  });
});

describe('buildAgentUserMessage / buildInitialMessages', () => {
  it('injects terminal context with a length cap', () => {
    const long = 'x'.repeat(9000);
    const message = buildAgentUserMessage('修复报错', long);
    expect(message).toContain('任务：修复报错');
    expect(message.length).toBeLessThan(5000);
  });

  it('omits the context block when context is blank', () => {
    expect(buildAgentUserMessage('帮我列目录', '  ')).toBe('帮我列目录');
  });

  it('builds system → history → task in order', () => {
    const messages = buildInitialMessages('SYSTEM', 'TASK', {
      history: [{ role: 'user', content: 'PREV_Q' }, { role: 'assistant', content: 'PREV_A' }],
      terminalContext: 'CTX',
    });
    expect(messages.map(m => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(messages[0].content).toBe('SYSTEM');
    expect(messages[3].content).toContain('CTX');
    expect(messages[3].content).toContain('TASK');
  });
});

describe('formatToolResult', () => {
  it('marks success and includes output', () => {
    const text = formatToolResult(
      { tool: 'run_command', args: { command: 'echo hi' } },
      { ok: true, output: 'hi' }
    );
    expect(text).toContain('[工具结果]');
    expect(text).toContain('成功');
    expect(text).toContain('hi');
  });

  it('truncates oversized output', () => {
    const text = formatToolResult(
      { tool: 'read_file', args: { path: 'big.log' } },
      { ok: false, output: 'y'.repeat(20000) }
    );
    expect(text.length).toBeLessThan(9000);
    expect(text).toContain('输出已截断');
  });

  it('never produces an empty body', () => {
    const text = formatToolResult({ tool: 'get_terminal_context', args: {} }, { ok: true, output: '' });
    expect(text).toContain('（无输出）');
  });
});
