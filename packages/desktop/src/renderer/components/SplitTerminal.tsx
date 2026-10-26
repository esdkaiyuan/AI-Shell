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
  /** 第一个窗格占比 0.2 ~ 0.8 */
  splitRatio?: number;
  onSplitRatioChange?: (ratio: number) => void;
  onSplitRatioCommit?: (ratio: number) => void;
}

const SplitTerminal: React.FC<SplitTerminalProps> = ({
  panes,
  layout,
  showSearch,
  onSearchClose,
  splitRatio = 0.5,
  onSplitRatioChange,
  onSplitRatioCommit,
}) => {
  const draggingRef = React.useRef(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startRatioRef = React.useRef(0.5);
  const currentRatioRef = React.useRef(0.5);

  const handleResizerMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    draggingRef.current = true;
    startRatioRef.current = splitRatio;
    currentRatioRef.current = splitRatio;
    const startPos = layout === 'horizontal' ? event.clientX : event.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const total = layout === 'horizontal' ? rect.width : rect.height;
      const currentPos = layout === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const next = Math.min(
        Math.max(startRatioRef.current + (currentPos - startPos) / Math.max(total, 1), 0.2),
        0.8
      );
      currentRatioRef.current = next;
      onSplitRatioChange?.(next);
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.dispatchEvent(new Event('resize'));
      onSplitRatioCommit?.(currentRatioRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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

  // 分屏布局（当前支持 2 窗格，中间拖动调比例）
  const [first, second] = panes;
  const firstStyle =
    layout === 'horizontal'
      ? { width: `${splitRatio * 100}%` }
      : { height: `${splitRatio * 100}%` };

  return (
    <div ref={containerRef} className={`split-terminal ${layout}`}>
      <div className="split-pane" style={firstStyle}>
        <div className="split-pane-header">
          <span className="split-pane-title">{first.title}</span>
        </div>
        <div className="split-pane-content">
          <Terminal
            terminalId={first.terminalId}
            title={first.title}
            type={first.type}
            sshConfig={first.sshConfig}
            showSearch={showSearch}
            onSearchClose={onSearchClose}
          />
        </div>
      </div>

      <div
        className={`split-resizer ${layout === 'horizontal' ? 'vertical' : 'horizontal'}`}
        onMouseDown={handleResizerMouseDown}
        title="拖动调整窗格比例"
      />

      <div className="split-pane" style={{ flex: 1 }}>
        <div className="split-pane-header">
          <span className="split-pane-title">{second.title}</span>
        </div>
        <div className="split-pane-content">
          <Terminal
            terminalId={second.terminalId}
            title={second.title}
            type={second.type}
            sshConfig={second.sshConfig}
          />
        </div>
      </div>
    </div>
  );
};

export default SplitTerminal;
