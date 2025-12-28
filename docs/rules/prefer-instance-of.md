# Prefer .instanceOf() over instanceof for DOM classes (`obsidianmd/prefer-instance-of`)

🔧 This rule is automatically fixable.

<!-- end auto-generated rule header -->

Prefer using the `.instanceOf()` method over the `instanceof` operator for DOM and browser built-in classes to ensure proper pop-out window compatibility.

## Examples

### Incorrect

```typescript
if (el instanceof HTMLElement) {
    // ...
}
```

```typescript
if (evt instanceof MouseEvent) {
    // ...
}
```

```typescript
const isNode = target instanceof Node;
```

### Correct

```typescript
if (el.instanceOf(HTMLElement)) {
    // ...
}
```

```typescript
if (evt.instanceOf(MouseEvent)) {
    // ...
}
```

```typescript
const isNode = target.instanceOf(Node);
```

### Still Valid (Non-DOM classes)

```typescript
// Obsidian classes should still use instanceof
if (file instanceof TFile) {
    // ...
}

if (view instanceof MarkdownView) {
    // ...
}

// Custom classes
if (obj instanceof MyPlugin) {
    // ...
}
```

## Why

When using pop-out windows in Obsidian, event and primitive prototypes differ from the main window. This causes `instanceof` checks to fail in rare cases because each window has its own copy of DOM constructors.

The `.instanceOf()` method is provided by Obsidian and handles cross-window prototype checks correctly.

## Affected Classes

This rule flags `instanceof` checks for:

- **DOM Elements**: `HTMLElement`, `Element`, `Node`, `Document`, `SVGElement`, and specific element types
- **Events**: `Event`, `MouseEvent`, `KeyboardEvent`, `DragEvent`, `FocusEvent`, etc.
- **Other DOM types**: `Range`, `Selection`, `NodeList`, `HTMLCollection`, etc.

## When to Disable

You may need to disable this rule when:
- Working with code that doesn't run in Obsidian's environment
- Using classes from external packages where `.instanceOf()` is not available
