import React, { useState, useRef, useEffect } from 'react';
import { UserIcon, BotIcon, SendIcon } from './Icons';
import './AIChat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await window.electronAPI.ai.chat([
        { role: 'system', content: 'You are a helpful AI assistant for shell operations.' },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input },
      ]);

      const assistantMessage: Message = { role: 'assistant', content: response.content };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${getErrorMessage(error)}`,
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

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <h2>AI Assistant</h2>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <BotIcon size={48} />
            </div>
            <p>Hi! I'm your AI assistant.</p>
            <p>Ask me anything about shell commands, programming, or general questions.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <UserIcon size={20} /> : <BotIcon size={20} />}
            </div>
            <div className="message-content">
              <pre>{msg.content}</pre>
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
        <button onClick={handleSend} disabled={loading || !input.trim()}>
          <SendIcon size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
