# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Agent 自主执行模式**：AI 助手可多步调用工具完成任务（列目录 / 读写文件 / 执行命令 / 查历史 / 取终端上下文），根据结果继续推理，不再只给命令建议
- 协议化 tool calling（```tool JSON 围栏）：不依赖各厂商原生 function calling，9 个 AI 提供商均可作为 Agent 使用
- Agent 执行轨迹时间线：逐轮展示思考、工具调用、执行结果与最终结论，详情可展开
- 人工确认回路：写操作默认需逐次批准（可查看完整参数后允许/拒绝），支持自动执行开关、中途停止与 60 秒确认超时
- Agent 安全边界：路径限制在工作区/用户主目录、危险命令拦截、命令 30 秒超时与输出上限、最大步数与重复调用死循环检测
- 全局快捷键 `Ctrl+Shift+G` 切换 Agent 模式；设置页可配置默认模式、自动执行与最大推理步数
- 桌面端与手机端统一 Apple HIG 深色视觉体系：页面标题层级、状态语义、对比度、焦点和响应式布局
- **安卓端模拟器实测与 UI 布局完善**：在 Medium Phone API 36（1080×2400 / 420dpi / x86_64）跑通首启向导、内置 Alpine rootfs 解压、PTY 会话与五个主页面，按截图逐项打磨布局
- 终端「命令坞」：控制键、补全/常用命令与输入栏合并为底部固定分组，输出区独占剩余高度
- 自适应密度：软键盘弹出或窗口高度 < 620dp 时收起辅助控件，保留输出区与输入栏；≥720dp 宽屏内容列居中限宽 560dp
- 布局决策模块 `src/layout.ts` + 8 个单元测试，软键盘状态 hook `useKeyboardVisible`
- 横向列表统一 Android 渐隐边缘；四周安全区（含横屏左右挖孔）
- **AI 面板内的权限开关**（读取 / 填入 / 执行）：决定 AI 能对这个终端窗口做什么，做成紧凑胶囊芯片放在「对话 / 模型」分段控件下方；「执行」默认关闭，开启后整枚转橙并给出提示。开关随对话卡片出现，主页面因此只保留终端与命令坞
- AI 回复中的命令可直接作用于终端：按勾选自动填入输入框或写入 PTY 执行；每条助手消息另有内联「填入 / 执行」小按钮，操作后收起侧窗让终端窗口可见
- 命令提取有安全边界：只解析 fenced shell 代码块与独立行内代码，过滤注释、非 shell 语言块与散文，最多 3 条，执行顺序串行
- **AI 对话紧凑化**：气泡、字阶、行高、间距、分段控件与输入区全面压缩，两行上下文卡片改为单行元信息；AI 分区改为底部卡片并从底部滑入，初始约 39% 屏高、随对话增长到 62%，遮罩减淡，终端窗口始终可见；卡片按窗口可见高度计算并锚定在键盘上方，软键盘弹起时卡片绝对高度基本不变、输入区不被遮挡
- `src/aiTerminal.ts` 纯逻辑模块（能力定义 / 命令提取 / 动作规划）+ 11 个单测；`useTerminalRuntime` 新增 `executeCommand` 绕过输入框直接写 PTY 并记历史
- **手机端按 Apple HIG 重排信息架构**：主页面只保留「大标题导航条 + 全屏终端 + 一个 AI 辅助按钮」，移除底部五项导航与页头状态堆叠
- 所有功能切换改为右侧模态侧窗（trailing sheet）：功能清单 → AI 对话、文件、SSH、会话、历史、设置、我的；侧窗支持「功能」返回、完成关闭、点遮罩关闭、Android 硬件返回键逐级回退
- 终端操作（新建终端 / 分屏 / 查找 / 清屏 / 复制输出 / 粘贴）收进侧窗「终端操作」分组，主页面不再有工具栏
- Apple HIG 设计令牌层 `src/hig.ts`：系统色、动态字阶、间距网格、连续圆角、动效时长、侧窗宽度与安全区计算；`theme.ts` 对齐系统色且保留既有 key
- 侧窗遵循 HIG Modality：遮罩变暗、右侧滑入、grabber、固定导航条、Reduce Motion 自动降级为零时长动画、44pt 触控目标
- 清理 `BottomNav.tsx` 及 28 个不再使用的旧样式定义；导航模型与单测同步为「侧窗分区」语义
- SSH 私钥文件导入：支持 OpenSSH、RSA、ECDSA、PKCS#8、加密 PEM；拒绝证书、公钥、PuTTY `.ppk`
- 多系统命令补全：Alpine、Linux、macOS、Windows PowerShell、Windows CMD
- SSH 远端系统选择，历史命令按系统标记，补全和 AI 提示随系统变化
- 桌面自定义快捷键：录制、冲突校验、恢复默认、最多 12 套命名方案
- macOS 快捷键适配：Command 主修饰键、`⌘W` 关闭标签、`⇧⌘W` 关闭窗口、`⌘,` 打开设置、录制期菜单挂起
- 手机端 APK 内置 Alpine Linux 3.20.3 + Termux PRoot（arm64-v8a / x86_64）
- 手机端真实 PTY、OpenSSH、AI 直连、文件浏览、会话、历史与系统统计
- AI 对话持久化、多会话切换、流式输出与停止生成
- 终端标签重命名/拖拽排序、Tab 路径补全、快捷命令片段和 AI 面板拖拽尺寸
- 桌面状态栏与页面空状态移除虚假连接和演示数据

### Fixed

- 修复安卓端启动即崩溃：RN 原生动画驱动不支持在 `Animated.View` 上动画 `height`，移除该高度动画，改由布局测量值直接计算卡片高度
- 修复软键盘弹起时 AI 对话输入框被键盘工具栏遮挡：卡片高度按遮罩层实测的可见区高度计算（Android `adjustResize` 只缩小根视图、不更新 `useWindowDimensions`），键盘弹起时把占比提到 62% 以保持卡片绝对高度，并移除紧凑卡片内重复的 `KeyboardAvoidingView` 高度压缩
- 修复终端页横向 ScrollView 在 flex 列中被拉伸造成的中段空白（实测约 165dp）
- 修复软键盘弹出时控制键/快捷命令挤占终端输出区；改用窗口高度差判断（`isKeyboardCoveringWindow`），避免模拟器硬件键盘跳过 RN 键盘事件导致辅助控件收起后无法恢复
- 修复标签、控制键、常用命令、厂商/模型 chips 被硬裁切且无滚动提示
- 修复 SSH、会话、历史等空状态贴顶导致的大片留白；改为可用区域内垂直居中
- 修复聊天气泡满宽、用户与助手消息不区分左右、输入栏按钮与多行输入框顶部对齐
- 修复首启向导「下一步」禁用时没有说明原因
- 修复深色应用启动瞬间白色闪屏：窗口背景、状态栏与 Splash 统一为 `#0a0a0b`，主色对齐品牌蓝 `#0a84ff`
- 修复 `react-native` 类型 shim 缺少 `useWindowDimensions` / `Keyboard` / `StyleSheet.hairlineWidth`
- 修复移动会话启动/停止竞态、过期启动回调和临时私钥残留
- 修复 bind mount 文件路径与终端实际目录不一致
- 修复删除 SSH/会话/Provider 时嵌套点击触发外层连接或加载
- 修复移动标签卡纵向拉伸、页头错误上下文和向导完成态与实际环境矛盾
- 修复千帆/文心兼容请求格式、模型拉取失败反馈和 OpenSSH 私钥换行兼容
- 修复桌面生产构建未编译 preload 的问题
- 根 `pnpm type-check` 改为按包编排，消除 desktop/mobile React 类型冲突

