# obsidianmd/no-view-references-in-plugin

📝 Disallow storing references to custom views directly in the plugin, which can cause memory leaks.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Inside the view factory passed to `registerView()` on your plugin, assigning a newly created view to a
property of the plugin, through `this` or a `const` alias of it such as `const self = this`:

```ts
this.registerView(VIEW_TYPE, (leaf) => (this.view = new MyView(leaf))); // reported
this.registerView(VIEW_TYPE, (leaf) => new MyView(leaf)); // create and return it instead
```

The plugin and the view are recognised by type: the call must be on a class that extends `Plugin`, and
the created object's class must extend `View`. The assignment is found in an arrow function's
expression body, or as a statement or `return` directly inside the factory's body. To reach an open
view later, use `this.app.workspace.getLeavesOfType(VIEW_TYPE)`.

There is no fix. Not reported, because the rule only looks for the direct form above:

- assigning anything other than a `new` view, such as a flag
- storing the view through a variable first, or from inside a nested block such as an `if`
- a factory passed by reference, such as `this.registerView(VIEW_TYPE, this.createView)`
