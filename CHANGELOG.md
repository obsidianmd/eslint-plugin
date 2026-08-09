# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-07-02

### Fixed

- Wrong `activeDocument.createEl()` calls ([#174](https://github.com/obsidianmd/eslint-plugin/pull/174)).

## [0.4.0] - 2026-06-30

### Added

- Community scanners ruleset ([#173](https://github.com/obsidianmd/eslint-plugin/pull/173)).
- `prefer-setting-definitions` and `no-deprecated-display` rules ([#161](https://github.com/obsidianmd/eslint-plugin/pull/161)).
- `eslint-plugin-eslint-plugin` for rule quality linting.
- Further reading links to rule documentation.
- `Jekyll` to the brands list.
- Exclusions to `no-unused-expressions` rule.
- `ignoreRestSiblings` option to `no-unused-vars`.

### Changed

- Switched to `obsidianmd/no-nodejs-modules`.
- Centralized `RuleCreator` into shared utility.
- Replaced all hardcoded URLs with `docsUrl()`.
- Streamlined `meta.docs.url` for static analysis.

### Fixed

- Properly scope rules to file types ([#165](https://github.com/obsidianmd/eslint-plugin/pull/165)).
- `instanceOf` existence check before linting.
- Scoped type-requiring rules to type-checked files.
- Allowed type-only imports of `moment`.
- Restored default for `validate-license`.
- Corrected `docsUrl` name for `prefer-abstract-input-suggest`.
- Added schema descriptions and resolved schema defaults.
- Removed unused `messageIds` and placeholders.
- Corrected placeholder metadata in rule definitions.
- Corrected anchor link for `no-default-hotkeys`.

## [0.3.0] - 2026-05-12

### Added

- `Cursor` as a recognized brand.

### Changed

- Disabled `sentence-case` rule by default (too broken).
- Switched to warnings for certain rules.

### Fixed

- Extracted `no-global-this` into standalone rule.
- `createDocumentFragment` on `activeDocument` now uses `activeWindow`.
- `window.timerMethods` enforcement.
- `.obsidian` detection in URLs for `hardcodedConfigPath`.
- Typed rules now only run on files parsed by `getParserServices`.
- Disabled broken rule by default.
- `hardcodedConfigPath` no longer detects URLs.
- Compilation issues.

## [0.2.9] - 2026-04-30

_Patch release with no user-facing changes._

## [0.2.8] - 2026-04-28

### Fixed

- Allow dynamic `require()` calls if guarded by `Platform.isDesktop`.

## [0.2.7] - 2026-04-27

### Fixed

- Better guard clause detection for `no-nodejs-modules`.

## [0.2.6] - 2026-04-27

### Changed

- Replaced `no-nodejs-modules` with custom implementation that allows usage when guarded by `Platform.isDesktop`.

## [0.2.5] - 2026-04-27

### Added

- Support for ESLint 10.
- `prefer-create-el` rule.

### Changed

- Don't warn on unused variables prefixed with `_`.
- Replaced `latest` with concrete versions in dependencies.

### Fixed

- Removed `window` → `activeWindow` check.
- Typed rules now only run on files parsed by `getParserServices`.

## [0.2.4] - 2026-04-20

### Added

- `prefer-get-language` rule.
- `CalDAV` and `CardDAV` as recognized brands.
- Stricter manifest checks.

### Fixed

- Global declarations.
- Runtime dependencies moved to `dependencies`.
- Constructor replacement issues.

## [0.2.3] - 2026-04-17

_Version bump only._

## [0.2.2] - 2026-04-16

### Fixed

- `noUnsupportedApi` now ignores properly guarded API calls.

## [0.2.1] - 2026-04-16

### Added

- `prefer-active-window-timers` rule.
- `editor-drop-paste` rule.
- `prefer-active-doc` rule.
- `prefer-instanceof` rule.
- `no-unsupported-api` rule.
- `no-unsanitized` rules.
- `rule-custom-message` rule.
- `SvgElementInfo` to globals.
- Common APIs and services to `DEFAULT_BRANDS`.
- More cases for sentence case rules.
- Plugin name/version parsing from `package.json`.
- Global variable registration.

### Changed

- Switched test runner to Mocha.
- Switched tabs to spaces.
- Improved warning message for inline style rule.
- Only allow setting CSS variables in style assignments.
- Strongly typed type constants.
- Better error message for sentence case rule.

### Fixed

- `WebDAV` moved from acronyms to brands to preserve casing.
- Leading opening parenthesis handling.
- Documentation generator.
- Proper use of `extends`.
- Audit issues.

## [0.1.9] - 2025-11-14

### Added

- Automatic generation of `.d.ts` type declaration file.
- Ban of dependencies that have better alternatives in core libs.

### Fixed

- Indentation in markdown codeblock examples.
- Various issues with example configuration.

## [0.1.8] - 2025-11-04

### Changed

- Disabled `require-await` rule.

### Fixed

- Type issues ([#68](https://github.com/obsidianmd/eslint-plugin/issues/68), [#67](https://github.com/obsidianmd/eslint-plugin/issues/67)).

## [0.1.7] - 2025-11-03

### Changed

- Updated rule messages to be more verbose.
- Re-added fixer for settings headings.

## [0.1.6] - 2025-10-23

### Added

- `no-forbidden-elements` rule.
- LICENSE validation rules.
- Rule options support.

### Changed

- Refactored configuration to have separate configs for JS and TS files.

## [0.1.5] - 2025-10-17

### Added

- Sentence case verification rule.
- Type checking support.

### Changed

- Improved brand detection and text handling.

### Fixed

- Avoid false positives in `hardcoded-config-path`.
- CI no longer checks docs in build.

## [0.1.4] - 2025-07-04

### Fixed

- Hotfix for build issues.

## [0.1.3] - 2025-07-04

### Added

- `prefer-local-storage` rule: prefer `App#saveLocalStorage` / `App#loadLocalStorage` to write/read localStorage data unique to a vault.

## [0.1.2] - 2025-07-03

### Fixed

- Added peer dependencies.

## [0.1.1] - 2025-07-01

### Fixed

- Plugin not working with flat config.
- Documentation generation.

## [0.1.0] - 2025-07-01

### Added

- Initial release.
- Rules for Obsidian plugin development best practices.
- `recommended` configuration preset.
- Support for ESLint 9 flat config.
- `validate-manifest` rule for manifest.json validation.
- `no-sample-code` rule with auto-fix.
- `no-plugin-as-component` rule.
- `prefer-file-manager-trash` rule.
- `no-static-styles-assignment` rule.
- `platform` rule for OS detection.
- `no-tfile-tfolder-cast` rule.
- `hardcoded-config-path` rule.
- `detach-leaves` rule.
- `sample-names` rule.
- `object-assign` rule.
- `vault/iterate` rule.
- `regex-lookbehind` rule.
- Command-related rules (`no-command-in-command-id`, `no-command-in-command-name`, `no-default-hotkeys`, etc.).
- Settings tab rules (`no-manual-html-headings`, `no-problematic-settings-headings`).
- GitHub Actions CI for build and test.
- NPM publish workflow.
- CLA enforcement.
- Automatic documentation generation.

[Unreleased]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.1...HEAD
[0.4.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.4.0...0.4.1
[0.4.0]: https://github.com/obsidianmd/eslint-plugin/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.9...0.3.0
[0.2.9]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.8...0.2.9
[0.2.8]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.7...0.2.8
[0.2.7]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.6...0.2.7
[0.2.6]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.5...0.2.6
[0.2.5]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.4...0.2.5
[0.2.4]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.3...0.2.4
[0.2.3]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.2...0.2.3
[0.2.2]: https://github.com/obsidianmd/eslint-plugin/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.9...0.2.1
[0.1.9]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.8...0.1.9
[0.1.8]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.7...0.1.8
[0.1.7]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/obsidianmd/eslint-plugin/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/obsidianmd/eslint-plugin/releases/tag/0.1.0
