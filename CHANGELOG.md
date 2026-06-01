# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- SSH connection management UI
- Device synchronization service
- Command history search interface
- React Native mobile app
- Plugin system
- Theme customization
- Command auto-completion
- Syntax highlighting
- Split panes support

## [0.1.0] - 2024-01-XX

### Added
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

[Unreleased]: https://github.com/yourusername/ai-shell/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/ai-shell/releases/tag/v0.1.0
[0.0.1]: https://github.com/yourusername/ai-shell/releases/tag/v0.0.1
