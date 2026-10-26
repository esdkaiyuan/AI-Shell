import React, { useEffect, useState } from 'react';
import { CloseIcon, ZapIcon, PlusIcon, TrashIcon, EditIcon, PlayIcon, CopyIcon, CornerDownLeftIcon } from './Icons';
import { snippetStore, CommandSnippet } from '../snippets';
import { terminalBus } from '../terminalBus';
import './SnippetManager.css';

interface SnippetManagerProps {
  onClose: () => void;
}

type EditingState =
  | { mode: 'create' }
  | { mode: 'edit'; id: string }
  | null;

const SnippetManager: React.FC<SnippetManagerProps> = ({ onClose }) => {
  const [snippets, setSnippets] = useState<CommandSnippet[]>(snippetStore.getAll());
  const [editing, setEditing] = useState<EditingState>(null);
  const [formName, setFormName] = useState('');
  const [formCommand, setFormCommand] = useState('');
  const [formGroup, setFormGroup] = useState('自定义');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const unsubscribe = snippetStore.subscribe(setSnippets);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [onClose]);

  const filtered = query.trim()
    ? snippets.filter(
        s =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.command.toLowerCase().includes(query.toLowerCase()) ||
          s.group.toLowerCase().includes(query.toLowerCase())
      )
    : snippets;

  const startCreate = () => {
    setEditing({ mode: 'create' });
    setFormName('');
    setFormCommand('');
    setFormGroup('自定义');
  };

  const startEdit = (snippet: CommandSnippet) => {
    setEditing({ mode: 'edit', id: snippet.id });
    setFormName(snippet.name);
    setFormCommand(snippet.command);
    setFormGroup(snippet.group);
  };

  const handleSave = () => {
    if (!formName.trim() || !formCommand.trim()) {
      setStatusMessage('名称和命令都不能为空。');
      return;
    }
    if (editing?.mode === 'edit') {
      snippetStore.update(editing.id, {
        name: formName.trim(),
        command: formCommand.trim(),
        group: formGroup.trim() || '自定义',
      });
    } else {
      snippetStore.add(formName.trim(), formCommand.trim(), formGroup.trim() || '自定义');
    }
    setEditing(null);
    setStatusMessage(null);
  };

  const handleInsert = (command: string) => {
    const ok = terminalBus.insertToActive(command);
    setStatusMessage(ok ? '已插入到终端输入框。' : '没有活动终端，请先打开一个终端。');
  };

  const handleExecute = (command: string) => {
    const ok = terminalBus.runOnActive(command);
    setStatusMessage(ok ? '命令已执行。' : '没有活动终端，请先打开一个终端。');
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command).then(
      () => setStatusMessage('已复制到剪贴板。'),
      () => setStatusMessage('复制失败。')
    );
  };

  // 按分组归类展示
  const groups = filtered.reduce<Record<string, CommandSnippet[]>>((acc, s) => {
    (acc[s.group] = acc[s.group] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="snippet-overlay" onClick={onClose}>
      <div className="snippet-manager" onClick={e => e.stopPropagation()}>
        <div className="snippet-header">
          <div className="snippet-title">
            <ZapIcon size={16} />
            <span>快捷命令</span>
            <span className="snippet-count">{snippets.length}</span>
          </div>
          <div className="snippet-header-actions">
            <button className="snippet-btn primary" onClick={startCreate}>
              <PlusIcon size={14} />
              新建
            </button>
            <button className="snippet-btn icon" onClick={onClose} title="关闭 (Esc)">
              <CloseIcon size={14} />
            </button>
          </div>
        </div>

        <div className="snippet-toolbar">
          <input
            className="snippet-search"
            placeholder="搜索命令..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {statusMessage && (
          <div className="snippet-status" role="status">
            {statusMessage}
          </div>
        )}

        {editing && (
          <div className="snippet-form">
            <input
              placeholder="名称（如：查看日志）"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              autoFocus
            />
            <input
              placeholder="命令（如：tail -f app.log）"
              value={formCommand}
              onChange={e => setFormCommand(e.target.value)}
            />
            <input
              placeholder="分组"
              value={formGroup}
              onChange={e => setFormGroup(e.target.value)}
            />
            <div className="snippet-form-actions">
              <button className="snippet-btn primary" onClick={handleSave}>
                保存
              </button>
              <button className="snippet-btn" onClick={() => setEditing(null)}>
                取消
              </button>
            </div>
          </div>
        )}

        <div className="snippet-list">
          {filtered.length === 0 ? (
            <div className="snippet-empty">
              {query ? '没有匹配的命令' : '还没有快捷命令，点击「新建」添加'}
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="snippet-group">
                <div className="snippet-group-label">{group}</div>
                {items.map(snippet => (
                  <div key={snippet.id} className="snippet-item">
                    <div className="snippet-item-main">
                      <span className="snippet-item-name">{snippet.name}</span>
                      <code className="snippet-item-cmd" title={snippet.command}>
                        {snippet.command}
                      </code>
                    </div>
                    <div className="snippet-item-actions">
                      <button title="插入到终端" onClick={() => handleInsert(snippet.command)}>
                        <CornerDownLeftIcon size={13} />
                      </button>
                      <button title="执行" onClick={() => handleExecute(snippet.command)}>
                        <PlayIcon size={13} />
                      </button>
                      <button title="复制" onClick={() => handleCopy(snippet.command)}>
                        <CopyIcon size={13} />
                      </button>
                      <button title="编辑" onClick={() => startEdit(snippet)}>
                        <EditIcon size={13} />
                      </button>
                      <button
                        title="删除"
                        onClick={() => snippetStore.remove(snippet.id)}
                        className="danger"
                      >
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SnippetManager;
