# obsidianmd/prefer-instanceof

📝 Prefer `.instanceOf(T)` over `instanceof T` for cross-window safe type checks on DOM Nodes and UIEvents.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

## What is reported

`value instanceof SomeClass` where `value` is a DOM `Node` or `UIEvent`, or anything extending them,
such as an `HTMLElement` or a `MouseEvent`, recognised by type. Only the DOM's own `Node` and
`UIEvent`, from TypeScript's `lib.dom.d.ts`, count: another type of the same name, such as React's
synthetic `React.MouseEvent` (which extends a `UIEvent` of React's) or a syntax tree's `Node`, has no
`instanceOf()` and is not reported. Every window has its own
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

An event's target is reported too, without a fix; see [Event targets](#event-targets).

Not reported: `instanceof` on any other type, such as a `TFile` or your own classes, on an `any` or
`unknown` value, and on a union of more than one type besides `null` and `undefined`, such as
`Node | string` or `HTMLElement | SVGElement`. Nor is a check against a constructor read from a
window object, such as `focus instanceof el.ownerDocument.defaultView!.HTMLElement` or
`evt instanceof win.MouseEvent`: it already checks against the window the code chose. That goes for
a `const` set to one as well, as in
`const Ctor = el.ownerDocument.defaultView?.HTMLElement; if (Ctor && el instanceof Ctor) {}`, and for
one with a fallback after `??` or `||`, as in `doc.defaultView?.HTMLElement ?? HTMLElement`. One read
from `window` or `activeWindow`, the main or the active window, is reported.

Nor is `instanceof` in an implementation of `instanceOf()` itself, such as a polyfill for tests: a
function or method named `instanceOf`, a function assigned to `….instanceOf`, or the `value` of
`Object.defineProperty(…, "instanceOf", …)`. There, `this instanceof type` is the check, and
`this.instanceOf(type)` would call the polyfill again without end.

Code that runs outside Obsidian, such as unit tests under jsdom or happy-dom, has no `instanceOf()`
unless it adds one, so the fix breaks it there.

The rule needs type information, so the recommended config runs it on TypeScript files only. It
switches the rule off for worker files, test files and tool configs, which have no popout windows and no `instanceOf()`;
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

## Event targets

`e.target instanceof HTMLElement`, where `e.target` is typed `EventTarget`, is reported too: also
`relatedTarget`, `currentTarget` and `srcElement`, checked against a DOM `Node` class such as
`Node`, `Element`, `Text`, an `HTML…Element` or an `SVG…Element`. In a popout window the target is
that window's node, which is never `instanceof` the main window's class, so a handler of a view,
modal, menu or editor extension takes the wrong branch there.

It is never fixed. An `EventTarget` may not be a node: the target of a `focus`, `blur` or `resize`
listener on `window` is the window, which has no `instanceOf()`. And the check narrows `e.target`
for the code after it, as in `if (!(e.target instanceof HTMLElement)) return; e.target.closest(…)`,
which a rewritten check alone would not.

A suggestion is offered where the result is only tested (the condition of an `if`, loop or `?:`, or
through `!`, `&&` and `||`), since the rewrite is `undefined` rather than `false` for a null target:

- for `.target` of a mouse, pointer, drag, touch, wheel, keyboard, input or composition event, whose
  target is always a node, `e.targetNode?.instanceOf(HTMLElement)`. Obsidian's `targetNode` returns
  the same value as `target`, typed as a `Node | null`, so the suggestion also reads every other
  `e.target` in the function as `e.targetNode`, and the check narrows it as before:

  ```ts
  if (!(e.target instanceof HTMLElement)) return; e.target.closest(".icon");
  // suggestion: if (!(e.targetNode?.instanceOf(HTMLElement))) return; e.targetNode.closest(".icon");
  ```

  Not when `e` is assigned to, or another `e.target` is compared to a value other than `null` or
  `undefined`, kept in a `let` without a type, or checked against a class that is not a Node.
- for `.relatedTarget`, which is a node or `null`, `(e.relatedTarget as Node | null)?.instanceOf(Node)`,
  when no other read of `e.relatedTarget` relies on the check's narrowing.

Elsewhere, as for a `FocusEvent`, a plain `Event` (`change`, `input`, `scroll`), `currentTarget`, or
React's synthetic events, which have no `targetNode`, it is reported only. A check that already
falls back to `instanceOf()`, as in `e.target instanceof Element || (e.target as Node)?.instanceOf?.(Element)`,
is not reported.

## Minimum app version

Popout windows came with Obsidian 0.15.0, and `instanceOf()` and `targetNode` are first declared in
the 0.15.3 typings. By the plugin's minimum app version (the `minAppVersion` option, else
`minAppVersion` in `manifest.json`):

- below 0.15.0, there is only one window, so nothing is reported;
- from 0.15.0 to below 0.15.3, a check is reported without a fix or a suggestion, as the
  replacement does not exist yet on the oldest versions the plugin supports;
- where no version is known (no option and no `manifest.json` `minAppVersion`, or the one that
  applies is not a version, such as `latest`), the fix is applied as before, and a suggestion says
  that it needs Obsidian 0.15.3.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
