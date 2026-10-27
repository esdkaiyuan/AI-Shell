# AI Shell Mobile

AI Shell Mobile 是 AI Shell 的 Android 客户端，基于 React Native / Expo 与原生 Android 模块构建。APK 内置 Alpine Linux 用户态，终端、文件、SSH 和 apk 包管理都可以离线使用，不再依赖桌面端中继。

署名：`esdkaiyuan`

## 内置环境

APK 直接打包以下运行资源（不包含任何 API Key）：

- Alpine Linux 3.20.3 rootfs（arm64-v8a / x86_64 各一份）。
- Termux PRoot 5.1.107 与 loader / talloc / android-shmem。
- bash、coreutils、grep、sed、gawk、git、curl、wget、OpenSSH 客户端、nano、less、htop、tzdata、util-linux、tar/gzip/xz、unzip/zip、procps、apk 包管理器。
- 首次启动在应用私有目录解压（约 100 MB），之后直接离线使用；不会在运行时下载可执行文件。

首次启动向导依次完成：

1. 安装/解压内置 Linux。
2. 配置 AI Provider（Key 使用 Android Keystore AES-256-GCM 加密保存）。
3. 可选配置 SSH 主机与私钥。
4. 进入终端工作台。

APK 更新后会自动把 proot 链接修复到新的 nativeLibraryDir，无需重新解压 rootfs。

## 真实能力

- **终端**：真实 PTY（`util-linux script`）驱动的 bash 会话，支持多标签、分屏、搜索、Ctrl+C/Tab/方向键、清屏、复制粘贴和命令历史。
- **SSH**：调用内置 OpenSSH 客户端，支持密码交互或加密保存的私钥；内置 `StrictHostKeyChecking=accept-new`。
- **AI**：手机端直接请求 Provider API，自动附带当前终端最近输出作为上下文。当前使用非流式请求。
- **文件**：只读浏览内置 Linux rootfs，可切换隐藏文件并预览文本（最大 128 KB）。
- **系统状态**：通过原生模块读取 CPU、内存、磁盘与进程内存。
- **会话**：保存/恢复当前标签布局。
- **扩展**：可在终端执行 `apk update` / `apk add ...` 在线扩展环境。

## AI Provider

支持 OpenAI、Claude、DeepSeek、智谱 GLM、通义千问（兼容模式）、Moonshot / Kimi、Ollama、文心一言。

- OpenAI 兼容厂商、Claude、Ollama 支持拉取模型列表。
- 讯飞星火需要 WebSocket HMAC 鉴权，当前移动端暂未接入。
- Ollama 可填局域网地址（例如 `http://192.168.1.10:11434`）。
- API Key 仅以脱敏形式展示；配置文件由 Android Keystore 加密。

## 构建

环境要求：

- Node.js 18（Metro / Gradle 打包建议使用 18，避免 Node 24 在 Windows 上的兼容问题）
- pnpm
- JDK 17
- Android SDK + NDK

检查：

```bash
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile test
```

构建 release APK（默认同时包含 arm64-v8a 与 x86_64）：

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME='C:\Users\28916\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;" + $env:PATH
cd packages/mobile/android
.\gradlew.bat assembleRelease --console=plain
```

只构建模拟器架构：

```powershell
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --console=plain
```

APK 输出：

```text
packages/mobile/android/app/build/outputs/apk/release/app-release.apk
```

当前 release 构建沿用 `app/debug.keystore` 签名，仅适合内部测试；正式分发请替换为自己的 release keystore。

## 关键文件

```text
App.tsx                                  手机端页面与工作区
src/components/SetupWizard.tsx           首次启动向导
src/hooks/useTerminalRuntime.ts          PTY 会话与 ANSI 流过滤
src/services/config.ts                   加密配置、Provider/SSH/历史/会话
src/services/ai.ts                       Provider 直连客户端
android/app/src/main/java/.../nativebridge
  RootfsInstaller.kt                     rootfs 解压与 proot 链接
  LinuxRuntimeModule.kt                  PTY 会话、文件、会话桥
  SecureConfigModule.kt                  Android Keystore 配置
  DeviceUtilityModule.kt                 剪贴板与系统指标
android/app/src/main/assets/linux         rootfs、runtime.json、第三方许可
android/app/src/main/jniLibs               proot / loader / talloc / shmem
```

## 第三方许可

内置 rootfs 与 PRoot 的许可说明见：

```text
android/app/src/main/assets/linux/THIRD_PARTY_NOTICES.md
```

PRoot 使用 GPL-2.0；分发 APK 时请保留许可文件并按要求提供对应源码。

## 设计风格

- Apple HIG 深色体系：中性表面、系统蓝强调色、圆角卡片与胶囊状态。
- 顶部展示 `署名 esdkaiyuan`。
- 终端使用等宽字体，AI / 表单使用系统字体。
