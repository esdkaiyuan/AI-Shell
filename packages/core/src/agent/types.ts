// Agent 类型定义：协议化工具调用的核心数据结构
// 说明：core 的 AIMessage 仅有 user/assistant/system 三种角色（兼容 9 个 provider），
// 因此工具结果统一以 user 角色 + 显式标记回灌，不引入 tool role。

export type ToolRisk = 'read' | 'write';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
}

export interface AgentTool {
  name: string;
  description: string;
  /** read 类工具可静默执行；write 类默认需要用户确认 */
  risk: ToolRisk;
  parameters: ToolParameter[];
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  output: string;
  durationMs?: number;
}

export type AgentEvent =
  | { type: 'step-start'; step: number }
  | { type: 'thinking'; step: number; text: string }
  | { type: 'tool-call'; step: number; call: ToolCall }
  | { type: 'tool-result'; step: number; call: ToolCall; result: ToolResult }
  | { type: 'final'; step: number; content: string }
  | { type: 'error'; step: number; message: string }
  | { type: 'limit'; step: number; reason: string };

export type AgentStatus = 'completed' | 'aborted' | 'limit' | 'error';

export interface AgentRunResult {
  content: string;
  steps: number;
  calls: ToolCall[];
  status: AgentStatus;
  error?: string;
}

export interface AgentRunOptions {
  /** 当前终端输出上下文，注入首条用户消息 */
  terminalContext?: string;
  /** 历史对话（不含 system） */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}
