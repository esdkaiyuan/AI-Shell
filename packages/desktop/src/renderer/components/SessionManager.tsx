import React, { useState, useEffect } from 'react';
import { CloseIcon, SaveIcon, FolderIcon } from './Icons';
import './SessionManager.css';

interface Session {
  name: string;
  terminals: Array<{
    id: string;
    title: string;
    type: 'local' | 'ssh';
    host?: string;
    sshConfig?: {
      name: string;
      host: string;
      port: number;
      username: string;
      password?: string;
      privateKey?: string;
      passphrase?: string;
    };
  }>;
  activeTerminal: string;
  savedAt: string;
}

interface SessionManagerProps {
  currentTerminals: Session['terminals'];
  activeTerminal: string;
  onClose: () => void;
  onLoad: (session: Session) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  currentTerminals,
  activeTerminal,
  onClose,
  onLoad,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [sessionName, setSessionName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    text: string;
    confirmLabel: string;
    run: () => void;
  } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    try {
      const saved = localStorage.getItem('terminal-sessions');
      if (saved) {
        setSessions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const saveSessions = (newSessions: Session[]) => {
    try {
      localStorage.setItem('terminal-sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Failed to save sessions:', error);
      setNotice('保存失败，请检查浏览器本地存储是否可用。');
    }
  };

  const handleSave = () => {
    if (!sessionName.trim()) {
      setNotice('请输入会话名称。');
      return;
    }

    const newSession: Session = {
      name: sessionName.trim(),
      terminals: currentTerminals.map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        host: t.host,
        sshConfig: t.sshConfig,
      })),
      activeTerminal,
      savedAt: new Date().toISOString(),
    };

    const existing = sessions.findIndex(s => s.name === newSession.name);
    let newSessions: Session[];

    if (existing >= 0) {
      setPendingAction({
        text: `会话 "${newSession.name}" 已存在，是否覆盖？`,
        confirmLabel: '覆盖',
        run: () => {
          const updatedSessions = [...sessions];
          updatedSessions[existing] = newSession;
          saveSessions(updatedSessions);
          setMode('list');
          setSessionName('');
          setNotice(null);
          setPendingAction(null);
        },
      });
      return;
    } else {
      newSessions = [...sessions, newSession];
    }

    saveSessions(newSessions);
    setMode('list');
    setSessionName('');
    setNotice(null);
  };

  const handleLoad = (session: Session) => {
    setPendingAction({
      text: `加载会话 "${session.name}" 将关闭当前所有终端，是否继续？`,
      confirmLabel: '加载',
      run: () => {
        onLoad(session);
        onClose();
      },
    });
  };

  const handleDelete = (name: string) => {
    setPendingAction({
      text: `确定删除会话 "${name}" 吗？`,
      confirmLabel: '删除',
      run: () => {
        const newSessions = sessions.filter(s => s.name !== name);
        saveSessions(newSessions);
        setPendingAction(null);
      },
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="session-manager-overlay" onClick={onClose}>
      <div className="session-manager" onClick={e => e.stopPropagation()}>
        <div className="session-manager-header">
          <h2>会话管理</h2>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="session-manager-content">
          {notice && (
            <div className="session-notice" role="status">
              {notice}
            </div>
          )}
          {pendingAction && (
            <div className="session-confirm" role="alert">
              <span>{pendingAction.text}</span>
              <div className="session-confirm-actions">
                <button className="btn-secondary" onClick={() => setPendingAction(null)}>
                  取消
                </button>
                <button className="btn-danger" onClick={pendingAction.run}>
                  {pendingAction.confirmLabel}
                </button>
              </div>
            </div>
          )}

          {mode === 'list' ? (
            <>
              <div className="session-actions">
                <button className="btn-primary" onClick={() => { setMode('save'); setNotice(null); }}>
                  <SaveIcon size={14} />
                  <span>保存当前会话</span>
                </button>
              </div>

              <div className="session-list">
                {sessions.length === 0 ? (
                  <div className="empty-state">
                    <FolderIcon size={48} />
                    <p>还没有保存的会话</p>
                    <button className="btn-primary" onClick={() => { setMode('save'); setNotice(null); }}>
                      保存当前会话
                    </button>
                  </div>
                ) : (
                  sessions.map(session => (
                    <div key={session.name} className="session-item">
                      <div className="session-item-icon">
                        <FolderIcon size={20} />
                      </div>
                      <div className="session-item-info">
                        <div className="session-item-name">{session.name}</div>
                        <div className="session-item-details">
                          {session.terminals.length} 个终端 · {formatDate(session.savedAt)}
                        </div>
                        <div className="session-item-terminals">
                          {session.terminals.map((t, idx) => (
                            <span key={idx} className="terminal-badge">
                              {t.type === 'ssh' ? '🌐' : '💻'} {t.title}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="session-item-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => handleLoad(session)}
                        >
                          加载
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(session.name)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="session-save-form">
              <h3>保存当前会话</h3>
              <p className="session-save-hint">
                当前有 {currentTerminals.length} 个终端将被保存
              </p>

              <div className="form-group">
                <label>会话名称</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={e => setSessionName(e.target.value)}
                  placeholder="例如：开发环境"
                  autoFocus
                />
              </div>

              <div className="terminal-preview">
                {currentTerminals.map(t => (
                  <div key={t.id} className="terminal-preview-item">
                    <span className="terminal-preview-icon">
                      {t.type === 'ssh' ? '🌐' : '💻'}
                    </span>
                    <span className="terminal-preview-title">{t.title}</span>
                    {t.host && <span className="terminal-preview-host">@{t.host}</span>}
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setMode('list')}>
                  取消
                </button>
                <button className="btn-primary" onClick={handleSave}>
                  <SaveIcon size={14} />
                  <span>保存</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
