# Prevent calling toString() on values that might be objects (`obsidianmd/no-object-to-string`)

<!-- end auto-generated rule header -->

Calling `.toString()` on an object produces `[object Object]` instead of meaningful content. This rule detects when you call `.toString()`, use `.setText()`, or interpolate template literals with values that could be objects.

## Examples

### Incorrect

```typescript
const fm: Record<string, unknown> = {};
const year = fm["Year"];
yearEl.setText(year.toString()); // Could produce "[object Object]"
```

```typescript
const value: unknown = getData();
const text = `Value: ${value}`; // Could produce "Value: [object Object]"
```

### Correct

```typescript
const fm: Record<string, unknown> = {};
const year = fm["Year"];
if (typeof year === "string" || typeof year === "number") {
    yearEl.setText(year.toString());
}
```

```typescript
const value: unknown = getData();
if (typeof value === "string") {
    const text = `Value: ${value}`;
}
```

## Why

When reading frontmatter or working with values of `unknown` type, always verify the value is a primitive (string, number, boolean) before converting to string. This is a common source of bugs that produces `[object Object]` in the UI.
