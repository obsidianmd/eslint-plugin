import { RuleTester } from "@typescript-eslint/rule-tester";
import objectAssignRule from "../lib/rules/objectAssign.js";
const ruleTester = new RuleTester();
ruleTester.run("object-assign", objectAssignRule, {
    valid: [
        {
            name: "Object.assign with empty first arg is allowed",
            code: "Object.assign({}, {foo: 1}, {bar: 2});",
        },
        {
            name: "Object.assign with empty first arg for settings is allowed",
            code: "this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());",
        },
    ],
    invalid: [
        {
            name: "Object.assign with two args mutating first is forbidden",
            code: "Object.assign(defaultConfig, config);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "Object.assign mutating DEFAULT_SETTINGS is forbidden",
            code: `
                class MyPlugin {
                    settings: unknown;

                    async loadSettings() {
                        this.settings = Object.assign(DEFAULT_SETTINGS, await this.loadData());
                    }
                }
            `,
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
    ],
});
