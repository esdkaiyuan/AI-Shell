# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 桌面端与手机端统一 Apple HIG 深色视觉体系：页面标题层级、状态语义、对比度、焦点和响应式布局
- 手机端底部五项导航（终端/AI/文件/SSH/我的），会话、历史、设置调整为二级入口
- SSH 私钥文件导入：支持 OpenSSH、RSA、ECDSA、PKCS#8、加密 PEM；拒绝证书、公钥、PuTTY `.ppk`
- 多系统命令补全：Alpine、Linux、macOS、Windows PowerShell、Windows CMD
- SSH 远端系统选择，历史命令按系统标记，补全和 AI 提示随系统变化
- 桌面自定义快捷键：录制、冲突校验、恢复默认、最多 12 套命名方案
- macOS 快捷键适配：Command 主修饰键、`⌘W` 关闭标签、`⇧⌘W` 关闭窗口、`⌘,` 打开设置、录制期菜单挂起
- 手机端 APK 内置 Alpine Linux 3.20.3 + Termux PRoot（arm64-v8a / x86_64）
- 手机端真实 PTY、OpenSSH、AI 直连、文件浏览、会话、历史与系统统计
- AI 对话持久化、多会话切换、流式输出与停止生成
- 终端标签重命名/拖拽排序、Tab 路径补全、快捷命令片段和 AI 面板拖拽尺寸
- 桌面状态栏与页面空状态移除虚假连接和演示数据

### Fixed

- 修复移动会话启动/停止竞态、过期启动回调和临时私钥残留
- 修复 bind mount 文件路径与终端实际目录不一致
- 修复删除 SSH/会话/Provider 时嵌套点击触发外层连接或加载
- 修复移动标签卡纵向拉伸、页头错误上下文和向导完成态与实际环境矛盾
- 修复千帆/文心兼容请求格式、模型拉取失败反馈和 OpenSSH 私钥换行兼容
- 修复桌面生产构建未编译 preload 的问题
- 根 `pnpm type-check` 改为按包编排，消除 desktop/mobile React 类型冲突

### Changed

- 辅助文字对比度提升到约 5:1 以上；统一中文状态和危险操作确认
- 桌面页头移除重复标题，AI 页面与手机页面完善上下文副标题
- 快捷键平台化：Windows/Linux 使用 Ctrl，macOS 使用 Command，Control 组合保留给终端
- 手机端限制为 64 位 ABIs（arm64-v8a / x86_64），权限收紧为 INTERNET
- 桌面设置页与资源管理器继续按需加载，保持 chunk 拆分
- 文档按当前功能、构建命令、安全边界和真机验收范围重写

### Planned

- 设备同步服务
- 插件系统
- 物理 macOS 与 Android 真机自动化验收
- 终端内联语法高亮

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

[Unreleased]: https://github.com/esdkaiyuan/AI-Shell/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/esdkaiyuan/AI-Shell/releases/tag/v0.1.0
[0.0.1]: https://github.com/esdkaiyuan/AI-Shell/releases/tag/v0.0.1
