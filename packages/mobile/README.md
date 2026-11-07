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

按 Apple HIG 收敛的信息架构：

- **主页面**：大标题导航条（34pt Regular 大标题「终端」+ 唯一主操作「AI 辅助」按钮）+ 全屏终端控制台。无底部导航、无工具栏、无副标题。
- **AI 卡片内的权限开关**：对话卡片分段控件下方一行胶囊芯片（读取 / 填入 / 执行），用 `hitSlop` 补足触控面积。「执行」默认关闭，开启后整枚转橙并显示提示。主页面因此只保留终端与命令坞。
- **AI 对话卡片**：初始约 39% 屏高、随消息量增长到 62% 封顶，底部锚定、向上滑入，遮罩减淡使上方终端保持可读；气泡 / 字阶 / 间距 / 输入区全部压缩。
- **功能侧窗**：功能清单可切换到 AI 对话、文件、SSH、工作区会话、命令历史、设置、我的；「终端操作」分组执行新建终端、分屏、查找、清屏、复制输出与粘贴。
- 侧窗遵循 HIG Modality：遮罩变暗、grabber、固定导航条（「功能」返回 / 标题 / 「完成」关闭）；Reduce Motion 降级为零时长动画。
- 关闭方式：完成、点遮罩、Android 硬件返回键（非根分区先回功能清单）。

设计令牌集中在 `src/hig.ts`（深浅两套系统色与灰阶、动态字阶、间距网格、连续圆角、动效、材质、中性投影层级、等宽字体、侧窗尺寸）。`src/theme.ts` 用 `createTheme(scheme, fontScale)` 组装成完整主题（界面色 / 表面 / 终端色 / 投影 / 缩放后的字阶），`src/theme-context.tsx` 的 `ThemeProvider` 随系统外观与「文字大小」设置注入，组件样式以 `makeStyles(theme)` 工厂编写并在主题变化时重建。页面 / 侧窗 / 卡片三级表面按 HIG 层级分配，终端控制台保留独立配色、始终为深色。

## 终端

- 真实 PTY（`util-linux script`）驱动 bash。
- 多标签、分屏、搜索、输出复制、清屏和会话恢复。
- Ctrl+C、Tab、方向键、Esc、Enter 触控键。
- 输入命令时自动显示补全候选，点击填入。
- 空输入时显示当前系统精选命令。
- 补全来源包括历史命令和系统指令集。
- **AI 直接操作终端**：按上方勾选，AI 回复里的命令自动填入输入框或写入 PTY 执行；每条助手消息另有内联「填入 / 执行」按钮，操作后收起对话卡片。命令只从 shell 围栏代码块与独立行内代码提取（`src/aiTerminal.ts`），散文与非 shell 代码块会被忽略，单次最多 3 条、串行写入。`useTerminalRuntime.executeCommand` 绕过输入框直写 PTY，避免先 dispatch 再读取旧状态的竞态。

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

- Apple HIG 双外观体系：深浅两套系统色随系统外观自动切换，中性三级表面、系统蓝单一强调色；终端输出区是沉浸式控制台（无圆角无边框，仅顶部 hairline），与窗口背景靠层次而非描边区分。设置页「外观」可跟随系统或强制浅色 / 深色。
- 字号随系统「文字大小」设置缩放（Dynamic Type），字阶统一由主题层施加。
- 页面标题与上下文副标题分离，状态语义用统一的色点胶囊表达。
- 移动触控目标至少 44dp；标签、工具按钮、发送键均在 44dp 以上。
- 四周安全区（状态栏、手势区、横屏挖孔）；≥720dp 宽屏内容列居中并限宽 560dp。
- 自适应密度：软键盘弹出或窗口高度低于 620dp 时，自动收起终端控制键、快捷命令与 AI 上下文卡片，始终保留输出区与输入栏。决策集中在 `src/layout.ts`，并有 `src/layout.test.ts` 覆盖。
- 终端命令坞：控制键、补全/常用命令与输入栏合并为底部固定分组，输出区 `flex: 1` 独占剩余高度，消除横向滚动条在 flex 列中被拉伸造成的中段空洞。
- 横向列表（标签、控制键、常用命令、模型与厂商 chips）统一使用 Android 渐隐边缘，明确提示还能继续滚动。
- 聊天气泡限宽 86%，用户右对齐、助手左对齐，消息贴近输入栏；空状态在可用区域内垂直居中。
- 主页面与侧窗的主要按钮、标签、清单项保持至少 44dp 触控目标；AI 权限开关与消息内联操作刻意做小（22px 胶囊 / 20px 操作行），改用 `hitSlop` 外扩点击热区，在不牺牲密度的前提下保证可点。
- 密钥字段、错误信息和危险操作使用明确文案；首启向导禁用「下一步」时说明原因。

### 模拟器验证

在 `Medium Phone API 36` 与 `Medium Phone`（1080×2400 / 420dpi / x86_64）上完成首启向导、内置 Alpine rootfs 解压与 PTY 会话验证；对照截图修正了终端中段空白、横向列表裁切、空状态贴顶、气泡满宽等问题。侧窗版另完成实测：主页面仅终端 + AI 辅助按钮、AI 辅助展开侧窗、功能清单分组渲染、侧窗内切换功能，以及「完成」/点遮罩/硬件返回键两级回退四条关闭路径，均无残留遮罩。

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
src/components/SidePanel.tsx             Apple HIG 右侧模态侧窗（动画/遮罩/导航条/Reduce Motion）
src/components/FunctionMenu.tsx          侧窗功能清单与终端操作分组
src/components/AIAssistButton.tsx        主页面唯一主操作按钮
src/components/AiCapabilitySwitcher.tsx AI 权限开关（读取/填入/执行），随对话卡片出现
src/aiTerminal.ts / aiTerminal.test.ts   AI 终端能力定义、命令提取安全边界与动作规划
src/hig.ts / src/hig.test.ts             Apple HIG 设计令牌与尺寸/字阶单测
src/theme.ts                           主题工厂：系统色、终端色、投影与 Dynamic Type 缩放
src/theme-context.tsx                  ThemeProvider / useTheme / useThemedStyles
src/navigation.ts                        侧窗分区、标题、分组与内容模式
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
