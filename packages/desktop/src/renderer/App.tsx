import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import SplitTerminal from './components/SplitTerminal';
import AIChat from './components/AIChat';
import AIAssistantPanel from './components/AIAssistantPanel';
import FileExplorer from './components/FileExplorer';
import Settings from './components/Settings';
import SystemMonitor from './components/SystemMonitor';
import SSHManager from './components/SSHManager';
import SessionManager from './components/SessionManager';
import { terminalBus } from './terminalBus';
import {
  PlusIcon,
  FolderIcon,
  SaveIcon,
  CopyIcon,
  PasteIcon,
  SearchIcon,
  SplitIcon,
  MaximizeIcon,
  TerminalIcon,
  AIIcon,
  SettingsIcon,
  HardDriveIcon,
  GlobeIcon,
  CloseIcon,
  WifiIcon,
  KeyboardIcon,
  MonitorIcon,
} from './components/Icons';
import './App.css';

type View = 'terminal' | 'explorer' | 'ai' | 'settings';
type PanelPosition = 'right' | 'bottom';

interface SSHConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  config?: Record<string, unknown>;
}

interface TerminalTab {
  id: string;
  title: string;
  type: 'local' | 'ssh';
  host?: string;
  sshConfig?: SSHConfig;
  showSearch?: boolean;
  split?: {
    enabled: boolean;
    layout: 'horizontal' | 'vertical';
    panes: Array<{
      id: string;
      terminalId: string;
      title: string;
      type: 'local' | 'ssh';
      sshConfig?: SSHConfig;
    }>;
  };
}

