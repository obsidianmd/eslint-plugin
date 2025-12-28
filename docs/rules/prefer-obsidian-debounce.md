# Use Obsidian's debounce() function instead of custom implementations (`obsidianmd/prefer-obsidian-debounce`)

<!-- end auto-generated rule header -->

Obsidian provides a built-in `debounce()` function that should be used instead of importing from third-party libraries like lodash or implementing your own.

## Examples

### Incorrect

```typescript
import { debounce } from 'lodash';

const debouncedSave = debounce(() => this.save(), 300);
```

```typescript
function debounce(fn: Function, delay: number) {
    let timeout: number;
    return (...args: unknown[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
}
```

### Correct

```typescript
import { debounce } from 'obsidian';

const debouncedSave = debounce(() => this.save(), 300, true);
```

## Why

Using Obsidian's built-in `debounce()` function:
- Reduces bundle size by avoiding third-party dependencies
- Ensures consistency with the Obsidian ecosystem
- Provides proper typing and integration
