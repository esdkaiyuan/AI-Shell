import type { Client as SSHClient, ClientChannel } from 'ssh2';
import { LocalStorage, SSHConfig } from '@ai-shell/core';
import { EventEmitter } from 'events';
import { BrowserWindow } from 'electron';

const { Client } = require('ssh2') as typeof import('ssh2');

interface SSHSession {
  id: string;
  client: SSHClient;
  stream: ClientChannel;
  emitter: EventEmitter;
  config: SSHConfig;
}

export class SSHManager {
  private sessions: Map<string, SSHSession> = new Map();
  public storage: LocalStorage | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(storage: LocalStorage | null) {
    this.storage = storage;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async connect(config: SSHConfig): Promise<string> {
    const sessionId = this.generateSessionId();
    const client = new Client();
    const emitter = new EventEmitter();

    return new Promise((resolve, reject) => {
      client
        .on('ready', () => {
          client.shell((err, stream) => {
            if (err) {
              reject(err);
              return;
            }

            // Handle data from SSH - 发送到渲染进程
            stream.on('data', (data: Buffer) => {
              const dataStr = data.toString();
              emitter.emit('data', dataStr);

              // 通过IPC发送数据到渲染进程
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('ssh:data', sessionId, dataStr);
              }
            });

            // Handle close
            stream.on('close', () => {
              emitter.emit('close');

              // 通知渲染进程连接已关闭
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('ssh:close', sessionId);
              }

              client.end();
              this.sessions.delete(sessionId);
            });

            this.sessions.set(sessionId, {
              id: sessionId,
              client,
              stream,
              emitter,
              config,
            });

            resolve(sessionId);
          });
        })
        .on('error', err => {
          reject(err);
        })
        .connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey ? Buffer.from(config.privateKey) : undefined,
          passphrase: config.passphrase,
          readyTimeout: 30000,
        });
    });
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`SSH session ${sessionId} not found`);
    }

    try {
      session.stream.write(data);
    } catch (error) {
      console.error(`Failed to write to SSH session ${sessionId}:`, error);
      throw error;
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`SSH session ${sessionId} not found`);
    }

    try {
      session.stream.setWindow(rows, cols, 0, 0);
    } catch (error) {
      console.error(`Failed to resize SSH session ${sessionId}:`, error);
    }
  }

  onData(sessionId: string, callback: (data: string) => void): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`SSH session ${sessionId} not found`);
    }

    session.emitter.on('data', callback);
  }

  onClose(sessionId: string, callback: () => void): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`SSH session ${sessionId} not found`);
    }

    session.emitter.on('close', callback);
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        session.client.end();
      } catch (error) {
        console.error(`Failed to disconnect SSH session ${sessionId}:`, error);
      }
      this.sessions.delete(sessionId);
    }
  }

  private generateSessionId(): string {
    return `ssh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
