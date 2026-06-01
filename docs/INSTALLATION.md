# 安装指南

## 系统要求

### 最低配置

- **操作系统**: Windows 10+, macOS 10.13+, Ubuntu 18.04+
- **内存**: 4GB RAM
- **存储**: 500MB 可用空间
- **网络**: 互联网连接（用于AI功能）

### 推荐配置

- **内存**: 8GB+ RAM
- **存储**: 1GB+ 可用空间
- **处理器**: 多核处理器

## 从源码安装

### 1. 安装前置依赖

#### Node.js

访问 [nodejs.org](https://nodejs.org/) 下载并安装 Node.js 18.0.0 或更高版本。

验证安装：
```bash
node --version  # 应显示 v18.0.0 或更高
npm --version
```

#### pnpm

```bash
npm install -g pnpm
pnpm --version  # 应显示 8.0.0 或更高
```

#### 构建工具

**Windows:**
```bash
npm install --global windows-build-tools
```

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install build-essential libxtst-dev libpng-dev
```

### 2. 克隆仓库

```bash
git clone https://github.com/yourusername/ai-shell.git
cd ai-shell
```

### 3. 安装依赖

```bash
pnpm install
```

这将安装所有必要的依赖包。

### 4. 构建项目

```bash
pnpm build
```

### 5. 运行应用

#### 开发模式

```bash
pnpm dev
```

#### 生产模式

```bash
cd packages/desktop
pnpm start
```

### 6. 打包应用（可选）

```bash
cd packages/desktop
pnpm package
```

打包后的应用位于 `packages/desktop/release/` 目录。

## 从预编译包安装

### Windows

1. 下载 `AI-Shell-Setup-0.1.0.exe`
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单启动 AI Shell

**便携版:**
1. 下载 `AI-Shell-0.1.0-portable.exe`
2. 直接运行，无需安装

### macOS

1. 下载 `AI-Shell-0.1.0.dmg`
2. 打开 DMG 文件
3. 将 AI Shell 拖到 Applications 文件夹
4. 从 Launchpad 或 Applications 启动

**首次运行可能需要:**
```bash
# 如果遇到"无法打开，因为它来自身份不明的开发者"
xattr -cr /Applications/AI\ Shell.app
```

### Linux

#### AppImage

1. 下载 `AI-Shell-0.1.0.AppImage`
2. 添加执行权限：
```bash
chmod +x AI-Shell-0.1.0.AppImage
```
3. 运行：
```bash
./AI-Shell-0.1.0.AppImage
```

#### DEB 包 (Ubuntu/Debian)

```bash
sudo dpkg -i ai-shell_0.1.0_amd64.deb
sudo apt-get install -f  # 安装依赖
```

启动：
```bash
ai-shell
```

#### RPM 包 (Fedora/RHEL)

```bash
sudo rpm -i ai-shell-0.1.0.x86_64.rpm
```

## 配置

### 首次启动

1. 启动应用
2. 点击左侧 **设置** 图标
3. 选择 **AI Providers** 标签
4. 添加至少一个AI提供商

### 配置AI提供商

#### OpenAI

1. 访问 [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. 创建新的API密钥
3. 在AI Shell设置中：
   - 选择 "OpenAI (GPT)"
   - 粘贴API密钥
   - 点击 "Add Provider"

#### Claude

1. 访问 [console.anthropic.com](https://console.anthropic.com/)
2. 获取API密钥
3. 在AI Shell设置中添加

#### 百度文心一言

1. 访问 [cloud.baidu.com](https://cloud.baidu.com/)
2. 获取 API Key 和 Secret Key
3. 在AI Shell设置中：
   - API Key格式: `API_KEY:SECRET_KEY`

#### Ollama (本地)

1. 安装 Ollama: [ollama.ai](https://ollama.ai/)
2. 拉取模型：
```bash
ollama pull llama2
```
3. 在AI Shell设置中：
   - 选择 "Ollama (本地)"
   - API Key可以留空
   - Base URL: `http://localhost:11434`

### 数据位置

应用数据存储在：

- **Windows**: `%USERPROFILE%\AppData\Roaming\ai-shell`
- **macOS**: `~/Library/Application Support/ai-shell`
- **Linux**: `~/.config/ai-shell`

包含：
- `ai-shell.db` - 本地数据库
- `logs/` - 应用日志
- `config.json` - 配置文件

## 更新

### 自动更新

应用会自动检查更新。当有新版本时，会提示下载并安装。

### 手动更新

#### 从源码

```bash
cd ai-shell
git pull
pnpm install
pnpm build
```

#### 从预编译包

下载并安装最新版本，会自动覆盖旧版本。

## 卸载

### Windows

1. 控制面板 → 程序和功能
2. 找到 "AI Shell"
3. 点击卸载

或使用安装目录中的 `Uninstall AI Shell.exe`

### macOS

1. 打开 Finder
2. 进入 Applications 文件夹
3. 将 AI Shell 拖到废纸篓
4. 清空废纸篓

删除用户数据：
```bash
rm -rf ~/Library/Application\ Support/ai-shell
rm -rf ~/Library/Logs/ai-shell
```

### Linux

#### DEB 包

```bash
sudo apt-get remove ai-shell
```

#### RPM 包

```bash
sudo rpm -e ai-shell
```

#### AppImage

直接删除 AppImage 文件。

删除用户数据：
```bash
rm -rf ~/.config/ai-shell
```

## 故障排查

### 应用无法启动

1. 检查系统要求
2. 查看日志文件
3. 尝试以管理员/root权限运行
4. 重新安装应用

### AI功能不工作

1. 检查网络连接
2. 验证API密钥是否正确
3. 检查API配额是否用完
4. 查看应用日志

### 终端无法输入

1. 重启应用
2. 创建新的终端标签
3. 检查Shell路径是否正确

### 性能问题

1. 关闭不用的终端标签
2. 清除命令历史
3. 增加系统内存
4. 更新到最新版本

## 获取帮助

- **文档**: [docs/](./docs/)
- **问题反馈**: [GitHub Issues](https://github.com/yourusername/ai-shell/issues)
- **讨论**: [GitHub Discussions](https://github.com/yourusername/ai-shell/discussions)

## 下一步

- 阅读 [用户指南](./README.md#使用指南)
- 查看 [开发文档](./docs/DEVELOPMENT.md)
- 探索 [API文档](./docs/API.md)
