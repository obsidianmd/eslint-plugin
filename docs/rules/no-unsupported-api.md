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

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
