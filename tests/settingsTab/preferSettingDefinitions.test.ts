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
            errors: [{ messageId: "missingSettingDefinitions" }],
        },
    ],
});
