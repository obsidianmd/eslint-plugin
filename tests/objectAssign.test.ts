import { RuleTester } from "@typescript-eslint/rule-tester";
import objectAssignRule from "../lib/rules/objectAssign.js";

const ruleTester = new RuleTester();

ruleTester.run("object-assign", objectAssignRule, {
	valid: [{ code: "Object.assign({}, {foo: 1}, {bar: 2});" }],
	invalid: [
		{
			code: "Object.assign(defaultConfig, config);",
			errors: [{ messageId: "twoArgumentsDefault" }],
		},
	],
});
