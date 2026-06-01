import React from 'react';
import './SystemMonitor.css';

interface SystemStats {
  cpu: number;
  memory: number;
  network: number;
  disk: number;
}

interface SystemMonitorProps {
  stats: SystemStats;
}

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
        <span className="monitor-label">NET</span>
        <div className="monitor-bar">
          <div
            className={`monitor-bar-fill ${getBarClass(stats.network)}`}
            style={{ width: `${stats.network}%` }}
          />
        </div>
        <span className="monitor-value">{formatValue(stats.network)}</span>
      </div>

      <div className="monitor-item">
        <span className="monitor-label">DISK</span>
        <div className="monitor-bar">
          <div
            className={`monitor-bar-fill ${getBarClass(stats.disk)}`}
            style={{ width: `${stats.disk}%` }}
          />
        </div>
        <span className="monitor-value">{formatValue(stats.disk)}</span>
      </div>
    </div>
  );
};

export default SystemMonitor;
