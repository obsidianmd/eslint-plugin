# obsidianmd/settings-tab/no-manual-html-headings

📝 Disallow using HTML heading elements for settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A heading element (`h1` to `h6`) created with `createEl()` on an element, such as
`containerEl.createEl("h2", { text: "Advanced" })`, inside a class that extends `PluginSettingTab`,
declared or as a class expression, including in its callbacks and nested functions. Obsidian's
setting headings keep the settings UI consistent:

```ts
new Setting(containerEl).setName("Advanced").setHeading();
```

Headings created outside a settings tab are not reported. The nearest enclosing class decides, so a
heading in a class nested in the tab, such as a helper class of its own, is not reported either,
while the rest of the tab still is. A superclass written as a property access
(`obsidian.PluginSettingTab`) is not recognised.

## Fixes and suggestions

The rewrite takes the heading text from the `text` option, or from `.setText()` called on the new
heading, as written: a variable, a call or a template literal works as well as a string literal.
When `Setting` is not imported yet, it is added to the file's `import { … } from "obsidian"`.

The result is a `Setting`, not the heading element, and other options and the callback have nowhere
to go. So the rewrite is applied as a fix only where nothing else changes:

- the call is a statement on its own, so its return value is not used;
- it has no options other than `text`, and no callback;
- `new Setting()` accepts the parent element and `setName()` the text. With type information this is
  checked against Obsidian's declarations. Without it, the parent must be the tab's
  `this.containerEl`, a `containerEl` taken from it, or a binding typed as an HTML element, and the
  text a string or template literal, a concatenation with one, or a binding typed as `string`.

```ts
containerEl.createEl("h2", { text: "Advanced" }); // fixed
containerEl.createEl("h2").setText(t("advanced")); // fixed to new Setting(containerEl).setName(t("advanced")).setHeading()
```

Where other options, the callback, or the lack of type information stand in the way, the rewrite is
offered as a suggestion instead. A heading kept in a variable that is never read gets a suggestion
too.

```ts
containerEl.createEl("h4", { text: "Display", cls: "my-heading" }); // suggestion: the class is dropped
```

There is no fix or suggestion where the rewrite would not compile or would lose the text: the
heading element is used afterwards (read from a variable, chained on, passed on or returned), the
parent is not an HTML element (such as a `DocumentFragment`), the text may be `undefined`, the
options are not an object literal, `Setting` is only imported as a type or there is no named import
from `"obsidian"` to add it to, or the project's `Setting` has no `setHeading()`. With type
information, the same goes for a `Setting` whose constructor cannot be called with the parent
element alone: one that takes no parameter or needs a second argument, as in hand-written
declarations.

```ts
const title = containerEl.createEl("h3", { text: "Models" }); // reported, no fix
title.addClass("models-title");
```

## Further reading

- [UI text - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#UI+text)
