# obsidianmd/prefer-get-language

📝 Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## What is reported

Reading the app language the way some plugins used to, before Obsidian exposed it:

- `localStorage.getItem("language")`, also through any property named `localStorage`, such as a
  window's storage: `window.localStorage` or `activeWindow.localStorage`, and with either name
  spelled out in a computed access, such as `localStorage["getItem"]("language")`
- importing or `require()`-ing `i18next-browser-languagedetector`, which detects the browser's language
  rather than Obsidian's

Use `getLanguage()` from `obsidian` (since Obsidian 1.8.7), which returns the ISO code of the language
the user chose in Obsidian:

```ts
const lang = localStorage.getItem("language"); // reported
const lang = getLanguage(); // use this instead
```

Not reported: other keys, `getItem("language")` on any other object, such as a
variable holding the storage, a computed access by a variable, such as `localStorage[method]`, a
dynamic `import()` of the detector, and other i18n packages, such as `i18next` itself.

## Suggestion

There is no autofix: `getLanguage()` returns `"en"` where `localStorage.getItem("language")` returns
`null`, as it does while the user keeps Obsidian's default language, so code that checks for `null`
behaves differently. A report on `localStorage.getItem("language")` offers an editor suggestion
instead, which you review before applying: the call becomes `getLanguage()`, and `getLanguage` is
imported from `obsidian`:

- added to the braces of the first `import { … } from "obsidian"`, on a line of its own where the
  names are on lines of their own;
- already imported as `getLanguage`, it is used as it is;
- otherwise in an import of its own after the last import, in that import's quotes and with its
  semicolon.

```ts
import { Plugin } from "obsidian";              // becomes import { Plugin, getLanguage } from "obsidian";
const lang = localStorage.getItem("language");  // becomes const lang = getLanguage();
```

Nothing is offered:

- in a file with no `import`, such as a CommonJS file;
- where `getLanguage` is imported from `obsidian` under another name, or the name is taken by
  something else, such as a function of the plugin's own or a parameter;
- where dropping the storage or an argument would drop a side effect, as in
  `getWindow().localStorage.getItem("language")`, or a comment is inside the call;
- with type information, where the `obsidian` typings do not export `getLanguage()` (older than
  1.8.7), or are not part of the program;
- with a `minAppVersion` below 1.8.7, which has no `getLanguage()`. Where no version is known (no
  `minAppVersion` option and no `manifest.json` `minAppVersion`, or the one that applies, the option
  before the manifest, is not a version, such as `latest`), the suggestion is offered and says it
  needs Obsidian 1.8.7;
- for `i18next-browser-languagedetector`, whose replacement depends on how it is used.

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                        | Type   |
| :-------------- | :--------------------------------------------------------------------------------- | :----- |
| `minAppVersion` | The minimum app version to check against. Defaults to manifest.json minAppVersion. | String |

<!-- end auto-generated rule options list -->
