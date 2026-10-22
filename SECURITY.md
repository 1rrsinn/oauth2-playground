# Security Policy

This repository contains local learning experiments, not a supported identity
provider or a production OAuth implementation. The latest default-branch version
is maintained; historical lab revisions have no separate support commitment.

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/1rrsinn/oauth2-playground/security/advisories/new)
for credential disclosure, authentication/authorization bypasses, or other
security issues. Include the affected revision, reproduction steps using
synthetic data, expected behavior, and impact. Do not attach real credentials,
tokens, workplace traces, or tenant data.

Keep exploit details and exposed credentials out of public issues and pull
requests. Ordinary learning questions and documented local simplifications may
be discussed in public issues. If a usable credential is exposed, revoke or
rotate it at its issuer; deleting it from a file does not revoke it.

## Local boundaries

Run labs only with synthetic identities and credentials. Follow each lab's
documented loopback restriction and HTTP simplification. Generate secrets locally
under ignored `.local/` or `secrets/` directories. Never point an experiment at a
workplace tenant or third-party system without explicit authorization.

## Repository controls

See [GitHub security setup](docs/github-security.md) for CI responsibilities,
Action pin maintenance, repository settings, and verification limits.
