# Don't reference community plugins as 'Obsidian XYZ' (`obsidianmd/no-obsidian-branding`)

<!-- end auto-generated rule header -->

Community plugins should not be named "Obsidian XYZ" due to branding guidelines. This rule flags strings that follow this pattern.

## Examples

### Incorrect

```typescript
const pluginName = 'Obsidian Tasks';
```

```typescript
this.addCommand({ name: 'Obsidian Export: Export all' });
```

```typescript
new Notice('Welcome to Obsidian Templater!');
```

### Correct

```typescript
const pluginName = 'Tasks';
```

```typescript
this.addCommand({ name: 'Export all' });
```

```typescript
new Notice('Welcome to Templater!');
```

## Allowed Terms

References to official Obsidian products and features are allowed:
- Obsidian Publish
- Obsidian Sync
- Obsidian Canvas
- Obsidian API
- Obsidian Vault
- Obsidian URI
- Obsidian App
- Obsidian documentation/docs/help

## Why

According to Obsidian's branding guidelines, community plugins should not use "Obsidian" as a prefix in their name. This helps users distinguish between official Obsidian features and community-created plugins.
