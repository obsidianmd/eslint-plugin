import { RuleTester } from "@typescript-eslint/rule-tester";
import objectAssignRule from "../lib/rules/objectAssign.js";

const ruleTester = new RuleTester();

ruleTester.run("object-assign", objectAssignRule, {
	valid: [
		{ code: "Object.assign({}, {foo: 1}, {bar: 2});" },
		{
			code: "this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());",
		},
	],
	invalid: [
		{
			code: "Object.assign(defaultConfig, config);",
			errors: [{ messageId: "twoArgumentsDefault" }],
		},
		{
			code: `
				class MyPlugin {
					settings: any;

					async loadSettings() {
						this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
					}
				}
			`,
			errors: [{ messageId: "twoArgumentsDefault" }],
		},
	],
});
