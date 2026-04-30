# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Captar seriously. If you have discovered a security
vulnerability, please report it responsibly.

### How to Report

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, send an email to: **security@captar.local**

Include as much of the following information as possible:

- Type of vulnerability (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the vulnerability
- Location of affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Depends on severity and complexity
- **Disclosure**: Coordinated with reporter; we follow responsible disclosure

### Security Best Practices for Users

- Keep your Captar installation up to date
- Use strong, unique PostgreSQL credentials
- Set a long random `AUTH_SECRET` in your environment
- Run Captar behind HTTPS in production
- Restrict the ingest API key to your application servers only
