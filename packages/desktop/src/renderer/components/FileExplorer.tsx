import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRightIcon,
  CopyIcon,
  FileIcon,
  FolderIcon,
  HardDriveIcon,
  HomeIcon,
  RefreshIcon,
  TerminalIcon,
} from './Icons';
import { terminalBus } from '../terminalBus';
import './FileExplorer.css';

type RootMode = 'workspace' | 'home';

interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  hidden: boolean;
}

interface ExplorerNodeState {
  expanded: boolean;
  loading: boolean;
  error?: string;
  children?: FileEntry[];
}

const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const getDisplayName = (pathValue: string): string => {
  const normalized = pathValue.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || pathValue;
};

const FileExplorer: React.FC = () => {
  const [rootMode, setRootMode] = useState<RootMode>('workspace');
  const [rootPath, setRootPath] = useState('');
  const [nodes, setNodes] = useState<Record<string, ExplorerNodeState>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const rootName = useMemo(() => {
    if (!rootPath) return '加载中...';
    return rootMode === 'workspace' ? getDisplayName(rootPath) : 'Home';
  }, [rootMode, rootPath]);

  useEffect(() => {
    loadRoot(rootMode);
  }, [rootMode]);

  const loadRoot = async (mode: RootMode) => {
    setNotice(null);
    setNodes({});
    try {
      const pathValue =
        mode === 'workspace'
          ? await window.electronAPI.files.getWorkspace()
          : await window.electronAPI.files.getHome();
      setRootPath(pathValue);
      await loadDirectory(pathValue, true, mode);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : '无法加载资源管理器根目录。');
    }
  };

  const loadDirectory = async (dirPath: string, forceOpen = false, mode = rootMode) => {
    setNodes(prev => ({
      ...prev,
      [dirPath]: {
        ...prev[dirPath],
        expanded: forceOpen || prev[dirPath]?.expanded || false,
        loading: true,
        error: undefined,
      },
    }));

    try {
      const children = await window.electronAPI.files.listDirectory(dirPath, mode);
      setNodes(prev => ({
        ...prev,
        [dirPath]: {
          expanded: forceOpen || prev[dirPath]?.expanded || false,
          loading: false,
          children,
        },
      }));
    } catch (error: unknown) {
      setNodes(prev => ({
        ...prev,
        [dirPath]: {
          ...prev[dirPath],
          loading: false,
          error: error instanceof Error ? error.message : '读取目录失败。',
        },
      }));
    }
  };

  const toggleDirectory = async (entry: FileEntry) => {
    const state = nodes[entry.path];
    if (state?.expanded) {
      setNodes(prev => ({
        ...prev,
        [entry.path]: { ...state, expanded: false },
      }));
      return;
    }

    if (state?.children) {
      setNodes(prev => ({
        ...prev,
        [entry.path]: { ...state, expanded: true },
      }));
      return;
    }

    await loadDirectory(entry.path, true);
  };

  const copyPath = async (pathValue: string) => {
    await navigator.clipboard.writeText(pathValue);
    setNotice('路径已复制。');
  };

  const insertPath = (pathValue: string) => {
    const success = terminalBus.insertToActive(`"${pathValue}"`);
    setNotice(success ? '路径已插入当前终端。' : '没有活动终端，无法插入路径。');
  };

  const cdToDirectory = (pathValue: string) => {
    const success = terminalBus.runOnActive(`cd "${pathValue}"`);
    setNotice(success ? '已向当前终端发送 cd 命令。' : '没有活动终端，无法切换目录。');
  };

  const renderEntry = (entry: FileEntry, depth: number): React.ReactNode => {
    if (!showHidden && entry.hidden) return null;

    const state = nodes[entry.path];
    const isDirectory = entry.type === 'directory';

    return (
      <div key={entry.path} className="file-node">
        <div
          className={`file-row ${isDirectory ? 'directory' : 'file'}`}
          style={{ paddingLeft: 10 + depth * 16 }}
          onDoubleClick={() => {
            if (isDirectory) toggleDirectory(entry);
            else insertPath(entry.path);
          }}
        >
          <button
            className={`file-disclosure ${state?.expanded ? 'expanded' : ''}`}
            onClick={() => isDirectory && toggleDirectory(entry)}
            disabled={!isDirectory}
            title={isDirectory ? '展开/折叠' : ''}
          >
            {isDirectory && <ChevronRightIcon size={14} />}
          </button>
          <span className="file-icon">
            {isDirectory ? <FolderIcon size={15} /> : <FileIcon size={15} />}
          </span>
          <span className="file-name" title={entry.path}>
            {entry.name}
          </span>
          {!isDirectory && <span className="file-size">{formatSize(entry.size)}</span>}
          <div className="file-actions">
            <button title="复制路径" onClick={() => copyPath(entry.path)}>
              <CopyIcon size={13} />
            </button>
            <button title="插入路径到终端" onClick={() => insertPath(entry.path)}>
              <TerminalIcon size={13} />
            </button>
            {isDirectory && (
              <button title="在终端进入此目录" onClick={() => cdToDirectory(entry.path)}>
                cd
              </button>
            )}
          </div>
        </div>

        {state?.error && (
          <div className="file-error" style={{ marginLeft: 34 + depth * 16 }}>
            {state.error}
          </div>
        )}
        {state?.loading && (
          <div className="file-loading" style={{ marginLeft: 34 + depth * 16 }}>
            加载中...
          </div>
        )}
        {isDirectory && state?.expanded && state.children?.map(child => renderEntry(child, depth + 1))}
      </div>
    );
  };

  const rootState = rootPath ? nodes[rootPath] : undefined;
  const visibleChildren = (rootState?.children || []).filter(entry => showHidden || !entry.hidden);

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <div>
          <h2>资源管理器</h2>
          <p title={rootPath}>{rootPath || '正在加载根目录'}</p>
        </div>
        <button className="file-icon-button" title="刷新" onClick={() => rootPath && loadDirectory(rootPath, true)}>
          <RefreshIcon size={16} />
        </button>
      </div>

      <div className="file-explorer-toolbar">
        <button
          className={`root-button ${rootMode === 'workspace' ? 'active' : ''}`}
          onClick={() => setRootMode('workspace')}
        >
          <HardDriveIcon size={14} />
          工作区
        </button>
        <button
          className={`root-button ${rootMode === 'home' ? 'active' : ''}`}
          onClick={() => setRootMode('home')}
        >
          <HomeIcon size={14} />
          Home
        </button>
        <label className="hidden-toggle">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={event => setShowHidden(event.target.checked)}
          />
          隐藏文件
        </label>
      </div>

      {notice && (
        <div className="file-notice" role="status">
          {notice}
        </div>
      )}

      <div className="file-tree">
        <div className="file-root-row">
          <FolderIcon size={16} />
          <span title={rootPath}>{rootName}</span>
        </div>

        {rootState?.loading && <div className="file-loading root">加载中...</div>}
        {rootState?.error && <div className="file-error root">{rootState.error}</div>}
        {!rootState?.loading && visibleChildren.length === 0 && (
          <div className="file-empty">这个目录没有可显示的文件。</div>
        )}
        {visibleChildren.length >= 500 && (
          <div className="file-limit">目录内容较多，当前仅显示前 500 项。</div>
        )}
        {visibleChildren.map(entry => renderEntry(entry, 0))}
      </div>
    </div>
  );
};

export default FileExplorer;
