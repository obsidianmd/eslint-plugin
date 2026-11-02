# obsidianmd/prefer-window-timers

📝 Prefer `window.setTimeout()` and related timer functions over bare global calls for popout window compatibility.

⚠️ This rule _warns_ in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Web workers

A web worker has no `window`, so `globalThis` and the bare timer functions are correct there. The
recommended config switches this rule off for files matching `**/*.worker.*` and anything under a
`workers/` directory; see [Web worker files](../configuration.md#web-worker-files).
