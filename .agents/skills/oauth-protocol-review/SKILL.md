---
name: oauth-protocol-review
description: "Review or diagnose OAuth2, OIDC, and SAML flows using code, configuration, and redacted HTTP traces."
---

# OAuth Protocol Review

Apply the task-specific context routing in [AGENTS.md](../../../AGENTS.md)
and use the affected lab's context. This review reports findings and does not
fix maintained project files without a corresponding change request.
Authorized local checks may create ephemeral output under `.tmp/`; this does
not authorize installations or tenant changes.

1. Reconstruct the actual flow: roles, client type, message paths, trust boundaries,
   token recipients, and responsible validation points.
2. Check the rules relevant to this flow against code or effective configuration.
   Account for library validation and documented simplifications before reporting
   a missing manual check as a defect.
3. Support a suspected issue with a local reproduction or an existing redacted
   trace where possible. A successful login or decoded JWT proves neither
   correct token validation nor API authorization.
4. Classify findings as demonstrated defects, explained lab simplifications,
   or open questions. Describe the trigger, responsible file/line, impact,
   and smallest useful correction. Prioritize actual impact.
5. State the checked scope and gaps. If no defects are established, say so
   without claiming general security or standards compliance.

Use suitable primary sources for normative claims and official vendor
documentation for version-dependent behavior. A local review request does not
authorize experiments against workplace tenants or third-party systems.
