# AI Shell 使用文档

署名：`esdkaiyuan`

AI Shell 是一个跨平台智能终端客户端，包含 Electron 桌面端和 React Native 手机端。桌面端适合完整终端工作流，手机端适合随身查看、连接、排障和 AI 辅助操作。

## 1. 安装与产物

### 桌面端产物

```text
packages/desktop/release/AI Shell Setup 0.1.0.exe
packages/desktop/release/AI Shell 0.1.0.exe
packages/desktop/release/win-unpacked
```

### 手机端 APK

```text
packages/mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 开发环境

```bash
pnpm install
```

桌面端开发：

```bash
pnpm --filter @ai-shell/desktop dev
```

手机端开发：

```bash
pnpm --filter @ai-shell/mobile start
```

## 2. 桌面端使用

### 主界面

桌面端采用类似 Xshell 的专业终端布局：

- 顶部工具栏：新建终端、SSH、会话、复制、粘贴、搜索、分屏。
- 左侧侧栏：终端、资源管理器、AI、设置。
- 中央区域：终端标签、终端画布、AI 面板或功能页面。
- 底部状态栏：连接状态、编码、当前终端、系统监控和 `esdkaiyuan` 署名。

### 终端

- 点击顶部 `+` 新建本地终端。
- 点击终端标签切换工作区。
- 点击标签关闭按钮关闭终端。
- 点击搜索按钮打开终端输出搜索。
- 点击分屏按钮创建多窗格终端。

### SSH

1. 点击顶部 SSH/网络入口。
2. 新建连接配置。
3. 填写名称、主机、端口、用户名。
4. 选择密码认证或密钥认证。
5. 保存后点击连接，远程会话会作为终端标签打开。

### 会话

会话功能用于保存和恢复多终端工作区。

典型场景：

- 保存“开发环境”：本地终端、构建终端、测试服务器 SSH。
- 保存“运维排障”：多台服务器 SSH、日志窗口、AI 助手面板。
- 每天开始工作时一键恢复上次工作区。

### AI 助手

桌面端提供两种 AI 使用方式：

- **AI Chat**：独立对话页面，适合询问技术问题、生成命令、分析方案。
- **AI 助手面板**：停靠在终端右侧或底部，适合结合当前终端上下文排障。

AI 助手可以：

- 解释命令输出。
- 生成下一步排查命令。
- 优化复杂 Shell 命令。
- 分析报错原因。
- 将建议命令插入当前终端。

### AI Provider 配置

进入设置页后，可以添加 AI Provider。

流程：

1. 选择厂商。
2. 输入 API Key。
3. 获取模型列表，或手动填写模型名。
4. 可选填写自定义 API 地址。
5. 保存 Provider。

支持厂商：

| 厂商 | 说明 |
| --- | --- |
| OpenAI | 支持 GPT 系列模型 |
| Claude | 支持 Anthropic Claude 系列 |
| 百度文心一言 | 通常使用 `API_KEY:SECRET_KEY` |
| 阿里通义千问 | 支持 Qwen 系列 |
| 智谱 GLM | 支持 GLM 系列 |
| 讯飞星火 | 通常使用 `APPID:APISecret:APIKey` |
| Moonshot AI | 支持 moonshot 系列 |
| DeepSeek | 支持 deepseek-chat / deepseek-coder |
| Ollama (本地) | 适合本地开源模型 |

### 资源管理器

资源管理器提供类似电脑文件管理器的浏览体验。

- 默认保持只读边界。
- 选择文件后可生成预览命令。
- 写入、删除、移动等高风险操作建议通过终端命令显式执行。

## 3. 手机端使用

手机端是独立应用，可安装 APK。它不是网页版本，而是为触屏环境重新设计的终端客户端。

### 导航

手机端包含以下入口：

- 终端
- SSH
- 会话
- 文件
- AI
- 历史
- 设置

### 终端工作区

手机端终端工作区支持：

- 新建内置 Alpine Linux 本地终端（不再依赖桌面中继）。
- 首次启动向导安装/解压 rootfs，之后离线使用。
- 切换、关闭、重命名终端标签；保存/恢复标签布局。
- 分屏窗格、搜索终端输出、快捷命令与命令键（Ctrl+C / Tab / 方向键）。
- 真实 PTY 命令输入与执行，支持 `apk update`、`apk add`、`git`、`curl`、`ssh` 等。
- 从终端工具区直接进入 AI 对话，AI 会附带最近终端输出。

### 手机端 AI

AI 页面分为两个模式：

- **对话**：默认模式，用于直接询问 AI，结合当前终端上下文生成建议。
- **模型**：管理和导入 AI Provider。

终端工具区里的 AI 按钮会直接进入“对话”模式，避免模型配置页面占据首屏。

### 手机端 AI Provider 配置

手机端通过首次启动向导或 AI 页的“配置 AI Provider”完成配置：

1. 选择 AI 提供商。
2. 输入 API Key。
3. 选择或手动输入模型。
4. 可选“获取模型列表”和自定义 API 地址。
5. 保存后立即生效。

Key 使用 Android Keystore AES-256-GCM 加密保存在本机，界面只展示脱敏预览。
移动端使用非流式请求；讯飞星火 WebSocket 鉴权暂未接入。

### SSH 与会话

- SSH 页面展示真实配置卡片；可在向导中保存主机、端口、用户名和私钥。
- 点击连接后，在内置 Linux 中启动 OpenSSH 客户端并创建 SSH 类型终端标签。
- 私钥加密保存，连接时写入 rootfs 的 `~/.ssh`；密码认证在终端中交互输入。
- 会话页面可保存当前标签布局并一键恢复。

### 文件与历史

- 文件页只读浏览内置 Linux rootfs，可切换隐藏文件、刷新目录。
- 点击文件会读取并预览内容（最大 128 KB）。
- 历史页展示已提交到内置 Linux 的命令，点击可插入当前终端输入框。

### 设置

设置页展示：

- 内置 Linux 运行时版本与 ABI。
- AI Provider、SSH 配置数量。
- Android Keystore 加密存储说明。
- 实时 CPU / 内存 / 磁盘状态。
- 环境与配置向导、重置内置 Linux。
- 应用署名：`esdkaiyuan`。

## 4. 构建命令

桌面端 build：

```bash
pnpm --filter @ai-shell/desktop build
```

桌面端打包：

```bash
pnpm --filter @ai-shell/desktop exec electron-builder --config.npmRebuild=false
```

手机端类型检查和测试：

```bash
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile test
```

Android release APK：

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME='C:\Users\28916\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;" + $env:PATH
cd packages/mobile/android
.\gradlew.bat --init-script gradle-mirrors.gradle assembleRelease --console=plain
```

## 5. 安全建议

- 不要提交真实 API Key、SSH 密码或私钥。
- 不要在截图、演示或日志里暴露完整密钥。
- 对高风险命令先让 AI 解释影响，再人工确认。
- 资源管理器保持只读边界，写操作通过终端明确执行。
- 手机端只会连接你配置的 SSH 服务器；首次连接会记录 known_hosts。
- 内置 Linux 运行在应用私有目录中，不能直接访问其他应用数据；`/root/android` 仅映射本应用的外部文件目录。
- APK 内置 PRoot 使用 GPL-2.0，分发时请保留内置许可文件。

## 6. 对外介绍短文

AI Shell 是一款跨平台智能终端客户端，提供桌面端与 Android 手机端。它以 Xshell 风格的专业深色界面为基础，将多标签终端、SSH 管理、会话恢复、资源管理器和 AI 助手整合到一个工作台中。AI 助手支持多家模型厂商，可以结合当前终端上下文解释报错、生成命令和辅助排障。手机端保留核心工作流，并针对触屏环境重新设计了终端、AI 对话、SSH、文件和历史页面。

项目署名：`esdkaiyuan`。
