# Prefer Vault.cachedRead() over Vault.read() (`obsidianmd/vault/prefer-cached-read`)

This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Prefer `Vault.cachedRead()` over `Vault.read()` when you're only reading a file and not writing to it afterward.

## Examples

### Incorrect

```typescript
const content = await this.app.vault.read(file);
// Process content without writing back...
```

### Correct

```typescript
const content = await this.app.vault.cachedRead(file);
// Process content without writing back...
```

## Why

`cachedRead()` uses Obsidian's internal cache, which:
- Improves performance by avoiding disk reads
- Reduces I/O operations
- Is the recommended method when you don't need the absolute latest content

Use `read()` only when you need to ensure you have the most recent content (e.g., before modifying and writing back).
