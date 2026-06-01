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
git clone https://github.com/yourusername/ai-shell.git
cd ai-shell
pnpm install
pnpm build
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

- Update README.md for user-facing changes
- Update API.md for API changes
- Add inline code documentation
- Include examples where helpful

## Adding AI Providers

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md#adding-new-ai-providers) for detailed instructions.

## Project Structure

```
ai-shell/
├── packages/
│   ├── core/          # Core logic
│   ├── desktop/       # Desktop app
│   ├── mobile/        # Mobile app (future)
│   └── server/        # Sync server (optional)
├── docs/              # Documentation
└── scripts/           # Build scripts
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
