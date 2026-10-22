# OAuth2 Playground

A hands-on learning project for OAuth2, OpenID Connect, SSO, SAML, and federation.
Several small applications make protocol roles and message flows visible.
Lab 1 uses TypeScript, Node.js, Express, and `jose`.
Languages and frameworks for later labs remain open.

We communicate in German. Maintained project files, AI instructions, skills,
documentation, code comments, and program/test output are written in English.
The authoritative language policy is in [AGENTS.md](AGENTS.md).

## Current status

The AI infrastructure and the first runnable lab are in place.
Current learning decisions are recorded in [docs/project-state.md](docs/project-state.md).

[Lab 1: Client Credentials](labs/01-client-credentials/README.md) contains a custom
authorization server, resource server, and CLI client running as three separate
processes, including HTTP/process tests and experiments. Its README covers
installation, startup, scope errors, and the limits of local JWT validation.
The [implementation plan](docs/plans/001-client-credentials.md) records architecture,
acceptance criteria, and the completed scope.

```powershell
Set-Location labs/01-client-credentials
npm.cmd ci
npm.cmd run build
npm.cmd run setup
```

Then run `npm.cmd run start:as`, `npm.cmd run start:rs`, and
`npm.cmd run client` in three terminals in the lab directory.
`npm.cmd run check` verifies types, style, and behavior.

## GitHub checks and security

The public repository is [1rrsinn/oauth2-playground](https://github.com/1rrsinn/oauth2-playground).
[GitHub security setup](docs/github-security.md) documents Linux/Windows CI,
CodeQL for TypeScript and Actions, dependency review, Dependabot, SHA pins, and
repository protection settings. Report vulnerabilities through the private
channel described in [SECURITY.md](SECURITY.md).

## AI infrastructure

| File or directory | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Shared project instructions and selective context loading |
| [rules/learning.md](rules/learning.md) | Clear explanations and appropriate learning guidance |
| [rules/protocols.md](rules/protocols.md) | Technical guidance for protocol implementation and review |
| [rules/web-security.md](rules/web-security.md) | OWASP-based API, session, input, and logging rules |
| [rules/typescript.md](rules/typescript.md) | TypeScript conventions for TypeScript labs |
| [rules/github.md](rules/github.md) | Pinned Actions, minimal permissions, and safe public-repository CI |
| [.agents/skills/](.agents/skills/) | Reusable tutor, lab-building, and review workflows |
| [.codex/agents/](.codex/agents/) | Optional specialized Codex agent roles |
| [docs/lab-template.md](docs/lab-template.md) | Template for a concrete experiment |

`AGENTS.md` provides persistent guidance; skills describe task-specific workflows;
agent roles bound a delegated subtask. Markdown files in `rules/` are routed
through `AGENTS.md`. They are not technically enforced sandbox or command policies.

Protocol rules reference IETF standards and OIDC/SAML specifications.
Web security rules add concrete OWASP Cheat Sheet guidance.
TypeScript rules select local conventions, using Google for style orientation
and Microsoft's official language documentation for language semantics.
They do not mandate a stack for every lab.
Compiler, lint, and runtime checks are implemented in Lab 1. Future labs configure
checks appropriate to their stacks; instructions alone do not enforce them.

## Usage

Example requests to Codex:

```text
Use $oauth-tutor to explain the difference between client authentication
and user login through an HTTP flow.

Use $oauth-lab to plan a Client Credentials lab.
Do not write application code yet.

Use $oauth-protocol-review to inspect token validation in the existing lab.
Support findings with code and do not change files yet.
```

Skills can also be selected when their descriptions match a request.
For explicitly requested delegation, the roles `oauth_tutor`,
`oauth_lab_builder`, and `oauth_protocol_reviewer` are available.
They specify neither model nor reasoning effort and inherit the calling session's
permissions. Tutor and reviewer work read-only by instruction; this is not a
separate read-only sandbox. An authorized reviewer may create ephemeral local
check output under `.tmp/` without changing maintained project files.

Codex reads `AGENTS.md` at session startup and discovers project-local skills under
`.agents/skills/`. If new skills do not appear, start a new session in the project
directory. Actual role availability depends on the host and its version;
a TOML parse alone does not establish runtime activation.

The local Git repository is rooted at `oauth2-playground`.
Open that folder as the project; shared instructions live in its `AGENTS.md`.
The earlier missing-repository-root limitation was resolved by initialization.
Starting Codex from a lab subdirectory has not been checked separately.

## Maintenance and boundaries

Add rules when a concrete need arises. Project decisions belong in
`docs/project-state.md`; runnable examples and evidence belong alongside each lab.
Do not duplicate learning content across skills or agent definitions.

The [AI infrastructure review](docs/ai-infrastructure-review.md) records resolved
gaps, sources, and the limits of the review before Lab 1.

The setup does not modify global Codex configuration or grant shell access
outside the sandbox.

The structure follows official OpenAI documentation for
[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[skills](https://learn.chatgpt.com/docs/build-skills), and
[agent roles](https://learn.chatgpt.com/docs/agent-configuration/subagents).
Technical [command rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
are a separate mechanism and are not configured here.
