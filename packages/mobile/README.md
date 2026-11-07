# AI Shell Mobile

AI Shell 的 Android 客户端，基于 React Native 0.73 / Expo 50 与 Kotlin 原生模块。APK 内置 Alpine Linux、PRoot 和 OpenSSH，终端、SSH、文件浏览和 apk 工具均可离线运行，不依赖桌面中继。

署名：`esdkaiyuan`

## 内置运行时

APK 打包以下资源，不包含任何真实凭据：

- Alpine Linux 3.20.3 rootfs（arm64-v8a / x86_64）。
- Termux PRoot 5.1.107、loader、talloc、android-shmem。
- bash、coreutils、grep、sed、gawk、git、curl、wget、OpenSSH、nano、less、htop、tzdata、util-linux、tar/gzip/xz、unzip/zip、procps、apk。
- runtime 元数据与第三方许可。

首次启动解压到应用私有目录（约 100 MB）。APK 更新后会把 PRoot/loader 重新链接到新的 `nativeLibraryDir`，无需重新解压 rootfs。

## 页面

底部五项导航：

- 终端
- AI
- 文件
- SSH
- 我的

“我的”包含工作区会话、命令历史和运行环境与设置。

## 终端

- 真实 PTY（`util-linux script`）驱动 bash。
- 多标签、分屏、搜索、输出复制、清屏和会话恢复。
- Ctrl+C、Tab、方向键、Esc、Enter 触控键。
- 输入命令时自动显示补全候选，点击填入。
- 空输入时显示当前系统精选命令。
- 补全来源包括历史命令和系统指令集。

### 多系统

支持以下指令集：

- Alpine
- Linux
- macOS
- Windows PowerShell
- Windows CMD

SSH 配置可选择远端系统。历史命令会记录系统标签，避免在 Windows 主机中出现 Alpine 专用历史。

## AI

- 直接调用 Provider API，自动附带当前终端最近输出和目标系统。
- 支持 OpenAI、Claude、DeepSeek、智谱 GLM、通义千问、Moonshot、Ollama、文心一言。
- 移动端当前为非流式请求；讯飞星火 WebSocket 鉴权未接入。
- API Key 使用 Android Keystore AES-256-GCM 加密，界面只显示脱敏值。
- Web/Expo 预览使用 `localStorage`，仅用于界面测试。

## SSH 与 PEM 私钥

- 内置 OpenSSH 客户端，支持密码或密钥认证。
- 可在 SSH 表单中粘贴 PEM，或通过系统文件选择器导入。
- 支持 OpenSSH、RSA、ECDSA、PKCS#8 和加密 PEM。
- 自动处理 BOM、CRLF、包裹文本和缺失换行。
- 拒绝证书、公钥、PuTTY `.ppk` 和损坏内容。
- 私钥规范化后由 Keystore 加密保存。
- 每次会话在 rootfs 创建 0600 临时私钥，在停止、退出、重置、模块销毁或下次启动时清理。
- DocumentPicker 缓存副本在读取后立即删除。
- 加密私钥连接时由终端提示口令。
- 首次连接使用 `StrictHostKeyChecking=accept-new`；高安全环境应增加人工指纹校验。

## 文件与历史

- 文件页只读浏览 Alpine rootfs。
- 支持路径导航、隐藏文件、目录切换和最大 128 KB 文本预览。
- `/root/shared` 与 `/root/android` 映射到应用外置目录；路径经过 canonical 边界校验。
- 历史页展示命令、时间和系统标签，点击可填入输入框。
- 清空历史、删除 SSH/会话/Provider 会要求确认。

## 设计

- Apple HIG 深色体系：中性三级表面、系统蓝单一强调色；终端输出区使用独立表面与 hairline 描边，与窗口背景区分。
- 页面标题与上下文副标题分离，状态语义用统一的色点胶囊表达。
- 移动触控目标至少 44dp；标签、工具按钮、发送键均在 44dp 以上。
- 四周安全区（状态栏、手势区、横屏挖孔）；≥720dp 宽屏内容列居中并限宽 560dp。
- 自适应密度：软键盘弹出或窗口高度低于 620dp 时，自动收起终端控制键、快捷命令与 AI 上下文卡片，始终保留输出区与输入栏。决策集中在 `src/layout.ts`，并有 `src/layout.test.ts` 覆盖。
- 终端命令坞：控制键、补全/常用命令与输入栏合并为底部固定分组，输出区 `flex: 1` 独占剩余高度，消除横向滚动条在 flex 列中被拉伸造成的中段空洞。
- 横向列表（标签、控制键、常用命令、模型与厂商 chips）统一使用 Android 渐隐边缘，明确提示还能继续滚动。
- 聊天气泡限宽 86%，用户右对齐、助手左对齐，消息贴近输入栏；空状态在可用区域内垂直居中。
- 底部导航使用顶部指示条 + 图标/文字变色表示选中，避免大面积色块跳动。
- 密钥字段、错误信息和危险操作使用明确文案；首启向导禁用「下一步」时说明原因。