### Changed

- 主进程路径安全校验提取为共享模块，资源管理器与 Agent 工具执行共用同一套边界
- 辅助文字对比度提升到约 5:1 以上；统一中文状态和危险操作确认
- 桌面页头移除重复标题，AI 页面与手机页面完善上下文副标题
- 快捷键平台化：Windows/Linux 使用 Ctrl，macOS 使用 Command，Control 组合保留给终端
- 手机端限制为 64 位 ABIs（arm64-v8a / x86_64），权限收紧为 INTERNET
- 桌面设置页与资源管理器继续按需加载，保持 chunk 拆分
- 文档按当前功能、构建命令、安全边界和真机验收范围重写

### Planned

- 设备同步服务
- 插件系统
- 物理 macOS 与 Android 真机自动化验收
- 终端内联语法高亮

## [0.1.0] - 2024-01-XX

### Added

- SSH 连接管理与配置存储
- 命令历史与搜索
- 多标签与分屏终端
- 只读资源管理器
- AI 助手侧边面板与独立 AI Chat
- 9 厂商 AI Provider 与动态模型列表
- 系统监控
- 会话保存与恢复
- 凭据加密存储（Electron safeStorage）
- React Native 移动端 App（Android APK）
- Initial release
- Cross-platform desktop application (Windows, macOS, Linux)
- Local shell terminal with xterm.js
- Multi-tab terminal support
- AI integration framework
- Support for multiple AI providers:
  - OpenAI (GPT-3.5, GPT-4)
  - Anthropic Claude
  - Baidu Wenxin (文心一言)
  - Alibaba Tongyi (通义千问)
  - Ollama (local models)
- AI-powered command controllers:
  - `ai` - AI assistant chat
  - `explain` - Explain shell commands
  - `translate` - Natural language to shell command
  - `suggest` - Command suggestions
  - `fix` - Fix failed commands
  - `optimize` - Optimize commands
- AI chat interface
- Settings page for AI provider management
- Command history storage
- SQLite local database
- VS Code-inspired dark theme UI
- Monorepo structure with pnpm workspaces
- TypeScript support throughout
- Comprehensive documentation

### Technical Details

- Electron 28+ for desktop application
- React 18 with TypeScript for UI
- xterm.js for terminal emulation
- node-pty for pseudo-terminal
- better-sqlite3 for local storage
- Modular AI adapter architecture
- IPC communication between main and renderer processes

### Documentation

- README with quick start guide
- Architecture documentation
- Development guide
- Deployment guide
- API documentation
- Installation guide

## [0.0.1] - 2024-01-XX

### Added

- Project initialization
- Basic project structure
- Core module setup
- Desktop package setup
- Build configuration

[Unreleased]: https://github.com/esdkaiyuan/AI-Shell/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/esdkaiyuan/AI-Shell/releases/tag/v0.1.0
[0.0.1]: https://github.com/esdkaiyuan/AI-Shell/releases/tag/v0.0.1
