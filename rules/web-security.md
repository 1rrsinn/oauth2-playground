# Web Security for Labs

These rules extend [rules/protocols.md](protocols.md) with HTTP, browser, and
application protection. Select measures appropriate to the concrete lab.
Do not expand a small experiment into a complete security system without a request.

## APIs, input, and output

- Protect every nonpublic API endpoint on the server. Access requires suitable
  permissions; beyond scope checks, enforce access to the actual object,
  such as another user's note.
- Validate method, content type, structure, values, and suitable size limits
  at input boundaries. Do not pass protocol parameters unchecked into database
  queries, shells, file paths, or dynamic object keys.
- Render displayed data as text or use correct context-specific escaping.
  Callback parameters and error messages must not generate unchecked HTML
  or executable code.
- CORS permits certain browser access; it does not replace authorization.
  Configure only the origins actually needed. Do not reflect arbitrary origins
  or use wildcards with credentialed access.
- Use endpoint-appropriate error responses: protected Bearer APIs normally use
  `401` for missing/invalid authentication and `403` for insufficient permission.
  Token endpoints follow their own OAuth error rules.

References: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
[REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html),
and [JavaScript/TypeScript Security](https://cheatsheetseries.owasp.org/cheatsheets/JavaScript_and_TypeScript_Security_Cheat_Sheet.html).

## Browsers, sessions, and token storage

- Choose storage according to client type. Backend web clients keep tokens in
  the backend; the browser receives a session ID. Browser clients need their own
  justified storage strategy. Long-term token storage in `localStorage` is not
  an automatic default.
- Over HTTPS, session cookies use `Secure`, `HttpOnly`, and an explicit
  `SameSite` setting appropriate to the flow. Check actual callback methods:
  cross-site GET and POST behave differently. `SameSite=None` requires `Secure`.
  Document local HTTP deviations.
- Prevent session fixation by changing the session on successful authentication.
  Handle expiry and logout explicitly. Do not present application logout as
  evidence that the IdP session or every token has ended.
- Protect state-changing, cookie-authenticated application actions against CSRF.
  `HttpOnly`, CORS, or OAuth PKCE alone do not protect these actions.
  `SameSite` is an additional layer with its own limits.
- Client secrets belong exclusively in confidential clients. A secret shipped
  in browser code remains public even through a build environment variable.

References: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
and [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Configuration, transport, and evidence

- Bind local labs to loopback by default. An HTTP simplification applies only
  to the documented local experiment. External connections carrying tokens or
  credentials require HTTPS and correct certificate validation.
- Select issuer and discovery/JWKS sources from trusted configuration.
  Do not load key or endpoint URLs unchecked from an incoming token or user
  parameter. Apply time limits to required outgoing requests.
- Redact `Authorization`, `Cookie`, `Set-Cookie`, passwords, authorization
  codes, PKCE verifiers, and tokens from logs and shared traces. Show flows through
  events and correlation IDs; examples may contain clearly synthetic values.
  Keep internal error details out of HTTP responses.
- Apply appropriate abuse limits to login/token endpoints and test them locally.
  A learning lab does not need an external monitoring or rate-limit platform.
- Derive relevant negative cases from these rules: another user's object,
  incorrect scope, invalid input, or a missing CSRF check.
  Report only executed checks as passing. A source list is not security evidence.

References: [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html),
[REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html),
and [OAuth2 Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html).
