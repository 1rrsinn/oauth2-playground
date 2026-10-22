# Protocol Work

## Concepts and trust boundaries

Distinguish OAuth2 authorization, OIDC authentication, SAML messages, and SSO as
a user experience. A client can run on a server. Access tokens, ID tokens,
refresh tokens, and session cookies have different recipients and purposes;
map them in the concrete flow. An access token does not have to be a JWT.

For a lab or review, first identify roles, flow, client type, participating
origins, trust relationships, and the protected resource.
A successful login alone does not prove correctly authorized API access.

The [web security rules](web-security.md) also apply to HTTP, sessions, and
application protection. Derive protocol requirements from the relevant standards;
OWASP Cheat Sheets provide implementation guidance. Name the source and flow
when making detailed claims.

## Check what applies to the flow

Select the relevant items; not every lab needs every protocol feature:

- **Client Credentials:** A confidential client, suitable client authentication,
  allowed scopes and resources; no delegated user login.
  The authorization server limits granted scope to the client's registered
  permissions. By default, do not issue a refresh token here
  (RFC 6749, section 4.4.3).
- **Authorization Code:** Registered redirect URIs and their validation,
  binding and single use of the code, PKCE with `S256`, CSRF protection,
  and clear association with client, transaction, and authorization server.
  Compare redirect URIs exactly as required by the client profile; do not use
  wildcard or prefix allowances. Prevent open redirects.
  Handle the standardized variable loopback-port exception specifically
  when building a native-app lab that requires it.
  For normal labs, use random, transaction-bound `state` in addition to PKCE
  and validate it at the callback. Explicitly document alternative,
  standards-compliant CSRF mechanisms. Keep PKCE verifiers confidential
  until the exchange.
- **Token use:** Validate at the intended recipient. Decoding a JWT verifies
  neither its signature nor claims. For JWTs, check allowed algorithms and keys,
  issuer, audience, and time conditions; for opaque tokens, use the intended
  server-side validation path. Enforce scopes and domain permissions at the API.
- **OIDC:** Validate ID tokens for the chosen flow and client, including signature,
  issuer, audience, time conditions, and nonce where applicable.
  An ID token does not replace an access token for the API.
- **Refresh tokens:** Handle client and grant binding, expiry, revocation, and
  replay protection according to client type and security profile.
  Public clients require sender constraints or rotation with replay detection.
  Explain the chosen measure and test reuse.
- **SSO:** Treat the identity-provider session and local application sessions
  separately. Local logout does not necessarily end other sessions.
- **SAML:** Trusted metadata and keys, signature verification of the element
  actually used, issuer, audience, destination/recipient, time conditions,
  request correlation where applicable, and replay protection.
  Use suitable libraries for XML processing and signature verification.

Authorization Code with PKCE is the project default for new user flows.
Implicit Grant and Resource Owner Password Credentials are not normal
implementation options; Client Credentials remains intended for a client's
access on its own behalf.

Use current security recommendations for normal labs. Historical or deliberately
vulnerable flows require an explicit learning request, local containment, and
a visible explanation of the deviation. Do not implement custom cryptography.
Explicitly document local HTTP simplifications; do not turn them into guidance
for external or production connections.

## HTTP contract

Use the methods, content types, and error formats of the endpoint.
Standard token requests from RFC 6749 are form-encoded; a JSON API is not
an automatic substitute. Token responses containing credentials receive
`Cache-Control: no-store` and `Pragma: no-cache` (section 5.1).

Bearer APIs receive tokens in the `Authorization: Bearer` header, not URLs.
Implement the applicable `WWW-Authenticate` challenge for authentication failures
under RFC 6750, section 3; distinguish `invalid_token` from `insufficient_scope`.
Test these HTTP properties alongside response bodies as appropriate for the lab.

## Evidence and sources

Test successful behavior and relevant rejections, such as incorrect scope,
expired tokens, incorrect audience, or invalid PKCE binding. For browser flows,
also verify redirects and session behavior in a browser. Use redacted traces;
keep real credentials and reusable tokens out of reports.

Read the primary-source sections relevant to the task. Older base RFCs alone
do not capture current security practice:

- [OAuth2, RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html)
- [Bearer Tokens, RFC 6750](https://www.rfc-editor.org/rfc/rfc6750.html)
- [OAuth2 Security BCP, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
- [PKCE, RFC 7636](https://www.rfc-editor.org/rfc/rfc7636.html)
- [JWT Security BCP, RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html)
- [OWASP OAuth2 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [SAML Core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
  and [SAML Profiles](https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf)

Verify vendor- and version-dependent claims against the relevant official
documentation. A simplified learning implementation does not establish
standards compliance or production readiness.
