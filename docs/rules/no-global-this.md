# obsidianmd/no-global-this

📝 Disallow `global` and `globalThis`. Use `window` or `activeWindow` for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## What is reported

Only a runtime reference to the global object: `globalThis.setTimeout()`, `global.process`,
`(globalThis as Foo).bar`, `obj[globalThis]`. The fix replaces it with `window`; in a shorthand
property, `{ globalThis }` becomes `{ globalThis: window }` so the key stays.

Not reported, because they are not references to the global or have no runtime effect:

- types: `typeof globalThis` in an annotation, `ReturnType<typeof globalThis.setTimeout>`, and
  anything inside a `declare global` or other ambient `declare` block
- names: a property, member or class-member key such as `{ global: boolean }` or `settings.global`,
  and an import or export name
- `typeof globalThis !== "undefined"` checks, and local variables named `global` or `globalThis`

## Web workers

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for files matching `**/*.worker.*` and anything under a
`workers/` directory; see [Web worker files](../configuration.md#web-worker-files). It is off for
test files as well, which run outside Obsidian; see [Test files](../configuration.md#test-files).
