# obsidianmd/prefer-instanceof

📝 Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

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
A value that is not a name, a property access, a call, a non-null assertion or `this` is put in
parentheses, so `(await getEl()) instanceof HTMLElement` becomes
`(await getEl()).instanceOf(HTMLElement)`.

A value that may be null or undefined, such as `el.parentElement`, is reported too, with a
suggestion; see [Values that may be null or undefined](#values-that-may-be-null-or-undefined).

Not reported: `instanceof` on any other type, such as a `TFile` or your own classes, on an `any` or
`unknown` value, and on a union of more than one type besides `null` and `undefined`, such as
`Node | string` or `HTMLElement | SVGElement`. Nor is a check against a constructor read from a
window object, such as `focus instanceof el.ownerDocument.defaultView!.HTMLElement` or
`evt instanceof win.MouseEvent`: it already checks against the window the code chose. One read from
`window` or `activeWindow`, the main or the active window, is reported.

The rule needs type information, so the recommended config runs it on TypeScript files only. It
switches the rule off for worker and test files, which have no popout windows and no `instanceOf()`;
see [Web worker files](../configuration.md#web-worker-files) and
[Test files](../configuration.md#test-files).

### Values that may be null or undefined

`null instanceof HTMLElement` is `false`, but `null.instanceOf(HTMLElement)` throws. When the value
may be null or undefined, the rewrite is offered as a suggestion that keeps the check safe,
`value?.instanceOf(SomeClass)`, which is falsy for null and undefined and still narrows `value`:

```ts
if (list[0] instanceof HTMLElement) {} // suggestion: list[0]?.instanceOf(HTMLElement)
```

With `strictNullChecks`, the type tells: a value whose type includes `null` or `undefined`, such as
`el.parentElement`, a `Node | undefined`, an optional chain or a type parameter constrained to
`HTMLElement | null`, gets that suggestion. So does a value read through an index signature, such as
`list[0]` or `record.key`: unless `noUncheckedIndexedAccess` is on, it is typed as present even past
the end of the list. A value narrowed by a check, such as `parent && parent instanceof HTMLElement`,
or asserted with `!`, is fixed.

Without `strictNullChecks` no type includes `null`, so the value's declaration tells instead: a
property or call declared as `null` or `undefined` (`el.parentElement`, `el.querySelector()`,
`list.find()`), an optional property or parameter, an optional chain, an index signature, or a
`const` set from one of them. Everything else, and a value with a non-null assertion
(`el.parentElement!`), is still fixed.
