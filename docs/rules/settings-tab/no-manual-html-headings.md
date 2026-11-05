# obsidianmd/settings-tab/no-manual-html-headings

📝 Disallow using HTML heading elements for settings headings.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A heading element (`h1` to `h6`) created with `createEl()` directly on the settings tab's
`containerEl`, such as `containerEl.createEl("h2", { text: "Advanced" })`, inside a class that
extends `PluginSettingTab`, declared or as a class expression, including in its callbacks and arrow
functions. The tab's `containerEl` is `this.containerEl`, a `const` holding it
(`const containerEl = this.containerEl`, `const { containerEl } = this`), or a parameter named
`containerEl`, as in `renderSection(containerEl: HTMLElement)`. Obsidian's setting headings keep the
settings UI consistent:

```ts
new Setting(containerEl).setName("Advanced").setHeading();
```

A heading on any other element is not reported: in a container of the plugin's own
(`containerEl.createDiv({ cls: "banner" }).createEl("h3", …)`), a setting's `nameEl` or `descEl`, a
description or a `Notice` built with `createFragment()`, or `this.contentEl`. There it is part of that
element's layout and styling, and a `Setting` row would not fit it.

Headings created outside a settings tab are not reported either. The nearest enclosing class decides, so a
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
- the parent is `this.containerEl` or a `const` holding it; on a parameter named `containerEl`, which
  may be a container of the plugin's own, the rewrite is a suggestion;
- the heading has text: `containerEl.createEl("h3")` with no text or an empty one, such as a spacer,
  is reported without a fix or a suggestion, as an empty heading row would replace it;
- `new Setting()` accepts the parent element and `setName()` the text. With type information this is
  checked against Obsidian's declarations. Without it, the text must be a string or template literal,
  a concatenation with one, or a binding typed as `string`.

```ts
containerEl.createEl("h2", { text: "Advanced" }); // fixed
containerEl.createEl("h2").setText(t("advanced")); // fixed to new Setting(containerEl).setName(t("advanced")).setHeading()
```

Where other options, the callback, or the lack of type information stand in the way, the rewrite is
offered as a suggestion instead. A heading kept in a variable that is never read gets a suggestion
too.

```ts
containerEl.createEl("h4", { text: "Display", cls: "my-heading" });
// suggestion, with type information: new Setting(containerEl).setName("Display").setClass("my-heading").setHeading()
containerEl.createEl("h4", { text: "Display", attr: { id: "display" } });
// suggestion: new Setting(containerEl).setName("Display").setHeading(), "dropping the `attr` option"
```

With type information, where Obsidian's declarations give `Setting` a `setClass()` that takes the
`cls` value (a string; an array of classes does not fit), the suggestion keeps the class with
`.setClass()`. The class then moves from the heading element (the `<h4>`) to the setting's element,
`settingEl`, so a style that selects the heading by it, such as `h4.my-heading`, no longer applies:
check your CSS before you apply it. Without type information the class is dropped, like the other
options. Whatever the suggestion drops, its description names: the other options (`attr`, `title`,
`parent`, …), a `text` option that `.setText()` replaces, and the callback.

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
