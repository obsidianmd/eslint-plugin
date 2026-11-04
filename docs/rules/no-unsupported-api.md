# obsidianmd/no-unsupported-api

📝 Disallow usage of Obsidian APIs not available in the plugin's minimum app version.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

## What is reported

Using an Obsidian API that is newer than the oldest app version the plugin supports, its
`minAppVersion` from `manifest.json` or the `minAppVersion` option below. When each API arrived is
read from the `@since` tags in your project's own `obsidian.d.ts`; see [Requirements](#requirements).
The uses checked are:

- reading a property or calling a method, such as `this.app.renderContext`
- calling a function or creating an instance, such as `displayTooltip()` or `new SecretComponent(app, el)`
- extending a class, such as `class MySuggest extends AbstractInputSuggest`, also in a class
  expression such as `const MySuggest = class extends AbstractInputSuggest {}`, and calling methods
  inherited from it through `super`
- a newer method on an older class, such as `setDisabled()` on a `BaseComponent`, and Obsidian's
  additions to built-ins, such as `Array.prototype.findLastIndex`

A use is allowed where a `requireApiVersion()` check proves the app is new enough, as described below.
There is no fix: either guard the call, or raise `minAppVersion` if the plugin needs the API anyway.

Not reported: members of the settings-definition types (`SettingDefinitionItem`, `SettingDefinitionGroup`,
`SettingDefinitionControl`, the `Setting*Control` types and the rest reachable from what
`getSettingDefinitions()` returns). Those objects are the plugin's own data, so reading `item.items` or
`definition.control.key`, for instance to render the definitions on an older Obsidian, works on every
version. The settings classes, such as `SettingPage` and `SettingGroup`, are still reported: they are
runtime exports, and extending one on an older Obsidian fails when the plugin loads.

The rule needs type information, so the recommended config runs it on TypeScript files only. It does
not apply the rule to [test files](../configuration.md#test-files), which never run in an older
Obsidian.

## Guarding with `requireApiVersion`

An API newer than `minAppVersion` is allowed where a `requireApiVersion(...)` check proves the
running app is new enough. That holds:

- inside the `if` branch or ternary branch it guards, or to the right of `&&`;
- after an early exit on a failed check, for the rest of the block. The exit must be a `return`,
  `throw`, `break` or `continue` that always runs, directly or at the top of a `{ ... }` block;
- in the `else` branch or ternary alternate of a negated check, or to the right of `||` after one;
- wherever a `const` holding the check's result is used the same way;
- when several checks are combined: `a && b` proves the higher version, and `a || b` the lower.

```ts
import { requireApiVersion } from "obsidian";

function renderPreview() {
    if (!requireApiVersion("1.10.0")) {
        return;
    }
    this.app.renderContext;
}

const SUPPORTS_RENDER_CONTEXT = requireApiVersion("1.10.0");

if (SUPPORTS_RENDER_CONTEXT) {
    this.app.renderContext;
}
```

The version can be a string literal, or any expression whose type is a string literal: a `const`
declared in the same file or imported from another module, a member of an `as const` object, an
enum member, or a template literal built from such constants. When its type is a choice between
versions, such as `late ? "1.10.0" : "1.11.0"`, only the lowest one is proven.

Anything else still reports the API: a `let` variable or `string`-typed value, a version that is
not a full `x.y.z`, an exit that only runs inside a nested `if` or loop, `requireApiVersion(v) ||
api` (which reaches `api` when the check fails), and a function declaration after an early exit,
because a declaration is hoisted and can be called before the check.

A `minAppVersion` without a patch version, such as `0.15`, is read as `0.15.0`. One with no version
in it at all proves nothing about the app, so every versioned API is reported. With no
`minAppVersion` at all, neither in the option nor in the `manifest.json` of the directory ESLint runs
from, the rule reports nothing.

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

### Cache

Reading the `@since` tags means parsing all of `obsidian.d.ts`, so the rule caches the result in
`.cache/eslint-plugin-obsidianmd/since-map.json` in the `node_modules` directory that holds
`obsidian`, normally `node_modules/.cache/eslint-plugin-obsidianmd/since-map.json`. The cache records
the `obsidian` version it was built from and the version of this plugin that built it, and the rule
rebuilds it when either differs, so upgrading `obsidian` or this plugin refreshes it; deleting the
file forces a rebuild. Where the file
cannot be written, the rule parses the typings on every ESLint run instead.
