import { RuleTester } from "@typescript-eslint/rule-tester";
import noDeprecatedDisplayRule from "../../lib/rules/settingsTab/noDeprecatedDisplay.js";

const MOCK_CLASS = `declare class PluginSettingTab {}`;

const ruleTester = new RuleTester();

ruleTester.run("no-deprecated-display", noDeprecatedDisplayRule, {
    valid: [
        {
            name: "display() without getSettingDefinitions() is still required",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                }
            `,
        },
        {
            name: "getSettingDefinitions() alone is the clean Path A",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "both methods below 1.13 is valid dual support (Path B)",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "abstract base class is skipped",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab {
                    display() {}
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab { getSettingDefinitions() { return []; } display() {} }
            `,
        },
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 here, so nothing is deprecated)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                    display() {}
                }
            `,
        },
        {
            name: "an unknown minAppVersion option is a no-op",
            options: [{ minAppVersion: "latest" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                    display() {}
                }
            `,
        },
    ],
    invalid: [
        {
            name: "both methods at 1.13 flags the bypassed display()",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                    getSettingDefinitions() { return []; }
                }
            `,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    data: { minAppVersion: "1.13.0" },
                    // Highlight points at the `display` identifier only.
                    line: 4,
                    column: 21,
                    endColumn: 28,
                },
            ],
            // Autofix deletes the whole display() member.
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "autofix removes a display arrow field including its semicolon",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                    display = () => {};
                }
            `,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    data: { minAppVersion: "1.13.0" },
                },
            ],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                }
            `,
        },
        {
            name: "a class expression's bypassed display() is flagged and removed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                    display() {}
                };
            `,
            errors: [{ messageId: "deprecatedDisplay" }],
            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {
                    getSettingDefinitions() { return []; }
                };
            `,
        },
    ],
});
