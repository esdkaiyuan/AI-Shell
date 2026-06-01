# UI 设计规范 - Xshell 风格

## 🎨 设计理念

AI Shell 采用专业的黑白灰配色方案，参考 Xshell 的经典设计，打造简洁、高效、专业的终端体验。

## 配色方案

### 主色调（黑白灰）

```css
/* 背景色 */
--color-bg-primary: #1a1a1a      /* 主背景 - 深黑 */
--color-bg-secondary: #242424    /* 次级背景 - 灰黑 */
--color-bg-tertiary: #2d2d2d     /* 三级背景 - 中灰 */
--color-bg-hover: #333333        /* 悬停状态 */
--color-bg-active: #3a3a3a       /* 激活状态 */

/* 边框色 */
--color-border-primary: #3d3d3d   /* 主边框 */
--color-border-secondary: #4d4d4d /* 次级边框 */

/* 文字色 */
--color-text-primary: #e8e8e8     /* 主文字 - 亮白 */
--color-text-secondary: #b8b8b8   /* 次级文字 - 浅灰 */
--color-text-tertiary: #888888    /* 三级文字 - 中灰 */
--color-text-disabled: #5a5a5a    /* 禁用文字 - 深灰 */

/* 强调色 */
--color-accent: #ffffff           /* 强调色 - 纯白 */
```

### 状态颜色（灰度）

```css
--color-success: #6b6b6b   /* 成功 */
--color-warning: #8a8a8a   /* 警告 */
--color-error: #a0a0a0     /* 错误 */
--color-info: #7a7a7a      /* 信息 */
```

## 布局结构

### 整体布局（对标 Xshell）

```
┌─────────────────────────────────────────────────────────┐
│  工具栏 (36px)                                          │
│  [新建] [打开] [保存] | [复制] [粘贴] [查找] | [分屏]  │
├────┬────────────────────────────────────────────────────┤
│侧边│  终端标签栏 (32px)                                 │
│栏  │  [💻 Local] [🌐 SSH] [+]                          │
│    ├────────────────────────────────────────────────────┤
│48px│                                                     │
│    │  终端内容区域                                       │
│💻  │  (xterm.js)                                        │
│🤖  │                                                     │
│⚙️  │                                                     │
│    │                                                     │
├────┴────────────────────────────────────────────────────┤
│  状态栏 (24px)                                          │
│  📡 已连接 | ⌨️ UTF-8 | CPU ▓▓░░ 45% | MEM ▓▓▓░ 67%  │
└─────────────────────────────────────────────────────────┘
```

### 尺寸规范

| 元素 | 高度 | 说明 |
|------|------|------|
| 工具栏 | 36px | 顶部操作栏 |
| 侧边栏 | 48px 宽 | 左侧导航 |
| 标签栏 | 32px | 终端标签 |
| 状态栏 | 24px | 底部信息栏 |
| 按钮 | 28px | 标准按钮 |
| 图标 | 16-20px | 标准图标 |

## 组件设计

### 1. 工具栏 (Toolbar)

**特点：**
- 高度：36px
- 背景：`#242424`
- 按钮：28x28px，圆角 2px
- 分组：用竖线分隔

**交互：**
- 悬停：背景变为 `#333333`
- 激活：背景变为 `#3a3a3a`

### 2. 侧边栏 (Sidebar)

**特点：**
- 宽度：48px
- 背景：`#242424`
- 按钮：40x40px
- 激活指示：左侧 3px 白色竖线

**图标：**
- 💻 终端
- 🤖 AI助手
- ⚙️ 设置

### 3. 终端标签 (Terminal Tabs)

**特点：**
- 高度：32px
- 背景：透明/激活时 `#1a1a1a`
- 圆角：顶部 2px
- 激活：底部 2px 白色下划线

**元素：**
- 图标（14px）+ 标题（12px）+ 关闭按钮（16px）
- 关闭按钮：悬停时显示

### 4. 终端内容 (Terminal)

**xterm.js 主题：**
```javascript
{
  background: '#1a1a1a',
  foreground: '#e8e8e8',
  cursor: '#ffffff',
  selectionBackground: '#3a3a3a',
  // 黑白灰色板
  black: '#1a1a1a',
  white: '#e8e8e8',
  brightBlack: '#4a4a4a',
  brightWhite: '#f8f8f8',
  // 其他颜色也使用灰度
}
```

**字体：**
- 字体：Consolas, Courier New, monospace
- 大小：13px
- 行高：1.2

### 5. 状态栏 (Status Bar)

**特点：**
- 高度：24px
- 背景：`#242424`
- 字体：11px
- 分为左右两部分

**左侧信息：**
- 连接状态
- 编码格式
- 当前会话

**右侧监控：**
- CPU 使用率
- 内存使用率
- 网络流量
- 磁盘使用

### 6. 系统监控 (System Monitor)

**设计：**
```
CPU  ▓▓▓░░░░░  45%
MEM  ▓▓▓▓▓░░░  67%
NET  ▓░░░░░░░  12%
DISK ▓▓▓▓░░░░  58%
```

**规格：**
- 标签：10px，加粗，右对齐，32px 宽
- 进度条：50x6px，圆角 3px
- 数值：11px，等宽字体，36px 宽

**颜色渐变：**
- 0-60%：`#4a4a4a → #6a6a6a`（深灰）
- 60-80%：`#6a6a6a → #8a8a8a`（中灰）
- 80-100%：`#8a8a8a → #aaaaaa`（浅灰，带脉动动画）

**动画：**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 交互规范

### 悬停效果

