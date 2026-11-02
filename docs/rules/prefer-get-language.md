# obsidianmd/prefer-get-language

📝 Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Reading the app language the way some plugins used to, before Obsidian exposed it:

- `localStorage.getItem("language")`, also through a window's storage such as
  `window.localStorage` or `activeWindow.localStorage`
- importing or `require()`-ing `i18next-browser-languagedetector`, which detects the browser's language
  rather than Obsidian's

Use `getLanguage()` from `obsidian` (since Obsidian 1.8.7), which returns the ISO code of the language
the user chose in Obsidian:

```ts
const lang = localStorage.getItem("language"); // reported
const lang = getLanguage(); // use this instead
```

There is no fix. Not reported: other keys, `getItem("language")` on any other object, such as a
variable holding the storage, a dynamic `import()` of the detector, and other i18n packages, such as
`i18next` itself.
