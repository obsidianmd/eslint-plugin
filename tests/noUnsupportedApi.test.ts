import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import tseslint from "typescript-eslint";
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
            // "01.010" is 1.10.0, not a version semver cannot compare.
            name: "a partial minAppVersion reads its parts as numbers",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "01.010" }],
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
        // Each guard shape below fails if its recognition is removed.
        {
            name: "API guarded by requireApiVersion on the right of && is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const enabled: boolean;
                if (enabled && requireApiVersion("1.10.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "two requireApiVersion calls with && use the higher version, written first",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.11.4") && requireApiVersion("1.0.0")) {
                    app.secretStorage;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "two requireApiVersion calls with || use the lower version, written second",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.11.0") || requireApiVersion("1.10.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after other statements that follow the early exit is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare function log(): void;
                function f() {
                    if (!requireApiVersion("1.10.0")) return;
                    log();
                    log();
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a continue or break in each kind of loop is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const items: string[];
                declare const record: Record<string, string>;
                declare let more: boolean;
                for (let i = 0; i < items.length; i++) {
                    if (!requireApiVersion("1.10.0")) continue;
                    app.renderContext;
                }
                for (const key in record) {
                    if (!requireApiVersion("1.10.0")) break;
                    app.renderContext;
                }
                while (more) {
                    if (!requireApiVersion("1.10.0")) break;
                    app.renderContext;
                }
                do {
                    if (!requireApiVersion("1.10.0")) continue;
                    app.renderContext;
                } while (more);
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a continue out of a switch inside a loop is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const items: string[];
                for (const item of items) {
                    switch (item) {
                        case "a":
                            if (!requireApiVersion("1.10.0")) continue;
                            app.renderContext;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a labelled continue or break is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const items: string[];
                outer: for (const a of items) {
                    for (const b of items) {
                        if (!requireApiVersion("1.10.0")) continue outer;
                        app.renderContext;
                    }
                }
                loop: for (const a of items) {
                    body: {
                        if (!requireApiVersion("1.10.0")) continue loop;
                        app.renderContext;
                    }
                }
                block: {
                    if (!requireApiVersion("1.10.0")) break block;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API after a throw in a static block is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                class Loader {
                    static {
                        if (!requireApiVersion("1.10.0")) throw new Error("Obsidian is too old");
                        app.renderContext;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "API guarded by one const result read twice is allowed",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const supported = requireApiVersion("1.10.0");
                const alias = supported;
                if (supported || alias) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a getter available at minAppVersion is allowed",
            code: `
                import { WorkspaceLeaf } from 'obsidian';
                declare const leaf: WorkspaceLeaf;
                leaf.isDeferred;
            `,
            options: [{ minAppVersion: "1.7.2" }],
        },
        {
            name: "a namespace import's APIs available at minAppVersion are allowed",
            code: `
                import * as obsidian from 'obsidian';
                declare const app: obsidian.App;
                declare const el: HTMLElement;
                new obsidian.SecretComponent(app, el);
                obsidian.setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.11.1" }],
        },
        // An overloaded method: a call needs the version of the overload it
        // calls, and any other use only the earliest overload's. An overload
        // published before its @since needs only the version that first had it.
        {
            name: "a call to an older overload of an overloaded method is allowed",
            code: `
                import { App, Setting, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                declare const setting: Setting;
                app.workspace.duplicateLeaf(leaf); // in the 0.11.13 typings; the (leaf, leafType) form is 1.1.0
                app.workspace.duplicateLeaf(leaf, 'vertical');
                app.workspace.on('file-menu', () => {}); // 0.9.12
                app.workspace.on('quit', () => {}); // 0.10.2
                app.workspace?.on('layout-change', () => {});
                app.workspace.on?.('css-change', () => {});
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "an overload published before its @since is allowed from the version that first had it",
            code: `
                import { App, Editor, MarkdownView } from 'obsidian';
                declare const app: App;
                // @since 1.1.0 and 1.1.1 mark the widening of the view to
                // MarkdownView | MarkdownFileInfo; the events are in the
                // 0.12.6 and 0.12.17 typings.
                app.workspace.on('editor-menu', (menu, editor, info) => {});
                app.workspace.on('editor-change', (editor, info) => {});
                app.workspace.on('editor-paste', (evt, editor, info) => {});
                app.workspace.on('editor-drop', (evt, editor, info) => {});
                // A callback written for the old signature.
                app.workspace.on('editor-change', (editor: Editor, view: MarkdownView) => {});
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            name: "an overloaded method used without a call needs only its earliest overload",
            code: `
                import { App, Setting, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare function later(fn: unknown): void;
                const on = app.workspace.on;
                later(app.workspace.duplicateLeaf);
                app.workspace.on.call(app.workspace, 'files-menu', () => {});
                Setting.prototype.setName;
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a call that fits an older overload as well, or none, needs only the earliest",
            code: `
                import { App, Setting, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                declare const anything: any;
                declare const name: string;
                declare const menus: 'files-menu' | 'file-menu';
                app.workspace.on(anything, () => {});
                // @ts-expect-error no overload takes a string
                app.workspace.on(name, () => {});
                // @ts-expect-error no single overload takes the union
                app.workspace.on(menus, () => {});
                app.workspace.duplicateLeaf(leaf, anything);
                // @ts-expect-error neither overload takes a number
                app.workspace.duplicateLeaf(leaf, 42);
                const args = ['files-menu', () => {}] as const;
                app.workspace.on(...args);
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a Setting.setName() call with a string is allowed at 0.9.7",
            code: `
                import { Setting } from 'obsidian';
                declare const setting: Setting;
                declare const anything: any;
                setting.setName('Name').setName(anything);
            `,
            options: [{ minAppVersion: "0.9.7" }],
        },
        {
            name: "a call to an overload without @since is allowed",
            code: `
                import { App, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                // The deprecated (leaf, pushHistory, focus) form has no @since;
                // the (leaf, params) form is 0.16.3.
                app.workspace.setActiveLeaf(leaf, true, true);
                app.workspace.setActiveLeaf;
                // No overload takes a string: the checker falls back to the
                // first, 0.16.3, which the arguments do not fit.
                // @ts-expect-error
                app.workspace.setActiveLeaf(leaf, 'bad');
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            name: "a newer overload guarded by requireApiVersion is allowed",
            code: `
                import { App, requireApiVersion } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.4.10")) {
                    app.workspace.on('files-menu', () => {});
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
    ],
    invalid: [
        {
            name: "a call to a newer overload of Workspace.on is reported with that overload's version",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.workspace.on('files-menu', (menu, files) => {});
                app.workspace.on('url-menu', () => {});
                app.workspace.on('window-open', () => {});
                app.workspace.on('window-close', () => {});
                app.workspace?.on('files-menu', () => {});
                app.workspace.on?.('url-menu', () => {});
            `,
            options: [{ minAppVersion: "0.15.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 4, data: { qualifiedName: "Workspace.on", sinceVersion: "1.4.10", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.on", sinceVersion: "1.5.1", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Workspace.on", sinceVersion: "0.15.3", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "Workspace.on", sinceVersion: "0.15.3", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 8, data: { qualifiedName: "Workspace.on", sinceVersion: "1.4.10", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 9, data: { qualifiedName: "Workspace.on", sinceVersion: "1.5.1", minAppVersion: "0.15.0" } },
            ],
        },
        {
            name: "a string literal argument picks the overload, whatever the callback's type",
            code: `
                import { App, Menu, TFile } from 'obsidian';
                declare const app: App;
                // No overload fits these callbacks under strictFunctionTypes.
                app.workspace.on('files-menu', (menu: Menu, files: TFile[]) => {});
                const event = 'url-menu';
                app.workspace.on(event, (menu: Menu, url: number) => {});
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.on", sinceVersion: "1.4.10", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "Workspace.on", sinceVersion: "1.5.1", minAppVersion: "1.0.0" } },
            ],
        },
        {
            name: "an overload published before its @since is reported below the version that first had it",
            code: `
                import { App, Editor, MarkdownView } from 'obsidian';
                declare const app: App;
                app.workspace.on('editor-menu', () => {});
                app.workspace.on('editor-change', (editor: Editor, view: MarkdownView) => {});
                app.workspace.on('editor-paste', () => {});
                app.workspace.on('editor-drop', () => {});
            `,
            options: [{ minAppVersion: "0.12.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 4, data: { qualifiedName: "Workspace.on", sinceVersion: "0.12.6", minAppVersion: "0.12.0" } },
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.on", sinceVersion: "0.12.17", minAppVersion: "0.12.0" } },
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Workspace.on", sinceVersion: "0.12.17", minAppVersion: "0.12.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "Workspace.on", sinceVersion: "0.12.17", minAppVersion: "0.12.0" } },
            ],
        },
        {
            name: "a call to the newer duplicateLeaf() overload is reported with its version",
            code: `
                import { App, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                app.workspace.duplicateLeaf(leaf, 'tab');
                app.workspace.duplicateLeaf(leaf, true, 'vertical');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.duplicateLeaf", sinceVersion: "1.1.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Workspace.duplicateLeaf", sinceVersion: "1.1.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            name: "a Setting.setName() call with a DocumentFragment is reported at 0.12.16",
            code: `
                import { Setting } from 'obsidian';
                declare const setting: Setting;
                declare const fragment: DocumentFragment;
                setting.setName('Name');
                setting.setName(fragment);
            `,
            options: [{ minAppVersion: "0.12.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Setting.setName", sinceVersion: "0.12.16", minAppVersion: "0.12.0" } },
            ],
        },
        {
            name: "a call to the dated overload beside one without @since is reported",
            code: `
                import { App, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                app.workspace.setActiveLeaf(leaf, { focus: true });
                // Until 0.16.3 the typings had (leaf, pushHistory?, focus?),
                // which takes this call too: it needs only the first typings
                // with that signature, 0.11.13.
                app.workspace.setActiveLeaf(leaf);
            `,
            options: [{ minAppVersion: "0.15.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.setActiveLeaf", sinceVersion: "0.16.3", minAppVersion: "0.15.0" } },
            ],
        },
        {
            name: "a newer overload under a guard for an older version is reported",
            code: `
                import { App, requireApiVersion } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.4.10")) {
                    app.workspace.on('url-menu', () => {});
                    app.workspace.on('files-menu', () => {});
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.on", sinceVersion: "1.5.1", minAppVersion: "1.0.0" } },
            ],
        },
        {
            name: "Property access: App.renderContext requires 1.10.0",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Method call: App.isDarkMode requires 1.10.0",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.isDarkMode();
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Property access: App.secretStorage requires 1.11.4",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.secretStorage;
            `,
            options: [{ minAppVersion: "1.10.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.secretStorage", sinceVersion: "1.11.4", minAppVersion: "1.10.0" } }],
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
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "SecretComponent", sinceVersion: "1.11.1", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Class extension: AbstractInputSuggest requires 1.4.10",
            code: `
                import { AbstractInputSuggest } from 'obsidian';
                declare class MySuggest extends AbstractInputSuggest<string> {}
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "AbstractInputSuggest", sinceVersion: "1.4.10", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Function displayTooltip requires 1.8.7",
            code: `
                import { displayTooltip } from 'obsidian';
                declare const el: HTMLElement;
                displayTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "displayTooltip", sinceVersion: "1.8.7", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Global augmentation: Array.findLastIndex requires 1.4.4",
            code: `
                import 'obsidian';
                [1, 2, 3].findLastIndex((x) => x > 1);
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "Array.findLastIndex", sinceVersion: "1.4.4", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Function getFrontMatterInfo requires 1.5.7",
            code: `
                import { getFrontMatterInfo } from 'obsidian';
                getFrontMatterInfo('---\\nfoo: bar\\n---');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "getFrontMatterInfo", sinceVersion: "1.5.7", minAppVersion: "1.0.0" } }],
        },
        {
            name: "Function setTooltip requires 1.4.4",
            code: `
                import { setTooltip } from 'obsidian';
                declare const el: HTMLElement;
                setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "setTooltip", sinceVersion: "1.4.4", minAppVersion: "1.0.0" } }],
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
            errors: [
                { messageId: "apiNotAvailable", data: { qualifiedName: "AbstractInputSuggest", sinceVersion: "1.4.10", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", data: { qualifiedName: "AbstractInputSuggest.setValue", sinceVersion: "1.4.10", minAppVersion: "1.0.0" } },
            ],
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
            name: "a member is checked against its own @since: SecretStorage.setSecret requires 1.11.4",
            code: `
                import { SecretStorage } from 'obsidian';
                declare const storage: SecretStorage;
                storage.setSecret('key', 'value');
            `,
            options: [{ minAppVersion: "1.11.1" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "SecretStorage.setSecret", sinceVersion: "1.11.4", minAppVersion: "1.11.1" } }],
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
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "SettingPage", sinceVersion: "1.13.0", minAppVersion: "1.0.0" } }],
        },
        {
            name: "a member of a runtime-provided interface is still reported",
            code: `
                import type { BasesConfigFile } from 'obsidian';
                declare const config: BasesConfigFile;
                config.filters;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "BasesConfigFile.filters", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } }],
        },
        {
            // The repo's own manifest.json says 0.15.0.
            name: "without the option, minAppVersion is read from manifest.json",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.renderContext;
            `,
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "0.15.0" } }],
        },
        {
            name: "a minAppVersion with only a major version is read as x.0.0",
            code: `
                import { setTooltip } from 'obsidian';
                declare const el: HTMLElement;
                setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "setTooltip", sinceVersion: "1.4.4", minAppVersion: "1" } }],
        },
        {
            name: "a getter is reported: WorkspaceLeaf.isDeferred requires 1.7.2",
            code: `
                import { WorkspaceLeaf } from 'obsidian';
                declare const leaf: WorkspaceLeaf;
                leaf.isDeferred;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "WorkspaceLeaf.isDeferred", sinceVersion: "1.7.2", minAppVersion: "1.0.0" } }],
        },
        {
            // Workspace.on has an overload per event; the 'quit' one is @since 0.10.2.
            name: "an overloaded method is reported once",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.workspace.on('quit', () => {});
            `,
            options: [{ minAppVersion: "0.10.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "Workspace.on", sinceVersion: "0.10.2", minAppVersion: "0.10.0" } }],
        },
        {
            name: "a namespace import's class, superclass and function are each reported once",
            code: `
                import * as obsidian from 'obsidian';
                declare const app: obsidian.App;
                declare const el: HTMLElement;
                new obsidian.SecretComponent(app, el);
                abstract class Suggest extends obsidian.AbstractInputSuggest<string> {}
                obsidian.setTooltip(el, 'hello');
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", data: { qualifiedName: "SecretComponent", sinceVersion: "1.11.1", minAppVersion: "1.0.0" }, line: 5, column: 21, endColumn: 45 },
                { messageId: "apiNotAvailable", data: { qualifiedName: "AbstractInputSuggest", sinceVersion: "1.4.10", minAppVersion: "1.0.0" }, line: 6 },
                { messageId: "apiNotAvailable", data: { qualifiedName: "setTooltip", sinceVersion: "1.4.4", minAppVersion: "1.0.0" }, line: 7 },
            ],
        },
        // Each "not a guard" case below fails if it is treated as a guard.
        {
            name: "requireApiVersion with a spread argument is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const versions: "1.10.0"[];
                if (requireApiVersion(...versions)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a union of a version and a non-version is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const late: boolean;
                if (requireApiVersion(late ? "1.10.0" : "latest")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion with a constant that is not a full version is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const version = "1.10";
                if (requireApiVersion(version)) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "requireApiVersion without an argument is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion()) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "another function called with a version is not a guard",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                declare function isAtLeast(version: string): boolean;
                if (isAtLeast("1.10.0")) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "an undeclared identifier is not a guard",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                if (supported) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a binding destructured from a requireApiVersion call is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                const { valueOf } = requireApiVersion("1.10.0");
                if (valueOf) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "typeof and void of requireApiVersion are not guards",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (typeof requireApiVersion("1.10.0")) {
                    app.renderContext;
                }
                if (void requireApiVersion("1.10.0")) {
                    // never
                } else {
                    app.isDarkMode();
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            name: "an early exit on a ?? is not a guard: its left side may be false",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const flag: boolean | undefined;
                function f() {
                    if (flag ?? !requireApiVersion("1.10.0")) return;
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "consts that refer to each other are not a guard, and do not loop forever",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                const a: boolean = b;
                const b: boolean = a;
                if (a) {
                    app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "two requireApiVersion calls with || are not a guard when either is too low",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.11.4") || requireApiVersion("1.0.0")) {
                    app.secretStorage;
                }
                if (requireApiVersion("1.0.0") || requireApiVersion("1.11.4")) {
                    app.secretStorage;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", line: 5 }, { messageId: "apiNotAvailable", line: 8 }],
        },
        {
            name: "an exported function declaration after an early exit is hoisted and not guarded",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                if (!requireApiVersion("1.10.0")) throw new Error("Obsidian is too old");
                export function read() {
                    return app.renderContext;
                }
                export default function () {
                    return app.isDarkMode();
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", line: 6 }, { messageId: "apiNotAvailable", line: 9 }],
        },
        {
            name: "an early exit after the API, later in the same list, is not a guard",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare function log(): void;
                function f() {
                    log();
                    app.renderContext;
                    if (!requireApiVersion("1.10.0")) return;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a continue inside a switch outside a loop is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const mode: number;
                switch (mode) {
                    case 1:
                        if (!requireApiVersion("1.10.0")) continue;
                        app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "a jump out of a static block to a loop around its class is not an early exit",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare const items: string[];
                for (const item of items) {
                    class Loader {
                        static {
                            if (!requireApiVersion("1.10.0")) continue;
                            app.renderContext;
                        }
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
        {
            name: "an API in requireApiVersion's own argument is not guarded by it",
            code: `
                import { requireApiVersion, App } from 'obsidian';
                declare const app: App;
                declare function run(): void;
                requireApiVersion(app.isDarkMode() ? "1.10.0" : "1.10.0") && run();
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable" }],
        },
    ],
});

