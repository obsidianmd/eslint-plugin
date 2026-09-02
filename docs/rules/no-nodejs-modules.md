# obsidianmd/no-nodejs-modules

📝 Disallow importing Node.js built-in modules unless guarded by Platform.isDesktop.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name            | Description                                                                                                                                                                                                                                                                                 | Type    |
| :-------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------ |
| `isDesktopOnly` | Whether the code being linted only ever runs on desktop, which makes Node.js APIs available. Defaults to the isDesktopOnly value of a manifest.json in the working directory, so a repo with no manifest -- a library, tooling, a standalone CLI -- can say so without shipping a fake one. | Boolean |

<!-- end auto-generated rule options list -->

`isDesktopOnly` defaults to the `isDesktopOnly` value of a `manifest.json` in the
working directory. A repo that is not a plugin — a library, tooling, a
standalone CLI in the same repo — has no manifest to carry that flag, and used to
need a fake one purely to keep this rule quiet. Set the option instead:

```js
{
    rules: {
        "obsidianmd/no-nodejs-modules": ["warn", { isDesktopOnly: true }],
    },
}
```

This rule is listed in `eslint-comments/no-restricted-disable`, so a disable
comment is not an available escape.
