# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Upgrading from 0.4.x? The breaking changes below each have a fix in
[Upgrading to 0.5.0](docs/configuration.md#upgrading-to-050).

### Changed

- **Breaking:** Requires Node.js 20.19+, 22.13+ or 24+; Node.js 18 is no longer supported ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203)).
- **Breaking:** Moved to `@eslint/json` 2. A project that also registers `@eslint/json` itself for `package.json` or `manifest.json` must use 2.x, or ESLint reports `Cannot redefine plugin "json"` ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203)).
- **Breaking:** ESLint's core JS rules now apply only to JS and TS files, not to `package.json`, `manifest.json`, `LICENSE`, locale JSON or other files. Files linted with your own parser, such as `.vue` or `.svelte`, need `js.configs.recommended` added for them ([#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- **Breaking:** `ui/sentence-case` is off in `recommended` and `recommendedWithLocalesEn`, as 0.3.0 intended. Opt in with `["warn", { enforceCamelCaseLower: true }]` ([#208](https://github.com/obsidianmd/eslint-plugin/pull/208)).
- **Breaking:** `@typescript-eslint/no-misused-promises` is replaced by `obsidianmd/no-misused-promises`. `eslint-disable` comments for the old rule still suppress the new one, but ESLint reports them as unused, so rename them ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- **Breaking:** `validate-manifest` and `validate-license` now actually run on `manifest.json` and `LICENSE`, and `prefer-active-doc` warns in `recommended`, so existing projects can see new warnings ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#187](https://github.com/obsidianmd/eslint-plugin/pull/187)).
- **Breaking:** Because `manifest.json` and `LICENSE` are now linted, a type-checked config you add without `files` (for example a top-level `...tseslint.configs.strictTypeChecked`) aborts the run on them with "You have used a rule which requires type information". Scope it to your TypeScript files ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- **Breaking:** `obsidian` is no longer installed for you; it was supplied only by accident. Install it in your project (sample-plugin projects already have it), or `no-unsupported-api` reports nothing ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201)).
- **Breaking:** The core JS rules come from the installed ESLint, so ESLint 10 gets ESLint 10's recommended set, which adds `no-unassigned-vars`, `no-useless-assignment` and `preserve-caught-error`; ESLint 9 gets the same rules as before. `@eslint/js` is no longer installed for you: if your config imports it, add it to your `devDependencies` (sample-plugin projects already have it) ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Test files (the files the community scanner leaves out as tests, such as `**/*.{test,spec}.*` and anything under `test/`, `tests/`, `__tests__/`, `mocks/` or `__mocks__/`, and end-to-end tests: `**/*.e2e.*`, anything under `e2e/` or `e2e-tests/`, and WebdriverIO and Playwright configs) no longer get the rules about code that runs in Obsidian: `no-global-this`, `prefer-active-doc`, `prefer-create-el`, `prefer-instanceof`, `prefer-window-timers`, `no-nodejs-modules`, `no-tfile-tfolder-cast`, `hardcoded-config-path`, `no-unsupported-api` and `regex-lookbehind`. Tests run in Node, not in Obsidian or on iOS, and in popular plugins most of these rules' findings came from them. Security rules still apply ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217), [#219](https://github.com/obsidianmd/eslint-plugin/pull/219), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- In a desktop-only repository, raising `no-nodejs-modules`' severity no longer turns it back on; use `["error", { isDesktopOnly: false }]` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- Only a literal `"isDesktopOnly": true` in `manifest.json` counts as desktop-only, for `no-nodejs-modules`, `regex-lookbehind` and the Node.js globals alike; a malformed value such as `"false"` no longer switches the checks off ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `@typescript-eslint/no-require-imports` is off and `require` is a readonly global again, as in 0.2.9 ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- `no-unused-vars` ignores `_`-prefixed caught errors and destructured array elements again, as in 0.2.9; a dead `_x` variable is still reported ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- `ruleConfigs` now hold exactly the obsidianmd rules the recommended config enables: `no-nodejs-modules`, `rule-custom-message` and `no-misused-promises` added, `@typescript-eslint/no-deprecated` moved out ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- The exported `configs` are typed with your own ESLint's `Linter.Config[]`, which its `defineConfig` accepts ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203)).
- Web worker files (`**/*.worker.*`, `**/workers/**`) no longer get the window-only rules and get worker globals instead of the browser and Obsidian ones; security rules still apply ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Peer dependencies are ranges: `eslint >=9.19.0`, `typescript >=4.8.4` and `typescript-eslint ^8.35.1`. `@eslint/js`, `@eslint/json` and `obsidian` are no longer peers, and `@eslint/json` and `eslint-plugin-depend` use caret ranges so a project using them directly shares one copy ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201), [#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- `typescript-eslint` 8.70.1 or later is recommended: it fixes a `no-unnecessary-type-assertion` false positive on a `Record` type alias (typescript-eslint/typescript-eslint#12856). The minimum stays 8.35.1, because a higher one makes npm install a second copy next to an older pinned one and fails with `Cannot redefine plugin "@typescript-eslint"` ([#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- `no-undef` is off for TypeScript files, as typescript-eslint advises: the compiler reports undefined names itself, and `no-undef` misreported globals declared in a `.d.ts` or `declare global` block. JavaScript files keep it at `warn` ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- CI also runs `check:eslint-docs` on every pull request, and the build and docs workflows declare the token permissions they need ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).

### Added

- `obsidianmd.withCustomMessages(rule, messages)`, which returns a plugin's rule with its messages replaced, matched as in `rule-custom-message`. Register the result in a plugin of your own and configure it with the rule's own options; its fixes, suggestions and type information keep working. See [Wrapping a plugin's rule](docs/rules/rule-custom-message.md#wrapping-a-plugins-rule) ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `obsidianmd/no-misused-promises`: typescript-eslint's rule without Obsidian's chaining `then` (`Setting`, `BaseComponent`) counted as a Promise ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- `isDesktopOnly` option for `no-nodejs-modules`, for repositories without a `manifest.json` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `obsidianmd/plain-text` language, which reads `LICENSE`, `LICENSE.md` and `LICENSE.txt` ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- `requireApiVersion` guards accept a constant version, and any argument whose type is a single version string or a union of them, which proves its lowest member ([#169](https://github.com/obsidianmd/eslint-plugin/pull/169), [#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- `no-unsupported-api` recognises early exits (`if (!requireApiVersion(v)) return;`), the `else` of a negated check, `!check || api`, a `const` holding the check's result, and `&&`/`||` combinations of checks ([#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- This changelog ([#188](https://github.com/obsidianmd/eslint-plugin/pull/188)).

### Removed

- The unused `eslint-plugin-security`, `eslint-plugin-json-schema-validator` and `@typescript-eslint/types` dependencies ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201), [#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- The hand-written root `index.d.ts`, which was never published; the package's types are unchanged ([#206](https://github.com/obsidianmd/eslint-plugin/pull/206)).
- The compiled tests and the non-working `eslint-plugin-obsidian` executable from the published package, which drops from 249 files and 685 kB to 115 files and 300 kB unpacked ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).

### Fixed

- `eslint --fix-dry-run` with `parserOptions.project` no longer checks later fix passes against the types of the unfixed code, which made TypeScript 6 crash with "Cannot read properties of undefined (reading 'includes')". The recommended config turns off typescript-eslint's single-run mode there, as typescript-eslint itself does for `--fix` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `rule-custom-message` no longer aborts the lint run when the wrapped rule's report has a fix or only a location. It passes fixes and suggestions on, fills message placeholders the way ESLint does, and runs a wrapped core rule with its default options, so `no-console` or `prefer-const` works without `options: [{}]`. Its `rule:` option, for wrapping a rule passed as an object, is removed: ESLint 9 and 10 copy rule options with `structuredClone`, which cannot copy a rule's functions, so a config using it stopped ESLint before linting. Use `obsidianmd.withCustomMessages()` for a plugin's rule; a rule name that is not a core rule now logs a warning that says so ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `sample-names` reports `mySetting` in interfaces and type literals, which it never matched ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `no-nodejs-modules` no longer reports type-only imports and exports (`import type`, imports whose specifiers are all `type`, `export type … from`), which never load the module. It now reports `export … from "fs"`, `export * from "fs"` and `import fs = require("fs")`, which do ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- The command rules match whole words. `no-plugin-name-in-command-name` no longer reports "Open digital garden" for a plugin named "Git", and `no-command-in-command-name` no longer reports "Open Commander". In ids, `no-command-in-command-id` and `no-plugin-id-in-command-id` split words at `-`, `_`, `:` and camelCase, so `open-commander` is no longer reported and `myPluginOpen` now is for the plugin `my-plugin` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `editor-drop-paste`'s message no longer says the `defaultPrevented` check must come first in the handler; the rule accepts it anywhere ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `object-assign` also reports property targets such as `this.defaults` and `Constants.DEFAULT_SETTINGS` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `no-tfile-tfolder-cast` also reports assertions to unions and arrays such as `as TFile | null` and `as TFile[]`, and no longer reports assertions that narrow nothing: `[] as TFile[]`, or, with type information, a value that already has the type ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `prefer-window-timers` also reports `cancelAnimationFrame()`, so `--fix` no longer moves `activeWindow.requestAnimationFrame()` to `window` and leaves its cancel behind; `no-global-this` fixes `globalThis.cancelAnimationFrame()` like `requestAnimationFrame()` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `hardcoded-config-path` also checks template literals such as `` `${base}/.obsidian/plugins` ``, and no longer reports `.obsidian` followed by a dot and a name or by a digit, such as `".obsidian.vimrc"` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `detach-leaves` removes the call with its line, and removes an `onunload()` it leaves empty in a class that directly extends `Plugin`, so `--fix` no longer leaves an empty method that `no-empty-function` reports ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `prefer-active-doc` no longer reports `document` in `document.createElement()` and the other calls `prefer-create-el` reports in TypeScript files, which were reported by both rules ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `prefer-create-el` no longer rewrites `createEl("toString")` and other `Object.prototype` names into code that does not parse ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `@typescript-eslint/no-deprecated` no longer reports `display()` while `manifest.json`'s `minAppVersion` is below 1.13, where a plugin has to call it; from 1.13 it is reported again ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `--fix` no longer breaks type-checking or syntax in the cases a run over the community plugins found. The rules below autofix only where the rewrite is known to be safe, offer it as an editor suggestion where it may not be, and offer nothing where it would be wrong ([#221](https://github.com/obsidianmd/eslint-plugin/pull/221)):
  - `no-global-this` autofixes only where `window` gives the same type as `globalThis`, such as `window.document`, a discarded `setTimeout()` or a cast to `unknown`; a kept `globalThis.setTimeout()` result or a cast to your own type gets a suggestion.
  - `no-global-this` and `prefer-window-timers` no longer write `window` where a local variable named `window` shadows the global (such as a Playwright page), where the project has no DOM types, or after a `typeof window` check that leaves `window` possibly undefined.
  - `settings-tab/no-manual-html-headings` autofixes only a heading whose element is not used afterwards and whose only option is `text`. It keeps the text as written (quotes, template literals, `.setText()`) and adds the `Setting` import if needed. Other options, such as `cls` or `attr`, get a suggestion; an element used afterwards gets neither.
  - `settings-tab/no-problematic-settings-headings` removes a heading only when its statement is nothing but the heading, so it no longer leaves `.setClass(…)` or `const x = ;` behind. With `setDesc()` and similar it suggests the removal; with a control such as `addButton()` it offers neither. It also no longer aborts the lint run on `getSetting().setName(…).setHeading()`.
  - `settings-tab/prefer-update-over-display` autofixes `this.display()` only when the installed `obsidian` types have `update()` (1.13+), and suggests it otherwise or without type information. A call inside the tab's own `update()` or directly in `getSettingDefinitions()`, where `update()` would call itself, or one with arguments, gets neither.
  - `settings-tab/no-deprecated-display` suggests removing `display()` instead of autofixing: `obsidian` types before 1.13 require it, Obsidian still renders with it when `getSettingDefinitions()` returns an empty array, and the imports and helpers only it used were left unused. A `getSettingDefinitions()` that only returns `[]` is no longer reported.
  - `prefer-create-el` type-checks the `createEl("div")` to `createDiv()` rewrite like its other fixes and keeps `?.`; where the helper is missing, has another signature or returns another type, it suggests the change or reports without one.
  - `prefer-instanceof` suggests `x?.instanceOf(T)` instead of autofixing `x.instanceOf(T)` when `x` may be null or undefined, where the method call would throw.
  - `no-sample-code` deletes the sample call only when it is a statement of its own; `const id = this.registerInterval(…)` is reported without a fix instead of becoming invalid code.
- `no-unsupported-api` no longer reports members of the settings-definition types a plugin returns from `getSettingDefinitions()` (Obsidian 1.13), which are the plugin's own data and safe to read on any version; `Setting`, `SettingPage` and other runtime APIs are still reported ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `prefer-window-timers` autofixes only where `window`'s `number` timers cannot change a type: a discarded `setTimeout()`/`setInterval()` result, a `clearTimeout()`/`clearInterval()` argument known to be a number, and `requestAnimationFrame`. Elsewhere it suggests the change, since a variable typed `NodeJS.Timeout` would fail `tsc` ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `no-sample-code` no longer aborts the lint run on a callback that calls a plain function ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `no-forbidden-elements` also reports `<style>` and `<link>` elements created on `activeDocument`, `el.doc`, `ownerDocument` and with the global `createEl()` ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `no-static-styles-assignment` no longer aborts the lint run on `setCssStyles()` or `setCssProps()` without an argument ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `prefer-instanceof` keeps the parentheses around the checked value, so `(await getEl()) instanceof HTMLElement` is no longer rewritten to a different expression ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `prefer-create-el` no longer fixes `document.createElement("div")` to `createDiv()` where the file binds that helper's name itself (a function, variable, parameter or import named `createDiv`), since the call would reach that binding, recursing inside `function createDiv()`; it is reported without a fix instead ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- `validate-manifest` follows the community scanner's manifest review, so it no longer reports what the review accepts: `helpUrl` is allowed, a description may end with `!` or `?`, start with a lowercase letter, contain emoji or mention plugins, and an `id` may contain "plugin" as long as it does not end with it. It now also reports what the review does: a `name` with parts of "Obsidian", and a description that refers to itself or repeats the name ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- `validate-manifest` never ran: it was configured only for JS/TS files. It now runs on `manifest.json`, no longer reports ordinary punctuation and accented letters in descriptions, now reports an empty-string key, no longer crashes on keys such as `constructor`, and matches `allowedWords` case-insensitively ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191)).
- `validate-license` never ran either. It now runs on `LICENSE` files and recognises the standard MIT line (`Copyright (c) 2025 Name`, `©`, optional "by", CRLF) ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- `validate-license` reports the year only on the unchanged sample license (holder "Dynalist Inc."), so a GPL-family `LICENSE` (the FSF's own copyright line) and an older year in your own name are no longer reported ([#211](https://github.com/obsidianmd/eslint-plugin/pull/211)).
- English locale JSON (`en.json`, `en/**/*.json`) failed with "Unexpected token :" under `recommendedWithLocalesEn`; it is now read with the JSON language and `ui/sentence-case-json` runs ([#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- Core rules such as `no-irregular-whitespace` no longer abort the lint run on your own `json/json` blocks or on `LICENSE` ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- `regex-lookbehind` reports negative lookbehinds in regex literals, and no longer reports escaped parentheses or lookbehind-like text in character classes ([#202](https://github.com/obsidianmd/eslint-plugin/pull/202)).
- `no-unused-vars` no longer reports `using` and `await using` declarations ([#199](https://github.com/obsidianmd/eslint-plugin/pull/199)).
- `no-nodejs-modules` no longer prints "Failed to load JSON file" when there is no `manifest.json` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `prefer-active-doc` false positives on `MathJax.document`, type positions, property names and local bindings named `document` ([#187](https://github.com/obsidianmd/eslint-plugin/pull/187)).
- `no-unsupported-api` no longer aborts the run on a version semver cannot parse, in a guard or in `minAppVersion`; a `minAppVersion` such as `"0.15"` reads as 0.15.0, and anything else is checked as 0.0.0 ([#169](https://github.com/obsidianmd/eslint-plugin/pull/169), [#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- `no-global-this` and `prefer-window-timers` autofixes no longer break web workers ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- `prefer-create-el` no longer reports elements created in an iframe's document, where its suggestion would throw ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- `@typescript-eslint/no-deprecated` allows `caretRangeFromPoint`, the fallback before iOS 17.4 ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- Sentence-case rules keep URLs, date formats (`YYYY-MM-DD`), "REST" and example placeholder values as written, and the JSON and locale-module rules say what text they expect ([#208](https://github.com/obsidianmd/eslint-plugin/pull/208)).
- `no-misused-promises` no longer reports `Setting` chains in callbacks or `if (component)` ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- The plugin loads on ESLint 9.19 to 9.21: since 0.3.0 it imported `eslint/config`, which arrived in 9.22 ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201)).
- Removed a misspelled `no-prototype-bultins` override that never applied; `no-prototype-builtins` stays at `error` ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- `check:eslint-docs` passes on Windows checkouts (contributors) ([#200](https://github.com/obsidianmd/eslint-plugin/pull/200)).
- obsidianmd's JavaScript rules return nothing for files in other languages, so a type-aware one enabled without `files` (say, to raise its severity) no longer aborts the run on `LICENSE`, `manifest.json` or `package.json` ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `prefer-create-el` no longer autofixes `activeDocument.createElement()` to `activeWindow.createEl()` when `Window` does not declare the helper, which Obsidian's types do not, so the fix no longer breaks `tsc`; it is offered as a suggestion ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `vault/iterate` no longer claims to be autofixable; it never fixed anything ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `validate-license` rejects unknown options instead of silently ignoring a misspelled one ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- The published `dist/lib/manifest.d.ts` imported a `PluginManifest` type file the package never shipped; the type now lives in `lib/` and is published with it ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `no-global-this` no longer reports `global` or `globalThis` in types (`typeof globalThis`, `{ global: boolean }` in a type literal or interface) or as a class-member, import or export name, where its fix renamed keys and broke type-checking; a shorthand `{ globalThis }` becomes `{ globalThis: window }` ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216)).
- `prefer-create-el` fixes `createElement()` and `createElementNS()` only for a tag name the DOM types know, so `createEl(tag)` with a `string`, a custom element or a deprecated tag (TS2345) is no longer written by `--fix`; those are reported without a fix ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216)).
- `vault/iterate` also reports `getFiles().find()` by path through `this.app.vault`, `app.vault`, `plugin.app.vault` and `this.vault`, not only a bare `vault` ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216)).

### Documentation

- What npm reports when you install the plugin with ESLint 10, where three bundled plugins do not declare ESLint 10 support yet ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Every rule doc has a "What is reported" section: what the rule reports, what it deliberately leaves alone, its fix or suggestion, and the config scoping that applies. Each statement is backed by a test ([#218](https://github.com/obsidianmd/eslint-plugin/pull/218)).
- An [Upgrading to 0.5.0](docs/configuration.md#upgrading-to-050) section, and a common-errors entry for type-checked configs reaching `LICENSE` and `manifest.json` ([#188](https://github.com/obsidianmd/eslint-plugin/pull/188)).
- The README and quick-start examples ignore build output and Node build scripts as the sample plugin does, and say what to do when there is no build step and `main.js` is your source ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#188](https://github.com/obsidianmd/eslint-plugin/pull/188)).
- "Files linted beyond your source" explains that `package.json`, `manifest.json` and `LICENSE` are matched by name, so ESLint must run from the project root ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- "Code that only runs on desktop" and "Web worker files" sections ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193), [#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- The community scanner configuration switches `validate-manifest` and `validate-license` off under their own file globs, and uses `obsidianmd/no-misused-promises` ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- The `validate-manifest` options table lists `allowedWords`' fields under their own names, and the manual `manifest.json` example no longer crashes ESLint ([#206](https://github.com/obsidianmd/eslint-plugin/pull/206)).
- The configuration examples work on the sample plugin's layout and no longer bring back the #181 false positive: they ignore build output, turn typescript-eslint's `no-misused-promises` off next to `strictTypeChecked` and `recommendedTypeChecked`, scope rule overrides, and give disable comments a description. The scanner section matches the scanner's 0.5.0 configuration, and CONTRIBUTING.md explains the changelog check ([#214](https://github.com/obsidianmd/eslint-plugin/pull/214)).

## [0.4.2] - 2026-08-24

### Added

- `ruleConfigs` export: `ruleConfigs.recommended` and `ruleConfigs.recommendedTypeChecked` are the obsidianmd rule severity presets as plain rule objects, to spread into a `rules` block when using your own ESLint and typescript-eslint setup instead of the full recommended config.

### Documentation

- A new [configuration guide](docs/configuration.md): why `parserOptions` is required, what the recommended config includes, layering stricter typescript-eslint configs, using only obsidianmd rules, disabling rules for specific files (including bulk-disable via `ruleConfigs`), common errors, and the community plugin scanner configuration.
- README examples use `projectService` with `allowDefaultProject` instead of `parser` + `project`, which fixes the common "requires type information" error on `eslint.config.mts`.
- Removed the legacy `.eslintrc` documentation; the plugin requires ESLint 9.19 or later.

## [0.4.1] - 2026-07-02

### Fixed

- Wrong `activeDocument.createEl()` calls ([#174](https://github.com/obsidianmd/eslint-plugin/pull/174)).

## [0.4.0] - 2026-06-30

### Added

- Community scanners ruleset ([#173](https://github.com/obsidianmd/eslint-plugin/pull/173)).
- `prefer-setting-definitions` and `no-deprecated-display` rules ([#161](https://github.com/obsidianmd/eslint-plugin/pull/161)).
- `eslint-plugin-eslint-plugin` for rule quality linting.
- Further reading links to rule documentation.
- `Jekyll` to the brands list.
- Exclusions to `no-unused-expressions` rule.
- `ignoreRestSiblings` option to `no-unused-vars`.

### Changed

- Switched to `obsidianmd/no-nodejs-modules`.
- Centralized `RuleCreator` into shared utility.
- Replaced all hardcoded URLs with `docsUrl()`.
- Streamlined `meta.docs.url` for static analysis.

### Fixed

- Properly scope rules to file types ([#165](https://github.com/obsidianmd/eslint-plugin/pull/165)).
- `instanceOf` existence check before linting.
- Scoped type-requiring rules to type-checked files.
- Allowed type-only imports of `moment`.
- Restored default for `validate-license`.
- Corrected `docsUrl` name for `prefer-abstract-input-suggest`.
- Added schema descriptions and resolved schema defaults.
- Removed unused `messageIds` and placeholders.
- Corrected placeholder metadata in rule definitions.
- Corrected anchor link for `no-default-hotkeys`.

## [0.3.0] - 2026-05-12

### Added

- `Cursor` as a recognized brand.

### Changed

- Disabled `sentence-case` rule by default (too broken). Note: rebase commit f088476 re-enabled it in this release, so it shipped on; 0.5.0 turns it off ([#208](https://github.com/obsidianmd/eslint-plugin/pull/208)).
- Switched to warnings for certain rules.

### Fixed

- Extracted `no-global-this` into standalone rule.
- `createDocumentFragment` on `activeDocument` now uses `activeWindow`.
- `window.timerMethods` enforcement.
- `.obsidian` detection in URLs for `hardcodedConfigPath`.
- Typed rules now only run on files parsed by `getParserServices`.
- Disabled broken rule by default.
- `hardcodedConfigPath` no longer detects URLs.
- Compilation issues.

## [0.2.9] - 2026-04-30

_Patch release with no user-facing changes._

## [0.2.8] - 2026-04-28

### Fixed

- Allow dynamic `require()` calls if guarded by `Platform.isDesktop`.

## [0.2.7] - 2026-04-27

### Fixed

- Better guard clause detection for `no-nodejs-modules`.

## [0.2.6] - 2026-04-27

### Changed

- Replaced `no-nodejs-modules` with custom implementation that allows usage when guarded by `Platform.isDesktop`.

## [0.2.5] - 2026-04-27

### Added

- Support for ESLint 10.
- `prefer-create-el` rule.

### Changed

- Don't warn on unused variables prefixed with `_`.
- Replaced `latest` with concrete versions in dependencies.

### Fixed

- Removed `window` → `activeWindow` check.
- Typed rules now only run on files parsed by `getParserServices`.

## [0.2.4] - 2026-04-20

### Added

- `prefer-get-language` rule.
- `CalDAV` and `CardDAV` as recognized brands.
- Stricter manifest checks.

### Fixed

- Global declarations.
- Runtime dependencies moved to `dependencies`.
- Constructor replacement issues.

## [0.2.3] - 2026-04-17

_Version bump only._

## [0.2.2] - 2026-04-16

### Fixed

- `noUnsupportedApi` now ignores properly guarded API calls.

## [0.2.1] - 2026-04-16

### Added

- `prefer-active-window-timers` rule.
- `editor-drop-paste` rule.
- `prefer-active-doc` rule.
- `prefer-instanceof` rule.
- `no-unsupported-api` rule.
- `no-unsanitized` rules.
- `rule-custom-message` rule.
- `SvgElementInfo` to globals.
- Common APIs and services to `DEFAULT_BRANDS`.
- More cases for sentence case rules.
- Plugin name/version parsing from `package.json`.
- Global variable registration.

### Changed

- Switched test runner to Mocha.
- Switched tabs to spaces.
- Improved warning message for inline style rule.
- Only allow setting CSS variables in style assignments.
- Strongly typed type constants.
- Better error message for sentence case rule.

### Fixed

- `WebDAV` moved from acronyms to brands to preserve casing.
- Leading opening parenthesis handling.
- Documentation generator.
- Proper use of `extends`.
- Audit issues.

## [0.1.9] - 2025-11-14

### Added

- Automatic generation of `.d.ts` type declaration file.
- Ban of dependencies that have better alternatives in core libs.

### Fixed

- Indentation in markdown codeblock examples.
- Various issues with example configuration.

## [0.1.8] - 2025-11-04

### Changed

- Disabled `require-await` rule.

### Fixed

- Type issues ([#68](https://github.com/obsidianmd/eslint-plugin/issues/68), [#67](https://github.com/obsidianmd/eslint-plugin/issues/67)).

## [0.1.7] - 2025-11-03

### Changed

- Updated rule messages to be more verbose.
- Re-added fixer for settings headings.

## [0.1.6] - 2025-10-23

### Added

- `no-forbidden-elements` rule.
- LICENSE validation rules.
- Rule options support.

### Changed

- Refactored configuration to have separate configs for JS and TS files.

## [0.1.5] - 2025-10-17

### Added

- Sentence case verification rule.
- Type checking support.

### Changed

- Improved brand detection and text handling.

### Fixed

- Avoid false positives in `hardcoded-config-path`.
- CI no longer checks docs in build.

## [0.1.4] - 2025-07-04

### Fixed

- Hotfix for build issues.

## [0.1.3] - 2025-07-04

### Added

- `prefer-local-storage` rule: prefer `App#saveLocalStorage` / `App#loadLocalStorage` to write/read localStorage data unique to a vault.

## [0.1.2] - 2025-07-03

### Fixed

- Added peer dependencies.

## [0.1.1] - 2025-07-01

### Fixed

- Plugin not working with flat config.
- Documentation generation.

## [0.1.0] - 2025-07-01

### Added

- Initial release.
- Rules for Obsidian plugin development best practices.
- `recommended` configuration preset.
- Support for ESLint 9 flat config.
- `validate-manifest` rule for manifest.json validation.
- `no-sample-code` rule with auto-fix.
- `no-plugin-as-component` rule.
- `prefer-file-manager-trash` rule.
- `no-static-styles-assignment` rule.
- `platform` rule for OS detection.
- `no-tfile-tfolder-cast` rule.
- `hardcoded-config-path` rule.
- `detach-leaves` rule.
- `sample-names` rule.
- `object-assign` rule.
- `vault/iterate` rule.
- `regex-lookbehind` rule.
- Command-related rules (`no-command-in-command-id`, `no-command-in-command-name`, `no-default-hotkeys`, etc.).
- Settings tab rules (`no-manual-html-headings`, `no-problematic-settings-headings`).
- GitHub Actions CI for build and test.
- NPM publish workflow.
- CLA enforcement.
- Automatic documentation generation.

[Unreleased]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.1...HEAD
[0.4.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/obsidianmd/eslint-plugin/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.9...0.3.0
[0.2.9]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.8...0.2.9
[0.2.8]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.7...0.2.8
[0.2.7]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.6...0.2.7
[0.2.6]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.5...0.2.6
[0.2.5]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.4...0.2.5
[0.2.4]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.3...0.2.4
[0.2.3]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.2...0.2.3
[0.2.2]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.9...0.2.1
[0.1.9]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.8...0.1.9
[0.1.8]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.7...0.1.8
[0.1.7]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/obsidianmd/eslint-plugin/releases/tag/0.1.0
