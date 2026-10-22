# TypeScript Conventions

These conventions apply when TypeScript code or tooling is requested.
They select neither other labs' stacks nor a framework.
Direct, understandable code takes priority over a general framework for every lab.

## Style basis and source precedence

Use the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
as an orientation. Its rules come from Google's environment; this project adopts
the explicit selection below. Other Google rules do not automatically become
additional project requirements.

Microsoft's [TypeScript Coding Guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
target contributions to the TypeScript compiler, not general application code.
Their different formatting rules are not adopted here.
Use the TypeScript Handbook and TSConfig documentation for language and
compiler behavior.

| Area | Project convention for TypeScript code |
| --- | --- |
| Formatting | Two spaces, semicolons, single quotes; template strings for interpolation. JSON and TOML retain their own syntax. |
| Names | `PascalCase` for types/classes, `camelCase` for values/functions; no `I` prefix for interfaces. |
| Modules | ES imports/exports, preferably named exports; default exports for concrete framework requirements. |
| Type models | `interface` for authored object contracts; `type` for unions, aliases, and schema-derived types. |
| Control flow | Braces around conditions and loops; readable functions and simple type constructs. |

Formatting choices and exceptions are project decisions. A lab's formatter
implements them; update its configuration when these rules change.
Google-internal build tools and Microsoft compiler helpers are not prerequisites.

## Compiler and module configuration

Use this baseline in each new TypeScript lab's actual compiler configuration.
Adapt runtime, module resolution, and output target to the selected
Node/browser and TypeScript versions:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

This snippet is a template, not an executable configuration by itself.
Check new options and module decisions against the actual compiler/runtime
version. Do not disable checks broadly to make unexplained errors disappear.

## Types and trust boundaries

- Treat external data as `unknown` initially: request bodies, queries,
  environment variables, token responses, and file contents. Validate shape
  and values at the runtime boundary before using them internally.
- `as TokenResponse`, `any`, and non-null assertions do not validate input.
  Use narrowing and focused validation; explain unavoidable exceptions locally.
  With schema validation, derive internal types from the schema rather than
  maintaining two diverging data models.
- A correctly shaped token response proves neither a valid signature nor
  authorization. Protocol checks are still required.
- Name contracts at module boundaries and important return values explicitly;
  infer obvious local values. Avoid redundant type annotations.
- Model meaningful alternatives through clear states or discriminated unions.
  Make time units explicit, such as `expiresInSeconds` and `expiresAtMs`,
  so protocol seconds are not confused with milliseconds.

## Readability, asynchronous code, and tools

- Prefer `const`; use `let` for actual reassignment. Keep functions small
  and responsibilities visible. Do not hide the protocol being learned behind
  generic helpers or unnecessary inheritance.
- Await asynchronous operations or return their promises. Handle expected errors
  where the decision is made and propagate unexpected failures to a defined error
  boundary. `await` propagates rejection; HTTP boundaries need controlled error
  responses. Intentional background operations need error handlers.
  Empty `catch` blocks hide failures. Set suitable HTTP time limits.
- Separate expected protocol errors from internal failures. Do not expose secrets
  or internal stack traces to HTTP clients; follow the web security rules.
- Use existing formatting and lint configuration. Set up real typechecks and,
  where useful, linting in new labs before reporting them as checks.
  Also verify actual behavior.
- Keep dependencies modest and preserve the package manager's lockfile.
  Do not run unsolicited wholesale upgrades or automatic audit fixes.

## Sources and interpretation

The selected options and conventions are project decisions.
Official documentation describes their behavior:

- [TypeScript: strict](https://www.typescriptlang.org/tsconfig/strict.html)
- [TypeScript: noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [TypeScript: exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
- [TypeScript: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [OWASP: JavaScript and TypeScript Security](https://cheatsheetseries.owasp.org/cheatsheets/JavaScript_and_TypeScript_Security_Cheat_Sheet.html)

Typechecks improve authored code. Runtime data and permissions require
their own checks; see [protocols](protocols.md) and [web security](web-security.md).
