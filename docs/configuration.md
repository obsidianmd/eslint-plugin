# Configuration

## Quick start

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  // Build output and the sample plugin's Node build scripts are not plugin code.
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

The recommended config includes ESLint core rules, typescript-eslint, and all obsidianmd rules. You only need to provide the TypeScript parser options, as described below, and ignore what is not plugin source: the `globalIgnores` entry above matches the official sample plugin's layout (see [Ignoring files](#ignoring-files)).

The examples import `defineConfig` and `globalIgnores` from `eslint/config`, which needs ESLint 9.22 or
later. The [README](../README.md#installation) lists the plugin's requirements and what to write on an
older ESLint.

## Why you need `parserOptions`

The recommended config enables typescript-eslint's type-checked rules for `.ts`/`.tsx` files. These rules require access to TypeScript's type information, which means ESLint needs to know where your `tsconfig.json` is.

The plugin intentionally does not set `parserOptions` itself. Every project has a different TypeScript setup — monorepos, custom tsconfig paths, composite projects — and baking in assumptions would cause more problems than it solves. Instead, you provide a single config block that tells typescript-eslint how to find your project:

```js
{
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.*"],
      },
    },
  },
}
```

`projectService` automatically discovers the nearest `tsconfig.json` for each file. `allowDefaultProject` provides a fallback for files that are not included in any `tsconfig.json` — such as the ESLint config file itself. Without it, linting files like `eslint.config.mts` fails with a parsing error, *"… was not found by the project service"* (see [Common errors](#-was-not-found-by-the-project-service)).

See the [typescript-eslint docs on typed linting](https://typescript-eslint.io/getting-started/typed-linting) for alternatives and advanced options like `tsconfigRootDir`.

## What the recommended config includes

The recommended config is an array of flat config objects that sets up:

- **ESLint core**: the recommended rules of the ESLint you have installed (`js.configs.recommended` for that version), for `.js`/`.ts` files and their variants only
- **typescript-eslint** (`recommendedTypeChecked` for `.ts`/`.tsx`, `recommended` for `.js`/`.jsx`)
- **obsidianmd rules** at their default severities, except `ui/sentence-case`, which is off, and the two locale rules, which `recommendedWithLocalesEn` adds
- **Third-party plugins**: `@microsoft/eslint-plugin-sdl`, `eslint-plugin-import`, `eslint-plugin-no-unsanitized`, `eslint-plugin-depend`, `@eslint-community/eslint-plugin-eslint-comments`
- **Obsidian globals** (`activeDocument`, `activeWindow`, `createEl`, etc.)
- **`package.json` linting** via `eslint-plugin-depend` (ban common micro-utilities)
- **`manifest.json` linting** via `validate-manifest`, parsed with `@eslint/json`
- **`LICENSE` linting** via `validate-license`, read with the plugin's `obsidianmd/plain-text` language

`recommendedWithLocalesEn` adds English locale files on top: `en.json`-style JSON read with the
`json/json` language and checked by `ui/sentence-case-json`, and `en.ts`-style modules checked by
`ui/sentence-case-locale-module`.

Because of this, you do **not** need to separately add `eslint.configs.recommended` or `tseslint.configs.recommended` — they are already included.

### Files linted beyond your source

The recommended config lints more than `.ts` and `.js`. It matches `package.json`, `manifest.json`
and `LICENSE` by name, each read with its own language, so **ESLint has to be pointed at the project
root for those checks to run at all**. A lint script scoped to your sources — `eslint src` — will
never visit them, and the rules covering them silently do nothing:

```jsonc
// package.json
"scripts": {
  "lint": "eslint .",       // package.json, manifest.json and LICENSE are checked
  "lint:src": "eslint src"  // they are not
}
```

`LICENSE` is matched exactly, case included, alongside `LICENSE.md` and `LICENSE.txt`, and only
next to your `eslint.config.mjs`. ESLint matches `files` by case on every system, so `License` and
`Manifest.json` are not linted, also on Windows and macOS. In a monorepo, `packages/foo/LICENSE` is
not linted. A licence file under any other name or path is not linted; point `validate-license` at
it with your own `files` entry — `["COPYING"]`, or `["packages/*/LICENSE"]` for a monorepo — using
the language the plugin contributes:

```js
{
  files: ["COPYING"],
  language: "obsidianmd/plain-text",
  rules: {
    "obsidianmd/validate-license": "warn",
  },
}
```

`plain-text` is a **language**, not a parser, and that distinction matters for more than tidiness.
`languageOptions.parser` is merged by key, so a config object that sets a parser **without
restricting its `files`** replaces it for every file — including `LICENSE`, which would then reach
(say) the TypeScript parser and fail with *"was not found by the project service because the
extension for the file (``) is non-standard"*. A `language` is only replaced by another `language`,
so that cannot happen. The same reasoning is why `package.json` uses `language: "json/json"`.

None of these files get the ESLint core rules: those are scoped to `.js`/`.ts` files and their
variants. The same goes for any other JSON you lint with your own block, such as
`{ files: ["**/*.json"], plugins: { json }, language: "json/json" }`, with `json` imported from
`@eslint/json`; a core rule like `no-irregular-whitespace` cannot read a JSON file and would
otherwise abort the run. If you lint other JavaScript-like files with your own parser — `.svelte` or
`.vue`, say — add `js.configs.recommended` for them yourself.

## Using alongside stricter typescript-eslint configs

If you want stricter rules than what the recommended config provides (e.g., `strictTypeChecked`, `stylisticTypeChecked`), layer them after the recommended spread:

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // strictTypeChecked turns this back on; the recommended config runs
      // obsidianmd/no-misused-promises in its place.
      "@typescript-eslint/no-misused-promises": "off",
      // strictTypeChecked turns this back on too. It reports the
      // Platform.isDesktop-guarded require() that obsidianmd/no-nodejs-modules
      // asks for when code needs a Node.js module.
      "@typescript-eslint/no-require-imports": "off",
      // your overrides
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

The stricter configs merge on top of the plugin's defaults; where both set a rule, the later block wins.
That is why the example turns `@typescript-eslint/no-misused-promises` off again: `strictTypeChecked`
and `recommendedTypeChecked` switch it on, and next to
[`obsidianmd/no-misused-promises`](rules/no-misused-promises.md) it reports every real Promise a second
time and treats Obsidian's chaining `then` (on `Setting` and every component) as a Promise again.
Keep the block scoped to your TypeScript files: typescript-eslint's type-aware rules cannot run on
`package.json`, `manifest.json` or `LICENSE` (see
[Common errors](#-requires-type-information-on-license-manifestjson-or-packagejson)).

`@typescript-eslint/no-require-imports` is off again for the reason the recommended config turns it
off: [`no-nodejs-modules`](rules/no-nodejs-modules.md) asks for a dynamic `import()` or a `require()`
guarded by `Platform.isDesktop` where code needs a Node.js module, and that rule reports every
`require()`. `strictTypeChecked` also turns `@typescript-eslint/require-await`,
`@typescript-eslint/ban-ts-comment` and `prefer-const` back on, which the recommended config leaves
off. The example keeps them, since they contradict nothing this plugin asks for. `require-await`
does report a view's `async onOpen()` or `onClose()` that never awaits (Obsidian types both to return
a Promise); turn it off too if you keep those `async`.

## Overriding rules

Override any rule in a config block after the recommended spread:

```js
export default defineConfig([
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "obsidianmd/sample-names": "off",
      "obsidianmd/prefer-file-manager-trash-file": "error",
    },
  },
]);
```

Give rule overrides a `files` glob for your source. A block without `files` applies to every file
ESLint lints, including `package.json`, `manifest.json` and `LICENSE`. The recommended config
registers typescript-eslint for JS and TS files only, so a `@typescript-eslint/*` rule set without
`files` fails with `Could not find plugin "@typescript-eslint"`.

## Ignoring files

ESLint itself only ignores `node_modules/` and `.git/`. Your build output is linted unless you ignore it: the sample plugin bundles to `main.js` in the project root, and other setups write to `dist/` or `build/`. Node scripts such as the sample plugin's `esbuild.config.mjs` and `version-bump.mjs` are not plugin code either. Ignore them with a global ignores entry **before** the recommended spread:

```js
export default defineConfig([
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

If your plugin has no build step and you write `main.js` yourself, it is your source, so do not
ignore it. It is in no `tsconfig.json`, so add it to `allowDefaultProject`, and declare the
CommonJS `module` and `exports` Obsidian loads it with:

```js
export default defineConfig([
  globalIgnores(["node_modules", "dist"]), // no build step: main.js is your source
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*", "main.js"],
        },
      },
    },
  },
  // Obsidian loads main.js as CommonJS
  { files: ["main.js"], languageOptions: { globals: { module: "writable", exports: "writable" } } },
]);
```

Declaring the two globals is enough. With `sourceType: "commonjs"` instead, `no-redeclare` checks
the module's top level against the built-in globals, and `const { Plugin } = require("obsidian")`
is reported, because `Plugin` is also a browser global.

## Disabling rules for specific files

To turn off obsidianmd rules for files that are not part of your Obsidian plugin (e.g., build scripts), add a config block with the relevant `files` glob:

```js
export default defineConfig([
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
  {
    // Build scripts are not plugin code
    files: ["scripts/**"],
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/rule-custom-message": "off",
    },
  },
]);
```

ESLint does not support disabling all rules from a plugin with a single glob like `"obsidianmd/*": "off"`. You can set each rule to `"off"` individually, or use `ruleConfigs` to generate the overrides programmatically:

```js
{
  files: ["scripts/**"],
  rules: Object.fromEntries([
    ...Object.keys(obsidianmd.ruleConfigs.recommended),
    ...Object.keys(obsidianmd.ruleConfigs.recommendedTypeChecked),
  ].map(rule => [rule, "off"])),
}
```

### Code that only runs on desktop

`no-nodejs-modules` reports because Node APIs are unavailable on mobile. Where that does not apply —
code that never runs inside Obsidian at all, such as a standalone CLI — say so with the rule's
option, scoped with `files` to that code, so the plugin source beside it is still checked:

```js
{
  files: ["cli/**"],
  rules: {
    "obsidianmd/no-nodejs-modules": ["warn", { isDesktopOnly: true }],
  },
}
```

The option defaults to the `isDesktopOnly` value of a `manifest.json` in the working directory, so a
desktop-only plugin needs no configuration at all. It exists for the case where there is no manifest
to read it from — a library, tooling, or a standalone CLI in the same repo — which previously meant
adding a `manifest.json` that served no other purpose. Note that this rule is listed in
`eslint-comments/no-restricted-disable`, so a disable comment is not an available escape.

The option also overrides the manifest in the other direction. Because the rule reads
`isDesktopOnly` itself, a desktop-only plugin that wants the check anyway cannot get it by raising
the severity alone; `"obsidianmd/no-nodejs-modules": "error"` still reports nothing there. Use
`["error", { isDesktopOnly: false }]` instead.

### Web worker files

A web worker has no `window`: `window`, `activeWindow`, `activeDocument` and Obsidian's DOM helpers
do not exist there, and `globalThis` is the right way to reach the worker's own scope. The
recommended config therefore treats files matching `**/*.worker.*` and anything under a `workers/`
directory as worker code. It switches off the rules whose fix needs a window — `no-global-this`,
`prefer-active-doc`, `prefer-create-el`, `prefer-instanceof` and `prefer-window-timers` — and gives
these files the worker globals (`self`, `importScripts`, `postMessage`, …) in place of the browser
and Obsidian ones. In JavaScript, `no-undef` then reports `window`, `document`, `localStorage`,
`createEl` and the rest, which would throw in a worker; browser APIs a worker also has, such as
`fetch`, `structuredClone`, `OffscreenCanvas` and `requestAnimationFrame`, stay declared. (`no-undef`
is off for TypeScript, where the compiler reports undefined names.) Every other rule, including the
security rules, still applies.

For worker code under another name, add the same overrides for its path. In JavaScript, also declare
the worker globals from the `globals` package and switch off the window globals you want reported:

```js
// import globals from "globals";
{
  files: ["src/background/**"],
  languageOptions: {
    globals: { ...globals.worker, window: "off", document: "off" },
  },
  rules: {
    "obsidianmd/no-global-this": "off",
    "obsidianmd/prefer-active-doc": "off",
    "obsidianmd/prefer-create-el": "off",
    "obsidianmd/prefer-instanceof": "off",
    "obsidianmd/prefer-window-timers": "off",
  },
}
```

### Test files

Tests run in Node or a DOM emulation such as jsdom, not inside Obsidian, so the rules about code that
runs in Obsidian do not fit them: there is no popout window, Node.js modules are available, mocks cast
to `TFile`, fixtures name `.obsidian`, and the code never runs in an older Obsidian or on iOS. The
recommended config treats the files the community scanner leaves out as tests: files matching
`**/*.{test,tests,spec,specs}.*` or `**/testUtils*`, anything under a `test/`, `tests/`, `__tests__/`,
`mocks/`, `__mocks__/` or `testUtils*/` directory, and anything under a top-level `automation/` or
`test-vault/` directory. So are end-to-end tests, which drive Obsidian from Node: files matching
`**/*.e2e.*`, anything under an `e2e/` or `e2e-tests/` directory, and the WebdriverIO and Playwright
configs (`wdio.conf.*`, `wdio.*.conf.*` and `playwright.config.*`). For all of them it switches off `no-global-this`, `prefer-active-doc`,
`prefer-create-el`, `prefer-instanceof`, `prefer-window-timers`, `no-nodejs-modules`,
`no-tfile-tfolder-cast`, `hardcoded-config-path`, `no-unsupported-api` and `regex-lookbehind`. Every
other rule, including the security rules, still applies. The community scanner does not lint most of
these files at all; see its [ignored files](#community-plugin-scanner-configuration).

For tests under another name, such as an `integration-tests/` directory, add the same overrides for
its path, or leave the directory out with `globalIgnores`.

## Upgrading to 0.5.0

0.5.0 lints more files than 0.4 did and needs newer tooling. Work through the items below that
apply to your project; [CHANGELOG.md](../CHANGELOG.md) lists every change.

### Node.js 20.19, 22.13 or 24

Node.js 18 is no longer supported. `@eslint/json` 2 and ESLint 10 need the same versions. Upgrade
Node.js locally and in CI.

### `@eslint/json` 2

If your configuration registers `@eslint/json` itself for `package.json` or `manifest.json`,
upgrade it to 2.x. With 0.14, ESLint reports `Cannot redefine plugin "json"`, because the two
copies cannot share the `json` plugin name.

### Type-checked configs reach `manifest.json` and `LICENSE`

The recommended config now lints `manifest.json` and `LICENSE` as well as `package.json` (see
[Files linted beyond your source](#files-linted-beyond-your-source)). A type-checked config you
add without `files`, such as a top-level `...tseslint.configs.strictTypeChecked`, reaches those
files too and aborts the whole run:

```
Error while loading rule '@typescript-eslint/await-thenable': You have used a rule which requires type information, but don't have parserOptions set to generate type information for this file. See https://tseslint.com/typed-linting for enabling linting with type information.
Parser: typescript-eslint/parser
Occurred while linting /path/to/your-plugin/LICENSE
```

Scope it to your TypeScript files, as
[Using alongside stricter typescript-eslint configs](#using-alongside-stricter-typescript-eslint-configs)
shows:

```js
...obsidianmd.configs.recommended,
{
  files: ["**/*.ts"],
  extends: [tseslint.configs.strictTypeChecked],
  rules: {
    // strictTypeChecked turns this back on; obsidianmd/no-misused-promises replaces it.
    "@typescript-eslint/no-misused-promises": "off",
  },
},
```

If the unscoped config comes from somewhere you cannot edit, switch the type-checked rules off for
the files the plugin lints by name, and typescript-eslint's `no-misused-promises` off for your
source, in blocks placed **last**:

```js
{
  files: ["package.json", "manifest.json", "LICENSE", "LICENSE.md", "LICENSE.txt"],
  extends: [tseslint.configs.disableTypeChecked],
},
{
  files: ["**/*.ts"],
  rules: { "@typescript-eslint/no-misused-promises": "off" },
},
```

### Core JS rules apply only to JS and TS files

ESLint's core rules (`js.configs.recommended`) no longer reach JSON, `LICENSE`, or files you lint
with a parser of your own. If you lint `.svelte` or `.vue` files, add them back for those files,
with `@eslint/js` installed in your project (`npm install --save-dev @eslint/js`):

```js
import js from "@eslint/js";

