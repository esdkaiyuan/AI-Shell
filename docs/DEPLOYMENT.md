# 构建与部署

本文描述当前仓库实际包含的桌面端和 Android 构建流程。项目不包含服务端、账号系统或自动更新服务。

## 1. 桌面端

### 构建

```bash
pnpm install
pnpm type-check
pnpm test
pnpm build:desktop
```

构建会依次生成主进程、preload、主进程 bundle 和 renderer：

```text
packages/desktop/dist/main
packages/desktop/dist/preload
packages/desktop/dist/renderer
```

如果页面空白或 `window.electronAPI` 未定义，优先检查 `dist/preload/index.js` 是否由 `build:preload` 生成。

### 打包

```bash
pnpm --filter @ai-shell/desktop package
```

electron-builder 输出到 `packages/desktop/release/`：

- Windows：NSIS 安装包 + portable。
- macOS：DMG + ZIP。
- Linux：AppImage + DEB。

### 平台要求

- 在目标平台构建对应安装包。跨平台打包原生依赖（node-pty/ssh2）不可靠。
- macOS 签名、公证和原生菜单验收必须在 macOS 完成。
- Windows 正式分发建议配置代码签名证书，避免 SmartScreen 警告。
- 发布前确认 `safeStorage` 在目标系统可用。

### 数据位置

桌面数据库位于 Electron `app.getPath('userData')` 下的 `ai-shell.db`。凭据由 `safeStorage` 加密，密钥环不可用时不要录入生产凭据。

## 2. Android

### Debug

```bash
cd packages/mobile/android
./gradlew testDebugUnitTest assembleDebug
```

产物：

```text
app/build/outputs/apk/debug/app-debug.apk
```

### Release

```bash
./gradlew assembleRelease
```

产物：

```text
app/build/outputs/apk/release/app-release.apk
```

当前 release 配置使用 `app/debug.keystore`，不能用于公开分发。正式发布前：

1. 创建自有 release keystore。
2. 在 `android/gradle.properties` 或 CI Secret 中配置签名信息。
3. 不要把 keystore 密码提交到仓库。
4. 校验 `applicationId`、versionCode 和 versionName。

### ABI 与体积

- APK 仅包含 `arm64-v8a` 与 `x86_64`。
- 内置 rootfs（约 36 MB 压缩）和 PRoot 使 APK 体积较大。
- 可只构建模拟器架构：

```powershell
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --console=plain
```

### 运行时资源

- rootfs、runtime.json 和第三方许可位于 `android/app/src/main/assets/linux/`。
- proot/loader/talloc/shmem 位于 `jniLibs`。
- 发布 APK 必须保留 `THIRD_PARTY_NOTICES.md`。
- PRoot 采用 GPL-2.0，分发时需履行对应源码提供义务。

## 3. 移动 Web

```bash
pnpm --filter @ai-shell/mobile build:web
```

建议使用 Node.js 18。产物位于 `packages/mobile/dist/`，可部署到任意静态站点。

Web 版本限制：

- 无 Android Keystore，配置保存在 `localStorage`。
- 无 PRoot、PTY、OpenSSH 和真实系统文件浏览。
- 不适合作为生产安全环境。

## 4. 发布清单

### 桌面端

- [ ] `pnpm type-check` 与 `pnpm test` 通过
- [ ] `pnpm build:desktop` 成功
- [ ] 全新安装后 preload API 可用
- [ ] 终端、SSH、文件、设置、快捷键验证
- [ ] Windows 证据；macOS/Linux 在对应系统补充
- [ ] 安装包签名与版本号

### Android

- [ ] `testDebugUnitTest` 与 `assembleDebug/Release` 通过
- [ ] 真机安装
- [ ] rootfs 首次解压和 APK 更新
- [ ] PTY、SSH、文件选择器、Keystore、重启恢复
- [ ] 使用 release keystore 签名
- [ ] 第三方许可文件存在

### Web

- [ ] 静态资源路径正确
- [ ] 不展示“原生安全存储已启用”等误导信息
- [ ] 明确标注仅供预览

## 5. 更新与分发

当前项目**没有内置自动更新器**，也没有发布服务器。更新方式：

- 用户手动下载新安装包覆盖安装。
- Android 手动安装新 APK。
- Web 重新部署静态产物。

如需接入自动更新，应单独实现签名校验、发布源、回滚和失败提示，不能只添加快捷更新按钮。

## 6. 故障排查

### 页面空白

检查 renderer 资源路径和 preload 产物。

### 原生模块加载失败

在目标平台重新安装依赖并确认构建工具完整；不要直接复制其他平台的 `node_modules`。

### Android 首次启动失败

检查设备 ABI、可用存储、rootfs 完整性和 PRoot 链接日志。Release 包必须包含 arm64-v8a 或 x86_64。

### SSH 私钥失败

手机端只接受完整 PEM 私钥；证书、公钥和 `.ppk` 会被拒绝。加密私钥需要终端口令。
