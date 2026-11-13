# obsidianmd/commands/check-callback-uses-checking

📝 Require `checkCallback` and `editorCheckCallback` to use their `checking` parameter.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

Obsidian calls `checkCallback` and `editorCheckCallback` with `checking` set to `true` to ask whether the command is available, for example while the command palette is open. The command should only run when `checking` is `false`. A callback that never reads `checking` runs its action on every availability check.

## What is reported

A `checkCallback` or `editorCheckCallback` written as a function in a command passed to
`addCommand()` as an object literal, when the function has no first parameter or never reads it.
Not reported: a function that reads `arguments`, a destructured first parameter, and a callback
passed by name or defined elsewhere.

## Examples

Incorrect:

```ts
this.addCommand({
    id: "open-sample",
    name: "Open sample",
    checkCallback: () => {
        new SampleModal(this.app).open();
        return true;
    },
});
```

Correct:

```ts
this.addCommand({
    id: "open-sample",
    name: "Open sample",
    checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
            return false;
        }
        if (!checking) {
            new SampleModal(this.app).open();
        }
        return true;
    },
});
```

If the command is always available, use `callback` or `editorCallback` instead.

## Further reading

- [Conditional commands - Commands](https://docs.obsidian.md/Plugins/User+interface/Commands#Conditional+commands)
