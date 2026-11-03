# obsidianmd/sample-names

📝 Rename sample plugin class names.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A class or interface declaration that still carries one of the sample plugin's placeholder names:
`MyPlugin`, `MyPluginSettings`, `SampleSettingTab` or `SampleModal`.

```ts
export default class MyPlugin extends Plugin {} // reported
interface MyPluginSettings { mySetting: string } // reported
export default class WordCountPlugin extends Plugin {} // not reported
```

Not reported: a function or variable that happens to use one of those names. There is no fix; pick
names that describe your plugin.

## Further reading

- [Rename placeholder class names - Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines#Rename+placeholder+class+names)
