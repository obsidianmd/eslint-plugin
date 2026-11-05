# obsidianmd/no-unsupported-api

📝 Disallow usage of Obsidian APIs not available in the plugin's minimum app version.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

## What is reported

Using an Obsidian API that is newer than the oldest app version the plugin supports, its
`minAppVersion` from `manifest.json` or the `minAppVersion` option below. When each API arrived is
read from the `@since` tags in your project's own `obsidian.d.ts`, lowered where older typings already
had the API (see [Members older than their `@since`](#members-older-than-their-since)); see
[Requirements](#requirements).
The uses checked are:

- reading a property or calling a method, such as `this.app.renderContext`
- calling a function or creating an instance, such as `displayTooltip()` or `new SecretComponent(app, el)`
- extending a class, such as `class MySuggest extends AbstractInputSuggest`, also in a class
  expression such as `const MySuggest = class extends AbstractInputSuggest {}`, and calling methods
  inherited from it through `super`
- a newer method on an older class, such as `setDisabled()` on a `BaseComponent`, and Obsidian's
  additions to built-ins, such as `Array.prototype.findLastIndex`

Each overload of a method has its own `@since`, and a call needs the version of the overload it
calls: `workspace.on("files-menu", …)` needs 1.4.10 and `workspace.on("file-menu", …)` 0.9.12, and
`workspace.duplicateLeaf(leaf, "tab")` needs 1.1.0. A string literal argument that only one overload
takes, such as an event name, picks that overload whatever the other arguments are, so a callback
typed for an older signature still counts as a call for that event. Otherwise the type checker's
choice counts; any other use, such as passing the method as a value, needs only its earliest
overload's version, and so does a call that fits no single overload by its arguments' types: one that
also fits an older overload, as `any` arguments do, or that fits none, or passes a spread argument or
calls a generic overload. An overload without `@since`, such as the deprecated
`setActiveLeaf(leaf, pushHistory, focus)`, needs no version.

The `@since` of some overloads names the release that changed the signature, not the one that added
the call. `workspace.on("editor-change", …)` is `@since 1.1.1`, which widened the callback's view to
`MarkdownView | MarkdownFileInfo`, but the event is in the 0.12.17 typings, and a callback written for
the new signature runs on the older versions too. For those overloads the rule needs the version of
the first published `obsidian` typings that have the same overload, from a table built from every
release on npm:

| Overload | `@since` | Needs |
| :-- | :-- | :-- |
| `Workspace.on("editor-menu", …)` | 1.1.0 | 0.12.11 |
| `Workspace.on("editor-change", …)` | 1.1.1 | 0.12.17 |
| `Workspace.on("editor-paste", …)`, `Workspace.on("editor-drop", …)` | 1.1.0 | 0.12.17 |
| `Workspace.duplicateLeaf(leaf, direction?)` | 0.13.8 | 0.11.13 |

The table only lowers a version; an overload it does not list keeps its `@since`. It matches an
overload by its string literal parameters, or else by its parameter types.

A use is allowed where a `requireApiVersion()` check proves the app is new enough, as described below.
There is no fix: either guard the call, or raise `minAppVersion` if the plugin needs the API anyway.

Not reported: `Plugin.settings` (`@since 1.13.0`), which is the plugin's own field, assigned in
`onload`, and members of the settings-definition types (`SettingDefinitionItem`, `SettingDefinitionGroup`,
`SettingDefinitionControl`, the `Setting*Control` types and the rest reachable from what
`getSettingDefinitions()` returns). Those objects are the plugin's own data, so reading `item.items` or
`definition.control.key`, for instance to render the definitions on an older Obsidian, works on every
version. The settings classes, such as `SettingPage` and `SettingGroup`, are still reported: they are
runtime exports, and extending one on an older Obsidian fails when the plugin loads.

The rule needs type information, so the recommended config runs it on TypeScript files only. It does
not apply the rule to [test files](../configuration.md#test-files), which never run in an older
Obsidian.

### Members older than their `@since`

The `@since` of a whole member can name a later release than the one that added it too, as for the
overloads above, most often for a member with a single signature. `setDisabled(disabled: boolean)` is
`@since 1.2.3` and `Menu.addItem(cb)` `@since 0.15.3`, but both are in the 0.11.13 typings, the oldest
on npm, written as they are today. So for each member, function and class whose name the published
typings had before its `@since`, the rule has a second table built from the same releases: each signature the member had, and the releases that had it. A use needs the lower of
its `@since` and the first release from which on every release, up to your `obsidian` version, had a
signature the use fits:

- any use fits a signature written the same as today's, with each interface, type alias and enum it
  names declared the same as in your typings;
- a call also fits an older signature it can make the same way: it passes at least the arguments
  that one requires and no more than it takes, and each argument is one the older parameter takes
  too. That is the same type; or a parameter of `string`, `number`, `boolean`, `null`, `undefined`,
  literals and types declared then as in your typings, which the argument's type fits, as
  `getLeaf(false)` fits `getLeaf(newLeaf?: boolean)` of 0.11.13 and `showAtPosition({ x, y })` fits
  `showAtPosition(position: Point)`; or a callback the older release calls with the parameters it
  declares, of types the callback takes, and whose result that release ignores. The call's result must be typed the same, or unused:
  `revealLeaf(leaf);` and `await revealLeaf(leaf);` fit the 0.11.13 `revealLeaf(leaf): void`, but
  `revealLeaf(leaf).then(…)` needs the Promise of 1.7.2.

Anything the rule cannot tell keeps the `@since`: a call that needs a newer signature, such as
`getLeaf("tab")` (the PaneType overload of 0.16.0) or `setTooltip(text, { placement })` (the options
of 1.1.1), a spread argument, a generic or rest parameter, and passing a method as a value, which
needs today's signature. The first typings that declare a member are an upper bound of when the app
had it: a typings release describes the app release of the same version and is published with it or
later, the app may have had the member undeclared before, and there are no typings before 0.11.13. So
the table can make the rule ask for a later version than the app needed, never one older than the
typings show.

## Guarding with `requireApiVersion`

An API newer than `minAppVersion` is allowed where a `requireApiVersion(...)` check proves the
running app is new enough. That holds:

- inside the `if` branch or ternary branch it guards, or to the right of `&&`;
- after an early exit on a failed check, for the rest of the block. The exit must be a `return`,
  `throw`, `break` or `continue` that always runs, directly or at the top of a `{ ... }` block;
- in the `else` branch or ternary alternate of a negated check, or to the right of `||` after one;
- wherever a `const` holding the check's result is used the same way;
- when several checks are combined: `a && b` proves the higher version, and `a || b` the lower;
- inside an override of a method only Obsidian calls, from the release that added it on:
  `getSettingDefinitions()`, `getControlValue()` and `setControlValue()` (1.13.0),
  `onExternalSettingsChange()` (1.5.7) and `onPaneMenu()` (0.15.3), so `this.refreshDomState()` in
  `getSettingDefinitions()` is allowed. Not in a file that also names the method other than as
  `super.name`, such as `this.getSettingDefinitions()`, since the plugin may then call it on an
  older Obsidian itself.

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

A check that the API exists works the same way where the API is newer as a whole: `typeof
x.member === "function"`, `typeof x.member !== "undefined"`, `x.member != null`, `x.member !==
undefined`, `"member" in x` and `x.member` itself as a condition, for that same `x.member` (or
function), and an optional call `x.member?.()`. The check itself, which reads a missing member as
`undefined`, is not reported either. It does not prove a newer signature of a member older releases
had: `typeof workspace.getLeaf === "function"` exists on every version, so `getLeaf("tab")` after it
still needs 0.16.0.

```ts
if (typeof this.app.isDarkMode === "function") {
    dark = this.app.isDarkMode();
}
const language = typeof getLanguage === "function" ? getLanguage() : "en";
```

The version can be a string literal, or any expression whose type is a string literal: a `const`
declared in the same file or imported from another module, a member of an `as const` object, an
enum member, or a template literal built from such constants. When its type is a choice between
versions, such as `late ? "1.10.0" : "1.11.0"`, only the lowest one is proven.

Anything else still reports the API: a `let` variable or `string`-typed value, a version that is
not a full `x.y.z`, an exit that only runs inside a nested `if` or loop, `requireApiVersion(v) ||
api` (which reaches `api` when the check fails), and a function declaration after an early exit,
because a declaration is hoisted and can be called before the check.

A `minAppVersion` without a patch version, such as `0.15`, is read as `0.15.0`. Any other value
that is not a version, such as `latest`, `1.2.x` or `>=1.0`, proves nothing about the app, so every
versioned API is reported. With no `minAppVersion` at all, neither in the option nor in the
`manifest.json` of the directory ESLint runs from, the rule reports nothing.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->

## Requirements

This rule determines when each API was introduced by reading the `@since` JSDoc
tags in **your project's own** `obsidian.d.ts`. It does not bundle a copy of the
Obsidian typings, only the tables of older signatures described above, which can
only lower the version an API needs.

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
the `obsidian` version it was built from, the version of this plugin that built it and the format of
the map, and the rule rebuilds it when any of them differs, so upgrading `obsidian` or this plugin
refreshes it; deleting the file forces a rebuild. Where the file
cannot be written, the rule parses the typings on every ESLint run instead.
