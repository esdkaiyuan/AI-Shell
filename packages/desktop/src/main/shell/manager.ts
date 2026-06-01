import type { IPty } from 'node-pty';
import { LocalStorage } from '@ai-shell/core';
import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';

const pty = require('node-pty') as typeof import('node-pty');

interface ShellSession {
  id: string;
  ptyProcess: IPty;
  emitter: EventEmitter;
}

export class ShellManager {
  private sessions: Map<string, ShellSession> = new Map();
  public storage: LocalStorage | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(storage: LocalStorage | null) {
    this.storage = storage;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  createSession(shell: string, cwd: string): string {
    const sessionId = this.generateSessionId();
    const emitter = new EventEmitter();

    // Determine shell based on platform
    const shellPath = shell || this.getDefaultShell();

    const ptyProcess = pty.spawn(shellPath, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: cwd || process.env.HOME || process.env.USERPROFILE || process.cwd(),
      env: process.env as any,
    });

    // Handle data from shell - 发送到渲染进程
    ptyProcess.onData(data => {
      emitter.emit('data', data);

      // 通过IPC发送数据到渲染进程
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('shell:data', sessionId, data);
      }
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      emitter.emit('exit', exitCode);

      // 通知渲染进程会话已关闭
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('shell:exit', sessionId, exitCode);
      }

      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, {
      id: sessionId,
      ptyProcess,
      emitter,
    });

    return sessionId;
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.ptyProcess.write(data);

    // Save to history if it's a complete command (ends with newline)
    if (data.endsWith('\n') || data.endsWith('\r')) {
      const command = data.trim();
      if (command) {
        try {
          this.storage?.saveCommand(command, process.cwd(), 0);
        } catch (error) {
          console.error('Failed to save command to history:', error);
        }
      }
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      session.ptyProcess.resize(cols, rows);
    } catch (error) {
      console.error(`Failed to resize session ${sessionId}:`, error);
    }
  }

  onData(sessionId: string, callback: (data: string) => void): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.emitter.on('data', callback);
  }

  onExit(sessionId: string, callback: (exitCode: number) => void): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.emitter.on('exit', callback);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.ptyProcess.kill();
      } catch (error) {
        console.error(`Failed to kill session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  private generateSessionId(): string {
    return `shell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
