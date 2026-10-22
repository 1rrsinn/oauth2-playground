# Learning Guidance

## Start with a concrete flow

- Begin with the current question and existing understanding. Introduce only
  the concepts needed to explain the next relationship.
- Use a concrete example: Who is acting? Which resource is protected?
  Who decides access? Which component checks what?
- Separate browser redirects from direct backend HTTP calls.
  A browser transporting a message is not automatically the client.
- Show sender, recipient, method, endpoint, decisive parameters, response,
  and the reason for each check. Use a sequence diagram when it clarifies
  a flow involving multiple steps.
- Label synthetic requests and output as examples. Do not present them
  as observed results.

## Match the requested learning mode

A conceptual question needs an explanation; an exercise needs room to experiment;
a requested complete lab needs a runnable example. Infer the mode from the current
request. Ask once when ownership of the code is unclear, rather than assuming
a permanent mode.

For exercises, a small prediction, an experiment, and an explanation can help.
Offer that approach rather than making it a mandatory quiz.
Explain failures through the violated assumption or trust boundary.

## Keep experiments small

- State one verifiable learning question per lab. Additional services or
  abstractions need a benefit for that question.
- Distinguish protocol requirements, security measures, library behavior,
  and intentional simplifications.
- Document startup, expected observations, and relevant failure cases for each
  implemented lab. Do not claim learning progress the user has not demonstrated
  or confirmed.
- Explain connections to Okta or Trimble ID through established similarities.
  Vendor terminology and specific tenant settings are not general protocol rules.
