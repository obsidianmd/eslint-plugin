# Configuration

## Quick start

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

The recommended config includes ESLint core rules, typescript-eslint, and all obsidianmd rules. You only need to provide the TypeScript parser options, as described below.

## Why you need `parserOptions`

The recommended config enables typescript-eslint's type-checked rules for `.ts`/`.tsx` files. These rules require access to TypeScript's type information, which means ESLint needs to know where your `tsconfig.json` is.

The plugin intentionally does not set `parserOptions` itself. Every project has a different TypeScript setup — monorepos, custom tsconfig paths, composite projects — and baking in assumptions would cause more problems than it solves. Instead, you provide a single config block that tells typescript-eslint how to find your project:

```js
{
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.*"],
      },
    },
  },
}
```

`projectService` automatically discovers the nearest `tsconfig.json` for each file. `allowDefaultProject` provides a fallback for files that are not included in any `tsconfig.json` — such as the ESLint config file itself. Without it, linting files like `eslint.config.mts` will fail with "requires type information" errors because the recommended config applies type-checked rules to all `.ts`/`.mts`/`.tsx` files.

See the [typescript-eslint docs on typed linting](https://typescript-eslint.io/getting-started/typed-linting) for alternatives and advanced options like `tsconfigRootDir`.

## What the recommended config includes

The recommended config is an array of flat config objects that sets up:

- **ESLint core** (`@eslint/js` recommended rules)
- **typescript-eslint** (`recommendedTypeChecked` for `.ts`/`.tsx`, `recommended` for `.js`/`.jsx`)
- **All obsidianmd rules** at their default severities
- **Third-party plugins**: `@microsoft/eslint-plugin-sdl`, `eslint-plugin-import`, `eslint-plugin-no-unsanitized`, `eslint-plugin-depend`, `@eslint-community/eslint-plugin-eslint-comments`
- **Obsidian globals** (`activeDocument`, `activeWindow`, `createEl`, etc.)
- **`package.json` linting** via `eslint-plugin-depend` (ban common micro-utilities)
- **`manifest.json` linting** via `validate-manifest`, parsed with `@eslint/json`

Because of this, you do **not** need to separately add `eslint.configs.recommended` or `tseslint.configs.recommended` — they are already included.

### Files linted beyond your source

The recommended config lints more than `.ts` and `.js`. It matches `package.json` and `manifest.json`
by name, reading both with the `json/json` language, so **ESLint has to be pointed at the project
root for those checks to run at all**. A lint script scoped to your sources — `eslint src` — will
never visit `manifest.json`, and the rules covering it silently do nothing:

```jsonc
// package.json
"scripts": {
  "lint": "eslint .",       // manifest.json is checked
  "lint:src": "eslint src"  // it is not
}
```

## Using alongside stricter typescript-eslint configs

If you want stricter rules than what the recommended config provides (e.g., `strictTypeChecked`, `stylisticTypeChecked`), layer them after the recommended spread:

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      // your overrides
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

The stricter configs will merge on top of the plugin's defaults. Rules present in both will use the last (strictest) value.

## Overriding rules

Override any rule in a config block after the recommended spread:

```js
export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
    rules: {
      "obsidianmd/sample-names": "off",
      "obsidianmd/prefer-file-manager-trash-file": "error",
    },
  },
]);
```

## Ignoring files

ESLint's default ignores already exclude `node_modules/`. If your build output is in `dist/` (the standard for Obsidian plugins), it is also excluded by default.

To ignore additional files, add a global ignores entry **before** the recommended spread:

```js
export default defineConfig([
  { ignores: ["some-other-output.js"] },
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
]);
```

## Disabling rules for specific files

To turn off obsidianmd rules for files that are not part of your Obsidian plugin (e.g., build scripts), add a config block with the relevant `files` glob:

```js
export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
  },
  {
    // Build scripts are not plugin code
    files: ["scripts/**"],
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/rule-custom-message": "off",
    },
  },
]);
```

ESLint does not support disabling all rules from a plugin with a single glob like `"obsidianmd/*": "off"`. You can set each rule to `"off"` individually, or use `ruleConfigs` to generate the overrides programmatically:

```js
{
  files: ["scripts/**"],
  rules: Object.fromEntries([
    ...Object.keys(obsidianmd.ruleConfigs.recommended),
    ...Object.keys(obsidianmd.ruleConfigs.recommendedTypeChecked),
  ].map(rule => [rule, "off"])),
}
```

## Common errors

### "You have used a rule which requires type information"

This means `parserOptions` is not set, or the file being linted is not included in any `tsconfig.json`.

The most common case is the ESLint config file itself. The Obsidian sample plugin uses `eslint.config.mts`, which is matched by the recommended config's `**/*.{ts,cts,mts,tsx}` glob. Because this file is typically not listed in your `tsconfig.json`, typescript-eslint cannot provide type information for it.

The fix is to use `allowDefaultProject` so these files are linted with default compiler options:

```js
{
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ["eslint.config.*"],
      },
    },
  },
}
```

If you are using `project` instead of `projectService`, ensure the path to your `tsconfig.json` is correct relative to where you run ESLint.

### "Configuration for rule '0' is invalid"

This happens when `obsidianmd.configs.recommended` is spread into a `rules` object instead of into the top-level config array. The recommended config is an **array of config objects**, not a rules object:

```js
// WRONG — spreading a config array into rules
{
  rules: {
    ...obsidianmd.configs.recommended, // produces { "0": {...}, "1": {...} }
  },
}

// CORRECT — spreading into the config array
export default defineConfig([
  ...obsidianmd.configs.recommended,
  // ...
]);
```

## Using only obsidianmd rules (without the recommended config)

Most users should use the recommended config and [override individual rules](#overriding-rules) or [layer stricter tseslint configs on top](#using-alongside-stricter-typescript-eslint-configs). This section is for users who need full control over their linting stack and want to add obsidianmd rules to their own setup.

The plugin exports `ruleConfigs` with two presets you can spread into your `rules` block:

- `obsidianmd.ruleConfigs.recommended` — base rules that do not require type information
- `obsidianmd.ruleConfigs.recommendedTypeChecked` — rules that require typescript-eslint type-aware linting

```js
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
    ],
    plugins: {
      obsidianmd,
    },
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
      globals: {
        // Obsidian augments the global scope with these helpers.
        // Without them, rules like no-undef will report false positives.
        activeDocument: "readonly",
        activeWindow: "readonly",
        ajax: "readonly",
        ajaxPromise: "readonly",
        createDiv: "readonly",
        createEl: "readonly",
        createFragment: "readonly",
        createSpan: "readonly",
        createSvg: "readonly",
        fish: "readonly",
        fishAll: "readonly",
        sleep: "readonly",
      },
    },
    rules: {
      ...obsidianmd.ruleConfigs.recommended,
      ...obsidianmd.ruleConfigs.recommendedTypeChecked,

      // Override individual rules as needed
      "obsidianmd/sample-names": "off",
    },
  },
]);
```

If your tseslint setup does not include type checking (e.g., you use `tseslint.configs.recommended` instead of `recommendedTypeChecked`), omit the `recommendedTypeChecked` spread.

A few things to keep in mind with this approach:

- **Obsidian globals** must be declared manually. The recommended config does this for you; here you need to add them yourself. The list above covers the most common ones. `DomElementInfo`, `SvgElementInfo`, `isBoolean`, `nextFrame`, and `ready` are also available.
- **Third-party plugins** bundled by the recommended config (`@microsoft/eslint-plugin-sdl`, `eslint-plugin-import`, `eslint-plugin-no-unsanitized`, `eslint-plugin-depend`, `eslint-plugin-eslint-comments`) are not included. Add them separately if you want them.
- **`package.json` and `manifest.json` linting** (`validate-manifest`, `depend/ban-dependencies`) is not set up, and is not covered by `ruleConfigs` — those presets only carry rules that apply to source files. `validate-manifest` needs its own config block, because `manifest.json` matches no source glob and needs the JSON language to be parsed at all:

  ```js
  {
    files: ["manifest.json"],
    language: "json/json",
    plugins: { json, obsidianmd },
    rules: { "obsidianmd/validate-manifest": "warn" },
  }
  ```

## Community plugin scanner configuration

The Obsidian community plugin directory runs this plugin against every submitted plugin as part of its automated review. The scanner uses a configuration based on the recommended config with the following adjustments:

**Ignored files and directories:**

The scanner only lints plugin source code. The following patterns are excluded:

| Pattern | Reason |
| :--- | :--- |
| `node_modules`, `dist`, `build`, `pkg` | Dependencies and build output |
| `.obsidian`, `**/.obsidian/**` | Vault config directories |
| `test-vault` | Test vault directories |
| `esbuild.config.mjs`, `version-bump.mjs` | Common build scripts |
| `**/*.test.*`, `**/*.tests.*`, `**/*.spec.*`, `**/*.specs.*` | Test files |
| `**/test/**`, `**/tests/**`, `**/__tests__/**` | Test directories |
| `**/mocks/**`, `**/__mocks__/**`, `**/testUtils**` | Test utilities |
| `**/*.cjs`, `**/*.mjs`, `**/*.cts`, `**/*.mts` | Non-`.ts`/`.js` source extensions (typically config and build files) |
| `**/vite*` | Vite config files |
| `**/scripts/**` | Build/utility scripts |
| `**/docs/**` | Documentation |
| `**/i18n/**`, `**/i18next/**`, `**/locale/**`, `**/locales/**`, `**/translations/**`, `**/l10n/**` | Localization files |
| `.pnpm-store` | pnpm cache |
| `automation/**`, `e2e-tests/**` | CI/automation and end-to-end tests |

**Rule severity adjustments:**

- Most rules are downgraded to `warn` (advisory). Only security-critical rules remain at `error`: `no-eval`, `no-implied-eval`, `no-unsanitized/method`, `no-unsanitized/property`, `obsidianmd/regex-lookbehind`, and `obsidianmd/no-forbidden-elements`.
- Some rules are disabled because the scanner handles them separately or they produce too many false positives at scale: `no-undef`, `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/restrict-template-expressions`, `@typescript-eslint/no-base-to-string`, `import/no-unresolved`, `obsidianmd/validate-manifest`, `obsidianmd/validate-license`, `obsidianmd/commands/no-command-in-command-id`, `obsidianmd/commands/no-plugin-id-in-command-id`.

**Parser options:**

The scanner uses `projectService` with `allowDefaultProject` for `eslint.config.js` and `manifest.json`, and sets `tsconfigRootDir` to the plugin's root directory.

```js
languageOptions: {
  parserOptions: {
    projectService: {
      allowDefaultProject: ["eslint.config.js", "manifest.json"],
    },
    tsconfigRootDir: process.cwd(),
    extraFileExtensions: [".json"],
  },
}
```

You do not need to replicate this configuration. The recommended config with the [quick start](#quick-start) setup is sufficient for local development. This section is provided for transparency so plugin authors understand what the scanner checks and what it skips.

<details>
<summary>Full scanner-equivalent configuration</summary>

If you want your local linting to match what the community plugin scanner checks, you can use the following configuration. This downgrades most rules to warnings and disables rules the scanner skips, matching the scanner's behavior as closely as possible.

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*", "manifest.json"],
        },
        extraFileExtensions: [".json"],
      },
    },
  },

  ...obsidianmd.configs.recommended,

  {
    files: ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"],
    rules: {
      // Security — keep as errors
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
      "obsidianmd/regex-lookbehind": "error",
      "obsidianmd/no-forbidden-elements": "error",

      // Covered by TypeScript or too noisy
      "no-undef": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "import/no-unresolved": "off",

      // Scanner handles this separately
      "obsidianmd/validate-license": "off",

      // Old plugins should not change their command ids
      "obsidianmd/commands/no-command-in-command-id": "off",
      "obsidianmd/commands/no-plugin-id-in-command-id": "off",
    },
  },

  {
    // Scanner handles this separately. It must be switched off under the glob
    // the rule actually runs on -- manifest.json matches no source glob, so an
    // "off" in the block above would not reach it.
    files: ["manifest.json"],
    rules: {
      "obsidianmd/validate-manifest": "off",
    },
  },

  globalIgnores([
    "node_modules",
    "dist",
    "build",
    "pkg",
    "test-vault",
    ".obsidian",
    "**/.obsidian/**",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "**/*.test.*",
    "**/*.tests.*",
    "**/*.spec.*",
    "**/*.specs.*",
    "**/test/**",
    "**/tests/**",
    "**/__tests__/**",
    "**/mocks/**",
    "**/__mocks__/**",
    "**/*.cjs",
    "**/*.mjs",
    "**/*.cts",
    "**/*.mts",
    "**/vite*",
    "**/scripts/**",
    "**/docs/**",
    "**/i18n/**",
    "**/i18next/**",
    "**/locale/**",
    "**/locales/**",
    "**/translations/**",
    "**/l10n/**",
    ".pnpm-store",
    "**/*.spec.ts",
    "**/testUtils**",
    "automation/**",
    "e2e-tests/**",
  ]),
]);
```

Note: The actual scanner also downgrades all non-security rule severities from `error` to `warn`. The configuration above does not replicate that behavior — it uses the recommended config's default severities and only adjusts the specific rules listed. If you want identical severity levels, you would need to override each rule individually.

</details>

## Scope of this plugin

This plugin enforces conventions specific to Obsidian plugin development. Its rules assume your code runs inside Obsidian and has access to the Obsidian API. It is not intended for non-Obsidian projects. If you maintain both Obsidian plugins and other projects, use separate ESLint configurations for each.
