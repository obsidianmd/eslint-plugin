import { RuleTester } from "@typescript-eslint/rule-tester";
import preferUpdateOverDisplayRule from "../../lib/rules/settingsTab/preferUpdateOverDisplay.js";

const MOCK_CLASS = `declare class PluginSettingTab { update(): void; display(): void; }`;
// The shape of PluginSettingTab in obsidian typings older than 1.13: display()
// is abstract and there is no update().
const PRE_113_CLASS = `declare abstract class PluginSettingTab { abstract display(): void; }`;

const ruleTester = new RuleTester();

ruleTester.run("prefer-update-over-display", preferUpdateOverDisplayRule, {
    valid: [
        {
            name: "this.update() is allowed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.update(); }
                }
            `,
        },
        {
            name: "this.display() below 1.13 is left alone",
            options: [{ minAppVersion: "1.12.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "this.display() outside a PluginSettingTab is ignored",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                class Foo {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab { refresh() { this.display(); } }
            `,
        },
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 here, so display() stays)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() { this.display(); }
                }
            `,
        },
        {
            name: "display() on another object is not reported",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare const other: { display(): void };
                class MyTab extends PluginSettingTab {
                    refresh() { other.display(); }
                }
            `,
        },
    ],
    invalid: [
        {
            name: "this.display() at 1.13 is flagged and fixed to this.update()",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() {
                        this.display();
                    }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    refresh() {
                        this.update();
                    }
                }
            `,
        },
        {
            name: "this.display() in an arrow callback is flagged and fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare function onChange(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    build() { onChange(() => this.display()); }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                declare function onChange(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    build() { onChange(() => this.update()); }
                }
            `,
        },
        {
            name: "this.display() in a class expression is flagged and fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { refresh() { this.display(); } };
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { refresh() { this.update(); } };
            `,
        },
        {
            name: "this.display() in an abstract settings tab is flagged too",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab { refresh() { this.display(); } }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                abstract class BaseTab extends PluginSettingTab { refresh() { this.update(); } }
            `,
        },
        {
            name: "obsidian 1.13+ typings: fixed to this.update()",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                import { PluginSettingTab } from "obsidian";
                declare function onChange(cb: () => void): void;
                export class MyTab extends PluginSettingTab {
                    display(): void { onChange(() => this.display()); }
                    refresh() { this.display(); }
                }
            `,
            errors: [{ messageId: "preferUpdate" }, { messageId: "preferUpdate" }],
            output: `
                import { PluginSettingTab } from "obsidian";
                declare function onChange(cb: () => void): void;
                export class MyTab extends PluginSettingTab {
                    display(): void { onChange(() => this.update()); }
                    refresh() { this.update(); }
                }
            `,
        },
        {
            name: "a refresh from a render callback in getSettingDefinitions() is fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                import { PluginSettingTab, type SettingDefinitionItem } from "obsidian";
                export class MyTab extends PluginSettingTab {
                    getSettingDefinitions(): SettingDefinitionItem[] {
                        return [{ name: "Mode", render: (setting) => { setting.addButton((b) => b.onClick(() => this.display())); } }];
                    }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                import { PluginSettingTab, type SettingDefinitionItem } from "obsidian";
                export class MyTab extends PluginSettingTab {
                    getSettingDefinitions(): SettingDefinitionItem[] {
                        return [{ name: "Mode", render: (setting) => { setting.addButton((b) => b.onClick(() => this.update())); } }];
                    }
                }
            `,
        },
        {
            // countcraft, note-definitions, omnisearch and others: their obsidian
            // typings were older than 1.13, so this.update() was TS2339.
            name: "typings without update() (obsidian < 1.13): suggestion only",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${PRE_113_CLASS}
                declare function onClick(cb: () => void): void;
                class CountCraftSettingsTab extends PluginSettingTab {
                    display(): void {
                        onClick(() => {
                            this.display(); // Refresh settings
                        });
                    }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferUpdate",
                    suggestions: [
                        {
                            messageId: "replaceWithUpdate",
                            output: `
                ${PRE_113_CLASS}
                declare function onClick(cb: () => void): void;
                class CountCraftSettingsTab extends PluginSettingTab {
                    display(): void {
                        onClick(() => {
                            this.update(); // Refresh settings
                        });
                    }
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a tab with its own update() gets a suggestion, which calls that method",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    update(): void { this.refreshCounts(); }
                    refreshCounts() {}
                    refresh() { this.display(); }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferUpdate",
                    suggestions: [
                        {
                            messageId: "replaceWithUpdate",
                            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    update(): void { this.refreshCounts(); }
                    refreshCounts() {}
                    refresh() { this.update(); }
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            // kambas: update() { this.display(); } — renaming it would recurse forever.
            name: "this.display() inside the tab's own update() is reported without a fix",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class KambasSettingTab extends PluginSettingTab {
                    update(): void {
                        this.display();
                    }
                }
            `,
            output: null,
            errors: [{ messageId: "preferUpdate", suggestions: [] }],
        },
        {
            name: "this.display() directly in getSettingDefinitions() is reported without a fix",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() {
                        this.display();
                        return [];
                    }
                }
            `,
            output: null,
            errors: [{ messageId: "preferUpdate", suggestions: [] }],
        },
        {
            name: "this.display() with an argument is reported without a fix",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display(section?: string): void {}
                    refresh() { this.display("advanced"); }
                }
            `,
            output: null,
            errors: [{ messageId: "preferUpdate", suggestions: [] }],
        },
        {
            name: "an awaited async display() gets a suggestion: update() returns void",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    async display(): Promise<void> {}
                    async refresh() { await this.display(); }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferUpdate",
                    suggestions: [
                        {
                            messageId: "replaceWithUpdate",
                            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    async display(): Promise<void> {}
                    async refresh() { await this.update(); }
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a discarded call to an async display() is still fixed",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    async display(): Promise<void> {}
                    refresh() { void this.display(); }
                }
            `,
            errors: [{ messageId: "preferUpdate" }],
            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    async display(): Promise<void> {}
                    refresh() { void this.update(); }
                }
            `,
        },
        {
            name: "this in a nested function is not known to be the tab: suggestion only",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare function later(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    refresh() { later(function (this: any) { this.display(); }); }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferUpdate",
                    suggestions: [
                        {
                            messageId: "replaceWithUpdate",
                            output: `
                ${MOCK_CLASS}
                declare function later(cb: () => void): void;
                class MyTab extends PluginSettingTab {
                    refresh() { later(function (this: any) { this.update(); }); }
                }
            `,
                        },
                    ],
                },
            ],
        },
    ],
});

// Without type information the installed obsidian typings are unknown, and
// before 1.13 they have no update(): the rename is only suggested.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("prefer-update-over-display without type information", preferUpdateOverDisplayRule, {
    valid: [],
    invalid: [
        {
            name: "this.display() gets a suggestion without type information",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                class MyTab extends PluginSettingTab {
                    refresh() { this.display(); }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "preferUpdate",
                    suggestions: [
                        {
                            messageId: "replaceWithUpdate",
                            output: `
                class MyTab extends PluginSettingTab {
                    refresh() { this.update(); }
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "this.display() in the tab's own update() is not even suggested without type information",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                class MyTab extends PluginSettingTab {
                    update() { this.display(); }
                }
            `,
            output: null,
            errors: [{ messageId: "preferUpdate", suggestions: [] }],
        },
    ],
});
