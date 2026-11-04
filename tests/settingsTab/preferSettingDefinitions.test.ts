import { RuleTester } from "@typescript-eslint/rule-tester";
import preferSettingDefinitionsRule from "../../lib/rules/settingsTab/preferSettingDefinitions.js";

const MOCK_CLASS = `declare class PluginSettingTab {}`;

const ruleTester = new RuleTester();

ruleTester.run("prefer-setting-definitions", preferSettingDefinitionsRule, {
    valid: [
        {
            name: "getSettingDefinitions() method is provided",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "getSettingDefinitions as an arrow class field counts as provided",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions = () => [];
                }
            `,
        },
        {
            name: "abstract base class is skipped",
            code: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab {}
            `,
        },
        {
            name: "class not extending PluginSettingTab is ignored",
            code: `class Foo { display() {} }`,
        },
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab { display() {} }
            `,
        },
    ],
    invalid: [
        {
            name: "missing getSettingDefinitions() is a warning",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                }
            `,
            // The class name is highlighted, not the whole class.
            errors: [{ messageId: "missingSettingDefinitions", line: 3, column: 23, endLine: 3, endColumn: 28 }],
        },
        {
            name: "a class expression without getSettingDefinitions() is reported",
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { display() {} };
            `,
            // An anonymous class is highlighted at its superclass.
            errors: [{ messageId: "missingSettingDefinitions", line: 3, column: 45, endColumn: 61 }],
        },
    ],
});
