# UI图标更新说明

## 更新概述
将所有emoji图标替换为SVG图标，并统一使用黑灰色配色方案。

## 更改的文件

### 1. 新增文件

#### `packages/desktop/src/renderer/components/Icons.tsx`
创建了SVG图标组件库，包含以下图标：
- **导航图标**: TerminalIcon, AIIcon, SettingsIcon
- **用户图标**: UserIcon, BotIcon
- **操作图标**: SendIcon, PlusIcon, CloseIcon, CheckIcon, InfoIcon
- **提供商图标**: OpenAIIcon, ClaudeIcon, BaiduIcon, AliyunIcon, GLMIcon, XinghuoIcon, MoonshotIcon, DeepseekIcon, OllamaIcon

所有图标使用 `currentColor` 继承父元素颜色，便于统一管理。

#### `packages/desktop/src/renderer/components/ProviderIcons.tsx`
创建了提供商图标映射组件，根据提供商名称动态渲染对应的SVG图标。

### 2. 更新的组件

#### `packages/desktop/src/renderer/components/Sidebar.tsx`
**更改内容**:
- 导入 `TerminalIcon`, `AIIcon`, `SettingsIcon`
- 将emoji图标 (💻, 🤖, ⚙️) 替换为SVG图标组件
- 图标大小设置为 18px

**更新的CSS** (`Sidebar.css`):
```css
.nav-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #858585;  /* 默认灰色 */
}

.nav-item:hover .icon {
  color: #cccccc;  /* 悬停时变亮 */
}

.nav-item.active .icon {
  color: #cccccc;  /* 激活状态 */
}
```

#### `packages/desktop/src/renderer/components/AIChat.tsx`
**更改内容**:
- 导入 `UserIcon`, `BotIcon`, `SendIcon`
- 将emoji图标 (👋, 👤, 🤖) 替换为SVG图标组件
- 空状态使用大尺寸BotIcon (48px)
- 消息头像使用20px图标
- 发送按钮使用18px SendIcon

**更新的CSS** (`AIChat.css`):
```css
.empty-state .empty-icon {
  color: #666666;
  margin-bottom: var(--spacing-md);
}

.message-avatar {
  color: #858585;
}

.message.user .message-avatar {
  color: #999999;
}

.message.assistant .message-avatar {
  color: #777777;
}

.chat-input button {
  color: #858585;
}

.chat-input button:hover:not(:disabled) {
  color: #cccccc;
}
```

#### `packages/desktop/src/renderer/components/Settings.tsx`
**更改内容**:
- 导入 `PlusIcon`, `CloseIcon`, `CheckIcon`, `InfoIcon`
- 导入 `ProviderIcon` 组件
- 移除 `PROVIDER_TEMPLATES` 中的 `icon` 字段
- 移除 `getProviderIcon` 函数
- 更新所有使用图标的地方：
  - 提供商列表项使用 `<ProviderIcon>` (20px)
  - 状态徽章使用 `<CheckIcon>` 和 `<CloseIcon>` (14px)
  - 添加按钮使用 `<PlusIcon>` (16px)
  - 关闭按钮使用 `<CloseIcon>` (16px)
  - 提供商卡片使用 `<ProviderIcon>` (32px)
  - 确定按钮使用 `<CheckIcon>` (16px)
  - 帮助信息使用 `<InfoIcon>` (18px)

**更新的CSS** (`Settings.css`):
```css
.provider-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #858585;
}

.provider-badge svg {
  color: #858585;
}

.btn-primary svg {
  color: #858585;
}

.btn-close {
  color: #858585;
}

.provider-card-icon {
  color: #858585;
}

.help-section h4 svg {
  color: #858585;
}
```

## 颜色方案

所有图标使用统一的黑灰色配色：
- **默认状态**: `#858585` (中灰色)
- **悬停状态**: `#999999` - `#cccccc` (较亮的灰色)
- **激活状态**: `#aaaaaa` - `#cccccc` (更亮的灰色)
- **空状态大图标**: `#666666` (稍深的灰色)

## 优势

1. **跨平台兼容性**: SVG图标在所有系统和浏览器中都能正确显示，不依赖系统emoji支持
2. **统一视觉风格**: 黑灰色配色与整体UI风格一致
3. **可定制性**: 使用 `currentColor` 可以轻松通过CSS调整颜色
4. **可扩展性**: 新增图标只需在 `Icons.tsx` 中添加新的组件
5. **性能优化**: SVG图标比emoji渲染更快，文件体积更小

## 测试建议

1. 启动应用检查所有图标是否正确显示
2. 测试不同状态下的图标颜色变化（默认、悬停、激活）
3. 验证所有交互功能是否正常工作
4. 检查不同分辨率下图标的清晰度

## 后续优化建议

1. 考虑添加图标动画效果（如悬停时的缩放或旋转）
2. 可以为不同状态添加更多颜色变化
3. 考虑添加深色/浅色主题切换时的图标颜色适配
