# obsidianmd/prefer-create-el

📝 Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

Creating an element with the native DOM methods where Obsidian has a helper, and `createEl()` for a
tag that has a shorter helper:

| Call | Replacement |
| ---- | ----------- |
| `document.createElement("p")` | `createEl("p")` |
| `document.createElement("div")`, `("span")` | `createDiv()`, `createSpan()` |
| `document.createElementNS("http://www.w3.org/2000/svg", "path")` | `createSvg("path")` |
| `document.createDocumentFragment()` | `createFragment()` |
| `createEl("div", opts)`, `el.createEl("span")` | `createDiv(opts)`, `el.createSpan()` |

The document decides where the replacement is called: the global `document` uses the global
helpers, `activeDocument` uses `activeWindow.`, and any other value typed as a `Document`, such as
`el.doc`, uses its window, `el.doc.win.`.

[`prefer-active-doc`](prefer-active-doc.md) does not report the global `document` in a call this rule
reports, as the replacement drops `document`; see
[Calls left to `prefer-create-el`](prefer-active-doc.md#calls-left-to-prefer-create-el). Where a
comment turns this rule off for a call, `prefer-active-doc` reports `document` there; if you switch
this rule off in your config, neither rule reports these calls.

Not reported:

- `createElement()` with an options argument, and `createElementNS()` with a namespace other than SVG
- calls on anything that is not a document, and `createEl()` with a tag other than `div` or `span`
- an iframe's document; see [Iframe documents](#iframe-documents)

The recommended config switches this rule off for worker and test files, which have no Obsidian DOM
helpers; see [Web worker files](../configuration.md#web-worker-files) and
[Test files](../configuration.md#test-files).

### Fix or suggestion

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

`createEl("div", …)` and `el.createEl("span", …)` are fixed when the types show that the shorter
helper exists where it is called, accepts the arguments after the tag and returns what `createEl()`
did, as it does with Obsidian's types. Otherwise:

- `el`'s type has no `createDiv()` or `createSpan()`, for example a value cast to
  `{ createEl(…) }`, or the helper does not take those arguments (a project's own typings with
  `createSpan(className?: string)`): reported with neither a fix nor a suggestion, because the
  replacement would not compile. The same holds for a bare `createEl()` from a project's own typings
  or an import when no global `createSpan()` is declared.
- A `createEl` of the file's own, such as an import, when the global helper is declared: a
  suggestion, since the global helper need not do what the file's `createEl()` does.
- A result whose type would change (a `createEl()` typed to return an `HTMLElement` against a
  `createDiv()` that returns an `HTMLDivElement`) or a spread argument: a suggestion.

On an `any` value, or with no helper declared anywhere, the replacement is fixed as before. An
optional chain is kept: `el?.createEl("div")` becomes `el?.createDiv()`, and `doc?.createElement("p")`
becomes `doc?.win.createEl("p")`.

### Iframe documents

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
