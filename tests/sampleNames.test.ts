import { RuleTester } from "@typescript-eslint/rule-tester";
import sampleNamesRule from "../lib/rules/sampleNames.js";

const ruleTester = new RuleTester();

ruleTester.run("sample-names", sampleNamesRule, {
	valid: [{ code: "class NotSample {}" }],
	invalid: [{ code: "class MyPlugin {}", errors: [{ messageId: "rename" }] }],
});
