# obsidianmd/no-tfile-tfolder-cast

📝 Disallow type casting to TFile or TFolder, suggesting instanceof checks instead.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

A type assertion that says a value is a `TFile` or a `TFolder`, written as `value as TFile` or
`<TFolder>value`. The asserted type is `TFile` or `TFolder` itself, a union with one of them, such as
`TFile | null`, or an array of them: `TFile[]`, `readonly TFolder[]`, `Array<TFile>`,
`TFile[] | undefined`. The type is matched by name. An assertion does not check anything at runtime,
so a folder asserted to be a file fails later; narrow with `instanceof` instead:

```ts
const file = abstractFile as TFile; // reported
const maybe = vault.getAbstractFileByPath(path) as TFile | null; // reported
const files = folder.children as TFile[]; // reported
if (abstractFile instanceof TFile) {
    // abstractFile is a TFile here
}
const onlyFiles = folder.children.filter((child): child is TFile => child instanceof TFile);
```

There is no fix: the replacement is a runtime check that changes the control flow.

Not reported:

- a type annotation such as `const file: TFile | null = null`, and assertions to other types
- an assertion to a qualified name, such as `as obsidian.TFile`, and `satisfies TFile`
- an assertion to both, such as `as TFile | TFolder`: every `TAbstractFile` is one or the other
- other types that contain `TFile`, such as `Promise<TFile>`, `Record<string, TFile>`, a tuple or an
  intersection
- an assertion that does not narrow anything: `null as TFile | null`, `undefined as TFolder | undefined`
  and `[] as TFile[]`, and, with type information, a value that has the asserted type already, such as
  `vault.getFileByPath(path) as TFile | null` or `file as TFile` where `file` is a `TFile`. A value of
  type `any` or `unknown` is still reported

The recommended config switches this rule off for test files, where mocks are routinely asserted to
`TFile`; see [Test files](../configuration.md#test-files).
