import { RuleTester } from "@typescript-eslint/rule-tester";
import globals from "globals";
import { builtinRules } from "eslint/use-at-your-own-risk";
const noUndefRule = builtinRules.get("no-undef");
const obsidianGlobals = {
    DomElementInfo: "readonly",
    activeDocument: "readonly",
    activeWindow: "readonly",
    ajax: "readonly",
    ajaxPromise: "readonly",
    createDiv: "readonly",
    createEl: "readonly",
    createFragment: "readonly",
    createSpan: "readonly",
    createSvg: "readonly",
    fish: "readonly",
    fishAll: "readonly",
    isBoolean: "readonly",
    nextFrame: "readonly",
    ready: "readonly",
    sleep: "readonly"
};
const desktopRuleTester = new RuleTester({
    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.node,
            NodeJS: "readonly",
            ...obsidianGlobals
        }
    }
});
const browserRuleTester = new RuleTester({
    languageOptions: {
        globals: {
            ...globals.browser,
            ...obsidianGlobals
        }
    }
});
const obsidianValid = [
    {
        name: "DomElementInfo global is defined",
        code: "let domElementInfo: DomElementInfo;",
    },
    {
        name: "activeDocument global is defined",
        code: "activeDocument;",
    },
    {
        name: "activeWindow global is defined",
        code: "activeWindow;",
    },
    {
        name: "ajax global is defined",
        code: "ajax({ url: 'test' });",
    },
    {
        name: "ajaxPromise global is defined",
        code: "ajaxPromise({ url: 'test' });",
    },
    {
        name: "createDiv global is defined",
        code: "createDiv();",
    },
    {
        name: "createEl global is defined",
        code: "createEl('p');",
    },
    {
        name: "createFragment global is defined",
        code: "createFragment(() => {});",
    },
    {
        name: "createSpan global is defined",
        code: "createSpan();",
    },
    {
        name: "createSvg global is defined",
        code: "createSvg('svg');",
    },
    {
        name: "fish global is defined",
        code: "fish('.my-selector');",
    },
    {
        name: "fishAll global is defined",
        code: "fishAll('.my-selector');",
    },
    {
        name: "isBoolean global is defined",
        code: "isBoolean(true)",
    },
    {
        name: "nextFrame global is defined",
        code: "nextFrame(() => {});",
    },
    {
        name: "ready global is defined",
        code: "ready(() => {});",
    },
    {
        name: "sleep global is defined",
        code: "sleep(1000);",
    }
];
const browserValid = [
    {
        name: "console browser global is defined",
        code: "console",
    },
    {
        name: "document browser global is defined",
        code: "document",
    },
    {
        name: "window browser global is defined",
        code: "window",
    },
];
desktopRuleTester.run("no-undef (desktop-only)", noUndefRule, {
    valid: [
        ...obsidianValid,
        ...browserValid,
        {
            name: "require is defined in desktop mode",
            code: "require('path');",
        },
        {
            name: "process is defined in desktop mode",
            code: "process.env.NODE_ENV;",
        },
        {
            name: "setImmediate is defined in desktop mode",
            code: "setImmediate(() => {});",
        }
    ],
    invalid: [
        {
            name: "undefinedGlobal is not defined",
            code: "undefinedGlobal;",
            errors: [{ messageId: "undef" }],
        },
        {
            name: "someUndefinedFunction is not defined",
            code: "someUndefinedFunction();",
            errors: [{ messageId: "undef" }],
        }
    ],
});
browserRuleTester.run("no-undef (browser)", noUndefRule, {
    valid: [
        ...obsidianValid,
        ...browserValid,
    ],
    invalid: [
        {
            name: "undefinedGlobal is not defined in browser",
            code: "undefinedGlobal;",
            errors: [{ messageId: "undef" }],
        },
        {
            name: "someUndefinedFunction is not defined in browser",
            code: "someUndefinedFunction();",
            errors: [{ messageId: "undef" }],
        },
        {
            name: "require is not defined in browser mode",
            code: "require('path');",
            errors: [{ messageId: "undef" }],
        },
        {
            name: "process is not defined in browser mode",
            code: "process.env.NODE_ENV;",
            errors: [{ messageId: "undef" }],
        },
        {
            name: "setImmediate is not defined in browser mode",
            code: "setImmediate(() => {});",
            errors: [{ messageId: "undef" }],
        }
    ],
});
