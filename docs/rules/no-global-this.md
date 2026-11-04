# obsidianmd/no-global-this

📝 Disallow `global` and `globalThis`. Use `window` or `activeWindow` for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

Only a runtime reference to the global object: `globalThis.setTimeout()`, `global.process`,
`(globalThis as Foo).bar`, `obj[globalThis]`. The fix replaces it with `window`; in a shorthand
property, `{ globalThis }` becomes `{ globalThis: window }` so the key stays.

Not reported, because they are not references to the global or have no runtime effect:

- types: `typeof globalThis` in an annotation, `ReturnType<typeof globalThis.setTimeout>`, and
  anything inside a `declare global` or other ambient `declare` block
- names: a property, member or class-member key such as `{ global: boolean }` or `settings.global`,
  and an import or export name
- `typeof globalThis !== "undefined"` checks, and local variables named `global` or `globalThis`

### Fix or suggestion

In Obsidian's window, `window` and `globalThis` are the same object, but their types differ:
`window` is `Window & typeof globalThis`, and `Window` declares many globals a second time,
`setTimeout` among them. With `@types/node`, `globalThis.setTimeout()` returns a `NodeJS.Timeout`,
while `window.setTimeout()` returns a `number`. `--fix` replaces a reference only where no type can
change. Elsewhere it offers the same replacement as a suggestion, because the code around it may
need to change too.

With type information, these are fixed:

- a property with the same type on `window`: `globalThis.document`, `globalThis.crypto`,
  `global.process`, or a global the project declares itself. A write to a property that `Window`
  declares again, such as `globalThis.onerror = null`, gets a suggestion, as `Window` may declare
  it read-only
- a call that returns the same type whichever signature it uses, such as
  `globalThis.clearTimeout(timer)` or `globalThis.matchMedia(query)`, and any call whose result is
  not used, such as `globalThis.setTimeout(save, 100);`. Either gets a suggestion instead when it is
  passed a callback with an untyped parameter that the signatures type differently, as in
  `globalThis.setTimeout((n) => n, 10, 1);`
- a cast to `any`, `unknown`, `never`, or a type `window` is assignable to
- an argument to a call whose result is not used, such as `Object.assign(globalThis, helpers)`, and
  `"name" in globalThis`

These get a suggestion:

```ts
this.timer = globalThis.setTimeout(save, 100); // window.setTimeout() returns a number
const globals = globalThis as Record<string, unknown>; // TypeScript rejects this cast for window
const scope = globalThis; // scope would have window's type
```

Without type information, only rewrites that can never change a type are fixed: a cast to `any`,
`unknown` or `never`, an argument to a call whose result is not used, an `in` check, and the timer
calls that [`prefer-window-timers`](prefer-window-timers.md) fixes. Those are `setTimeout()` or
`setInterval()` whose result is not used, `clearTimeout()` or `clearInterval()` with a number
literal, `undefined` or no argument, and `requestAnimationFrame()` and `cancelAnimationFrame()`.
Everything else gets a suggestion.

Neither a fix nor a suggestion is offered where `window` would be wrong:

- a local binding named `window` is in scope, such as a parameter or
  `const window = await app.firstWindow()`, so `window` would mean that binding
- with type information, the project declares no `window` because it has no DOM lib, or `window`
  has no such property. For example, `globalThis.MathJax` compiles without `noImplicitAny`, but
  `window.MathJax` does not
- an earlier `typeof window` or `typeof document` check shows that the code also runs without a
  window, as in `typeof window !== "undefined" ? window : globalThis`, or after
  `if (typeof window !== "undefined") return window;`. Where the check proves that the window
  exists, such as after `if (typeof document === "undefined") return;`, the rules above apply
- the reference is such a check itself, as in `typeof globalThis.window` or
  `"document" in globalThis`, which would throw as `window` where there is no window

## Web workers

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for files matching `**/*.worker.*` and anything under a
`workers/` directory; see [Web worker files](../configuration.md#web-worker-files). It is off for
test files as well, which run outside Obsidian; see [Test files](../configuration.md#test-files).
