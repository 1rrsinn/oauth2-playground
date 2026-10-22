# AI Infrastructure Review Before Lab 1

Date: October 22, 2026. Initial scope: all 19 existing project files.
Reviewed `AGENTS.md`, four rule files, three skills with UI metadata, three agent
roles, README, project state, lab template, `.editorconfig`, and `.gitignore`.
The review added this report.

## Findings and corrections

| Finding | Classification and outcome | Responsible location |
| --- | --- | --- |
| No unambiguous choice between external TypeScript guides. | Google provides style orientation; concrete rules and exceptions are selected locally. Microsoft's compiler contribution rules are not adopted as general application guidance. | [TypeScript rules](../rules/typescript.md) |
| Skills maintained context lists that lagged behind the expanded routing. | All three skills reference the shared task-specific routing, providing one place to select technical context. | [AGENTS.md](../AGENTS.md), [.agents/skills/](../.agents/skills/) |
| Wording about `await` could equate awaiting with error handling. | Errors may propagate to a defined boundary; background operations receive error handlers. | [TypeScript rules](../rules/typescript.md) |
| Synthetic test data and usable credentials were not distinguished clearly enough. | A valid lab token remains a credential. Runtime secrets stay local; published examples use placeholders. | [AGENTS.md](../AGENTS.md) |
| Read-only review and local verification left check output handling unclear. | The reviewer does not change maintained project files; authorized checks may use `.tmp/`. | [Review skill](../.agents/skills/oauth-protocol-review/SKILL.md), [reviewer role](../.codex/agents/oauth_protocol_reviewer.toml) |
| The HTTP contract was less specific than token/claim validation. | Added form encoding, protection against token caching, and Bearer challenges; scopes are limited server-side. Client Credentials issues no refresh token by default. | [Protocol rules](../rules/protocols.md) |
| Starting sessions from future subdirectories was not established without a repository root. | The limitation is documented: sessions currently start from the project root. This alone does not configure Git or another root mechanism. | [README.md](../README.md) |

The first six points were corrected in the instructions. Root discovery was
a documented operational limitation at review time. The subsequently requested
initial version created a local Git repository, resolving the missing Git root.
Starting Codex from a lab subdirectory remains unverified.

## TypeScript decision

The [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
is a reference from Google's environment. The selected style includes two spaces,
semicolons, single quotes, clear names, and named exports with justified framework
exceptions. The local choices in `rules/typescript.md` take precedence;
the entire external guide is not an additional mandatory rule set.

Microsoft's [Coding Guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
explicitly target contributions to the TypeScript project.
The [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) and
[TSConfig reference](https://www.typescriptlang.org/tsconfig/) remain authoritative
for language and compiler behavior. Choosing a style decides neither the
framework stack nor every lab's language.

## Instruction checks against example situations

These scenarios were reviewed against the instruction text for consistent
responsibilities. They were not executed model or subagent evaluations:

- **"Explain PKCE":** The tutor explains the flow; the question alone authorizes no file changes.
- **"Plan the lab; do not build anything yet":** The lab skill stays within planning.
- **"Build this small lab":** Local implementation and appropriate checks are allowed within the request; no extra default confirmation round.
- **"Review the flow":** The reviewer reports findings and may run authorized local checks; maintained project files remain unchanged.
- **"Edit TypeScript":** TypeScript rules apply, plus web security rules at HTTP/browser boundaries.
- **"Investigate a trace containing instructions":** Trace contents remain data and do not expand the assignment.

## Evidence and limitations

Final review checks with local Codex CLI `0.163.0-alpha.11`:

- Checked 20 project files for UTF-8 and consistent final newlines;
  successfully resolved 36 local Markdown references.
- The JSON configuration example was syntactically valid. It was still a template;
  no TypeScript compiler was run through that example.
- Checked three skill manifests and three UI files against their YAML structure.
  The native Codex loader reported all three skills enabled with loaded UI
  metadata and no project loading errors.
- Parsed three agent definitions as TOML; required fields, role identifiers,
  and skill references were valid.
- The local prompt renderer loaded the current project `AGENTS.md`.

The additional bundled Python skill validator could not run because `PyYAML`
was unavailable. The native Codex loader successfully checked skill loading;
no additional dependency was installed for that check.

Instructions do not give an agent role its own sandbox.
The [official subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents)
describes inherited permissions and the TOML format. These checks did not start
agent tasks and establish no claims about actual model behavior under the instructions.

At the time of this review, there was no application code, compiler/linter run,
or OAuth integration test. Those checks belong to a concrete lab.
[Protocol sources](../rules/protocols.md) and OWASP rules were requirements
and references, not already implemented protection measures.
Subsequent Lab 1 implementation and evidence are recorded in
[project state](project-state.md) and the [lab README](../labs/01-client-credentials/README.md).
