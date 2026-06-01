import React, { useState } from 'react';
import { PlayIcon, CornerDownLeftIcon, CopyIcon, CheckIcon } from './Icons';
import './CommandActions.css';

interface CommandActionsProps {
  onInsert: () => void;
  onExecute: () => void;
  onCopy: () => void;
}

const CommandActions: React.FC<CommandActionsProps> = ({
  onInsert,
  onExecute,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="command-actions">
      <button
        className="command-action-btn insert"
        onClick={onInsert}
        title="插入到终端输入框"
      >
        <CornerDownLeftIcon size={14} />
        <span>插入</span>
      </button>
      <button
        className="command-action-btn execute"
        onClick={onExecute}
        title="直接执行命令"
      >
        <PlayIcon size={14} />
        <span>执行</span>
      </button>
      <button
        className="command-action-btn copy"
        onClick={handleCopy}
        title="复制到剪贴板"
      >
        {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        <span>{copied ? '已复制' : '复制'}</span>
      </button>
    </div>
  );
};

export default CommandActions;
