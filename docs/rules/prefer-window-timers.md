# obsidianmd/prefer-window-timers

📝 Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A call to `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `requestAnimationFrame` or
`cancelAnimationFrame`:

- called bare, as the global function. The fix prefixes `window.`
- called on `activeWindow`, which may be a popout window that the user closes, taking its timers with
  it. The fix replaces `activeWindow` with `window`

```ts
setTimeout(save, 1000); // reported, fixed to window.setTimeout(save, 1000)
activeWindow.setInterval(tick, 500); // reported, fixed to window.setInterval(tick, 500)
```

With `@types/node` installed, the bare functions are Node's: `setTimeout()` and `setInterval()`
return a `NodeJS.Timeout`, and `clearTimeout()` and `clearInterval()` accept one, while `window`'s
return and accept a `number`. The fix is applied automatically only where that cannot change a
type; elsewhere the same rewrite is offered as a suggestion, because the timer's type may need to
change with it:

- `setTimeout()` and `setInterval()` are fixed when their result is not used (a statement on its own,
  or `void`). A timer that is stored, returned or passed on gets a suggestion.
- `clearTimeout()` and `clearInterval()` are fixed when their argument is a `number`, `undefined` or
  `any`, or is left out (without type information: a number literal or `undefined`). A
  `NodeJS.Timeout` argument gets a suggestion.
- `requestAnimationFrame()` and `cancelAnimationFrame()` are DOM functions either way and are always
  fixed.
- Calls on `activeWindow` are fixed: both are a `Window`.

```ts
this.timer = setTimeout(save, 1000); // reported, suggestion only: timer may be a NodeJS.Timeout
```

Neither a fix nor a suggestion is offered where `window` would not be the global window, and calls
on `activeWindow` are not fixed there either:

- a local binding named `window` is in scope, such as a Playwright page in
  `const window = await app.firstWindow()`, so `window.setTimeout` would call that binding
- with type information, the project declares no `window` because it has no DOM lib
- an earlier [window check](#window-checks) shows that the code also runs without a window, as in
  `typeof window === "undefined" ? setTimeout(fn, ms) : window.setTimeout(fn, ms)`.
  Where the check proves that the window exists, such as inside
  `if (typeof window !== "undefined") { … }`, the rules above apply

Not reported: calls on `window` already or on another window such as `el.win`, a function of your own
or an import with one of these names, and other functions such as `requestIdleCallback`.

## Window checks

These count as a check for a window, however they are spaced or commented:

- `typeof window`, `typeof document`, or `typeof` a property named `window` or `document`, such as
  `typeof globalThis.document`, `typeof globalThis?.["window"]` or `typeof self.document`
- `"window" in globalThis` or `"document" in globalThis`, also with a template literal
- `globalThis.window`, `global.window` or `self.document` tested on its own: `!globalThis.window`,
  `if (globalThis.document)`, `globalThis.window === undefined`, `globalThis.document?.body`
- a check for a web worker, which has no window: `typeof importScripts`, `typeof WorkerGlobalScope`
  (or another `WorkerGlobalScope`), or `"importScripts" in globalThis`. It never proves that the
  window exists, since Node has neither
- a read of a variable set to a check, or a call of a function that returns one, declared in the same
  file: `const hasWindow = typeof window !== "undefined";` makes `if (!hasWindow) { … }` a check,
  and so does `function hasWindow() { return "window" in globalThis; }` for `if (!hasWindow()) { … }`.
  Only a `const`, or a function that does nothing else, can prove the window exists where it is
  true, and not when it joins checks with `&&` or `||`

A check decides where the code runs through `if`, `?:`, `&&`, `||` and `!`, and through an `if` before
the code that returns, throws, breaks or continues. A check that does not decide it, such as
`const browser = typeof window !== "undefined";` on its own, counts for the rest of its function, but
not in the functions nested in it.

A `try` whose block reads `window`, `document`, `activeWindow`, `activeDocument`, `globalThis.window`
or `globalThis.document` throws where there is no window. So its `catch` and `finally` run without a
window, and so does the code after it when the `catch` goes on rather than returning or throwing:

```ts
try { document.title; } catch { setTimeout(fn, 0); } // reported only
try { activeWindow.focus(); } catch {} setTimeout(fn, 0); // reported only
```

Code in the `try` itself gets a suggestion instead of a fix when the `catch` drops the error (it has no
parameter, or does not read it, and does nothing but return), as in `try { setTimeout(fn, 0); } catch {}`,
where `window.setTimeout()` failing would go unseen.

A check in another file (`import { isBrowser } from "./env"`), or one held in a class member or an
object property (`this.isBrowser`, `env.isNode`), cannot be followed. So where a condition that decides
whether the code runs reads a name that says which environment it is in, the code gets a suggestion
instead of a fix, whichever way the condition goes. That condition is the test of an `if`, `?:`, loop
or `switch` around the code, the left of an `&&`, `||` or `??`, or an `if` before the code that
returns, throws, breaks or continues. The names are `isBrowser`, `inBrowser`, `IS_BROWSER`, `isNode`,
`isNodeJs`, `isNodeEnv`, `isWorker`, `inWorker`, `isWebWorker`, `isServer`, `isSSR`, `isElectron`,
`hasWindow`, `hasDom`, `hasDocument` and `canUseDOM`, in any case and with or without `_`, as a
variable, a call or a property, and `typeof process` and `process.versions`:

```ts
if (!env.isNode) { setTimeout(fn, 0); } // suggestion
if (settings.enabled) { setTimeout(fn, 0); } // fixed
```

A `const` in the same file set to one check, as in `const isBrowser = typeof window !== "undefined";`,
is followed instead. Code that still runs without
a window where none of this shows can be fixed, so keep it in a web worker or test file, where the
recommended config switches this rule off, or disable the rule for it.

## Web workers and tests

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for files matching `**/*.worker.*` and anything under a
`workers/` directory, and for test files; see [Web worker files](../configuration.md#web-worker-files)
and [Test files](../configuration.md#test-files).
