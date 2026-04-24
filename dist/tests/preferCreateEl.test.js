import { RuleTester } from "@typescript-eslint/rule-tester";
import preferCreateEl from "../lib/rules/preferCreateEl.js";
const ruleTester = new RuleTester();
ruleTester.run("prefer-create-el", preferCreateEl, {
    valid: [
        {
            name: "createEl is allowed",
            code: "createEl('p');",
        },
        {
            name: "activeDocument.createEl is allowed",
            code: "activeDocument.createEl('p');",
        },
        {
            name: "createDiv is allowed",
            code: "createDiv();",
        },
        {
            name: "createSpan is allowed",
            code: "createSpan();",
        },
        {
            name: "el.createDiv is allowed",
            code: "el.createDiv();",
        },
        {
            name: "createFragment is allowed",
            code: "createFragment();",
        },
        {
            name: "React.createElement is not flagged",
            code: "React.createElement('div');",
        },
        {
            name: "local document variable is not flagged",
            code: "const document = getDoc(); document.createElement('p');",
        },
        {
            name: "createElement with multiple args is not flagged",
            code: "document.createElement('div', { is: 'my-div' });",
        },
        {
            name: "createEl with non-shorthand tag is allowed",
            code: "createEl('p');",
        },
        {
            name: "el.createEl with non-shorthand tag is allowed",
            code: "el.createEl('p');",
        },
        {
            name: "createEl with variable tag is allowed",
            code: "createEl(tag);",
        },
        {
            name: "createSvg is allowed",
            code: "createSvg('path');",
        },
        {
            name: "createElementNS with non-SVG namespace is not flagged",
            code: "document.createElementNS('http://www.w3.org/1999/xhtml', 'div');",
        },
        {
            name: "createElementNS on non-document object is not flagged",
            code: "React.createElementNS('http://www.w3.org/2000/svg', 'path');",
        },
    ],
    invalid: [
        // createElement → createEl
        {
            name: "document.createElement(tag) → createEl(tag)",
            code: "document.createElement('p');",
            output: "createEl('p');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement(tag) → activeDocument.createEl(tag)",
            code: "activeDocument.createElement('p');",
            output: "activeDocument.createEl('p');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createElement with shorthand tags
        {
            name: "document.createElement('div') → createDiv()",
            code: "document.createElement('div');",
            output: "createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElement('span') → createSpan()",
            code: "document.createElement('span');",
            output: "createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('div') → activeDocument.createDiv()",
            code: "activeDocument.createElement('div');",
            output: "activeDocument.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElement('span') → activeDocument.createSpan()",
            code: "activeDocument.createElement('span');",
            output: "activeDocument.createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createEl shorthand
        {
            name: "createEl('div') → createDiv()",
            code: "createEl('div');",
            output: "createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('span') → createSpan()",
            code: "createEl('span');",
            output: "createSpan();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "createEl('div', opts) → createDiv(opts)",
            code: "createEl('div', { cls: 'foo' });",
            output: "createDiv({ cls: 'foo' });",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "el.createEl('div') → el.createDiv()",
            code: "el.createEl('div');",
            output: "el.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "el.createEl('span', opts) → el.createSpan(opts)",
            code: "el.createEl('span', { text: 'hi' });",
            output: "el.createSpan({ text: 'hi' });",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createEl('div') → createDiv()",
            code: "document.createEl('div');",
            output: "createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "this.containerEl.createEl('div') → this.containerEl.createDiv()",
            code: "this.containerEl.createEl('div');",
            output: "this.containerEl.createDiv();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createElementNS (SVG) → createSvg
        {
            name: "document.createElementNS(SVG_NS, tag) → createSvg(tag)",
            code: "document.createElementNS('http://www.w3.org/2000/svg', 'path');",
            output: "createSvg('path');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createElementNS(SVG_NS, tag) → activeDocument.createSvg(tag)",
            code: "activeDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');",
            output: "activeDocument.createSvg('svg');",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "document.createElementNS(SVG_NS, tag) with variable → createSvg(tag)",
            code: "document.createElementNS('http://www.w3.org/2000/svg', tag);",
            output: "createSvg(tag);",
            errors: [{ messageId: "preferCreateEl" }],
        },
        // createDocumentFragment → createFragment
        {
            name: "document.createDocumentFragment() → createFragment()",
            code: "document.createDocumentFragment();",
            output: "createFragment();",
            errors: [{ messageId: "preferCreateEl" }],
        },
        {
            name: "activeDocument.createDocumentFragment() → activeDocument.createFragment()",
            code: "activeDocument.createDocumentFragment();",
            output: "activeDocument.createFragment();",
            errors: [{ messageId: "preferCreateEl" }],
        },
    ],
});
