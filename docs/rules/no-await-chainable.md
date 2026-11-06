# obsidianmd/no-await-chainable

📝 Disallow awaiting `Setting` and UI components, whose `then` is for chaining and never settles a promise.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

`Setting` and the UI components (`ButtonComponent`, `TextComponent`, `ToggleComponent` and the rest of `BaseComponent`'s subclasses) have a `then(cb)` method for chaining: it calls `cb` with the object and returns the object. That makes them thenables, so `await` and an async function's `return` treat them as promises. The resolution calls `then` again with the same object, forever, so the `await` never finishes and the app stops responding.

Type-checking with `tsc` reports this as error TS1062. This rule also catches it in JavaScript and in builds that skip type-checking.

## Examples

Incorrect:

```ts
async display() {
    await new Setting(this.containerEl)
        .setName("Name")
        .addText((text) => text.setValue(this.plugin.settings.name));
}
```

Correct:

```ts
async display() {
    new Setting(this.containerEl)
        .setName("Name")
        .addText((text) => text.setValue(this.plugin.settings.name));
}
```
