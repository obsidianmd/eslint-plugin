# Use getActiveViewOfType() instead of accessing workspace.activeLeaf directly (`obsidianmd/prefer-active-view-of-type`)

<!-- end auto-generated rule header -->

Avoid directly accessing `workspace.activeLeaf`. Use `workspace.getActiveViewOfType()` for type-safe view access.

## Examples

### Incorrect

```typescript
const leaf = this.app.workspace.activeLeaf;
if (leaf?.view instanceof MarkdownView) {
    // do something
}
```

### Correct

```typescript
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
    // do something with the typed view
}
```

## Why

`getActiveViewOfType()` provides:
- Type-safe access to views
- Null safety when no matching view exists
- Cleaner, more readable code
- Alignment with Obsidian's recommended patterns
