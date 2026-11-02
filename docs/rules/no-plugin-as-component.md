# obsidianmd/no-plugin-as-component

📝 Disallow anti-patterns when passing a component to MarkdownRenderer.render to prevent memory leaks.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The `component` argument, the fifth, of `MarkdownRenderer.render()`, when it is:

- the plugin, or any other value whose type is `Plugin` or a subclass of it, such as `this` in the
  plugin class or a `plugin` property in a view. The plugin stays loaded until it is disabled, so
  everything the rendered Markdown registers on it stays loaded that long too;
- a component created inline with `new`, such as `new Component()`: nothing keeps a reference to it,
  so its `unload()` can never be called.

Pass the view or modal that shows the content, or a component you keep and unload yourself:

```ts
// In an ItemView: the view unloads what it owns when it closes.
await MarkdownRenderer.render(this.app, markdown, this.contentEl, file.path, this);
```

The rule needs type information, so the recommended config runs it on TypeScript files only.
