# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [security@example.com](mailto:security@example.com)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Best Practices

### For Users

1. **API Keys**
   - Never share your API keys
   - Rotate keys regularly
   - Use environment-specific keys
   - Revoke unused keys

2. **Updates**
   - Keep the application updated
   - Enable automatic updates
   - Review release notes for security fixes

3. **SSH**
   - Use key-based authentication
   - Avoid storing passwords
   - Use strong passphrases
   - Regularly rotate SSH keys

4. **Network**
   - Use secure networks
   - Avoid public WiFi for sensitive operations
   - Consider using VPN

### For Developers

1. **Dependencies**
   - Regularly update dependencies
   - Run `pnpm audit` to check for vulnerabilities
   - Review dependency changes

2. **Code**
   - Validate all user input
   - Sanitize command execution
   - Use parameterized queries
   - Avoid eval() and similar functions

3. **Secrets**
   - Never commit API keys or secrets
   - Use environment variables
   - Encrypt sensitive data at rest
   - Use secure key storage (keytar)

4. **Communication**
   - Use HTTPS/WSS for all network requests
   - Validate SSL certificates
   - Implement proper authentication
   - Use secure WebSocket connections

## Known Security Considerations

### API Key Storage

API keys are stored locally using the system's secure storage mechanism:
- **Windows**: Windows Credential Manager
- **macOS**: Keychain
- **Linux**: libsecret

### Command Execution

The application executes shell commands with the user's permissions. Users should:
- Review commands before execution
- Be cautious with AI-generated commands
- Understand command implications

### Network Requests

All AI API requests are made over HTTPS. However:
- API keys are transmitted to third-party services
- Command history may be sent to AI providers
- Review each provider's privacy policy

### Local Data

The application stores data locally:
- Command history
- SSH configurations
- AI provider settings

This data is stored unencrypted in the user's application data directory.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.

## Security Updates

Security updates will be released as patch versions and announced via:
- GitHub Security Advisories
- Release notes
- Project README

## Contact

For security concerns, contact: [security@example.com](mailto:security@example.com)

For general questions, use GitHub Issues or Discussions.
