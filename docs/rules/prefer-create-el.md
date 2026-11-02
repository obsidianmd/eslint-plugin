# obsidianmd/prefer-create-el

📝 Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

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
