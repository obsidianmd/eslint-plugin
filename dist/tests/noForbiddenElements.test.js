import { RuleTester } from "@typescript-eslint/rule-tester";
import noForbiddenElements from "lib/rules/noForbiddenElements.js";
const ruleTester = new RuleTester();
ruleTester.run("no-forbidden-elements", noForbiddenElements, {
    valid: [
        {
            name: "createElement('p') is allowed",
            code: "const style = document.createElement('p'); document.head.appendChild(style);",
        },
        {
            name: "createEl('p') is allowed",
            code: "const style = document.createEl('p');",
        }
    ],
    invalid: [
        {
            name: "createElement('style') with appendChild is forbidden",
            code: "const style = document.createElement('style'); document.head.appendChild(style);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createElement('link') with appendChild is forbidden",
            code: "const p = document.createElement('link'); document.head.appendChild(p);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createElement('link') with div.appendChild is forbidden",
            code: "const div = document.createElement('div'); const link = document.createElement('link'); div.appendChild(link);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "createEl('style') is forbidden",
            code: "const style = document.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "document.head.createEl('style') is forbidden",
            code: "const style = document.head.createEl('style');",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "document.head.createEl('style') with args is forbidden",
            code: "const style = document.head.createEl('style', { some: \"other arg\"});",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        },
        {
            name: "stylesheet link element with appendChild is forbidden",
            code: "const styleSheet = document.createElement('link');\n styleSheet.rel = 'stylesheet';\n styleSheet.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);\n document.head.appendChild(styleSheet);",
            errors: [{ messageId: "doNotAttachForbiddenStyleElements" }]
        }
    ],
});
