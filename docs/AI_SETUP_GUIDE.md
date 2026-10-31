# AI Provider 配置指南

## 1. 平台差异

| 能力       | 桌面端                 | 手机端                       |
| ---------- | ---------------------- | ---------------------------- |
| 请求方式   | 流式，可停止           | 非流式                       |
| 终端上下文 | AI 面板自动读取        | 对话自动附带最近输出         |
| 星火       | 支持适配器             | 暂未接入                     |
| Key 存储   | Electron `safeStorage` | Android Keystore AES-256-GCM |
| Web 预览   | —                      | localStorage，仅供界面测试   |

## 2. 配置流程

### 桌面端

1. 打开 **设置 → AI 提供商**。
2. 点击“添加 AI 提供商”。
3. 选择模板。
4. 输入 API Key。
5. 获取模型列表或手动填写模型。
6. 检查 Base URL。
7. 保存。

已添加的 Provider 可删除；模型选择会在 AI 页面与停靠面板中生效。

### 手机端

1. 打开 **AI → 模型**，或首次启动向导的 AI 步骤。
2. 选择提供商。
3. 填写 API Key。
4. 填写或拉取模型。
5. 必要时修改 Base URL。
6. 保存。

## 3. Provider

| Provider        | 协议        | Key 说明                 | 默认地址                                            |
| --------------- | ----------- | ------------------------ | --------------------------------------------------- |
| OpenAI          | OpenAI 兼容 | `sk-...`                 | `https://api.openai.com/v1`                         |
| Claude          | Anthropic   | `sk-ant-...`             | `https://api.anthropic.com/v1`                      |
| DeepSeek        | OpenAI 兼容 | 平台 Key                 | `https://api.deepseek.com/v1`                       |
| 智谱 GLM        | OpenAI 兼容 | 平台 Key                 | `https://open.bigmodel.cn/api/paas/v4`              |
| 通义千问        | OpenAI 兼容 | DashScope Key            | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Moonshot / Kimi | OpenAI 兼容 | 平台 Key                 | `https://api.moonshot.cn/v1`                        |
| Ollama          | Ollama      | 无需 Key                 | `http://localhost:11434`                            |
| 文心一言        | 百度 API    | `API_KEY:SECRET_KEY`     | `https://aip.baidubce.com`                          |
| 讯飞星火        | WebSocket   | `APPID:APISecret:APIKey` | 桌面端限定                                          |

## 4. 模型列表

- OpenAI 兼容服务、Claude 和 Ollama 支持拉取模型。
- 服务端未返回模型时，可手动填写准确模型名。
- 模型列表请求失败会显示错误，不再静默回退为“获取成功”。
- Ollama 必须先在服务端拉取模型，例如：

```bash
ollama pull qwen
```

## 5. Ollama 与局域网

- 本机：`http://localhost:11434`
- 局域网：`http://192.168.x.x:11434`
- 确保防火墙和 Ollama 监听配置允许手机或桌面访问。
- 明文 HTTP 仅建议用于可信局域网。

## 6. 安全建议

- 不要截图或分享完整 Key。
- 使用独立、可撤销、限额的 Key。
- 不要把生产凭据输入 Web/Expo 预览。
- 手机端 Key 使用 Keystore 加密；私钥和 Key 都不要写入 APK assets。
- AI 请求可能发送终端上下文，敏感输出应先清理。

## 7. 常见错误

### 401 / authentication failed

检查 Key、Base URL、Provider 协议和账户权限。

### 模型不存在

确认模型名与服务端账户权限；手动填写的名称必须与服务端一致。

### 请求超时

检查网络、代理、Base URL 和本地 Ollama 可达性。

### 移动端星火不可用

星火需要 WebSocket 签名鉴权，当前移动端暂未接入；桌面端可使用。
