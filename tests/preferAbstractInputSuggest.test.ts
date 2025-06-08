import { RuleTester } from "@typescript-eslint/rule-tester";
import noDeprecatedSuggestRule from "../lib/rules/preferAbstractInputSuggest.js";

const ruleTester = new RuleTester();

ruleTester.run("no-deprecated-text-input-suggest", noDeprecatedSuggestRule, {
	valid: [
		// Valid: A standard popperjs call without the custom modifier.
		{
			code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    placement: 'top',
                });
            `,
		},
		// Valid: A popperjs call with other modifiers.
		{
			code: `
                import { createPopper } from '@popperjs/core';
                createPopper(button, tooltip, {
                    modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
                });
            `,
		},
		// Valid: A call to a different function.
		{
			code: "someOtherFunction();",
		},
	],
	invalid: [
		// Invalid: The exact pattern from the deprecated implementation.
		{
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
