import { RuleTester } from "@typescript-eslint/rule-tester";
import noDeprecatedSuggestRule from "../lib/rules/preferAbstractInputSuggest.js";

const ruleTester = new RuleTester();

ruleTester.run("no-deprecated-text-input-suggest", noDeprecatedSuggestRule, {
    valid: [
        {
            name: "popperjs call without sameWidth modifier is allowed",
            code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    placement: 'top',
                });
            `,
        },
        {
            name: "popperjs call with other modifiers is allowed",
            code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
                });
            `,
        },
        {
            name: "call to a different function is allowed",
            code: "someOtherFunction();",
        },
        {
            name: "options passed in a variable are not reported",
            code: `
                const options = { modifiers: [{ name: "sameWidth" }] };
                createPopper(inputEl, suggestEl, options);
            `,
        },
        {
            name: "a call through a namespace is not reported",
            code: `Popper.createPopper(inputEl, suggestEl, { modifiers: [{ name: "sameWidth" }] });`,
        },
        {
            name: "createPopper() without options, or with modifiers that are not an array literal, is not reported",
            code: `
                createPopper(inputEl, suggestEl);
                createPopper(inputEl, suggestEl, { modifiers: sharedModifiers });
            `,
        },
        {
            name: "sameWidth under another key, in the modifier or in the options, is not reported",
            code: `
                createPopper(inputEl, suggestEl, { modifiers: [{ id: "sameWidth" }] });
                createPopper(inputEl, suggestEl, { placement: "bottom", extra: [{ name: "sameWidth" }] });
            `,
        },
    ],
    invalid: [
        {
            name: "a sameWidth modifier after other modifiers is forbidden",
            code: `
                createPopper(inputEl, suggestEl, { modifiers: [offsetModifier, { name: "offset" }, { name: "sameWidth" }] });
                createPopper(inputEl, suggestEl, { modifiers: [, { name: "sameWidth" }] });
            `,
            errors: [{ messageId: "preferAbstractInputSuggest" }, { messageId: "preferAbstractInputSuggest" }],
        },
        {
            name: "deprecated sameWidth modifier pattern is forbidden",
            code: `
                import { createPopper } from '@popperjs/core';
                createPopper(inputEl, suggestEl, {
                    placement: "bottom-start",
                    modifiers: [
                        {
                            name: "sameWidth",
                            enabled: true,
                            fn: () => {},
                            phase: "beforeWrite",
                            requires: ["computeStyles"],
                        },
                    ],
                });
            `,
            errors: [{ messageId: "preferAbstractInputSuggest" }],
        },
    ],
});
