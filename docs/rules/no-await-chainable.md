# obsidianmd/no-await-chainable

📝 Disallow awaiting `Setting` and UI components, whose `then` is for chaining and never settles a promise.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->

`Setting` and the UI components (`ButtonComponent`, `TextComponent`, `ToggleComponent` and the rest of `BaseComponent`'s subclasses) have a `then(cb)` method for chaining: it calls `cb` with the object and returns the object. That makes them thenables, so `await` and an async function's `return` treat them as promises. The resolution calls `then` again with the same object, forever, so the `await` never finishes and the app stops responding.

Type-checking with `tsc` reports this as error TS1062. This rule also catches it in JavaScript and in builds that skip type-checking.

## What is reported

- `await x`, where the type of `x` is, or is a union that includes, a type whose `then` is
  declared only in Obsidian's `obsidian.d.ts`: `Setting`, `BaseComponent` and its subclasses, and
  your own subclasses of them. `Setting | undefined` is reported too.
- `return x` and an arrow function's expression body `=> x` in an `async` function, for the same
  types, since the async function's promise resolves with `x` the same way.

Not reported: a class that declares or overrides its own `then`, and returning such an object
from a function that is not `async`.

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
