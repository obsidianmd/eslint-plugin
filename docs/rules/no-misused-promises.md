# obsidianmd/no-misused-promises

📝 Disallow Promises in places not designed to handle them, without treating Obsidian's chaining `then` as a Promise.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

This is typescript-eslint's
[`no-misused-promises`](https://typescript-eslint.io/rules/no-misused-promises/) with one
difference: it does not treat Obsidian's chaining `then` as a Promise. The recommended config
turns `@typescript-eslint/no-misused-promises` off and this rule on, at the same severity and
with the same options.

Obsidian's `BaseComponent` (every `ButtonComponent`, `ToggleComponent`, `TextComponent` and so
on) and `Setting` declare `then(cb: (component: this) => any): this` so calls can be chained. To
TypeScript that makes every component and every setting "thenable", so the upstream rule
reports ordinary code like these as misused promises:

```ts
// Reported upstream as voidReturnArgument: forEach expects a void callback
names.forEach((name) => new Setting(containerEl).setName(name));

// Reported upstream as conditional
if (toggle) toggle.setValue(true);
```

This rule runs the upstream rule unchanged, except that a `then` declared only in the
`obsidian` package's own `obsidian.d.ts` is treated as not callable. Everything else is
reported exactly as upstream reports it:

- real Promises, whose `then` comes from TypeScript's own lib;
- your own classes with a `then`, including a subclass of `Setting` that overrides it;
- a `then` added to an Obsidian type through `declare module "obsidian"` in your code;
- a value that may be a Promise, such as a callback returning `Setting | Promise<void>`.

As upstream, a union in a condition (`if (value)` with `value: Setting | Promise<void>`) is only
reported with `checksConditionals: { flagUnions: "all" }` or `"strict"`.

## Migrating

Disable comments for the upstream rule no longer match anything, so
`// eslint-disable-next-line @typescript-eslint/no-misused-promises` becomes
`// eslint-disable-next-line obsidianmd/no-misused-promises -- <reason>`. Unlike the other
`obsidianmd/*` rules, this one may be disabled inline, as the upstream rule could. Keep the
description after `--`: the recommended config's `eslint-comments/require-description` reports a
disable comment without one.

typescript-eslint's `strictTypeChecked` and `recommendedTypeChecked` turn the upstream rule back on.
If you add either yourself, on top of the recommended config or around
`ruleConfigs.recommendedTypeChecked` (which already turns this rule on), turn the upstream rule off in
that block. Otherwise both rules report every real Promise, and the upstream one reports Obsidian's
chaining `then` again:

```js
{
  files: ["**/*.ts"],
  extends: [tseslint.configs.strictTypeChecked],
  rules: {
    "@typescript-eslint/no-misused-promises": "off",
  },
},
```

## Options

The options are typescript-eslint's, and nest as they do there: `flagUnions` belongs to
`checksConditionals`, and `arguments`, `attributes`, `inheritedMethods`, `properties`, `returns`
and `variables` belong to `checksVoidReturn`. The table below lists them flat.

<!-- begin auto-generated rule options list -->

| Name                 | Description                                                                                                                        | Type    | Choices                 |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------ | :---------------------- |
| `arguments`          | Disables checking an asynchronous function passed as argument where the parameter type expects a function that returns `void`.     | Boolean |                         |
| `attributes`         | Disables checking an asynchronous function passed as a JSX attribute expected to be a function that returns `void`.                | Boolean |                         |
| `checksConditionals` | Whether to warn when a Promise is provided to conditional statements.                                                              |         |                         |
| `checksSpreads`      | Whether to warn when `...` spreading a `Promise`.                                                                                  | Boolean |                         |
| `checksVoidReturn`   | Whether to warn when a Promise is returned from a function typed as returning `void`.                                              |         |                         |
| `flagUnions`         | Configures how union types containing Promise-like types are checked.                                                              | String  | `all`, `strict`, `none` |
| `inheritedMethods`   | Disables checking an asynchronous method in a type that extends or implements another type expecting that method to return `void`. | Boolean |                         |
| `properties`         | Disables checking an asynchronous function passed as an object property expected to be a function that returns `void`.             | Boolean |                         |
| `returns`            | Disables checking an asynchronous function returned in a function whose return type is a function that returns `void`.             | Boolean |                         |
| `variables`          | Disables checking an asynchronous function used as a variable whose return type is a function that returns `void`.                 | Boolean |                         |

<!-- end auto-generated rule options list -->
