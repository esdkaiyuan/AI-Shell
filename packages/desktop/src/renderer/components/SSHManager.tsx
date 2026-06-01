import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, GlobeIcon, CheckIcon } from './Icons';
import './SSHManager.css';

interface SSHConfig {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  hasPassword?: boolean;
  hasPrivateKey?: boolean;
  hasPassphrase?: boolean;
}

interface SSHManagerProps {
  onClose: () => void;
  onConnect: (config: SSHConfig) => void;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const SSHManager: React.FC<SSHManagerProps> = ({ onClose, onConnect }) => {
  const [configs, setConfigs] = useState<SSHConfig[]>([]);
  const [editing, setEditing] = useState<SSHConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [authType, setAuthType] = useState<'password' | 'key'>('password');
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<SSHConfig>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    passphrase: '',
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const list = await window.electronAPI.ssh.listConfigs();
      setConfigs(list);
    } catch (error) {
      console.error('Failed to load SSH configs:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.username) {
      setNotice({ type: 'error', text: '请填写必填项：名称、主机、用户名。' });
      return;
    }

    try {
      const payload: SSHConfig = {
        ...formData,
        port: Number.isFinite(formData.port) ? formData.port : 22,
        password:
          authType === 'password'
            ? formData.password || (editing?.hasPassword ? undefined : '')
            : '',
        privateKey:
          authType === 'key'
            ? formData.privateKey || (editing?.hasPrivateKey ? undefined : '')
            : '',
        passphrase:
          authType === 'key'
            ? formData.passphrase || (editing?.hasPassphrase ? undefined : '')
            : '',
      };
      await window.electronAPI.ssh.saveConfig(payload);
      await loadConfigs();
      setShowForm(false);
      setEditing(null);
      resetForm();
      setNotice(null);
    } catch (error: unknown) {
      setNotice({ type: 'error', text: `保存失败：${getErrorMessage(error)}` });
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await window.electronAPI.ssh.deleteConfig(name);
      await loadConfigs();
      setPendingDelete(null);
    } catch (error: unknown) {
      setNotice({ type: 'error', text: `删除失败：${getErrorMessage(error)}` });
    }
  };

  const handleEdit = (config: SSHConfig) => {
    setEditing(config);
    setFormData({ ...config });
    setAuthType(config.hasPrivateKey || config.privateKey ? 'key' : 'password');
    setShowForm(true);
    setNotice(null);
  };

  const handleNew = () => {
    setEditing(null);
    resetForm();
    setShowForm(true);
    setNotice(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKey: '',
      passphrase: '',
    });
    setAuthType('password');
  };

  const handleConnect = (config: SSHConfig) => {
    onConnect(config);
    onClose();
  };

  return (
    <div className="ssh-manager-overlay" onClick={onClose}>
      <div className="ssh-manager" onClick={e => e.stopPropagation()}>
        <div className="ssh-manager-header">
          <h2>SSH 连接管理</h2>
          <button className="close-btn" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="ssh-manager-content">
          {notice && (
            <div className={`ssh-notice ${notice.type}`} role="status">
              {notice.text}
            </div>
          )}
          {pendingDelete && (
            <div className="ssh-confirm" role="alert">
              <span>确定删除连接 "{pendingDelete}" 吗？</span>
              <div className="ssh-confirm-actions">
                <button className="btn-secondary" onClick={() => setPendingDelete(null)}>
                  取消
                </button>
                <button className="btn-danger" onClick={() => handleDelete(pendingDelete)}>
                  删除
                </button>
              </div>
            </div>
          )}

          {!showForm ? (
            <>
              <div className="ssh-list-header">
                <h3>已保存的连接</h3>
                <button className="btn-primary" onClick={handleNew}>
                  <PlusIcon size={14} />
                  <span>新建连接</span>
                </button>
              </div>

              <div className="ssh-list">
                {configs.length === 0 ? (
                  <div className="empty-state">
                    <GlobeIcon size={48} />
                    <p>还没有保存的 SSH 连接</p>
                    <button className="btn-primary" onClick={handleNew}>
                      创建第一个连接
                    </button>
                  </div>
                ) : (
                  configs.map(config => (
                    <div key={config.name} className="ssh-item">
                      <div className="ssh-item-icon">
                        <GlobeIcon size={20} />
                      </div>
                      <div className="ssh-item-info">
                        <div className="ssh-item-name">{config.name}</div>
                        <div className="ssh-item-details">
                          {config.username}@{config.host}:{config.port}
                        </div>
                        <div className="ssh-item-auth">
                          {config.hasPrivateKey || config.privateKey
                            ? config.hasPassphrase || config.passphrase
                              ? '密钥认证 / 已保存密钥密码'
                              : '密钥认证'
                            : config.hasPassword || config.password
                              ? '密码认证'
                              : '连接时输入认证'}
                        </div>
                      </div>
                      <div className="ssh-item-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => handleConnect(config)}
                        >
                          连接
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleEdit(config)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setPendingDelete(config.name)}
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
            <div className="ssh-form">
              <h3>{editing ? '编辑连接' : '新建连接'}</h3>

              <div className="form-group">
                <label>连接名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：生产服务器"
                  disabled={!!editing}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>主机地址 *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={e => setFormData({ ...formData, host: e.target.value })}
                    placeholder="例如：192.168.1.100"
                  />
                </div>
                <div className="form-group">
                  <label>端口</label>
                  <input
                    type="number"
                    value={formData.port}
                    min={1}
                    max={65535}
                    onChange={e =>
                      setFormData({ ...formData, port: parseInt(e.target.value, 10) || 22 })
                    }
                    placeholder="22"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>用户名 *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="例如：root"
                />
              </div>

              <div className="form-group">
                <label>认证方式</label>
                <div className="auth-type-selector">
                  <button
                    className={`auth-type-btn ${authType === 'password' ? 'active' : ''}`}
                    onClick={() => setAuthType('password')}
                  >
                    密码
                  </button>
                  <button
                    className={`auth-type-btn ${authType === 'key' ? 'active' : ''}`}
                    onClick={() => setAuthType('key')}
                  >
                    密钥
                  </button>
                </div>
              </div>

              {authType === 'password' ? (
                <div className="form-group">
                  <label>密码</label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editing?.hasPassword ? '留空保留已保存密码' : '留空则连接时输入'}
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>私钥路径</label>
                    <input
                      type="text"
                      value={formData.privateKey || ''}
                      onChange={e => setFormData({ ...formData, privateKey: e.target.value })}
                      placeholder={editing?.hasPrivateKey ? '留空保留已保存私钥路径' : '例如：~/.ssh/id_rsa'}
                    />
                  </div>
                  <div className="form-group">
                    <label>密钥密码（可选）</label>
                    <input
                      type="password"
                      value={formData.passphrase || ''}
                      onChange={e => setFormData({ ...formData, passphrase: e.target.value })}
                      placeholder={editing?.hasPassphrase ? '留空保留已保存密钥密码' : '如果密钥有密码保护'}
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setShowForm(false)}>
                  取消
                </button>
                <button className="btn-primary" onClick={handleSave}>
                  <CheckIcon size={14} />
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

export default SSHManager;
