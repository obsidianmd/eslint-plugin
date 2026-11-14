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

// The other choice to `activeDocument`, for an Obsidian or an environment without popout windows
const doc = requireApiVersion("0.15.0") ? activeDocument : document;
const body = (activeDocument ?? document).body;

// The main window's document listed with the others, by code that goes over each window
const docs = [document, ...this.getPopoutDocuments()];
for (const doc of new Set([document, activeDocument])) { /* … */ }

// UI that only the main window has
const statusBar = document.getElementsByClassName("status-bar")[0];
document.querySelector(".workspace-ribbon.mod-left");
```

A listener given inline to `registerDomEvent(document, …)`, `registerDomEvent(window, …)`,
`document.addEventListener()` or `window.addEventListener()` on the global `document` or `window`
is left alone, at any depth, and so is one declared as `const onKey = (e) => { … }` that is only
ever added to or removed from them. A listener on `activeWindow`, on an element or on another
window, one also registered on a pop-out's window, or one the code also calls, still has its
`document` reported.

`document` as either branch of a condition (`? :`) whose other branch is `activeDocument`, or as
the right operand of `??` or `||` whose left operand is, is left alone; so is `window.activeDocument`
there. So is `document` in an array literal that also has a spread element, `activeDocument`, or a
property named `doc`, `document`, `ownerDocument` or `activeDocument`, such as `win.document`.

A lookup of UI that only the main window has is left alone: a popout window has its own workspace
and title bar, but no status bar, ribbons or side docks, so `activeDocument` there would find
nothing. These are `querySelector()`, `querySelectorAll()`, `getElementsByClassName()`, `find()`
and `findAll()` on `document`, `document.body` or `document.documentElement`, with a string whose
classes include `status-bar` (or `status-bar-…`), `workspace-ribbon`, `side-dock-…` (as in
`side-dock-ribbon`), `mod-left-split`, `mod-right-split` or `mod-sidedock`. In a selector, each of a
list's selectors (`a, b`) has to name one of them, and one with `:not(` is still reported. A
selector built at runtime, or one naming a view, such as the file explorer's, which can be moved
to a popout window, is still reported.

Only the bare global `document` is reported; `window.document` and
`globalThis.document` are not. Runtime code inside a plain `namespace` is still
checked; an ambient `declare module`, `declare namespace` or `declare global` is
not.

There is no autofix; see [Suggestion](#suggestion).

The recommended config switches this rule off for web worker files, which have no `activeDocument`,
and for test files and tool configs, which do not run in Obsidian; see
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

`prefer-create-el` reports them at the same place, and its replacement removes `document`. These
are the files the recommended config runs `prefer-create-el` on; anywhere else, such as a JavaScript
file, this rule still reports them. So it does where `minAppVersion` is older than the helper the
replacement needs, as `createSvg()` (1.1.0) is for 1.0.0, since `prefer-create-el` leaves the call
alone there; not below 0.15.0, which has no `activeDocument` either. A rule cannot see another's configuration: if your config turns
`prefer-create-el` off for those files, neither rule reports these calls. A call `prefer-create-el` leaves alone, such as
`document.createElement("div", { is: "my-div" })`, is reported here as before, and so is a call
inside an implementation of a DOM helper, such as a polyfill, which `prefer-create-el` leaves alone
(see [Helper implementations](prefer-create-el.md#helper-implementations)).

Where a comment turns `prefer-create-el` off for the call (`eslint-disable-next-line`,
`eslint-disable-line`, or an `eslint-disable` range naming it), this rule reports `document` there
as before. The recommended config does not allow such a comment: its
`eslint-comments/no-restricted-disable` reports any disable comment for an `obsidianmd/` rule. This
applies only to a config that lifts that restriction.

A rule cannot see the config of another, so if you switch `prefer-create-el` off for TypeScript files
in your config, neither rule reports these calls.

## Suggestion

There is no autofix: whether a piece of code should follow the window that has focus or a specific
element's window depends on what it does. A report offers an editor suggestion instead, which you
review before applying: replace `document` with `activeDocument`, the document of the window that
has focus. Where an element is at hand, its own document, `el.doc`, is often the better choice.

```ts
const hit = document?.querySelector(".x"); // suggests activeDocument?.querySelector(".x")
const dark = document.body.hasClass("theme-dark"); // suggests activeDocument.body.hasClass(…)
document.contains(el);                     // suggests el.isConnected
```

`document.contains(node)` suggests `node.isConnected` instead, which is true when the node is in a
document, that of its own window: the same check, for every window. It is offered with type
information only, where `node` is a `Node` that cannot be `null` or `undefined` (`contains(null)`
is `false`, while `null.isConnected` throws), and the call has one argument and no comments. The
two differ for a node in a shadow root, which is connected but not contained.

### State of the whole window

A change to the main window's `<body>`, `<html>` or `<head>` is reported with its own message, and
nothing is suggested:

```ts
onload() { document.body.classList.add("my-plugin-on"); }
onunload() { document.body.classList.remove("my-plugin-on"); }
document.documentElement.style.setProperty("--my-plugin-width", "10px");
document.head.appendChild(styleEl);
```

The report is right: the change does not reach popout windows. But with `activeDocument` each line
would change whichever window has focus when it runs, so a class added in one window could be
removed from another, and the plugin would leave classes, CSS variables or `<style>` elements
behind. Make the change in each window's document instead, for example from
`workspace.on("window-open", …)` and for the windows already open, and undo it in each.

These are, on `document.body`, `document.documentElement` or `document.head`: `classList.add()`,
`remove()`, `toggle()` and `replace()`; Obsidian's `addClass()`, `addClasses()`, `removeClass()`,
`removeClasses()`, `toggleClass()`, `setAttr()`, `setCssProps()` and `setCssStyles()`;
`setAttribute()`, `removeAttribute()` and `toggleAttribute()`; `style.setProperty()`,
`style.removeProperty()`, and an assignment to a `style` or `dataset` property or to a property
of the element itself (`className`); `appendChild()`, `append()`, `prepend()`, `insertBefore()`,
`removeChild()`, `replaceChild()`, `replaceChildren()` and `insertAdjacent…()`; and, on
`document.head`, `createEl()`, `createDiv()`, `createSpan()` and `createSvg()`. A read, such as
`document.body.hasClass()` or `classList.contains()`, and `document.body.createDiv()`, whose element
the code removes itself, keep the suggestion.

So does an element the code puts in `document.body` only for a moment: one it passes, as a variable,
to `appendChild()`, `append()`, `prepend()`, `insertBefore()` or `insertAdjacentElement()` and also
removes, with `remove()`, `detach()` or `removeChild()`, anywhere in its scope. A download link or a
textarea for copying text is no state of the window, and belongs in the active window's body:

```ts
document.body.appendChild(link); link.click(); link.remove(); // reported, suggestion: activeDocument.body
document.body.appendChild(panel); // reported, nothing offered: never removed, so the window's state
```

The code that puts such an element in the body, takes it out and checks for it has to use the same
body: with `activeDocument.body` for the `appendChild()` alone, a later
`document.body.removeChild(el)` would throw in a popout window, and `document.body.contains(el)`
would be false. So the suggestion rewrites the `document` of every `document.body.appendChild(el)`,
`removeChild(el)`, `contains(el)` and the like for that element at once, and is offered on each of
them. Where one of them cannot be rewritten, none of them gets it.

```ts
document.body.appendChild(c);
try { await render(c); } finally { document.body.removeChild(c); }
// both reported, the same suggestion on each: activeDocument.body in both places
```

On `document.head` such an element is still the window's state, like a `<style>`.

Nothing is offered where `activeDocument` would not exist, or would not be what the code means:

- a local binding named `activeDocument` shadows the global, such as a parameter;
- with type information, the program does not declare `activeDocument`, because the `obsidian`
  typings are not part of it;
- a web worker file, by the paths the recommended config uses: a `.ts`, `.cts`, `.mts`, `.tsx`, `.js`, `.cjs`, `.mjs` or `.jsx` file matching
  `**/worker.*`, `**/*.worker.*`, `**/*-worker.*` or `**/*_worker.*`, or any such file under a
  `workers` directory (not a `worker` directory); or a file whose config turns the `activeDocument`
  global `"off"`;
- a file of Emscripten output, which reads `ENVIRONMENT_IS_WORKER` or `ENVIRONMENT_IS_NODE`;
- code that also runs outside Obsidian, as a check before it in the same function, or one that
  decides whether it runs, shows: `typeof document`, `typeof window`, `"window" in globalThis`, a
  check of `activeDocument` or `activeWindow` themselves, such as
  `typeof activeDocument !== "undefined" ? activeDocument.body : document.body`, or of one of
  Obsidian's DOM helpers, such as `typeof createDiv === "function"`, or a name such as
  `isBrowser`; the body of a `try` whose `catch` drops the error; or code that runs once a `try`
  that reads the document, or calls a DOM helper such as `createEl()` by its bare name, has failed:
  its `catch` or `finally`, or what follows a `catch` that goes on. A browser or a DOM emulation such as jsdom has a `document` but no `activeDocument`;
- the document itself compared, as in `e.target === document`, `el.ownerDocument !== document` or
  `case document:`, and any `document` in a function that compares a document with it, as in
  `if (newDoc !== document) { for (const cls of document.body.classList) … }`: code that tells the
  main window from the others;
- the document handed on as a value: an argument (`this.registerDocumentEvents(document)`), an
  element of an array (`new Set([document])`), a property's value (`{ document }`,
  `{ doc: document }`), assigned (`this.doc = document`), a default (`doc: Document = document`),
  a field's value, or returned (`() => document`), also as a branch of a condition. The code that
  gets it may handle each window's document on its own, and `activeDocument` would hand on
  whichever had focus. A fallback such as `const doc = el?.doc ?? document` keeps the suggestion;
- `document.body.contains(node)` and `document.documentElement.contains(node)`, as in
  `document.body.contains(el) && document.body.removeChild(el)`: the node was put in a given
  window, and `activeDocument` would check another one. A `document.body.contains(el)` for an
  element the code itself puts in the body only for a moment moves with it, as above;
- an element looked up to be removed, as in `document.getElementById("my-style")?.remove()` or
  `document.head.querySelector("style.x")?.detach()`: it was put in the main window, where the
  removal has to look for it;
- the document a listener is attached to or removed from: `registerDomEvent(document, …)`,
  `document.addEventListener()` or `document.removeEventListener()`, also through a local
  variable (`const doc = document; doc.addEventListener(…)`). The listener stays on that document,
  and a removal has to name the one it was added to; for popout windows, register the listener on
  each window instead, for example from `workspace.on("window-open", …)`;
- the document an event is dispatched on, `document.dispatchEvent(…)`, also through a local
  variable: a plugin's own events, as an event bus, reach the listeners on that document, which
  stay on the main one;
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
