# obsidianmd/ui/sentence-case

📝 Enforce sentence case for UI strings.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name                    | Description                                                                                       | Type     | Choices           |
| :---------------------- | :------------------------------------------------------------------------------------------------ | :------- | :---------------- |
| `acronyms`              | Acronyms that should remain uppercase.                                                            | String[] |                   |
| `allowAutoFix`          | Whether to enable auto-fixes for sentence case violations.                                        | Boolean  |                   |
| `brands`                | Brand names to preserve with their canonical casing.                                              | String[] |                   |
| `enforceCamelCaseLower` | Whether to force CamelCase/PascalCase tokens to lowercase.                                        | Boolean  |                   |
| `ignoreRegex`           | Regex patterns for strings to ignore entirely.                                                    | String[] |                   |
| `ignoreWords`           | Words to skip when applying sentence case.                                                        | String[] |                   |
| `mode`                  | Controls sentence case strictness; loose preserves CamelCase tokens while strict lowercases them. | String   | `loose`, `strict` |

<!-- end auto-generated rule options list -->