// in the defineConfig([...]) array:
{ files: ["**/*.svelte"], extends: [js.configs.recommended] },
```

### ESLint 10 gets ESLint 10's core rules

The core rules now come from the ESLint you run, not from a bundled `@eslint/js` 9. ESLint 9
projects keep the same core rules. On ESLint 10 the recommended config adds the three rules
ESLint 10 recommends, at `error`:
[`no-unassigned-vars`](https://eslint.org/docs/latest/rules/no-unassigned-vars),
[`no-useless-assignment`](https://eslint.org/docs/latest/rules/no-useless-assignment) and
[`preserve-caught-error`](https://eslint.org/docs/latest/rules/preserve-caught-error).
`preserve-caught-error` suggests `new Error(message, { cause: error })`, which TypeScript accepts
only with `ES2022` or later in your `tsconfig.json` `lib`; the sample plugin's is `ES2021`.

`@eslint/js` is no longer installed with the plugin. If your configuration imports it, add it to your
`devDependencies` (`npm install --save-dev @eslint/js`); projects generated from the sample plugin
already have it. ESLint 9 depends on it itself, so npm usually still installs it; ESLint 10 does not.

### `ui/sentence-case` is off

0.3.0 meant to turn it off, but it stayed on through 0.4.2. To keep it, opt in:

```js
{ rules: { "obsidianmd/ui/sentence-case": ["warn", { enforceCamelCaseLower: true }] } },
```

The locale rules in `recommendedWithLocalesEn` stay on.

### `no-misused-promises` has a new name

`obsidianmd/no-misused-promises` replaces `@typescript-eslint/no-misused-promises` in the
recommended config. It is the same rule, except that Obsidian's chaining `then` (on `Setting` and
components) no longer counts as a Promise. Disable comments that name
`@typescript-eslint/no-misused-promises` still suppress what they did, but rename them: ESLint
reports each one as an unused disable directive, since the recommended config sets
`reportUnusedDisableDirectives`, and `eslint --fix` deletes it, after which the code it covered is
reported. Keep a description after `--`: the recommended config's
`eslint-comments/require-description` reports a disable comment without one.

```ts
// eslint-disable-next-line obsidianmd/no-misused-promises -- the handler catches its own errors
```

If you add typescript-eslint's type-checked configs yourself, on top of the recommended config or
around `ruleConfigs.recommendedTypeChecked`, turn `@typescript-eslint/no-misused-promises` off in
that block. Otherwise both rules report every real Promise, and typescript-eslint's also reports
Obsidian's chaining `then` again.

### New warnings from `validate-manifest`, `validate-license` and `prefer-active-doc`

`validate-manifest` and `validate-license` were configured before but never ran. They now check
`manifest.json` and `LICENSE`, as long as ESLint runs from the project root. `validate-license`
reports only an unchanged copy of the sample plugin's license. `prefer-active-doc` now warns: use
`activeDocument` instead of `document` so your code works in popout windows. Fix the findings, or
switch a rule off for specific files (see [Disabling rules for specific files](#disabling-rules-for-specific-files)).

A few of these are worth knowing in advance:

- Test files are exempt from `prefer-active-doc` and the other rules about code that runs in
  Obsidian (see [Test files](#test-files)), so its findings come from your plugin's own code.
- A published plugin id that contains "obsidian" cannot change. Accept it with
  `"obsidianmd/validate-manifest": ["warn", { allowedWords: { id: ["obsidian"] } }]` in a block with
  `files: ["manifest.json"]` (see [`validate-manifest`](rules/validate-manifest.md)).
- `regex-lookbehind` now also reports negative lookbehinds such as `(?<!x)`, which fail on iOS before
  16.4 just like `(?<=x)`.
- `@typescript-eslint/no-require-imports` is off again, so a disable comment for it is reported as
  unused; delete the comment. The same goes for `no-undef` in TypeScript files, where it is now off.
- In TypeScript files, implied eval such as `window.setTimeout("…", 1)` is reported once, by
  `@typescript-eslint/no-implied-eval`: the core `no-implied-eval` is now off there, as in
  typescript-eslint's own configs, and keeps reporting it in JavaScript files. A disable comment
  naming `no-implied-eval` in a TypeScript file is reported as unused; name
  `@typescript-eslint/no-implied-eval` instead.

### Install `obsidian` yourself

The plugin no longer installs `obsidian` for you. Without it, `no-unsupported-api` reports nothing.
Projects generated from the sample plugin already have it; otherwise run
`npm install obsidian --save-dev`.

### `no-nodejs-modules` in desktop-only repositories

In a repository whose `manifest.json` sets `"isDesktopOnly": true`, raising the rule's severity no
longer turns the check back on. Use `["error", { isDesktopOnly: false }]` (see
[Code that only runs on desktop](#code-that-only-runs-on-desktop)).

### `ruleConfigs` hold only obsidianmd rules

If you build your configuration from `ruleConfigs` instead of the recommended config (see
[Using only obsidianmd rules](#using-only-obsidianmd-rules-without-the-recommended-config)), they
now hold exactly the obsidianmd rules the recommended config sets for source files:

- `@typescript-eslint/no-deprecated` is no longer in `ruleConfigs.recommendedTypeChecked`. Add it to
  your own rules to keep it.
- `validate-manifest` and `validate-license` are no longer in `ruleConfigs.recommended`; in a
  source-file block they never ran. Give them blocks of their own, as that section shows.
- `no-nodejs-modules`, `rule-custom-message` and `no-misused-promises` are new. Turn
  `@typescript-eslint/no-misused-promises` off in the same block (see
  [`no-misused-promises` has a new name](#no-misused-promises-has-a-new-name)).

### Community scanner configuration

If you copy the scanner's configuration, switch `validate-manifest` and `validate-license` off
under their own file globs, since an `"off"` in a source-file block no longer reaches them, and
use `obsidianmd/no-misused-promises` instead of typescript-eslint's rule. The
[scanner-equivalent configuration](#community-plugin-scanner-configuration) shows both.

## Common errors

### "You have used a rule which requires type information"

This means no `parserOptions.projectService` (or `project`) reaches the file being linted: it is not set, or it is set in a block whose `files` do not match that file. A file it does reach that no `tsconfig.json` includes fails with ["… was not found by the project service"](#-was-not-found-by-the-project-service) instead.

The most common case is the ESLint config file itself. The Obsidian sample plugin uses `eslint.config.mts`, which is matched by the recommended config's `**/*.{ts,cts,mts,tsx}` glob, but not by parser options scoped to `files: ["**/*.ts"]`.

