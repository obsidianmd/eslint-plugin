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
            // obsidian-linter's rule-builder: the object is made for the call.
            name: "a variable of the same function holding a new object is not reported",
            code: `
                class RuleBuilder {
                    OptionsClass: new () => object;
                    getOptions(options: object) {
                        const defaultOptions = new this.OptionsClass();
                        const ruleOptions = Object.assign(defaultOptions, options);
                        return ruleOptions;
                    }
                }
                function build(data: object) {
                    const defaults = { a: 1 };
                    const defaultList: unknown[] = [];
                    const defaultCopy = structuredClone(DEFAULT_SETTINGS);
                    return [Object.assign(defaults, data), Object.assign(defaultList, data), Object.assign(defaultCopy, data)];
                }
            `,
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
            // The result is thrown away: the code relies on the target being changed.
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
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
            errors: [{
                messageId: "twoArgumentsDefault",
                suggestions: [{
                    messageId: "copyIntoNewObject",
                    data: { target: "DEFAULT_SETTINGS" },
                    output: `
                class MyPlugin {
                    settings: unknown;

                    async loadSettings() {
                        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
                    }
                }
            `,
                }],
            }],
        },
        {
            name: "the defaults name is matched in any case",
            code: "Object.assign(myDefaults, data);",
            // The result is thrown away: the code relies on the target being changed.
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
        {
            name: "a property of this named defaults is reported",
            code: "this.settings = Object.assign(this.defaults, await this.loadData());",
            errors: [{
                messageId: "twoArgumentsDefault",
                suggestions: [{ messageId: "copyIntoNewObject", data: { target: "this.defaults" }, output: "this.settings = Object.assign({}, this.defaults, await this.loadData());" }],
            }],
        },
        {
            name: "a property of another object named DEFAULT_SETTINGS is reported",
            code: "this.settings = Object.assign(Constants.DEFAULT_SETTINGS, data);",
            errors: [{
                messageId: "twoArgumentsDefault",
                suggestions: [{ messageId: "copyIntoNewObject", data: { target: "Constants.DEFAULT_SETTINGS" }, output: "this.settings = Object.assign({}, Constants.DEFAULT_SETTINGS, data);" }],
            }],
        },
        {
            name: "a camel-case defaults property is reported",
            code: "Object.assign(this.defaultSettings, data);",
            // The result is thrown away: the code relies on the target being changed.
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
        {
            name: "a nested property is matched by its last name",
            code: "Object.assign(this.plugin.DEFAULT_SETTINGS, data);",
            // The result is thrown away: the code relies on the target being changed.
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
        {
            name: "a computed property with a string key is reported",
            code: "Object.assign(this[\"defaults\"], data);",
            // The result is thrown away: the code relies on the target being changed.
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
        {
            name: "a private field is reported",
            code: "class Store { #defaults = {}; load(data: object) { return Object.assign(this.#defaults, data); } }",
            errors: [{
                messageId: "twoArgumentsDefault",
                suggestions: [{ messageId: "copyIntoNewObject", data: { target: "this.#defaults" }, output: "class Store { #defaults = {}; load(data: object) { return Object.assign({}, this.#defaults, data); } }" }],
            }],
        },
        {
            name: "a variable of the module, of an outer function, or set by another call is still reported",
            code: `
                const defaults = { a: 1 };
                Object.assign(defaults, data);
                export function outer() {
                    const defaultOptions = { a: 1 };
                    return (data: object) => { Object.assign(defaultOptions, data); };
                }
                export function load(plugin: { getDefaults(): object }, data: object) {
                    const defaultSettings = plugin.getDefaults();
                    let defaultLater;
                    defaultLater = {};
                    Object.assign(defaultSettings, data);
                    Object.assign(defaultLater, data);
                }
            `,
            // The results are thrown away, so no suggestion is offered.
            errors: [
                { messageId: "twoArgumentsDefault", line: 3, suggestions: [] },
                { messageId: "twoArgumentsDefault", line: 6, suggestions: [] },
                { messageId: "twoArgumentsDefault", line: 12, suggestions: [] },
                { messageId: "twoArgumentsDefault", line: 13, suggestions: [] },
            ],
        },
    ],
});

const copied = (target: string, output: string) => [{ messageId: "copyIntoNewObject" as const, data: { target }, output }];

ruleTester.run("object-assign suggestions", objectAssignRule, {
    valid: [],
    invalid: [
        {
            name: "where an arrow function's caller uses its result",
            code: "declare const overrides: object[]; export const all = overrides.map((o) => Object.assign(DEFAULT_SETTINGS, o));",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: copied("DEFAULT_SETTINGS", "declare const overrides: object[]; export const all = overrides.map((o) => Object.assign({}, DEFAULT_SETTINGS, o));") }],
        },
        {
            name: "?. is kept",
            code: "export const s = Object.assign?.(DEFAULT_SETTINGS, data);",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: copied("DEFAULT_SETTINGS", "export const s = Object.assign?.({}, DEFAULT_SETTINGS, data);") }],
        },
        {
            name: "parentheses and comments are kept",
            code: "export const s = (Object.assign)(/* base */ (DEFAULT_SETTINGS), data);",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: copied("DEFAULT_SETTINGS", "export const s = (Object.assign)(/* base */ {}, (DEFAULT_SETTINGS), data);") }],
        },
        {
            name: "a call over several lines, with CRLF and a trailing comma",
            code: "export async function load(p: { loadData(): Promise<object> }) {\r\n    return Object.assign(\r\n        DEFAULT_SETTINGS,\r\n        await p.loadData(),\r\n    );\r\n}\r\n",
            errors: [{
                messageId: "twoArgumentsDefault",
                suggestions: copied("DEFAULT_SETTINGS", "export async function load(p: { loadData(): Promise<object> }) {\r\n    return Object.assign(\r\n        {}, DEFAULT_SETTINGS,\r\n        await p.loadData(),\r\n    );\r\n}\r\n"),
            }],
        },
        {
            name: "a spread source is kept",
            code: "export const s = Object.assign(defaults, ...sources);",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: copied("defaults", "export const s = Object.assign({}, defaults, ...sources);") }],
        },
        // Nothing is offered:
        {
            name: "where the result is thrown away with void, or by a chain",
            code: "void Object.assign(DEFAULT_SETTINGS, data); Object.assign?.(DEFAULT_SETTINGS, data);",
            errors: [
                { messageId: "twoArgumentsDefault", suggestions: [] },
                { messageId: "twoArgumentsDefault", suggestions: [] },
            ],
        },
        {
            name: "where the target is an instance of a class, whose prototype the copy would lose",
            code: "class Options { get x() { return 1; } } declare const defaultOptions: Options | undefined; export const s = Object.assign(defaultOptions, data); export class P { defaults = new Options(); load() { return Object.assign(this.defaults, data); } }",
            errors: [
                { messageId: "twoArgumentsDefault", suggestions: [] },
                { messageId: "twoArgumentsDefault", suggestions: [] },
            ],
        },
        {
            name: "where an arrow function's caller throws its result away, as forEach() does",
            code: "declare const overrides: object[]; declare function each(f: (o: object) => void): void; overrides.forEach((o) => Object.assign(DEFAULT_SETTINGS, o)); each((o) => (Object.assign(DEFAULT_SETTINGS, o)));",
            errors: [
                { messageId: "twoArgumentsDefault", suggestions: [] },
                { messageId: "twoArgumentsDefault", suggestions: [] },
            ],
        },
        {
            name: "with type arguments, which are for two arguments",
            code: "interface Settings { a: number } export const s = Object.assign<Settings, Partial<Settings>>(DEFAULT_SETTINGS, data);",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
    ],
});

const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("object-assign in a JavaScript file", objectAssignRule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion is offered",
            filename: "main.js",
            code: "module.exports.load = (data) => Object.assign(DEFAULT_SETTINGS, data);\n",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: copied("DEFAULT_SETTINGS", "module.exports.load = (data) => Object.assign({}, DEFAULT_SETTINGS, data);\n") }],
        },
        {
            name: "nothing is offered for an arrow function passed to forEach()",
            filename: "main.js",
            code: "overrides.forEach((o) => Object.assign(DEFAULT_SETTINGS, o));\n",
            errors: [{ messageId: "twoArgumentsDefault", suggestions: [] }],
        },
    ],
});
