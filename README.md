# AI Shell

AI Shell 是面向开发、运维和服务器管理场景的跨平台智能终端工作台，包含 Electron 桌面端和自带 Linux 运行时的 Android 客户端。终端、SSH、文件浏览、会话恢复和 AI 助手在同一套界面中协作，桌面端与手机端共享一致的深色设计语言。

项目署名：`esdkaiyuan`

## 核心能力

- **真实终端**：桌面端基于 xterm.js + node-pty；手机端在 APK 内运行 Alpine Linux、PRoot 和真实 PTY，无需桌面中继。
- **SSH 运维**：密码或私钥认证、多标签远程会话、会话保存恢复；手机端内置 OpenSSH，并支持选择远端操作系统。
- **多系统命令补全**：根据本机或 SSH 远端系统使用 Alpine、Linux、macOS、Windows PowerShell、Windows CMD 指令集。
- **AI 助手**：支持 OpenAI、Claude、DeepSeek、智谱 GLM、通义千问、Moonshot、Ollama、文心一言；桌面端提供流式输出与停止生成，移动端为非流式直连。
- **私钥文件导入**：手机端可从系统文件选择器导入 OpenSSH、RSA、ECDSA、PKCS#8 和加密 PEM，并拒绝证书、公钥和 PuTTY `.ppk`。
- **可定制快捷键**：桌面端可录制、恢复默认、检测冲突并保存多套快捷键方案；macOS 使用 Command 键位与原生菜单。
- **只读文件浏览**：桌面端资源管理器和手机端 rootfs 浏览器均保持只读边界。

## 功能对照

| 模块     | 桌面端                               | Android 手机端                      |
| -------- | ------------------------------------ | ----------------------------------- |
| 本地终端 | xterm.js + node-pty                  | APK 内置 Alpine Linux + PRoot + PTY |
| SSH      | ssh2，密码/私钥/密钥密码             | 内置 OpenSSH，密码/私钥 PEM 文件    |
| 分屏     | 支持                                 | 支持                                |
| 命令补全 | Tab 补全，历史/快捷片段/多系统指令集 | 输入时自动候选，历史/多系统指令集   |
| AI       | 独立对话页 + 终端停靠面板，流式      | 对话页，非流式，附终端上下文        |
| 文件     | 只读资源管理器                       | 只读 Alpine rootfs 浏览器           |
| 会话     | 保存/恢复多终端布局                  | 保存/恢复标签布局                   |
| 快捷键   | 可自定义、恢复、保存方案、macOS 适配 | 触控键栏，无桌面组合键配置          |
| 安全存储 | Electron `safeStorage`               | Android Keystore AES-256-GCM        |

## 多系统命令补全

桌面端 Tab 补全和手机端自动候选均按目标系统选择指令集：

| 系统               | 典型命令                                          |
| ------------------ | ------------------------------------------------- |
| Alpine             | `apk update`、`rc-service`                        |
| Linux              | `systemctl status`、`journalctl -u`               |
| macOS              | `brew install`、`diskutil list`、`launchctl list` |
| Windows PowerShell | `Get-Process`、`Test-NetConnection`               |
| Windows CMD        | `dir`、`tasklist`、`ipconfig /all`                |

SSH 配置可指定远端系统；手机端历史命令也会记录系统标签，避免跨系统误用。

## 快捷键

桌面端默认快捷键：

| 操作         | Windows / Linux | macOS  |
| ------------ | --------------- | ------ |
| 新建终端     | `Ctrl+T`        | `⌘T`   |
| 关闭当前标签 | `Ctrl+W`        | `⌘W`   |
| 查找终端内容 | `Ctrl+F`        | `⌘F`   |
| 切换分屏     | `Ctrl+N`        | `⌘N`   |
| 快捷命令     | `Ctrl+B`        | `⌘B`   |
| AI 停靠面板  | `Ctrl+Shift+A`  | `⌘⇧A`  |
| 清空终端     | `Ctrl+L`        | `⌘L`   |
| 切换标签     | `Ctrl+1…9`      | `⌘1…9` |

在 **设置 → 快捷键** 中可重新录制、恢复默认并保存最多 12 套命名方案。macOS 上 Control 组合保留给终端，窗口关闭使用 `⇧⌘W`，`⌘,` 打开设置。

