# obsidianmd/prefer-window-timers

📝 Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A call to `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval` or `requestAnimationFrame`:

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
- `clearTimeout()` and `clearInterval()` are fixed when their argument is a `number` or `undefined`
  (without type information: a number literal or `undefined`). A `NodeJS.Timeout` argument gets a
  suggestion.
- `requestAnimationFrame()` is a DOM function either way and is always fixed.
- Calls on `activeWindow` are always fixed: both are a `Window`.

```ts
this.timer = setTimeout(save, 1000); // reported, suggestion only: timer may be a NodeJS.Timeout
```

Not reported: calls on `window` already, a function of your own or an import with one of these names,
and other functions such as `cancelAnimationFrame`.

## Web workers and tests

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for files matching `**/*.worker.*` and anything under a
`workers/` directory, and for test files; see [Web worker files](../configuration.md#web-worker-files)
and [Test files](../configuration.md#test-files).
