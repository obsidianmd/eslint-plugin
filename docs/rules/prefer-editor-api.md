# Prefer the Editor API over Vault.modify() (`obsidianmd/prefer-editor-api`)

<!-- end auto-generated rule header -->

Prefer the Editor API over `Vault.modify()` to preserve cursor position and selection during edits. Use `Vault.process()` for atomic modifications when the Editor is not available.

## Examples

### Incorrect

```typescript
const content = await this.app.vault.read(file);
const newContent = content.replace(oldText, newText);
await this.app.vault.modify(file, newContent);
```

### Correct

For active editor modifications:

```typescript
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
    const editor = view.editor;
    editor.replaceSelection(newText);
    // or
    editor.replaceRange(newText, from, to);
}
```

For background file modifications:

```typescript
await this.app.vault.process(file, (content) => {
    return content.replace(oldText, newText);
});
```

## Why

`Vault.modify()`:
- Replaces the entire file content
- Resets cursor position and selection
- Can conflict with other plugins

The Editor API and `Vault.process()`:
- Preserve cursor position and selection
- Are atomic (prevent race conditions)
- Provide better user experience