### 模拟器验证

在 `Medium Phone API 36`（1080×2400 / 420dpi / x86_64）上完成首启向导、五个主页面切换、内置 Alpine rootfs 解压与 PTY 会话验证；对照截图修正了终端中段空白、横向列表裁切、空状态贴顶、气泡满宽与导航高亮过重等问题。

> 注意：`debug` APK 默认不打包 JS bundle，脱离 Metro 会白屏。离线安装到模拟器请直接使用 `release` APK（内含 `assets/index.android.bundle`），或先启动 `expo start` 并配置 `adb reverse tcp:8081 tcp:8081`。

## 构建

环境：

- Node.js 18（Metro/Expo 建议）
- pnpm
- JDK 17
- Android SDK + NDK

检查：

```bash
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile test
```

### Debug APK

```bash
cd packages/mobile/android
./gradlew testDebugUnitTest assembleDebug
```

产物：

```text
packages/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17'
$env:ANDROID_HOME='C:\Users\<user>\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;" + $env:PATH
cd packages/mobile/android
.\gradlew.bat assembleRelease --console=plain
```

Release 配置当前沿用 `app/debug.keystore`，仅适合内部测试；正式分发必须替换为自有 release keystore。

### 移动 Web

```bash
pnpm --filter @ai-shell/mobile build:web
```

使用 Node.js 18 执行。Web 版本没有 Keystore、PRoot、PTY 和真实系统文件能力。

## 关键文件

```text
App.tsx                                  页面、导航、终端/AI/SSH 工作区
src/components/SetupWizard.tsx           首启向导、AI/SSH 配置、PEM 导入
src/components/ProfileHome.tsx           我的页面
src/components/BottomNav.tsx             底部五项导航
src/components/TerminalPreview.tsx       终端输出区
src/layout.ts                            紧凑模式、宽屏限宽、渐隐长度等布局决策
src/layout.test.ts                       布局决策单元测试
src/hooks/useKeyboardVisible.ts          由窗口高度差推断软键盘状态（不依赖不可靠的键盘事件）
src/hooks/useTerminalRuntime.ts          会话启动、ANSI 过滤、重启与历史平台
src/services/config.ts                   加密配置与数据模型
src/services/ai.ts                       Provider HTTP 客户端
src/services/commandCatalog.ts           多系统指令集与自动补全
src/services/sshKeys.ts                  PEM 识别、规范化与魔数校验
src/services/sshKeyFiles.ts              DocumentPicker、大小限制、缓存清理
src/mobileState.ts                       页面与会话 reducer 状态
android/app/src/main/java/.../nativebridge
  RootfsInstaller.kt                     rootfs 解压与 PRoot 链接
  LinuxRuntimeModule.kt                  PTY、SSH、文件、会话生命周期
  SessionRegistry.kt                     启动/停止竞态控制
  SessionPrivateKeys.kt                  临时私钥创建与清理
  RuntimePathResolver.kt                 rootfs/bind mount 路径解析
  SecureConfigModule.kt                  Android Keystore 配置
  DeviceUtilityModule.kt                 剪贴板与系统指标
android/app/src/main/assets/linux          rootfs、runtime.json、许可
android/app/src/main/jniLibs               proot / loader / talloc / shmem
```

## 第三方许可

```text
android/app/src/main/assets/linux/THIRD_PARTY_NOTICES.md
```

PRoot 使用 GPL-2.0。分发 APK 时必须保留许可文件，并按 GPL 要求提供对应源码。

## 验证边界

- 当前开发环境完成 Android 单元测试和 Debug APK 构建。
- 没有持续连接的 Android 真机；PRoot、PTY、文件选择器和真实 SSH 登录仍需设备验收。
- Release APK 使用 debug 签名，不适合公开分发。
