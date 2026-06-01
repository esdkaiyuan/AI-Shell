# AI Shell

AI Shell 是一套面向开发、运维和服务器管理场景的跨平台智能终端客户端。它把传统终端、SSH 连接、文件资源管理器、会话工作区和 AI 助手整合在同一个应用里，并提供桌面端应用与 Android 手机端 APK。

项目署名：`esdkaiyuan`

## 项目亮点

- **桌面端 + 手机端**：桌面端基于 Electron，手机端基于 React Native / Expo，并已支持 Android APK 构建。
- **Xshell 风格体验**：深色专业终端界面、工具栏、侧边栏、标签栏、状态栏和系统监控，适合长期使用。
- **AI 助手融入终端**：AI 可以读取当前终端上下文，解释输出、生成命令、辅助排障，并将建议命令插入终端。
- **多厂商 AI Provider**：支持 OpenAI、Claude、百度文心一言、阿里通义千问、智谱 GLM、讯飞星火、Moonshot AI、DeepSeek 和 Ollama。
- **SSH 与会话管理**：支持 SSH 配置、远程终端标签、本地/远程混合工作区、会话保存与恢复。
- **资源管理器**：提供类似电脑资源管理器的只读文件浏览能力，移动端也保留触屏适配版本。
- **统一品牌图标**：桌面端和手机端使用统一的黑底深蓝渐变 `AS` 图标，应用内展示 `esdkaiyuan` 署名。

## 功能总览

| 模块 | 桌面端 | 手机端 |
| --- | --- | --- |
| 多标签终端 | 支持本地终端和 SSH 终端 | 支持移动端终端标签 |
| 分屏 | 支持终端分屏 | 支持移动端分屏窗格 |
| SSH 管理 | 支持连接配置、认证方式和连接管理 | 支持 SSH 配置卡片和连接入口 |
| AI 对话 | 独立 AI Chat 与终端侧边 AI 面板 | AI 对话页，默认从终端入口进入 |
| AI Provider 导入 | 设置页选择厂商、填写 Key、获取模型 | 仿照桌面端 API 导入流程 |
| 文件浏览 | 资源管理器 | 只读移动资源管理器 |
| 历史与快捷命令 | 命令历史、建议命令 | 历史页和快捷命令 |
| 使用文档 | `docs/USAGE.md` | `packages/mobile/README.md` |

## 桌面端

桌面端是完整工作台，适合日常开发、远程运维和 AI 辅助排障。

核心能力：

- 基于 xterm.js 的终端体验。
- 顶部工具栏支持新建终端、SSH、会话、复制、粘贴、搜索、分屏。
- 左侧侧栏提供终端、资源管理器、AI 助手、设置入口。
- AI 助手面板可以停靠在右侧或底部，读取终端上下文后给出命令建议。
- 设置页提供 AI Provider、SSH 配置、界面偏好和关于信息。
- 顶部与底部状态栏展示 `esdkaiyuan` 署名。

桌面端产物：

```text
packages/desktop/release/AI Shell Setup 0.1.0.exe
packages/desktop/release/AI Shell 0.1.0.exe
packages/desktop/release/win-unpacked
```

## 手机端

手机端不是网页壳，而是独立的 React Native 应用，可构建 Android APK。它将桌面端主要功能重新适配到手机屏幕：终端、SSH、会话、文件、AI、历史和设置均有独立入口。

核心能力：

- 移动端终端工作区，支持标签、分屏、搜索、快捷命令和命令输入。
- AI 按钮位于终端工具区，可直接进入 AI 对话。
- AI 页面分为“对话”和“模型”，默认优先对话，模型导入不再占据首屏。
- AI Provider 厂商与桌面端一致，API Key 仅显示脱敏预览。
- 只读资源管理器适配手机触屏操作。
- 顶部展示 `署名 esdkaiyuan`。

APK 产物：

```text
packages/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## AI Provider

当前支持的厂商：

| 厂商 | 常见模型 | 说明 |
| --- | --- | --- |
| OpenAI | GPT 系列 | 支持标准 API Key |
| Claude | Claude 3 系列 | Anthropic API |
| 百度文心一言 | ERNIE 系列 | Key 格式通常为 `API_KEY:SECRET_KEY` |
| 阿里通义千问 | Qwen 系列 | DashScope API |
| 智谱 GLM | GLM 系列 | 智谱开放平台 |
| 讯飞星火 | Spark 系列 | Key 格式通常为 `APPID:APISecret:APIKey` |
| Moonshot AI | moonshot 系列 | Kimi / Moonshot API |
| DeepSeek | deepseek-chat / deepseek-coder | DeepSeek API |
| Ollama | llama / qwen / codellama | 本地模型，可通过中继或本机服务使用 |

## 项目结构

```text
ai-shell/
├── packages/
│   ├── core/             # 核心逻辑：AI 适配器、存储和控制器
│   ├── desktop/          # Electron 桌面端
│   ├── mobile/           # React Native / Expo 手机端
│   └── shared-assets/    # 共享图标与品牌资产
├── docs/                 # 使用、安装、开发、API 和部署文档
├── README.md             # 项目介绍
└── package.json          # pnpm workspace 根配置
```

## 快速开始

环境要求：

- Node.js >= 18
- pnpm >= 8
- 构建 Android APK 需要 JDK 17 和 Android SDK

安装依赖：

```bash
pnpm install
```

桌面端开发：

```bash
pnpm --filter @ai-shell/desktop dev
```

桌面端构建与打包：

```bash
pnpm --filter @ai-shell/desktop build
pnpm --filter @ai-shell/desktop exec electron-builder --config.npmRebuild=false
```

手机端检查：

```bash
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile test
```

Android APK 构建：

```powershell
cd packages/mobile/android
.\gradlew.bat --init-script gradle-mirrors.gradle assembleRelease --console=plain
```

## 使用文档

- 完整使用说明：[docs/USAGE.md](docs/USAGE.md)
- 手机端说明：[packages/mobile/README.md](packages/mobile/README.md)
- 安装说明：[docs/INSTALLATION.md](docs/INSTALLATION.md)
- AI 配置说明：[docs/AI_SETUP_GUIDE.md](docs/AI_SETUP_GUIDE.md)
- API 文档：[docs/API.md](docs/API.md)
- 部署说明：[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 安全说明

- 不要把真实 API Key、SSH 密码或私钥提交到仓库。
- AI Provider 导入界面应只展示脱敏后的 Key 预览。
- 资源管理器默认保持只读边界，高风险文件操作应通过终端命令显式确认。
- 手机端执行命令前建议先阅读 AI 解释，再人工确认。

## 技术栈

桌面端：

- Electron
- React
- TypeScript
- Vite
- xterm.js
- node-pty
- ssh2
- electron-builder

手机端：

- React Native
- Expo
- TypeScript
- Android Gradle
- Vitest

核心与工程：

- pnpm workspace
- SQLite / 本地存储
- 多 AI Provider 适配器
- Windows 桌面打包与 Android APK 构建

## 署名

本项目应用内与文档统一展示：

```text
esdkaiyuan
```

## License

MIT License
