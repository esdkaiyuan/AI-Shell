import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CloseIcon, SearchIcon, TrashIcon, CornerDownLeftIcon } from './Icons';
import './CommandHistory.css';

interface HistoryEntry {
  id: number;
  command: string;
  cwd: string;
  timestamp: number;
  exitCode: number;
}

interface CommandHistoryProps {
  onClose: () => void;
  /** Puts a command back on the prompt so the user can edit before running it. */
  onInsert: (command: string) => void;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  if (sameDay) return `今天 ${time}`;
  return `${date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} ${time}`;
};

/** A remote entry is stored as `ssh://host`; local ones keep their directory. */
const describeLocation = (cwd: string): { label: string; remote: boolean } => {
  if (!cwd) return { label: '本地', remote: false };
  if (cwd.startsWith('ssh://')) {
    return { label: cwd.slice('ssh://'.length) || '远程', remote: true };
  }
  return { label: cwd, remote: false };
};

const CommandHistory: React.FC<CommandHistoryProps> = ({ onClose, onInsert }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async (keyword: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = keyword.trim()
        ? await window.electronAPI.history.search(keyword.trim(), 200)
        : await window.electronAPI.history.get(200);
      setEntries(result ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  // Debounce the search so typing does not hammer the database.
  useEffect(() => {
    const timer = setTimeout(() => load(query), 180);
    return () => clearTimeout(timer);
  }, [query, load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const handleClear = async () => {
    try {
      await window.electronAPI.history.clear();
      setEntries([]);
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const grouped = useMemo(() => {
    const buckets = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const day = new Date(entry.timestamp).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const bucket = buckets.get(day);
      if (bucket) bucket.push(entry);
      else buckets.set(day, [entry]);
    }
    return [...buckets.entries()];
  }, [entries]);

  return (
    <div className="command-history-overlay" onClick={onClose}>
      <div
        className="command-history"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-history-title"
        onClick={event => event.stopPropagation()}
      >
        <div className="command-history-header">
          <h2 id="command-history-title">命令历史</h2>
          <span className="command-history-count">{entries.length} 条</span>
          <button className="close-btn" aria-label="关闭命令历史" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="command-history-toolbar">
          <div className="command-history-search">
            <SearchIcon size={14} />
            <input
              aria-label="搜索命令历史"
              placeholder="搜索命令或目录"
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          {confirmClear ? (
            <div className="command-history-confirm">
              <span>清空全部历史？</span>
              <button className="btn-secondary" onClick={() => setConfirmClear(false)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleClear}>
                清空
              </button>
            </div>
          ) : (
            <button
              className="btn-secondary"
              aria-label="清空命令历史"
              disabled={entries.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <TrashIcon size={14} />
              <span>清空</span>
            </button>
          )}
        </div>

        {error ? (
          <div className="command-history-error" role="alert">
            读取历史失败：{error}
          </div>
        ) : null}

        <div className="command-history-list" aria-live="polite" aria-label="命令历史列表">
          {loading ? (
            <div className="command-history-hint">正在读取历史…</div>
          ) : entries.length === 0 ? (
            <div className="command-history-hint">
              {query.trim() ? '没有匹配的命令' : '还没有命令历史'}
            </div>
          ) : (
            grouped.map(([day, items]) => (
              <section key={day} className="command-history-group">
                <h3 className="command-history-day">{day}</h3>
                {items.map(entry => {
                  const location = describeLocation(entry.cwd);
                  return (
                    <div key={entry.id} className="command-history-row">
                      <button
                        className="command-history-command"
                        aria-label={`把命令 ${entry.command} 填入终端`}
                        onClick={() => onInsert(entry.command)}
                      >
                        <code>{entry.command}</code>
                        <span className="command-history-meta">
                          <span className="command-history-time">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                          <span
                            className={
                              location.remote
                                ? 'command-history-remote'
                                : 'command-history-cwd'
                            }
                            title={location.label}
                          >
                            {location.remote ? `远程 ${location.label}` : location.label}
                          </span>
                        </span>
                      </button>
                      <button
                        className="command-history-insert"
                        aria-label={`把命令 ${entry.command} 填入终端`}
                        title="填入终端"
                        onClick={() => onInsert(entry.command)}
                      >
                        <CornerDownLeftIcon size={14} />
                      </button>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandHistory;
