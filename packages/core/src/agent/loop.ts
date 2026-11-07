import { AIMessage } from '../types';
import {
  buildAgentSystemPrompt,
  buildInitialMessages,
  formatToolResult,
  parseAgentResponse,
} from './protocol';
import { BUILTIN_TOOLS, validateToolCall } from './tools';
import {
  AgentEvent,
  AgentRunOptions,
  AgentRunResult,
  AgentTool,
  ToolCall,
  ToolResult,
} from './types';

export const DEFAULT_MAX_STEPS = 12;
export const DEFAULT_REPEAT_LIMIT = 3;

export interface AgentRunnerOptions {
  /** 向模型请求一轮完整回复（agent 每轮需要完整文本来解析工具调用） */
  chat: (messages: AIMessage[], signal?: AbortSignal) => Promise<string>;
  /** 执行一个工具调用，由宿主注入（桌面端走 IPC，测试可注入假实现） */
  executeTool: (call: ToolCall, signal?: AbortSignal) => Promise<ToolResult>;
  tools?: AgentTool[];
  maxSteps?: number;
  /** 同一调用重复次数上限，防止死循环 */
  repeatLimit?: number;
  onEvent?: (event: AgentEvent) => void;
}

/**
 * 与平台无关的 Agent 多步编排器。
 * 流程：请求模型 → 解析工具调用 → 执行 → 结果回灌 → 再请求，直到模型不再调用工具或触达上限。
 */
export class AgentRunner {
  private readonly chat: AgentRunnerOptions['chat'];
  private readonly executeTool: AgentRunnerOptions['executeTool'];
  private readonly tools: AgentTool[];
  private readonly maxSteps: number;
  private readonly repeatLimit: number;
  private readonly onEvent?: (event: AgentEvent) => void;

  constructor(options: AgentRunnerOptions) {
    this.chat = options.chat;
    this.executeTool = options.executeTool;
    this.tools = options.tools ?? BUILTIN_TOOLS;
    this.maxSteps = Math.max(1, options.maxSteps ?? DEFAULT_MAX_STEPS);
    this.repeatLimit = Math.max(2, options.repeatLimit ?? DEFAULT_REPEAT_LIMIT);
    this.onEvent = options.onEvent;
  }

  private emit(event: AgentEvent): void {
    this.onEvent?.(event);
  }

  async run(task: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const signal = options.signal;
    const messages = buildInitialMessages(
      buildAgentSystemPrompt(this.tools),
      task,
      { terminalContext: options.terminalContext, history: options.history }
    );
    const calls: ToolCall[] = [];
    const seen = new Map<string, number>();
    let lastText = '';
    let steps = 0;

    for (let step = 1; step <= this.maxSteps; step++) {
      if (signal?.aborted) {
        return { content: lastText, steps, calls, status: 'aborted' };
      }
      steps = step;
      this.emit({ type: 'step-start', step });

      let raw: string;
      try {
        raw = await this.chat(messages, signal);
      } catch (error: unknown) {
        if (signal?.aborted) {
          return { content: lastText, steps, calls, status: 'aborted' };
        }
        const message = error instanceof Error ? error.message : String(error);
        this.emit({ type: 'error', step, message });
        return { content: lastText, steps, calls, status: 'error', error: message };
      }

      const parsed = parseAgentResponse(raw);
      if (parsed.text) {
        lastText = parsed.text;
        this.emit({ type: 'thinking', step, text: parsed.text });
      }

      // 格式错误：把错误回灌，让模型自己修正，不消耗工具配额
      if (parsed.parseErrors.length > 0) {
        messages.push({ role: 'assistant', content: raw });
        messages.push({
          role: 'user',
          content: `[系统提示] 上一轮工具调用格式有误：\n${parsed.parseErrors.join('\n')}\n请严格使用 \`\`\`tool 围栏包裹合法 JSON 重新输出。`,
        });
        this.emit({ type: 'error', step, message: parsed.parseErrors.join('\n') });
        continue;
      }

      // 没有工具调用 = 任务结束
      if (parsed.calls.length === 0) {
        this.emit({ type: 'final', step, content: parsed.text });
        return { content: parsed.text, steps, calls, status: 'completed' };
      }

      messages.push({ role: 'assistant', content: raw });
      const resultParts: string[] = [];

      for (const call of parsed.calls) {
        if (signal?.aborted) {
          return { content: lastText, steps, calls, status: 'aborted' };
        }
        calls.push(call);

        const key = `${call.tool}:${JSON.stringify(call.args)}`;
        const count = (seen.get(key) ?? 0) + 1;
        seen.set(key, count);
        if (count > this.repeatLimit) {
          const reason = `工具 ${call.tool} 以相同参数重复调用 ${count} 次，判定为死循环，已终止`;
          this.emit({ type: 'limit', step, reason });
          return { content: lastText, steps, calls, status: 'limit', error: reason };
        }

        let result: ToolResult;
        const invalid = validateToolCall(call, this.tools);
        if (invalid) {
          result = { ok: false, output: `[参数校验失败] ${invalid}` };
          this.emit({ type: 'error', step, message: invalid });
        } else {
          this.emit({ type: 'tool-call', step, call });
          try {
            result = await this.executeTool(call, signal);
          } catch (error: unknown) {
            if (signal?.aborted) {
              return { content: lastText, steps, calls, status: 'aborted' };
            }
            result = {
              ok: false,
              output: `[工具执行异常] ${error instanceof Error ? error.message : String(error)}`,
            };
          }
        }
        this.emit({ type: 'tool-result', step, call, result });
        resultParts.push(formatToolResult(call, result));
      }

      // 同一轮的多个结果合并为一条消息，控制 token 增长
      messages.push({ role: 'user', content: resultParts.join('\n\n') });
    }

    const reason = `已达到最大执行步数 ${this.maxSteps}，任务可能未完全结束`;
    this.emit({ type: 'limit', step: steps, reason });
    return { content: lastText, steps, calls, status: 'limit', error: reason };
  }
}
