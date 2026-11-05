import { RuleTester } from "@typescript-eslint/rule-tester";
import noInlineStylesRule from "../lib/rules/noStaticStylesAssignment.js";

const ruleTester = new RuleTester();

ruleTester.run("no-static-styles-assignment", noInlineStylesRule, {
    valid: [
        {
            name: "classList.add is allowed",
            code: "el.classList.add('my-class');",
        },
        {
            name: "dynamic style from variable is allowed",
            code: "const myWidth = '100px'; el.style.width = myWidth;",
        },
        {
            name: "dynamic style from template literal is allowed",
            code: "el.style.transform = `translateX(${offset}px)`;",
        },
        {
            name: "dynamic setProperty is allowed",
            code: "el.style.setProperty('--my-var', someValue);",
        },
        {
            name: "setAttribute for non-style attributes is allowed",
            code: "el.setAttribute('data-id', '123');",
        },
        {
            name: "reading style is allowed",
            code: "const color = el.style.color;",
        },
        {
            name: "setCssProps with CSS variable is allowed",
            code: "el.setCssProps({ '--some-var': 'blue' });",
        },
        {
            name: "setCssProps with computed key is allowed",
            code: "el.setCssProps({ [someKey]: someValue });",
        },
        {
            name: "setCssStyles with CSS variable is allowed",
            code: "el.setCssStyles({ '--some-var': 'blue' });",
        },
        {
            name: "setCssProps() without arguments does not crash",
            code: "el.setCssProps();",
        },
        {
            name: "setCssStyles() without arguments does not crash",
            code: "el.setCssStyles();",
        },
        {
            name: "setCssStyles with a variable is allowed",
            code: "el.setCssStyles(styles);",
        },
        {
            name: "setCssProps with only CSS variables, quoted or computed, is allowed",
            code: "el.setCssProps({ '--a': 'red', \"--b\": width, [`--c`]: '1px', [`--${name}`]: value, [key]: value, [color]: 'red' });",
        },
        {
            name: "setCssStyles with a spread is allowed",
            code: "el.setCssStyles({ ...styles });",
        },
        {
            name: "a style from a template literal with an expression is allowed",
            code: "el.style.color = `${color}`; el.style.setProperty('color', `${color}`); el.setAttribute('style', `color: ${color}`);",
        },
        {
            name: "setAttribute with a static template literal for another attribute is allowed",
            code: "el.setAttribute(`data-id`, `123`);",
        },
        {
            name: "a template literal key or attribute name with an expression names no property",
            code: "el.setCssProps({ [`color${suffix}`]: 'red' }); el.setAttribute(`style${suffix}`, 'color: red;');",
        },
        {
            name: "a numeric key names no CSS property",
            code: "el.setCssStyles({ 0: 'red' });",
        },
        {
            name: "assigning a literal to a variable is allowed",
            code: "let color: string; color = 'red';",
        },
        {
            name: "assigning a literal to a property of an object other than style is allowed",
            code: "this.plugin.settings.color = 'red'; el.dataset.id = '1';",
        },
        {
            name: "a computed member named style is not the style property",
            code: "el[style].color = 'red';",
        },
        {
            name: "functions named like the methods are not reported when called bare",
            code: "setProperty('color', 'red'); setAttribute('style', 'color: red;');",
        },
        {
            name: "setProperty on an object other than style is allowed",
            code: "map.setProperty('color', 'red');",
        },
        {
            name: "setProperty() and setAttribute('style') without a value are not reported",
            code: "el.style.setProperty('color'); el.setAttribute('style');",
        },
        {
            name: "toggleAttribute('style') is not setting a style",
            code: "el.toggleAttribute('style', true);",
        },
    ],
    invalid: [
        {
            name: "style.color with literal is forbidden",
            code: "el.style.color = 'red';",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "element.style.color" },
                },
            ],
        },
        {
            name: "style.cssText with literal is forbidden",
            code: "el.style.cssText = 'font-weight: bold;';",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "element.style.cssText" },
                },
            ],
        },
        {
            name: "setProperty with literal value is forbidden",
            code: "el.style.setProperty('background', 'blue');",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "element.style.setProperty" },
                },
            ],
        },
        {
            name: "setProperty with a literal value is forbidden for a custom property too",
            code: "el.style.setProperty('--my-var', 'blue');",
            errors: [{ messageId: "avoidStyleAssignment" }],
        },
        {
            name: "setAttribute('style', literal) is forbidden",
            code: "el.setAttribute('style', 'padding: 10px;');",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "element.setAttribute" },
                },
            ],
        },
        {
            name: "chained member expression style assignment is forbidden",
            code: "this.containerEl.style.border = '1px solid black';",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "element.style.border" },
                },
            ],
        },
        {
            name: "setCssProps with non-variable property is forbidden",
            code: "el.setCssProps({ 'color': 'blue' });",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "el.setCssProps" },
                }
            ]
        },
        {
            name: "setCssStyles with non-variable property is forbidden",
            code: "el.setCssStyles({ 'color': 'blue' });",
            errors: [
                {
                    messageId: "avoidStyleAssignment",
                    data: { property: "el.setCssStyles" },
                }
            ]
        },

        // --- A computed string key names the property like a dotted one ---
        // The message read "element.style.undefined".
        {
            name: "style[\"color\"] with literal is forbidden and named by its key",
            code: "el.style[\"color\"] = 'red';",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "element.style.color" } }],
        },
        {
            name: "a computed key that is not an identifier is named in brackets",
            code: "el.style['--my-var'] = 'red'; el.style[`background-color`] = 'red';",
            errors: [
                { messageId: "avoidStyleAssignment", data: { property: 'element.style["--my-var"]' } },
                { messageId: "avoidStyleAssignment", data: { property: 'element.style["background-color"]' } },
            ],
        },
        {
            name: "a dynamic computed key is named by its source",
            code: "el.style[prop] = 'red'; el.style[getProp()] = 'red';",
            errors: [
                { messageId: "avoidStyleAssignment", data: { property: "element.style[prop]" } },
                { messageId: "avoidStyleAssignment", data: { property: "element.style[getProp()]" } },
            ],
        },

        // --- Unquoted keys are CSS properties like quoted ones ---
        {
            name: "setCssStyles with an unquoted property is forbidden",
            code: "el.setCssStyles({ color: 'red' });",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "el.setCssStyles" } }],
        },
        {
            name: "setCssProps with an unquoted property is forbidden",
            code: "el.setCssProps({ display: 'none' });",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "el.setCssProps" } }],
        },
        {
            name: "an unquoted property is forbidden whatever its value, as a quoted one is",
            code: "el.setCssStyles({ top: `${y}px` }); el.setCssStyles({ 'top': `${y}px` }); el.setCssProps({ width });",
            errors: [
                { messageId: "avoidStyleAssignment", data: { property: "el.setCssStyles" } },
                { messageId: "avoidStyleAssignment", data: { property: "el.setCssStyles" } },
                { messageId: "avoidStyleAssignment", data: { property: "el.setCssProps" } },
            ],
        },
        {
            name: "a CSS property next to CSS variables is forbidden, once per call",
            code: "el.setCssProps({ '--a': 'red', color: 'red', display: 'none' });",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "el.setCssProps" } }],
        },
        {
            name: "a computed static template key is forbidden like a quoted one",
            code: "el.setCssProps({ [`color`]: 'red' });",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "el.setCssProps" } }],
        },

        // --- A template literal without expressions is a literal value ---
        {
            name: "style.color with a static template literal is forbidden",
            code: "el.style.color = `red`;",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "element.style.color" } }],
        },
        {
            name: "a multi-line static cssText template literal is forbidden",
            code: "el.style.cssText = `\n  color: red;\n  display: none;\n`;",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "element.style.cssText" } }],
        },
        {
            name: "setProperty with a static template literal value is forbidden",
            code: "el.style.setProperty('color', `red`);",
            errors: [{ messageId: "avoidStyleAssignment", data: { property: "element.style.setProperty" } }],
        },
        {
            name: "setAttribute('style') with static template literals is forbidden",
            code: "el.setAttribute('style', `color: red;`); el.setAttribute(`style`, 'color: red;');",
            errors: [
                { messageId: "avoidStyleAssignment", data: { property: "element.setAttribute" } },
                { messageId: "avoidStyleAssignment", data: { property: "element.setAttribute" } },
            ],
        },
    ],
});
