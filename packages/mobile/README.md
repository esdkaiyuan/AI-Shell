# AI Shell Mobile

AI Shell Mobile 是 AI Shell 的手机端应用，基于 React Native / Expo 构建，可生成 Android APK。它将桌面端的终端、SSH、AI 助手、资源管理器、历史记录和设置能力移植到手机环境，并针对触屏操作重新设计。

署名：`esdkaiyuan`

## 手机端定位

桌面端适合完整开发和运维工作台，手机端适合移动场景：

- 随时查看终端状态。
- 快速连接 SSH 工作区。
- 使用 AI 分析当前输出。
- 浏览文件和日志。
- 调用常用命令。
- 在手机上完成轻量排障。

## 主要功能

- **终端工作区**：多标签、移动端分屏、搜索、快捷命令、命令输入。
- **SSH 入口**：展示 SSH 配置卡片，点击后创建远程终端标签。
- **会话恢复**：加载预设工作区，快速恢复常用终端组合。
- **AI 对话助手**：从终端工具区直接进入 AI 对话，结合当前终端上下文给出建议。
- **AI 模型管理**：保留与桌面端一致的 Provider 导入设计。
- **资源管理器**：只读文件浏览，点击文件后生成预览命令。
- **历史记录**：展示常用命令，点击即可插入终端输入框。
- **设置页**：显示移动中继、密钥存储、系统监控、功能覆盖和署名。

## AI Provider

手机端支持与桌面端一致的厂商：

- OpenAI
- Claude
- 百度文心一言
- 阿里通义千问
- 智谱 GLM
- 讯飞星火
- Moonshot AI
- DeepSeek
- Ollama (本地)

导入流程：

1. 打开 AI 页面。
2. 切换到“模型”。
3. 选择提供商。
4. 输入 API Key。
5. 获取模型列表，或手动输入模型名。
6. 可选填写自定义 API 地址。
7. 保存 Provider。

API Key 只显示脱敏预览，避免在手机界面中明文暴露。

## APK 构建

环境要求：

- Node.js 18+
- pnpm
- JDK 17
- Android SDK

检查：

```bash
pnpm --filter @ai-shell/mobile type-check
pnpm --filter @ai-shell/mobile test
```

构建 release APK：

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot'
$env:ANDROID_HOME='C:\Users\28916\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;" + $env:PATH
cd packages/mobile/android
.\gradlew.bat --init-script gradle-mirrors.gradle assembleRelease --console=plain
```

APK 输出：

```text
packages/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 设计风格

- Xshell 风格的深色终端视觉。
- 黑色与深蓝为主，强调可读性和专业感。
- 图标与桌面端统一为黑底深蓝渐变 `AS`。
- 顶部显示 `署名 esdkaiyuan`。

## 完整文档

完整使用说明见：

```text
docs/USAGE.md
```
