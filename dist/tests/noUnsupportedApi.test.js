import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../lib/rules/noUnsupportedApi.js";
const ruleTester = new RuleTester();
ruleTester.run("no-unsupported-api", rule, {
    valid: [
        {
            name: "Property available before minAppVersion",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.vault;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "Method available before minAppVersion",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.fileManager;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "minAppVersion high enough — no error",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "99.0.0" }],
        },
        {
            name: "Non-obsidian code should not trigger",
            code: `
                const obj = { renderContext: true };
                obj.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API exactly at minAppVersion",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.10.0" }],
        },
        {
            name: "API below minAppVersion",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.11.0" }],
        },
        {
            name: "Function available before minAppVersion: request @since 0.12.11",
            code: `
                import { request } from 'obsidian';
                request('https://example.com');
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "super.setValue in AbstractInputSuggest subclass is allowed at 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                class MyInputSuggest extends AbstractInputSuggest<string> {
                    getSuggestions(): string[] { return []; }
                    renderSuggestion(): void {}
                    selectSuggestion(): void {}
                    setValue(value: string): void {
                        super.setValue(value);
                    }
                }
            `,
            options: [{ minAppVersion: "1.4.10" }],
        },
        {
            name: "Function setTooltip available at minAppVersion 1.4.4",
            code: `
                import { setTooltip } from 'obsidian';
                declare const el: HTMLElement;
                setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.4.4" }],
        },
        {
            name: "API guarded by requireApiVersion if-statement is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.10.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with && in if-test is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const condition = true;
                if (requireApiVersion("1.10.0") && condition) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion logical-AND expression is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                requireApiVersion("1.10.0") && app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion ternary is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                requireApiVersion("1.10.0") ? app.renderContext : undefined;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
    ],
    invalid: [
        {
            name: "Property access: App.renderContext requires 1.10.0",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Method call: App.isDarkMode requires 1.10.0",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.isDarkMode();
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Property access: App.secretStorage requires 1.11.4",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.secretStorage;
            `,
            options: [{ minAppVersion: "1.10.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Class extension: AbstractInputSuggest requires 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                declare class MySuggest extends AbstractInputSuggest<string> {}
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Function displayTooltip requires 1.8.7",
            code: `
                import { displayTooltip } from 'obsidian';
                declare const el: HTMLElement;
                displayTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "BaseComponent has no @since but setDisabled requires 1.2.3",
            code: `
                import { BaseComponent } from 'obsidian';
                declare const component: BaseComponent;
                component.setDisabled(true);
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Global augmentation: Array.findLastIndex requires 1.4.4",
            code: `
                import 'obsidian';
                [1, 2, 3].findLastIndex((x) => x > 1);
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Function getFrontMatterInfo requires 1.5.7",
            code: `
                import { getFrontMatterInfo } from 'obsidian';
                getFrontMatterInfo('---\\nfoo: bar\\n---');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "Function setTooltip requires 1.4.4",
            code: `
                import { setTooltip } from 'obsidian';
                declare const el: HTMLElement;
                setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "super.setValue in AbstractInputSuggest subclass requires 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                class MyInputSuggest extends AbstractInputSuggest<string> {
                    getSuggestions(): string[] { return []; }
                    renderSuggestion(): void {}
                    selectSuggestion(): void {}
                    setValue(value: string): void {
                        super.setValue(value);
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }, { messageId: "apiNotAvailable" }],
        },
        {
            name: "API guarded by requireApiVersion with insufficient version is still flagged",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.0.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "SecretStorage requires 1.11.1 but SecretStorage.setSecret requires 1.11.4,",
            code: `
                import { SecretStorage } from 'obsidian';
                declare const storage: SecretStorage;
                storage.setSecret('key', 'value');
            `,
            options: [{ minAppVersion: "1.11.1" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
    ],
});
