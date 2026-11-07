import { ipcMain } from 'electron';
import { AgentRunner, getTool } from '@ai-shell/core';
import type { AgentRunResult, AIServiceImpl, LocalStorage, ToolCall } from '@ai-shell/core';
import { createToolExecutor } from './agentTools';

// Agent 运行在主进程：工具执行、安全边界、中断都留在 Node 侧，
// 渲染层只负责发起任务、展示步骤时间线与人工确认。

export interface AgentRunRequest {
  runId: string;
  task: string;
  terminalContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxSteps?: number;
  /** 关闭人工确认（默认 false，所有写操作都需用户点允许） */
  autoApprove?: boolean;
  provider?: string;
  model?: string;
}

export interface AgentConfirmRequest {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'read' | 'write';
}

export interface AgentRuntimeDeps {
  getAIService: () => AIServiceImpl;
  getStorage: () => LocalStorage | null;
}

const CONFIRM_TIMEOUT_MS = 60_000;

interface PendingConfirmation {
  resolve: (approved: boolean) => void;
  timer: NodeJS.Timeout;
}

export function registerAgentIPC(deps: AgentRuntimeDeps): void {
  const controllers = new Map<string, AbortController>();
  const contexts = new Map<string, string>();
  const pending = new Map<string, PendingConfirmation>();
  let confirmSeq = 0;

  ipcMain.handle('agent:confirm-response', (_, confirmId: string, approved: boolean) => {
    const item = pending.get(confirmId);
    if (!item) return false;
    clearTimeout(item.timer);
    pending.delete(confirmId);
    item.resolve(Boolean(approved));
    return true;
  });

  ipcMain.handle('agent:abort', (_, runId: string) => {
    const controller = controllers.get(runId);
    if (!controller) return false;
    controller.abort();
    return true;
  });

  ipcMain.handle('agent:run', async (event, request: AgentRunRequest): Promise<AgentRunResult> => {
    const { runId, task } = request;
    const sender = event.sender;
    const controller = new AbortController();
    controllers.set(runId, controller);
    contexts.set(runId, request.terminalContext ?? '');

    const requestConfirmation = (call: ToolCall): Promise<boolean> =>
      new Promise(resolve => {
        if (sender.isDestroyed()) {
          resolve(false);
          return;
        }
        const confirmId = `${runId}:${++confirmSeq}`;
        const timer = setTimeout(() => {
          pending.delete(confirmId);
          resolve(false);
        }, CONFIRM_TIMEOUT_MS);
        pending.set(confirmId, { resolve, timer });
        const payload: AgentConfirmRequest = {
          confirmId,
          tool: call.tool,
          args: call.args,
          risk: getTool(call.tool)?.risk ?? 'write',
        };
        sender.send('agent:confirm', runId, payload);
      });

    const rawExecutor = createToolExecutor({
      storage: deps.getStorage(),
      getTerminalContext: () => contexts.get(runId) ?? '',
    });

    const executor = async (call: ToolCall, signal?: AbortSignal) => {
      const risky = (getTool(call.tool)?.risk ?? 'write') === 'write';
      if (risky && !request.autoApprove) {
        if (signal?.aborted) return { ok: false, output: '已中断，操作未执行' };
        const approved = await requestConfirmation(call);
        if (!approved) {
          return {
            ok: false,
            output: '[用户拒绝] 本次操作未执行。请改用只读工具继续，或向用户说明需要该操作的原因。',
          };
        }
      }
      return rawExecutor(call, signal);
    };

    const runner = new AgentRunner({
      chat: async (messages, signal) => {
        let content = '';
        for await (const chunk of deps
          .getAIService()
          .streamChat(messages, request.provider, request.model, signal)) {
          if (signal?.aborted) break;
          content += chunk.content;
        }
        return content;
      },
      executeTool: executor,
      maxSteps: request.maxSteps,
      onEvent: agentEvent => {
        if (!sender.isDestroyed()) sender.send('agent:event', runId, agentEvent);
      },
    });

    try {
      return await runner.run(task, {
        terminalContext: request.terminalContext,
        history: request.history,
        signal: controller.signal,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (!sender.isDestroyed()) {
        sender.send('agent:event', runId, { type: 'error', step: 0, message });
      }
      return { content: '', steps: 0, calls: [], status: 'error', error: message };
    } finally {
      controllers.delete(runId);
      contexts.delete(runId);
      for (const [id, item] of pending) {
        if (id.startsWith(`${runId}:`)) {
          clearTimeout(item.timer);
          pending.delete(id);
          item.resolve(false);
        }
      }
    }
  });
}
