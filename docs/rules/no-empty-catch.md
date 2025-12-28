# Catch blocks must contain error handling code or an explanatory comment (`obsidianmd/no-empty-catch`)

<!-- end auto-generated rule header -->

Empty catch blocks silently swallow errors, making debugging difficult. Either handle the error appropriately or add a comment explaining why the error is intentionally ignored.

## Examples

### Incorrect

```typescript
try {
    doSomething();
} catch (error) {
}
```

### Correct

```typescript
try {
    doSomething();
} catch (error) {
    console.error('Failed to do something:', error);
}
```

```typescript
try {
    doSomething();
} catch (error) {
    // Silently fail - this operation is optional and shouldn't block the main flow
}
```

## Why

According to the Obsidian plugin submission requirements, empty catch blocks are prohibited. Reviewers will flag every instance. Either handle the error or explain why it's safe to ignore.
