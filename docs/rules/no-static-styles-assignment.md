# obsidianmd/no-static-styles-assignment

📝 Disallow setting styles directly on DOM elements, favoring CSS classes instead.

💼 This rule is enabled in the following configs: ✅ `recommended`, 🇬🇧 `recommendedWithLocalesEn`.

<!-- end auto-generated rule header -->

## What is reported

Setting a style to a fixed value in code, where a CSS class would do. A fixed value is a literal or a
template literal without expressions (`` `red` ``), other than an empty string or `null`:

- assigning a fixed value to a `style` property: `el.style.color = "red"`, `el.style["color"] = "red"`,
  `el.style.cssText = "…"`;
- `el.style.setProperty(name, value)` with a fixed value for a CSS property that is not a custom
  property;
- `el.setAttribute("style", value)` with a fixed value;
- `setCssProps()` or `setCssStyles()` with an object that gives a CSS property that is not a custom
  property a fixed value: unquoted (`el.setCssStyles({ display: "none" })`), quoted
  (`el.setCssProps({ "color": "blue" })`) or computed from a string (`["color"]`). The call is
  reported once, at the first such property.

Not reported:

- values from a variable or a template literal with expressions (`el.style.width = width`,
  `` el.style.transform = `translateX(${x}px)` ``, `` el.setCssStyles({ top: `${y}px` }) ``). Values
  that change at run time are what `setCssProps()` and `setCssStyles()` are for;
- clearing an inline style, which a class cannot do: `el.style.display = ""`, `el.style.margin = null`,
  `el.style.cssText = ""`, `el.style.setProperty("cursor", "")`, `el.setAttribute("style", "")`,
  `el.setCssStyles({ height: "" })`, and `el.style.removeProperty()`;
- CSS custom properties (`--name`) in `setCssProps()`, `setCssStyles()` and `el.style.setProperty()`,
  whatever their value: a custom property is how code passes a value to a CSS class;
- computed keys that are not written out, such as `[key]`, a spread (`{ ...styles }`), `setCssProps()`
  and `setCssStyles()` called with a variable or with no argument, other attributes, and reading a
  style.
