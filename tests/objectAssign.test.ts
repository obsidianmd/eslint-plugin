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
        {
            name: "a target whose name does not contain default is not reported",
            code: "Object.assign(settings, data);",
        },
        {
            name: "a property whose name does not contain default is not reported",
            code: "Object.assign(this.settings, data);",
        },
        {
            name: "a property of the defaults is not reported, only the last name is matched",
            code: "Object.assign(DEFAULT_SETTINGS.editor, data.editor);",
        },
        {
            name: "a module's default export is not a set of defaults",
            code: "Object.assign(mod.default, overrides);",
        },
        {
            name: "a document's defaultView is the window, not a set of defaults",
            code: "Object.assign(doc.defaultView, globals);",
        },
        {
            name: "a computed property with a variable key is not reported",
            code: "Object.assign(this[DEFAULT_KEY], data);",
        },
        {
            name: "a copy of property defaults into a new object is not reported",
            code: "this.settings = Object.assign({}, this.defaults, await this.loadData());",
        },
        {
            name: "a property target with an object literal as the second argument is not reported",
            code: "Object.assign(this.defaults, { theme: 'dark' });",
        },
        {
            name: "merging property defaults into the settings is not reported",
            code: "Object.assign(this.settings, this.defaultSettings);",
        },
        {
            name: "an object literal as the second argument is not reported",
            code: "Object.assign(DEFAULT_SETTINGS, { theme: 'dark' });",
        },
        {
            name: "three or more arguments are not reported",
            code: "Object.assign(DEFAULT_SETTINGS, a, b);",
        },
        {
            name: "assign on another object, or another Object method, is not reported",
            code: "Settings.assign(DEFAULT_SETTINGS, data); Object.defineProperties(DEFAULT_SETTINGS, descriptors);",
        },
        {
            name: "a target that is a call or a numeric index has no name to match",
            code: "Object.assign(getDefaults(), data); Object.assign(this[0], data);",
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
        {
            name: "the defaults name is matched in any case",
            code: "Object.assign(myDefaults, data);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a property of this named defaults is reported",
            code: "this.settings = Object.assign(this.defaults, await this.loadData());",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a property of another object named DEFAULT_SETTINGS is reported",
            code: "this.settings = Object.assign(Constants.DEFAULT_SETTINGS, data);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a camel-case defaults property is reported",
            code: "Object.assign(this.defaultSettings, data);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a nested property is matched by its last name",
            code: "Object.assign(this.plugin.DEFAULT_SETTINGS, data);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a computed property with a string key is reported",
            code: "Object.assign(this[\"defaults\"], data);",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
        {
            name: "a private field is reported",
            code: "class Store { #defaults = {}; load(data: object) { return Object.assign(this.#defaults, data); } }",
            errors: [{ messageId: "twoArgumentsDefault" }],
        },
    ],
});
