# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Send a private report
to the security contact configured for the production deployment and include:

- affected endpoint or feature;
- reproduction steps and required privileges;
- observed and expected behavior;
- potential impact;
- any temporary mitigation already applied.

The operations team should acknowledge reports within two business days,
provide a severity assessment after triage, and coordinate disclosure only
after a fix or mitigation is available.

## Supported versions

Only the currently deployed production release and the latest `main` branch are
supported. Security fixes are applied through a new immutable deployment rather
than by patching running instances.

## Handling sensitive data

Never commit or transmit database credentials, OAuth secrets, LLM provider
keys, session tokens, password-reset links, private paper content, or production
exports in issues, logs, screenshots, or test fixtures.
