# Use window.setTimeout and window.setInterval instead of bare timer functions (`obsidianmd/prefer-window-timers`)

This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Use `window.setTimeout`, `window.clearTimeout`, `window.setInterval`, and `window.clearInterval` with the `window` prefix for proper scoping and cleanup.

## Examples

### Incorrect

```typescript
setTimeout(() => {
    this.doSomething();
}, 1000);

clearTimeout(timerId);
```

### Correct

```typescript
window.setTimeout(() => {
    this.doSomething();
}, 1000);

window.clearTimeout(timerId);
```

## Why

Using the `window` prefix ensures proper scoping in the Obsidian environment and makes the code's intent clearer. This also helps with cleanup when the plugin unloads.
