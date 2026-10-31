# 项目概况

AI Shell 是一个以终端和 AI 为核心的跨平台运维工作台，项目署名为 `esdkaiyuan`。

## 当前形态

- **桌面端**：Electron + React + xterm.js + node-pty + ssh2。
- **Android 端**：React Native / Expo + Kotlin 原生模块 + Alpine Linux + PRoot + OpenSSH。
- **核心包**：多 Provider AI 适配器、SQLite/sql.js 存储和命令控制器。

## 已实现

### 桌面端

- 多标签本地终端、双击重命名、拖拽排序、分屏、搜索。
- Tab 补全：历史、快捷片段、系统指令集和路径。
- SSH 密码/私钥认证，远端系统选择。
- 独立 AI 对话页与终端 AI 停靠面板。
- 流式输出、停止生成、会话持久化、Provider/模型切换。
- 只读资源管理器。
- 设置：AI 提供商、SSH、通用外观、快捷键。
- 快捷键录制、冲突检测、默认恢复、命名方案保存，以及 macOS 原生菜单适配。

### Android 端

- APK 内置 Alpine Linux 3.20.3 与 PRoot。
- 真实 PTY、OpenSSH、只读文件浏览、会话和历史。
- 首次启动向导与 Android Keystore 加密配置。
- PEM 私钥文件导入：OpenSSH、RSA、ECDSA、PKCS#8、加密 PEM。
- 多系统命令补全和历史隔离。
- AI 直连、终端上下文提示与系统相关指令建议。
- 底部五项导航和二级“我的”页面。

## 安全边界

- 手机端私钥不进入 APK assets，会话临时文件在生命周期结束时清理。
- 手机端配置由 Android Keystore AES-256-GCM 加密。
- 桌面端密码/私钥在 Electron `safeStorage` 可用时加密；不可用时会退化为明文，生产环境必须确认系统密钥环。
- 文件浏览保持只读。
- 手机端 SSH 首次连接使用 `accept-new`，高安全环境应增加指纹确认。

## 验证基线

当前开发环境已完成：

- 全仓 TypeScript 类型检查。
- Vitest 测试与 Android JUnit。
- 桌面生产构建、移动 Web 导出、Android Debug APK 构建。
- 真实 Windows Electron 与多视口界面回归。
- macOS 快捷键/渲染逻辑模拟。

尚未完成：

- 物理 macOS 原生菜单与系统级组合键验收。
- Android 真机上的 PRoot、PTY、文件选择器和真实 SSH 登录验收。
- Release APK 正式签名。

## 文档

- [README](README.md)
- [文档索引](docs/README.md)
- [功能清单](FEATURES.md)
- [架构说明](ARCHITECTURE.md)
- [使用说明](docs/USAGE.md)
- [安装与构建](docs/INSTALLATION.md)
- [开发指南](docs/DEVELOPMENT.md)
- [安全说明](SECURITY.md)
