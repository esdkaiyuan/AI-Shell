# AI Shell 文档索引

以根 [README](../README.md) 为项目入口。以下文档按维护状态分组，历史材料中的完成度、版本号和命令可能已过时。

## 当前文档

| 文档                                       | 内容                                           |
| ------------------------------------------ | ---------------------------------------------- |
| [使用说明](USAGE.md)                       | 桌面端与手机端功能、操作流程、快捷键与安全边界 |
| [安装与构建](INSTALLATION.md)              | 从源码开发、桌面打包、Android APK 构建         |
| [开发指南](DEVELOPMENT.md)                 | 仓库结构、脚本、关键模块和测试方式             |
| [架构说明](../ARCHITECTURE.md)             | 进程边界、数据流、运行时与安全存储             |
| [功能清单](../FEATURES.md)                 | 当前桌面端/手机端功能和验证边界                |
| [UI 设计规范](UI_DESIGN.md)                | Apple HIG 深色设计令牌、布局和组件规则         |
| [手机端说明](../packages/mobile/README.md) | 内置 Alpine 环境、原生模块和 APK 构建          |
| [AI 配置指南](AI_SETUP_GUIDE.md)           | Provider Key 获取、模型与代理配置              |
| [安全说明](../SECURITY.md)                 | 凭据、私钥、文件和命令执行边界                 |
| [变更记录](../CHANGELOG.md)                | 按版本记录新增、修复和变更                     |
| [项目概况](../PROJECT_SUMMARY.md)          | 当前形态、已实现范围、安全与验证边界           |

## 补充文档

- [快速开始](QUICKSTART.md)：精简的首次运行流程。
- [API 文档](API.md)：核心 API 与 IPC 参考，修改接口后需同步复核。
- [部署说明](DEPLOYMENT.md)：桌面/移动构建与分发注意事项。
- [贡献指南](../CONTRIBUTING.md)：分支、提交和代码质量要求。

## 历史材料

以下文档记录了阶段性的设计、审查或修复过程，不代表当前实现：

- [AI 助手面板旧说明](../AI_ASSISTANT_PANEL.md)
- [图标更新记录](../UI_ICONS_UPDATE.md)
- [审查报告](AUDIT_REPORT.md)
- [修复总结](FIXES_SUMMARY.md)

进行架构或功能判断时，请优先阅读代码、当前文档和 `git log`，不要直接依赖历史材料中的数字与完成度描述。