**通用规则：**
- 背景色加深一级
- 边框色加深一级
- 文字色提亮一级
- 过渡时间：0.2s

**示例：**
```css
.button {
  background: #2d2d2d;
  transition: all 0.2s;
}

.button:hover {
  background: #333333;
}
```

### 激活状态

**视觉反馈：**
- 背景色：`#3a3a3a`
- 边框：白色或加粗
- 文字：纯白 `#ffffff`

### 焦点状态

**输入框：**
- 边框：`#4d4d4d`
- 背景：`#242424`
- 无外发光

### 禁用状态

**规则：**
- 透明度：50%
- 鼠标：`not-allowed`
- 无交互效果

## 字体规范

### 字体家族

```css
/* 界面字体 */
font-family: 'Segoe UI', 'Microsoft YaHei', 
             -apple-system, BlinkMacSystemFont, sans-serif;

/* 等宽字体（终端、代码） */
font-family: 'Consolas', 'Courier New', 
             'DejaVu Sans Mono', monospace;
```

### 字体大小

| 用途 | 大小 | 说明 |
|------|------|------|
| 标题 | 14-16px | 页面标题 |
| 正文 | 13px | 主要内容 |
| 辅助 | 12px | 次要信息 |
| 小字 | 11px | 状态栏、标签 |
| 微字 | 10px | 监控标签 |

### 字重

- 常规：400
- 中等：500
- 加粗：600

## 间距规范

```css
--spacing-xs: 4px    /* 极小间距 */
--spacing-sm: 8px    /* 小间距 */
--spacing-md: 12px   /* 中等间距 */
--spacing-lg: 16px   /* 大间距 */
--spacing-xl: 24px   /* 超大间距 */
```

## 圆角规范

```css
--radius-sm: 2px     /* 小圆角 - 按钮、输入框 */
--radius-md: 4px     /* 中圆角 - 卡片 */
--radius-lg: 6px     /* 大圆角 - 面板 */
```

## 阴影规范

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5)   /* 轻微阴影 */
--shadow-md: 0 2px 4px rgba(0, 0, 0, 0.6)   /* 中等阴影 */
--shadow-lg: 0 4px 8px rgba(0, 0, 0, 0.7)   /* 深度阴影 */
```

## 动画规范

### 过渡时间

- 快速：0.15s（按钮、悬停）
- 标准：0.2s（通用）
- 缓慢：0.3s（进度条、淡入）
- 长时：0.5s（数据更新）

### 缓动函数

```css
transition-timing-function: ease;        /* 通用 */
transition-timing-function: ease-in-out; /* 平滑 */
transition-timing-function: ease-out;    /* 结束 */
```

### 动画示例

**淡入：**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**脉动（高负载）：**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## 滚动条样式

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #242424;
}

::-webkit-scrollbar-thumb {
  background: #333333;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3a3a3a;
}
```

## 响应式设计

### 断点

- 小屏：< 1024px
- 中屏：1024px - 1440px
- 大屏：> 1440px

### 适配策略

1. **侧边栏**：小屏可折叠
2. **工具栏**：小屏隐藏部分按钮
3. **状态栏**：小屏简化信息
4. **字体**：保持固定大小

## 可访问性

### 对比度

- 主文字：对比度 > 7:1
- 次级文字：对比度 > 4.5:1
- 边框：对比度 > 3:1

### 键盘导航

- Tab：焦点切换
- Enter：确认
- Esc：取消
- Ctrl+Tab：标签切换

### 屏幕阅读器

- 使用语义化 HTML
- 提供 aria-label
- 状态变化通知

## 性能优化

### CSS 优化

1. 使用 CSS 变量
2. 避免复杂选择器
3. 使用 transform 代替 position
4. 使用 will-change 提示

### 动画优化

1. 使用 GPU 加速（transform, opacity）
2. 避免触发重排（width, height）
3. 使用 requestAnimationFrame

## 设计原则

### 1. 简洁至上

- 去除不必要的装饰
- 保持界面整洁
- 突出核心功能

### 2. 一致性

- 统一的配色方案
- 统一的交互模式
- 统一的视觉语言

### 3. 专业性

- 参考专业工具（Xshell）
- 注重细节打磨
- 提供高效操作

### 4. 可读性

- 合适的字体大小
- 足够的对比度
- 清晰的层次结构

### 5. 响应性

- 即时的视觉反馈
- 流畅的动画过渡
- 快速的加载速度

## 组件清单

### 已实现

- ✅ 工具栏（Toolbar）
- ✅ 侧边栏（Sidebar）
- ✅ 终端标签（Terminal Tabs）
- ✅ 终端内容（Terminal）
- ✅ 状态栏（Status Bar）
- ✅ 系统监控（System Monitor）
- ✅ AI 聊天（AI Chat）
- ✅ 设置页面（Settings）

### 待优化

- ⏳ 右键菜单
- ⏳ 对话框
- ⏳ 通知提示
- ⏳ 加载动画
- ⏳ 错误提示

## 开发建议

### CSS 组织

```
styles/
├── variables.css    # CSS 变量
├── reset.css        # 重置样式
├── base.css         # 基础样式
├── components/      # 组件样式
│   ├── toolbar.css
│   ├── sidebar.css
│   ├── terminal.css
│   └── ...
└── utilities.css    # 工具类
```

### 命名规范

- BEM 命名法
- 语义化类名
- 避免缩写

### 代码示例

```css
/* 好的命名 */
.terminal-tab { }
.terminal-tab--active { }
.terminal-tab__close { }

/* 避免 */
.tt { }
.active { }
.btn { }
```

---

**设计目标：打造专业、高效、优雅的终端体验** 🎨
