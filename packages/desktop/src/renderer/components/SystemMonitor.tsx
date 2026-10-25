import React from 'react';
import './SystemMonitor.css';

interface SystemStats {
  cpu: number;
  memory: number;
  uptimeSeconds: number;
  processMemoryMB: number;
}

interface SystemMonitorProps {
  stats: SystemStats;
}

// 运行时长格式化：≥1 天显示 X天X小时X分，<1 天显示 X小时X分，<1 小时显示 X分
const formatUptime = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时${minutes}分`;
  if (hours > 0) return `${hours}小时${minutes}分`;
  return `${minutes}分`;
};

const SystemMonitor: React.FC<SystemMonitorProps> = ({ stats }) => {
  const getBarClass = (value: number): string => {
    if (value >= 80) return 'critical';
    if (value >= 60) return 'high';
    return '';
  };

  const formatValue = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="system-monitor">
      <div className="monitor-item">
        <span className="monitor-label">CPU</span>
        <div className="monitor-bar">
          <div
            className={`monitor-bar-fill ${getBarClass(stats.cpu)}`}
            style={{ width: `${stats.cpu}%` }}
          />
        </div>
        <span className="monitor-value">{formatValue(stats.cpu)}</span>
      </div>

      <div className="monitor-item">
        <span className="monitor-label">MEM</span>
        <div className="monitor-bar">
          <div
            className={`monitor-bar-fill ${getBarClass(stats.memory)}`}
            style={{ width: `${stats.memory}%` }}
          />
        </div>
        <span className="monitor-value">{formatValue(stats.memory)}</span>
      </div>

      <div className="monitor-item">
        <span className="monitor-label">运行</span>
        <span className="monitor-text">{formatUptime(stats.uptimeSeconds)}</span>
      </div>

      <div className="monitor-item">
        <span className="monitor-label">进程内存</span>
        <span className="monitor-text">{`${Math.round(stats.processMemoryMB)} MB`}</span>
      </div>
    </div>
  );
};

export default SystemMonitor;
