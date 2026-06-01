import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, BotIcon, SendIcon, PanelRightIcon, PanelBottomIcon, RefreshIcon, CloseIcon, PlayIcon } from './Icons';
import CommandActions from './CommandActions';
import { terminalBus } from '../terminalBus';
import { commandHistory, CommandHistoryEntry } from '../commandHistory';
import './AIAssistantPanel.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  commands?: string[]; // AI 生成的命令列表
}

interface AIAssistantPanelProps {
  position: 'right' | 'bottom';
  onPositionChange: (pos: 'right' | 'bottom') => void;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// 从 AI 回复中提取代码块（命令）
const extractCommands = (content: string): string[] => {
  const codeBlockRegex = /```(?:bash|sh|shell)?\n([\s\S]*?)```/g;
  const inlineCodeRegex = /`([^`]+)`/g;
  const commands: string[] = [];

  let match;
  // 提取代码块
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lines = match[1].trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    commands.push(...lines);
  }

  // 如果没有代码块，尝试提取行内代码
  if (commands.length === 0) {
    while ((match = inlineCodeRegex.exec(content)) !== null) {
      const cmd = match[1].trim();
      // 简单启发式：看起来像命令的才提取
      if (cmd.includes(' ') || cmd.startsWith('cd') || cmd.startsWith('ls') || cmd.startsWith('git')) {
        commands.push(cmd);
      }
    }
  }

  return commands;
};

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ position, onPositionChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoContext, setAutoContext] = useState(true); // 自动获取上下文
  const [showHistory, setShowHistory] = useState(false); // 命令历史抽屉
  const [history, setHistory] = useState<CommandHistoryEntry[]>(commandHistory.getAll());
  const [errorAlert, setErrorAlert] = useState<{ snippet: string } | null>(null); // 报错提示
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 订阅命令历史变化
  useEffect(() => {
    const unsubscribe = commandHistory.subscribe(setHistory);
    return unsubscribe;
  }, []);

  // 订阅终端报错检测，弹出智能建议提示
  useEffect(() => {
    const unsubscribe = terminalBus.subscribeError(({ snippet }) => {
      setErrorAlert({ snippet });
    });
    return unsubscribe;
  }, []);

  const handleSend = async (includeContext = autoContext) => {
    if (!input.trim() || loading) return;

    let userMessage = input.trim();

    // 如果启用自动上下文，附加终端输出
    if (includeContext) {
      const context = terminalBus.getActiveContext(3000);
      if (context) {
        userMessage = `终端上下文：\n\`\`\`\n${context}\n\`\`\`\n\n我的问题：${userMessage}`;
      }
    }

    const msg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, msg]);
    setInput('');
    setLoading(true);

    try {
      const response = await window.electronAPI.ai.chat([
        {
          role: 'system',
          content: 'You are a helpful AI assistant for shell operations. When suggesting commands, wrap them in ```bash code blocks. Be concise and practical.'
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ]);

      const commands = extractCommands(response.content);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.content,
        commands: commands.length > 0 ? commands : undefined,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误: ${getErrorMessage(error)}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertCommand = (command: string) => {
    const success = terminalBus.insertToActive(command);
    if (!success) {
      setStatusMessage('没有活动的终端，先打开或切换到一个终端后再插入命令。');
      return;
    }
    setStatusMessage(null);
    commandHistory.add(command, 'insert');
  };

  const handleExecuteCommand = (command: string) => {
    const success = terminalBus.runOnActive(command);
    if (!success) {
      setStatusMessage('没有活动的终端，先打开或切换到一个终端后再执行命令。');
      return;
    }
    setStatusMessage(null);
    commandHistory.add(command, 'execute');
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    commandHistory.add(command, 'copy');
  };

  const handleRefreshContext = () => {
    const context = terminalBus.getActiveContext(3000);
    if (context) {
      setInput(`请帮我分析这个终端输出：\n\n${context.slice(-500)}`);
      setStatusMessage(null);
    } else {
      setStatusMessage('没有可用的终端上下文。运行一些命令后，再点击刷新上下文。');
    }
  };

  // 一键分析检测到的报错
  const handleAnalyzeError = async () => {
    if (!errorAlert) return;
    const snippet = errorAlert.snippet;
    setErrorAlert(null);

    const displayMsg = '终端检测到报错，请帮我分析原因并给出修复命令。';
    const userMessage = `终端报错输出：\n\`\`\`\n${snippet}\n\`\`\`\n\n${displayMsg}`;

    setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
    setLoading(true);

    try {
      const response = await window.electronAPI.ai.chat([
        {
          role: 'system',
          content:
            'You are a helpful AI assistant for shell operations. When suggesting commands, wrap them in ```bash code blocks. Be concise and practical.',
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ]);

      const commands = extractCommands(response.content);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.content,
          commands: commands.length > 0 ? commands : undefined,
        },
      ]);
    } catch (error: unknown) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `错误: ${getErrorMessage(error)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-assistant-panel ${position}`}>
      <div className="panel-header">
        <div className="panel-title">
          <BotIcon size={16} />
          <span>AI 助手</span>
        </div>
        <div className="panel-controls">
          <button
            className="panel-control-btn"
            onClick={handleRefreshContext}
            title="获取终端上下文"
          >
            <RefreshIcon size={14} />
          </button>
          <button
            className={`panel-control-btn ${showHistory ? 'active-toggle' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="命令历史"
          >
            <PlayIcon size={14} />
          </button>
          <button
            className="panel-control-btn"
            onClick={() => setAutoContext(!autoContext)}
            title={autoContext ? '自动获取上下文：开' : '自动获取上下文：关'}
          >
            <span className={`context-indicator ${autoContext ? 'active' : ''}`}>
              {autoContext ? 'AUTO' : 'OFF'}
            </span>
          </button>
          <button
            className="panel-control-btn"
            onClick={() => onPositionChange(position === 'right' ? 'bottom' : 'right')}
            title="切换面板位置"
          >
            {position === 'right' ? <PanelBottomIcon size={14} /> : <PanelRightIcon size={14} />}
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="command-history-drawer">
          <div className="history-header">
            <span>命令历史 ({history.length})</span>
            <div className="history-header-actions">
              {history.length > 0 && (
                confirmClearHistory ? (
                  <span className="history-confirm-clear">
                    <button className="history-clear-btn" onClick={() => setConfirmClearHistory(false)}>
                      取消
                    </button>
                    <button
                      className="history-clear-btn danger"
                      onClick={() => {
                        commandHistory.clear();
                        setConfirmClearHistory(false);
                      }}
                    >
                      确认清空
                    </button>
                  </span>
                ) : (
                  <button
                    className="history-clear-btn"
                    onClick={() => setConfirmClearHistory(true)}
                  >
                    清空
                  </button>
                )
              )}
              <button className="history-close-btn" onClick={() => setShowHistory(false)}>
                <CloseIcon size={14} />
              </button>
            </div>
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">还没有命令记录</div>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="history-item">
                  <code className="history-cmd" title={entry.command}>
                    {entry.command}
                  </code>
                  <div className="history-actions">
                    <button title="插入到终端" onClick={() => handleInsertCommand(entry.command)}>
                      插入
                    </button>
                    <button title="执行" onClick={() => handleExecuteCommand(entry.command)}>
                      执行
                    </button>
                    <button title="复制" onClick={() => handleCopyCommand(entry.command)}>
                      复制
                    </button>
                    <button title="删除记录" onClick={() => commandHistory.remove(entry.id)}>
                      <CloseIcon size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {errorAlert && (
        <div className="error-alert-banner">
          <div className="error-alert-text">
            <strong>检测到终端报错</strong>
            <span>需要 AI 帮你分析并给出修复方案吗？</span>
          </div>
          <div className="error-alert-actions">
            <button className="error-alert-analyze" onClick={handleAnalyzeError}>
              分析报错
            </button>
            <button className="error-alert-dismiss" onClick={() => setErrorAlert(null)}>
              <CloseIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="assistant-status" role="status">
          {statusMessage}
        </div>
      )}

      <div className="panel-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <BotIcon size={48} />
            </div>
            <p>我可以帮你分析终端输出、解释报错、生成命令</p>
            <p className="empty-hint">
              {autoContext ? '✓ 自动获取终端上下文' : '✗ 手动模式'}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon size={18} /> : <BotIcon size={18} />}
            </div>
            <div className="message-content">
              <pre>{msg.content}</pre>
              {msg.commands && msg.commands.length > 0 && (
                <div className="message-commands">
                  {msg.commands.map((cmd, cidx) => (
                    <div key={cidx} className="command-item">
                      <code>{cmd}</code>
                      <CommandActions
                        onInsert={() => handleInsertCommand(cmd)}
                        onExecute={() => handleExecuteCommand(cmd)}
                        onCopy={() => handleCopyCommand(cmd)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">
              <BotIcon size={18} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="panel-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="询问 AI 或描述你的需求... (Enter 发送)"
          disabled={loading}
          rows={2}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}>
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
};

export default AIAssistantPanel;
