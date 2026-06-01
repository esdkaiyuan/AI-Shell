# AI Shell 工具架构设计

## 项目概述

一个支持AI辅助的跨平台Shell终端工具，支持本地命令执行、SSH远程连接、多AI厂商集成、设备间同步等功能。

## 技术栈

### PC端（优先开发）
- **框架**: Electron 28+
- **前端**: React 18 + TypeScript
- **UI库**: Ant Design / Material-UI
- **状态管理**: Zustand / Redux Toolkit
- **终端**: xterm.js + node-pty
- **SSH**: ssh2 (Node.js)

### 移动端（后续开发）
- **框架**: React Native
- **终端**: react-native-terminal-component
- **SSH**: react-native-ssh

### 后端服务（可选云端）
- **框架**: Node.js + Express / Fastify
- **数据库**: SQLite (本地) + PostgreSQL (云端)
- **同步**: WebSocket + REST API
- **认证**: JWT

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  终端UI组件   │  AI对话界面   │  设置页面     │  SSH管理器     │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层 (Services)                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Shell执行器   │  AI适配器     │  同步服务     │  SSH客户端     │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Electron主进程 / 原生层                    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  进程管理     │  文件系统     │  网络通信     │  系统集成      │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        外部服务                              │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  AI API      │  云端同步     │  SSH服务器    │  本地Shell     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## 核心模块设计

### 1. Shell终端模块

**功能**:
- 本地Shell执行（支持bash/zsh/powershell/cmd）
- 命令历史记录
- 自动补全
- 多标签页管理
- 命令输出解析

**技术实现**:
```typescript
// 使用node-pty创建伪终端
import * as pty from 'node-pty';

class ShellExecutor {
  private ptyProcess: pty.IPty;
  
  spawn(shell: string, cwd: string) {
    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: cwd,
      env: process.env
    });
  }
  
  write(data: string) {
    this.ptyProcess.write(data);
  }
  
  onData(callback: (data: string) => void) {
    this.ptyProcess.onData(callback);
  }
}
```

### 2. SSH远程连接模块

**功能**:
- SSH连接管理
- 多服务器配置
- 密钥认证
- 端口转发
- SFTP文件传输

**技术实现**:
```typescript
import { Client } from 'ssh2';

class SSHManager {
  private connections: Map<string, Client>;
  
  async connect(config: SSHConfig) {
    const conn = new Client();
    
    return new Promise((resolve, reject) => {
      conn.on('ready', () => {
        conn.shell((err, stream) => {
          if (err) reject(err);
          resolve(stream);
        });
      }).connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey
      });
    });
  }
}
```

### 3. AI集成模块

**支持的AI厂商**:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- 百度文心一言
- 阿里通义千问
- 智谱GLM
- 讯飞星火
- Moonshot
- Ollama (本地模型)

**统一接口设计**:
```typescript
interface AIProvider {
  name: string;
  apiKey: string;
  baseURL?: string;
  models: string[];
}

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

abstract class AIAdapter {
  abstract chat(messages: AIMessage[], model: string): Promise<string>;
  abstract streamChat(messages: AIMessage[], model: string): AsyncGenerator<string>;
}

class OpenAIAdapter extends AIAdapter {
  async chat(messages: AIMessage[], model: string): Promise<string> {
    // OpenAI API调用实现
  }
}

class ClaudeAdapter extends AIAdapter {
  async chat(messages: AIMessage[], model: string): Promise<string> {
    // Claude API调用实现
  }
}

// 工厂模式创建适配器
class AIFactory {
  static createAdapter(provider: string, config: AIProvider): AIAdapter {
    switch(provider) {
      case 'openai': return new OpenAIAdapter(config);
      case 'claude': return new ClaudeAdapter(config);
      case 'wenxin': return new WenxinAdapter(config);
      case 'tongyi': return new TongyiAdapter(config);
      case 'glm': return new GLMAdapter(config);
      case 'xinghuo': return new XinghuoAdapter(config);
      case 'moonshot': return new MoonshotAdapter(config);
      case 'ollama': return new OllamaAdapter(config);
      default: throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
```

### 4. 命令控制器模块

**内置控制器**:
- `ai`: AI对话和命令解释
- `explain`: 解释命令含义
- `suggest`: 命令建议
- `fix`: 错误修复建议
- `translate`: 命令翻译（自然语言转Shell）
- `optimize`: 命令优化
- `history`: 智能历史搜索

**实现示例**:
```typescript
interface CommandController {
  name: string;
  description: string;
  execute(args: string[], context: ShellContext): Promise<string>;
}

class AICommandController implements CommandController {
  name = 'ai';
  description = 'AI助手对话';
  
  async execute(args: string[], context: ShellContext): Promise<string> {
    const query = args.join(' ');
    const aiService = context.getAIService();
    return await aiService.chat([
      { role: 'system', content: 'You are a helpful shell assistant.' },
      { role: 'user', content: query }
    ]);
  }
}

class ExplainController implements CommandController {
  name = 'explain';
  description = '解释Shell命令';
  
  async execute(args: string[], context: ShellContext): Promise<string> {
    const command = args.join(' ');
    const aiService = context.getAIService();
    return await aiService.chat([
      { role: 'system', content: 'Explain the following shell command in detail.' },
      { role: 'user', content: command }
    ]);
  }
}
```

### 5. 设备同步模块

**同步内容**:
- 命令历史
- SSH配置
- AI配置
- 自定义脚本
- 主题设置

