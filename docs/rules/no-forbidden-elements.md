# obsidianmd/no-forbidden-elements

📝 Disallow attachment of forbidden elements to the DOM in Obsidian plugins.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Creating a `<style>` or `<link>` element, the two elements a plugin would use to load CSS, whether or
not it is attached afterwards:

- `createElement("style")` and `createElement("link")` on a document: `document`, `activeDocument`,
  or a property ending in `.document`, `.activeDocument`, `.doc` or `.ownerDocument`, such as
  `window.document`, `activeWindow.document`, `el.doc` or `el.ownerDocument`
- `createEl("style")` and `createEl("link")` called on an element, whatever the expression for it,
  such as `containerEl.createEl("style")`, `document.head.createEl("link")`, `el!.createEl("style")`
  or the element a call returns, as in `containerEl.createDiv().createEl("style")`
- Obsidian's global `createEl("style")` and `createEl("link")`, unless the file defines or imports
  its own `createEl`

The tag name is matched in any case. Only a tag name written out is checked: a string, or a template
literal without expressions (`` createEl(`style`) ``), also with a type assertion such as `as const`.
A tag name held in a variable or built in a template literal (`` `${tag}` ``) is not checked. A
document is only recognised by the expressions above, also with `!` or a type assertion such as
`as Document`: one stored in a variable first (`const doc = el.doc; doc.createElement("style")`) or
returned by a call is not followed, and an iframe's `contentDocument` is not the plugin's document.

### Shadow roots

`styles.css` does not reach inside a shadow root, so a `<style>` or `<link>` there is the only way to
style its contents, and is not reported:

- `createEl("style")` called on a shadow root or an element created in one: `el.attachShadow(…)`,
  `el.shadowRoot`, `x as ShadowRoot`, a variable or parameter typed `ShadowRoot` (in its annotation
  or, with type information, its type), a `const` holding one of these or a `let` only ever set to
  one, and the result of `createEl()`, `createDiv()` or `createSpan()` on one, as in
  `const head = shadowRoot.createEl("head"); head.createEl("style", { text: css })`. Unless the
  element is then moved out of the shadow root: a `const` holding it that is passed to an insertion
  below into anything else is reported;
- an element created on a document and passed straight to a shadow root's `appendChild()`,
  `append()`, `prepend()`, `insertBefore()` or `insertAdjacentElement()`, or held in a `const` that
  every such call in the file passes to a shadow root. An element that is never inserted in the
  file, or is also inserted elsewhere, is still reported.

A variable or parameter counts as a shadow root by its name, `shadowRoot`, only where nothing else
tells what it holds: a global, an untyped parameter, or a value such as `el.getRootNode()`, which
may be a shadow root. `const shadowRoot = document.head`, a `shadowRoot: HTMLElement` parameter or,
with type information, a `shadowRoot` whose type is an element is not a shadow root.

A shadow root held in a class property (`this.shadowHead.createEl("style")`) is not followed.

Put the plugin's CSS in `styles.css` instead, which Obsidian loads for you. The [community scanner](../configuration.md#community-plugin-scanner-configuration)
keeps this rule at `error`.

The recommended config does not apply this rule to [test files and tool configs](../configuration.md#test-files),
which never run in Obsidian.
