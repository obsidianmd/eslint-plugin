# obsidianmd/prefer-instanceof

📝 Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

`value instanceof SomeClass` where `value` is a DOM `Node` or `UIEvent`, or anything extending them,
such as an `HTMLElement` or a `MouseEvent`, recognised by type. Every window has its own
constructors, so an element from a popout window is not `instanceof HTMLElement` of the main window.
Obsidian's `instanceOf()` checks across windows:

```ts
if (target instanceof HTMLElement) {} // reported
if (target.instanceOf(HTMLElement)) {} // works in popout windows
```

The fix rewrites the check to `value.instanceOf(SomeClass)` when the value's type declares
`instanceOf()`, as it does with Obsidian's types. Without them it is offered as a suggestion only.

Not reported: `instanceof` on any other type, such as a `TFile` or your own classes, and on an `any`
value.

The recommended config switches this rule off for worker and test files, which have no popout windows
and no `instanceOf()`; see [Web worker files](../configuration.md#web-worker-files) and
[Test files](../configuration.md#test-files).
