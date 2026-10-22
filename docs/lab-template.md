# Learning Experiment Template

Use and adapt this template as the `README.md` of a requested lab.
The template itself is not a complete lab.

## Learning question and scope

Which single question does the experiment answer? What should the user
observe or try? Which learning mode applies to this request?
Which components are necessary, and which related topics belong to later labs?

## Roles and flow

Map applications to protocol roles. Record origins, ports, flow, client type,
protected resources, and trust relationships.
Show decisive messages through a sequence diagram or HTTP examples;
distinguish browser redirects from direct backend calls.

## Startup and reset

Document prerequisites, configuration with synthetic credentials,
startup order, actual available commands, and local reset.
Explain how to start the experiment independently of other labs.

## Experiments and expected observations

Describe successful behavior and a few meaningful failure cases:
Which input changes, what is expected, which component checks it, and why?
Separate expected output from measured results.

## Explanation and simplifications

Connect the implementation to the learning question, protocol requirements,
and intentional simplifications, such as local HTTP or ephemeral storage.
Link relevant standards sections or official documentation.

Connect relevant protection measures to their source and an observable test case,
such as PKCE binding, object permissions, or session-cookie behavior.
For deviations, explain the reason and local containment.
Distinguish OWASP recommendations, protocol requirements, and project conventions.

## Verification and status

Record what is implemented, which commands or manual steps were checked,
and their results. Include relevant versions and remaining limitations.
Do not claim observed browser flows or learning progress without evidence.
