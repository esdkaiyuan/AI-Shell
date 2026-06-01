# 🚀 快速开始指南

## 5分钟上手 AI Shell

### 第一步：安装依赖

```bash
# 确保已安装 Node.js 18+ 和 pnpm
node --version  # 检查版本
pnpm --version  # 如果没有，运行: npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 第二步：构建项目

```bash
pnpm build
```

### 第三步：启动应用

```bash
pnpm dev
```

应用将自动打开，你会看到一个现代化的终端界面。

### 第四步：配置AI

1. 点击左侧的 **⚙️ 设置** 图标
2. 选择 **AI Providers** 标签
3. 选择一个AI提供商（推荐从 OpenAI 或 Ollama 开始）
4. 输入API密钥
5. 点击 **Add Provider**

#### 快速获取API密钥

**OpenAI (最简单):**
- 访问: https://platform.openai.com/api-keys
- 创建新密钥
- 复制并粘贴到AI Shell

**Ollama (免费本地):**
```bash
# 安装 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 拉取模型
ollama pull llama2

# 在AI Shell中:
# - 选择 "Ollama (本地)"
# - API Key 留空
# - Base URL: http://localhost:11434
```

### 第五步：开始使用

#### 在终端中使用AI命令

```bash
# AI对话
ai how to list all files recursively

# 解释命令
explain ls -la

# 自然语言转命令
translate find all pdf files in current directory

# 获取命令建议
suggest

# 修复失败的命令
fix

# 优化命令
optimize find . -name "*.txt"
```

#### 使用AI聊天界面

1. 点击左侧的 **🤖 AI Chat** 图标
2. 在输入框中输入问题
3. 按 Enter 发送（Shift+Enter 换行）

### 常见问题

**Q: 终端无法输入？**
A: 点击终端区域确保焦点在终端上。

**Q: AI命令不工作？**
A: 确保已在设置中添加并启用AI提供商。

**Q: 如何创建新的终端标签？**
A: 点击终端标签栏右侧的 `+` 按钮。

**Q: 支持哪些Shell？**
A: 自动检测系统默认Shell（Windows: cmd/powershell, macOS/Linux: bash/zsh）。

### 下一步

- 📖 阅读完整的 [README.md](../README.md)
- 🛠️ 查看 [开发文档](./DEVELOPMENT.md)
- 🔌 了解 [API文档](./API.md)
- 🚀 学习 [部署指南](./DEPLOYMENT.md)

### 项目结构速览

```
ai-shell/
├── packages/
│   ├── core/           # 核心逻辑（AI、存储、控制器）
│   ├── desktop/        # Electron桌面应用
│   │   ├── src/
│   │   │   ├── main/       # 主进程（Shell、SSH管理）
│   │   │   ├── renderer/   # React UI
│   │   │   └── preload/    # 预加载脚本
│   ├── mobile/         # React Native / Expo 手机端
│   └── shared-assets/  # 图标和品牌资产
├── docs/               # 文档
└── README.md          # 主文档
```

### 开发命令

```bash
# 开发模式（热重载）
pnpm dev

# 构建所有包
pnpm build

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 打包应用
pnpm --filter @ai-shell/desktop exec electron-builder --config.npmRebuild=false

# 构建 Android APK
cd packages/mobile/android
.\gradlew.bat --init-script gradle-mirrors.gradle assembleRelease --console=plain
```

### 技术栈

- **桌面**: Electron + React + TypeScript
- **终端**: xterm.js + node-pty
- **AI**: 多厂商适配器（OpenAI, Claude, 百度, 阿里等）
- **存储**: SQLite (better-sqlite3)
- **SSH**: ssh2
- **构建**: Vite + electron-builder

### 获取帮助

- 💬 [GitHub Discussions](https://github.com/esdkaiyuan/AI-Shell/discussions)
- 🐛 [报告问题](https://github.com/esdkaiyuan/AI-Shell/issues)
- 📖 项目主页: https://github.com/esdkaiyuan/AI-Shell

---

**享受使用 AI Shell！** 🎉

如果觉得有用，请给项目一个 ⭐️
