import React, { useState } from 'react';
import { AgentConfirmLike, AgentSessionState, AgentTraceStep } from '../useAgentSession';
import { StopIcon, CloseIcon, PlayIcon, CheckIcon } from './Icons';
import './AgentTrace.css';

interface AgentTraceProps {
  state: AgentSessionState;
  autoApprove: boolean;
  onToggleAutoApprove: () => void;
  onStop: () => void;
  onConfirm: (approved: boolean) => void;
  onClear: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  idle: '待命',
  running: '执行中',
  completed: '已完成',
  aborted: '已中断',
  limit: '已终止',
  error: '出错',
};

const KIND_ICON: Record<string, string> = {
  'step-start': '›',
  thinking: '·',
  'tool-call': '⚙',
  'tool-result': '✓',
  final: '✓',
  error: '!',
  limit: '■',
};

function summarizeArgs(request: AgentConfirmLike): string {
  const entries = Object.entries(request.args ?? {});
  if (!entries.length) return '（无参数）';
  return entries
    .map(([key, value]) => {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return `${key}: ${text.length > 300 ? `${text.slice(0, 300)}…` : text}`;
    })
    .join('\n');
}

const TraceItem: React.FC<{ item: AgentTraceStep }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = item.detail.trim().length > 0;
  return (
    <div
      className={`agent-trace-item kind-${item.kind} ${item.ok === false ? 'failed' : ''}`}
      onClick={() => hasDetail && setExpanded(!expanded)}
      title={hasDetail ? (expanded ? '收起详情' : '展开详情') : undefined}
    >
      <span className="agent-trace-icon">{KIND_ICON[item.kind] ?? '·'}</span>
      <div className="agent-trace-body">
        <div className="agent-trace-head">
          <span className="agent-trace-title">{item.title}</span>
          <span className="agent-trace-step">#{item.step}</span>
        </div>
        {hasDetail && !expanded && (
          <div className="agent-trace-preview">{item.detail.replace(/\s+/g, ' ').slice(0, 120)}</div>
        )}
        {hasDetail && expanded && <pre className="agent-trace-detail">{item.detail}</pre>}
      </div>
    </div>
  );
};

const AgentTrace: React.FC<AgentTraceProps> = ({
  state,
  autoApprove,
  onToggleAutoApprove,
  onStop,
  onConfirm,
  onClear,
}) => {
  const request = state.confirmRequest;
  return (
    <div className="agent-trace">
      <div className="agent-trace-header">
        <div className="agent-trace-heading">
          <span className="agent-trace-label">Agent 执行轨迹</span>
          <span className={`agent-trace-status status-${state.status}`}>
            {STATUS_TEXT[state.status] ?? state.status}
          </span>
          <span className="agent-trace-count">{state.steps.length} 条</span>
        </div>
        <div className="agent-trace-actions">
          <button
            className={`agent-trace-toggle ${autoApprove ? 'on' : ''}`}
            onClick={onToggleAutoApprove}
            title="开启后，写操作不再逐次确认（请谨慎）"
          >
            {autoApprove ? '自动执行：开' : '自动执行：关'}
          </button>
          {state.running ? (
            <button className="agent-trace-btn danger" onClick={onStop} title="停止当前任务">
              <StopIcon size={13} />
            </button>
          ) : (
            <button
              className="agent-trace-btn"
              onClick={onClear}
              disabled={state.steps.length === 0}
              title="清空轨迹"
            >
              <CloseIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {request && (
        <div className="agent-confirm" role="alertdialog" aria-label="确认工具执行">
          <div className="agent-confirm-title">
            <span className="agent-confirm-risk">{request.risk === 'write' ? '写操作' : '工具调用'}</span>
            Agent 请求执行 <code>{request.tool}</code>
          </div>
          <pre className="agent-confirm-args">{summarizeArgs(request)}</pre>
          <div className="agent-confirm-hint">
            该操作会修改本机文件或执行命令，请确认内容后再放行。
          </div>
          <div className="agent-confirm-actions">
            <button className="agent-confirm-reject" onClick={() => onConfirm(false)}>
              拒绝
            </button>
            <button className="agent-confirm-approve" onClick={() => onConfirm(true)}>
              <CheckIcon size={13} />
              允许执行
            </button>
          </div>
        </div>
      )}

      {state.summary && (
        <div className="agent-trace-summary">{state.summary}</div>
      )}

      <div className="agent-trace-list">
        {state.steps.length === 0 ? (
          <div className="agent-trace-empty">
            <PlayIcon size={14} />
            <span>
              Agent 模式下会自主调用工具完成任务：列目录、读文件、执行命令，并根据结果继续推理。写操作默认需要你确认。
            </span>
          </div>
        ) : (
          state.steps.map(item => <TraceItem key={item.key} item={item} />)
        )}
      </div>
    </div>
  );
};

export default AgentTrace;
