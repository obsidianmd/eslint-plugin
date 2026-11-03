# obsidianmd/editor-drop-paste

📝 Require checking `evt.defaultPrevented` and calling `evt.preventDefault()` in editor-drop/editor-paste handlers.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

An `editor-drop` or `editor-paste` handler registered with `.on()`, usually
`this.app.workspace.on()` inside `registerEvent()`, that:

- never reads `evt.defaultPrevented`, to return early when another handler has already handled the
  event, or
- never calls `evt.preventDefault()`, to mark the event as handled.

`evt` is whatever the handler calls its first parameter, and both are looked for anywhere in the
handler's body, not only at its start:

```ts
this.registerEvent(
  this.app.workspace.on("editor-paste", (evt, editor) => {
    if (evt.defaultPrevented) return;
    editor.replaceSelection(transform(evt.clipboardData?.getData("text/plain") ?? ""));
    evt.preventDefault();
  }),
);
```

Not reported: a handler passed by reference (`this.onPaste`), an arrow function with an expression
body, a handler whose first parameter is destructured, and an event name that is not a string literal.
