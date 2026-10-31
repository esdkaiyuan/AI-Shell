# 开发指南

## 1. 环境

- Node.js >= 18；移动 Web 导出建议固定 Node.js 18。
- pnpm >= 8。
- 桌面端原生依赖需要 C++ 构建工具；Windows 推荐 VS Build Tools，macOS 安装 Xcode Command Line Tools。
- Android 构建需要 JDK 17、Android SDK、NDK。

```bash
pnpm install
pnpm type-check
pnpm test
```

## 2. 仓库结构

```text
packages/
├── core/                 # AI 适配器、存储、控制器
│   └── src/
│       ├── ai/           # Provider 适配器、流式服务
│       ├── controllers/  # 命令控制器
│       ├── storage/      # sql.js 本地存储
│       └── types.ts
├── desktop/
│   ├── src/main/         # Electron 主进程、PTY、SSH、菜单
│   ├── src/preload/      # contextBridge API
│   ├── src/renderer/     # React 页面与组件
│   └── scripts/          # 主进程 bundle 脚本
├── mobile/
│   ├── App.tsx           # 手机端页面状态与工作区
│   ├── src/              # 服务、组件、原生桥接
│   └── android/          # Kotlin 模块、rootfs、Gradle
└── shared-assets/
docs/
```

## 3. 常用命令

### 桌面端

```bash
pnpm dev                    # preload 构建 + 主进程/preload watch + Vite
pnpm build:desktop          # 主进程、preload、bundle、renderer
pnpm --filter @ai-shell/desktop package
```

桌面端 preload 必须单独编译到 `dist/preload/index.js`。修改 `src/preload/` 后开发模式会自动 watch；生产构建由 `build:preload` 生成。

### 手机端

```bash
pnpm --filter @ai-shell/mobile start
pnpm --filter @ai-shell/mobile android
pnpm --filter @ai-shell/mobile test
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile build:web
```

移动 Web 导出：

```bash
node18 ./node_modules/pnpm/bin/pnpm.cjs --dir packages/mobile run build:web
```

具体 Node 18 路径以本机安装为准。Node 24 在当前 Expo 50/Metro 组合下可能触发 `node:sea` 兼容错误。

Android：

```bash
cd packages/mobile/android
./gradlew testDebugUnitTest
./gradlew assembleDebug
```

Windows 使用 `gradlew.bat`。Release 构建当前仍使用 debug keystore，仅适合内部测试。

## 4. 桌面端模块

| 文件                                   | 职责                                  |
| -------------------------------------- | ------------------------------------- |
| `src/main/index.ts`                    | 窗口、IPC、存储、系统监控、macOS 菜单 |
| `src/main/shell/manager.ts`            | node-pty 本地终端                     |
| `src/main/ssh/manager.ts`              | ssh2 会话                             |
| `src/preload/index.ts`                 | 受控 renderer API                     |
| `src/renderer/App.tsx`                 | 外壳、终端视图、全局快捷键            |
| `src/renderer/commandSuggest.ts`       | Tab 补全与路径补全                    |
| `src/renderer/shortcuts.ts`            | 快捷键动作、匹配、冲突、方案模型      |
| `src/renderer/appSettings.ts`          | 外观、快捷键和方案持久化              |
| `src/renderer/components/Settings.tsx` | AI/SSH/通用/快捷键设置                |

### 终端数据流

```text
xterm input → input tracker → shell/ssh write
PTY/SSH output → IPC event → xterm + 上下文缓冲
```

修改终端输出处理时必须保留跨 chunk ANSI 状态和未完成行合并逻辑。

### 添加快捷键

1. 在 `SHORTCUT_DEFINITIONS` 和 `DEFAULT_SHORTCUTS` 增加动作。
2. 在 `App.tsx` 的动作分发中实现行为。
3. 更新工具栏提示，使用 `formatShortcut` 展示平台键位。
4. 增加 `shortcuts.test.ts` 覆盖匹配、冲突和平台规则。

