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
    ],
    invalid: [
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
