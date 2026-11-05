# obsidianmd/no-static-styles-assignment

📝 Disallow setting styles directly on DOM elements, favoring CSS classes instead.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Setting a style to a fixed value in code, where a CSS class would do. A fixed value is a literal or a
template literal without expressions (`` `red` ``):

- assigning a fixed value to a `style` property: `el.style.color = "red"`, `el.style["color"] = "red"`,
  `el.style.cssText = "…"`;
- `el.style.setProperty(name, value)` with a fixed value, custom properties included;
- `el.setAttribute("style", value)` with a fixed value;
- `setCssProps()` or `setCssStyles()` with an object whose keys include a CSS property that is not a
  custom property, whatever its value: unquoted (`el.setCssStyles({ display: "none" })`), quoted
  (`el.setCssProps({ "color": "blue" })`) or computed from a string (`["color"]`). Pass dynamic values
  as custom properties (`` el.setCssProps({ "--offset": `${x}px` }) ``) and use them from a CSS class.

Not reported: values from a variable or a template literal with expressions
(`el.style.width = width`, `` el.style.transform = `translateX(${x}px)` ``), CSS custom properties
(`--name`) in `setCssProps()` and `setCssStyles()`, computed keys that are not written out, such as
`[key]`, a spread (`{ ...styles }`), `setCssProps()` and `setCssStyles()` called with a variable or
with no argument, other attributes, and reading a style.
