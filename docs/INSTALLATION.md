# 安装与构建

## 1. 系统要求

### 桌面端

- Windows 10+、macOS 或主流 Linux。
- 4 GB 内存；推荐 8 GB+。
- Node.js >= 18、pnpm >= 8。
- 打包安装包**不需要** C++ 构建工具（node-pty 使用 N-API 预编译二进制）；仅在从源码安装依赖时才需要。

### Android 构建

- JDK 17。
- Android SDK、NDK 和 platform-tools。
- 建议使用 Node.js 18 运行 Expo/Metro 导出。
- 内置 runtime 仅包含 64 位 `arm64-v8a` 与 `x86_64`。

## 2. 获取源码

```bash
git clone https://github.com/esdkaiyuan/AI-Shell.git
cd AI-Shell
pnpm install
```

验证环境：

```bash
node --version
pnpm --version
pnpm type-check
pnpm test
```

## 3. 桌面端

### 开发

```bash
pnpm dev
```

该命令先编译 preload，再同时 watch 主进程、preload 和 Vite 渲染进程。

### 生产构建

```bash
pnpm build:desktop
```

产物位于 `packages/desktop/dist/`。

### 打包安装包

```bash
pnpm --filter @ai-shell/desktop package
```

输出位于 `packages/desktop/release-win/`。electron-builder 配置包含：

- Windows：NSIS + portable。
- macOS：DMG + ZIP。
- Linux：AppImage + DEB。

macOS 原生菜单、Command 快捷键和窗口行为必须在 macOS 上打包并验收。

**Windows 打包无需 MSVC 工具链**。node-pty 1.1.0 自带 N-API 预编译二进制（`prebuilds/win32-x64/`），N-API 的 ABI 在 Node 与 Electron 之间稳定，因此构建配置里设了 `npmRebuild: false` 跳过原生模块重编译。缺少完整 MSVC（只有 VS 运行时）的机器也能直接打包。

#### 安装向导（assisted installer）

NSIS 目标使用 `oneClick: false` 的 assisted installer，安装时依次经过：

1. 欢迎页；
2. **软件许可与使用协议**（含「我接受」勾选框，不勾选无法继续）；
3. 安装范围（仅当前用户 / 所有用户）；
4. **安装目录选择**；
5. 安装进度；
6. 完成页（安装完成后可直接启动应用）。

卸载时同样有独立的卸载向导。

协议文本放在 `packages/desktop/build/agreement_zh_CN.txt` 与 `agreement_en.txt`，安装向导使用 `agreement.html`（由 `node scripts/build-license-html.mjs` 生成，协议正文改动后需重新执行）。

安装向导的中文乱码有三个独立来源，都已处理：

**1. 协议正文（HTML 协议页）**

NSIS 的 `MUI_PAGE_LICENSE` 在编译期用 makensis 所在机器的 ANSI 码页读取协议文本（中文 Windows 为 GBK/936），UTF-8 文件会被误解码成乱码。加 UTF-8 BOM 与 UTF-16LE BOM 都无效——NSIS 3.04 的 `LoadLicenseFile` 固定走 `AnsiCP` 分支。改用 HTML 协议页后由 `EmbedHTML` 走系统浏览器控件渲染，页面自带 `<meta charset="utf-8">`，任何系统语言下都能正确显示中文，同时获得正文排版与滚动能力。

HTML 文件本身**必须带 UTF-8 BOM**：MSHTML（EmbedHTML 使用的 IE 内核）对无 BOM 的本地文件会先按系统 ANSI 码页做编码嗅探，`<meta charset>` 要等嗅探之后才生效，中文因此仍会乱码。

**2. 安装向导界面文案（LangString 覆盖）**

NSIS 3.0.4.1 自带的 `SimpChinese.nlf` 头部声明 `Codepage 936`（GBK），但文件内容存的是 UTF-8 字节——NSIS 按 GBK 解码后，页面标题、按钮文字会出现「检閱協议」这类简繁混杂的乱码。

解决办法：在 NSIS 加载语言文件**之前**，用 `LangString <key> 2052 "<text>"` 预先定义简体中文（LCID 2052）的字符串表条目。NSIS 采用「先定义者优先」，因此这些定义会覆盖 `.nlf` 里的乱码值，且不触发 "set multiple times" 警告（electron-builder 传了 `-WX`，警告会被升级为错误）。按 LCID 定向，不影响英文等其他语言。

文案原文取自 NSIS 自带的 `SimpChinese.nlf`（字符串表，已固化到 `build/nsis/zh-CN-strings.json`），由 `node scripts/build-nsis-messages.mjs` 生成 `build/installer.nsh`。

> `.nsh` 里的 MUI 文案（副标题、底部提示等）**不需要**覆盖 —— makensis 按 `-INPUTCHARSET UTF8` 读取它们，本身就是正确的；重复定义反而会触发警告。

> `^Name` 是产品名，由 electron-builder 传入的 `${PRODUCT_NAME}` 通过 NSIS 的 `Name` 命令设置，不能用语言文件里的默认值「名称」覆盖。

