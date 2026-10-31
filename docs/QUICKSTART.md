# 快速开始

## 1. 准备环境

- Node.js >= 18
- pnpm >= 8
- Android 构建额外需要 JDK 17、Android SDK/NDK

```bash
git clone https://github.com/esdkaiyuan/AI-Shell.git
cd AI-Shell
pnpm install
pnpm type-check
pnpm test
```

## 2. 启动桌面端

```bash
pnpm dev
```

首次启动后：

1. 打开 **设置 → AI 提供商**。
2. 选择 Provider。
3. 输入 API Key。
4. 获取模型列表或手动填写模型名。
5. 保存后回到终端。

不需要 API Key 时，可先使用本地终端、SSH 和文件浏览。

## 3. 配置 SSH

1. 点击工具栏“SSH”。
2. 新建连接。
3. 填写主机、端口和用户名。
4. 选择远端系统，用于命令补全。
5. 选择密码或密钥认证。
6. 保存并连接。

## 4. 常用操作

- `Tab`：命令补全；候选可用方向键/Enter 选择。
- `Ctrl+T`：新建终端。
- `Ctrl+W`：关闭当前标签。
- `Ctrl+F`：查找。
- `Ctrl+N`：分屏。
- `Ctrl+B`：快捷命令。
- `Ctrl+Shift+A`：AI 停靠面板。

macOS 对应 Command 键位。所有快捷键可在 **设置 → 快捷键** 修改、恢复和保存方案。

## 5. 手机端

开发：

```bash
pnpm --filter @ai-shell/mobile start
```

构建 Debug APK：

```bash
cd packages/mobile/android
./gradlew assembleDebug
```

产物：

```text
packages/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

首次安装后向导会：

1. 解压内置 Alpine Linux。
2. 配置 AI 提供商。
3. 可选配置 SSH。
4. 进入工作台。

SSH 私钥可从 PEM 文件导入，支持 OpenSSH、RSA、ECDSA、PKCS#8 和加密 PEM。

## 6. 下一步

- [使用说明](USAGE.md)
- [安装与构建](INSTALLATION.md)
- [开发指南](DEVELOPMENT.md)
- [手机端说明](../packages/mobile/README.md)
- [安全说明](../SECURITY.md)
