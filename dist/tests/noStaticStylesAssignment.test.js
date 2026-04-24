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
        }
    ],
});
