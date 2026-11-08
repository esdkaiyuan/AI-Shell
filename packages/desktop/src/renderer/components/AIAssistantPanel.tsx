import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, BotIcon, SendIcon, PanelRightIcon, PanelBottomIcon, RefreshIcon, CloseIcon, PlayIcon, StopIcon } from './Icons';
import CommandActions from './CommandActions';
import ModelSelector from './ModelSelector';
import ChatConversationBar from './ChatConversationBar';
import MessageContent from './MessageContent';
import AgentTrace from './AgentTrace';
import { terminalBus } from '../terminalBus';
import { commandHistory, CommandHistoryEntry } from '../commandHistory';
import { appSettings } from '../appSettings';
import { chatStore, ChatMessage } from '../chatStore';
import { useAgentSession } from '../useAgentSession';
import './AIAssistantPanel.css';

type Message = ChatMessage;

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
  const [agentMode, setAgentMode] = useState(() => appSettings.get().agentMode);
  const [agentAutoApprove, setAgentAutoApprove] = useState(() => appSettings.get().agentAutoApprove);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentSession = useAgentSession();
  // 流式输出守卫：期间不接受 store 推送覆盖
  const streamingRef = useRef(false);
  // 当前流式请求的 streamId，供「停止生成」中断
  const streamIdRef = useRef<string | null>(null);
  // 当前消息快照，供流式结束后写回 store
  const messagesRef = useRef<Message[]>([]);

  const handleStop = () => {
    if (agentMode) {
      agentSession.abort();
      return;
    }
    const id = streamIdRef.current;
    if (!id) return;
    window.electronAPI.ai.abortChatStream(id).catch(console.error);
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 设置页修改 Agent 配置时同步到面板
  useEffect(() => {
    return appSettings.subscribe(settings => {
      setAgentMode(settings.agentMode);
      setAgentAutoApprove(settings.agentAutoApprove);
    });
  }, []);

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

  // 从 chatStore 恢复对话：切换会话时同步消息
  useEffect(() => {
    const apply = (state: ReturnType<typeof chatStore.getState>) => {
      // 流式输出中不被打断，避免 store 覆盖正在渲染的内容
      if (streamingRef.current) return;
      const active = state.conversations.find(c => c.id === state.activeId);
      setMessages(active ? active.messages.map(m => ({ ...m })) : []);
    };
    const unsubscribe = chatStore.subscribe(apply);
    apply(chatStore.getState());
    return unsubscribe;
  }, []);

  // 订阅终端报错检测，弹出智能建议提示
  useEffect(() => {
    const unsubscribe = terminalBus.subscribeError(({ snippet }) => {
      setErrorAlert({ snippet });
    });
    return unsubscribe;
  }, []);

  // Agent 模式：派发自主任务，最终结论写回当前会话
  const runAgentTask = async (task: string, displayContent: string) => {
    if (loading) return;
    setInput('');
    setLoading(true);
    streamingRef.current = true;

    const priorMessages = messagesRef.current;
    const withUser: Message[] = [...priorMessages, { role: 'user', content: displayContent }];
    messagesRef.current = withUser;
    setMessages(withUser);

    const appendAssistant = (content: string) => {
      const commands = extractCommands(content);
      const assistant: Message = {
        role: 'assistant',
        content,
        commands: commands.length > 0 ? commands : undefined,
      };
      const finalMessages = [...messagesRef.current, assistant];
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    };

    try {
      const {
        aiProvider,
        aiModel,
        agentAutoApprove: autoApprove,
        agentMaxSteps,
      } = appSettings.get();
      const result = await agentSession.run(task, {
        terminalContext: autoContext ? terminalBus.getActiveContext(4000) : '',
        history: priorMessages.map(m => ({ role: m.role, content: m.content })),
        maxSteps: agentMaxSteps,
        autoApprove,
        provider: aiProvider || undefined,
        model: aiModel || undefined,
      });

      let content = result.content;
      if (!content) {
        if (result.status === 'aborted') content = '任务已中断。';
        else if (result.status === 'limit') content = `任务已终止：${result.error ?? '达到执行上限'}`;
        else if (result.status === 'error') content = `执行出错：${result.error ?? '未知错误'}`;
        else content = '任务结束，但没有返回结论。';
      } else if (result.status !== 'completed' && result.error) {
        content += `\n\n> ${result.error}`;
      }
      appendAssistant(content);
    } catch (error: unknown) {
      appendAssistant(`错误: ${getErrorMessage(error)}`);
    } finally {
      streamingRef.current = false;
      setLoading(false);
    }
  };

  const handleSend = async (includeContext = autoContext) => {
    if (!input.trim() || loading) return;
    if (agentMode) {
      await runAgentTask(input.trim(), input.trim());
      return;
    }

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
    streamingRef.current = true;

    // 先占位一条空的 assistant 消息，流式往里填
    const placeholderIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { aiProvider, aiModel } = appSettings.get();
      const streamPromise = window.electronAPI.ai.chatStream(
        [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for shell operations. When suggesting commands, wrap them in ```bash code blocks. Be concise and practical.'
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
        aiProvider || undefined,
        aiModel || undefined,
        chunk => {
          if (chunk.error) return;
          if (!chunk.content) return;
          setMessages(prev =>
            prev.map((m, i) =>
              i === placeholderIndex
                ? { ...m, content: m.content + chunk.content }
                : m
            )
          );
        }
      );
      streamIdRef.current = streamPromise.streamId;
      const response = await streamPromise;

      const commands = extractCommands(response.content);
      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex
          ? {
              ...m,
              content: response.content,
              commands: commands.length > 0 ? commands : undefined,
            }
          : m
      );
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    } catch (error: unknown) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `错误: ${getErrorMessage(error)}`,
      };
      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex ? errorMessage : m
      );
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    } finally {
      streamingRef.current = false;
      streamIdRef.current = null;
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

    if (agentMode) {
      await runAgentTask(
        `${userMessage}\n请主动使用工具定位原因并修复，不要只给建议。`,
        displayMsg
      );
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: displayMsg }]);
    setLoading(true);
    streamingRef.current = true;

    const placeholderIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const { aiProvider, aiModel } = appSettings.get();
      const response = await window.electronAPI.ai.chatStream(
        [
          {
            role: 'system',
            content:
              'You are a helpful AI assistant for shell operations. When suggesting commands, wrap them in ```bash code blocks. Be concise and practical.',
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
        aiProvider || undefined,
        aiModel || undefined,
        chunk => {
          if (chunk.error || !chunk.content) return;
          setMessages(prev =>
            prev.map((m, i) =>
              i === placeholderIndex ? { ...m, content: m.content + chunk.content } : m
            )
          );
        }
      );

      const commands = extractCommands(response.content);
      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex
          ? {
              ...m,
              content: response.content,
              commands: commands.length > 0 ? commands : undefined,
            }
          : m
      );
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    } catch (error: unknown) {
      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex
          ? { ...m, content: `错误: ${getErrorMessage(error)}` }
          : m
      );
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    } finally {
      streamingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={`ai-assistant-panel ${position}`}>
      <div className="panel-header">
        <div className="panel-title">
          <BotIcon size={16} />
          <span>AI 助手</span>
          <ModelSelector />
          <ChatConversationBar compact />
        </div>
        <div className="panel-controls">
          <button
            className={`panel-control-btn ${agentMode ? 'active-toggle' : ''}`}
            aria-label="Agent 模式"
            aria-pressed={agentMode}
            onClick={() => {
              const next = !agentMode;
              setAgentMode(next);
              appSettings.update({ agentMode: next });
            }}
            title={agentMode ? 'Agent 模式已开启：AI 可自主调用工具' : '切换到 Agent 模式'}
          >
            <span className={`agent-mode-indicator ${agentMode ? 'active' : ''}`}>AGENT</span>
          </button>
          <button
            className="panel-control-btn"
            onClick={handleRefreshContext}
            title="获取终端上下文"
            aria-label="获取终端上下文"
          >
            <RefreshIcon size={14} />
          </button>
          <button
            className={`panel-control-btn ${showHistory ? 'active-toggle' : ''}`}
            aria-label="命令历史"
            aria-pressed={showHistory}
            onClick={() => setShowHistory(!showHistory)}
            title="命令历史"
          >
            <PlayIcon size={14} />
          </button>
          <button
            className="panel-control-btn"
            aria-label="自动获取终端上下文"
            aria-pressed={autoContext}
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

      <div className="panel-messages" aria-live="polite" aria-label="对话内容">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <BotIcon size={48} />
            </div>
            <p>
              {agentMode
                ? 'Agent 模式：我会自主调用工具查文件、跑命令，并根据结果继续推进任务'
                : '我可以帮你分析终端输出、解释报错、生成命令'}
            </p>
            <p className="empty-hint">
              {agentMode
                ? agentAutoApprove
                  ? '⚠ 写操作将自动执行'
                  : '✓ 写操作需逐次确认'
                : autoContext
                  ? '✓ 自动获取终端上下文'
                  : '✗ 手动模式'}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon size={18} /> : <BotIcon size={18} />}
            </div>
            <div className="message-content">
              <MessageContent content={msg.content} />
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

      {agentMode && (
        <AgentTrace
          state={agentSession.state}
          autoApprove={agentAutoApprove}
          onToggleAutoApprove={() => {
            const next = !agentAutoApprove;
            setAgentAutoApprove(next);
            appSettings.update({ agentAutoApprove: next });
          }}
          onStop={agentSession.abort}
          onConfirm={agentSession.respondConfirm}
          onClear={agentSession.clear}
        />
      )}

      <div className="panel-input">
        <textarea
          value={input}
          aria-label={agentMode ? '给 Agent 派任务' : '向 AI 提问'}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            agentMode
              ? '给 Agent 派个任务，例如：排查构建失败原因并修复… (Enter 发送)'
              : '询问 AI 或描述你的需求... (Enter 发送)'
          }
          disabled={loading}
          rows={2}
        />
        {loading ? (
          <button
            className="stop-button"
            onClick={handleStop}
            title="停止生成"
            aria-label="停止生成"
          >
            <StopIcon size={16} />
          </button>
        ) : (
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            title="发送"
            aria-label="发送"
          >
            <SendIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AIAssistantPanel;
