# obsidianmd/prefer-create-el

📝 Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Fix or suggestion

`--fix` applies a replacement only when the types say it exists: `createEl()` for the global
`document` when the global helpers are declared, `doc.win.createEl()` when the document's `win`
declares them, and `activeWindow.createEl()` when `Window` declares them. Otherwise the replacement
is offered as a suggestion. Obsidian's own types declare `activeWindow` as a plain `Window`, so
`activeDocument.createElement()` gets a suggestion rather than a fix that would not compile.

`createEl()` and `createSvg()` take only tag names the DOM types know (`keyof HTMLElementTagNameMap`
and `keyof SVGElementTagNameMap`). A tag literal, or a variable typed as a union of known tags, is
fixed. A `string` variable, a custom element such as `'my-element'`, a deprecated tag such as
`'xmp'`, or `createElementNS()` with an options argument is reported with neither a fix nor a
suggestion, because the replacement would not compile.

A bare replacement such as `createDiv()` is not offered either when the file binds that name itself:
inside `function createDiv() { … }`, or with a variable, parameter or import of that name in scope,
the call would reach that binding instead of Obsidian's helper, and inside the function it would
recurse. A method named `createDiv` is not a binding, so code inside it is still fixed.

## Iframe documents

An iframe's document belongs to the iframe's own window, which Obsidian never gives its DOM helpers,
so `doc.win.createEl()` would throw there. Creating an element in an iframe's document is not
reported when the document is reached through `contentDocument` or `contentWindow.document`, also
with `!`, `?.` or a type assertion, or through a `const` holding it:

```ts
const style = iframe.contentDocument!.createElement("style");

const doc = iframe.contentDocument;
if (doc) doc.head.appendChild(doc.createElement("style"));
```

A detached element still belongs in the main document, so `document.createElement("canvas")` is
still reported in favour of `createEl("canvas")`.
