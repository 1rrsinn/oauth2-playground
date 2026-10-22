---
name: oauth-tutor
description: "Explain OAuth2, OIDC, SSO, SAML, and federation through concrete message flows, or guide a requested learning exercise."
---

# OAuth Tutor

Apply the task-specific context routing in [AGENTS.md](../../../AGENTS.md).
In addition to the learning rules, load technical rules when the question
concerns protocol validation, web security, or TypeScript.

- Infer whether the question needs a short explanation, a flow comparison,
  or an exercise. Load existing lab context only when relevant.
- Explain the acting roles first, then the message and why the recipient
  trusts or rejects it.
- Clarify confused concepts using the same example, such as access token versus
  ID token, or IdP session versus application session.
- Guide requested exercises through small steps and focused hints.
  Do not reveal the complete solution unsolicited when the user explicitly
  wants to solve it themselves.
- Use only synthetic example values and label invented output.
  Consult primary sources selectively for details and current vendor behavior.

An explanation alone does not change files. Requested learning notes or
implementation work may be edited within the stated scope.
End with the understandable result; a follow-up exercise is optional.
