# AI 助手面板功能说明

## 概述

新的 AI 助手面板实现了你要求的所有功能：
- ✅ 在 shell 对话窗口的右侧或底部显示
- ✅ AI 可以自动检索终端的指令和报错信息
- ✅ 支持手动选择文本发送给 AI
- ✅ AI 生成的命令可以一键插入、执行或复制

## 架构设计

### 1. 终端事件总线 (`terminalBus.ts`)

一个轻量级的事件总线，连接终端和 AI 面板：

```typescript
// Terminal 组件注册自己
terminalBus.register({
  id: terminalId,
  insert: (text) => { /* 插入文本到终端 */ },
  run: (cmd) => { /* 执行命令 */ },
  getContext: () => { /* 返回最近的输出 */ }
});

// AI 面板读取上下文
const context = terminalBus.getActiveContext(3000);

// AI 面板发送命令
terminalBus.insertToActive(command);  // 插入
terminalBus.runOnActive(command);     // 执行
```

### 2. 终端上下文捕获 (`Terminal.tsx`)

Terminal 组件现在会：
- 捕获所有终端输出（去除 ANSI 颜色码）
- 保存最近 20KB 的输出到缓冲区
- 提供 `insert()` 和 `run()` 方法供 AI 面板调用

### 3. AI 助手面板 (`AIAssistantPanel.tsx`)

核心功能：

#### 自动上下文获取
- 默认开启 `AUTO` 模式
- 每次发送消息时自动附加终端最近 3000 字符的输出
- 可以点击 `AUTO/OFF` 按钮切换

#### 手动获取上下文
- 点击刷新按钮 🔄 手动获取终端上下文
- 自动填充到输入框，用户可以编辑后发送

#### 命令提取与操作
AI 回复中的命令会被自动提取（支持 ```bash 代码块和行内代码），每个命令提供三个按钮：

1. **插入** - 将命令插入到终端输入框（不执行）
2. **执行** - 直接在终端执行命令
3. **复制** - 复制到剪贴板

#### 面板位置切换
- 点击面板头部的切换按钮可以在右侧/底部之间切换
- 右侧模式：占据 40% 宽度（300-600px）
- 底部模式：占据 40% 高度（200-500px）

### 4. 命令操作按钮 (`CommandActions.tsx`)

可复用的命令操作组件，提供三个彩色按钮：
- 🔵 插入（蓝色）
- 🟢 执行（绿色）
- 🟡 复制（黄色）

## 使用方式

### 基本使用

1. **打开 AI 面板**
   - 点击左侧边栏的 AI 图标
   - 面板默认显示在右侧

2. **询问 AI**
   - 在输入框输入问题
   - 如果开启了 AUTO 模式，AI 会自动看到终端输出
   - 按 Enter 发送（Shift+Enter 换行）

3. **操作命令**
   - AI 生成命令后，点击对应按钮
   - **插入**：命令出现在终端输入框，你可以修改后执行
   - **执行**：命令立即在终端执行
   - **复制**：命令复制到剪贴板

### 高级功能

#### 手动发送上下文
1. 关闭 AUTO 模式（点击 AUTO 按钮变成 OFF）
2. 在终端选中你想分析的文本
3. 点击刷新按钮 🔄
4. 编辑问题后发送

#### 切换面板位置
- 点击面板头部的位置切换按钮
- 右侧 ⇄ 底部

#### 隐藏面板
- 再次点击左侧边栏的 AI 图标

## 典型场景

### 场景 1：分析报错
```
终端显示：
$ npm install
npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules

你：这个错误怎么解决？
AI：这是权限问题，建议使用 sudo 或配置 npm 全局目录...
    [插入] [执行] [复制]
    sudo chown -R $USER /usr/local/lib/node_modules
```

### 场景 2：生成命令
```
你：帮我找出所有大于 100MB 的文件
AI：可以使用 find 命令...
    [插入] [执行] [复制]
    find . -type f -size +100M -exec ls -lh {} \;
```

### 场景 3：解释输出
```
终端显示：
$ git status
On branch main
Your branch is ahead of 'origin/main' by 3 commits.

你：这是什么意思？
AI：你的本地分支比远程分支多了 3 个提交，需要推送...
```

## 技术细节

### 上下文缓冲
- 每个终端维护独立的 20KB 滚动缓冲
- 自动去除 ANSI 转义序列
- 只保留纯文本，便于 AI 理解

### 命令提取
使用正则表达式提取：
1. 代码块：```bash ... ```
2. 行内代码：`command`（启发式判断）

### 状态管理
- `terminalBus` 跟踪活动终端
- 切换标签时自动更新上下文源
- AI 面板订阅终端变化事件

## 文件清单

新增文件：
- `packages/desktop/src/renderer/terminalBus.ts` - 终端事件总线
- `packages/desktop/src/renderer/components/AIAssistantPanel.tsx` - AI 助手面板
- `packages/desktop/src/renderer/components/AIAssistantPanel.css` - 面板样式
- `packages/desktop/src/renderer/components/CommandActions.tsx` - 命令操作按钮
- `packages/desktop/src/renderer/components/CommandActions.css` - 按钮样式

修改文件：
- `packages/desktop/src/renderer/components/Terminal.tsx` - 添加上下文捕获和总线注册
- `packages/desktop/src/renderer/components/Icons.tsx` - 添加新图标
- `packages/desktop/src/renderer/App.tsx` - 集成 AI 面板到主布局
- `packages/desktop/src/renderer/App.css` - 添加布局样式

## 下一步优化建议

1. **可调整大小**
   - 添加拖动分隔条，让用户自由调整面板大小

2. **上下文选择**
   - 支持在终端选中文本后右键"发送给 AI"

3. **命令历史**
   - 记录 AI 生成的命令历史
   - 支持快速重新执行

4. **多模型支持**
   - 在面板头部显示当前使用的 AI 模型
   - 支持快速切换模型

5. **会话管理**
   - 保存/加载 AI 对话历史
   - 支持多个独立会话

6. **智能建议**
   - 检测到报错时自动弹出 AI 建议
   - 长时间无输出时提示可能的问题
