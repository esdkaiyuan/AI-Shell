# 开发指南

## 项目结构

```
ai-shell/
├── packages/
│   ├── core/                    # 核心逻辑包
│   │   ├── src/
│   │   │   ├── ai/             # AI适配器
│   │   │   │   ├── adapters/   # 各厂商适配器实现
│   │   │   │   ├── factory.ts  # 适配器工厂
│   │   │   │   └── service.ts  # AI服务
│   │   │   ├── controllers/    # 命令控制器
│   │   │   ├── storage/        # 数据存储
│   │   │   └── types.ts        # 类型定义
│   │   └── package.json
│   │
│   └── desktop/                 # 桌面端应用
│       ├── src/
│       │   ├── main/           # Electron主进程
│       │   │   ├── index.ts    # 主进程入口
│       │   │   ├── shell/      # Shell管理
│       │   │   └── ssh/        # SSH管理
│       │   ├── renderer/       # React渲染进程
│       │   │   ├── components/ # UI组件
│       │   │   ├── App.tsx     # 主应用
│       │   │   └── main.tsx    # 渲染进程入口
│       │   └── preload/        # 预加载脚本
│       └── package.json
```

## 开发环境设置

### 1. 安装依赖

```bash
# 使用pnpm安装所有依赖
pnpm install
```

### 2. 开发模式

```bash
# 启动开发服务器（推荐）
pnpm dev

# 或者分别启动主进程和渲染进程
pnpm dev:main      # 终端1: 编译主进程
pnpm dev:renderer  # 终端2: 启动Vite开发服务器
pnpm start         # 终端3: 启动Electron
```

### 3. 代码规范

项目使用ESLint和Prettier进行代码格式化：

```bash
# 检查代码规范
pnpm lint

# 类型检查
pnpm type-check
```

## 添加新的AI提供商

### 1. 创建适配器

在 `packages/core/src/ai/adapters/` 创建新文件，例如 `newprovider.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';
import { AIAdapter, AIMessage, AIResponse, StreamChunk, AIProvider } from '../types';

export class NewProviderAdapter extends AIAdapter {
  private client: AxiosInstance;

  constructor(config: AIProvider) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.newprovider.com',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: AIMessage[], model?: string): Promise<AIResponse> {
    // 实现聊天逻辑
    const response = await this.client.post('/chat', {
      model: model || this.config.models[0],
      messages: messages,
    });

    return {
      content: response.data.content,
      model: response.data.model,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens,
      },
    };
  }

  async *streamChat(messages: AIMessage[], model?: string): AsyncGenerator<StreamChunk> {
    // 实现流式聊天逻辑
    const response = await this.client.post('/chat/stream', {
      model: model || this.config.models[0],
      messages: messages,
      stream: true,
    }, {
      responseType: 'stream',
    });

    for await (const chunk of response.data) {
      // 解析并yield数据块
      yield { content: chunk.toString(), done: false };
    }
  }

  async listModels(): Promise<string[]> {
    // 返回支持的模型列表
    return ['model-1', 'model-2'];
  }
}
```

### 2. 注册适配器

在 `packages/core/src/ai/factory.ts` 中添加：

```typescript
import { NewProviderAdapter } from './adapters/newprovider';

export class AIFactory {
  static createAdapter(provider: string, config: AIProvider): AIAdapter {
    switch (provider.toLowerCase()) {
      // ... 其他提供商
      case 'newprovider':
        return new NewProviderAdapter(config);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
}
```

### 3. 更新UI

在 `packages/desktop/src/renderer/components/Settings.tsx` 的下拉列表中添加选项：

```tsx
<select value={newProvider.name} onChange={...}>
  {/* ... 其他选项 */}
  <option value="newprovider">New Provider</option>
</select>
```

## 添加新的命令控制器

### 1. 创建控制器

在 `packages/core/src/controllers/ai-controllers.ts` 中添加：

```typescript
export class MyCustomController implements CommandController {
  name = 'mycommand';
  description = '我的自定义命令';
  usage = 'mycommand <args>';

  async execute(args: string[], context: ShellContext): Promise<string> {
    // 实现命令逻辑
    const aiService = context.getAIService();
    
    const response = await aiService.chat([
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: args.join(' ') },
    ]);

    return response.content;
  }
}
```

### 2. 注册控制器

在 `packages/core/src/controllers/registry.ts` 中注册：

```typescript
private registerDefaultControllers(): void {
  const defaultControllers = [
    // ... 其他控制器
    new MyCustomController(),
  ];

  defaultControllers.forEach(controller => {
    this.register(controller);
  });
}
```

## 调试技巧

### 1. 主进程调试

在 `packages/desktop/src/main/index.ts` 中添加断点，然后：

```bash
# 使用VS Code的调试功能
# 或者在代码中添加
console.log('Debug info:', data);
```

### 2. 渲染进程调试

开发模式下会自动打开DevTools，可以直接使用Chrome调试工具。

### 3. 查看日志

```bash
# 主进程日志会输出到终端
# 渲染进程日志在DevTools Console中查看
```

## 构建和打包

### 开发构建

```bash
pnpm build
```

### 生产打包

```bash
cd packages/desktop
pnpm package
```

打包后的文件在 `packages/desktop/release/` 目录。

## 测试

```bash
# 运行测试
pnpm test

# 运行特定包的测试
pnpm --filter @ai-shell/core test
```

## 常见问题

### 1. node-pty编译失败

确保安装了构建工具：

**Windows:**
```bash
npm install --global windows-build-tools
```

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential
```

### 2. Electron启动失败

清除缓存并重新安装：

```bash
rm -rf node_modules
pnpm install
```

### 3. TypeScript类型错误

确保所有包都已构建：

```bash
pnpm build
```

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 代码风格

- 使用TypeScript
- 遵循ESLint规则
- 使用Prettier格式化代码
- 编写清晰的注释
- 保持函数简洁（单一职责）

## 性能优化建议

1. **终端性能**: 使用虚拟滚动处理大量输出
2. **AI请求**: 实现请求缓存和防抖
3. **数据库**: 为常用查询添加索引
4. **内存管理**: 及时清理不用的会话和监听器
