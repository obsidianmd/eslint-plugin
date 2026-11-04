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

The interval is reported with any delay, such as `this.settings.minutes * 60 * 1000`. The click
handler is reported only when its body is that one `console.log("click", …)` statement, whatever
its parameter is called. The log may print other values, such as `evt.target`, but not compute them
with a call.

Not reported, because the code is the plugin's own: a click handler with statements of its own,
before or after the log (`console.log("click", evt); this.handleClick(evt);`), an interval callback
that does more than log, a log through another `log()` such as `this.logger.log("click", evt)`, and
other `registerInterval()` and `registerDomEvent()` calls.

The fix deletes the statement. When the call is not a statement of its own, such as
`const id = this.registerInterval(…)`, a `return` or the body of an `if` without braces, it is
reported without a fix: deleting it would break the code that uses its value or change what the `if`
controls. It is also reported without a fix when the delay or the listener options call something,
as in `window.setInterval(() => console.log("setInterval"), this.getDelay())`, since deleting the
call would skip that call too.
