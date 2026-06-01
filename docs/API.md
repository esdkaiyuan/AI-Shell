# API文档

## Core API

### AI Service

#### `AIServiceImpl`

AI服务的主要实现类。

```typescript
import { AIServiceImpl, AIProvider } from '@ai-shell/core';

const aiService = new AIServiceImpl([
  {
    name: 'openai',
    apiKey: 'your-api-key',
    models: ['gpt-3.5-turbo'],
    enabled: true,
  }
]);
```

**方法:**

##### `chat(messages, provider?, model?)`

发送聊天请求。

```typescript
const response = await aiService.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
], 'openai', 'gpt-3.5-turbo');

console.log(response.content);
```

**参数:**
- `messages: AIMessage[]` - 消息数组
- `provider?: string` - AI提供商名称（可选）
- `model?: string` - 模型名称（可选）

**返回:** `Promise<AIResponse>`

##### `streamChat(messages, provider?, model?)`

流式聊天请求。

```typescript
for await (const chunk of aiService.streamChat(messages)) {
  process.stdout.write(chunk.content);
  if (chunk.done) break;
}
```

**返回:** `AsyncGenerator<StreamChunk>`

##### `addProvider(provider)`

添加AI提供商。

```typescript
aiService.addProvider({
  name: 'claude',
  apiKey: 'your-api-key',
  models: ['claude-3-sonnet-20240229'],
  enabled: true,
});
```

##### `removeProvider(name)`

移除AI提供商。

```typescript
aiService.removeProvider('openai');
```

##### `listProviders()`

列出所有提供商。

```typescript
const providers = aiService.listProviders();
```

### Storage

#### `LocalStorage`

本地数据存储类。

```typescript
import { LocalStorage } from '@ai-shell/core';

const storage = new LocalStorage('/path/to/database.db');
```

**方法:**

##### `saveCommand(command, cwd, exitCode)`

保存命令历史。

```typescript
storage.saveCommand('ls -la', '/home/user', 0);
```

##### `getCommandHistory(limit?)`

获取命令历史。

```typescript
const history = storage.getCommandHistory(100);
```

##### `searchCommandHistory(query, limit?)`

搜索命令历史。

```typescript
const results = storage.searchCommandHistory('git', 50);
```

##### `saveSSHConfig(config)`

保存SSH配置。

```typescript
storage.saveSSHConfig({
  name: 'my-server',
  host: '192.168.1.100',
  port: 22,
  username: 'user',
  privateKey: '...',
});
```

##### `getSSHConfigs()`

获取所有SSH配置。

```typescript
const configs = storage.getSSHConfigs();
```

##### `saveAIProvider(provider)`

保存AI提供商配置。

```typescript
storage.saveAIProvider({
  name: 'openai',
  apiKey: 'sk-...',
  models: ['gpt-3.5-turbo'],
  enabled: true,
});
```

### Command Controllers

#### `CommandController` 接口

```typescript
interface CommandController {
  name: string;
  description: string;
  usage: string;
  execute(args: string[], context: ShellContext): Promise<string>;
}
```

#### 内置控制器

##### `AICommandController`

AI对话控制器。

```bash
ai how to list files
```

##### `ExplainController`

解释命令。

```bash
explain ls -la
```

##### `TranslateController`

自然语言转命令。

```bash
translate find all pdf files
```

##### `SuggestController`

命令建议。

```bash
suggest
```

##### `FixController`

修复失败的命令。

```bash
fix
```

##### `OptimizeController`

优化命令。

```bash
optimize find . -name "*.txt"
```

## Desktop API

### Electron IPC

#### Shell Operations

##### `shell:create`

创建Shell会话。

```typescript
const sessionId = await window.electronAPI.shell.create('bash', '/home/user');
```

##### `shell:write`

向Shell写入数据。

```typescript
await window.electronAPI.shell.write(sessionId, 'ls -la\n');
```

##### `shell:resize`

调整终端大小。

```typescript
await window.electronAPI.shell.resize(sessionId, 80, 30);
```

##### `shell:close`

关闭Shell会话。

```typescript
await window.electronAPI.shell.close(sessionId);
```

#### SSH Operations

##### `ssh:connect`

连接SSH服务器。

```typescript
const sessionId = await window.electronAPI.ssh.connect({
  host: '192.168.1.100',
  port: 22,
  username: 'user',
  privateKey: '...',
});
```

##### `ssh:disconnect`

断开SSH连接。

```typescript
await window.electronAPI.ssh.disconnect(sessionId);
```

##### `ssh:write`

向SSH会话写入数据。

```typescript
await window.electronAPI.ssh.write(sessionId, 'ls\n');
```

##### `ssh:list-configs`

列出SSH配置。

```typescript
const configs = await window.electronAPI.ssh.listConfigs();
```

##### `ssh:save-config`

保存SSH配置。

```typescript
await window.electronAPI.ssh.saveConfig({
  name: 'my-server',
  host: '192.168.1.100',
  port: 22,
  username: 'user',
});
```

#### AI Operations

##### `ai:chat`

发送AI聊天请求。

```typescript
const response = await window.electronAPI.ai.chat([
  { role: 'user', content: 'Hello!' }
], 'openai', 'gpt-3.5-turbo');
```

##### `ai:list-providers`

列出AI提供商。

```typescript
const providers = await window.electronAPI.ai.listProviders();
```

##### `ai:add-provider`

添加AI提供商。

```typescript
await window.electronAPI.ai.addProvider({
  name: 'openai',
  apiKey: 'sk-...',
  models: ['gpt-3.5-turbo'],
  enabled: true,
});
```

##### `ai:remove-provider`

移除AI提供商。

```typescript
await window.electronAPI.ai.removeProvider('openai');
```

#### History Operations

##### `history:get`

获取命令历史。

```typescript
const history = await window.electronAPI.history.get(100);
```

##### `history:search`

搜索命令历史。

```typescript
const results = await window.electronAPI.history.search('git', 50);
```

##### `history:clear`

清除命令历史。

```typescript
await window.electronAPI.history.clear();
```

## 类型定义

### AIMessage

```typescript
interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

### AIResponse

```typescript
interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

### AIProvider

```typescript
interface AIProvider {
  name: string;
  apiKey: string;
  baseURL?: string;
  models: string[];
  enabled?: boolean;
}
```

### SSHConfig

```typescript
interface SSHConfig {
  id?: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  config?: Record<string, any>;
}
```

### CommandHistory

```typescript
interface CommandHistory {
  id: number;
  command: string;
  cwd: string;
  timestamp: number;
  exitCode: number;
}
```

## 错误处理

所有API调用都应该使用try-catch处理错误：

```typescript
try {
  const response = await aiService.chat(messages);
  console.log(response.content);
} catch (error) {
  console.error('AI request failed:', error.message);
}
```

## 事件

### Shell Events

```typescript
// 监听Shell输出
shellManager.onData(sessionId, (data) => {
  console.log(data);
});

// 监听Shell退出
shellManager.onExit(sessionId, (exitCode) => {
  console.log('Shell exited with code:', exitCode);
});
```

### SSH Events

```typescript
// 监听SSH输出
sshManager.onData(sessionId, (data) => {
  console.log(data);
});

// 监听SSH关闭
sshManager.onClose(sessionId, () => {
  console.log('SSH connection closed');
});
```
