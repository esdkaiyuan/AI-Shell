import { AIMessage } from '../types';
import { AgentTool, ToolCall, ToolResult } from './types';

// 协议化 tool calling：模型在需要调用工具时输出 ```tool 围栏包裹的 JSON。
// 选择文本协议而非各厂商原生 function calling，是因为项目接入的 9 个 provider
// 格式互不兼容，文本协议对所有能输出文本的模型都成立，且解析逻辑可纯函数单测。

export const TOOL_FENCE = 'tool';
const TOOL_BLOCK_RE = /```tool\s*([\s\S]*?)```/gi;

export interface ParsedAgentResponse {
  /** 围栏之外的自然语言（思考过程 / 最终回答） */
  text: string;
  calls: ToolCall[];
  /** JSON 解析失败或结构不合法的块，原文回灌让模型自我修正 */
  parseErrors: string[];
}

function normalizeCall(raw: unknown): ToolCall | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return '工具调用必须是 JSON 对象';
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.tool !== 'string' || !obj.tool.trim()) {
    return '工具调用缺少 tool 字段';
  }
  let args: Record<string, unknown> = {};
  if (obj.args !== undefined && obj.args !== null) {
    if (typeof obj.args !== 'object' || Array.isArray(obj.args)) {
      return `工具 ${obj.tool} 的 args 必须是对象`;
    }
    args = obj.args as Record<string, unknown>;
  }
  return { tool: obj.tool.trim(), args };
}

/** 解析模型输出，提取工具调用与自然语言文本 */
export function parseAgentResponse(content: string): ParsedAgentResponse {
  const calls: ToolCall[] = [];
  const parseErrors: string[] = [];
  let text = content ?? '';

  const blocks: Array<{ start: number; end: number; body: string }> = [];
  TOOL_BLOCK_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOOL_BLOCK_RE.exec(content ?? '')) !== null) {
    blocks.push({ start: match.index, end: match.index + match[0].length, body: match[1] });
  }

  for (const block of blocks) {
    const body = block.body.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      parseErrors.push(`无法解析的 tool 块（不是合法 JSON）：${body.slice(0, 200)}`);
      continue;
    }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const result = normalizeCall(item);
      if (typeof result === 'string') parseErrors.push(result);
      else calls.push(result);
    }
  }

  // 从后往前剔除 tool 块，保留其余自然语言
  for (let i = blocks.length - 1; i >= 0; i--) {
    text = text.slice(0, blocks[i].start) + text.slice(blocks[i].end);
  }
  return { text: text.trim(), calls, parseErrors };
}

export function buildAgentSystemPrompt(tools: AgentTool[]): string {
  const toolDocs = tools
    .map(tool => {
      const params = tool.parameters.length
        ? tool.parameters
            .map(p => `    - ${p.name}: ${p.type}${p.required ? ' (必填)' : ''} — ${p.description}`)
            .join('\n')
        : '    （无参数）';
      return `  - ${tool.name} [${tool.risk}]\n    ${tool.description}\n${params}`;
    })
    .join('\n');

  return `你是一个运行在 AI Shell 终端里的自主 Agent。你可以调用工具来完成用户交代的任务，并根据工具结果继续推理，直到任务完成。

## 可用工具
${toolDocs}

## 调用格式
需要调用工具时，输出一个或多个如下格式的代码块（围栏标记必须是 tool，内容必须是合法 JSON）：

\`\`\`tool
{"tool":"工具名","args":{"参数名":"参数值"}}
\`\`\`

也可以在同一个块里放 JSON 数组一次调用多个工具。调用工具时，围栏之外可以写简短的推理说明。

## 工作规则
1. 每轮先判断是否还需要工具。任务已完成时，**直接输出自然语言结论，不要输出任何 tool 块** —— 这表示结束。
2. 工具结果会以 [工具结果] 开头的消息回灌给你，据此决定下一步，不要凭空编造执行结果。
3. 一次只做必要的事，优先用只读工具探查，再决定是否执行写操作。
4. 命令失败时先分析报错并修正，不要反复原样重试同一条命令。
5. 破坏性操作（删除、覆盖、批量修改）要在执行前向用户说明理由。
6. 不要输出无限循环的工具调用；连续 3 次完全相同的调用会被强制终止。
7. 最终回答要简洁，说明做了什么、结果如何；如需给出命令，用普通 markdown 代码块。
8. 绝对不要输出包含密钥、token 等敏感信息的完整内容。`;
}

export function buildAgentUserMessage(task: string, terminalContext?: string): string {
  if (!terminalContext?.trim()) return task;
  return `当前终端上下文：\n\`\`\`\n${terminalContext.slice(0, 4000)}\n\`\`\`\n\n任务：${task}`;
}

/** 把工具执行结果格式化为回灌消息 */
export function formatToolResult(call: ToolCall, result: ToolResult): string {
  const status = result.ok ? '成功' : '失败';
  const output = result.output.length > 8000
    ? `${result.output.slice(0, 8000)}\n…（输出已截断）`
    : result.output;
  return `[工具结果] ${call.tool}(${JSON.stringify(call.args)}) → ${status}\n${output || '（无输出）'}`;
}

export function buildInitialMessages(
  systemPrompt: string,
  task: string,
  options?: { terminalContext?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }
): AIMessage[] {
  const messages: AIMessage[] = [{ role: 'system', content: systemPrompt }];
  for (const item of options?.history ?? []) {
    messages.push({ role: item.role, content: item.content });
  }
  messages.push({ role: 'user', content: buildAgentUserMessage(task, options?.terminalContext) });
  return messages;
}
