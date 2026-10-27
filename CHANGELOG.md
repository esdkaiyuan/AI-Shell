# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 手机端 APK 内置 Alpine Linux 3.20.3 + Termux PRoot（arm64-v8a / x86_64），首次启动向导解压环境，终端、OpenSSH、git、curl、apk 可离线使用
- 手机端真实 PTY 终端：多标签/分屏/搜索/命令键/Ctrl+C/Tab/方向键/清屏/会话保存恢复，跨 chunk ANSI 过滤与未完成行合并
- 手机端首次启动向导：环境安装进度、AI Provider 配置、SSH 私钥配置；Key 使用 Android Keystore AES-256-GCM 加密
- 手机端原生模块：rootfs 安装与 APK 更新后链接修复、PTY 会话管理、只读文件浏览、剪贴板、CPU/内存/磁盘统计
- 手机端真实 AI 直连（OpenAI/Claude/DeepSeek/GLM/通义/Moonshot/Ollama/文心），自动附带终端最近输出
- 手机端真实 SSH：内置 OpenSSH 客户端、密码交互/私钥认证、session 终端接入
- AI 对话持久化：多会话列表，支持新建/切换/重命名/删除，刷新或重启后对话仍在（chatStore + 会话切换器）
- 终端标签页双击重命名、拖拽调整顺序（标签栏重构为 TerminalTabBar，修正原嵌套 button 的无效 HTML）
- 流式输出支持「停止生成」：AbortSignal 全链路贯通（core 接口 → 9 个 adapter → 主进程 controller → 界面停止按钮）
- AI 流式输出：对话/报错分析逐 token 渲染（ai:chat-stream IPC + chunk 推送，双面板接入）
- Tab 路径补全：识别末尾路径 token（含 ~/ ./ 相对/绝对），列目录候选，目录自动补斜杠，仅替换末尾 token
- AI 面板与分屏窗格支持拖动调整尺寸（宽度/高度/比例，自动持久化）
- AI 助手面板与 AI Chat 内置提供商/模型切换器，选择结果全局生效并持久化
- 终端 Tab 命令自动补全：基于历史命令 + 快捷片段 + 常用命令词典，Tab 循环、Enter 接受、Esc 关闭
- 快捷命令片段管理器（Ctrl+B）：分组、搜索、增删改、一键插入/执行/复制
- 全局快捷键：Ctrl+T 新建终端、Ctrl+W 关闭、Ctrl+F 查找、Ctrl+N 分屏、Ctrl+B 快捷命令、Ctrl+Shift+A AI 面板、Ctrl+1..9 切换标签

### Fixed
- 根 `pnpm type-check` 全绿：改为按包编排（core/desktop/mobile 各自 tsc），消除 desktop 与 mobile 两份 @types/react 版本冲突导致的 55 个假错误
- core 控制器 2 处未用参数（Suggest/Fix Controller）改名 _args
- 清理全部 8 个 ESLint error（xinghuo 未用变量、ptyAvailable 未用、no-var-requires、未转义引号）
- 讯飞星火适配器增加 API Key 格式校验（APPID:APISecret:APIKey）

### Changed
- 手机端移除桌面中继与 mock 命令/AI/文件数据，全部页面切换为真实运行时状态
- 手机端限制为 64 位 ABIs（arm64-v8a / x86_64），权限收紧为 INTERNET，允许局域网 Ollama 明文 HTTP
- 桌面端核心逻辑新增单元测试（补全/片段/设置/终端总线/路径解析/对话持久化/流式中断），vitest 88/88 通过
- 打包拆包：设置页与资源管理器改为懒加载，xterm/react 拆为独立 chunk，最大包 527KB → 298KB，消除体积警告

### Planned
- 设备同步服务
- 插件系统
- 命令自动补全（终端内联语法高亮）
- 语法高亮

## [0.1.0] - 2024-01-XX

### Added
- SSH 连接管理与配置存储
- 命令历史与搜索
- 多标签与分屏终端
- 只读资源管理器
- AI 助手侧边面板与独立 AI Chat
- 9 厂商 AI Provider 与动态模型列表
- 系统监控
- 会话保存与恢复
- 凭据加密存储（Electron safeStorage）
- React Native 移动端 App（Android APK）
- Initial release
- Cross-platform desktop application (Windows, macOS, Linux)
- Local shell terminal with xterm.js
- Multi-tab terminal support
- AI integration framework
- Support for multiple AI providers:
  - OpenAI (GPT-3.5, GPT-4)
  - Anthropic Claude
  - Baidu Wenxin (文心一言)
  - Alibaba Tongyi (通义千问)
  - Ollama (local models)
- AI-powered command controllers:
  - `ai` - AI assistant chat
  - `explain` - Explain shell commands
  - `translate` - Natural language to shell command
  - `suggest` - Command suggestions
  - `fix` - Fix failed commands
  - `optimize` - Optimize commands
- AI chat interface
- Settings page for AI provider management
- Command history storage
- SQLite local database
- VS Code-inspired dark theme UI
- Monorepo structure with pnpm workspaces
- TypeScript support throughout
- Comprehensive documentation

### Technical Details
- Electron 28+ for desktop application
- React 18 with TypeScript for UI
- xterm.js for terminal emulation
- node-pty for pseudo-terminal
- better-sqlite3 for local storage
- Modular AI adapter architecture
- IPC communication between main and renderer processes

### Documentation
- README with quick start guide
- Architecture documentation
- Development guide
- Deployment guide
- API documentation
- Installation guide

## [0.0.1] - 2024-01-XX

### Added
- Project initialization
- Basic project structure
- Core module setup
- Desktop package setup
- Build configuration

[Unreleased]: https://github.com/yourusername/ai-shell/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/ai-shell/releases/tag/v0.1.0
[0.0.1]: https://github.com/yourusername/ai-shell/releases/tag/v0.0.1
