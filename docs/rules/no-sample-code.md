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

The fix deletes the statement. When the call is not a statement of its own, such as
`const id = this.registerInterval(…)`, a `return` or the body of an `if` without braces, it is
reported without a fix: deleting it would break the code that uses its value or change what the `if`
controls. Other `registerInterval()` and `registerDomEvent()` calls are not reported.
