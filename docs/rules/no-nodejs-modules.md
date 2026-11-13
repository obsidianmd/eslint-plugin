# obsidianmd/no-nodejs-modules

📝 Disallow importing Node.js built-in modules unless guarded by Platform.isDesktop.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Unless the code is desktop-only (see `isDesktopOnly` below), a Node.js built-in module, with or
without the `node:` prefix and including subpaths such as `fs/promises`, loaded through:

- a static `import`, including a side-effect `import "fs"` and TypeScript's
  `import fs = require("fs")`, or a re-export (`export … from "fs"`), since these load the module
  wherever the file runs and cannot be guarded;
- a dynamic `import()` or a `require()` that a platform check does not guard, including
  `require()` read from the global object: `window.require()`, `globalThis.require()`,
  `self.require()`, `global.require()` and `activeWindow.require()`, also through a type assertion
  or `!`, such as `(window as any).require("fs")`. On desktop, Electron puts Node's `require()` on
  the window, so these load the module just as a bare `require()` does.

A platform check is one that is true only in the desktop app, where Node.js is available:
`Platform.isDesktop`, `Platform.isDesktopApp`, `!Platform.isMobile` or `!Platform.isMobileApp`.
A dynamic `import()` or `require()` counts as guarded where such a check holds: inside
`if (Platform.isDesktopApp)` (or `if (Platform.isDesktopApp && …)`), in the first branch of
`Platform.isDesktopApp ? … : …`, and to the right of `Platform.isDesktopApp && …`. The negation
works the other way: in the `else` of `if (Platform.isMobile)` or `if (!Platform.isDesktop)`, in the
second branch of `Platform.isMobileApp ? … : …`, and to the right of `Platform.isMobile || …`. It
also counts as guarded after an early exit in the same block or an enclosing one, at any position
before it: an `if` without an `else` whose test is such a negated check, also on one side of `||`,
and whose branch is a `return` or `throw` or reaches one. The statements of a `switch` case count as
a block: an early exit guards the rest of its own case, but not the cases after it, which `switch`
can enter directly:

```ts
if (Platform.isDesktopApp) {
  const { readFile } = await import("node:fs/promises");
}

const cpus = Platform.isMobileApp ? 1 : require("os").cpus().length;

function startServer() {
  if (Platform.isMobile || !settings.enabled) return;
  const http = require("http");
}
```

An early exit does not guard the function's default parameter values, also those inside a
destructuring pattern, as in `function load(fs = require("fs")) { … }`: they are evaluated before the
body runs. Nor does it guard a function declaration after it unless it is the block's first statement,
since the declaration is hoisted and the statements before the early exit can call it.
`Platform["isDesktop"]` is the same check as `Platform.isDesktop`, but `Platform[key]` is not.

Also guarded, since they cannot fail on mobile:

- a `require()` inside the block of a `try` that has a `catch`, outside any function defined in that
  block, and an `import()` there that is awaited, as in `try { fs = await import("fs"); } catch { … }`:
  where Node.js is missing, the `catch` runs. An `import()` that is not awaited rejects after the
  `try` has finished, so it is still reported, and so is one in a `try` whose `catch` always throws,
  as in `catch (e) { throw e; }` or `catch (e) { console.error(e); throw new Error(…); }`, which
  hands the failure on. A `catch` that may return, `break` or `continue` before it throws, as in
  `if (!strict) return null; throw e;`, still guards;
- an optional call on the global object, `window.require?.("fs")`, which calls `require()` only
  where the global object has it, as only the desktop app does. A bare `require?.("fs")` is still
  reported: the bundle's own `require` exists on mobile too, and throws there for a Node.js module.

Not reported: imports in a declaration file (`.d.ts`, `.d.mts`, `.d.cts`), which only describe
types and never run; modules that are not built into Node.js, such as `window.require("electron")`; a
dynamic `import()` or `require()` whose module name is not a string literal; `require()` on any
other object, such as Electron's `remote.require()` or a library's module loader, and on a local
variable or parameter named `window`; and imports and re-exports that TypeScript erases when
compiling, so they never load the module:

```ts
import type { Stats } from "node:fs";
import { type Dirent, type ReadStream } from "node:fs"; // every specifier is `type`
export type { WriteStream } from "node:fs";
import type fs = require("node:fs");
```

With `verbatimModuleSyntax`, TypeScript keeps an import or re-export whose specifiers are all
inline `type` ones as `import {} from "node:fs"`, which still loads the module, so when the file is
linted with type information from such a project those are reported; write `import type` instead.

The recommended config does not apply this rule to [test files and tool configs](../configuration.md#test-files),
which run in Node.js.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                                                                                                                                                                                                                                 | Type    |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| `isDesktopOnly` | Whether the code being linted only ever runs on desktop, which makes Node.js APIs available. Defaults to the isDesktopOnly value of a manifest.json in the working directory, so a repo with no manifest -- a library, tooling, a standalone CLI -- can say so without shipping a fake one. | Boolean |

<!-- end auto-generated rule options list -->

`isDesktopOnly` defaults to the `isDesktopOnly` value of a `manifest.json` in the
working directory. A repo that is not a plugin — a library, tooling, a
standalone CLI in the same repo — has no manifest to carry that flag, and used to
need a fake one purely to keep this rule quiet. Set the option instead, scoped to
the files that only run on desktop, so plugin code in the same repo is still
checked:

```js
{
    files: ["cli/**"],
    rules: {
        "obsidianmd/no-nodejs-modules": ["warn", { isDesktopOnly: true }],
    },
}
```

Only a literal `true` in that manifest counts. The file belongs to the repo
being linted, so its `isDesktopOnly` is whatever JSON it holds: a non-boolean
value -- `"false"`, `1`, `[]` -- is read as *not* desktop-only and the rule
keeps reporting, rather than being turned off by a malformed field.

Because the rule reads the manifest itself, a desktop-only plugin cannot turn
the check back on by raising its severity: setting
`"obsidianmd/no-nodejs-modules": "error"` still reports nothing there. Set the
option, which takes precedence over the manifest:

```js
{
    rules: {
        "obsidianmd/no-nodejs-modules": ["error", { isDesktopOnly: false }],
    },
}
```

This rule is listed in `eslint-comments/no-restricted-disable`, so a disable
comment is not an available escape.
