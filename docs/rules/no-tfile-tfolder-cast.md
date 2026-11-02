# obsidianmd/no-tfile-tfolder-cast

📝 Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A type assertion to exactly `TFile` or `TFolder`, written as `value as TFile` or `<TFolder>value`.
The type is matched by name. An assertion does not check anything at runtime, so a folder asserted to
be a file fails later; narrow with `instanceof` instead:

```ts
const file = abstractFile as TFile; // reported
if (abstractFile instanceof TFile) {
    // abstractFile is a TFile here
}
```

There is no fix: the replacement is a runtime check that changes the control flow.

Not reported:

- a type annotation such as `const file: TFile | null = null`, and assertions to other types
- an assertion to a union, an array or a qualified name, such as `as TFile | null`, `as TFile[]` or
  `as obsidian.TFile`, and `satisfies TFile`

The recommended config switches this rule off for test files, where mocks are routinely asserted to
`TFile`; see [Test files](../configuration.md#test-files).