**3. 协议页语言切换**

HTML 内嵌脚本读取 `navigator.language`，中文系统显示中文、其余显示英文。默认渲染中文块，因此即使脚本被系统安全策略禁用也不会出现空白页。

**文件名约束**：协议源文件**不要**以 `license_` 开头 —— electron-builder 会自动扫描 `license_*` / `eula_*` 并生成多语言文本协议页，与 HTML 方案冲突。当前使用 `agreement_` 前缀规避。

协议同时随应用分发到 `resources/licenses/`，供应用内「关于」与合规检查查阅。

快捷方式：安装后创建桌面与开始菜单快捷方式，卸载时一并清除；控制面板的卸载条目名为 `AI Shell <版本>`。

## 4. Android APK

### Debug APK

```bash
cd packages/mobile/android
./gradlew assembleDebug
```

Windows：

```powershell
cd packages/mobile/android
.\gradlew.bat assembleDebug
```

产物：

```text
packages/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

```bash
cd packages/mobile/android
./gradlew assembleRelease
```

仅在模拟器架构上构建：

```powershell
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --console=plain
```

Release 产物：

```text
packages/mobile/android/app/build/outputs/apk/release/app-release.apk
```

当前仓库的 release 配置仍使用 `app/debug.keystore`，仅适合内部测试。正式分发前必须配置自有 release keystore。

### 安装到设备

```bash
adb install -r app-debug.apk
```

首次启动会在应用私有目录解压 Alpine rootfs，约 100 MB，不联网下载运行时。

## 5. 移动 Web 预览

```bash
pnpm --filter @ai-shell/mobile build:web
```

建议使用 Node.js 18。导出结果位于 `packages/mobile/dist/`。移动 Web 仅用于界面预览，不具备 Android Keystore、PRoot、PTY 和真实系统文件能力。

## 6. 预编译产物

当对应版本的 GitHub Release 提供产物时，文件名由 electron-builder 和 Gradle 配置决定。不要假设所有平台都有现成安装包；当前仓库验证基线为：

- Windows Electron 开发、生产构建与安装包（NSIS + portable）。
- Android Debug 与 Release APK 构建。
- 移动 Web 导出。

macOS/Linux 安装包需要分别在对应系统上构建。

## 7. 首次配置

### 桌面端

1. 启动应用。
2. 打开 **设置 → AI 提供商**。
3. 选择 Provider，填写 API Key。
4. 获取模型列表或手动填写模型。
5. 保存。
6. 如需 SSH，打开 SSH 管理器，配置主机、认证和远端系统。

### 手机端

首次启动向导依次完成：

1. 安装内置 Linux。
2. 配置 AI 提供商。
3. 可选配置 SSH。
4. 进入工作台。

可在“我的 → 运行环境与设置”中重新打开配置向导或重置环境。

## 8. 凭据和数据

- 桌面端 SQLite 数据库位于 Electron `app.getPath('userData')` 下的 `ai-shell.db`。
- 桌面凭据字段在 `safeStorage` 可用时加密；密钥环不可用时当前实现会退化为明文，需确认系统安全存储状态。
- Android 配置由 Keystore AES-256-GCM 加密，rootfs 位于应用私有目录。
- 手机端 Web 预览使用 `localStorage`，不具备原生加密，不应输入生产凭据。
- 私钥不会打包进 APK；会话临时私钥在停止、退出、重置或下次启动时清理。

## 9. 卸载

### 桌面端

使用安装包自带卸载程序，或删除对应应用。是否需要保留用户数据由用户决定；用户数据库位于 Electron userData 目录。

### Android

卸载应用会删除应用私有目录中的 rootfs 和加密配置。

## 10. 常见问题

### `node-pty` 或原生依赖构建失败

安装系统 C++ 构建工具后重新执行 `pnpm install`。

### 桌面页面空白或系统 API 未定义

确认 preload 已编译：

```bash
pnpm --filter @ai-shell/desktop build:preload
```

### 移动 Web 导出失败

切换到 Node.js 18，清理 Metro 缓存后重试：

```bash
pnpm --filter @ai-shell/mobile exec expo start --clear
```

### Android 构建找不到 SDK

确认 `ANDROID_HOME`、`ANDROID_SDK_ROOT`、`JAVA_HOME` 指向 JDK 17 和有效 Android SDK。

### AI 请求失败

检查网络、API Key、配额、模型名和自定义 Base URL。Ollama 可填写局域网地址。

### SSH 私钥无法加载

手机端请导入完整 PEM 私钥，不要导入公钥、证书或 PuTTY `.ppk`。加密私钥连接时需在终端输入口令。

## 11. 更多文档

- [使用说明](USAGE.md)
- [开发指南](DEVELOPMENT.md)
- [架构说明](../ARCHITECTURE.md)
- [安全说明](../SECURITY.md)
- [AI 配置指南](AI_SETUP_GUIDE.md)
