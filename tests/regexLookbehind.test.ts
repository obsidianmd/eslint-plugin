import { RuleTester } from "@typescript-eslint/rule-tester";
import regexLookbehindRule from "../lib/rules/regexLookbehind.js";

const ruleTester = new RuleTester();

ruleTester.run("regex-lookbehind", regexLookbehindRule, {
	valid: [
		{ code: "const re = /foo/;", options: [{ isDesktopOnly: false }] },
		{ code: "const re = /(?<=foo)bar/;", options: [{ isDesktopOnly: true }] },
	],
	invalid: [
		{
			code: "const re = /(?<=foo)bar/;",
			options: [{ isDesktopOnly: false }],
			errors: [{ messageId: "lookbehind" }],
		},
	],
});
