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
- a dynamic `import()` or a `require()` that `Platform.isDesktop` does not guard, including
  `require()` read from the global object: `window.require()`, `globalThis.require()`,
  `self.require()`, `global.require()` and `activeWindow.require()`, also through a type assertion
  or `!`, such as `(window as any).require("fs")`. On desktop, Electron puts Node's `require()` on
  the window, so these load the module just as a bare `require()` does.

A dynamic `import()` or `require()` counts as guarded inside `if (Platform.isDesktop)` (or
`if (Platform.isDesktop && …)`), in the first branch of `Platform.isDesktop ? … : …`, to the right of
`Platform.isDesktop && …`, and anywhere in a function whose first statement is
`if (!Platform.isDesktop) return;` or `throw`, without an `else`:

```ts
if (Platform.isDesktop) {
  const { readFile } = await import("node:fs/promises");
}
```

Not reported: modules that are not built into Node.js, such as `window.require("electron")`; a
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

The recommended config does not apply this rule to [test files](../configuration.md#test-files),
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
