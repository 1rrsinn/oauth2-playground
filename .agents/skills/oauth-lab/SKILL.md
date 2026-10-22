---
name: oauth-lab
description: "Plan or build a bounded OAuth2, OIDC, SSO, or SAML learning experiment with visible flows and relevant failure cases."
---

# OAuth Lab

Apply the task-specific context routing in [AGENTS.md](../../../AGENTS.md).
It also selects the relevant web security and TypeScript rules.
Use the [lab template](../../../docs/lab-template.md) for a new experiment.

1. Establish the learning question, learning mode, and authorized scope from the
   request and existing state. Do not treat proposed technologies as approved.
2. Briefly describe roles, affected files, dependencies, intentional
   simplifications, and observable success criteria. A small request does not
   require a separate plan. A planning request remains planning.
3. For an implementation request, build the smallest independently runnable
   experiment. Make protocol steps visible in code and HTTP messages.
   Share infrastructure between labs only when its concrete benefit is established.
4. Verify success and relevant rejections at the responsible components.
   For browser flows, also establish relevant redirects and session transitions;
   unit tests alone do not fully demonstrate that flow.
5. Document startup commands, experiments, sources, and evidence alongside the lab.
   Update `docs/project-state.md` when a decision or implementation status changes.

Report only observed results as verified. Remaining learning steps do not
automatically extend the authorized scope of the current lab.
Already requested local implementation needs no additional confirmation round.
