import React from 'react';
import Terminal from './Terminal';
import './SplitTerminal.css';

interface SplitPane {
  id: string;
  terminalId: string;
  title: string;
  type: 'local' | 'ssh';
  sshConfig?: {
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  };
}

interface SplitTerminalProps {
  panes: SplitPane[];
  layout: 'horizontal' | 'vertical';
  showSearch?: boolean;
  onSearchClose?: () => void;
}

const SplitTerminal: React.FC<SplitTerminalProps> = ({
  panes,
  layout,
  showSearch,
  onSearchClose,
}) => {
  if (panes.length === 0) {
    return <div className="split-terminal-empty">没有终端</div>;
  }

  if (panes.length === 1) {
    // 单个终端，不分屏
    const pane = panes[0];
    return (
      <Terminal
        terminalId={pane.terminalId}
        title={pane.title}
        type={pane.type}
        sshConfig={pane.sshConfig}
        showSearch={showSearch}
        onSearchClose={onSearchClose}
      />
    );
  }

  // 分屏布局
  return (
    <div className={`split-terminal ${layout}`}>
      {panes.map((pane, index) => (
        <div key={pane.id} className="split-pane">
          <div className="split-pane-header">
            <span className="split-pane-title">{pane.title}</span>
          </div>
          <div className="split-pane-content">
            <Terminal
              terminalId={pane.terminalId}
              title={pane.title}
              type={pane.type}
              sshConfig={pane.sshConfig}
              showSearch={showSearch && index === 0}
              onSearchClose={onSearchClose}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SplitTerminal;
