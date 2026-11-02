# obsidianmd/settings-tab/prefer-update-over-display

📝 Prefer this.update() over this.display() to refresh a PluginSettingTab on Obsidian 1.13+.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

A call to `this.display()` inside a settings tab, including from an arrow callback such as an
`onChange` handler, once `minAppVersion` is 1.13.0 or later. Re-calling `display()` does not refresh
declarative settings there; `this.update()` does. The fix renames the call to `this.update()`.

```ts
onChange(async (value) => {
  this.plugin.settings.mode = value;
  this.display(); // reported, fixed to this.update()
});
```

Not reported: `display()` called on anything other than `this`, a call outside a settings tab, and
any call while `minAppVersion` is below 1.13.0.

Only a class that extends `PluginSettingTab` by that name is checked, declared, `abstract` or as a
class expression; a superclass written as a property access (`obsidian.PluginSettingTab`) is not. The version comes from the `minAppVersion` option, or else from `manifest.json` in the directory
ESLint runs from. When neither gives a valid `x.y.z` version, the rule does nothing.

## Further reading

- [Migrate to declarative settings](https://docs.obsidian.md/Plugins/Guides/Migrate+to+declarative+settings)

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
