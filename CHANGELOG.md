# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `commands/check-callback-uses-checking` reports a `checkCallback` or `editorCheckCallback` in `addCommand()` that never reads its `checking` parameter. Obsidian calls it with `checking` set to `true` to ask whether the command is available, for example while the command palette is open, so such a callback runs its action on every check. It warns in the `recommended` config ([#248](https://github.com/obsidianmd/eslint-plugin/pull/248)).
- `no-await-chainable` reports `await` of a `Setting` or a UI component (`ButtonComponent`, `TextComponent` and the other `BaseComponent` subclasses), and returning one from an async function. Their `then(cb)` is for chaining: it calls `cb` with the object and returns the object, so promise resolution calls it again forever, the `await` never settles and the app stops responding. `@typescript-eslint/await-thenable` does not catch it, because the objects are thenables. It is an error in the `recommended` config, for TypeScript files ([#249](https://github.com/obsidianmd/eslint-plugin/pull/249)).

### Changed

- `no-unsupported-api` names the fix in its report: raise `minAppVersion` to the version the API needs, or guard the use with `requireApiVersion()` and that version. Below 0.13.21, which first has `requireApiVersion()`, it suggests a check that the API exists instead, and for a superclass, such as `class extends AbstractInputSuggest`, or a newer signature that no such check proves, only raising `minAppVersion` ([#250](https://github.com/obsidianmd/eslint-plugin/pull/250)).

### Fixed

- `object-assign` no longer suggests `Object.assign({}, DEFAULT_SETTINGS, o)` where the call is the body of an arrow function whose caller throws the result away, as in `overrides.forEach((o) => Object.assign(DEFAULT_SETTINGS, o))`. The code relies on the defaults being changed there, and with `{}` the call did nothing. With type information, such a caller is one whose callback type returns `void`; without it, `forEach()` ([#271](https://github.com/obsidianmd/eslint-plugin/pull/271)).
- `settings-tab/no-problematic-settings-headings` no longer stops the whole ESLint run when `manifest.json` has a `name` that is not a string, such as `"name": 123`. It threw `TypeError: pluginName.toLowerCase is not a function`; now it skips only the plugin-name check, and the "settings" and "general" checks still report ([#251](https://github.com/obsidianmd/eslint-plugin/pull/251)).
- `no-static-styles-assignment` no longer stops the whole ESLint run on `el.style.setProperty()` called without arguments, which threw `TypeError: Cannot read properties of undefined (reading 'type')` ([#264](https://github.com/obsidianmd/eslint-plugin/pull/264)).
- `ui/sentence-case`, `ui/sentence-case-json` and `ui/sentence-case-locale-module` ignore an empty string in the `brands`, `acronyms` and `ignoreWords` options. With `brands: [""]`, a text that is empty or starts with a character other than a letter or digit, such as `"(Open) settings"`, made the rule loop forever, and the lint run never finished ([#265](https://github.com/obsidianmd/eslint-plugin/pull/265)).
- `prefer-window-timers` no longer rewrites `activeWindow.clearTimeout(id)` and `activeWindow.clearInterval(id)` to `window` automatically, and offers it as a suggestion instead. A timer ID belongs to the window that set the timer: where `activeWindow.setTimeout()` in a popout window set it, `window.clearTimeout(id)` did not clear it ([#266](https://github.com/obsidianmd/eslint-plugin/pull/266)).
- The recommended config treats a file named `worker.ts` (or `worker.js` and the other extensions), such as `src/worker.ts`, as web worker code, like `*.worker.ts`. `prefer-window-timers` rewrote its `setTimeout()` to `window.setTimeout()`, and `no-global-this` its `globalThis` to `window`, which a worker does not have ([#267](https://github.com/obsidianmd/eslint-plugin/pull/267)).
- `settings-tab/no-deprecated-display`, `settings-tab/prefer-update-over-display` and `settings-tab/require-display` read a `minAppVersion` without a patch version, such as `"1.13"`, as `1.13.0`, as `no-unsupported-api` does. They did nothing for such a version ([#268](https://github.com/obsidianmd/eslint-plugin/pull/268)).
- `validate-manifest` checks the words in the `id`, `name` and `description` without the invisible characters that could hide them, such as a zero-width space, a soft hyphen or a bidi control, so `"Obs\u200Bidian Sync"` is reported as using "Obsidian" ([#269](https://github.com/obsidianmd/eslint-plugin/pull/269)).
- `prefer-active-doc` reports `document.createElementNS(svgNamespace, …)` where `minAppVersion` is 0.15.0 or later but older than 1.1.0, which first has `createSvg()`. It left the call to `prefer-create-el`, which does not report it below that version, so neither rule did ([#270](https://github.com/obsidianmd/eslint-plugin/pull/270)).
- `no-unsupported-api` reports a call to `Workspace.duplicateLeaf(leaf)` whose result is used, such as `const copy = await workspace.duplicateLeaf(leaf)`, below 0.13.8. The overload is in the 0.9.7 typings, which allowed it from there, but it returned `Promise<void>` until 0.13.8, so the result was `undefined`. A call that discards the result, and a use of the method as a value, still need only 0.9.7 ([#259](https://github.com/obsidianmd/eslint-plugin/pull/259)).
- `no-unsupported-api` reports `Editor` and the other declarations first in the 0.11.7 typings, such as `MarkdownEditView`, below 0.11.7 instead of 0.11.0. The obsidian-api commit that added them still named 0.11.0 in its `package.json`, so as that version's last commit it dated them 0.11.0, released a month earlier ([#259](https://github.com/obsidianmd/eslint-plugin/pull/259)).
- `no-forbidden-elements` no longer takes a variable for a shadow root by its name alone: `const shadowRoot = document.head; shadowRoot.createEl("style")` adds a `<style>` to the document's head, and is now reported. The name still counts where nothing else tells what the variable holds, such as an untyped parameter or `el.getRootNode()`; a declaration, a type annotation or, with type information, the variable's type decides first. A `<style>` or `<link>` created in a shadow root and then moved into the document, as in `document.head.insertAdjacentElement("beforeend", style)` or `document.head.appendChild(style)`, is reported too, and `insertAdjacentElement()` into a shadow root counts as inserting into it ([#260](https://github.com/obsidianmd/eslint-plugin/pull/260)).
- `no-nodejs-modules` reports `require?.("fs")`: the bundle's own `require` exists on mobile too, so the optional call still runs there and throws for a Node.js module. `window.require?.("fs")` stays allowed, since only the desktop app puts `require` on the global object. A `try` whose `catch` always throws, as in `catch (e) { throw e; }`, no longer counts as a guard for a `require()` or an awaited `import()` in it, since it hands the failure on ([#261](https://github.com/obsidianmd/eslint-plugin/pull/261)).
- `editor-drop-paste` reports a handler that writes to its editor even when it passes the event to `console.log()` or another `console` method. Such a call only prints the event and neither checks nor cancels it, but it was counted as handing the event to a function that might ([#262](https://github.com/obsidianmd/eslint-plugin/pull/262)).
- `prefer-file-manager-trash-file` reports `vault.delete(file, force)` with a `force` that is not a literal, and branches that differ only in `force`, such as `if (isFolder) vault.delete(file, true); else vault.delete(file);`. `force` only lets `delete()` remove a folder that is not empty, and the file is gone for good either way, but the rule skipped such calls as if the plugin let the user choose where deleted files go, as `vault.trash(file, this.settings.useSystemTrash)` does. As before, `delete()` gets no suggestion ([#263](https://github.com/obsidianmd/eslint-plugin/pull/263)).
- `no-static-styles-assignment` no longer reports a fixed value written to a `style` object that, by type, is not an element's inline style, such as a plugin's own `settings.style.theme = "compact"`. It matched any `x.style.prop` by name. With type information, a `style` object is now reported where its type is a `CSSStyleDeclaration`, has its `cssText` or `setProperty()`, or cannot tell, such as `any`; without it, as before, every one is ([#272](https://github.com/obsidianmd/eslint-plugin/pull/272)).
- `prefer-instanceof` no longer autofixes a check whose value may be null behind a type assertion or declaration, which turned a check that was `false` into one that throws. With `strictNullChecks`, that is a value cast to a type without `null` from one that may be null, such as `const next = e.relatedTarget as HTMLElement`; without it, also a cast, a variable with a type annotation set from a nullable call, such as `const input: Element = root.querySelector("input")`, and a class field without an initializer that the constructor does not set. These now get the `?.instanceOf()` suggestion. A check against an abstract class, or against a `Node` class whose constructor needs arguments, is no longer reported: `el.instanceOf(Widget)` did not compile, and `instanceof` finds a plugin's own class in every window. A check with a comment outside its operands is offered as a suggestion only, since the fix dropped the comment ([#277](https://github.com/obsidianmd/eslint-plugin/pull/277)).
- `no-nodejs-modules` counts an early exit in a `switch` case as a guard for the rest of that case, as one in a block is, so `case "a": if (Platform.isMobile) return; require("fs");` is no longer reported. It still guards nothing in the cases after it, which `switch` can enter directly ([#279](https://github.com/obsidianmd/eslint-plugin/pull/279)).
- `no-forbidden-elements` no longer reports a `<style>` or `<link>` in an iframe's document, which `styles.css` does not reach, so that it is the only way to style it: one created on `iframe.contentWindow.document`, or created elsewhere and only inserted into the iframe's document, as in `iframe.contentDocument.head.appendChild(style)`. Only one created on `iframe.contentDocument` was allowed ([#280](https://github.com/obsidianmd/eslint-plugin/pull/280)).
- `editor-drop-paste` no longer reports a handler that lets Obsidian insert the content and changes it afterwards, as in `window.setTimeout(() => editor.setValue(tidy(editor.getValue())))`: one that writes to its editor only in a callback to `setTimeout()`, `then()` and the like, or after an `await`, and does not read `evt.clipboardData` or `evt.dataTransfer`. It told such a handler to call `evt.preventDefault()`, which would cancel the paste or drop it relies on. A handler that reads the content and inserts it later, such as after an upload, is still reported ([#281](https://github.com/obsidianmd/eslint-plugin/pull/281)).
- The recommended config gives test files and tool configs, which run in Node, the Node globals even where the plugin is not desktop-only, and every `.cjs` file `module` and `exports`. `no-undef` reported `module.exports` in `jest.config.js` and `release.config.cjs`, and `process` and `__dirname` in a script, as not defined. The typescript-eslint config the recommended config extends reads a `.cjs` file as an ES module, so `module` and `exports` were missing there too ([#282](https://github.com/obsidianmd/eslint-plugin/pull/282)).
- `no-unsupported-api` reads a type alias in a member's type as the type it stands for when it compares the member with older typings. `View.icon` and `View.getIcon()` were typed `string` before 1.1.0 typed them `IconName`, which is `type IconName = string`, so `this.icon = "dice"` in an `ItemView` was reported as needing 1.1.0. It also treats the body of an `onUserEnable()` override, which only Obsidian 1.7.2 and later calls, as running on 1.7.2, as it does for `onPaneMenu()`, so `this.app.workspace.ensureSideLeaf()` there is no longer reported ([#275](https://github.com/obsidianmd/eslint-plugin/pull/275)).
- `no-unsupported-api` recognises more guards. A read with a fallback, `app.renderContext ?? null`, works like the `||` it already allowed, and an optional access, `app.secretStorage?.getSecret("token")`, reads the newer member safely and runs the rest of the chain only on a release that has it, so neither member is reported. `requireApiVersion()` imported under another name or called from `import * as obsidian`, a check compared with `true`, a feature check held in a `const`, and a `readonly` field initialized with `requireApiVersion()` that the file assigns nowhere else also count as guards. A global the app declares, such as `activeDocument`, no longer counts as checked by `activeDocument || document`, `if (activeDocument)` or `activeDocument != null`: below 0.15.0 reading it throws a `ReferenceError`, so only `typeof activeDocument` checks it ([#283](https://github.com/obsidianmd/eslint-plugin/pull/283)).
- `prefer-window-timers` no longer rewrites `activeWindow.setTimeout()` and `activeWindow.setInterval()` to `window` automatically where their ID is kept, as in `this.id = activeWindow.setInterval(…)`, and offers it as a suggestion instead. The matching `activeWindow.clearInterval(this.id)` gets only a suggestion, so after `--fix` the timer was set on the main window but cleared on whichever window was active, and might never be cleared. A timer in a function whose source the file turns into a string, as for an inline web worker (`new Blob([`(${body.toString()})()`])`), also gets a suggestion, as does `no-global-this` there: the worker has no `window` ([#273](https://github.com/obsidianmd/eslint-plugin/pull/273)).
- `prefer-create-el` no longer reports `document.createElement()` and the other native calls in a fallback for where Obsidian's helpers are missing, as in a browser or under jsdom: the other branch of `typeof createDiv === 'function' ? createDiv() : document.createElement('div')`, a branch for `typeof activeDocument === 'undefined'`, and the `catch` of a `try` that calls `createEl()`. It fixed them to the helper, which throws a `ReferenceError` exactly there. Where a comment sits between or around the arguments, such as `createElement(/* TODO */ 'p')`, the replacement, which would drop it, is offered as a suggestion instead of a fix. `prefer-active-doc` offers no `activeDocument` in such a fallback either ([#276](https://github.com/obsidianmd/eslint-plugin/pull/276)).
- `prefer-active-doc` advises `activeDocument.body`, and offers it as a suggestion, for an element the code puts in `document.body` only for a moment, such as a download link (`document.body.appendChild(a); a.click(); a.remove();`) or a textarea for copying text: one it passes to `appendChild()`, `append()`, `prepend()`, `insertBefore()` or `insertAdjacentElement()` and also removes. It reported these as state of the whole window, told the author to set them up in each window from `workspace.on("window-open")`, and offered nothing. An element that is never removed, and anything put in `document.head`, are still reported that way ([#278](https://github.com/obsidianmd/eslint-plugin/pull/278)).
- `settings-tab/no-problematic-settings-headings` reports a "General" or plugin-name heading only at the top of the settings tab, where nothing comes before it in `display()`. Lower down, as in a "General" section after an "Appearance" one, the heading starts a section of its own, and its fix removed it, which put that section's settings under the heading before it. The plugin's name is compared whole, so for a plugin named "Style Settings" a "Style" heading is no longer reported and removed. "settings" or "options" as what a verb acts on, as in "Export and import settings" or "Reset all settings", is no longer reported ([#274](https://github.com/obsidianmd/eslint-plugin/pull/274)).

## [0.5.1] - 2026-11-06

Fixes for findings on correct code, and for fixes and suggestions that changed what correct
code does, found by linting 600 community plugins with 0.5.0. Most projects see fewer findings:
on those plugins, 0.5.1 reports about 16% fewer, and `no-unsupported-api` drops nearly half of
0.5.0's findings before adding the new ones below. New findings come from `prefer-instanceof`, which
now reports `e.target instanceof HTMLElement` and similar checks of an event's target: they are
false for an element of a popout window, and from `no-unsupported-api`, which now checks the APIs
without a `@since`, such as `activeDocument` (0.15.0) and `el.setCssProps()` (1.1.7), against
the first typings that declare them, from every version in the history of the obsidian-api
repository. `validate-manifest` checks the plugin `id` only with
the new `checkId` option.

### Fixed

- `prefer-active-doc` no longer reports `document` in a listener on the main window's `document` or `window`, such as `this.registerDomEvent(document, "visibilitychange", () => document.visibilityState …)` or a `const` handler only ever added to and removed from `window`, where it is the document of the window whose event is handled. It offers no suggestion where `document` is a listener's target, as in `registerDomEvent(document, …)` or `document.removeEventListener()`: `activeDocument` there attached the listener to whichever window had focus, and a removal could name another document than the addition. Also found in a sweep of 600 plugins, for code that is correct, or a suggestion that would move the bug to another window:
  - Not reported: `document` as the other choice to `activeDocument` (`requireApiVersion("0.15.0") ? activeDocument : document`, `activeDocument ?? document`); listed with other documents (`[document, ...popoutDocuments]`, `new Set([document, activeDocument])`); and a lookup of UI only the main window has, by a class such as `status-bar`, `workspace-ribbon`, `side-dock-ribbon`, `mod-left-split` or `mod-right-split`, which a popout window lacks.
  - No suggestion where `document` is handed on as a value (an argument, an array element, a property's value, assigned, a default, a field's value or returned), in a function that compares a document with `document`, for `document.dispatchEvent()` (a plugin's event bus, whose listeners stay on the main document), for `document.body.contains(el)`, or for an element looked up to be removed (`document.getElementById("my-style")?.remove()`).
  - A change to the main window's `<body>`, `<html>` or `<head>`, such as `document.body.classList.add()`, `document.documentElement.style.setProperty()` or `document.head.appendChild(style)`, is reported with its own message and no suggestion: with `activeDocument`, a class added in one window could be removed from another. The message says to make the change, and undo it, in each window's document.
  - `document.contains(el)` suggests `el.isConnected`, with type information and where `el` is a `Node` that is never `null` or `undefined`, instead of `activeDocument`, which could check another window than the node's ([#239](https://github.com/obsidianmd/eslint-plugin/pull/239)).
- `prefer-window-timers`, `no-global-this` and `prefer-instanceof` no longer report or rewrite code that is correct as it is, ([#241](https://github.com/obsidianmd/eslint-plugin/pull/241)):
  - `prefer-window-timers` no longer reports `activeWindow.requestAnimationFrame()` and `activeWindow.cancelAnimationFrame()`. Fixed to `window.`, the callback waited while the main window was minimized.
  - Files named `*-worker.*` or `*_worker.*`, such as `bergamot-translator-worker.js`, are worker files, like `*.worker.*`: the recommended config switches the window-only rules off for them and gives them the worker globals. In a file of Emscripten output, which reads `ENVIRONMENT_IS_WORKER` or `ENVIRONMENT_IS_NODE`, `prefer-window-timers` and `no-global-this` offer suggestions instead of fixes, and `prefer-active-doc` offers none.
  - `no-global-this` no longer rewrites a read of a global only the project declares, such as `global.DEFAULT_APP_KEY` with `declare global { var DEFAULT_APP_KEY: string }`. A bundler's `define` replaces `global.DEFAULT_APP_KEY` but not `window.DEFAULT_APP_KEY`, which was `undefined` at runtime.
  - `prefer-instanceof` no longer reports a check against a constructor kept in a `const` from the node's own window, as in `const Ctor = el.ownerDocument.defaultView?.HTMLElement`, nor `instanceof` inside an `instanceOf()` polyfill, which the fix made call itself without end. It matches only the DOM's own `Node` and `UIEvent`, so React's synthetic events no longer get a suggestion that throws.
- DOM and settings-tab rules no longer report these correct patterns, and `--fix` no longer changes what such code does ([#242](https://github.com/obsidianmd/eslint-plugin/pull/242)):
  - `no-static-styles-assignment` reports a `setCssStyles()` or `setCssProps()` property only for a fixed value, as for `el.style.x = …`, so `` setCssStyles({ top: `${y}px` }) `` is no longer reported (a 0.5.0 regression), and at that property. Clearing a style is not reported: `""` or `null` assigned, passed to `setProperty()` or `setAttribute("style", …)`, or given in `setCssStyles()`. `style.setProperty("--name", …)` is allowed for any value, like custom properties in `setCssProps()`.
  - `prefer-create-el` does not report code inside a function, method or property named after one of the helpers, such as a polyfill (`window.createDiv = …`, `Element.prototype.createEl = …`) or a fake's `createSpan() { return this.createEl("span"); }`, where `--fix` made it call itself. `activeDocument.createElement()` and `doc.createElement()` are no longer reported when the window type has no DOM helpers, as with Obsidian's own types: the `activeWindow.createEl()` and `doc.win.createEl()` suggestions did not compile ([#240](https://github.com/obsidianmd/eslint-plugin/issues/240)).
  - `no-forbidden-elements` does not report a `<style>` or `<link>` created in a shadow root (`attachShadow()`, `shadowRoot`), which `styles.css` does not reach.
  - `settings-tab/no-manual-html-headings` reports only headings created on the tab's `containerEl`, not those in a container of the plugin's own, a setting's name or description, or a `Notice` fragment. A heading without text, such as a spacer, is reported without a fix, and one on a parameter named `containerEl` gets a suggestion rather than a fix.
  - `settings-tab/no-problematic-settings-headings` matches "settings" and "options" as whole words and names the word it found. It reports "General" and the plugin's name only when they are the whole heading, apart from "settings" or "options", so `--fix` no longer deletes a heading such as "Inline Numerals" in a plugin named Numerals.
- `no-unsupported-api` no longer reports a member that earlier `obsidian` typings had before its `@since`, in a form the use fits: the `@since` of many members names the release that last changed them. `setDisabled(true)` (`@since 1.2.3`), `Menu.addItem()` (0.15.3), `getLeaf(false)` (0.16.0) and `revealLeaf(leaf);` (1.7.2) are in the 0.10.3, 0.9.12, 0.9.7 and 0.9.7 typings, and need those versions instead. A table built from every release on npm and every version in the history of the [obsidian-api](https://github.com/obsidianmd/obsidian-api) repository, from 0.9.7 on, records each member's signatures, and a call that needs a newer one is still reported at its `@since`, such as `getLeaf("tab")`, `setTooltip(text, options)` or `revealLeaf(leaf).then(…)`. The rule also accepts a feature check of a newer API (`typeof x.member === "function"`, `"member" in x`, `x.member?.()`, `x.member &&`) and no longer reports the check itself, allows newer APIs inside overrides of methods only newer Obsidian calls (`getSettingDefinitions()`, `onPaneMenu()` and others), and no longer reports `Plugin.settings`, which plugins assign themselves ([#243](https://github.com/obsidianmd/eslint-plugin/pull/243)).
- `no-misused-promises` no longer reports the sample plugin's `async onload()` in a class extending `Plugin` with `obsidian` typings older than 1.7.2, which declare no `Plugin.onload`; 1.7.2 and later declare it as returning `Promise<void> | void`. `async onunload()` is still reported ([#244](https://github.com/obsidianmd/eslint-plugin/pull/244)).
- `no-nodejs-modules` accepts `Platform.isDesktopApp`, `!Platform.isMobile` and `!Platform.isMobileApp` wherever it accepts `Platform.isDesktop`, and the negations for early exits, which count anywhere before the call, not only as a function's first statement. It also no longer reports a `require()` in a `try` block with a `catch`, an awaited `import()` there, an optional call such as `window.require?.("fs")`, or anything in a `.d.ts` file. 0.5.0 started checking `window.require()`, which reported such code in plugins including Obsidian's own Importer ([#244](https://github.com/obsidianmd/eslint-plugin/pull/244)).
- False positives, and suggestions that changed what the code does, found by running 0.5.0 over 600 community plugins ([#246](https://github.com/obsidianmd/eslint-plugin/pull/246)):
  - `editor-drop-paste` reports only a handler that writes to its editor (`replaceSelection()`, `replaceRange()`, `setValue()`, `transaction()`, `editor.cm.dispatch()` and the like) or calls `evt.preventDefault()`. A handler that only observes the paste or drop, where `preventDefault()` would cancel Obsidian's own insertion, and one that passes `evt` to another function, are no longer reported.
  - `prefer-file-manager-trash-file` no longer suggests `trashFile()` for `vault.delete()`, which is often a deliberate permanent delete of the plugin's own files. It no longer reports a call whose second argument is not a literal, such as `vault.trash(file, this.settings.useSystemTrash)`, a call in an `if`/`else if`, `switch` or `?:` whose branches delete in different ways (the plugin's own setting for where deleted files go), or anything below `minAppVersion` 1.6.6, where there is no `trashFile()`.
  - `prefer-get-language` and `prefer-abstract-input-suggest` report nothing below `minAppVersion` 1.8.7 and 1.4.10, where `getLanguage()` and `AbstractInputSuggest` do not exist yet. `prefer-abstract-input-suggest` takes a `minAppVersion` option for this, as the other two do.
  - `detach-leaves` reports, and fixes, only the `onunload()` of a class that extends Obsidian's `Plugin`, directly, through classes of the same file or, with type information, through any class. The autofix removed the call from a `Component` that detaches the leaves of a view type it then unregisters.
  - `no-tfile-tfolder-cast` no longer reports an assertion that only removes `null` or `undefined`, such as `getActiveFile() as TFile` or `(TFile | null)[]` as `TFile[]`, nor the result of `find()`, `findLast()` or `filter()` whose callback tests `instanceof` of the asserted type, as in `children.find((c) => c instanceof TFile && c.extension === "md") as TFile | undefined`.
  - `object-assign` no longer reports a variable of the same function that holds an object made there, as in `const defaultOptions = new OptionsClass(); return Object.assign(defaultOptions, options);`, and offers no `{}` suggestion where the target is a class instance, which the copy would turn into a plain object.
  - `commands/no-default-hotkeys` no longer reports `hotkeys: []`, which sets no hotkey.
  - `commands/no-plugin-id-in-command-id` reports the plugin ID only where it starts the command ID, as a namespace; elsewhere, as in `show-calendar-view` of the plugin `calendar`, it names what the command acts on.
  - `commands/no-command-in-command-name` and `commands/no-command-in-command-id` report "command" only as a redundant label: with a separator or in brackets at the start or the end ("Command: open note"), or as the last word after a name that reads without it ("Open settings command"). "command" as what the command acts on, as in "Copy URI for command", "Raw command", "Run command", `copy-command-id` or `open-command-selector`, is no longer reported, and every name reported has a suggestion that leaves a name that reads.
  - `commands/no-plugin-name-in-command-name` offers no suggestion where a lower-case word follows the plugin name after a space, as in "Zoom in" of the plugin "Zoom", which became "In".
  - The suggestions that rename a command ID say that `executeCommandById()` calls, `obsidian://` URIs and other plugins that use the old ID stop working, besides users' hotkeys.
  - `validate-license` no longer reports the sample plugin's `Dynalist Inc.` line in a license that also has another holder's copyright line: it is the upstream notice kept as attribution.
- `prefer-active-doc` reports `document` in an implementation of a DOM helper, such as a polyfill (`window.createDiv = () => document.createElement("div")`), which `prefer-create-el` leaves alone since #242; before, neither rule reported it ([#247](https://github.com/obsidianmd/eslint-plugin/pull/247)).
- `prefer-instanceof` and `prefer-create-el` no longer fix or suggest code that needs a newer Obsidian than the plugin's `minAppVersion` (the new `minAppVersion` option, else `manifest.json`), which `no-unsupported-api` would then report. `prefer-instanceof` reports nothing below 0.15.0, which has no popout windows, and reports without a fix or a suggestion below 0.15.3, which first declares `instanceOf()` and `targetNode`. `prefer-create-el` does not report a call whose replacement needs `createFragment()` (0.9.11), `createDiv()` or `createSpan()` (0.10.0), `createSvg()` (1.1.0), `activeWindow` (0.15.0) or a document's `win` (0.15.3) below that version, where the native call or `createEl()` is the right one. Where no version is known, the fixes are applied as before, and a suggestion says which version it needs ([#247](https://github.com/obsidianmd/eslint-plugin/pull/247)).

### Changed

- `no-unsupported-api` now checks the declarations of `obsidian.d.ts` that have no `@since`, which it skipped, against the first `obsidian` typings that declare them, from every release on npm and every version in the history of the obsidian-api repository, which starts at 0.9.7, before the first typings on npm (0.11.13), and has versions npm lacks, such as 0.12.6, 1.1.0, 1.1.7 and 1.5.1: 137 in 1.14.4, such as `normalizePath()` (0.9.11), `Menu` (0.9.12), `createDiv()` and `createSpan()` (0.10.0), `parseYaml()` (0.11.11), `activeWindow`, `activeDocument` and `HTMLElement.innerWidth` (0.15.0), `UIEvent.targetNode`, `Node.instanceOf`, `Node.doc` and `Node.win` (0.15.3), `createSvg()` (1.1.0), `HTMLElement.setCssStyles()`, `setCssProps()` and `nextFrame()` (1.1.7), `sleep()` (0.14.3), `Array.unique()` (0.14.4), `apiVersion` (0.13.21), `requestUrl()` (0.13.26; 0.16.0 with a URL string) and `Modal.setTitle()` (1.5.1). Expect new findings with a `minAppVersion` below those. Where the history cannot tell whether a call fits an older signature, as the older types are kept only as hashes, it counts as fitting, as does `null` or `undefined` the older type leaves out, so `scope.register([], "Enter", cb)` and `scope.register(null, null, cb)` need 0.10.3. Those in the first typings, 0.9.7, are still not reported, nor are a write to a property, a member a base class declared earlier (`FileView.navigation`, from `View`), a field of one of Obsidian's classes declared later than the class (`leaf.parent`, `modal.scope`, `this.app` in an `EditorSuggest`), members of the obsidian module's own interfaces (data such as `RequestUrlParam.url`) and of interfaces only obsidian.d.ts declares (options such as `DomElementInfo.placeholder`), names the plugin or lib.dom declares too, and uses behind a guard or feature check ([#247](https://github.com/obsidianmd/eslint-plugin/pull/247)).
- `prefer-instanceof` now reports `instanceof` on an event's `target`, `relatedTarget`, `currentTarget` or `srcElement`, such as `e.target instanceof HTMLElement`, which is false for a node of a popout window. Expect new warnings. They are never fixed; a suggestion of `e.targetNode?.instanceOf(…)` or `(e.relatedTarget as Node | null)?.instanceOf(…)` is offered only where it keeps the check's narrowing and the target cannot be a window ([#241](https://github.com/obsidianmd/eslint-plugin/pull/241)).
- `no-static-styles-assignment` reports a `setCssStyles()` or `setCssProps()` call at its first fixed-value property instead of at the call, so an `eslint-disable-next-line` comment above a call written over several lines may need to move ([#242](https://github.com/obsidianmd/eslint-plugin/pull/242)).
- `validate-manifest` checks the `id` (no "obsidian", not ending with "plugin") only with the new `checkId: true` option. A published plugin's id can never change, and the community scanner does not check it, so these were the findings that could never be acted on. `allowedWords.id` still applies with `checkId` ([#246](https://github.com/obsidianmd/eslint-plugin/pull/246)).
- Test files no longer get `no-forbidden-elements`, `no-static-styles-assignment`, `prefer-file-manager-trash-file`, `prefer-get-language`, `platform` or `rule-custom-message`'s `no-console`, besides the rules about code that runs in Obsidian they already skipped; `no-new-func` and the other security rules still apply. Test files now also include test runners' setup files and helpers (`**/*.setup.*`, `**/test-setup.*`, `**/setupTests.*`, `**/global-setup.*`, `**/*-global-setup.*`, `**/*.testing.*`, and `test-helpers/`, `test_helpers/`, `test-support/`, `test-utils/` and `test_utils/` directories). Tool configs and scripts, named like those the community scanner leaves out (`eslint.config.*`, `vite.config.*`, `vitest.config.*`, `jest.config.*`, `rollup.config.*` and other tools' configs, `.eslintrc.*`, `esbuild.*`, `version-bump.*` and `scripts/` directories), which got all of these rules before, now get every exemption test files get. Worker files no longer get `platform`. In a run over 600 community plugins, 256 of the 469 `no-nodejs-modules` findings and 1,055 of the 2,656 `no-console` ones came from these files. ([#245](https://github.com/obsidianmd/eslint-plugin/pull/245)).

### Documentation

- Upgrading to 0.5.1: what changes from 0.5.0, linked from the README.
- Common errors: a new entry for "… was included by allowDefaultProject but also was found in the project service", and the "… was not found by the project service" entry names tool configs and tests outside the tsconfig ([#245](https://github.com/obsidianmd/eslint-plugin/pull/245)).
- Upgrading to 0.5.0 and Common errors: a block of rule overrides without `files` now also reaches `manifest.json` and `LICENSE`, where the `@typescript-eslint` and `import` plugins are not registered, and fails with `could not find plugin "@typescript-eslint"`. Scope it to your source ([#238](https://github.com/obsidianmd/eslint-plugin/pull/238)).

## [0.5.0] - 2026-11-04

Upgrading from 0.4.x? The breaking changes below each have a fix in
[Upgrading to 0.5.0](docs/configuration.md#upgrading-to-050). Rules that never ran
before now do, so expect new findings, mostly from `prefer-active-doc` and from
`validate-manifest` on a published id containing "obsidian", which its `allowedWords`
option accepts. Test files no longer get the rules about code that runs in Obsidian, and
`no-undef` no longer runs on TypeScript files, so most projects see fewer findings overall.
Where a rewrite could break type-checking, `--fix` now leaves it to an editor suggestion, and
rules that only reported, `prefer-active-doc` among them, now offer one.

### Changed

- **Breaking:** Requires Node.js 20.19+, 22.13+ or 24+; Node.js 18 is no longer supported ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203)).
- **Breaking:** Moved to `@eslint/json` 2. A project that also registers `@eslint/json` itself for `package.json` or `manifest.json` must use 2.x, or ESLint reports `Cannot redefine plugin "json"` ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203), [#222](https://github.com/obsidianmd/eslint-plugin/pull/222)).
- **Breaking:** ESLint's core JS rules now apply only to JS and TS files, not to `package.json`, `manifest.json`, `LICENSE`, locale JSON or other files. Files linted with your own parser, such as `.vue` or `.svelte`, need `js.configs.recommended` added for them ([#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- **Breaking:** `ui/sentence-case` is off in `recommended` and `recommendedWithLocalesEn`, as 0.3.0 intended. Opt in with `["warn", { enforceCamelCaseLower: true }]` ([#208](https://github.com/obsidianmd/eslint-plugin/pull/208)).
- **Breaking:** `@typescript-eslint/no-misused-promises` is replaced by `obsidianmd/no-misused-promises`. `eslint-disable` comments for the old rule still suppress the new one, but ESLint reports them as unused, so rename them ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- **Breaking:** `validate-manifest` and `validate-license` now actually run on `manifest.json` and `LICENSE`, and `prefer-active-doc` warns in `recommended`, so existing projects can see new warnings ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#187](https://github.com/obsidianmd/eslint-plugin/pull/187)).
- **Breaking:** Because `manifest.json` and `LICENSE` are now linted, a type-checked config you add without `files` (for example a top-level `...tseslint.configs.strictTypeChecked`) aborts the run on them with "You have used a rule which requires type information", as it already did on `package.json`. Scope it to your TypeScript files ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- **Breaking:** `obsidian` is no longer installed for you; it was supplied only by accident. Install it in your project (sample-plugin projects already have it), or `no-unsupported-api` reports nothing ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201)).
- **Breaking:** The core JS rules come from the installed ESLint, so ESLint 10 gets ESLint 10's recommended set, which adds `no-unassigned-vars`, `no-useless-assignment` and `preserve-caught-error`; ESLint 9 gets the same rules as before. `@eslint/js` is no longer installed for you: if your config imports it, add it to your `devDependencies` (sample-plugin projects already have it) ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- **Breaking:** In a desktop-only repository, raising `no-nodejs-modules`' severity no longer turns it back on; use `["error", { isDesktopOnly: false }]` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- Test files (the files the community scanner leaves out as tests, such as `**/*.{test,spec}.*` and anything under `test/`, `tests/`, `__tests__/`, `mocks/` or `__mocks__/`, and end-to-end tests: `**/*.e2e.*`, anything under `e2e/` or `e2e-tests/`, and WebdriverIO and Playwright configs) no longer get the rules about code that runs in Obsidian: `no-global-this`, `prefer-active-doc`, `prefer-create-el`, `prefer-instanceof`, `prefer-window-timers`, `no-nodejs-modules`, `no-tfile-tfolder-cast`, `hardcoded-config-path`, `no-unsupported-api` and `regex-lookbehind`. Tests run in Node, not in Obsidian or on iOS, and in popular plugins most of these rules' findings came from them. Security rules still apply ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217), [#219](https://github.com/obsidianmd/eslint-plugin/pull/219), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Only a literal `"isDesktopOnly": true` in `manifest.json` counts as desktop-only, for `no-nodejs-modules`, `regex-lookbehind` and the Node.js globals alike; a malformed value such as `"false"` no longer switches the checks off ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `@typescript-eslint/no-require-imports` is off and `require` is a readonly global again, as in 0.2.9, so a disable comment for it is now reported as unused ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- `no-unused-vars` ignores `_`-prefixed caught errors and destructured array elements again, as in 0.2.9; a dead `_x` variable is still reported ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- **Breaking:** `ruleConfigs` now hold exactly the obsidianmd rules the recommended config sets for JS and TS files: `no-nodejs-modules`, `rule-custom-message` and `no-misused-promises` added; `@typescript-eslint/no-deprecated` moved out, and so did `validate-manifest` and `validate-license`, which lint `manifest.json` and `LICENSE` in blocks of their own. If you use `ruleConfigs` without the recommended config, enable `@typescript-eslint/no-deprecated` yourself ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- The exported `configs` are typed with your own ESLint's `Linter.Config[]`, which its `defineConfig` accepts ([#203](https://github.com/obsidianmd/eslint-plugin/pull/203)).
- Web worker files (`**/*.worker.*`, `**/workers/**`) no longer get the window-only rules, whose `globalThis` → `window` and `setTimeout()` → `window.setTimeout()` autofixes broke them, and get worker globals instead of the browser and Obsidian ones; security rules still apply ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Peer dependencies are ranges: `eslint >=9.19.0`, `typescript >=4.8.4` (before, a dependency pinned to 5.4.5) and `typescript-eslint ^8.35.1`. `@eslint/js`, `@eslint/json` and `obsidian` are no longer peers, and `@eslint/json` and `eslint-plugin-depend` use caret ranges so a project using them directly shares one copy ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201), [#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- `typescript-eslint` 8.70.1 or later is recommended: it fixes a `no-unnecessary-type-assertion` false positive on an empty object asserted to a `Record` type alias (typescript-eslint/typescript-eslint#12856). The minimum stays 8.35.1, because a higher one makes npm install a second copy next to an older pinned one and fails with `Cannot redefine plugin "@typescript-eslint"` ([#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- `no-undef` is off for TypeScript files, as typescript-eslint advises: the compiler reports undefined names itself, and `no-undef` misreported globals declared in a `.d.ts` or `declare global` block. JavaScript files keep it at `warn` ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- CI also runs `check:eslint-docs` on every pull request, and the build and docs workflows declare the token permissions they need ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- CI builds every pull request, including those into a release branch, and adds an ESLint 10 job. The publish workflow checks that the release tag matches `package.json`, publishes from a job that does not install dependencies, and publishes a prerelease under the `next` tag. The workflows' actions are pinned to commits, and a Dependabot config updates only the lockfile and the actions ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).

### Added

- Editor suggestions for rules that only reported. They are offered one at a time in the editor, never applied by `--fix`, and each says what changes ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)):
  - `prefer-active-doc` suggests `activeDocument` in place of `document`, except where it would be shadowed or undeclared, in a worker file, after a check for the environment, or where `document` is compared or kept for later.
  - `prefer-file-manager-trash-file` suggests `fileManager.trashFile()` on the same app, which follows the user's "Deleted files" setting, in place of `vault.delete()` and `vault.trash()`.
  - `prefer-get-language` suggests `getLanguage()`, importing it from `obsidian`. It returns `"en"` rather than `null` when no language is set.
  - `object-assign` suggests `Object.assign({}, A, b)` where the result is used, so that `A` is no longer changed.
  - `vault/iterate` suggests `getFileByPath(p)`, which returns `null` rather than `undefined` when there is no such file.
  - `commands/no-plugin-id-in-command-id` and `commands/no-command-in-command-id` suggest the ID without the plugin ID or the word "command", unless nothing would be left or another command in the file has that ID. Renaming an ID drops the hotkeys users set for it.
  - `commands/no-plugin-name-in-command-name` and `commands/no-command-in-command-name` suggest the name without the plugin name or "command" at its start or end, with the separator or brackets around it.
  - `commands/no-default-hotkeys` suggests removing the `hotkeys` property, keeping the object's layout and comments.
  - A suggestion that needs a newer Obsidian than the plugin's `minAppVersion` (`activeDocument` 0.15.0, `getFileByPath()` 1.5.7, `trashFile()` 1.6.6, `getLanguage()` 1.8.7) is not offered. Where the version is unknown, its description names the version.
- `minAppVersion` option for `prefer-active-doc`, `prefer-file-manager-trash-file`, `prefer-get-language` and `vault/iterate`, which overrides `manifest.json` as it does for `no-unsupported-api` ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `obsidianmd.withCustomMessages(rule, messages)`, which returns a plugin's rule with its messages replaced, matched as in `rule-custom-message`. Register the result in a plugin of your own and configure it with the rule's own options; its fixes, suggestions and type information keep working. Its types are exported as `CustomMessages` and `WrappableRule`. See [Wrapping a plugin's rule](docs/rules/rule-custom-message.md#wrapping-a-plugins-rule) ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `obsidianmd/no-misused-promises`: typescript-eslint's rule without Obsidian's chaining `then` (`Setting`, `BaseComponent`) counted as a Promise ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- `isDesktopOnly` option for `no-nodejs-modules`, for repositories without a `manifest.json` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `validate-manifest` options for findings that can never be acted on, such as a published id containing "obsidian": `allowedWords` stops checking for "obsidian" or "plugin" in the `id`, `name` or `description`, matched case-insensitively, and `ignore` skips the `noForbiddenWords` or `descriptionFormat` checks ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- `obsidianmd/plain-text` language, which reads `LICENSE`, `LICENSE.md` and `LICENSE.txt` ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- `requireApiVersion` guards accept a constant version, and any argument whose type is a single version string or a union of them, which proves its lowest member ([#169](https://github.com/obsidianmd/eslint-plugin/pull/169), [#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- `no-unsupported-api` recognises early exits (`if (!requireApiVersion(v)) return;`), the `else` of a negated check, `!check || api`, a `const` holding the check's result, and `&&`/`||` combinations of checks ([#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- This changelog ([#188](https://github.com/obsidianmd/eslint-plugin/pull/188)).

### Removed

- `rule-custom-message`'s `rule:` option, for wrapping a rule passed as an object. It never worked on ESLint 9 or 10, which copy rule options with `structuredClone` and cannot copy a rule's functions, so a config using it stopped ESLint before linting. Use `obsidianmd.withCustomMessages()` for a plugin's rule ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- The unused `eslint-plugin-security`, `eslint-plugin-json-schema-validator` and `@typescript-eslint/types` dependencies, and the build-only `@types/eslint` and `@types/node`, which are no longer installed for you ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201), [#212](https://github.com/obsidianmd/eslint-plugin/pull/212)).
- The hand-written root `index.d.ts`, which was never published; the package's types are unchanged ([#206](https://github.com/obsidianmd/eslint-plugin/pull/206)).
- The compiled tests and the non-working `eslint-plugin-obsidian` executable from the published package: 0.4.2 had 223 files and 495 kB unpacked; 0.5.0 has 147 files and 628 kB, all of them the plugin itself ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).

### Fixed

- `prefer-instanceof` no longer reports a check against a constructor read from a window object, such as `focus instanceof el.ownerDocument.defaultView!.HTMLElement` or `evt instanceof win.MouseEvent`, which is already cross-window safe. Checks against `window.HTMLElement` or `activeWindow.HTMLElement` are still reported ([#232](https://github.com/obsidianmd/eslint-plugin/pull/232)).
- `ui/sentence-case-locale-module` reports each string once when the module exports the same object more than once, as in `export { strings }; export default strings;` ([#232](https://github.com/obsidianmd/eslint-plugin/pull/232)).
- `ui/sentence-case`, `ui/sentence-case-locale-module` and `ui/sentence-case-json` judge a template literal by its value, and their fix changes only the case of letters, keeping the quotes and every escape: `` `Open Settings\tNow` `` is fixed to `` `Open settings\tnow` ``, where it became `"Open settings\\tNow"`, with a backslash and a `t`. Text in which a letter that must change is written as an escape is reported without a fix, and the fix keeps an `as`, `satisfies` or `!` after the string (`'Open Daily Note' as const`) ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- Sentence-case rules: a mixed-case acronym keeps its casing (`Sign in with OAuth` is no longer fixed to `OAUTH`). Brands that are ordinary words, "windows", "cursor", "slack", "x", "notion" and "react", are left alone in lower case (`Close all windows`) ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- Sentence-case rules: a number before the first word takes its place (`2 files selected` passes, `2 Files selected` is reported), and a word that starts with a digit keeps its letters anywhere (`Open 3D view`, `Export in 4K`). The first word after a bullet, punctuation, quotes or a list number keeps its case, as do a leading label and the word after it (`- Item`, `→ Next`, `"Open" settings`, `[Beta] Feature`, `(Beta) Sync`). The word after `e.g.`, `i.e.`, `etc.`, `vs.` and similar may take either case ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- Sentence-case rules: date and time formats keep their casing (`hh:mm A`, `MMM D, YYYY`, `dddd, MMMM Do`), and an emoji with a variation selector or keycap no longer counts as the first word (`⚠️ Open settings`). A version number or a brand with a dot no longer makes text look like a path, so `Version 1.2 Released` and `Install Node.js First` are now reported, and dot-folders such as `.obsidian/plugins` are skipped ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `ui/sentence-case` no longer checks `el.dataset.title = …`, `x.aria_label = …`, `el[title] = …` or `el.textContent += …`, and with type information checks a `title` or `placeholder` assignment only on an element, the document or an untyped value (`frontmatter.title = "Untitled Note"` is no longer reported) ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `ui/sentence-case-json` and `ui/sentence-case-locale-module` decide whether a file is an English locale file from its path inside ESLint's working directory, so a folder named `en` above the project (`C:\Users\en\plugin\src\settings.json`) no longer makes every file an English locale file ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-global-this` no longer autofixes a check for the window into one that throws where there is none. `typeof globalThis['document']`, `` `document` in globalThis ``, `typeof (globalThis as any).document`, `!globalThis.window` and `globalThis.document?.body` are reported only, and so are writes that define the window, such as `global.window = dom.window` in a jsdom setup ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-global-this` only suggests, and no longer autofixes, a probe of the global object (`typeof globalThis.crypto`, `"requestIdleCallback" in globalThis`), which would throw in a worker or in Node, and a write to it (`globalThis.foo = 1`). The code such a probe guards gets a suggestion too, as in `if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();`: with only the call fixed, TypeScript reported the probe as always true (TS2774) ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227), [#229](https://github.com/obsidianmd/eslint-plugin/pull/229)).
- `no-global-this` and `prefer-window-timers` no longer autofix in code that may run without a window when the check has a comment or unusual spacing (`typeof /* no DOM */ window === 'undefined'`, `"window"in globalThis`). They also recognise more checks, and report only without a fix after them: `!globalThis.window`, `globalThis.document === undefined`, worker checks such as `typeof importScripts === "function"`, a `catch` after code that reads the window, and a constant or function in the same file that holds a check (`const hasWindow = typeof window !== "undefined"`). After a check they can't follow, such as an imported `isBrowser` or `env.isNode`, they suggest instead of fixing ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-unsupported-api`: each overload of a method has its own version, and a call needs the version of the overload it calls. `app.workspace.on("files-menu", …)` is now reported below 1.4.10 and `on("url-menu", …)` below 1.5.1, where every `on()` counted as 0.10.2, and an event name picks its overload even when the callback's types fit none. `setting.setName("Name")` and `workspace.duplicateLeaf(leaf)` are no longer reported as needing 0.12.16 and 1.1.0 ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-unsupported-api`: where an overload's `@since` names the release that changed its signature, the first published typings that had the overload decide: `on("editor-change", …)` (`@since 1.1.1`) needs 0.12.17, and `on("editor-menu", …)` needs 0.12.11 ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-nodejs-modules`: a `Platform.isDesktop` guard at the start of a function no longer covers its default parameters, which run before the body (`function load(fs = require("fs")) { if (!Platform.isDesktop) return; … }` is reported). `Platform[key]` with a variable key no longer counts as a guard; `Platform["isDesktop"]` does ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `platform`, `prefer-get-language` and `prefer-file-manager-trash-file` read a computed key only when it is a string: `navigator["userAgent"]` and `vault["delete"](file)` are now reported, and `navigator[userAgent]` with `const userAgent = "appVersion"` no longer is ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `vault/iterate` reports `getFiles().find(f => f?.path === p)` and `getFiles().find(({ path }) => path === p)` ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-view-references-in-plugin` and `no-plugin-as-component` recognise generic classes: a view or plugin class with type parameters, or one whose base class is generic (`extends StateView<State>`), was never reported. On TypeScript 4.8 to 5.0 they also recognise `this` in a plugin class, which they missed there ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `prefer-instanceof` recognises generic classes too: `el instanceof HTMLDivElement` was not reported when `el` is an instance of a generic Node or UIEvent class, or of a class whose base class is generic (`class CountEl extends DataEl<number>`). As for any other Node, it is fixed only where the type has `.instanceOf()`, and suggested otherwise ([#228](https://github.com/obsidianmd/eslint-plugin/pull/228)).
- `detach-leaves` no longer stops the lint run with a TypeError under ESLint's default parser (JavaScript files with `ruleConfigs.recommended`). It reports a quoted `"onunload"()` and `["onunload"]()`, no longer reports `[onunload]()` named by another variable, and keeps the method when another member's computed name may be `onunload` ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `settings-tab/prefer-update-over-display` no longer autofixes `this.display()` to `this.update()` inside `["update"]()` or `[key]()` with `const key = "update"`, where it would call itself. `settings-tab/require-display`, `prefer-setting-definitions` and `no-deprecated-display` find `["display"]()` and `["getSettingDefinitions"]()` ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `settings-tab/no-deprecated-display` no longer reports `display()` when `getSettingDefinitions()` returns nothing (`{}`, `{ return; }`, `{ return null; }`), as Obsidian still calls `display()` then ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `settings-tab/no-manual-html-headings` no longer autofixes to `new Setting(this.containerEl)` when, with type information, `Setting`'s constructor doesn't take the container alone. Its suggestion keeps a `cls` option as `.setClass(cls)`, with type information, and its description names whatever it drops ("dropping the `attr` option and the callback"). `no-problematic-settings-headings`' suggestion says it removes the whole heading setting, `setDesc()` included ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `rule-custom-message` and `withCustomMessages()` stop with an error, naming the rule in `rule-custom-message`, when `messages` is a `Map` or another object that isn't a plain mapping (`messages: new Map([...])`), where every report of the wrapped rule was silently dropped ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- The recommended config's `no-restricted-globals` no longer reports a global named `warn` (`warn("x")` gave "Unexpected use of 'warn'"); a stray entry in its list made it restricted since 0.1.0 ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- A `manifest.json` saved with a UTF-8 byte order mark, as PowerShell 5.1 and some Windows editors write it, is read again. The rules lost `isDesktopOnly`, `minAppVersion`, the plugin id and name, and each run printed a parse error ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `plugin.meta` gives this plugin's name and version when it runs from a source checkout inside another project, instead of that project's `package.json` ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- The published `rules/ui/index.d.ts` no longer names a type by a `node_modules/…` path that no installed copy resolves ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-misused-promises` calls the type checker directly rather than through a Proxy, which made it 5% slower than `@typescript-eslint/no-misused-promises` across the community plugins and up to 28% on a large one ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `prefer-active-doc`, `no-global-this`, `prefer-window-timers` and `prefer-create-el` take linear time in a file with many variables, references or statements, such as a bundle: on a file with 30,000 variables and 5,000 references they took 2.4 to 14.7 s each, and now take under 130 ms. `no-unsupported-api` takes linear time in a long statement list (16,000 calls of newer APIs in one function took 3.4 s, now 0.3 s), and the sentence-case rules on long text, where some 100,000-character strings took 1 to 20 s ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `no-sample-code` reports and fixes only the sample's own click handler, whose body is just the sample's `console.log("click", evt)` or, in the current template, `new Notice("Click")`. `--fix` no longer deletes a click handler that does other work, and a sample interval whose delay or arguments make a call is reported without a fix ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `no-forbidden-elements` also reports `createEl()` on any receiver, such as `containerEl.createDiv().createEl("style")`, and tag names written as template literals without expressions, such as `` document.createElement(`style`) `` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `no-static-styles-assignment` checks unquoted keys in `setCssStyles()` and `setCssProps()` like quoted ones, and template literals without expressions like strings. Its message names computed keys (`element.style.color`, not `element.style.undefined`) ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- Implied `eval` is reported once in TypeScript files: core `no-implied-eval` is off there, where `@typescript-eslint/no-implied-eval` reports it, and JavaScript files keep the core rule ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `settings-tab/no-manual-html-headings` and `settings-tab/no-problematic-settings-headings` go by the nearest enclosing class: a class nested in a settings tab no longer stops the check for the rest of the tab, a helper class inside a tab is not checked as a tab, and tabs written as class expressions are checked. `no-problematic-settings-headings` checks the heading's last `setName()`, also when it comes after `setHeading()` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `vault/iterate` also reports the path on the right (`x === f.path`), `==`, a block-body arrow that only returns the comparison, and a `function` predicate. It no longer reports predicates that are not lookups by a known path, such as `f => other.path === target`, or `async` ones, and its message no longer ends in a line break ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `prefer-create-el` reports calls on a document that may be null or undefined, such as `doc?.createElement("p")` with `doc: Document | null` or `view?.doc.createElement("p")`, and fixes them to `doc?.win.createEl("p")` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `prefer-instanceof` reports values that may be null under `strictNullChecks`, such as `el.parentElement instanceof HTMLElement`, with the `?.instanceOf()` suggestion ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `prefer-file-manager-trash-file` reports a `Vault` that may be null, such as `vault?.delete(file)` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `no-unsupported-api` checks the superclass of a class expression, such as `const S = class extends AbstractInputSuggest<string> {}`. It rebuilds its cached `@since` map when this plugin's version changes, not only when `obsidian`'s does ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `no-nodejs-modules` also reports `window.require()`, `globalThis.require()`, `self.require()`, `global.require()` and `activeWindow.require()` of Node.js modules, with the same guards as `require()`. It counts the `else` of `if (!Platform.isDesktop)`, the second branch of `!Platform.isDesktop ? … : …` and the right of `!Platform.isDesktop || …` as guarded ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `editor-drop-paste` finds `evt.defaultPrevented` and `evt.preventDefault()` in the handler's code rather than its text, so comments, strings and longer names such as `type.defaultPrevented` no longer count, and `evt?.preventDefault()` does ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- The command rules also check quoted keys (`"id"`, `"name"`, `"hotkeys"`); a computed key such as `[hotkeys]` no longer counts as that property ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `ui/sentence-case` checks the text options of `createDiv()`, `createSpan()` and `createSvg()` like `createEl()`'s, also when the options have a type assertion. `ui/sentence-case-locale-module` checks a default export written with `as const`, `satisfies` or `<T>` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `recommendedWithLocalesEn` lints exactly the files the locale rules check: names and directories such as `en-US/` and `en.messages.json`, with `en` in any case, are included, and `english.json`, `entries.json` and `env.json` no longer are ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `sample-names` reports the sample's names on type aliases and class expressions ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `validate-manifest` accepts an empty `fundingUrl` (`""`, `{}`, or an object with an empty URL), as the community review does ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- `eslint --fix-dry-run` with `parserOptions.project` no longer type-checks later fix passes in a program of the fixed file alone, without your `tsconfig.json`, where TypeScript 6 crashed with "Cannot read properties of undefined (reading 'includes')". The recommended config turns off typescript-eslint's single-run mode there, as typescript-eslint itself does for `--fix` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `rule-custom-message` no longer aborts the lint run when the wrapped rule's report has a fix or only a location. It passes fixes and suggestions on, fills message placeholders the way ESLint does, and runs a wrapped core rule with its default options, so `no-console` or `prefer-const` works without `options: [{}]`. The warning for a rule name that is not a core rule now points to `obsidianmd.withCustomMessages()` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `sample-names` reports `mySetting` in interfaces and type literals, which it never matched ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `no-nodejs-modules` no longer reports type-only imports and exports (`import type`, imports whose specifiers are all `type`, `export type … from`), which never load the module. It now reports `export … from "fs"`, `export * from "fs"` and `import fs = require("fs")`, which do ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- The command rules match whole words. `no-plugin-name-in-command-name` no longer reports "Open digital garden" for a plugin named "Git", and `no-command-in-command-name` no longer reports "Open Commander". In ids, `no-command-in-command-id` and `no-plugin-id-in-command-id` split words at separators such as `-`, `_` and `:` and at camelCase, so `open-commander` is no longer reported and `myPluginOpen` now is for the plugin `my-plugin` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `editor-drop-paste`'s message no longer says the `defaultPrevented` check must come first in the handler; the rule accepts it anywhere ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `object-assign` also reports property targets such as `this.defaults` and `Constants.DEFAULT_SETTINGS` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `no-tfile-tfolder-cast` also reports assertions to unions and arrays such as `as TFile | null` and `as TFile[]`, and no longer reports assertions that narrow nothing: `[] as TFile[]`, or, with type information, a value that already has the type ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `prefer-window-timers` also reports `cancelAnimationFrame()`, so `--fix` no longer moves `activeWindow.requestAnimationFrame()` to `window` and leaves its cancel behind; `no-global-this` fixes `globalThis.cancelAnimationFrame()` like `requestAnimationFrame()` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `hardcoded-config-path` also checks template literals such as `` `${base}/.obsidian/plugins` ``, and no longer reports `.obsidian` followed by a dot and a name or by a digit, such as `".obsidian.vimrc"` ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `detach-leaves` removes the call with its line, and removes an `onunload()` it leaves empty in a class that directly extends `Plugin`, so `--fix` no longer leaves an empty method that `no-empty-function` reports ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `prefer-active-doc` no longer reports `document` in `document.createElement()` and the other calls `prefer-create-el` reports in TypeScript files, which were reported by both rules. Where a comment turns `prefer-create-el` off for such a call, `prefer-active-doc` still reports it ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223), [#224](https://github.com/obsidianmd/eslint-plugin/pull/224)).
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
- `prefer-window-timers` autofixes only where `window`'s `number` timers cannot change a type: a discarded `setTimeout()`/`setInterval()` result, a `clearTimeout()`/`clearInterval()` argument known to be a number, and `requestAnimationFrame()`/`cancelAnimationFrame()`. Elsewhere it suggests the change, since a variable typed `NodeJS.Timeout` would fail `tsc` ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- `no-sample-code` no longer aborts the lint run on a callback that calls a plain function ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `no-forbidden-elements` also reports `<style>` and `<link>` elements created on `activeDocument`, `el.doc`, `ownerDocument` and with the global `createEl()` ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `no-static-styles-assignment` no longer aborts the lint run on `setCssStyles()` or `setCssProps()` without an argument ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `prefer-instanceof` keeps the parentheses around the checked value, so `(await getEl()) instanceof HTMLElement` is no longer rewritten to a different expression ([#219](https://github.com/obsidianmd/eslint-plugin/pull/219)).
- `prefer-create-el` no longer fixes `document.createElement("div")` to `createDiv()` where the file binds that helper's name itself (a function, variable, parameter or import named `createDiv`), since the call would reach that binding, recursing inside `function createDiv()`; it is reported without a fix instead ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- `validate-manifest` follows the community scanner's manifest review, so it no longer reports what the review accepts: `helpUrl` is allowed, a description may end with `!` or `?`, start with a lowercase letter, contain emoji or mention plugins, and an `id` may contain "plugin" as long as it does not end with it. It now also reports what the review does: a `name` with parts of "Obsidian", and a description that refers to itself or repeats the name ([#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- `validate-manifest` never ran: it was configured only for JS/TS files. It now runs on `manifest.json`, no longer reports ordinary punctuation and accented letters in descriptions, now reports an empty-string key, and no longer crashes on keys such as `constructor` ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191)).
- `validate-license` never ran either. It now runs on `LICENSE` files and recognises the standard MIT line (`Copyright (c) 2025 Name`, `©`, optional "by", CRLF) ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- `validate-license` reports the year only on the unchanged sample license (holder "Dynalist Inc."), so a GPL-family `LICENSE` (the FSF's own copyright line) and an older year in your own name are no longer reported ([#211](https://github.com/obsidianmd/eslint-plugin/pull/211)).
- English locale JSON (`en.json`, `en/**/*.json`) failed with "Unexpected token :" under `recommendedWithLocalesEn`; it is now read with the JSON language and `ui/sentence-case-json` runs ([#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- Core rules such as `no-irregular-whitespace` no longer abort the lint run on your own `json/json` blocks or on `LICENSE` ([#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#204](https://github.com/obsidianmd/eslint-plugin/pull/204)).
- `regex-lookbehind` reports negative lookbehinds in regex literals, and no longer reports escaped parentheses or lookbehind-like text in character classes ([#202](https://github.com/obsidianmd/eslint-plugin/pull/202)).
- `no-unused-vars` no longer reports `using` and `await using` declarations, with `typescript-eslint` 8.46.0 or later ([#199](https://github.com/obsidianmd/eslint-plugin/pull/199)).
- `no-nodejs-modules` no longer prints "Failed to load JSON file" when there is no `manifest.json` ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193)).
- `prefer-active-doc` false positives on `MathJax.document`, type positions, property names and local bindings named `document` ([#187](https://github.com/obsidianmd/eslint-plugin/pull/187)).
- `no-unsupported-api` no longer aborts the run on a version semver cannot parse, in a guard or in `minAppVersion`; a `minAppVersion` such as `"0.15"` reads as 0.15.0, and anything else is checked as 0.0.0 ([#169](https://github.com/obsidianmd/eslint-plugin/pull/169), [#205](https://github.com/obsidianmd/eslint-plugin/pull/205)).
- `prefer-create-el` no longer reports elements created in an iframe's document, where its suggestion would throw ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- `@typescript-eslint/no-deprecated` allows `caretRangeFromPoint`, the fallback before iOS 17.4 ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207)).
- Sentence-case rules keep URLs, date formats (`YYYY-MM-DD`), "REST" and example placeholder values as written, and the JSON and locale-module rules say what text they expect ([#208](https://github.com/obsidianmd/eslint-plugin/pull/208)).
- `no-misused-promises` no longer reports `Setting` chains in callbacks or `if (component)` ([#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- The plugin loads on ESLint 9.19 to 9.21: since 0.3.0 it imported `eslint/config`, which arrived in 9.22 ([#201](https://github.com/obsidianmd/eslint-plugin/pull/201)).
- In an `eslint.config.ts` on ESLint 9.19, `plugins: { obsidianmd }` type-checks: the plugin's `rules` were typed with `@eslint/core`'s rule type, which ESLint 9.19's `Rule.RuleModule` does not accept, and are now typed with your own ESLint's, like the configs. A rule wrapped with `obsidianmd.withCustomMessages()` fits it too, typescript-eslint's rules included ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Removed a misspelled `no-prototype-bultins` override that never applied; `no-prototype-builtins` stays at `error` ([#209](https://github.com/obsidianmd/eslint-plugin/pull/209)).
- `check:eslint-docs` passes on Windows checkouts (contributors) ([#200](https://github.com/obsidianmd/eslint-plugin/pull/200)).
- obsidianmd's JavaScript rules return nothing for files in other languages, so a type-aware one enabled without `files` (say, to raise its severity) no longer aborts the run on `LICENSE`, `manifest.json` or `package.json` ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `prefer-create-el` no longer autofixes `activeDocument.createElement()` to `activeWindow.createEl()` when `Window` does not declare the helper, which Obsidian's types do not, so the fix no longer breaks `tsc`; it is offered as a suggestion ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `vault/iterate` no longer claims to be autofixable; it never fixed anything ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `validate-license` rejects unknown options instead of silently ignoring a misspelled one ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- The published `dist/lib/manifest.d.ts` imported a `PluginManifest` type file the package never shipped; the type now lives in `lib/` and is published with it ([#213](https://github.com/obsidianmd/eslint-plugin/pull/213)).
- `no-global-this` no longer reports `global` or `globalThis` in types (`typeof globalThis`, `{ global: boolean }` in a type literal or interface) or as a class-member, import or export name, where its fix renamed keys and broke type-checking; a shorthand `{ globalThis }` gets the suggestion `{ globalThis: window }`, which keeps the key ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216), [#221](https://github.com/obsidianmd/eslint-plugin/pull/221)).
- `prefer-create-el` fixes `createElement()` and `createElementNS()` only for a tag name the DOM types know, so `createEl(tag)` with a `string`, a custom element or a deprecated tag (TS2345) is no longer written by `--fix`; those are reported without a fix or suggestion ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216)).
- `vault/iterate` also reports `getFiles().find()` by path through `this.app.vault`, `app.vault`, `plugin.app.vault` and `this.vault`, not only a bare `vault` ([#216](https://github.com/obsidianmd/eslint-plugin/pull/216)).

### Documentation

- Plugins written in JavaScript: why the TypeScript `parserOptions` block fails on them, the config without it, and how to turn the type-aware rules on with a `jsconfig.json`. Upgrading to 0.5.0 covers the sample plugin's config, the rules that add the most new errors, and the ESLint 10 install, and a new Known issues section lists what is not fixed in 0.5.0, including TypeScript 7, which `typescript-eslint` cannot use yet, and TypeScript 6's empty default `types` ([#230](https://github.com/obsidianmd/eslint-plugin/pull/230)).
- Common errors: "Cannot redefine plugin", including the second copy of `typescript-eslint` or `@eslint/json` that Yarn 1 installs next to an exact version pin ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `rule-custom-message`: with pnpm, add `@typescript-eslint/eslint-plugin` to your devDependencies before importing it ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- `prefer-window-timers` lists the window checks it and `no-global-this` recognise, and `configuration.md` says that `files` globs match by case on every system, so `License` and `Manifest.json` are not linted, also on Windows and macOS ([#227](https://github.com/obsidianmd/eslint-plugin/pull/227)).
- A check of all docs against the code before the release. Rule docs now mark the rules that need type information (💭), and the README lists the advanced topics, including `obsidianmd.withCustomMessages()` ([#225](https://github.com/obsidianmd/eslint-plugin/pull/225)).
- What npm reports when you install the plugin with ESLint 10, where three bundled plugins do not declare ESLint 10 support yet ([#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- Every rule doc has a "What is reported" section: what the rule reports, what it deliberately leaves alone, its fix or suggestion, and the config scoping that applies. Each statement is backed by a test ([#218](https://github.com/obsidianmd/eslint-plugin/pull/218)).
- An [Upgrading to 0.5.0](docs/configuration.md#upgrading-to-050) section, and common-errors entries for type-checked configs reaching `LICENSE` and `manifest.json` and for the `--fix-dry-run` crash ([#188](https://github.com/obsidianmd/eslint-plugin/pull/188), [#223](https://github.com/obsidianmd/eslint-plugin/pull/223)).
- The README and quick-start examples ignore build output and Node build scripts as the sample plugin does, and say what to do when there is no build step and `main.js` is your source ([#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#188](https://github.com/obsidianmd/eslint-plugin/pull/188)).
- "Files linted beyond your source" explains that `package.json`, `manifest.json` and `LICENSE` are matched by name, so ESLint must run from the project root ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192)).
- "Code that only runs on desktop", "Web worker files" and "Test files" sections ([#193](https://github.com/obsidianmd/eslint-plugin/pull/193), [#207](https://github.com/obsidianmd/eslint-plugin/pull/207), [#217](https://github.com/obsidianmd/eslint-plugin/pull/217)).
- The community scanner configuration switches `validate-manifest` and `validate-license` off under their own file globs, and uses `obsidianmd/no-misused-promises` ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#210](https://github.com/obsidianmd/eslint-plugin/pull/210)).
- "Using only obsidianmd rules" shows the config blocks that run `validate-manifest` on `manifest.json` and `validate-license` on `LICENSE`, which `ruleConfigs` does not carry ([#191](https://github.com/obsidianmd/eslint-plugin/pull/191), [#192](https://github.com/obsidianmd/eslint-plugin/pull/192), [#206](https://github.com/obsidianmd/eslint-plugin/pull/206)).
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

[Unreleased]: https://github.com/obsidianmd/eslint-plugin/compare/0.5.1...HEAD
[0.5.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.5.0...0.5.1
[0.5.0]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.2...0.5.0
[0.4.2]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.1...0.4.2
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
