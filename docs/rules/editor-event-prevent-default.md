# Require proper event handling in editor-drop and editor-paste handlers (`obsidianmd/editor-event-prevent-default`)

<!-- end auto-generated rule header -->

Require checking `defaultPrevented` and calling `preventDefault()` in `editor-drop` and `editor-paste` event handlers.

## Examples

### Incorrect

```typescript
this.registerEvent(
    this.app.workspace.on('editor-drop', (evt, editor, info) => {
        // Missing defaultPrevented check and preventDefault call
        handleDrop(evt);
    })
);
```

```typescript
this.registerEvent(
    this.app.workspace.on('editor-paste', (evt, editor, info) => {
        // Missing defaultPrevented check
        processPaste(evt);
        evt.preventDefault();
    })
);
```

```typescript
this.registerEvent(
    this.app.workspace.on('editor-drop', (evt, editor, info) => {
        if (evt.defaultPrevented) return;
        // Missing preventDefault call
        handleDrop(evt);
    })
);
```

### Correct

```typescript
this.registerEvent(
    this.app.workspace.on('editor-drop', (evt, editor, info) => {
        if (evt.defaultPrevented) return;

        // Handle the drop event
        handleDrop(evt);

        evt.preventDefault();
    })
);
```

```typescript
this.registerEvent(
    this.app.workspace.on('editor-paste', (evt, editor, info) => {
        if (evt.defaultPrevented) {
            return;
        }

        // Process the paste data
        const text = evt.clipboardData?.getData('text/plain');
        if (text) {
            editor.replaceSelection(text.toUpperCase());
        }

        evt.preventDefault();
    })
);
```

## Why

When multiple plugins or Obsidian itself handle `editor-drop` and `editor-paste` events, proper coordination is essential to prevent conflicts:

1. **Check `defaultPrevented` first**: Another handler may have already processed the event. Checking `evt.defaultPrevented` at the start and returning early prevents duplicate handling.

2. **Call `preventDefault()` after handling**: This signals to other handlers and Obsidian that your plugin has processed the event, preventing default behavior and alerting other handlers.

This pattern ensures plugins cooperate properly when handling shared events.

## When to Disable

You may need to disable this rule when:
- You intentionally want to observe events without preventing default behavior
- You're creating a logging/monitoring handler that shouldn't interfere with event propagation
