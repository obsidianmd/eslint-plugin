# Use stringifyYaml() instead of manually building YAML strings (`obsidianmd/prefer-stringify-yaml`)

<!-- end auto-generated rule header -->

Use Obsidian's `stringifyYaml()` function instead of manually constructing YAML strings or importing third-party YAML libraries.

## Examples

### Incorrect

```typescript
const yaml = `---
title: ${title}
author: ${author}
---`;
```

```typescript
import { stringify } from 'yaml';
const yamlContent = stringify(data);
```

```typescript
const line = 'title: ' + title;
```

### Correct

```typescript
import { stringifyYaml } from 'obsidian';

const yamlContent = stringifyYaml({
    title: title,
    author: author
});
```

## Why

Manual YAML construction:
- Is error-prone (escaping, formatting issues)
- May produce invalid YAML with special characters
- Adds unnecessary dependencies when Obsidian provides the function

`stringifyYaml()` ensures consistent, valid YAML output.
