import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import './Terminal.css';
import { terminalBus } from '../terminalBus';
import { appSettings, TERMINAL_THEMES } from '../appSettings';
import SearchBar from './SearchBar';

interface TerminalProps {
  terminalId: string;
  title?: string;
  type?: 'local' | 'ssh';
  sshConfig?: {
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
  };
  showSearch?: boolean;
  onSearchClose?: () => void;
}

// 去除 ANSI 转义序列，便于把上下文喂给 AI
const stripAnsi = (str: string): string =>
  // eslint-disable-next-line no-control-regex
  str.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '');

// 常见报错关键字（命令未找到、权限、异常、堆栈、非零退出等）
const ERROR_PATTERNS = [
  /command not found/i,
  /not recognized as an internal or external command/i,
  /no such file or directory/i,
  /permission denied/i,
  /\bE?ACCES\b/,
  /\berror\b[:\s]/i,
  /\bexception\b/i,
  /\bfatal\b[:\s]/i,
  /\btraceback \(most recent call last\)/i,
  /npm ERR!/,
  /command failed/i,
  /segmentation fault/i,
  /cannot find module/i,
];

const looksLikeError = (text: string): boolean =>
  ERROR_PATTERNS.some(re => re.test(text));

const Terminal: React.FC<TerminalProps> = ({ terminalId, title, type = 'local', sshConfig, showSearch = false, onSearchClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const typeRef = useRef<'local' | 'ssh'>(type);
  const cleanupListenersRef = useRef<Array<() => void>>([]);
  // 滚动缓冲：保存最近的终端输出（已去除颜色码），供 AI 读取上下文
  const contextBufferRef = useRef<string>('');
  // 报错检测节流：上次通知时间
  const lastErrorNotifyRef = useRef<number>(0);
  const [searchResults, setSearchResults] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建xterm实例 - 使用通用设置中的外观配置
    const settings = appSettings.get();
    const xterm = new XTerm({
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      scrollback: settings.scrollback,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: TERMINAL_THEMES[settings.theme] || TERMINAL_THEMES['mono-dark'],
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // 检测报错并通知 AI 面板（节流：10 秒内最多一次）
    const detectError = (chunk: string) => {
      if (!looksLikeError(chunk)) return;
      const now = Date.now();
      if (now - lastErrorNotifyRef.current < 10000) return;
      lastErrorNotifyRef.current = now;
      // 取缓冲区末尾作为报错片段
      const snippet = contextBufferRef.current.slice(-800);
      terminalBus.notifyError(terminalId, snippet);
    };

    // 初始化会话（本地 shell 或 SSH）
    const initSession = async () => {
      try {
        let sessionId: string;

        if (typeRef.current === 'ssh' && sshConfig) {
          // SSH 连接
          sessionId = await window.electronAPI.ssh.connect(sshConfig);
          sessionIdRef.current = sessionId;

          // 监听 SSH 数据
          cleanupListenersRef.current.push(window.electronAPI.ssh.onData((sid: string, data: string) => {
            if (sid === sessionId) {
              xterm.write(data);
              // 捕获输出到上下文缓冲
              const clean = stripAnsi(data);
              contextBufferRef.current += clean;
              if (contextBufferRef.current.length > 20000) {
                contextBufferRef.current = contextBufferRef.current.slice(-20000);
              }
              detectError(clean);
            }
          }));

          // 监听 SSH 关闭
          cleanupListenersRef.current.push(window.electronAPI.ssh.onClose((sid: string) => {
            if (sid === sessionId) {
              xterm.writeln('\r\n\x1b[33mSSH connection closed\x1b[0m');
            }
          }));

          // 处理终端输入
          xterm.onData(data => {
            if (sessionIdRef.current) {
              window.electronAPI.ssh.write(sessionIdRef.current, data);
            }
          });

          // 处理调整大小
          xterm.onResize(({ cols, rows }) => {
            if (sessionIdRef.current) {
              window.electronAPI.ssh.resize(sessionIdRef.current, cols, rows);
            }
          });
        } else {
          // 本地 shell
          const cwd = await window.electronAPI.files.getWorkspace();
          sessionId = await window.electronAPI.shell.create('', cwd);
          sessionIdRef.current = sessionId;

          // 监听来自主进程的Shell数据
          cleanupListenersRef.current.push(window.electronAPI.shell.onData((sid: string, data: string) => {
            if (sid === sessionId) {
              xterm.write(data);
              // 捕获输出到上下文缓冲（去除 ANSI 颜色码）
              const clean = stripAnsi(data);
              contextBufferRef.current += clean;
              // 保留最近 20KB 字符
              if (contextBufferRef.current.length > 20000) {
                contextBufferRef.current = contextBufferRef.current.slice(-20000);
              }
              detectError(clean);
            }
          }));

          // 监听Shell退出
          cleanupListenersRef.current.push(window.electronAPI.shell.onExit((sid: string, exitCode: number) => {
            if (sid === sessionId) {
              xterm.writeln(`\r\n\x1b[33mProcess exited with code ${exitCode}\x1b[0m`);
            }
          }));

          // 处理终端输入
          xterm.onData(data => {
            if (sessionIdRef.current) {
              window.electronAPI.shell.write(sessionIdRef.current, data);
            }
          });

          // 处理调整大小
          xterm.onResize(({ cols, rows }) => {
            if (sessionIdRef.current) {
              window.electronAPI.shell.resize(sessionIdRef.current, cols, rows);
            }
          });
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        xterm.writeln('\x1b[31mError: Failed to create session\x1b[0m');
        xterm.writeln(`\x1b[31m${error}\x1b[0m`);
      }
    };

    initSession();

    // 注册到 terminalBus，让 AI 面板可以读取上下文 / 插入命令
    terminalBus.register({
      id: terminalId,
      title: title || 'Terminal',
      insert: (text: string) => {
        // 插入文本到终端（不回车）
        if (xtermRef.current) {
          xtermRef.current.paste(text);
        }
      },
      run: (command: string) => {
        // 执行命令（自动回车）
        if (sessionIdRef.current) {
          if (typeRef.current === 'ssh') {
            window.electronAPI.ssh.write(sessionIdRef.current, command + '\r');
          } else {
            window.electronAPI.shell.write(sessionIdRef.current, command + '\r');
          }
        }
      },
      getContext: (maxChars = 4000) => {
        const buf = contextBufferRef.current;
        if (buf.length <= maxChars) return buf;
        // 返回最后 maxChars 字符
        return '...\n' + buf.slice(-maxChars);
      },
    });

    // 处理窗口调整大小
    const handleResize = () => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.error('Failed to fit terminal:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // 订阅通用设置变化，实时应用到终端外观
    const unsubscribeSettings = appSettings.subscribe(s => {
      const term = xtermRef.current;
      if (!term) return;
      term.options.fontSize = s.fontSize;
      term.options.fontFamily = s.fontFamily;
      term.options.cursorStyle = s.cursorStyle;
      term.options.cursorBlink = s.cursorBlink;
      term.options.scrollback = s.scrollback;
      term.options.theme = TERMINAL_THEMES[s.theme] || TERMINAL_THEMES['mono-dark'];
      // 字号/字体变化后重新适配尺寸
      try {
        fitAddonRef.current?.fit();
      } catch (error) {
        console.error('Failed to refit after settings change:', error);
      }
    });

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribeSettings();

      // 从 terminalBus 注销
      terminalBus.unregister(terminalId);

      cleanupListenersRef.current.forEach(cleanup => cleanup());
      cleanupListenersRef.current = [];

      // 关闭底层会话
      if (typeRef.current === 'ssh') {
        if (sessionIdRef.current) {
          window.electronAPI.ssh.disconnect(sessionIdRef.current).catch(console.error);
        }
      } else {
        if (sessionIdRef.current) {
          window.electronAPI.shell.close(sessionIdRef.current).catch(console.error);
        }
      }

      // 销毁终端
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, [terminalId, title, type, sshConfig]);

  // 搜索处理函数
  const handleSearch = (term: string, options: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }) => {
    if (!searchAddonRef.current || !term) {
      setSearchResults({ current: 0, total: 0 });
      return;
    }

    const found = searchAddonRef.current.findNext(term, {
      caseSensitive: options.caseSensitive,
      wholeWord: options.wholeWord,
      regex: options.regex,
    });

    // 注意：xterm-addon-search 不直接提供结果计数
    // 这里简化处理，实际使用中可能需要更复杂的逻辑
    if (found) {
      setSearchResults({ current: 1, total: 1 });
    } else {
      setSearchResults({ current: 0, total: 0 });
    }
  };

  const handleSearchNext = () => {
    if (!searchAddonRef.current) return;
    searchAddonRef.current.findNext('', {});
  };

  const handleSearchPrevious = () => {
    if (!searchAddonRef.current) return;
    searchAddonRef.current.findPrevious('', {});
  };

  return (
    <div className="terminal-wrapper">
      {showSearch && (
        <SearchBar
          onSearch={handleSearch}
          onNext={handleSearchNext}
          onPrevious={handleSearchPrevious}
          onClose={() => onSearchClose?.()}
          resultCount={searchResults}
        />
      )}
      <div ref={terminalRef} className="terminal" />
    </div>
  );
};

export default Terminal;
