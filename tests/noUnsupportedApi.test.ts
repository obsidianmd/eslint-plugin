import { RuleTester } from "@typescript-eslint/rule-tester";
import assert from "node:assert";
import ts from "typescript";
import rule, { getPluginSuppliedTypes } from "../lib/rules/noUnsupportedApi.js";

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
            name: "a class expression extending AbstractInputSuggest is allowed at 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                const Suggest = class extends AbstractInputSuggest<string> {
                    getSuggestions(): string[] { return []; }
                    renderSuggestion(): void {}
                    selectSuggestion(): void {}
                };
            `,
            options: [{ minAppVersion: "1.4.10" }],
        },
        {
            name: "a class expression extending AbstractInputSuggest is allowed where requireApiVersion guards it",
            code: `
                import { AbstractInputSuggest, requireApiVersion } from 'obsidian';
                const Suggest = requireApiVersion("1.4.10")
                    ? class extends AbstractInputSuggest<string> {
                        getSuggestions(): string[] { return []; }
                        renderSuggestion(): void {}
                        selectSuggestion(): void {}
                    }
                    : null;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a class expression extending a class without @since is allowed",
            code: `
                import { Modal } from 'obsidian';
                const Prompt = class extends Modal {};
                const Plain = class {};
            `,
            options: [{ minAppVersion: "1.0.0" }],
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
            name: "API guarded by requireApiVersion if-statement with constant variable is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.10.0";
                if (requireApiVersion(version)) {
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
        {
            name: "API guarded by requireApiVersion with an imported constant is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                import { RENDER_CONTEXT_VERSION } from "./tests/fixtures/noUnsupportedApiVersions.js";
                if (requireApiVersion(RENDER_CONTEXT_VERSION)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with a constant variable in && is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.10.0";
                const ctx = requireApiVersion(version) && app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with a constant variable in a ternary is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.10.0";
                const ctx = requireApiVersion(version) ? app.renderContext : null;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with an as-const object member is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const VERSIONS = { renderContext: "1.10.0" } as const;
                if (requireApiVersion(VERSIONS.renderContext)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with an enum member is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                enum Version { RenderContext = "1.10.0" }
                if (requireApiVersion(Version.RenderContext)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with a template literal without substitutions is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion(\`1.10.0\`)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion with a template literal over constants is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const major = "1";
                if (requireApiVersion(\`\${major}.10.0\`)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after an early return on a failed requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (!requireApiVersion("1.10.0")) return;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after an early-exit block on a failed requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare function log(): void;
                function f() {
                    if (!requireApiVersion("1.10.0")) {
                        log();
                        return;
                    }
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a top-level throw on a failed requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (!requireApiVersion("1.10.0")) throw new Error("Obsidian is too old");
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a continue on a failed requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const items: string[];
                for (const item of items) {
                    if (!requireApiVersion("1.10.0")) continue;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a break out of a switch on a failed requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const mode: number;
                switch (mode) {
                    case 1:
                        if (!requireApiVersion("1.10.0")) break;
                        app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after an early exit in the else branch of requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (requireApiVersion("1.10.0")) {
                        // supported
                    } else {
                        return;
                    }
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API in an arrow function created after an early exit is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (!requireApiVersion("1.10.0")) return;
                    const read = () => app.renderContext;
                    return read;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API in the else branch of a negated requireApiVersion is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (!requireApiVersion("1.10.0")) {
                    // unsupported
                } else {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API in the alternate of a negated requireApiVersion ternary is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                !requireApiVersion("1.10.0") ? undefined : app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API to the right of a negated requireApiVersion with || is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                !requireApiVersion("1.10.0") || app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by a const requireApiVersion result is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.10.0");
                if (supported) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API to the right of a const requireApiVersion result with && is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.10.0");
                supported && app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after an early exit on a const requireApiVersion result is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.10.0");
                function f() {
                    if (!supported) return;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by a const combining two requireApiVersion calls is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.0.0") && requireApiVersion("1.10.0");
                if (supported) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by requireApiVersion over versions all new enough is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const late: boolean;
                if (requireApiVersion(late ? "1.10.0" : "1.11.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by two requireApiVersion calls with && uses the higher version",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.0.0") && requireApiVersion("1.11.4")) {
                    app.secretStorage;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by two requireApiVersion calls with || uses the lower version",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.10.0") || requireApiVersion("1.11.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after an early exit on a negated parenthesised && is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const enabled: boolean;
                function f() {
                    if (!(requireApiVersion("1.10.0") && enabled)) return;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "minAppVersion without a patch version covers APIs up to x.y.0",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.10" }],
        },
        {
            name: "a partial minAppVersion reads its missing parts as 0",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.10" }],
        },
        {
            name: "members of the settings-definition types the plugin builds are not reported",
            code: `
                import type { SettingDefinitionItem } from 'obsidian';
                declare const items: SettingDefinitionItem[];
                for (const item of items) {
                    if (item.type === 'page') {
                        item.name;
                        item.items;
                    } else if ('items' in item) {
                        item.heading;
                        item.items;
                    } else if (item.type === 'render') {
                        item.render;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a settings-definition control's key and default value are not reported",
            code: `
                import type { SettingDefinitionControl } from 'obsidian';
                declare const definition: SettingDefinitionControl;
                definition.control.key;
                definition.control.defaultValue;
                definition.desc;
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
            name: "new SecretComponent requires 1.11.1",
            code: `
                import { SecretComponent } from 'obsidian';
                declare const app: any;
                declare const el: HTMLElement;
                const secret = new SecretComponent(app, el);
            `,
            options: [{ minAppVersion: "1.0.0" }],
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
        // Only class declarations were checked.
        {
            name: "a class expression extending AbstractInputSuggest requires 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                const Suggest = class extends AbstractInputSuggest<string> {
                    getSuggestions(): string[] { return []; }
                    renderSuggestion(): void {}
                    selectSuggestion(): void {}
                };
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                {
                    messageId: "apiNotAvailable",
                    data: { qualifiedName: "AbstractInputSuggest", sinceVersion: "1.4.10", minAppVersion: "1.0.0" },
                    line: 3,
                },
            ],
        },
        {
            name: "a named class expression passed as an argument and its super call are reported",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                declare function register(ctor: unknown): void;
                register(class MySuggest extends AbstractInputSuggest<string> {
                    getSuggestions(): string[] { return []; }
                    renderSuggestion(): void {}
                    selectSuggestion(): void {}
                    setValue(value: string): void {
                        super.setValue(value);
                    }
                });
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
        {
            name: "requireApiVersion with a let variable is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                let version = "1.10.0";
                if (requireApiVersion(version)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a constant variable below the API version is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.0.0";
                if (requireApiVersion(version)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a shadowing lower constant is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.10.0";
                function f() {
                    const version = "1.0.0";
                    if (requireApiVersion(version)) {
                        app.renderContext;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a union-typed variable proves only its lowest version",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const version: "1.10.0" | "1.0.0";
                if (requireApiVersion(version)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a constant that is not a version is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const mode = "desktop";
                if (requireApiVersion(mode)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a literal that is not a full version is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.10")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a mutable object member is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const VERSIONS = { renderContext: "1.10.0" };
                if (requireApiVersion(VERSIONS.renderContext)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a conditional between two versions proves only the lower one",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const late: boolean;
                if (requireApiVersion(late ? "1.10.0" : "1.0.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a template literal over a string-typed substitution is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const major: string;
                if (requireApiVersion(\`\${major}.10.0\`)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a call returning string is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare function version(): string;
                if (requireApiVersion(version())) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "an exit only inside a nested if is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const cond: boolean;
                function f() {
                    if (!requireApiVersion("1.10.0")) {
                        if (cond) return;
                    }
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a break out of a nested loop is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (!requireApiVersion("1.10.0")) {
                        for (;;) {
                            break;
                        }
                    }
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a break out of a labelled if is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                check: if (!requireApiVersion("1.10.0")) break check;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "an early exit when requireApiVersion succeeds is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (requireApiVersion("1.10.0")) return;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "an early exit after the API is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    app.renderContext;
                    if (!requireApiVersion("1.10.0")) return;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a function declaration after an early exit is hoisted and not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                function f() {
                    if (!requireApiVersion("1.10.0")) return;
                    function read() {
                        return app.renderContext;
                    }
                    return read;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "API in the else branch of a successful requireApiVersion is not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.10.0")) {
                    // supported
                } else {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "API in the alternate of a requireApiVersion ternary is not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                requireApiVersion("1.10.0") ? undefined : app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "API to the right of requireApiVersion with || is not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                requireApiVersion("1.10.0") || app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "API guarded by requireApiVersion or an unrelated condition is not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const enabled: boolean;
                if (requireApiVersion("1.10.0") || enabled) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a let requireApiVersion result is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                let supported = requireApiVersion("1.10.0");
                if (supported) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a parameter shadowing a const requireApiVersion result is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.10.0");
                function f(supported: boolean) {
                    if (supported) {
                        app.renderContext;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a destructured requireApiVersion result is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const [supported] = [requireApiVersion("1.10.0")];
                if (supported) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "two requireApiVersion calls with && both below the API version are not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.0.0") && requireApiVersion("1.10.0")) {
                    app.secretStorage;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "minAppVersion without a patch version is read as x.y.0",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "0.15" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "0.15" } }],
        },
        {
            name: "minAppVersion with a version buried in other text is checked as 0.0.0",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "x99.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "x99.0.0" } }],
        },
        {
            name: "minAppVersion with no version in it is checked as 0.0.0",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "latest" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "latest" } }],
        },
        {
            name: "a continue outside a loop is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (!requireApiVersion("1.10.0")) continue;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a continue whose loop is outside its function is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                for (;;) {
                    function f() {
                        if (!requireApiVersion("1.10.0")) continue;
                        app.renderContext;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "extending SettingPage is still reported: it is a runtime export",
            code: `
                import { SettingPage } from 'obsidian';
                class Page extends SettingPage {
                    display(): void {}
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a member of a runtime-provided interface is still reported",
            code: `
                import type { BasesConfigFile } from 'obsidian';
                declare const config: BasesConfigFile;
                config.filters;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
    ],
});

describe("no-unsupported-api plugin-supplied types", () => {
    const family = (source: string) =>
        [...getPluginSuppliedTypes(ts.createSourceFile("obsidian.d.ts", source, ts.ScriptTarget.Latest, true))].sort();

    it("follows properties, unions, arrays, extends and type arguments from getSettingDefinitions()", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab { getSettingDefinitions(): Item[]; }
                export type Item = Group | Leaf;
                export interface Group { items: Leaf[]; extra: Extra<Arg>; }
                export interface Leaf extends Base { control?: Control | string; }
                export interface Base { name: string; }
                export interface Control { key: string; }
                export interface Extra<T> { value: T; }
                export interface Arg { x: number; }
                export interface Unrelated { y: string; }
            `),
            ["Arg", "Base", "Control", "Extra", "Group", "Item", "Leaf"]
        );
    });

    it("stops at classes, function types and global augmentations", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab { getSettingDefinitions(): Item[]; }
                export interface Item {
                    page?: () => Page;
                    render(setting: Setting): void;
                    desc?: string | DocumentFragment;
                    owner: Setting;
                }
                export abstract class Page { display(): void; }
                export class Setting { setName(name: string): this; }
                export interface Ctx { a: string; }
                declare global { interface DocumentFragment { createEl(): void; } }
            `),
            ["Item"]
        );
    });

    it("is empty for obsidian types without getSettingDefinitions()", () => {
        assert.deepStrictEqual(family(`export interface CachedMetadata { links?: string[]; }`), []);
    });
});