interface SavedSession {
  terminals: TerminalTab[];
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('terminal');
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: '1', title: 'Local', type: 'local' },
  ]);
  const [activeTerminal, setActiveTerminal] = useState('1');
  const [showAIPanel, setShowAIPanel] = useState(true); // AI 面板显示状态
  const [aiPanelPosition, setAIPanelPosition] = useState<PanelPosition>('right'); // AI 面板位置
  const [showSSHManager, setShowSSHManager] = useState(false); // SSH 管理器显示状态
  const [showSessionManager, setShowSessionManager] = useState(false); // 会话管理器显示状态
  const [systemStats, setSystemStats] = useState({
    cpu: 0,
    memory: 0,
    network: 0,
    disk: 0,
  });

  // 当活动终端切换时，通知 terminalBus
  useEffect(() => {
    terminalBus.setActive(activeTerminal);
  }, [activeTerminal]);

  // 模拟系统监控数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        network: Math.random() * 100,
        disk: Math.random() * 100,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const addTerminal = () => {
    const newId = String(Date.now());
    setTerminals([...terminals, { id: newId, title: `Terminal ${terminals.length + 1}`, type: 'local' }]);
    setActiveTerminal(newId);
  };

  const addSSHTerminal = (config: SSHConfig) => {
    const newId = String(Date.now());
    setTerminals([
      ...terminals,
      {
        id: newId,
        title: config.name,
        type: 'ssh',
        host: config.host,
        sshConfig: config,
      },
    ]);
    setActiveTerminal(newId);
  };

  const closeTerminal = (id: string) => {
    const filtered = terminals.filter(t => t.id !== id);
    setTerminals(filtered);
    if (activeTerminal === id && filtered.length > 0) {
      setActiveTerminal(filtered[0].id);
    }
  };

  const toggleSearch = () => {
    setTerminals(terminals.map(t =>
      t.id === activeTerminal ? { ...t, showSearch: !t.showSearch } : t
    ));
  };

  const closeSearch = () => {
    setTerminals(terminals.map(t =>
      t.id === activeTerminal ? { ...t, showSearch: false } : t
    ));
  };

  const handleLoadSession = (session: SavedSession) => {
    // 重新生成终端 ID（避免冲突）
    const newTerminals = session.terminals.map(t => ({
      ...t,
      id: String(Date.now() + Math.random()),
    }));
    setTerminals(newTerminals);
    setActiveTerminal(newTerminals[0]?.id || '1');
  };

  const toggleSplit = () => {
    const activeTab = terminals.find(t => t.id === activeTerminal);
    if (!activeTab) return;

    if (activeTab.split?.enabled) {
      // 关闭分屏
      setTerminals(terminals.map(t =>
        t.id === activeTerminal ? { ...t, split: undefined } : t
      ));
    } else {
      // 开启分屏（水平分屏，两个窗格）
      const newTerminalId = String(Date.now());
      setTerminals(terminals.map(t =>
        t.id === activeTerminal
          ? {
              ...t,
              split: {
                enabled: true,
                layout: 'horizontal',
                panes: [
                  {
                    id: 'pane-1',
                    terminalId: t.id,
                    title: t.title,
                    type: t.type,
                    sshConfig: t.sshConfig,
                  },
                  {
                    id: 'pane-2',
                    terminalId: newTerminalId,
                    title: 'Terminal',
                    type: 'local',
                  },
                ],
              },
            }
          : t
      ));
    }
  };

  return (
    <div className="app">
      {/* 顶部工具栏 */}
      <div className="app-toolbar">
        <div className="toolbar-brand" title="署名 esdkaiyuan">
          <span className="toolbar-brand-mark">AS</span>
          <span className="toolbar-brand-text">AI Shell</span>
          <span className="toolbar-signature">esdkaiyuan</span>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="toolbar-button" title="新建本地终端" onClick={addTerminal}>
            <PlusIcon size={16} />
          </button>
          <button className="toolbar-button" title="SSH 连接" onClick={() => setShowSSHManager(true)}>
            <GlobeIcon size={16} />
          </button>
          <button className="toolbar-button" title="打开会话" onClick={() => setShowSessionManager(true)}>
            <FolderIcon size={16} />
          </button>
          <button className="toolbar-button" title="保存会话" onClick={() => setShowSessionManager(true)}>
            <SaveIcon size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="toolbar-button" title="复制">
            <CopyIcon size={16} />
          </button>
          <button className="toolbar-button" title="粘贴">
            <PasteIcon size={16} />
          </button>
          <button className="toolbar-button" title="查找" onClick={toggleSearch}>
            <SearchIcon size={16} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="toolbar-button" title="分屏" onClick={toggleSplit}>
            <SplitIcon size={16} />
          </button>
          <button className="toolbar-button" title="全屏">
            <MaximizeIcon size={16} />
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="app-main">
        {/* 左侧边栏 */}
        <div className="app-sidebar">
          <button
            className={`sidebar-button ${currentView === 'terminal' ? 'active' : ''}`}
            onClick={() => setCurrentView('terminal')}
            title="终端"
          >
            <TerminalIcon size={20} />
          </button>

          <button
            className={`sidebar-button ${currentView === 'explorer' ? 'active' : ''}`}
            onClick={() => setCurrentView('explorer')}
            title="资源管理器"
          >
            <HardDriveIcon size={20} />
          </button>

          <button
            className={`sidebar-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => {
              if (currentView === 'terminal') {
                // 在终端视图时，切换 AI 面板显示
                setShowAIPanel(!showAIPanel);
              } else {
                // 在其他视图时，切换到独立 AI 视图
                setCurrentView('ai');
              }
            }}
            title="AI助手"
          >
            <AIIcon size={20} />
          </button>

          <button
            className={`sidebar-button ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
            title="设置"
          >
            <SettingsIcon size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="app-content">
          {currentView === 'terminal' && (
            <div className={`terminal-view-container ${showAIPanel ? `with-ai-${aiPanelPosition}` : ''}`}>
              <div className="terminal-view">
                {/* 终端标签栏 */}
                <div className="terminal-tabs">
                  {terminals.map(term => (
                    <button
                      key={term.id}
                      className={`terminal-tab ${activeTerminal === term.id ? 'active' : ''}`}
                      onClick={() => setActiveTerminal(term.id)}
                    >
                      <span className="terminal-tab-icon">
                        {term.type === 'ssh' ? <GlobeIcon size={14} /> : <TerminalIcon size={14} />}
                      </span>
                      <span className="terminal-tab-title">{term.title}</span>
                      {term.host && (
                        <span className="terminal-tab-host">@{term.host}</span>
                      )}
                      <button
                        className="terminal-tab-close"
                        onClick={e => {
                          e.stopPropagation();
                          closeTerminal(term.id);
                        }}
                        title="关闭"
                      >
                        <CloseIcon size={12} />
                      </button>
                    </button>
                  ))}
                  <button className="add-tab-btn" onClick={addTerminal} title="新建终端">
                    +
                  </button>
                </div>

                {/* 终端容器 */}
                <div className="terminal-container">
                  {terminals.map(term => (
                    <div
                      key={term.id}
                      style={{
                        display: activeTerminal === term.id ? 'block' : 'none',
                        height: '100%',
                      }}
                    >
                      {term.split?.enabled ? (
                        <SplitTerminal
                          panes={term.split.panes}
                          layout={term.split.layout}
                          showSearch={term.showSearch}
                          onSearchClose={closeSearch}
                        />
                      ) : (
                        <Terminal
                          terminalId={term.id}
                          title={term.title}
                          type={term.type}
                          sshConfig={term.sshConfig}
                          showSearch={term.showSearch}
                          onSearchClose={closeSearch}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 助手面板 */}
              {showAIPanel && (
                <AIAssistantPanel
                  position={aiPanelPosition}
                  onPositionChange={setAIPanelPosition}
                />
              )}
            </div>
          )}

          {currentView === 'ai' && <AIChat />}
          {currentView === 'explorer' && <FileExplorer />}
          {currentView === 'settings' && <Settings />}
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="app-statusbar">
        <div className="statusbar-section">
          <div className="statusbar-item">
            <span className="statusbar-icon">
              <WifiIcon size={14} />
            </span>
            <span>已连接</span>
          </div>
          <div className="statusbar-item">
            <span className="statusbar-icon">
              <KeyboardIcon size={14} />
            </span>
            <span>UTF-8</span>
          </div>
          <div className="statusbar-item">
            <span className="statusbar-icon">
              <MonitorIcon size={14} />
            </span>
            <span>{terminals.find(t => t.id === activeTerminal)?.title || 'Local'}</span>
          </div>
        </div>

        <div className="statusbar-section">
          <div className="statusbar-item statusbar-signature" title="署名">
            <span>署名</span>
            <strong>esdkaiyuan</strong>
          </div>
          <SystemMonitor stats={systemStats} />
        </div>
      </div>

      {/* SSH 管理器对话框 */}
      {showSSHManager && (
        <SSHManager
          onClose={() => setShowSSHManager(false)}
          onConnect={addSSHTerminal}
        />
      )}

      {/* 会话管理器对话框 */}
      {showSessionManager && (
        <SessionManager
          currentTerminals={terminals}
          activeTerminal={activeTerminal}
          onClose={() => setShowSessionManager(false)}
          onLoad={handleLoadSession}
        />
      )}
    </div>
  );
};

export default App;
