# obsidianmd/prefer-active-doc

📝 Prefer `activeDocument` over `document` for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

Obsidian can open notes in popout windows, each with its own `document`. The
global `document` always belongs to the main window, so code that creates or
queries elements through it misbehaves in a popout. `activeDocument` is the
document of the window the user is currently working in.

## Examples

Reported — the global `document`, wherever it is read at runtime:

```ts
const el = document.createElement("div");
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
