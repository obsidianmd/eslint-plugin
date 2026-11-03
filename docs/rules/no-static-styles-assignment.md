# obsidianmd/no-static-styles-assignment

📝 Disallow setting styles directly on DOM elements, favoring CSS classes instead.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Setting a style to a fixed value in code, where a CSS class would do:

- assigning a literal to a `style` property: `el.style.color = "red"`, `el.style.cssText = "…"`;
- `el.style.setProperty(name, value)` with a literal value, custom properties included;
- `el.setAttribute("style", value)` with a literal value;
- `setCssProps()` or `setCssStyles()` with an object whose keys include a quoted CSS property that is
  not a custom property, such as `el.setCssProps({ "color": "blue" })`, whatever its value.

Not reported: values from a variable or a template literal with expressions
(`el.style.width = width`, `` el.style.transform = `translateX(${x}px)` ``), CSS custom properties
(`--name`) in `setCssProps()` and `setCssStyles()`, computed keys, `setCssProps()` and
`setCssStyles()` called with a variable or with no argument, other attributes, and reading a style.
