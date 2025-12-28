# Use processFrontMatter() for modifying YAML frontmatter (`obsidianmd/prefer-process-front-matter`)

<!-- end auto-generated rule header -->

Use `app.fileManager.processFrontMatter()` for modifying YAML frontmatter instead of manually parsing and manipulating the file content.

## Examples

### Incorrect

```typescript
const content = await this.app.vault.read(file);
const parts = content.split('---');
// Manual frontmatter manipulation...
```

```typescript
const match = content.match(/^---\n([\s\S]*?)\n---/);
// Parse and modify YAML manually...
```

### Correct

```typescript
await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.tags = ['new-tag'];
    frontmatter.modified = new Date().toISOString();
});
```

To read frontmatter without modifying:

```typescript
const cache = this.app.metadataCache.getFileCache(file);
const frontmatter = cache?.frontmatter;
```

## Why

`processFrontMatter()`:
- Maintains consistent YAML formatting
- Handles edge cases properly
- Prevents corruption of frontmatter
- Is the recommended Obsidian API for this purpose