**技术方案**:
```typescript
interface SyncData {
  deviceId: string;
  timestamp: number;
  type: 'history' | 'config' | 'ssh' | 'ai';
  data: any;
}

class SyncService {
  private ws: WebSocket;
  private localDB: Database;
  
  async sync() {
    // 1. 获取本地最后同步时间
    const lastSync = await this.localDB.getLastSyncTime();
    
    // 2. 拉取服务器更新
    const updates = await this.fetchUpdates(lastSync);
    
    // 3. 合并冲突
    const merged = this.mergeConflicts(updates);
    
    // 4. 推送本地更改
    await this.pushLocalChanges();
    
    // 5. 更新本地数据库
    await this.localDB.applyUpdates(merged);
  }
  
  private mergeConflicts(updates: SyncData[]): SyncData[] {
    // 冲突解决策略：最后写入胜出
    return updates.sort((a, b) => b.timestamp - a.timestamp);
  }
}
```

### 6. 数据存储模块

**本地存储**:
```typescript
import Database from 'better-sqlite3';

class LocalStorage {
  private db: Database.Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initTables();
  }
  
  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT NOT NULL,
        cwd TEXT,
        timestamp INTEGER,
        exit_code INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS ssh_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        host TEXT,
        port INTEGER,
        username TEXT,
        private_key TEXT,
        config TEXT
      );
      
      CREATE TABLE IF NOT EXISTS ai_providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT,
        api_key TEXT,
        base_url TEXT,
        models TEXT,
        enabled INTEGER DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        sync_type TEXT,
        timestamp INTEGER,
        status TEXT
      );
    `);
  }
  
  saveCommand(command: string, cwd: string, exitCode: number) {
    const stmt = this.db.prepare(
      'INSERT INTO command_history (command, cwd, timestamp, exit_code) VALUES (?, ?, ?, ?)'
    );
    stmt.run(command, cwd, Date.now(), exitCode);
  }
  
  getCommandHistory(limit: number = 100): CommandHistory[] {
    const stmt = this.db.prepare(
      'SELECT * FROM command_history ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(limit);
  }
}
```

## 项目目录结构

```
ai-shell/
├── packages/
│   ├── desktop/                 # Electron桌面端
│   │   ├── src/
│   │   │   ├── main/           # 主进程
│   │   │   │   ├── index.ts
│   │   │   │   ├── shell/      # Shell执行
│   │   │   │   ├── ssh/        # SSH管理
│   │   │   │   └── ipc/        # 进程通信
│   │   │   ├── renderer/       # 渲染进程
│   │   │   │   ├── App.tsx
│   │   │   │   ├── components/ # UI组件
│   │   │   │   ├── pages/      # 页面
│   │   │   │   └── hooks/      # React Hooks
│   │   │   └── preload/        # 预加载脚本
│   │   ├── package.json
│   │   └── electron-builder.json
│   │
│   ├── mobile/                  # React Native移动端
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   └── services/
│   │   └── package.json
│   │
│   ├── core/                    # 共享核心逻辑
│   │   ├── src/
│   │   │   ├── ai/             # AI适配器
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── openai.ts
│   │   │   │   │   ├── claude.ts
│   │   │   │   │   ├── wenxin.ts
│   │   │   │   │   ├── tongyi.ts
│   │   │   │   │   ├── glm.ts
│   │   │   │   │   ├── xinghuo.ts
│   │   │   │   │   ├── moonshot.ts
│   │   │   │   │   └── ollama.ts
│   │   │   │   ├── factory.ts
│   │   │   │   └── types.ts
│   │   │   ├── controllers/    # 命令控制器
│   │   │   ├── sync/           # 同步服务
│   │   │   ├── storage/        # 数据存储
│   │   │   └── utils/          # 工具函数
│   │   └── package.json
│   │
│   └── server/                  # 云端同步服务（可选）
│       ├── src/
│       │   ├── api/
│       │   ├── sync/
│       │   └── auth/
│       └── package.json
│
├── docs/                        # 文档
├── scripts/                     # 构建脚本
├── package.json                 # 根配置
├── pnpm-workspace.yaml         # Monorepo配置
└── README.md
```

## 安全考虑

1. **API密钥加密存储**: 使用系统密钥链（keytar）或加密存储
2. **SSH密钥管理**: 支持密钥文件和密码，加密存储
3. **命令执行隔离**: 防止命令注入
4. **网络通信加密**: HTTPS/WSS
5. **权限控制**: 最小权限原则

## 性能优化

1. **虚拟滚动**: 终端输出使用虚拟滚动
2. **命令缓存**: 常用命令结果缓存
3. **懒加载**: AI模型按需加载
4. **增量同步**: 只同步变更数据
5. **Worker线程**: 耗时操作放入Worker

## 开发计划

### Phase 1: 核心功能（2-3周）
- [x] 项目架构设计
- [ ] 基础项目搭建
- [ ] 本地Shell终端实现
- [ ] 基础UI界面

### Phase 2: AI集成（2周）
- [ ] AI适配器框架
- [ ] OpenAI集成
- [ ] Claude集成
- [ ] 国内厂商集成
- [ ] Ollama本地模型支持

### Phase 3: 远程功能（2周）
- [ ] SSH连接实现
- [ ] 设备同步服务
- [ ] 云端服务搭建

### Phase 4: 移动端（3-4周）
- [ ] React Native项目搭建
- [ ] 核心功能移植
- [ ] 移动端UI适配

### Phase 5: 优化和发布（1-2周）
- [ ] 性能优化
- [ ] 测试和修复
- [ ] 文档完善
- [ ] 打包发布