### macOS

- 主进程只在 `darwin` 注册原生菜单。
- `⌘W` 留给标签关闭，`⇧⌘W` 关闭窗口，`⌘,` 发送导航事件打开设置。
- 录制快捷键期间主进程临时挂起菜单加速器。
- 不要使用 `navigator.platform`；平台来自 preload 的 `system.platform`。

## 5. 手机端模块

| 文件                                 | 职责                                    |
| ------------------------------------ | --------------------------------------- |
| `App.tsx`                            | 页面、导航、工作区和表单交互            |
| `src/components/SetupWizard.tsx`     | 首启向导、PEM 导入、AI/SSH 配置         |
| `src/hooks/useTerminalRuntime.ts`    | 会话启动、输出过滤、重启和历史平台标签  |
| `src/services/config.ts`             | 加密配置、Provider、SSH、历史和会话模型 |
| `src/services/ai.ts`                 | Provider HTTP 直连                      |
| `src/services/commandCatalog.ts`     | 多系统指令集与自动补全                  |
| `src/services/sshKeys.ts`            | PEM 识别、规范化和校验                  |
| `src/services/sshKeyFiles.ts`        | 文件选择、大小限制和缓存清理            |
| `android/.../RootfsInstaller.kt`     | rootfs 解压、PRoot 链接，APK 更新修复   |
| `android/.../LinuxRuntimeModule.kt`  | PTY、SSH、文件、会话生命周期            |
| `android/.../SessionRegistry.kt`     | 会话启动/停止竞态控制                   |
| `android/.../SessionPrivateKeys.kt`  | 会话临时私钥创建和清理                  |
| `android/.../RuntimePathResolver.kt` | rootfs 与 bind mount 路径解析           |
| `android/.../SecureConfigModule.kt`  | Android Keystore 加密配置               |

### 新增系统指令集

1. 在 `commandCatalog.ts` 增加 `CommandPlatform`、标签、平台选项和命令。
2. 在 SSH 表单和配置归一化中加入平台值。
3. 更新桌面 `commandSuggest.ts` 的对应目录。
4. 测试历史隔离、常用命令和冲突系统。

### 密钥处理要求

- 私钥不得写入 APK assets 或源码。
- 文件选择缓存副本必须删除。
- 私钥配置由 Keystore 加密；会话临时文件使用 0600 权限并及时清理。
- 新增生命周期路径时同步更新 `SessionPrivateKeysTest`。

## 6. AI Provider

- 桌面端完整适配器位于 `packages/core/src/ai/adapters/`。
- 移动端协议实现位于 `packages/mobile/src/services/ai.ts`，当前为非流式。
- 新增 Provider 时需要同时更新桌面模板、移动预设、模型列表能力和错误提示。
- 流式修改必须保留 AbortSignal 和停止生成链路。

## 7. 测试

```bash
pnpm test
pnpm exec vitest run packages/desktop/src/renderer/shortcuts.test.ts
cd packages/mobile/android && ./gradlew testDebugUnitTest
```

覆盖重点：

- 桌面补全、路径解析、设置、快捷键、会话持久化、流式中断。
- 移动状态、AI 请求格式、PEM 解析、文件清理、命令目录。
- Android 会话注册竞态、私钥生命周期、rootfs/bind 路径边界。

UI 验收建议使用真实 Electron 和移动 Web：

- 桌面：800×600、1280×800、1440×900；检查弹层、焦点、Escape 和长文本。
- 移动：360、390、430px；检查底部导航、44px 触控目标、键盘和安全区。
- 真实 macOS 菜单、真机 PRoot/PTY/SSH 需要在对应设备补充验收。

## 8. 代码规范

- TypeScript 严格类型，避免未验证的 `any`。
- 界面文案统一中文；平台化快捷键统一使用 `formatShortcut`。
- 不以构建通过代替界面验收。
- 不提交真实凭据、构建产物、日志或临时截图。
