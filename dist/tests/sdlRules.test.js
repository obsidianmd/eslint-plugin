import { RuleTester } from "eslint";
import sdlPlugin from "@microsoft/eslint-plugin-sdl";
const ruleTester = new RuleTester();
ruleTester.run("sdl-no-document-write", sdlPlugin.rules["no-document-write"], {
    valid: [
        {
            name: "document.createElement is allowed",
            code: "document.createElement('div');",
        },
        {
            name: "el.textContent assignment is allowed",
            code: "el.textContent = 'hello';",
        },
    ],
    invalid: [
        {
            name: "document.write is forbidden",
            code: "document.write('<h1>Hello</h1>');",
            errors: [{ messageId: "default" }],
        },
        {
            name: "document.writeln is forbidden",
            code: "document.writeln('<p>World</p>');",
            errors: [{ messageId: "default" }],
        },
    ],
});
ruleTester.run("sdl-no-inner-html", sdlPlugin.rules["no-inner-html"], {
    valid: [
        {
            name: "textContent assignment is allowed",
            code: "el.textContent = 'hello';",
        },
        {
            name: "createEl is allowed",
            code: "el.createEl('div');",
        },
    ],
    invalid: [
        {
            name: "innerHTML assignment is forbidden",
            code: "el.innerHTML = '<b>bold</b>';",
            errors: [{ messageId: "noInnerHtml" }],
        },
        {
            name: "outerHTML assignment is forbidden",
            code: "el.outerHTML = '<div>replaced</div>';",
            errors: [{ messageId: "noInnerHtml" }],
        },
        {
            name: "insertAdjacentHTML is forbidden",
            code: "el.insertAdjacentHTML('beforeend', '<b>bold</b>');",
            errors: [{ messageId: "noInsertAdjacentHTML" }],
        },
    ],
});
