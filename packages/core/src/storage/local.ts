import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { CommandHistory, SSHConfig, AIProvider } from '../types';

export class LocalStorage {
  private db!: SqlJsDatabase;
  private dbPath: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    const SQL = await initSqlJs();

    // Try to load existing database
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initTables();
  }

  private initTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        cwd TEXT,
        timestamp INTEGER,
        exit_code INTEGER
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ssh_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        host TEXT,
        port INTEGER,
        username TEXT,
        password TEXT,
        private_key TEXT,
        config TEXT
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ai_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        api_key TEXT,
        base_url TEXT,
        models TEXT,
        enabled INTEGER DEFAULT 1
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        sync_type TEXT,
        timestamp INTEGER,
        status TEXT
      );
    `);
    this.saveToFile();
  }

  private saveToFile(): void {
    this.dirty = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const data = this.db.export();
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${this.dbPath}.tmp`;
    fs.writeFileSync(tempPath, data);
    fs.renameSync(tempPath, this.dbPath);
  }

  private scheduleSaveToFile(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      try {
        this.saveToFile();
      } catch (error) {
        console.error('Failed to persist database:', error);
      }
    }, 250);
  }

  private getRowObject(stmt: { getAsObject(): Record<string, unknown> }): Record<string, unknown> {
    return stmt.getAsObject() as Record<string, unknown>;
  }

  // Command History
  saveCommand(command: string, cwd: string, exitCode: number): void {
    this.db.run(
      'INSERT INTO command_history (command, cwd, timestamp, exit_code) VALUES (?, ?, ?, ?)',
      [command, cwd, Date.now(), exitCode]
    );
    this.scheduleSaveToFile();
  }

  getCommandHistory(limit: number = 100): CommandHistory[] {
    const stmt = this.db.prepare(
      'SELECT * FROM command_history ORDER BY timestamp DESC LIMIT ?'
    );
    stmt.bind([limit]);
    const results: CommandHistory[] = [];
    while (stmt.step()) {
      const row = this.getRowObject(stmt);
      results.push({
        id: row.id as number,
        command: row.command as string,
        cwd: row.cwd as string,
        timestamp: row.timestamp as number,
        exitCode: row.exit_code as number,
      });
    }
    stmt.free();
    return results;
  }

  searchCommandHistory(query: string, limit: number = 50): CommandHistory[] {
    const stmt = this.db.prepare(
      'SELECT * FROM command_history WHERE command LIKE ? ORDER BY timestamp DESC LIMIT ?'
    );
    stmt.bind([`%${query}%`, limit]);
    const results: CommandHistory[] = [];
    while (stmt.step()) {
      const row = this.getRowObject(stmt);
      results.push({
        id: row.id as number,
        command: row.command as string,
        cwd: row.cwd as string,
        timestamp: row.timestamp as number,
        exitCode: row.exit_code as number,
      });
    }
    stmt.free();
    return results;
  }

  clearCommandHistory(): void {
    this.db.run('DELETE FROM command_history');
    this.scheduleSaveToFile();
  }

  // SSH Configs
  saveSSHConfig(config: SSHConfig): void {
    this.db.run(
      `INSERT OR REPLACE INTO ssh_configs (name, host, port, username, password, private_key, config)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        config.name,
        config.host,
        config.port,
        config.username,
        config.password || null,
        config.privateKey || null,
        JSON.stringify({
          ...(config.config || {}),
          passphrase: config.passphrase || undefined,
        }),
      ]
    );
    this.scheduleSaveToFile();
  }

  getSSHConfigs(): SSHConfig[] {
    const stmt = this.db.prepare('SELECT * FROM ssh_configs');
    const results: SSHConfig[] = [];
    while (stmt.step()) {
      const row = this.getRowObject(stmt);
      const parsedConfig = JSON.parse((row.config as string) || '{}') as {
        passphrase?: string;
        [key: string]: unknown;
      };
      const { passphrase, ...extraConfig } = parsedConfig;
      results.push({
        id: row.id as number,
        name: row.name as string,
        host: row.host as string,
        port: row.port as number,
        username: row.username as string,
        password: row.password as string,
        privateKey: row.private_key as string,
        passphrase,
        config: extraConfig,
      });
    }
    stmt.free();
    return results;
  }

  getSSHConfig(name: string): SSHConfig | null {
    const stmt = this.db.prepare('SELECT * FROM ssh_configs WHERE name = ?');
    stmt.bind([name]);
    if (stmt.step()) {
      const row = this.getRowObject(stmt);
      stmt.free();
      const parsedConfig = JSON.parse((row.config as string) || '{}') as {
        passphrase?: string;
        [key: string]: unknown;
      };
      const { passphrase, ...extraConfig } = parsedConfig;
      return {
        id: row.id as number,
        name: row.name as string,
        host: row.host as string,
        port: row.port as number,
        username: row.username as string,
        password: row.password as string,
        privateKey: row.private_key as string,
        passphrase,
        config: extraConfig,
      };
    }
    stmt.free();
    return null;
  }

  deleteSSHConfig(name: string): void {
    this.db.run('DELETE FROM ssh_configs WHERE name = ?', [name]);
    this.scheduleSaveToFile();
  }

  // AI Providers
  saveAIProvider(provider: AIProvider): void {
    this.db.run(
      `INSERT OR REPLACE INTO ai_providers (name, api_key, base_url, models, enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [
        provider.name,
        provider.apiKey,
        provider.baseURL || null,
        JSON.stringify(provider.models),
        provider.enabled !== false ? 1 : 0,
      ]
    );
    this.scheduleSaveToFile();
  }

  getAIProviders(): AIProvider[] {
    const stmt = this.db.prepare('SELECT * FROM ai_providers');
    const results: AIProvider[] = [];
    while (stmt.step()) {
      const row = this.getRowObject(stmt);
      results.push({
        name: row.name as string,
        apiKey: row.api_key as string,
        baseURL: row.base_url as string,
        models: JSON.parse(row.models as string),
        enabled: row.enabled === 1,
      });
    }
    stmt.free();
    return results;
  }

  deleteAIProvider(name: string): void {
    this.db.run('DELETE FROM ai_providers WHERE name = ?', [name]);
    this.scheduleSaveToFile();
  }

  // Sync
  getLastSyncTime(): number {
    const stmt = this.db.prepare(
      'SELECT MAX(timestamp) as last_sync FROM sync_log WHERE status = ?'
    );
    stmt.bind(['success']);
    if (stmt.step()) {
      const row = this.getRowObject(stmt);
      stmt.free();
      return (row.last_sync as number) || 0;
    }
    stmt.free();
    return 0;
  }

  logSync(deviceId: string, syncType: string, status: string): void {
    this.db.run(
      'INSERT INTO sync_log (device_id, sync_type, timestamp, status) VALUES (?, ?, ?, ?)',
      [deviceId, syncType, Date.now(), status]
    );
    this.scheduleSaveToFile();
  }

  close(): void {
    try {
      if (this.dirty || this.saveTimer) {
        this.saveToFile();
      }
      this.db.close();
    } catch (error) {
      console.warn('Storage close warning:', error);
    }
  }
}