// Without the obsidian package in the program there is nothing to check
// against, and nothing to report.
new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/no-dom` },
    },
}).run("no-unsupported-api without the obsidian package", rule, {
    valid: [
        {
            name: "a program without obsidian.d.ts is not checked",
            code: `
                declare function requireApiVersion(version: string): boolean;
                declare const app: { renderContext: unknown; isDarkMode(): boolean };
                app.renderContext;
                app.isDarkMode();
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
    ],
    invalid: [],
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

    it("follows intersections, parentheses, readonly arrays, type literals and qualified names", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab { getSettingDefinitions(): readonly (A & B)[]; }
                export interface A { nested: { deep: C }; }
                export interface B { qualified: ns.D; }
                export interface C { x: string; }
                export interface D { y: string; }
            `),
            ["A", "B", "C", "D"]
        );
    });

    it("follows the type arguments of an extends clause", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab { getSettingDefinitions(): Item[]; }
                export interface Item extends Base<Arg> {}
                export interface Base<T> { value: T; }
                export interface Arg { x: number; }
            `),
            ["Arg", "Base", "Item"]
        );
    });

    it("reads the declarations inside a declare module block", () => {
        assert.deepStrictEqual(
            family(`
                declare module "obsidian" {
                    export abstract class SettingTab { getSettingDefinitions(): Item[]; }
                    export interface Item { control: Control; }
                    export interface Control { key: string; }
                }
            `),
            ["Control", "Item"]
        );
    });

    it("starts only from getSettingDefinitions() and follows only properties", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab {
                    getSettingDefinitions(): Item[];
                    getOther(): Other;
                }
                export interface Item { make(): Made; }
                export interface Other { x: string; }
                export interface Made { y: string; }
            `),
            ["Item"]
        );
    });

    it("stops at a name that is a class as well as an interface", () => {
        assert.deepStrictEqual(
            family(`
                export abstract class SettingTab { getSettingDefinitions(): Item[]; }
                export interface Item { owner: Merged; }
                export interface Merged { extra: Extra; }
                export class Merged {}
                export interface Extra { x: string; }
            `),
            ["Item"]
        );
    });

    it("is empty for obsidian types without getSettingDefinitions()", () => {
        assert.deepStrictEqual(family(`export interface CachedMetadata { links?: string[]; }`), []);
    });
});

// Overloads the installed obsidian.d.ts does not have, from a project of its own
// whose obsidian package declares them.
describe("no-unsupported-api overload resolution", function () {
    this.timeout(60000);
    let dir: string;

    before(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "no-unsupported-api-overloads-"));
        const obsidian = path.join(dir, "node_modules", "obsidian");
        fs.mkdirSync(obsidian, { recursive: true });
        fs.writeFileSync(
            path.join(obsidian, "package.json"),
            JSON.stringify({ name: "obsidian", version: "0.0.0-overloads", types: "obsidian.d.ts" }),
        );
        fs.writeFileSync(path.join(obsidian, "obsidian.d.ts"), `
            export class Thing {
                /** @since 1.5.0 */
                run(name: string): void;
                /** @since 1.0.0 */
                run(name: string | number): void;
                /** @since 1.5.0 */
                mode(value: "a"): void;
                /** @since 1.0.0 */
                mode(value: "b"): void;
                /** @since 1.2.0 */
                pick<T>(value: T): T;
                /** @since 1.6.0 */
                pick<T>(value: T, extra: string): T;
                /** @since 1.5.0 */
                on(name: "x", callback: (a: string, b: number) => void): void;
                /** @since 1.0.0 */
                on(name: "x", callback: (a: string) => void): void;
                /** @since 1.5.0 */
                listen(callback: (a: string) => void): void;
                /** @since 1.0.0 */
                listen(callback: (a: number) => void): void;
                /** @since 1.5.0 */
                open(options: { onOpen: (a: string) => void }): void;
                /** @since 1.0.0 */
                open(options: { onOpen: (a: number) => void }): void;
                /** @since 1.5.0 */
                emit(name: "x", value: number): void;
                /** @since 1.0.0 */
                emit(name: string, value: number): void;
                /** @since 1.5.0 */
                send(name: "x", value: number): void;
                /** @since 1.0.0 */
                send(name: "y", value: number): void;
            }
        `);
        fs.writeFileSync(path.join(dir, "tsconfig.json"), JSON.stringify({
            compilerOptions: { strict: true, target: "es2022", module: "commonjs", lib: ["es2022"], types: [] },
            include: ["plugin.ts"],
        }));
    });

    after(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    const lint = (code: string) => {
        fs.writeFileSync(path.join(dir, "plugin.ts"), code);
        return new Linter({ cwd: dir }).verify(
            code,
            [{
                files: ["**/*.ts"],
                languageOptions: {
                    parser: tseslint.parser,
                    parserOptions: { project: "./tsconfig.json", tsconfigRootDir: dir, disallowAutomaticSingleRunInference: true },
                },
                plugins: { obsidianmd: { rules: { "no-unsupported-api": rule as never } } },
                rules: { "obsidianmd/no-unsupported-api": ["error", { minAppVersion: "1.0.0" }] },
            }],
            path.join(dir, "plugin.ts"),
        ).map((m) => `${m.line}: ${m.message}`);
    };

    it("needs the earliest version for a call that fits an older overload too, fits none, or is generic", () => {
        assert.deepStrictEqual(lint([
            `import { Thing } from "obsidian";`,
            `declare const thing: Thing;`,
            `declare const text: string;`,
            `const strict = (a: string, b: number) => {};`,
            `thing.run("x");`, // fits both: 1.0.0
            `thing.run(1);`,
            `thing.mode("a");`, // 1.5.0
            `thing.mode("b");`,
            `// @ts-expect-error`,
            `thing.mode(text);`, // fits neither; the checker falls back to the 1.5.0 one
            `thing.pick(1, "x");`, // generic: the earliest, 1.2.0
            `thing.on("x", (a) => {});`, // fits both
            `thing.on("x", strict);`, // fits the 1.5.0 one only
            // `a` is a string from the 1.5.0 overload, and would be a number
            // from the 1.0.0 one, which the call fits as well.
            `thing.listen((a) => {});`,
            `thing.listen((a: string) => {});`, // fits the 1.5.0 one only
            `thing.open({ onOpen: (a) => {} });`, // the same, as a property
            `thing.open({ onOpen: (a: string) => {} });`,
            // The literal picks the overload only where every overload has a
            // literal there: emit("x") fits the 1.0.0 string one as well.
            `thing.emit("x", 1);`,
            `// @ts-expect-error`,
            `thing.send("x", "not a number");`, // the literal decides: 1.5.0
        ].join("\n")), [
            "7: 'Thing.mode' requires Obsidian v1.5.0, but minAppVersion is 1.0.0.",
            "11: 'Thing.pick' requires Obsidian v1.2.0, but minAppVersion is 1.0.0.",
            "13: 'Thing.on' requires Obsidian v1.5.0, but minAppVersion is 1.0.0.",
            "15: 'Thing.listen' requires Obsidian v1.5.0, but minAppVersion is 1.0.0.",
            "17: 'Thing.open' requires Obsidian v1.5.0, but minAppVersion is 1.0.0.",
            "20: 'Thing.send' requires Obsidian v1.5.0, but minAppVersion is 1.0.0.",
        ]);
    });
});
