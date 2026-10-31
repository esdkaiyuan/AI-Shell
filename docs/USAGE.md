# AI Shell 使用说明

署名：`esdkaiyuan`

AI Shell 包含 Electron 桌面端和 Android 手机端。桌面端适合完整终端工作流；手机端在 APK 内运行 Alpine Linux，不依赖桌面中继。

## 1. 安装与启动

### 桌面端

从源码开发：

```bash
pnpm install
pnpm dev
```

生产构建与打包：

```bash
pnpm build:desktop
pnpm --filter @ai-shell/desktop package
```

打包产物位于 `packages/desktop/release/`。

### Android

Debug APK：

```bash
cd packages/mobile/android
./gradlew assembleDebug
```

Windows 使用 `.\gradlew.bat assembleDebug`。产物：

```text
packages/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Release 构建当前沿用 debug keystore，仅用于内部测试。

## 2. 桌面端

### 主界面

- 左侧工作轨：终端、文件、AI 助手、设置。
- 顶部工具栏：新建、SSH、会话、保存、复制、粘贴、查找、快捷命令、分屏、AI 面板。
- 中央区域：终端标签与工作面，或独立功能页面。
- 底部状态栏：就绪状态、UTF-8、当前终端、系统监控和署名。

### 终端

- 点击 `+` 新建本地终端。
- 单击标签切换；双击重命名；拖拽排序。
- 标签关闭按钮关闭当前终端，最后一个标签保留。
- “分屏”创建新的窗格，再次点击取消分屏。
- 搜索支持大小写、全字、正则和结果导航。
- `Tab` 使用历史命令、快捷片段和系统指令集补全。
- 补全候选会显示“常用 / 历史 / 快捷命令 / 路径”来源。

### 多系统补全

终端根据本机或 SSH 远端系统选择指令集：

- Alpine
- Linux
- macOS
- Windows PowerShell
- Windows CMD

SSH 连接表单的“远端系统”决定远程会话的补全系统。标签切换固定使用平台主修饰键 + `1…9`。

### SSH

1. 点击工具栏“SSH”。
2. 新建连接，填写名称、主机、端口、用户名。
3. 选择远端系统。
4. 选择密码或密钥认证。
5. 保存并连接，远程会话会作为新的终端标签打开。

密钥认证可填写私钥路径或 PEM 内容，并可配置密钥密码。凭据由 Electron `safeStorage` 加密后保存。

### AI 助手

- **独立 AI 页面**：最大 860px 阅读列，支持流式输出、停止生成、多会话持久化。
- **终端 AI 面板**：停靠在右侧或底部，自动读取当前终端上下文。
- Provider 支持 OpenAI、Claude、DeepSeek、智谱 GLM、通义千问、Moonshot、Ollama、文心一言和讯飞星火。
- 模型和 Provider 选择可在界面内切换。

AI 配置入口：**设置 → AI 提供商**。选择模板、填写 Key、获取或手动填写模型，再保存。

### 文件

桌面资源管理器提供：

- 工作区与 Home 根目录切换。
- 目录展开、隐藏文件、文件选择。
- 复制路径、插入终端路径和 `cd` 等只读辅助操作。

文件浏览保持只读；写入和删除应通过终端显式执行。

### 设置

设置包含四个分组：

- **AI 提供商**：添加、删除、模型管理。
- **SSH 配置**：查看和删除已保存连接。
- **通用设置**：主题、字号、字体、光标、回滚缓冲。
- **快捷键**：录制、恢复默认和方案管理。

默认快捷键：

| 操作         | Windows / Linux | macOS  |
| ------------ | --------------- | ------ |
| 新建终端     | `Ctrl+T`        | `⌘T`   |
| 关闭当前标签 | `Ctrl+W`        | `⌘W`   |
| 查找         | `Ctrl+F`        | `⌘F`   |
| 分屏         | `Ctrl+N`        | `⌘N`   |
| 快捷命令     | `Ctrl+B`        | `⌘B`   |
| AI 面板      | `Ctrl+Shift+A`  | `⌘⇧A`  |
| 清空终端     | `Ctrl+L`        | `⌘L`   |
| 切换标签     | `Ctrl+1…9`      | `⌘1…9` |

自定义方法：

1. 进入 **设置 → 快捷键**。
2. 点击目标组合键，按下新组合。
3. 冲突或系统保留组合会提示，录制时按 `Esc` 取消。
4. 保存方案时输入名称，可应用、覆盖或删除方案。
5. “恢复默认快捷键”不会删除已保存方案。

macOS 说明：

- `⌘W` 关闭标签，`⇧⌘W` 关闭窗口，`⌘,` 打开设置。
- Control 组合保留给终端，例如 Ctrl+W、Ctrl+A。
- 录制快捷键期间原生菜单加速器会临时挂起，避免误退出。

## 3. Android 手机端

### 首次启动

向导依次完成：

1. 安装/解压内置 Alpine Linux。
2. 配置 AI 提供商。
3. 可选配置 SSH。
4. 查看摘要并进入工作台。

安装约占用 100 MB；之后终端、OpenSSH、git、curl 和 apk 可离线使用。

### 导航

底部五项：

- 终端
- AI
- 文件
- SSH
- 我的

“我的”包含：

- 工作区会话
- 命令历史
- 运行环境与设置

### 终端

- 新建、切换和关闭标签。
- 分屏、搜索、输出复制、清屏和会话恢复。
- 触控键栏提供 Ctrl+C、Tab、方向键、Esc、Enter。
- 输入命令时会自动显示当前系统的补全候选，点击填入。
- 空输入时显示当前系统精选常用命令。
- 历史候选按 Alpine、Linux、macOS、PowerShell、CMD 区分。

### AI

AI 页面包含“对话”和“模型”两个模式：

- 对话自动附带当前终端最近输出和系统类型。
- 模型页管理 Provider 与模型。
- 移动端使用非流式请求；星火 WebSocket 鉴权暂未接入。

API Key 使用 Android Keystore AES-256-GCM 加密。Web/Expo 预览使用 `localStorage`，只适合界面测试。

### SSH 与私钥文件

- 可保存主机、端口、用户名、远端系统和私钥。
- 点击“从文件选择私钥”导入 PEM，支持 OpenSSH、RSA、ECDSA、PKCS#8 和加密 PEM。
- 证书、公钥、PuTTY `.ppk` 和损坏密钥会被拒绝。
- 私钥规范化为 PEM 后由 Keystore 加密保存。
- 每次会话在 rootfs 创建 0600 临时私钥，并在停止、退出、重置或下次启动时清理。
- 加密私钥连接时会在终端提示口令。
- 文件选择器产生的缓存副本在读取后删除。

远端系统选择会影响命令补全、历史标签和 AI 命令建议。

### 文件与历史

- 文件页只读浏览 Alpine rootfs。
- 支持路径导航、隐藏文件、目录切换和最大 128 KB 文本预览。
- 历史页展示已提交命令、时间与系统标签，点击可填入当前输入框。

### 设置

设置页展示：

- Linux 运行时、AI 提供商、SSH 连接和密钥存储状态。
- CPU、内存、磁盘和署名。
- 环境与配置向导。
- 内置能力与第三方许可说明。
- 重置内置 Linux（需确认）。

## 4. 构建与验证

```bash
pnpm type-check
pnpm test
pnpm build:desktop
pnpm --filter @ai-shell/mobile build:web
```

移动 Web 导出建议使用 Node.js 18。Android 原生测试与 Debug APK：

```bash
cd packages/mobile/android
./gradlew testDebugUnitTest assembleDebug
```

## 5. 安全建议

- 不要提交或截图真实 API Key、SSH 密码和私钥。
- 高风险命令先让 AI 解释影响，再人工确认。
- 文件浏览保持只读；写操作在终端中明确执行。
- 手机端首次 SSH 连接使用 `accept-new`，高安全环境应增加主机指纹确认。
- Web 预览不具备原生安全存储，不要输入生产凭据。
- PRoot 使用 GPL-2.0；分发 APK 时保留许可并履行源码提供义务。

## 6. 项目简述

AI Shell 是一款以终端和 AI 为核心的跨平台运维工作台。桌面端提供完整终端、SSH、文件、会话和 AI 流式能力；手机端通过 APK 内置 Linux 运行时实现可随身使用的真实终端，并针对触屏重排信息架构和多系统命令补全。

项目署名：`esdkaiyuan`。
