# Project and Decision State

Setup date: October 22, 2026.

## Confirmed by the user

- Learn OAuth2 by building its participating components.
- Multiple small projects are explicitly welcome; one large project is unnecessary.
- The work environment includes Okta, Trimble ID, SSO, and SAML.
  The learning stack does not have to match the work stack.
- Set up this project's AI infrastructure first.
- Implement Lab 1 as a Client Credentials experiment with a custom authorization
  server, resource server, and CLI client in TypeScript, including tests and
  documentation. This implementation request authorizes a complete example.
- Communicate in German. Keep AI rules, skills and metadata, agent definitions,
  documentation/READMEs, code comments, logs, CLI messages, and test output in
  English, as defined centrally in `AGENTS.md`.

## Infrastructure in place

- Shared instructions in `AGENTS.md` and selectively loaded learning/protocol rules.
- The skills `oauth-tutor`, `oauth-lab`, and `oauth-protocol-review`.
- Optional Codex roles `oauth_tutor`, `oauth_lab_builder`, and
  `oauth_protocol_reviewer`, without model or permission overrides.
- A template for describing and verifying a concrete lab.
- TypeScript conventions and web security rules with OWASP references.
  Protocol rules include concrete guidance for secure flows.
- An AI infrastructure review with an explicit TypeScript style selection:
  Google for orientation, Microsoft's Handbook/TSConfig documentation for
  language semantics; Microsoft's compiler-internal conventions do not apply.
- A local Git repository on branch `main` for the initial version.

The existence of files does not establish activation by a particular host.
Report runtime availability and performed checks separately.

## Lab 1: implemented

[Lab 1](../labs/01-client-credentials/README.md) is an independent npm package
using Node.js 22, TypeScript, Express 5, and `jose` 6. The three processes use
`client_secret_basic`, restricted scopes, and RS256 JWTs valid for 60 seconds.
The RS needs only the public key and expected issuer/audience.
Registration, client secret, and keys are generated locally by setup.

The [implementation plan](plans/001-client-credentials.md) records the agreed
scope. Startup commands, configuration, experiments, and verification are
documented in the lab README. No external identity provider was configured.

## Open decisions

- Choice and learning mode of later labs. Guided implementation and complete
  examples remain available depending on the request.
- Languages and frameworks for later labs; these need not follow the work stack.

## Earlier proposals

Client Credentials and TypeScript are the selected direction for Lab 1.
Later labs on Authorization Code with PKCE, OIDC, SSO, SAML, and federation
have been discussed. A notes API and Keycloak as a later comparison remain
possible examples, not approved future dependencies.

## Implementation status

The AI infrastructure and Lab 1 are present. The lab has strict TypeScript,
lint, and format checks, real HTTP tests, and an integration test with three
separate processes. Checks also establish that a token remains valid at the RS
after the AS stops, and that expired tokens are rejected.
The project is published in the public GitHub repository
`1rrsinn/oauth2-playground` with CI and repository security controls.
There is no deployment or real tenant data. Configuration and hosted verification
are recorded in [GitHub security setup](github-security.md).

On October 22, 2026, `npm.cmd run check` completed with typecheck, ESLint,
Prettier, build, and 59 passing HTTP/process/setup tests including subtests.
Local startup configuration was generated; repeating setup preserved it.
Details and limitations are recorded in the lab README.

## Original setup verification

During the original setup, with local Codex CLI `0.163.0-alpha.11`:

- Checked 17 setup files for UTF-8, final newlines, and trailing whitespace;
  resolved 12 local Markdown references.
- Checked the three skill manifests and UI files against their YAML structure.
  The local Codex app server recognized all three skills through `skills/list`,
  reported them enabled, and loaded their UI metadata without project loading errors.
- The local prompt renderer loaded the project `AGENTS.md`.
- Parsed all three agent files as TOML and checked required fields and existing
  skill references. The roles were not actually assigned work.

These checks started no chats, agent tasks, or model requests.

Subsequent rule additions reference official TypeScript documentation, RFC 9700,
and the linked OWASP Cheat Sheets. Rules alone configure no compiler, linter, or
web protection; Lab 1 now implements its appropriate checks.
Languages and frameworks for later labs remain open.

The repeat review before Lab 1 is recorded in
[docs/ai-infrastructure-review.md](ai-infrastructure-review.md).
It does not replace application behavior checks.
The Git root is now the project root; starting Codex from a lab subdirectory
has not been checked separately.
