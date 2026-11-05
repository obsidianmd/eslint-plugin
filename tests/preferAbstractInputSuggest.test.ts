import { RuleTester } from "@typescript-eslint/rule-tester";
import noDeprecatedSuggestRule from "../lib/rules/preferAbstractInputSuggest.js";

const ruleTester = new RuleTester();

// AbstractInputSuggest came with Obsidian 1.4.10. This repo's manifest.json
// says 0.15.0, below which nothing is reported, so the version is given as
// an option.
const since = [{ minAppVersion: "1.4.10" }] as const;

ruleTester.run("no-deprecated-text-input-suggest", noDeprecatedSuggestRule, {
    valid: [
        {
            name: "popperjs call without sameWidth modifier is allowed",
            options: since,
            code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    placement: 'top',
                });
            `,
        },
        {
            name: "popperjs call with other modifiers is allowed",
            options: since,
            code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
                });
            `,
        },
        {
            name: "call to a different function is allowed",
            options: since,
            code: "someOtherFunction();",
        },
        {
            name: "options passed in a variable are not reported",
            options: since,
            code: `
                const options = { modifiers: [{ name: "sameWidth" }] };
                createPopper(inputEl, suggestEl, options);
            `,
        },
        {
            name: "a call through a namespace is not reported",
            options: since,
            code: `Popper.createPopper(inputEl, suggestEl, { modifiers: [{ name: "sameWidth" }] });`,
        },
        {
            name: "createPopper() without options, or with modifiers that are not an array literal, is not reported",
            options: since,
            code: `
                createPopper(inputEl, suggestEl);
                createPopper(inputEl, suggestEl, { modifiers: sharedModifiers });
            `,
        },
        {
            name: "sameWidth under another key, in the modifier or in the options, is not reported",
            options: since,
            code: `
                createPopper(inputEl, suggestEl, { modifiers: [{ id: "sameWidth" }] });
                createPopper(inputEl, suggestEl, { placement: "bottom", extra: [{ name: "sameWidth" }] });
            `,
        },
        {
            // obsidian-kanban, buttons, longform: below 1.4.10 there is no
            // AbstractInputSuggest to use.
            name: "below 1.4.10, as this repo's manifest.json (0.15.0) is, nothing is reported",
            code: 'createPopper(inputEl, suggestEl, { modifiers: [{ name: "sameWidth" }] });',
        },
        {
            name: "below 1.4.10 by the option",
            code: 'createPopper(inputEl, suggestEl, { modifiers: [{ name: "sameWidth" }] });',
            options: [{ minAppVersion: "1.4.4" }],
        },
    ],
    invalid: [
        {
            name: "a sameWidth modifier after other modifiers is forbidden",
            options: since,
            code: `
                createPopper(inputEl, suggestEl, { modifiers: [offsetModifier, { name: "offset" }, { name: "sameWidth" }] });
                createPopper(inputEl, suggestEl, { modifiers: [, { name: "sameWidth" }] });
            `,
            errors: [{ messageId: "preferAbstractInputSuggest" }, { messageId: "preferAbstractInputSuggest" }],
        },
        {
            name: "deprecated sameWidth modifier pattern is forbidden",
            options: since,
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
        {
            name: "a minAppVersion that is not a version is reported",
            code: 'createPopper(inputEl, suggestEl, { modifiers: [{ name: "sameWidth" }] });',
            options: [{ minAppVersion: "latest" }],
            errors: [{ messageId: "preferAbstractInputSuggest" }],
        },
    ],
});