## 项目结构

```text
ai-shell/
├── packages/
│   ├── core/             # AI 适配器、SQLite 存储、命令控制器
│   ├── desktop/          # Electron 主进程、preload、React 渲染层
│   ├── mobile/           # React Native / Expo + Android 原生模块
│   └── shared-assets/    # 品牌图标等共享资产
├── docs/                 # 使用、安装、开发、架构和 API 文档
├── README.md
└── package.json          # pnpm workspace 根配置
```

## 快速开始

环境要求：

- Node.js >= 18（移动 Web 导出建议使用 Node.js 18）
- pnpm >= 8
- 构建 Android APK：JDK 17、Android SDK/NDK

```bash
pnpm install
pnpm type-check
pnpm test
```

桌面端开发：

```bash
pnpm dev
```

桌面端生产构建：

```bash
pnpm build:desktop
```

桌面端打包：

```bash
pnpm --filter @ai-shell/desktop package
```

手机端开发与 Web 预览：

```bash
pnpm --filter @ai-shell/mobile start
pnpm --filter @ai-shell/mobile build:web
```

Android Debug APK：

```bash
cd packages/mobile/android
./gradlew assembleDebug
```

Windows 使用 `.\gradlew.bat assembleDebug`。产物位于：

```text
packages/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Release 构建当前仍使用 `app/debug.keystore`，仅适合内部测试，正式分发前必须替换为自有 release keystore。

## AI Provider

| 厂商                                      | 协议           | 桌面端 | 手机端   |
| ----------------------------------------- | -------------- | ------ | -------- |
| OpenAI / DeepSeek / GLM / 通义 / Moonshot | OpenAI 兼容    | 支持   | 支持     |
| Claude                                    | Anthropic      | 支持   | 支持     |
| Ollama                                    | Ollama API     | 支持   | 支持     |
| 文心一言                                  | 百度 API       | 支持   | 支持     |
| 讯飞星火                                  | WebSocket 鉴权 | 支持   | 暂未接入 |

API Key 在桌面端使用 Electron `safeStorage` 加密，但系统密钥环不可用时当前实现会退化为明文存储；在 Android APK 中由 Keystore AES-256-GCM 加密。Web 预览环境不具备原生安全存储，不应输入真实生产凭据。

## 安全边界

- 不要提交真实 API Key、SSH 密码或私钥。
- 手机端私钥仅在会话期间写入应用私有 rootfs，并在正常停止、退出、重置或下次启动时清理。
- 手机端首次 SSH 连接使用 `StrictHostKeyChecking=accept-new`；高安全环境应增加人工指纹校验。
- 文件浏览保持只读；写入、删除等高风险操作应在终端中显式执行并人工确认。
- 内置 rootfs 与 PRoot 的许可见 APK 中的 `THIRD_PARTY_NOTICES.md`；PRoot 采用 GPL-2.0。

## 文档

- [文档索引](docs/README.md)
- [使用说明](docs/USAGE.md)
- [安装与构建](docs/INSTALLATION.md)
- [开发指南](docs/DEVELOPMENT.md)
- [架构说明](ARCHITECTURE.md)
- [功能清单](FEATURES.md)
- [UI 设计规范](docs/UI_DESIGN.md)
- [手机端说明](packages/mobile/README.md)
- [变更记录](CHANGELOG.md)

## 技术栈

- **桌面端**：Electron 28、React 18、TypeScript、Vite、xterm.js、node-pty、ssh2
- **手机端**：React Native 0.73、Expo 50、Kotlin 原生模块、Alpine Linux 3.20.3、PRoot
- **核心与存储**：pnpm workspace、SQLite/sql.js、多 Provider 适配器
- **测试**：Vitest、JUnit、Playwright/CDP 界面回归

## 验证范围

当前开发环境完成 Windows Electron、桌面生产构建、移动 Web 导出和 Android Debug APK 构建。源码包含 macOS 菜单与快捷键适配，但物理 macOS 界面、真机 Android SSH/PTY 仍需在对应设备上验收。

## License

MIT License。项目内署名：`esdkaiyuan`。
