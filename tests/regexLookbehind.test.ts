import { RuleTester } from "@typescript-eslint/rule-tester";
import regexLookbehindRule from "../lib/rules/regexLookbehind.js";

const ruleTester = new RuleTester();

ruleTester.run("regex-lookbehind", regexLookbehindRule, {
	valid: [{ code: "const re = /foo/;" }],
	invalid: [
		{
			code: "const re = /(?<=foo)bar/;",
			errors: [{ messageId: "lookbehind" }],
		},
	],
});
