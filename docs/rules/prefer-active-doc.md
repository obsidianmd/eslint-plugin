# obsidianmd/prefer-active-doc

📝 Prefer `activeDocument` over `document` for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

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

// In a listener on the main window's `document` or `window`, which handles that
// window's events, so its `document` is the right one (the registration is reported)
this.registerDomEvent(document, "visibilitychange", () => {
  if (document.visibilityState === "visible") refresh();
});
window.addEventListener("keydown", () => { if (document.querySelector(".modal")) return; });
```

A listener given inline to `registerDomEvent(document, …)`, `registerDomEvent(window, …)`,
`document.addEventListener()` or `window.addEventListener()` on the global `document` or `window`
is left alone, at any depth, and so is one declared as `const onKey = (e) => { … }` that is only
ever added to or removed from them. A listener on `activeWindow`, on an element or on another
window, one also registered on a pop-out's window, or one the code also calls, still has its
`document` reported.

Only the bare global `document` is reported; `window.document` and
`globalThis.document` are not. Runtime code inside a plain `namespace` is still
checked; an ambient `declare module`, `declare namespace` or `declare global` is
not.

There is no autofix; see [Suggestion](#suggestion).

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

Where a comment turns `prefer-create-el` off for the call (`eslint-disable-next-line`,
`eslint-disable-line`, or an `eslint-disable` range naming it), this rule reports `document` there
as before:

```ts
// eslint-disable-next-line obsidianmd/prefer-create-el -- the canvas is sized before use
const canvas = document.createElement("canvas"); // reported: use activeDocument
```

A rule cannot see the config of another, so if you switch `prefer-create-el` off for TypeScript files
in your config, neither rule reports these calls.

## Suggestion

There is no autofix: whether a piece of code should follow the window that has focus or a specific
element's window depends on what it does. A report offers an editor suggestion instead, which you
review before applying: replace `document` with `activeDocument`, the document of the window that
has focus. Where an element is at hand, its own document, `el.doc`, is often the better choice.

```ts
document.body.addClass("my-plugin");       // suggests activeDocument.body.addClass("my-plugin")
const hit = document?.querySelector(".x"); // suggests activeDocument?.querySelector(".x")
render({ document });                      // suggests render({ document: activeDocument })
```

Nothing is offered where `activeDocument` would not exist, or would not be what the code means:

- a local binding named `activeDocument` shadows the global, such as a parameter;
- with type information, the program does not declare `activeDocument`, because the `obsidian`
  typings are not part of it;
- a web worker file, by the paths the recommended config uses (`*.worker.*`, or any file under a
  `workers` directory), or a file whose config turns the `activeDocument` global `"off"`;
- code that also runs outside Obsidian, as a check before it in the same function, or one that
  decides whether it runs, shows: `typeof document`, `typeof window`, `"window" in globalThis`, a
  check of `activeDocument` or `activeWindow` themselves, such as
  `typeof activeDocument !== "undefined" ? activeDocument : document`, or a name such as
  `isBrowser`; the body of a `try` whose `catch` drops the error; or code that runs once a `try`
  that reads the document has failed: its `catch` or `finally`, or what follows a `catch` that goes
  on. A browser or a DOM emulation such as jsdom has a `document` but no `activeDocument`;
- the document itself compared, as in `e.target === document`, `el.ownerDocument !== document` or
  `case document:`;
- the document a listener is attached to or removed from: `registerDomEvent(document, …)`,
  `document.addEventListener()` or `document.removeEventListener()`, also through a local
  variable (`const doc = document; doc.addEventListener(…)`). The listener stays on that document,
  and a removal has to name the one it was added to; for popout windows, register the listener on
  each window instead, for example from `workspace.on("window-open", …)`;
- the document kept for later: in a variable of the module (`const doc = document;` at the top
  level, or assigned to one), in a property of the global object (`window.doc = document`) or of
  `module.exports`, as the default export or in a `static` field. `activeDocument` there keeps whichever document had focus
  at the time;
- an assignment to `document`, and `export { document }`;
- a `minAppVersion` below 0.15.0, which has no `activeDocument`. Where no version is known (no
  `minAppVersion` option and no `manifest.json` `minAppVersion`, or the one that applies, the option
  before the manifest, is not a version, such as `latest`), the suggestion is offered and says it
  needs Obsidian 0.15.0.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
