import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
import { describe, it } from "mocha";
import noDeprecatedDisplayRule from "../../lib/rules/settingsTab/noDeprecatedDisplay.js";

const MOCK_CLASS = `declare class PluginSettingTab {}`;
// A getSettingDefinitions() that returns definitions, so Obsidian 1.13+ renders
// the tab from them and never calls display().
const DEFINITIONS = `getSettingDefinitions() { return [{ name: "Mode" }]; }`;

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
                    ${DEFINITIONS}
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
                    ${DEFINITIONS}
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
                    ${DEFINITIONS}
                }
            `,
        },
        {
            name: "a class extending obsidian.PluginSettingTab is not matched",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                declare const obsidian: { PluginSettingTab: new () => object };
                class MyTab extends obsidian.PluginSettingTab { ${DEFINITIONS} display() {} }
            `,
        },
        {
            name: "minAppVersion defaults to manifest.json (0.15.0 here, so nothing is deprecated)",
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
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
                    ${DEFINITIONS}
                    display() {}
                }
            `,
        },
        {
            // media-recorder, kambas, easy-bookkeeping: a stub added to silence
            // prefer-setting-definitions. With no definitions Obsidian calls
            // display(), so it is the tab's renderer, not a leftover.
            name: "getSettingDefinitions() that returns [] leaves display() rendering the tab",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class VideoJournalSettingTab extends PluginSettingTab {
                    display(): void {}
                    getSettingDefinitions() {
                        return [];
                    }
                }
            `,
        },
        {
            name: "a typed empty-array stub, as a method or an arrow field, is not reported",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class TypedStub extends PluginSettingTab {
                    getSettingDefinitions(): unknown[] { return [] as unknown[]; }
                    display(): void {}
                }
                class ArrowStub extends PluginSettingTab {
                    getSettingDefinitions = () => [];
                    display(): void {}
                }
            `,
        },
        {
            name: "an empty-array stub seen through satisfies, an angle-bracket or a non-null assertion is not reported",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class SatisfiesStub extends PluginSettingTab {
                    getSettingDefinitions() { return [] satisfies unknown[]; }
                    display(): void {}
                }
                class AssertionStub extends PluginSettingTab {
                    getSettingDefinitions() { return <unknown[]>[]; }
                    display(): void {}
                }
                class NonNullStub extends PluginSettingTab {
                    getSettingDefinitions() { return []!; }
                    display(): void {}
                }
            `,
        },
        {
            // chem-search: ({}).length > 0 is false, so display() renders.
            name: "getSettingDefinitions() that returns {} is not reported either",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class ChemSearchSettingTab extends PluginSettingTab {
                    getSettingDefinitions() { return {}; }
                    display(): void {}
                }
            `,
        },
    ],
    invalid: [
        {
            name: "both methods at 1.13 flags the bypassed display(), with a suggestion to remove it",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    display() {}
                    ${DEFINITIONS}
                }
            `,
            // Never autofixed: removing display() is only suggested.
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    data: { minAppVersion: "1.13.0" },
                    // Highlight points at the `display` identifier only.
                    line: 4,
                    column: 21,
                    endColumn: 28,
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "the suggestion removes a display arrow field including its semicolon",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
                    display = () => {};
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    data: { minAppVersion: "1.13.0" },
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "the suggestion removes a stray semicolon after the display() method",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
                    display() {};
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                class MyTab extends PluginSettingTab {
                    ${DEFINITIONS}
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "the suggestion keeps CRLF line endings, removing the display() line whole",
            options: [{ minAppVersion: "1.13.0" }],
            code: [
                MOCK_CLASS,
                "class MyTab extends PluginSettingTab {",
                "    display() {}",
                `    ${DEFINITIONS}`,
                "}",
            ].join("\r\n"),
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: [
                                MOCK_CLASS,
                                "class MyTab extends PluginSettingTab {",
                                `    ${DEFINITIONS}`,
                                "}",
                            ].join("\r\n"),
                        },
                    ],
                },
            ],
        },
        {
            // Only a function returning [] is known to be a stub.
            name: "getSettingDefinitions as a field holding a function is reported",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare function buildDefinitions(): { name: string }[];
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions = buildDefinitions;
                    display() {}
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                declare function buildDefinitions(): { name: string }[];
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions = buildDefinitions;
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a class expression's bypassed display() is flagged, with a suggestion",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {
                    ${DEFINITIONS}
                    display() {}
                };
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab {
                    ${DEFINITIONS}
                };
            `,
                        },
                    ],
                },
            ],
        },
        {
            // mythic-gme-support: with obsidian typings older than 1.13,
            // display() is abstract and removing it is TS2515.
            name: "an empty display() kept for pre-1.13 typings is only suggested for removal",
            options: [{ minAppVersion: "1.13.1" }],
            code: `
                declare abstract class PluginSettingTab { abstract display(): void; }
                class MythicSettingTab extends PluginSettingTab {
                    display(): void { } // required by the compiler
                    ${DEFINITIONS}
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    data: { minAppVersion: "1.13.1" },
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                declare abstract class PluginSettingTab { abstract display(): void; }
                class MythicSettingTab extends PluginSettingTab {
                    ${DEFINITIONS}
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            // task-vault: removing display() leaves Setting, AGENTS and
            // randomToken unused (TS6133 under noUnusedLocals).
            name: "a display() whose helpers would be left unused is only suggested for removal",
            options: [{ minAppVersion: "1.13.7" }],
            code: `
                ${MOCK_CLASS}
                declare class Setting { constructor(el: unknown); setName(name: string): this; }
                const AGENTS = ["hermes", "cc", "codex"];
                class TaskVaultSettingTab extends PluginSettingTab {
                    ${DEFINITIONS}
                    display(): void {
                        for (const agent of AGENTS) new Setting(null).setName(agent);
                    }
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                declare class Setting { constructor(el: unknown); setName(name: string): this; }
                const AGENTS = ["hermes", "cc", "codex"];
                class TaskVaultSettingTab extends PluginSettingTab {
                    ${DEFINITIONS}
                }
            `,
                        },
                    ],
                },
            ],
        },
        {
            name: "a trailing comment is kept when display() shares its line",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { ${DEFINITIONS} display() {} }; // tab
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { ${DEFINITIONS}  }; // tab
            `,
                        },
                    ],
                },
            ],
        },
        {
            // The comment may be about the member before display(), so it stays.
            name: "a trailing comment is kept when display() shares its line with another member",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { ${DEFINITIONS} display() {} // tab
                };
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                const MyTab = class extends PluginSettingTab { ${DEFINITIONS}  // tab
                };
            `,
                        },
                    ],
                },
            ],
        },
        {
            // display() is still the fallback whenever the array comes back empty.
            name: "getSettingDefinitions() that returns [] only sometimes is reported, with a suggestion",
            options: [{ minAppVersion: "1.13.0" }],
            code: `
                ${MOCK_CLASS}
                declare const ready: boolean;
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() {
                        if (!ready) return [];
                        return [{ name: "Mode" }];
                    }
                    display() {}
                }
            `,
            output: null,
            errors: [
                {
                    messageId: "deprecatedDisplay",
                    suggestions: [
                        {
                            messageId: "removeDisplay",
                            output: `
                ${MOCK_CLASS}
                declare const ready: boolean;
                class MyTab extends PluginSettingTab {
                    getSettingDefinitions() {
                        if (!ready) return [];
                        return [{ name: "Mode" }];
                    }
                }
            `,
                        },
                    ],
                },
            ],
        },
    ],
});

describe("no-deprecated-display with a getSettingDefinitions() that returns nothing", () => {
    // Whether such a tab is reported is not pinned here: only that the rule
    // reads these bodies without crashing.
    for (const [name, body] of [
        ["an empty body", "{}"],
        ["a bare return", "{ return; }"],
        ["one statement that is not a return", "{ this.build(); }"],
    ]) {
        it(`does not crash on ${name}`, () => {
            const messages = new Linter().verify(
                `class MyTab extends PluginSettingTab { getSettingDefinitions() ${body} display() {} }`,
                [{
                    plugins: { obsidianmd: { rules: { "no-deprecated-display": noDeprecatedDisplayRule as never } } },
                    rules: { "obsidianmd/no-deprecated-display": ["warn", { minAppVersion: "1.13.0" }] },
                }],
            );
            assert.deepStrictEqual(messages.filter((message) => message.fatal), []);
        });
    }
});
