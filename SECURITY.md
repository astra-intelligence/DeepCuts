# Security Policy

Deep Cuts is a local-first portfolio app (ADR-0013). Its security controls (CSP and security headers, a server-side TMDB proxy with an allowlist, rate limiting, Zod validation of all external data, passkey-only accounts, and secret scanning) are enforced in code and CI; see `server/securityHeaders.ts`, `server/tmdb/` and `eslint.config.js`.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** ("Report a vulnerability" under the Security tab). Do not open a public issue. Expect an acknowledgement within 7 days.

## Supported versions

Only the latest `main` is supported.
