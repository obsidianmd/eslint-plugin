# obsidianmd/no-sample-code

📝 Disallow sample code snippets from the Obsidian plugin template.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

The two example calls from the sample plugin's `onload()`, which only log to the console:

```ts
this.registerInterval(window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000));
this.registerDomEvent(document, "click", (evt: MouseEvent) => {
  console.log("click", evt);
});
```

The fix deletes the statement. Other `registerInterval()` and `registerDomEvent()` calls are not
reported.
