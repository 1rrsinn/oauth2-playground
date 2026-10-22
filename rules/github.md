# GitHub Workflow Conventions

The repository is public. Treat pull request content and dependency installation
as untrusted code. Use disposable GitHub-hosted runners and no repository secrets
for lab checks. Do not run pull request code through `pull_request_target` or a
privileged `workflow_run` follow-up.

- Pin external Actions to full 40-character commit SHAs and identify the release
  in a comment. Resolve annotated tags to commits in the upstream repository.
  Update SHA and release comment together; let Dependabot propose normal updates.
- Keep the repository Actions allowlist consistent with workflow dependencies.
  Expanding the allowlist requires a concrete need; do not enable all Actions
  merely to fix a failed workflow.
- Default to `contents: read`; add only the permissions needed by a specific job.
  Disable checkout credential persistence. Do not enable bot PR approval or
  automatic merging as a substitute for successful checks.
- Use existing lab lockfiles and actual check commands. Prefer `npm ci
  --ignore-scripts`; document any dependency that genuinely needs lifecycle
  scripts. Keep required checks running for every PR instead of filtering them
  away by changed paths.
- Apply job timeouts and cancel superseded runs. Do not upload working directories,
  `.local/`, private keys, tokens, or raw HTTP traces as artifacts.
- Keep repository settings and observed hosted results in `docs/github-security.md`.
  Distinguish prepared workflow files from enabled settings and successful runs.

These rules do not authorize unrelated publication, credentials, releases,
deployment, or changes to external identity-provider tenants.
