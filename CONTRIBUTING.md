# Contributing to AI Shell

Thank you for your interest in contributing to AI Shell! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**When filing a bug report, include:**

- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, version, etc.)
- Error messages or logs

### Suggesting Features

Feature suggestions are welcome! Please:

- Check if the feature has already been suggested
- Provide a clear use case
- Explain why this feature would be useful
- Consider implementation complexity

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the code style guidelines
   - Add tests if applicable
   - Update documentation
4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

## Development Setup

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed setup instructions.

Quick start:

```bash
git clone https://github.com/esdkaiyuan/AI-Shell.git
cd AI-Shell
pnpm install
pnpm type-check
pnpm test
pnpm dev
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide type annotations for public APIs
- Avoid `any` types when possible

### Formatting

- Use Prettier for code formatting
- Run `pnpm lint` before committing
- Configure your editor to format on save

### Naming Conventions

- **Files**: kebab-case (`my-component.tsx`)
- **Classes**: PascalCase (`MyClass`)
- **Functions**: camelCase (`myFunction`)
- **Constants**: UPPER_SNAKE_CASE (`MY_CONSTANT`)
- **Interfaces**: PascalCase with `I` prefix optional (`IMyInterface` or `MyInterface`)

### Comments

- Write clear, concise comments
- Document complex logic
- Use JSDoc for public APIs
- Keep comments up-to-date

Example:

```typescript
/**
 * Connects to an SSH server with the provided configuration.
 *
 * @param config - SSH connection configuration
 * @returns Promise resolving to session ID
 * @throws Error if connection fails
 */
async connect(config: SSHConfig): Promise<string> {
  // Implementation
}
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(ai): add support for GPT-4 Turbo

fix(terminal): resolve input lag on Windows

docs(readme): update installation instructions

refactor(core): simplify AI adapter factory
```

## Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for good test coverage

Run tests:

```bash
pnpm test
```

## Documentation

- 用户可见变化同步更新 `README.md`、`docs/USAGE.md` 或 `packages/mobile/README.md`
- 构建/部署变化同步更新 `docs/INSTALLATION.md` 与 `docs/DEPLOYMENT.md`
- 接口协议变化同步复核 `docs/API.md`
- 设计令牌或页面骨架变化同步更新 `docs/UI_DESIGN.md`
- 历史审查/修复文档不要当作当前实现说明

## Adding AI Providers

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed instructions.

## Project Structure

```text
ai-shell/
├── packages/
│   ├── core/          # AI 适配器、存储、控制器
│   ├── desktop/       # Electron 主进程、preload、React
│   ├── mobile/        # React Native + Kotlin 原生模块
│   └── shared-assets/ # 品牌资产
├── docs/              # 当前文档与历史材料
└── README.md
```

## Review Process

1. All PRs require at least one review
2. CI checks must pass
3. Code must follow style guidelines
4. Documentation must be updated
5. Tests must pass

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to:

- Open an issue for questions
- Start a discussion on GitHub Discussions
- Reach out to maintainers

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to AI Shell! 🎉
