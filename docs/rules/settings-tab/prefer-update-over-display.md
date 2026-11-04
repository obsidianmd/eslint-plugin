# obsidianmd/settings-tab/prefer-update-over-display

📝 Prefer this.update() over this.display() to refresh a PluginSettingTab on Obsidian 1.13+.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

A call to `this.display()` inside a settings tab, including from an arrow callback such as an
`onChange` handler, once `minAppVersion` is 1.13.0 or later. Re-calling `display()` does not refresh
declarative settings there; `this.update()` does. A tab without declarative settings is still
refreshed: `update()` calls its `display()`.

```ts
onChange(async (value) => {
  this.plugin.settings.mode = value;
  this.display(); // reported, fixed to this.update()
});
```

Not reported: `display()` called on anything other than `this`, a call outside a settings tab, and
any call while `minAppVersion` is below 1.13.0.

The recommended config also runs typescript-eslint's `no-deprecated`, and `obsidian` typings from
1.13 mark `display()` deprecated. The config has `no-deprecated` allow `display()` while the
`minAppVersion` in `manifest.json` is below 1.13.0, or there is no valid one; from 1.13.0
`no-deprecated` reports every `display()` call, on `this` or not. That allowance follows
`manifest.json` only; this rule's `minAppVersion` option does not change it.

`--fix` renames the call to `this.update()` only when type information shows that it is safe: the
installed `obsidian` typings are 1.13.0 or later and give the tab Obsidian's own `update()`, and
the call's result is unused or `display()` returns `void`. Otherwise the rename is offered as an
editor suggestion, which you review before applying:

- without type information (JavaScript files, or no `parserOptions.projectService` or `project`);
- with `obsidian` typings older than 1.13, which have no `update()`: upgrade the `obsidian` package
  along with it;
- when the tab declares an `update` of its own;
- in a `function` callback whose `this` is not typed as the tab;
- when the promise of an `async display()` is awaited or returned, since `update()` returns `void`.

A call that passes arguments, or one in the tab's own `update()` or directly in
`getSettingDefinitions()`, is reported without a fix or suggestion: `update()` takes no arguments,
and it calls `getSettingDefinitions()`, so the renamed call would end up calling itself.

Only a class that extends `PluginSettingTab` by that name is checked, declared, `abstract` or as a
class expression; a superclass written as a property access (`obsidian.PluginSettingTab`) is not. The version comes from the `minAppVersion` option, or else from `manifest.json` in the directory
ESLint runs from. When that version is not a valid `x.y.z` version, the rule does nothing; an
invalid option, such as `"1.13"`, is not replaced by the manifest's version.

## Further reading

- [Migrate to declarative settings](https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings)

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
