# AI Shell 架构说明

## 1. 总览

AI Shell 使用 pnpm monorepo，桌面端与 Android 端共享核心 AI/存储类型，但分别运行在 Electron 和 React Native 环境中。

```text
┌──────────────────────────────┐
│ packages/core                │
│ AI 适配器 / SQLite 存储 / 控制器 │
└──────────────┬───────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼─────────┐  ┌────▼────────────────────┐
│ Desktop       │  │ Mobile                   │
│ Electron      │  │ React Native / Expo      │
│ node-pty      │  │ Kotlin Native Modules    │
│ ssh2          │  │ Alpine + PRoot + OpenSSH │
└───────────────┘  └──────────────────────────┘
```

## 2. 包结构

| 路径                     | 职责                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `packages/core`          | 多 Provider AI 适配器、SQLite/sql.js 存储、文心/Claude 等协议实现、控制器 |
| `packages/desktop`       | Electron 主进程、preload、React 渲染层、终端/SSH/文件/设置                |
| `packages/mobile`        | React Native UI、运行时服务、Android Kotlin 原生模块、内置 rootfs         |
| `packages/shared-assets` | 品牌图标等共享资产                                                        |

## 3. 桌面端

### 3.1 进程边界

- **主进程**：窗口、IPC、`node-pty`、ssh2、SQLite、`safeStorage`、系统监控、macOS 原生菜单。
- **preload**：通过 `contextBridge` 暴露受控 API，启用 `contextIsolation`，关闭 `nodeIntegration`。
- **渲染进程**：React 页面、xterm.js、设置、文件浏览和快捷键状态。

```text
Renderer
  │ contextBridge API
  ▼
Preload
  │ IPC invoke / event
  ▼
Main
  ├─ ShellManager (node-pty)
  ├─ SSHManager (ssh2)
  ├─ LocalStorage (sql.js)
  └─ safeStorage (凭据加解密)
```

### 3.2 终端与 SSH 数据流

```text
键盘/粘贴 → xterm input tracker → IPC → node-pty / ssh2
PTY/SSH data → IPC event → xterm.write + AI 上下文缓冲
命令提交 → shell:write → 历史记录 → 输出与退出事件
```

- ANSI 清理和输入行跟踪用于 Tab 补全、错误检测和 AI 上下文。
- SSH 私钥读取可在主进程将文件路径解析为 PEM 内容。
- 终端标签、分屏和 AI 面板尺寸保存在渲染层设置中。

### 3.3 命令补全

- 补全候选来源：历史命令、快捷片段、系统命令目录。
- 目标系统由本机 `process.platform` 或 SSH 配置的远端系统决定。
- 支持 Alpine、Linux、macOS、Windows PowerShell、Windows CMD。
- 路径补全根据末尾 token 读取资源管理器目录，仅替换该 token。

### 3.4 快捷键

- `shortcuts.ts` 统一快捷键动作、默认值、规范化、冲突和方案模型。
- Windows/Linux 使用 Ctrl；macOS 使用 Command，Control 组合保留给终端。
- 快捷键保存在 `appSettings`，支持默认恢复、命名方案和持久化。
- macOS 主进程注册原生菜单：`⌘W` 关闭标签，`⇧⌘W` 关闭窗口，`⌘,` 打开设置；录制期间临时挂起菜单加速器。

## 4. Android 手机端

### 4.1 JS 与原生边界

```text
React Native UI
  │ NativeModules / DeviceEventEmitter
  ▼
Kotlin Native Modules
  ├─ LinuxRuntimeModule
  ├─ RootfsInstaller
  ├─ SecureConfigModule
  └─ DeviceUtilityModule
  ▼
App-private rootfs + PRoot + OpenSSH
```

### 4.2 内置运行时

- rootfs 与 runtime 元数据位于 `android/app/src/main/assets/linux/`。
- 首次安装解压到应用私有目录，并把 PRoot/loader 链接到当前 `nativeLibraryDir`。
- `LinuxRuntimeModule` 通过 PRoot 启动 bash/SSH，使用 `script` 提供 PTY。
- 文件浏览把 `/root/shared`、`/root/android` 映射到外置应用目录，其余路径限制在 rootfs。

### 4.3 会话与私钥生命周期

- `SessionRegistry` 原子管理 pending/active 会话，避免停止与启动竞态。
- `SessionPrivateKeys` 创建临时权限为 0600 的 PEM 文件，在停止、退出、重置、模块销毁和下次启动时清理。
- SSH 每次会话可指定远端系统，用于补全、历史标签和 AI 系统提示。

### 4.4 配置存储

- Android 原生 `SecureConfigModule` 使用 Android Keystore AES-256-GCM 加密配置。
- Web/Expo 预览退化为 `localStorage`，仅用于界面预览，不应录入真实凭据。
- 配置文件包含 AI Provider、SSH 主机、工作区和命令历史；私钥不会写入 APK assets。

## 5. AI 层

### 5.1 core 适配器

- `AIServiceImpl` 根据 Provider 配置选择适配器。
- 支持 OpenAI 兼容协议、Claude、Ollama、文心、讯飞星火。
- 流式能力由 adapter 的 `streamChat` 提供，并支持 AbortSignal 中断。

### 5.2 移动端协议

- 移动端直接调用 Provider HTTP API，不经过桌面中继。
- 当前为非流式请求；星火 WebSocket 鉴权暂未接入。
- 系统提示会根据当前终端系统生成对应命令建议。

## 6. 存储

### 桌面

- `LocalStorage` 基于 sql.js，保存 AI Provider、SSH 配置、命令历史等。
- 凭据字段在 Electron `safeStorage` 可用时加密后落库；不可用时当前代码保留明文，因此生产环境必须确认系统密钥环可用。
- 对外返回的 SSH/AI 配置只包含掩码或能力标记。

### Android

- SecureConfig 管理加密 JSON。
- rootfs 内的临时私钥和 rootfs 文件由原生模块管理，不进入配置数据库。

## 7. 设计系统

- 深色三级表面、系统蓝单一强调色、语义成功/警告/错误色。
- Apple HIG 风格圆角、间距、状态胶囊、焦点环和减少动态效果支持。
- 详情见 [docs/UI_DESIGN.md](docs/UI_DESIGN.md) 和
  [全端重设计规格](docs/superpowers/specs/2026-10-27-all-pages-redesign-design.md)。

## 8. 构建与产物

| 目标          | 命令                                       | 主要产物                   |
| ------------- | ------------------------------------------ | -------------------------- |
| 类型检查      | `pnpm type-check`                          | —                          |
| 全仓测试      | `pnpm test`                                | Vitest 结果                |
| 桌面构建      | `pnpm build:desktop`                       | `packages/desktop/dist`    |
| 桌面打包      | `pnpm --filter @ai-shell/desktop package`  | `packages/desktop/release` |
| 移动 Web      | `pnpm --filter @ai-shell/mobile build:web` | `packages/mobile/dist`     |
| Android Debug | `./gradlew assembleDebug`                  | `app-debug.apk`            |

## 9. 已知边界

- 没有持续连接的 Android 真机；PRoot/PTY/SSH 需真机验收。
- macOS 菜单通过源码与渲染层模拟验证，仍需物理 Mac 验收。
- Release APK 当前沿用 debug keystore，不适合正式分发。
- 首次 SSH 连接采用 `accept-new`，高安全环境应增加指纹确认。
