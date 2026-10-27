import React, { useEffect, useRef, useState } from 'react';
import { PlusIcon, ChevronDownIcon, EditIcon, TrashIcon, HistoryIcon } from './Icons';
import { chatStore, ChatConversation } from '../chatStore';
import './ChatConversationBar.css';

interface ChatConversationBarProps {
  /** 紧凑模式用于右侧面板，完整模式用于独立 AI 页 */
  compact?: boolean;
}

/**
 * AI 会话切换器：新建 / 切换 / 重命名 / 删除会话。
 * 数据统一走 chatStore，切换后由父组件同步消息。
 */
const ChatConversationBar: React.FC<ChatConversationBarProps> = ({ compact = false }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState('');
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = chatStore.subscribe(state => {
      setConversations(state.conversations);
      setActiveId(state.activeId);
    });
    return unsubscribe;
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const active = conversations.find(c => c.id === activeId);

  const handleNew = () => {
    chatStore.create();
    setOpen(false);
  };

  const handleSelect = (id: string) => {
    chatStore.setActive(id);
    setOpen(false);
  };

  const handleRenameSubmit = (id: string) => {
    chatStore.rename(id, renameValue);
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string) => {
    chatStore.remove(id);
    setConfirmDeleteId(null);
    setOpen(false);
  };

  return (
    <div className={`chat-conversation-bar${compact ? ' compact' : ''}`} ref={rootRef}>
      <button
        className="conversation-trigger"
        onClick={() => setOpen(!open)}
        title="切换对话"
      >
        <HistoryIcon size={13} />
        {!compact && <span className="conversation-label">{active?.title ?? '新对话'}</span>}
        {compact && <span className="conversation-label">{active?.title ?? '新对话'}</span>}
        <ChevronDownIcon size={12} />
      </button>

      {open && (
        <div className="conversation-menu">
          <div className="conversation-menu-header">
            <span>对话记录 ({conversations.length})</span>
            <button className="conversation-new" onClick={handleNew} title="新建对话">
              <PlusIcon size={13} />
            </button>
          </div>

          <div className="conversation-list">
            {conversations.length === 0 ? (
              <div className="conversation-empty">还没有对话记录</div>
            ) : (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`conversation-item ${c.id === activeId ? 'active' : ''}`}
                >
                  {renamingId === c.id ? (
                    <input
                      className="conversation-rename"
                      value={renameValue}
                      autoFocus
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameSubmit(c.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => handleRenameSubmit(c.id)}
                    />
                  ) : (
                    <>
                      <button
                        className="conversation-title"
                        onClick={() => handleSelect(c.id)}
                        title={c.title}
                      >
                        {c.title}
                      </button>
                      <div className="conversation-actions">
                        <button
                          title="重命名"
                          onClick={() => {
                            setRenamingId(c.id);
                            setRenameValue(c.title);
                          }}
                        >
                          <EditIcon size={12} />
                        </button>
                        <button
                          title="删除对话"
                          onClick={() => setConfirmDeleteId(c.id)}
                        >
                          <TrashIcon size={12} />
                        </button>
                      </div>
                    </>
                  )}

                  {confirmDeleteId === c.id && (
                    <div className="conversation-confirm">
                      <span>删除「{c.title}」？</span>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="danger"
                      >
                        确认
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}>取消</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatConversationBar;
