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

- a read of a property with the same type on `window`: `globalThis.crypto`, `global.process` or
  `globalThis.document.body`. Not a global only the project declares; see below
- a call that returns the same type whichever signature it uses, such as
  `globalThis.clearTimeout(timer)` or `globalThis.matchMedia(query)`, and any call whose result is
  not used, such as `globalThis.setTimeout(save, 100);`. Either gets a suggestion instead when it is
  passed a callback with an untyped parameter that the signatures type differently, as in
  `globalThis.setTimeout((n) => n, 10, 1);`
- a cast to `any`, `unknown`, `never`, or a type `window` is assignable to

These get a suggestion:

```ts
this.timer = globalThis.setTimeout(save, 100); // window.setTimeout() returns a number
const globals = globalThis as Record<string, unknown>; // TypeScript rejects this cast for window
const scope = globalThis; // scope would have window's type
```

A write to a global gets a suggestion, never a fix, because it defines the global for code that may
run without a window: `globalThis.registry = new Map()`, `globalThis.count++`,
`delete globalThis.cache`, `(globalThis as any).createEl = 1`, and `globalThis` passed to a call,
such as `Object.assign(globalThis, helpers)` or `Object.defineProperty(globalThis, "x", …)`.

A probe of the global object for a property that may be missing gets a suggestion, whatever the
types: `typeof globalThis.crypto`, `"requestIdleCallback" in globalThis`, `!globalThis.crypto`,
`globalThis.crypto?.randomUUID()` or `globalThis.queueMicrotask ?? fallback`. Such code is written
to work where the property is missing, as in a web worker or in Node tests, and there
`window.crypto` throws because there is no `window`. The code such a probe decides runs gets a
suggestion too, as in `if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();`:
with only the call fixed, TypeScript reports the probe as always true (TS2774). So does code that
may run without a window: in a `try` whose `catch` drops the error, as in `try { … } catch {}`, or
decided by a condition that names the environment, such as `if (isBrowser)`, `env.isNode ? … : …` or
`typeof process !== "undefined"`, or in Emscripten output, a file that reads
`ENVIRONMENT_IS_WORKER` or `ENVIRONMENT_IS_NODE`; see [Window checks](prefer-window-timers.md#window-checks).

Without type information, only rewrites that can never change a type are fixed: a read through a cast
to `any`, `unknown` or `never`, and the timer
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
- a read of a global that only the project declares, with `declare global { var X: … }` or
  `declare var X`, and not TypeScript's lib or a package such as `@types/node`. Such a global is
  often a bundler's `define` key, which esbuild or webpack replaces by its exact text:
  `global.DEFAULT_APP_KEY` is replaced, but `window.DEFAULT_APP_KEY` is not, and is `undefined` at
  runtime. Without type information, only the declarations in the same file are seen. A write, such
  as `globalThis.registry = new Map()`, still gets a suggestion. A read through a cast, such as
  `(globalThis as any).DEFAULT_APP_KEY`, which a bundler does not replace, is rewritten as above
- TypeScript has narrowed `window` there to a type without the property, so `window.setTimeout`
  would not compile (TS2339). In the `else` of `if ("requestIdleCallback" in window)`, or after
  `if ("requestIdleCallback" in window) return;`, `window` is `never`, because `Window` declares
  `requestIdleCallback`. The same goes for `typeof window` and `window instanceof X` checks that
  rule the window out where the code runs. Where `window` is still a `Window`, as where such a check
  is true, after a check for a key `Window` does not declare (with type information), or in a
  callback, which TypeScript does not narrow, the rules above apply
- an earlier [window check](prefer-window-timers.md#window-checks) shows that the code also runs
  without a window, as in `typeof window !== "undefined" ? window : globalThis`, or after
  `if (typeof window !== "undefined") return window;`. Where the check proves that the window
  exists, such as after `if (typeof document === "undefined") return;`, the rules above apply
- the reference is such a check itself, as in `typeof globalThis.window`,
  `typeof globalThis["document"]`, `"document" in globalThis` or `!globalThis.window`, which would
  throw as `window` where there is no window. A `typeof` with a key that is not written out, such as
  `typeof globalThis[key]`, gets a suggestion
- the code defines the window or looks for it, as a jsdom setup for tests does: a write to
  `window`, `self`, `globalThis`, `top`, `parent`, `frames` or `document` on the global object, such
  as `global.window = dom.window`, `delete globalThis.document`, `[globalThis.document] = docs`,
  `Object.defineProperty(globalThis, "window", …)` or `Object.assign(global, { window, document })`,
  or a read of one as a value, such as `const doc = globalThis.document` or `use(global.window)`. As
  `window.window`, it would throw where there is no window yet. A read through one, such as
  `globalThis.document.body`, is fixed as above; with `?.`, as in `globalThis.document?.body`, it is
  a window check and gets neither

## Web workers

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for `.ts`, `.cts`, `.mts`, `.tsx`, `.js`, `.cjs`, `.mjs` or `.jsx` files matching `**/worker.*`,
`**/*.worker.*`, `**/*-worker.*` or `**/*_worker.*`, such as `src/worker.ts` or `search.worker.ts`,
and anything under a `workers/` directory, but not a `worker/` directory; see
[Web worker files](../configuration.md#web-worker-files). It is off for test files and tool configs
as well, which run outside Obsidian; see [Test files](../configuration.md#test-files).
