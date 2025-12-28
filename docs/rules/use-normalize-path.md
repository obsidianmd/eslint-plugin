# Apply normalizePath() to user-provided paths (`obsidianmd/use-normalize-path`)

<!-- end auto-generated rule header -->

Use `normalizePath()` on user-provided paths before passing them to Vault methods for cross-platform compatibility.

## Examples

### Incorrect

```typescript
const file = this.app.vault.getFileByPath(userInput);
```

```typescript
const file = this.app.vault.getFileByPath(`${folder}/${filename}`);
```

```typescript
await this.app.vault.create(settings.targetPath, content);
```

### Correct

```typescript
import { normalizePath } from 'obsidian';

const file = this.app.vault.getFileByPath(normalizePath(userInput));
```

```typescript
const path = normalizePath(`${folder}/${filename}`);
const file = this.app.vault.getFileByPath(path);
```

## Why

Different operating systems use different path separators (Windows uses `\`, Unix uses `/`). `normalizePath()`:
- Normalizes path separators
- Handles edge cases like double slashes
- Ensures consistent behavior across platforms

This is especially important for user-provided paths from settings or input fields.
