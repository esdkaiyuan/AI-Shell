import React from 'react';
import { TerminalIcon, AIIcon, SettingsIcon } from './Icons';
import './Sidebar.css';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: 'terminal' | 'ai' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>AI Shell</h2>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'terminal' ? 'active' : ''}`}
          onClick={() => onViewChange('terminal')}
        >
          <span className="icon">
            <TerminalIcon size={18} />
          </span>
          <span>Terminal</span>
        </button>

        <button
          className={`nav-item ${currentView === 'ai' ? 'active' : ''}`}
          onClick={() => onViewChange('ai')}
        >
          <span className="icon">
            <AIIcon size={18} />
          </span>
          <span>AI Chat</span>
        </button>

        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          <span className="icon">
            <SettingsIcon size={18} />
          </span>
          <span>Settings</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="version">v0.1.0</div>
      </div>
    </div>
  );
};

export default Sidebar;
