# Prefer activeWindow and activeDocument over window and document (`obsidianmd/prefer-active-window`)

🔧 This rule is automatically fixable.

<!-- end auto-generated rule header -->

Prefer `activeWindow` and `activeDocument` over the global `window` and `document` objects for proper pop-out window compatibility in Obsidian.

## Examples

### Incorrect

```typescript
const width = window.innerWidth;
```

```typescript
const el = document.createElement('div');
document.body.appendChild(el);
```

```typescript
window.addEventListener('resize', this.onResize);
```

### Correct

```typescript
const width = activeWindow.innerWidth;
```

```typescript
const el = activeDocument.createElement('div');
activeDocument.body.appendChild(el);
```

```typescript
activeWindow.addEventListener('resize', this.onResize);
```

## Why

Obsidian supports pop-out windows, where each window has its own `window` and `document` objects. Using the global `window` and `document` will always reference the main window, which causes unexpected behavior when users interact with pop-out windows.

`activeWindow` and `activeDocument` are Obsidian globals that always point to the currently active window, ensuring your plugin works correctly regardless of which window the user is interacting with.

## When to Disable

You may need to disable this rule when:
- Intentionally targeting the main window only
- Working with APIs that require the global window object
