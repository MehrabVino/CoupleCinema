# Security Policy

## Supported versions

This project is under active development. Security fixes are generally applied to the latest `main` branch state.

## Reporting a vulnerability

Please do not open public issues for security vulnerabilities.

Report privately with:

- vulnerability type
- impact summary
- affected components/files
- reproduction steps or proof of concept
- mitigation suggestions (if available)

If you are maintaining a private fork, apply hotfixes quickly to:

- auth/session logic
- realtime signaling and room validation
- file upload/download and token sharing
- environment secret handling

## Security hardening guidance

- Rotate `JWT_SECRET` in non-dev environments.
- Use strong SMTP credentials and app-passwords only.
- Restrict CORS with a strict `CLIENT_ORIGIN`.
- Run behind HTTPS in production.
- Isolate persistent storage and backups.
- Keep dependencies updated in root and `server/` workspace.

## Out of scope

General support requests and feature questions are not security reports; use issues/discussions for those.
