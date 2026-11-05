# obsidianmd/sample-names

📝 Rename sample plugin class names.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A class, interface or type alias declaration that still carries one of the sample plugin's
placeholder names: `MyPlugin`, `MyPluginSettings`, `SampleSettingTab` or `SampleModal`; a class
expression named so, or assigned to a variable named so; and a property named `mySetting`, the
sample's setting, declared in an interface or object type.

```ts
export default class MyPlugin extends Plugin {} // reported
interface MyPluginSettings { mySetting: string } // reported twice: the interface and the setting
const SampleModal = class extends Modal {}; // reported
```

```ts
export default class WordCountPlugin extends Plugin {} // not reported
type WordCountSettings = { mySetting: string }; // reported: the setting
```

Not reported: a function, or a variable that does not hold a class, that happens to use one of
those names, and `mySetting` where it is used rather than declared, such as
`{ mySetting: "default" }` or `this.settings.mySetting`; renaming the declaration makes TypeScript
point out those. There is no fix; pick names that describe your plugin.

## Further reading

- [Rename placeholder class names - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Rename+placeholder+class+names)
