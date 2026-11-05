# obsidianmd/editor-drop-paste

📝 Require checking `evt.defaultPrevented` and calling `evt.preventDefault()` in editor-drop/editor-paste handlers.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

An `editor-drop` or `editor-paste` handler registered with `.on()`, usually
`this.app.workspace.on()` inside `registerEvent()`, that handles the event itself: it inserts the
content by calling a method that changes the document on its editor parameter (`replaceSelection`,
`replaceRange`, `setValue`, `setLine`, `processLines`, `transaction`, or `dispatch` on
`editor.cm`), or it calls `evt.preventDefault()`. Such a handler is reported when it:

- never reads `evt.defaultPrevented`, to return early when another handler has already handled the
  event, or
- writes to the editor but never calls `evt.preventDefault()`, to mark the event as handled and
  stop Obsidian from inserting the content as well.

`evt` and `editor` are whatever the handler calls its first and second parameters, and the checks
are looked for anywhere in the handler's body, not only at its start:

```ts
this.registerEvent(
  this.app.workspace.on("editor-paste", (evt, editor) => {
    if (evt.defaultPrevented) return;
    editor.replaceSelection(transform(evt.clipboardData?.getData("text/plain") ?? ""));
    evt.preventDefault();
  }),
);
```

They count with optional chaining (`evt?.defaultPrevented`, `evt?.preventDefault()`), after a
type assertion (`evt!`, `evt as ClipboardEvent`) and in a function nested in the handler, and
`const { defaultPrevented } = evt` reads it too. They must be on the parameter itself: a variable of
the same name declared inside the handler, another object's property (`other.defaultPrevented`,
`evt.target.preventDefault()`), a `preventDefault` that is not called, and the words in a string or
a comment do not count.

Not reported:

- A handler that only observes the paste or drop: it does not write to its editor and does not
  call `evt.preventDefault()`. Obsidian inserts the content, and `preventDefault()` would cancel
  that.
- A handler that passes `evt` to another function or constructor (`this.handlePaste(evt, editor)`),
  which may check and cancel it.
- A handler passed by reference (`this.onPaste`), an arrow function with an expression body, a
  handler with no parameters or whose first parameter is destructured, and an event name that is
  not a string literal.

A handler that writes to an editor it gets some other way, such as
`this.app.workspace.activeEditor?.editor`, or through a variable that holds `editor.cm`, is not
recognised as writing.
