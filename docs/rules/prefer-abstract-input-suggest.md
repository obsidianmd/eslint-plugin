# obsidianmd/prefer-abstract-input-suggest

📝 Disallow Liam's frequently copied `TextInputSuggest` implementation in favor of the built-in `AbstractInputSuggest`.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

The fingerprint of the widely copied `TextInputSuggest` implementation: a call to Popper.js's
`createPopper()` whose options, as an object literal in the third argument, include a modifier named
`sameWidth`. Obsidian has a built-in base class for suggestions attached to an input,
[`AbstractInputSuggest`](https://docs.obsidian.md/Reference/TypeScript+API/AbstractInputSuggest)
(since Obsidian 1.4.10), so the copy and its Popper.js dependency are no longer needed.

There is no fix. Not reported:

- `createPopper()` without a `sameWidth` modifier
- options passed in a variable rather than written in the call, or a call through a namespace such as
  `Popper.createPopper()`