The fix is to set the parser options in a block without `files`, with `allowDefaultProject` so files in no `tsconfig.json`, such as the config file, are linted with default compiler options:

```js
{
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.*"],
      },
    },
  },
}
```

If you are using `project` instead of `projectService`, it too has to reach every TypeScript file; `allowDefaultProject` is only available with `projectService`.

### "… requires type information" on `LICENSE`, `manifest.json` or `package.json`

```
Error while loading rule '@typescript-eslint/await-thenable': You have used a rule which requires type information, but don't have parserOptions set to generate type information for this file. See https://tseslint.com/typed-linting for enabling linting with type information.
Parser: typescript-eslint/parser
Occurred while linting /path/to/your-plugin/LICENSE
```

A type-checked config you added without `files`, such as a top-level
`...tseslint.configs.strictTypeChecked`, reaches the files the recommended config lints by name,
which TypeScript cannot read. Scope it to your TypeScript files with `files: ["**/*.ts"]`, as
[Using alongside stricter typescript-eslint configs](#using-alongside-stricter-typescript-eslint-configs)
shows, or see [Upgrading to 0.5.0](#upgrading-to-050) if you cannot edit that config.

### "… was not found by the project service"

A file ESLint lints is in no `tsconfig.json` and not matched by `allowDefaultProject`. With the
sample plugin's layout this is the bundled `main.js` and the Node scripts `esbuild.config.mjs` and
`version-bump.mjs`. If the file is build output or a script rather than plugin source, ignore it (see
[Ignoring files](#ignoring-files)); otherwise add it to your `tsconfig.json`'s `include` (with
`allowJs` for a JavaScript file), or for a few loose files, to `allowDefaultProject`.

### "Cannot read properties of undefined (reading 'includes')" with `--fix-dry-run`

With `parserOptions.project` and TypeScript 6, `eslint --fix-dry-run` could stop with this error in a
type-aware rule such as `@typescript-eslint/no-unsafe-assignment`. For a command-line run, and for
any run with `CI=true` set, typescript-eslint builds the TypeScript program once and does not update
it between fix passes, except under `--fix`. From the second pass on, it type-checks each fixed file in a
program of that file alone, without your `tsconfig.json` or TypeScript's `lib`, where TypeScript 6
can crash. The recommended config turns this off under `--fix-dry-run`. If you fix
through ESLint's API instead, for example in a script that runs with `CI=true`, set
`parserOptions.disallowAutomaticSingleRunInference: true` or the environment variable
`TSESTREE_SINGLE_RUN=false`, or use `projectService` as the examples here do.

### "Cannot redefine plugin "@typescript-eslint"" or "Cannot redefine plugin "json""

```
ConfigError: Config "typescript-eslint/base": Key "plugins": Cannot redefine plugin "@typescript-eslint".
```

Your config imports `typescript-eslint` or `@eslint/json` itself, as
[Using alongside stricter typescript-eslint configs](#using-alongside-stricter-typescript-eslint-configs)
does, and your project has a different copy of the package from the one the plugin uses. ESLint does not
accept two different plugins under one name. `npm ls typescript-eslint @eslint/json` (with Yarn 1,
`yarn why typescript-eslint`) lists the copies.

- With `@eslint/json` 0.x, upgrade to 2.x (see [Upgrading to 0.5.0](#eslintjson-2)).
- With Yarn 1, an exact version in your `package.json`, such as `"typescript-eslint": "8.59.1"` or
  `"@eslint/json": "2.0.0"`, makes Yarn install the newest matching version for the plugin next to
  yours. Use a caret range (`"^8.59.1"`), or give the plugin your copy with `resolutions`:

  ```json
  "resolutions": { "typescript-eslint": "8.59.1" }
  ```

  npm and pnpm give the plugin your copy without this.

### "Configuration for rule "0" is invalid"

This happens when `obsidianmd.configs.recommended` is spread into a `rules` object instead of into the top-level config array. The recommended config is an **array of config objects**, not a rules object:

```js
// WRONG — spreading a config array into rules
{
  rules: {
    ...obsidianmd.configs.recommended, // produces { "0": {...}, "1": {...} }
  },
}

// CORRECT — spreading into the config array
export default defineConfig([
  ...obsidianmd.configs.recommended,
  // ...
]);
```

## Using only obsidianmd rules (without the recommended config)

Most users should use the recommended config and [override individual rules](#overriding-rules) or [layer stricter tseslint configs on top](#using-alongside-stricter-typescript-eslint-configs). This section is for users who need full control over their linting stack and want to add obsidianmd rules to their own setup.

The plugin exports `ruleConfigs` with two presets you can spread into your `rules` block:

- `obsidianmd.ruleConfigs.recommended` — the obsidianmd rules that do not require type information
- `obsidianmd.ruleConfigs.recommendedTypeChecked` — the obsidianmd rules that require typescript-eslint type-aware linting

Between them they hold every obsidianmd rule the recommended config sets for source files, at the same
severity and options, and nothing else.

Both carry only obsidianmd's own rules. `recommendedTypeChecked` includes
[`obsidianmd/no-misused-promises`](rules/no-misused-promises.md), which replaces typescript-eslint's
`no-misused-promises` and does not report Obsidian's chaining `then` (on `Setting` and every
component) as a Promise. Turn `@typescript-eslint/no-misused-promises` off in the same block, as the
example below does, or both report every real Promise.

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs"]),
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
    ],
    plugins: {
      obsidianmd,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
      globals: {
        // Obsidian augments the global scope with these helpers. In this
        // TS-only block typescript-eslint turns no-undef off (the compiler
        // reports undefined names), so they matter once you extend the block
        // to JS files; add globals.browser (from the globals package) there
        // too, or no-undef reports document, window and the rest.
        activeDocument: "readonly",
        activeWindow: "readonly",
        ajax: "readonly",
        ajaxPromise: "readonly",
        createDiv: "readonly",
        createEl: "readonly",
        createFragment: "readonly",
        createSpan: "readonly",
        createSvg: "readonly",
        fish: "readonly",
        fishAll: "readonly",
        sleep: "readonly",
      },
    },
    rules: {
      ...obsidianmd.ruleConfigs.recommended,
      ...obsidianmd.ruleConfigs.recommendedTypeChecked,
      // Replaced by obsidianmd/no-misused-promises, from recommendedTypeChecked above
      "@typescript-eslint/no-misused-promises": "off",

      // Override individual rules as needed
      "obsidianmd/sample-names": "off",
    },
  },
]);
```

`@eslint/js` is not installed with the plugin; add it to your project (`npm install --save-dev @eslint/js`).

If your tseslint setup does not include type checking (e.g., you use `tseslint.configs.recommended` instead of `recommendedTypeChecked`), omit the `recommendedTypeChecked` spread and the `no-misused-promises` line.

A few things to keep in mind with this approach:

- **Obsidian globals** must be declared manually. The recommended config does this for you; here you need to add them yourself. The list above covers the most common ones. `DomElementInfo`, `SvgElementInfo`, `isBoolean`, `nextFrame`, and `ready` are also available.
- **Test and worker files** are not exempted. The recommended config switches some rules off for them (see [Web worker files](#web-worker-files) and [Test files](#test-files)); `ruleConfigs` applies every rule to every file your block matches, so add those overrides yourself.
- **Rules from other plugins** that the recommended config sets are not in `ruleConfigs` — notably typescript-eslint's `no-deprecated`, which it runs at `warn` with `caretRangeFromPoint` allowed. While `minAppVersion` in `manifest.json` is below 1.13.0, or there is no valid one, it allows `display()` as well: the `obsidian` typings mark `SettingTab#display()` deprecated since 1.13.0, but before 1.13 there is no `update()`, so a settings tab has to keep calling `display()`. From 1.13.0 the call is reported, alongside [`settings-tab/prefer-update-over-display`](rules/settings-tab/prefer-update-over-display.md). Add these rules yourself if you want them; for the `display()` allowance, the entries are `{ from: "package", package: "obsidian", name: "display" }` and `{ from: "file", name: "display" }`.
- **Third-party plugins** bundled by the recommended config (`@microsoft/eslint-plugin-sdl`, `eslint-plugin-import`, `eslint-plugin-no-unsanitized`, `eslint-plugin-depend`, `@eslint-community/eslint-plugin-eslint-comments`) are not included. Add them separately if you want them.
- **`package.json` and `manifest.json` linting** (`validate-manifest`, `depend/ban-dependencies`) is not set up, and is not covered by `ruleConfigs` — those presets only carry rules that apply to source files. `validate-manifest` needs its own config block, because `manifest.json` matches no source glob and needs the JSON language to be parsed at all. Install `@eslint/json` 2.x for it (`npm install --save-dev @eslint/json`):

  ```js
  import json from "@eslint/json";

  // in the defineConfig([...]) array:
  {
    files: ["manifest.json"],
    language: "json/json",
    plugins: { json, obsidianmd },
    rules: {
      // eslint.configs.recommended above has no `files`, so it reaches
      // manifest.json too, and this core rule cannot read JSON.
      "no-irregular-whitespace": "off",
      "obsidianmd/validate-manifest": "warn",
    },
  }
  ```
- **`LICENSE` linting** (`validate-license`) is not set up either, and is not covered by `ruleConfigs` — those presets only carry rules that apply to source files. `validate-license` needs its own config block, because `LICENSE` matches no source glob and needs its own language:

  ```js
  {
    files: ["LICENSE", "LICENSE.md", "LICENSE.txt"],
    language: "obsidianmd/plain-text",
    plugins: { obsidianmd },
    rules: {
      "no-irregular-whitespace": "off",
      "obsidianmd/validate-license": "warn",
    },
  }
  ```

## Community plugin scanner configuration

The Obsidian community plugin directory runs this plugin against every submitted plugin as part of its automated review. The scanner uses a configuration based on the recommended config with the following adjustments:

**Ignored files and directories:**

The scanner only lints plugin source code. The following patterns are excluded:

| Pattern | Reason |
| :--- | :--- |
| `node_modules`, `dist`, `build`, `pkg` | Dependencies and build output |
| `.obsidian`, `**/.obsidian/**` | Vault config directories |
| `test-vault` | Test vault directories |
| `esbuild.config.mjs`, `version-bump.mjs` | Common build scripts |
| `**/*.test.*`, `**/*.tests.*`, `**/*.spec.*`, `**/*.specs.*` | Test files |
| `**/test/**`, `**/tests/**`, `**/__tests__/**` | Test directories |
| `**/mocks/**`, `**/__mocks__/**`, `**/testUtils**` | Test utilities |
| `**/*.cjs`, `**/*.mjs`, `**/*.cts`, `**/*.mts` | Non-`.ts`/`.js` source extensions (typically config and build files) |
| `**/vite*` | Vite and Vitest config files |
| `**/scripts/**` | Build/utility scripts |
| `**/docs/**` | Documentation |
| `**/i18n/**`, `**/i18next/**`, `**/locale/**`, `**/locales/**`, `**/translations/**`, `**/l10n/**` | Localization files |
| `.pnpm-store` | pnpm cache |
| `automation/**` | CI/automation |
| `**/e2e/**`, `**/e2e-tests/**`, `**/*.e2e.*` | End-to-end tests |
| `**/wdio.conf.*`, `**/wdio.*.conf.*`, `**/playwright.config.*` | End-to-end test runner configs |
| `**/{astro,babel,commitlint,docusaurus,esbuild,eslint,jest,oxlint,postcss,prettier,rolldown,rollup,stylelint,svelte,tailwind,tsdown,tsup,uno,webpack}.config.*`, `**/{eslint,jest}.*.config.*`, `**/jest.setup.*`, `**/.{babelrc,eslintrc,mocharc,prettierrc}.*` | Build, test and lint tool configs, by the tool's name: a plugin's own `config.ts` or `settings.config.ts` is still linted |

Bundled and minified JavaScript is left out as well, mostly recognised by its content rather than its name: a `.min.js` file, a file whose first 500 bytes hold a bundler's banner (such as the sample plugin's `THIS IS A GENERATED/BUNDLED FILE BY ESBUILD`), or a file of 500 bytes or more whose first 500 hold fewer than two line breaks. Its findings would be about the libraries it bundles rather than the plugin's code.

**Files no tsconfig covers:**

typescript-eslint's project service only gives type information to a file that a `tsconfig.json` or `jsconfig.json` takes in, and refuses any other file with *"… was not found by the project service"*. The scanner lints such a file without type information instead, with the rules that need it switched off (typescript-eslint's type-aware rules and the obsidianmd rules that use the type checker), so a plugin written in JavaScript without a tsconfig is still reviewed. A JavaScript file counts as outside when no `tsconfig.json` or `jsconfig.json` in its directory or above it (up to the plugin's root), nor a project such a config references, lists it. A TypeScript file counts as outside only when there is no such config at all, since a tsconfig can also take in a file that one of its files imports. Files ESLint cannot parse are listed to the directory's reviewers, but not reported to the author.

**Rule severity adjustments:**

- Most rules are downgraded to `warn` (advisory). The security-critical rules stay at `error`: `no-eval`, `no-unsanitized/method`, `no-unsanitized/property`, `obsidianmd/regex-lookbehind`, and `obsidianmd/no-forbidden-elements`, and implied eval: the core `no-implied-eval` in JavaScript, and `@typescript-eslint/no-implied-eval` in TypeScript, which with type information also sees a string held in a variable. As in the recommended config, the core rule is off in TypeScript, so each call is reported once. Where the type-aware rules are off, in a file no tsconfig covers or when the dependencies are not installed (see below), the core rule checks TypeScript again.
- The rules on disable comments depend on when a plugin was submitted. `eslint-comments/no-unlimited-disable` is an `error` for every plugin. `eslint-comments/require-description`, `eslint-comments/disable-enable-pair` and `eslint-comments/no-restricted-disable` are a `warn` for plugins checked with the two oldest of the scanner's four layers, and an `error` for the two newest. Every layer uses the recommended config's options for them.
- Some rules are disabled because the scanner handles them separately or they produce too many false positives at scale: `no-undef`, `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/restrict-template-expressions`, `@typescript-eslint/no-base-to-string`, `import/no-unresolved`, `obsidianmd/validate-manifest`, `obsidianmd/validate-license` (both switched off under their own `manifest.json` and `LICENSE` globs), `obsidianmd/commands/no-command-in-command-id`, `obsidianmd/commands/no-plugin-id-in-command-id`, and the three sentence-case rules.
- Plugins submitted more recently are checked with stricter layers on top: for the newest, `@typescript-eslint/no-unsafe-*` and the two command-id rules are back at `warn`, and these obsidianmd rules at `error`: `settings-tab/no-manual-html-headings`, `settings-tab/no-problematic-settings-headings`, `sample-names`, `no-sample-code`, `platform`, `no-plugin-as-component`, `detach-leaves`, `no-static-styles-assignment`, `no-view-references-in-plugin`, and `no-unsupported-api`.
- Findings from `@typescript-eslint/no-deprecated`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-namespace`, `@typescript-eslint/prefer-as-const`, `@typescript-eslint/prefer-namespace-keyword` and `obsidianmd/prefer-abstract-input-suggest` are reported as recommendations, which weigh less than warnings.
- Disable comments are honoured, and unused ones are not reported.
- When a plugin's dependencies are not installed (for example, it has no `package.json`, or the install fails, which the scan reports), typescript-eslint's type-aware rules and `obsidianmd/no-misused-promises` are switched off: without the dependencies' types they say nothing about the source.

**Security findings:**

- Findings from `no-eval`, `no-implied-eval`, `@typescript-eslint/no-implied-eval`, `no-new-func`, `no-unsanitized/method` and `no-unsanitized/property` are filed as security findings, and are always errors.
- The recommended config runs `no-new-func` (and `no-console`) inside `obsidianmd/rule-custom-message`, which reports under its own name and at its own severity, and starts each message with the rule it reports for. The scanner files a finding whose message starts with `[no-new-func]` as `no-new-func`'s, so the `Function` constructor is a security error, while `[no-console]` findings stay code-quality warnings.
- In TypeScript, `@typescript-eslint/no-implied-eval` reports a `new Function(...)` on the same spot as `no-new-func`. The scanner keeps only the `no-new-func` finding, so the call is reported once.

**Committed build output:**

The scanner warns about a `main.js` at the root of the repository whose first 500 bytes hold the sample plugin's esbuild banner, in a TypeScript project: one with a `tsconfig.json` at the root, or TypeScript sources outside `node_modules` and the build output directories (`dist`, `build`, `out`, `release`); type declarations alone do not count. There `main.js` is the build's output, which belongs in the release rather than the repository. In a plugin written in JavaScript, `main.js` is the source and is not reported.

**Rule replacements:**

- `@typescript-eslint/no-misused-promises` is replaced by `obsidianmd/no-misused-promises`, the same rule without Obsidian's chaining `then` counted as a Promise. A scanner configuration built on the recommended config inherits the swap; one that enables `@typescript-eslint/no-misused-promises` itself should enable the obsidianmd rule instead, or every `Setting` chain in a callback is reported. Disable comments naming `@typescript-eslint/no-misused-promises` still suppress the obsidianmd rule, so findings a plugin had already disabled stay disabled.

**Parser options:**

The scanner uses `projectService` and sets `tsconfigRootDir` to the plugin's root directory. A file no tsconfig covers is parsed without the project service (see **Files no tsconfig covers**), so the scanner does not need `allowDefaultProject`. `manifest.json` needs no parser options: the recommended config reads it with the `json/json` language.

```js
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: process.cwd(),
  },
}
```

You do not need to replicate this configuration. The recommended config with the [quick start](#quick-start) setup is sufficient for local development. This section is provided for transparency so plugin authors understand what the scanner checks and what it skips.

<details>
<summary>Full scanner-equivalent configuration</summary>

If you want your local linting to match what the community plugin scanner checks, you can use the following configuration. This disables rules the scanner skips and does not report unused disable comments, matching the scanner's behavior as closely as possible. It mirrors the configuration all of the scanner's layers build on, and leaves out what the layers change: the stricter rules for newer submissions described under **Rule severity adjustments**, and the oldest layers' `warn` for three of the `eslint-comments` rules, which here keep the recommended config's `error`, as for a plugin submitted today. It does not lint files no tsconfig covers without type information as the scanner does: ESLint reports such a file with *"… was not found by the project service"* (see [Common errors](#-was-not-found-by-the-project-service)).

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  ...obsidianmd.configs.recommended,

  {
    files: ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"],
    rules: {
      // Security — keep as errors
      "no-eval": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/no-forbidden-elements": "error",

      // Covered by TypeScript or too noisy
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "import/no-unresolved": "off",

      // Old plugins should not change their command ids
      "obsidianmd/commands/no-command-in-command-id": "off",
      "obsidianmd/commands/no-plugin-id-in-command-id": "off",
    },
  },

  {
    // Security — implied eval, once per call: the core rule in JavaScript,
    // typescript-eslint's in TypeScript, where the recommended config turns the
    // core rule off. An "error" for the core rule in the block above would turn
    // it back on in TypeScript and report each call twice.
    files: ["**/*.{js,cjs,mjs,jsx}"],
    rules: {
      "no-implied-eval": "error",
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    rules: {
      "@typescript-eslint/no-implied-eval": "error",
    },
  },

  {
    // Scanner handles this separately. It must be switched off under the glob
    // the rule actually runs on -- manifest.json matches no source glob, so an
    // "off" in the block above would not reach it.
    files: ["manifest.json"],
    rules: {
      "obsidianmd/validate-manifest": "off",
    },
  },

  {
    // Scanner handles this separately. It must be switched off under the glob
    // the rule actually runs on -- LICENSE matches no source glob, so an "off"
    // in the block above would not reach it.
    files: ["LICENSE", "LICENSE.md", "LICENSE.txt"],
    rules: {
      "obsidianmd/validate-license": "off",
    },
  },

  {
    // The scanner honours disable comments but does not report unused ones
    linterOptions: {
      reportUnusedDisableDirectives: "off",
      reportUnusedInlineConfigs: "off",
    },
  },

  globalIgnores([
    // Not in the scanner's list: the scanner recognises bundled and minified
    // JavaScript by its content. These two names stand in for that here. Drop
    // "main.js" if your plugin is written in JavaScript and main.js is its source.
    "main.js",
    "**/*.min.js",
    "node_modules",
    "dist",
    "build",
    "pkg",
    "test-vault",
    ".obsidian",
    "**/.obsidian/**",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "**/*.test.*",
    "**/*.tests.*",
    "**/*.spec.*",
    "**/*.specs.*",
    "**/test/**",
    "**/tests/**",
    "**/__tests__/**",
    "**/mocks/**",
    "**/__mocks__/**",
    "**/*.cjs",
    "**/*.mjs",
    "**/*.cts",
    "**/*.mts",
    "**/vite*",
    "**/scripts/**",
    "**/docs/**",
    "**/i18n/**",
    "**/i18next/**",
    "**/locale/**",
    "**/locales/**",
    "**/translations/**",
    "**/l10n/**",
    ".pnpm-store",
    "**/*.spec.ts",
    "**/testUtils**",
    "automation/**",
    "**/e2e/**",
    "**/e2e-tests/**",
    "**/*.e2e.*",
    "**/wdio.conf.*",
    "**/wdio.*.conf.*",
    "**/playwright.config.*",
    "**/{astro,babel,commitlint,docusaurus,esbuild,eslint,jest,oxlint,postcss,prettier,rolldown,rollup,stylelint,svelte,tailwind,tsdown,tsup,uno,webpack}.config.*",
    "**/{eslint,jest}.*.config.*",
    "**/jest.setup.*",
    "**/.{babelrc,eslintrc,mocharc,prettierrc}.*",
  ]),
]);
```

Note: The actual scanner also downgrades every rule the configuration above does not set from `error` to `warn`, except the `eslint-comments/*` rules. The configuration above does not replicate that behavior — it uses the recommended config's default severities and only adjusts the specific rules listed. If you want identical severity levels, you would need to override each rule individually. ESLint also reports a `new Function(...)` in TypeScript twice, once from `no-new-func` and once from `@typescript-eslint/no-implied-eval`, where the scanner keeps one finding (see **Security findings**).

</details>

## Scope of this plugin

This plugin enforces conventions specific to Obsidian plugin development. Its rules assume your code runs inside Obsidian and has access to the Obsidian API. It is not intended for non-Obsidian projects. If you maintain both Obsidian plugins and other projects, use separate ESLint configurations for each.
