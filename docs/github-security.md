# GitHub Security Setup

Target: [1rrsinn/oauth2-playground](https://github.com/1rrsinn/oauth2-playground),
a public learning repository. Configuration date: October 22, 2026.

## Workflows

| Workflow | Trigger | Responsibility |
| --- | --- | --- |
| `CI` | Push to `main`, pull request, manual, weekly | Run Lab 1's strict typecheck, ESLint, Prettier, build, and real HTTP/process tests on Ubuntu 24.04 and Windows 2025; audit all locked npm dependencies |
| `CodeQL` | Push to `main`, pull request, manual, weekly | Analyze JavaScript/TypeScript and GitHub Actions workflows with the extended security queries |
| `Dependency Review` | Pull request | Reject newly introduced dependencies with known high/critical vulnerabilities |

GitHub schedules use UTC: CI runs Mondays at 06:17 UTC; CodeQL runs Mondays at
06:43 UTC. Scheduled runs may be delayed or disabled by GitHub after repository
inactivity. Dependabot checks Actions and Lab 1 npm dependencies weekly on Monday
at 07:00 Europe/Berlin. Update PRs require review; they do not auto-merge.

Every external Action uses a full 40-character commit SHA with its release in a
comment. Pins were resolved from the upstream repositories' Git references;
annotated tags were dereferenced to their commit. Dependabot updates Action pins.
For manual updates, verify the upstream release and commit, update the SHA and
release comment together, and wait for CI before merging.

| Action | Release | Commit |
| --- | --- | --- |
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | `v7.1.0` | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `github/codeql-action` | `v4.39.1` | `9b3254085494b55a0f7c4c2b3d2d52cc712ce370` |
| `actions/dependency-review-action` | `v5.0.0` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` |

Node is fixed by the lab's `.node-version`; npm dependencies are fixed by its
lockfile. `npm ci --ignore-scripts` prevents dependency lifecycle scripts from
running during installation. The explicitly requested project check still runs
project code, so pull requests use disposable GitHub-hosted runners without
repository secrets. This is not a sandbox for arbitrary code on a developer PC.

Workflows default to `contents: read`. Only the CodeQL analysis job adds
`security-events: write` for result upload. Checkouts do not persist credentials.
No workflow uses `pull_request_target`, untrusted shell interpolation, shared
caches, self-hosted runners, or deployment credentials. No runtime key, token,
trace, or entire working-directory artifact is uploaded.

The audit includes development dependencies and fails at high/critical severity;
Dependency Review covers newly introduced risk. Neither automatically fixes
packages or substitutes for protocol review. License filtering is not configured;
that requires an explicit project license policy.

## Repository settings

Settings are separate from files: a workflow file alone does not enable branch
protection, private reporting, or push protection. The final observed settings
and hosted checks are recorded below after bootstrap and verification.

- Actions: restricted to the four upstream Action repositories above, plus local
  owner Actions; full-SHA pinning required by repository policy.
- External contributors: workflow approval required for all external contributors.
- Default workflow token: read-only; Actions may not create or approve PRs.
- Logs and artifacts: retention limited to 14 days.
- Private vulnerability reporting: enabled.
- Dependency graph, Dependabot alerts, malware alerts, and security-update PRs:
  enabled.
- Secret Protection and push protection: already enabled and retained.
- `Protect main`: active for the default branch, with no bypass actors. Pull
  requests, up-to-date branches, resolved review conversations, and successful
  checks are required. Deletion and force pushes are blocked; merges use squash
  commits and preserve a linear history.
- Required checks are the Linux and Windows Lab 1 jobs, dependency audit,
  Dependency Review, and both CodeQL analysis jobs. Their source is restricted
  to GitHub Actions. CodeQL results also block high/critical security findings
  and error-level code scanning findings.
- Required human approvals remain zero for this single-maintainer learning
  repository: an author cannot approve their own PR. CODEOWNERS still identifies
  the maintainer; PR checks and conversation resolution remain mandatory.

## Hosted verification

The initial published snapshot contains the same 52 maintained files as the
locally verified snapshot; a Git tree comparison found no content differences.
The bootstrap used the authenticated GitHub web editor because the connector
returned a write-permission error and no local Git credential was configured.
Neither runtime secrets nor ignored build output were published.

- [CI on the initial complete snapshot](https://github.com/1rrsinn/oauth2-playground/actions/runs/39837313756):
  successful Linux/Windows checks and npm dependency audit.
- [CodeQL on the initial complete snapshot](https://github.com/1rrsinn/oauth2-playground/actions/runs/39837313791):
  successful JavaScript/TypeScript and Actions analysis.
- PR-only Dependency Review is verified on the setup-documentation PR before
  that PR merges. Initial Dependabot proposals are left for separate review;
  this setup does not approve or merge dependency upgrades.

Repository policies complement code review and local protocol tests. A successful
scan does not prove absence of vulnerabilities. Supported-pattern push protection
does not detect every possible secret, including arbitrary custom lab secrets.

## Sources

- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [CodeQL code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
- [Repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Dependabot configuration](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)
