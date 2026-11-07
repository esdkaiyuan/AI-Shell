import { useCallback, useEffect, useRef, useState } from 'react';

// Agent 会话状态机：封装与主进程的事件订阅、确认应答和中断。
// 与 UI 解耦，事件到轨迹条的转换是纯函数，可独立单测。

export type AgentEventType =
  | 'step-start'
  | 'thinking'
  | 'tool-call'
  | 'tool-result'
  | 'final'
  | 'error'
  | 'limit';

export interface AgentEventLike {
  type: AgentEventType;
  step: number;
  text?: string;
  content?: string;
  message?: string;
  reason?: string;
  call?: { tool: string; args: Record<string, unknown> };
  result?: { ok: boolean; output: string; durationMs?: number };
}

export interface AgentConfirmLike {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'read' | 'write';
}

export interface AgentRunOptionsLike {
  terminalContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxSteps?: number;
  autoApprove?: boolean;
  provider?: string;
  model?: string;
}

export interface AgentRunResultLike {
  content: string;
  steps: number;
  calls: Array<{ tool: string; args: Record<string, unknown> }>;
  status: 'completed' | 'aborted' | 'limit' | 'error';
  error?: string;
}

export type AgentSessionStatus = 'idle' | 'running' | 'completed' | 'aborted' | 'limit' | 'error';

export interface AgentTraceStep {
  key: string;
  step: number;
  kind: AgentEventType;
  title: string;
  detail: string;
  tool?: string;
  ok?: boolean;
  ts: number;
}

export interface AgentSessionState {
  running: boolean;
  status: AgentSessionStatus;
  steps: AgentTraceStep[];
  confirmRequest: AgentConfirmLike | null;
  summary: string;
}

const INITIAL_STATE: AgentSessionState = {
  running: false,
  status: 'idle',
  steps: [],
  confirmRequest: null,
  summary: '',
};

/** 把主进程推送的事件转成一条可展示的轨迹记录（纯函数） */
export function eventToStep(
  event: AgentEventLike,
  seq: number,
  now = Date.now()
): AgentTraceStep {
  const base = {
    key: `${event.step}-${seq}-${event.type}`,
    step: event.step,
    kind: event.type,
    ts: now,
  };
  switch (event.type) {
    case 'step-start':
      return { ...base, title: `第 ${event.step} 轮推理`, detail: '' };
    case 'thinking':
      return { ...base, title: '思考', detail: event.text ?? '' };
    case 'tool-call':
      return {
        ...base,
        title: `调用 ${event.call?.tool ?? '工具'}`,
        tool: event.call?.tool,
        detail: JSON.stringify(event.call?.args ?? {}, null, 2),
      };
    case 'tool-result':
      return {
        ...base,
        title: `${event.result?.ok ? '执行成功' : '执行失败'}${event.call?.tool ? ` · ${event.call.tool}` : ''}`,
        tool: event.call?.tool,
        ok: event.result?.ok,
        detail: event.result?.output ?? '',
      };
    case 'final':
      return { ...base, title: '任务完成', detail: event.content ?? '' };
    case 'error':
      return { ...base, title: '需要修正', detail: event.message ?? '' };
    case 'limit':
      return { ...base, title: '已终止', detail: event.reason ?? '' };
    default:
      return { ...base, title: '事件', detail: '' };
  }
}

const makeRunId = (): string =>
  `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useAgentSession() {
  const [state, setState] = useState<AgentSessionState>(INITIAL_STATE);
  const runIdRef = useRef<string | null>(null);
  const confirmIdRef = useRef<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const offEvent = window.electronAPI.agent.onEvent((id, payload) => {
      if (id !== runIdRef.current) return;
      const step = eventToStep(payload as AgentEventLike, seqRef.current++);
      setState(prev => ({ ...prev, steps: [...prev.steps, step] }));
    });
    const offConfirm = window.electronAPI.agent.onConfirm((id, request) => {
      if (id !== runIdRef.current) return;
      confirmIdRef.current = request.confirmId;
      setState(prev => ({ ...prev, confirmRequest: request as AgentConfirmLike }));
    });
    return () => {
      offEvent();
      offConfirm();
    };
  }, []);

  const run = useCallback(
    async (task: string, options: AgentRunOptionsLike = {}): Promise<AgentRunResultLike> => {
      const runId = makeRunId();
      runIdRef.current = runId;
      confirmIdRef.current = null;
      seqRef.current = 0;
      setState({
        running: true,
        status: 'running',
        steps: [],
        confirmRequest: null,
        summary: '',
      });

      try {
        const result = await window.electronAPI.agent.run(runId, task, options);
        setState(prev => ({
          ...prev,
          running: false,
          status: result.status,
          summary: result.error ?? '',
        }));
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setState(prev => ({ ...prev, running: false, status: 'error', summary: message }));
        throw error;
      } finally {
        runIdRef.current = null;
      }
    },
    []
  );

  const abort = useCallback(() => {
    const id = runIdRef.current;
    if (id) window.electronAPI.agent.abort(id).catch(console.error);
  }, []);

  const respondConfirm = useCallback(async (approved: boolean) => {
    const id = confirmIdRef.current;
    confirmIdRef.current = null;
    setState(prev => ({ ...prev, confirmRequest: null }));
    if (id) {
      await window.electronAPI.agent.respondConfirm(id, approved).catch(console.error);
    }
  }, []);

  const clear = useCallback(() => {
    if (runIdRef.current) return;
    setState(INITIAL_STATE);
  }, []);

  return { state, run, abort, respondConfirm, clear };
}
