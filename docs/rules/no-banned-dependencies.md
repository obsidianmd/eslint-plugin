# obsidianmd/no-banned-dependencies

📝 Disallow dependencies in package.json that have native or preferred replacements.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

This rule reads the project's `package.json` from disk and reports any dependencies that appear in the [module-replacements](https://github.com/es-tooling/module-replacements) banned lists. By default, it checks the `native`, `microutilities`, and `preferred` presets.

Unlike the previous approach using `eslint-plugin-depend` with `@eslint/json`, this rule runs on regular source files and does not require a `files: ['package.json']` config block. This avoids [config-merge issues](https://github.com/eslint/eslint/issues/20354) with typescript-eslint typed linting.

## Options

### `presets`

Type: `Array<"native" | "microutilities" | "preferred">`
Default: `["native", "microutilities", "preferred"]`

Which module-replacements presets to check against.

### `allowed`

Type: `string[]`
Default: `[]`

Package names to allow even if they appear in the banned presets.
