# obsidianmd/prefer-active-doc

📝 Prefer `activeDocument` over `document` for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

Obsidian can open notes in popout windows, each with its own `document`. The
global `document` always belongs to the main window, so code that creates or
queries elements through it misbehaves in a popout. `activeDocument` is the
document of the window the user is currently working in.

## What is reported

Reported — the global `document`, wherever it is read at runtime:

```ts
const el = document.querySelector(".my-plugin");
document.body.addClass("my-plugin");
const doc = document;
obj[document];
```

Not reported — names and types that only happen to be called `document`:

```ts
// Type positions, including `typeof` queries
interface SearchHit { document: SearchDocument; }
let html: ReturnType<typeof mathjax.document> | null = null;

// Property and member names
result.document;
const hit = { document: "a" };
class Hit { document = ""; }

// Local bindings that shadow the global
function render(document: Document) { document.title; }
const { document } = hit;

// Environment checks
if (typeof document === "undefined") { /* in a worker */ }
```

Only the bare global `document` is reported; `window.document` and
`globalThis.document` are not. Runtime code inside a plain `namespace` is still
checked; an ambient `declare module`, `declare namespace` or `declare global` is
not.

There is no fix: whether a piece of code should follow the active window or a specific element's
window (`el.doc`) depends on what it does.

The recommended config switches this rule off for web worker files, which have no `activeDocument`,
and for test files, which do not run in Obsidian; see
[Web worker files](../configuration.md#web-worker-files) and [Test files](../configuration.md#test-files).

### Calls left to `prefer-create-el`

In a TypeScript file (`.ts`, `.cts`, `.mts`, `.tsx`) linted with type information, the calls that
[`prefer-create-el`](prefer-create-el.md) reports on the global `document` are not reported here:

```ts
document.createElement("p");                                       // createEl("p")
document.createElementNS("http://www.w3.org/2000/svg", "path");    // createSvg("path")
document.createDocumentFragment();                                 // createFragment()
document.createEl("div");                                          // createDiv()
```

`prefer-create-el` reports them at the same place, and its replacement removes `document`, whereas
`activeDocument.createElement("p")` would still be reported by it. These are the files the
recommended config runs `prefer-create-el` on; anywhere else, such as a JavaScript file, this rule
still reports them. A call `prefer-create-el` leaves alone, such as
`document.createElement("div", { is: "my-div" })`, is reported here as before.

This rule cannot tell whether `prefer-create-el` is switched on. If you switch it off for TypeScript
files, neither rule reports these calls.
