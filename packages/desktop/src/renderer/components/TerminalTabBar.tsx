import React, { useEffect, useRef, useState } from 'react';
import { TerminalIcon, GlobeIcon, CloseIcon, PlusIcon } from './Icons';
import './TerminalTabBar.css';

export interface TabItem {
  id: string;
  title: string;
  type: 'local' | 'ssh';
  host?: string;
}

interface TerminalTabBarProps {
  tabs: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onReorder: (fromId: string, toId: string) => void;
}

/**
 * 终端标签栏：双击重命名、拖拽调整顺序。
 * 用 div + role="button" 而非嵌套 button（关闭按钮嵌在 button 里是无效 HTML）。
 */
const TerminalTabBar: React.FC<TerminalTabBarProps> = ({
  tabs,
  activeId,
  onSelect,
  onClose,
  onCreate,
  onRename,
  onReorder,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (tab: TabItem) => {
    setEditingId(tab.id);
    setEditValue(tab.title);
  };

  const commitRename = () => {
    if (editingId) {
      const trimmed = editValue.trim();
      if (trimmed) onRename(editingId, trimmed);
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 需要设置数据才会触发拖拽
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragId && dragId !== targetId) {
      onReorder(dragId, targetId);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  return (
    <div className="terminal-tabs">
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`terminal-tab ${activeId === tab.id ? 'active' : ''} ${
            dragId === tab.id ? 'dragging' : ''
          } ${dragOverId === tab.id ? 'drag-over' : ''}`}
          role="button"
          tabIndex={0}
          draggable={editingId !== tab.id}
          onClick={() => !editingId && onSelect(tab.id)}
          onDoubleClick={() => startRename(tab)}
          onKeyDown={e => {
            if (e.key === 'Enter' && editingId !== tab.id) {
              e.preventDefault();
              onSelect(tab.id);
            }
          }}
          onDragStart={e => handleDragStart(e, tab.id)}
          onDragOver={e => handleDragOver(e, tab.id)}
          onDrop={e => handleDrop(e, tab.id)}
          onDragEnd={handleDragEnd}
          title="双击重命名，拖拽调整顺序"
        >
          <span className="terminal-tab-icon">
            {tab.type === 'ssh' ? <GlobeIcon size={14} /> : <TerminalIcon size={14} />}
          </span>

          {editingId === tab.id ? (
            <input
              ref={inputRef}
              className="terminal-tab-rename"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditValue('');
                }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="terminal-tab-title">{tab.title}</span>
          )}

          {tab.host && <span className="terminal-tab-host">@{tab.host}</span>}

          <span
            className="terminal-tab-close"
            onClick={e => {
              e.stopPropagation();
              onClose(tab.id);
            }}
            role="button"
            title="关闭"
          >
            <CloseIcon size={12} />
          </span>
        </div>
      ))}
      <button className="add-tab-btn" onClick={onCreate} title="新建终端">
        <PlusIcon size={14} />
      </button>
    </div>
  );
};

export default TerminalTabBar;
