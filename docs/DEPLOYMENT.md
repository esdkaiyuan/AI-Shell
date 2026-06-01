# 部署指南

## 桌面端部署

### 开发环境

#### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 构建工具（根据平台）

#### 安装依赖

```bash
pnpm install
```

#### 启动开发服务器

```bash
pnpm dev
```

### 生产构建

#### 1. 构建应用

```bash
# 构建所有包
pnpm build

# 或仅构建桌面端
pnpm build:desktop
```

#### 2. 打包应用

```bash
cd packages/desktop
pnpm package
```

打包后的文件位于 `packages/desktop/release/` 目录。

### 平台特定说明

#### Windows

**构建要求:**
- Visual Studio Build Tools 或 Visual Studio
- Python 3.x

**安装构建工具:**
```bash
npm install --global windows-build-tools
```

**打包格式:**
- NSIS安装程序 (.exe)
- 便携版 (.exe)

**配置签名:**

在 `packages/desktop/package.json` 中添加：

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "password"
    }
  }
}
```

#### macOS

**构建要求:**
- Xcode Command Line Tools
- Apple Developer账号（用于签名和公证）

**安装构建工具:**
```bash
xcode-select --install
```

**打包格式:**
- DMG镜像
- ZIP压缩包

**配置签名:**

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    }
  }
}
```

**公证:**

```bash
# 打包后公证
xcrun notarytool submit packages/desktop/release/AI-Shell-0.1.0.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait
```

#### Linux

**构建要求:**
- build-essential
- libxtst-dev
- libpng-dev

**安装构建工具:**
```bash
sudo apt-get install build-essential libxtst-dev libpng-dev
```

**打包格式:**
- AppImage
- DEB包
- RPM包（可选）

## 云端服务部署（可选）

如果需要设备同步功能，可以部署云端服务。

### 使用Docker

#### 1. 创建Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY packages/server ./packages/server
COPY packages/core ./packages/core

RUN pnpm build

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
```

#### 2. 构建镜像

```bash
docker build -t ai-shell-server .
```

#### 3. 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  --name ai-shell-server \
  ai-shell-server
```

### 使用Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/aishell
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=aishell
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

启动服务：

```bash
docker-compose up -d
```

### 部署到云平台

#### Vercel

```bash
# 安装Vercel CLI
npm install -g vercel

# 部署
cd packages/server
vercel
```

#### Heroku

```bash
# 安装Heroku CLI
# 登录
heroku login

# 创建应用
heroku create ai-shell-server

# 部署
git push heroku main
```

#### AWS EC2

1. 启动EC2实例（Ubuntu 22.04）
2. 安装Node.js和pnpm
3. 克隆代码并构建
4. 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start packages/server/dist/index.js --name ai-shell-server

# 设置开机自启
pm2 startup
pm2 save
```

## 环境变量

### 桌面端

创建 `.env` 文件：

```env
# 开发模式
NODE_ENV=development

# 云端服务地址（可选）
SYNC_SERVER_URL=https://your-server.com
```

### 服务端

```env
# 数据库
DATABASE_URL=postgresql://user:pass@host:5432/db

# JWT密钥
JWT_SECRET=your-secret-key

# 端口
PORT=3000

# 环境
NODE_ENV=production

# CORS
CORS_ORIGIN=*
```

## 自动更新

### 配置electron-updater

在 `packages/desktop/package.json` 中：

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "ai-shell"
    }
  }
}
```

### 实现更新检查

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  console.log('Update available');
});

autoUpdater.on('update-downloaded', () => {
  console.log('Update downloaded');
  autoUpdater.quitAndInstall();
});
```

## 监控和日志

### 应用日志

使用electron-log：

```typescript
import log from 'electron-log';

log.info('Application started');
log.error('Error occurred:', error);
```

日志位置：
- Windows: `%USERPROFILE%\AppData\Roaming\ai-shell\logs`
- macOS: `~/Library/Logs/ai-shell`
- Linux: `~/.config/ai-shell/logs`

### 错误追踪

集成Sentry：

```typescript
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: 'your-sentry-dsn',
});
```

## 性能优化

### 1. 减小包体积

```bash
# 使用electron-builder的压缩选项
"build": {
  "compression": "maximum"
}
```

### 2. 代码分割

使用动态导入：

```typescript
const module = await import('./heavy-module');
```

### 3. 缓存优化

配置合理的缓存策略。

## 安全建议

1. **API密钥加密**: 使用系统密钥链存储
2. **代码签名**: 所有发布版本都应签名
3. **自动更新**: 使用HTTPS和签名验证
4. **CSP策略**: 配置内容安全策略
5. **最小权限**: 只请求必要的系统权限

## 故障排查

### 构建失败

```bash
# 清除缓存
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf packages/*/dist

# 重新安装
pnpm install
pnpm build
```

### 运行时错误

检查日志文件，查看详细错误信息。

### 性能问题

使用Chrome DevTools的Performance面板分析。

## 持续集成

### GitHub Actions

创建 `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
    - uses: actions/checkout@v3
    - uses: pnpm/action-setup@v2
      with:
        version: 8
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'pnpm'
    
    - run: pnpm install
    - run: pnpm build
    - run: pnpm test
    
    - name: Package
      run: |
        cd packages/desktop
        pnpm package
```
