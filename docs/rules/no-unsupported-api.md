# obsidianmd/no-unsupported-api

📝 Disallow usage of Obsidian APIs not available in the plugin's minimum app version.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Guarding with `requireApiVersion`

An API newer than `minAppVersion` is allowed where a `requireApiVersion(...)` check proves the
running app is new enough: inside the `if` or ternary branch it guards, or to the right of `&&`.
The version can be a string literal, or any expression whose type is a single string literal: a
`const` declared in the same file or imported from another module, a member of an `as const` object,
an enum member, or a template literal built from such constants:

```ts
import { requireApiVersion } from "obsidian";

const RENDER_CONTEXT_VERSION = "1.10.0";

if (requireApiVersion(RENDER_CONTEXT_VERSION)) {
    this.app.renderContext;
}
```

A `let` variable, a `string`-typed value, a choice between versions such as `late ? "1.10.0" :
"1.0.0"`, or a version that is not a full `x.y.z` does not count as a guard, so the API is still
reported.

A `minAppVersion` without a patch version, such as `0.15`, is read as `0.15.0`. One with no version
in it at all proves nothing about the app, so every versioned API is reported.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->

## Requirements

This rule determines when each API was introduced by reading the `@since` JSDoc
tags in **your project's own** `obsidian.d.ts`. It does not bundle a copy of the
Obsidian typings.

For the rule to report anything, both of the following must hold:

1. `obsidian` is installed in your project (normally as a `devDependency`), and
2. `obsidian.d.ts` is part of the TypeScript program ESLint is type-checking —
   that is, the file is reachable from the `tsconfig.json` used by
   `parserOptions.projectService` / `parserOptions.project`.

If `obsidian.d.ts` is not found in the program, the rule silently does nothing.
It does not error, so a passing lint run is **not** by itself evidence that your
plugin is free of unsupported-API usage.

### Obsidian version affects coverage

`@since` annotations were added retroactively, so older typings yield an almost
empty map and the rule will under-report:

| `obsidian` version | `@since` annotations |
| :----------------- | -------------------: |
| 1.6.6              |                    0 |
| 1.8.7              |                    2 |
| 1.10.0             |                  644 |
| 1.13.1             |                  857 |

Use **`obsidian` 1.10.0 or later** for meaningful results. This is independent of
your plugin's `minAppVersion`: the typings supply the "when was this added" data,
while `minAppVersion` from `manifest.json` is the floor being checked against, so
keeping the typings current does not raise the minimum app version you support.
