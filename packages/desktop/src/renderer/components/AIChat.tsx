import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, BotIcon, SendIcon, StopIcon } from './Icons';
import ModelSelector from './ModelSelector';
import ChatConversationBar from './ChatConversationBar';
import MessageContent from './MessageContent';
import { appSettings } from '../appSettings';
import { chatStore, ChatMessage } from '../chatStore';
import './AIChat.css';

type Message = ChatMessage;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 流式输出守卫：期间不接受 store 推送覆盖
  const streamingRef = useRef(false);
  // 当前流式请求的 streamId，供「停止生成」中断
  const streamIdRef = useRef<string | null>(null);
  // 当前消息快照，供流式结束后写回 store
  const messagesRef = useRef<Message[]>([]);

  const handleStop = () => {
    const id = streamIdRef.current;
    if (!id) return;
    window.electronAPI.ai.abortChatStream(id).catch(console.error);
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 从 chatStore 恢复对话：切换会话时同步消息
  useEffect(() => {
    const apply = (state: ReturnType<typeof chatStore.getState>) => {
      if (streamingRef.current) return;
      const active = state.conversations.find(c => c.id === state.activeId);
      setMessages(active ? active.messages.map(m => ({ ...m })) : []);
    };
    const unsubscribe = chatStore.subscribe(apply);
    apply(chatStore.getState());
    return unsubscribe;
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
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
          { role: 'system', content: 'You are a helpful AI assistant for shell operations.' },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: input },
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
      streamIdRef.current = streamPromise.streamId;
      const response = await streamPromise;

      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex ? { ...m, content: response.content } : m
      );
      setMessages(finalMessages);
      chatStore.replaceMessages(finalMessages);
    } catch (error: unknown) {
      const finalMessages: Message[] = messagesRef.current.map((m, i) =>
        i === placeholderIndex
          ? { ...m, content: `Error: ${getErrorMessage(error)}` }
          : m
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

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <h2>AI Assistant</h2>
        <ModelSelector />
        <ChatConversationBar />
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <BotIcon size={48} />
            </div>
            <p>Hi! I am your AI assistant.</p>
            <p>Ask me anything about shell commands, programming, or general questions.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon size={20} /> : <BotIcon size={20} />}
            </div>
            <div className="message-content">
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">
              <BotIcon size={20} />
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

      <div className="chat-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          disabled={loading}
        />
        {loading ? (
          <button className="stop-button" onClick={handleStop} title="停止生成">
            <StopIcon size={18} />
          </button>
        ) : (
          <button onClick={handleSend} disabled={!input.trim()}>
            <SendIcon size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AIChat;
