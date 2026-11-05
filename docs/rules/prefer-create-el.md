# obsidianmd/prefer-create-el

📝 Prefer Obsidian DOM helpers (`createEl`, `createDiv`, `createSpan`, `createSvg`, `createFragment`) over native DOM methods.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

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
`el.doc`, uses its window, `el.doc.win.`, where that window's type declares the helpers (see
[Popout window documents](#popout-window-documents)). A document that may be null or undefined counts too, such
as `node.ownerDocument` (typed `Document | null`) or an optional `doc?: Document` parameter.

[`prefer-active-doc`](prefer-active-doc.md) does not report the global `document` in a call this rule
reports, as the replacement drops `document`; see
[Calls left to `prefer-create-el`](prefer-active-doc.md#calls-left-to-prefer-create-el). Where a
comment turns this rule off for a call, `prefer-active-doc` reports `document` there; if you switch
this rule off in your config, neither rule reports these calls. Inside an implementation of the
helpers (see [Helper implementations](#helper-implementations)), neither rule reports them either.

Not reported:

- `createElement()` with an options argument, and `createElementNS()` with a namespace other than SVG
- calls on anything that is not a document, and `createEl()` with a tag other than `div` or `span`
- an iframe's document; see [Iframe documents](#iframe-documents)
- `activeDocument` or another document when its window's type does not declare the helper, as with
  Obsidian's own types; see [Popout window documents](#popout-window-documents)
- code inside an implementation of the helpers; see [Helper implementations](#helper-implementations)

The rule needs type information, so the recommended config runs it on TypeScript files only. It
switches the rule off for worker files, test files and tool configs, which have no Obsidian DOM helpers; see
[Web worker files](../configuration.md#web-worker-files) and [Test files](../configuration.md#test-files).

### Fix or suggestion

`--fix` applies a replacement only when the types say it exists: `createEl()` for the global
`document` when the global helpers are declared, `doc.win.createEl()` when the document's `win`
declares them, and `activeWindow.createEl()` when `Window` declares them. For the global `document`
without the global helpers declared, the replacement is offered as a suggestion; for
`activeDocument` and other documents, the call is not reported (see
[Popout window documents](#popout-window-documents)).

`createEl()` and `createSvg()` take only tag names the DOM types know (`keyof HTMLElementTagNameMap`
and `keyof SVGElementTagNameMap`). A tag literal, or a variable typed as a union of known tags, is
fixed. A `string` variable, a custom element such as `'my-element'`, a deprecated tag such as
`'xmp'`, or `createElementNS()` with an options argument is reported with neither a fix nor a
suggestion, because the replacement would not compile.

A bare replacement such as `createDiv()` is not offered either when the file binds that name itself:
with a variable, parameter or import of that name in scope, the call would reach that binding
instead of Obsidian's helper.

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
  `createDiv()` that returns an `HTMLDivElement`) or a spread argument: a suggestion. A call that is
  a statement of its own, whose result is not used, is still fixed when only the result type differs.

On an `any` value, or with no helper declared anywhere, the `createEl("div")` shorthand is fixed as
before. An
optional chain is kept: `el?.createEl("div")` becomes `el?.createDiv()`, and `doc?.createElement("p")`
becomes `doc?.win.createEl("p")`, also when `doc` may be null or is read through a chain, as in
`view?.doc.createElement("p")`.

A value that may be null or undefined gets the same fix or suggestion as one that cannot be: the
replacement reads `win` or the helper from the same value, through the same `.` or `?.`, so it
short-circuits or throws exactly where the original call does. Without `?.`, as in
`doc.createElement("p")` with `doc: Document | null`, TypeScript already reports the call under
`strictNullChecks` (TS18047), and the replacement `doc.win.createEl("p")` keeps that error rather
than adding one.

### Popout window documents

Obsidian's own types declare `activeWindow` and a document's `win` as a plain `Window`, which has no
DOM helpers, so `activeWindow.createEl("p")` and `doc.win.createDiv()` fail to compile with TS2339.
`activeDocument.createElement("p")` and `doc.createElement("div")` are then the right calls for an
element in a popout window's document, and are not reported. (`activeDocument.createEl()` is no
replacement: `createEl()` on a node appends the element to it, and a document takes no second root
element.) A project that declares the helpers on `Window` gets the fix to `activeWindow.createEl()`
or `doc.win.createEl()`.

### Helper implementations

Code inside a function named after one of the helpers (`createEl`, `createDiv`, `createSpan`,
`createSvg`, `createFragment`) is not reported: a function declaration or expression of that name, a
method or property of that name, or a function assigned to it, such as a polyfill or a test fake:

```ts
class FakeElement {
    createSpan(o?: DomElementInfo) { return this.createEl("span", o); }
}
window.createDiv = (o, cb) => { const el = document.createElement("div"); /* … */ return el; };
Element.prototype.createEl = function (tag, o) { return document.createElement(tag); };
```

There the replacement would call the function it is in, or the polyfill being defined, and recurse.

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
