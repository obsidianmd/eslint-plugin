# obsidianmd/object-assign

📝 Discourage using `Object.assign` with two arguments.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

`Object.assign()` with exactly two arguments whose target is named like a set of defaults, that is,
whose name contains `default` in any case. The target is a variable such as `DEFAULT_SETTINGS` or
`defaultConfig`, or a property such as `this.defaults`, `this.defaultSettings` or
`Constants.DEFAULT_SETTINGS`, whose own (last) name is matched. `Object.assign()` writes into its
first argument, so this overwrites the defaults themselves: after the first load they hold the user's
settings, and anything that reads them later, such as a "reset to defaults" button, gets the wrong
values.

```ts
this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData()); // reported
this.settings = Object.assign(this.defaults, await this.loadData()); // reported
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); // copy into a new object
```

Not reported:

- a target whose name does not contain `default`, including a property of the defaults such as
  `DEFAULT_SETTINGS.editor`, where only `editor` is matched
- a property named `default` (a module's default export) or `defaultView` (a document's window), and a
  computed property with a key that is not a string literal, such as `this[key]`
- an object literal as the second argument, such as `Object.assign(DEFAULT_SETTINGS, { theme: "dark" })`
- three or more arguments, as in the `{}` form above
- a variable declared in the same function as the call that holds an object made there with `new`,
  an object or array literal, or `structuredClone()`, as in
  `const defaultOptions = new OptionsClass(); return Object.assign(defaultOptions, options);`: the
  object is made for the call and shared with nothing, so filling it in is intended. A variable of
  the module or of an outer function, or one set by any other call, which may return the shared
  defaults, is still reported

## Suggestion

There is no autofix: code may rely on the defaults being changed. A report offers an editor
suggestion instead, which you review before applying: pass `{}` as the first argument, so that the
settings are copied into a new object and the defaults are no longer changed. Comments, parentheses
and `?.` are kept:

```ts
this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
// suggests:
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
```

Nothing is offered where the result is thrown away, as in `Object.assign(DEFAULT_SETTINGS, data);`
or `void Object.assign(…)`: such code reads the defaults afterwards, expecting them to hold the
settings, and with `{}` the call would do nothing. Nor is it offered with type arguments, as in
`Object.assign<Settings, Partial<Settings>>(…)`, which are for two arguments, or where, with type
information, the target is an instance of a class: the copy would be a plain object without the
class's methods, getters and `instanceof`.
