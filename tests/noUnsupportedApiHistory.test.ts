import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../lib/rules/noUnsupportedApi.js";

const ruleTester = new RuleTester();

// The @since of many members names the release that last changed them, and
// the published typings had them earlier (obsidianDeclarationHistory.ts). The
// shapes below come from the 0.5.0 sweep of community plugins.
ruleTester.run("no-unsupported-api: the first typings that declare a member", rule, {
    valid: [
        {
            // Older than their @since, these are in the 0.9.7 typings, the
            // first in the obsidian-api history, which cannot tell how much
            // older they are: a plugin with a lower minAppVersion is not told
            // it needs 0.9.7.
            name: "members in the oldest typings, below that version",
            code: `
                import { Workspace } from 'obsidian';
                declare const workspace: Workspace;
                workspace.getLeaf(false);
                const duplicate = workspace.duplicateLeaf;
            `,
            options: [{ minAppVersion: "0.9.0" }],
        },
        {
            // setDisabled @since 1.2.3, Menu.addItem 0.15.3, MenuItem.setIcon
            // 0.16.2: all in the 0.11.13 typings, as the calls use them.
            name: "a member with the same signature in older typings than its @since",
            code: `
                import { Menu, Setting } from 'obsidian';
                declare const el: HTMLElement;
                declare const menu: Menu;
                new Setting(el).addButton((b) => b.setDisabled(true));
                menu.addItem((item) => item.setIcon("trash").setTitle("Delete"));
                menu.addSeparator();
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            // The 0.11.13 typings had getLeaf(newLeaf?: boolean), which takes
            // these calls; PaneType came in 0.16.0.
            name: "getLeaf() with a boolean or no argument",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                declare const split: boolean;
                app.workspace.getLeaf(false);
                app.workspace.getLeaf(split);
                app.workspace.getLeaf();
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            // revealLeaf returned void before 1.7.2, and a Promise since.
            name: "revealLeaf() whose result is unused or only awaited",
            code: `
                import { App, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                async function show() {
                    app.workspace.revealLeaf(leaf);
                    await app.workspace.revealLeaf(leaf);
                    void app.workspace.revealLeaf(leaf);
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // onClick took (evt: MouseEvent) => any until 1.10.0 typed the
            // result: any callback still works. setTooltip(tooltip) and
            // setIcon(icon) only gained an options parameter and IconName.
            name: "button callbacks, tooltips and icons",
            code: `
                import { Setting } from 'obsidian';
                declare const el: HTMLElement;
                declare function save(): Promise<void>;
                new Setting(el)
                    .setName("Name")
                    .addButton((button) =>
                        button
                            .setIcon("trash")
                            .setTooltip("Delete")
                            .onClick(async (evt) => {
                                evt.preventDefault();
                                await save();
                            }),
                    )
                    .addExtraButton((button) => button.setTooltip("Reset").onClick(() => save()));
            `,
            options: [{ minAppVersion: "0.12.0" }],
        },
        {
            // processFrontMatter is first in the 1.1.1 typings, @since 1.4.4,
            // which added the options parameter.
            name: "processFrontMatter() without options",
            code: `
                import { App, TFile } from 'obsidian';
                declare const app: App;
                declare const file: TFile;
                async function tag() {
                    await app.fileManager.processFrontMatter(file, (frontmatter) => {
                        frontmatter.tags = ["a"];
                    });
                }
            `,
            options: [{ minAppVersion: "1.2.8" }],
        },
        {
            // Vault.createFolder returned Promise<void> until 1.4.0.
            name: "createFolder() whose result is not read",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                async function make() {
                    await app.vault.createFolder("notes");
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // Editor.transaction(tx) is @since 0.13.0, and the 0.12.0 typings
            // have it with the same EditorTransaction.
            name: "Editor.transaction() without an origin",
            code: `
                import { Editor } from 'obsidian';
                declare const editor: Editor;
                editor.transaction({ changes: [{ from: { line: 0, ch: 0 }, text: "x" }] });
            `,
            options: [{ minAppVersion: "0.12.0" }],
        },
        {
            // showAtPosition took a Point until 1.1.1 made it a
            // MenuPositionDef, and Point means the same today.
            name: "an argument of a named type the older signature took",
            code: `
                import { Menu, MenuPositionDef } from 'obsidian';
                declare const menu: Menu;
                declare const evt: MouseEvent;
                declare const position: MenuPositionDef;
                menu.showAtPosition({ x: evt.pageX, y: evt.pageY });
                menu.showAtPosition(position);
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // openLinkText(linktext, sourcePath, newLeaf?: boolean, …) until
            // 0.16.0 took a PaneType too.
            name: "openLinkText() without a PaneType",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.workspace.openLinkText("Note", "", false);
                void app.workspace.openLinkText("Note", "");
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            name: "a callback that leaves out the parameter an older release did not pass",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.workspace.on("editor-change", (editor) => editor.getValue());
            `,
            options: [{ minAppVersion: "0.12.17" }],
        },
        {
            // duplicateLeaf(leaf) is in the 0.9.7 typings, returning
            // Promise<void> until 0.13.8: a call that discards the result, and
            // the method as a value, work on those versions too.
            name: "duplicateLeaf() with its result unused",
            code: `
                import { Workspace, WorkspaceLeaf } from 'obsidian';
                declare const workspace: Workspace;
                declare const leaf: WorkspaceLeaf;
                async function split() {
                    await workspace.duplicateLeaf(leaf);
                    void workspace.duplicateLeaf(leaf, "vertical");
                    workspace.duplicateLeaf(leaf);
                    const later = workspace.duplicateLeaf;
                }
            `,
            options: [{ minAppVersion: "0.12.0" }],
        },
        {
            // Editor is first in the 0.11.7 typings (see COMMIT_VERSIONS in
            // scripts/obsidian-overload-history.ts).
            name: "Editor at 0.11.7",
            code: `
                import { Editor } from 'obsidian';
                declare const editor: Editor;
                editor.getValue();
                editor.replaceSelection("x");
            `,
            options: [{ minAppVersion: "0.11.7" }],
        },
    ],
    invalid: [
        {
            name: "duplicateLeaf() with its result used, below 0.13.8",
            code: `
                import { Workspace, WorkspaceLeaf } from 'obsidian';
                declare const workspace: Workspace;
                declare const leaf: WorkspaceLeaf;
                async function split() {
                    const copy = await workspace.duplicateLeaf(leaf);
                    (await workspace.duplicateLeaf(leaf, "vertical")).detach();
                    return workspace.duplicateLeaf(leaf);
                }
            `,
            options: [{ minAppVersion: "0.12.0" }],
            errors: [
                { messageId: "apiNotAvailableRaise", line: 6, data: { qualifiedName: "Workspace.duplicateLeaf", sinceVersion: "0.13.8", minAppVersion: "0.12.0" } },
                { messageId: "apiNotAvailableRaise", line: 7, data: { qualifiedName: "Workspace.duplicateLeaf", sinceVersion: "0.13.8", minAppVersion: "0.12.0" } },
                { messageId: "apiNotAvailableRaise", line: 8, data: { qualifiedName: "Workspace.duplicateLeaf", sinceVersion: "0.13.8", minAppVersion: "0.12.0" } },
            ],
        },
        {
            name: "Editor below 0.11.7",
            code: `
                import { Editor } from 'obsidian';
                declare const editor: Editor;
                editor.getValue();
            `,
            options: [{ minAppVersion: "0.11.0" }],
            errors: [
                { messageId: "apiNotAvailableCheck", line: 4, data: { qualifiedName: "Editor.getValue", sinceVersion: "0.11.7", minAppVersion: "0.11.0" } },
            ],
        },
        {
            // Older than their @since, and newer than the 0.9.7 typings: each
            // needs the first typings in the obsidian-api history that have it.
            name: "members first declared after the oldest typings, below that version",
            code: `
                import { BaseComponent, Menu } from 'obsidian';
                declare const component: BaseComponent;
                declare const menu: Menu;
                component.setDisabled(true);
                menu.addItem((item) => item.setIcon("trash"));
            `,
            options: [{ minAppVersion: "0.9.11" }],
            errors: [
                { messageId: "apiNotAvailableCheck", line: 5, data: { qualifiedName: "BaseComponent.setDisabled", sinceVersion: "0.10.3", minAppVersion: "0.9.11" } },
                { messageId: "apiNotAvailableCheck", line: 6, data: { qualifiedName: "Menu.addItem", sinceVersion: "0.9.12", minAppVersion: "0.9.11" } },
                { messageId: "apiNotAvailableCheck", line: 6, data: { qualifiedName: "MenuItem.setIcon", sinceVersion: "0.9.12", minAppVersion: "0.9.11" } },
            ],
        },
        {
            // obsidian-weread-plugin: `getLeaf('tab')` needs the PaneType
            // overload, first in the 0.16.0 typings.
            name: "getLeaf() with a PaneType",
            code: `
                import { App, PaneType } from 'obsidian';
                declare const app: App;
                declare const type: PaneType | boolean;
                app.workspace.getLeaf('tab');
                app.workspace.getLeaf(type);
            `,
            options: [{ minAppVersion: "0.14.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.getLeaf", sinceVersion: "0.16.0", minAppVersion: "0.14.0" } },
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Workspace.getLeaf", sinceVersion: "0.16.0", minAppVersion: "0.14.0" } },
            ],
        },
        {
            name: "a result whose type changed, read",
            code: `
                import { App, WorkspaceLeaf } from 'obsidian';
                declare const app: App;
                declare const leaf: WorkspaceLeaf;
                async function make() {
                    app.workspace.revealLeaf(leaf).then(() => {});
                    const folder = await app.vault.createFolder("notes");
                    return folder.children;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "Workspace.revealLeaf", sinceVersion: "1.7.2", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "Vault.createFolder", sinceVersion: "1.4.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            // The options parameter came in 1.1.1 (setTooltip) and 1.4.4
            // (processFrontMatter): a call that passes it needs that.
            name: "a parameter the older typings did not have",
            code: `
                import { App, ExtraButtonComponent, TFile } from 'obsidian';
                declare const app: App;
                declare const button: ExtraButtonComponent;
                declare const file: TFile;
                button.setTooltip("Reset", { placement: "top" });
                app.fileManager.processFrontMatter(file, () => {}, { mtime: 0 });
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "ExtraButtonComponent.setTooltip", sinceVersion: "1.1.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "FileManager.processFrontMatter", sinceVersion: "1.4.4", minAppVersion: "1.0.0" } },
            ],
        },
        {
            // OpenViewState gained members in 0.14.5 and 1.6.6, so the
            // state argument cannot be told to mean the same before 0.16.0.
            name: "an argument of a named type that meant something else then",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.workspace.openLinkText("Note", "", false, { active: true });
                app.workspace.openLinkText("Note", "", "tab");
            `,
            options: [{ minAppVersion: "0.15.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 4, data: { qualifiedName: "Workspace.openLinkText", sinceVersion: "0.16.0", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.openLinkText", sinceVersion: "0.16.0", minAppVersion: "0.15.0" } },
            ],
        },
        {
            // Whoever calls it later may read its result, the Promise it
            // returns since 1.7.2.
            name: "a method passed as a value needs the signature it has now",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                const reveal = app.workspace.revealLeaf;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "Workspace.revealLeaf", sinceVersion: "1.7.2", minAppVersion: "1.0.0" } }],
        },
        {
            name: "a spread argument",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                declare const args: [boolean];
                app.workspace.getLeaf(...args);
            `,
            options: [{ minAppVersion: "0.15.0" }],
            errors: [{ messageId: "apiNotAvailable", data: { qualifiedName: "Workspace.getLeaf", sinceVersion: "0.16.0", minAppVersion: "0.15.0" } }],
        },
    ],
});

ruleTester.run("no-unsupported-api: feature checks, overrides and Plugin.settings", rule, {
    valid: [
        {
            // obsidian-paste-image-rename, obsidian-douban-plugin
            name: "typeof, in and truthiness checks for a member that is new",
            code: `
                import { App, getLanguage } from 'obsidian';
                declare const app: App;
                if (typeof app.isDarkMode === 'function') {
                    app.isDarkMode();
                }
                const language = typeof getLanguage === 'function' ? getLanguage() : '';
                if ('secretStorage' in app) {
                    app.secretStorage;
                }
                app.renderContext !== undefined && app.renderContext;
                if (app.isDarkMode) app.isDarkMode();
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "an early exit on a failed feature check",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                function dark(): boolean {
                    if (typeof app.isDarkMode !== 'function') return false;
                    return app.isDarkMode();
                }
                function context() {
                    if (app.renderContext == null) return;
                    return app.renderContext;
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a feature check of a member of a new member",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                if (typeof app.secretStorage?.setSecret === 'function') {
                    app.secretStorage.setSecret("key", "value");
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "an optional call of a new method",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                app.isDarkMode?.();
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // typewriter-mode: "Only invoked by Obsidian >= 1.13.0".
            name: "a getSettingDefinitions() override, which only 1.13 calls",
            code: `
                import { App, Plugin, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
                class Tab extends PluginSettingTab {
                    constructor(app: App, plugin: Plugin) {
                        super(app, plugin);
                    }
                    display(): void {}
                    getSettingDefinitions(): SettingDefinitionItem[] {
                        this.refreshDomState();
                        return [];
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // obsidian-epub-plugin
            name: "super.onPaneMenu() in an onPaneMenu() override",
            code: `
                import { ItemView, Menu } from 'obsidian';
                abstract class EpubView extends ItemView {
                    onPaneMenu(menu: Menu, source: string): void {
                        super.onPaneMenu(menu, source);
                    }
                }
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            // pdf-plus: `this.hoverEditorPlugin?.settings`.
            name: "Plugin.settings, which plugins assign themselves",
            code: `
                import { Plugin } from 'obsidian';
                declare const other: Plugin | undefined;
                class MyPlugin extends Plugin {
                    async onload() {
                        this.settings = Object.assign({}, await this.loadData());
                        other?.settings;
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // Reading a missing member gives undefined, which `?.`, `??` and
            // `||` all handle, and the rest of the chain runs only where the
            // member exists, so on a release that has it.
            name: "an optional access or a fallback off a newer member",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                const secret = app.secretStorage?.getSecret("token");
                const context = app.renderContext ?? null;
                const other = app.renderContext || null;
                const document2 = window.activeDocument ?? document;
                app.isDarkMode?.call(app);
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "requireApiVersion() imported under another name, or from a namespace import",
            code: `
                import * as obsidian from 'obsidian';
                import { App, requireApiVersion as rav } from 'obsidian';
                declare const app: App;
                if (obsidian.requireApiVersion("1.10.0")) {
                    app.isDarkMode();
                }
                if (rav("1.10.0")) {
                    app.isDarkMode();
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            name: "a check compared with true, a feature check in a const, and a readonly field holding a check",
            code: `
                import { App, requireApiVersion } from 'obsidian';
                declare const app: App;
                if (requireApiVersion("1.10.0") === true) {
                    app.isDarkMode();
                }
                if (requireApiVersion("1.10.0") !== false) {
                    app.isDarkMode();
                }
                const canTell = typeof app.isDarkMode === "function";
                if (canTell) {
                    app.isDarkMode();
                }
                class Theme {
                    private readonly hasDarkMode = requireApiVersion("1.10.0");
                    constructor(private app: App) {}
                    isDark() {
                        return this.hasDarkMode && this.app.isDarkMode();
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
        },
        {
            // typeof is the one test of a global that cannot throw.
            name: "typeof tests a global the app declares",
            code: `
                import 'obsidian';
                const doc = typeof activeDocument !== "undefined" ? activeDocument : document;
            `,
            options: [{ minAppVersion: "0.14.0" }],
        },
    ],
    invalid: [
        {
            // Reading a global the app does not declare throws a
            // ReferenceError, so only typeof tests it.
            name: "a global the app declares, tested other than with typeof",
            code: `
                import 'obsidian';
                const a = activeDocument || document;
                if (activeDocument) {
                    console.log("popout");
                }
                const b = activeDocument != null ? activeDocument : document;
                const c = activeDocument?.body;
            `,
            options: [{ minAppVersion: "0.14.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 3, data: { qualifiedName: "activeDocument", sinceVersion: "0.15.0", minAppVersion: "0.14.0" } },
                { messageId: "apiNotAvailable", line: 4, data: { qualifiedName: "activeDocument", sinceVersion: "0.15.0", minAppVersion: "0.14.0" } },
                { messageId: "apiNotAvailable", line: 7, column: 27, data: { qualifiedName: "activeDocument", sinceVersion: "0.15.0", minAppVersion: "0.14.0" } },
                { messageId: "apiNotAvailable", line: 7, column: 52, data: { qualifiedName: "activeDocument", sinceVersion: "0.15.0", minAppVersion: "0.14.0" } },
                { messageId: "apiNotAvailable", line: 8, data: { qualifiedName: "activeDocument", sinceVersion: "0.15.0", minAppVersion: "0.14.0" } },
            ],
        },
        {
            name: "an optional call of a global function the app declares",
            code: `
                import 'obsidian';
                const icon = createSvg?.("svg");
                const checked = typeof createSvg === "function" ? createSvg("svg") : null;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 3, data: { qualifiedName: "createSvg", sinceVersion: "1.1.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            // A field the class may assign again, or one that is not
            // readonly, may no longer hold the check's result.
            name: "a field holding a check that may change",
            code: `
                import { App, requireApiVersion } from 'obsidian';
                class Theme {
                    private hasDarkMode = requireApiVersion("1.10.0");
                    private readonly canDark = requireApiVersion("1.10.0");
                    constructor(private app: App) {
                        this.canDark = true;
                    }
                    isDark() {
                        return this.hasDarkMode && this.app.isDarkMode();
                    }
                    canBeDark() {
                        return this.canDark && this.app.isDarkMode();
                    }
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 10, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 13, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            name: "a feature check of another member, or of the member in a branch that runs without it",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                if (typeof app.isDarkMode === 'function') {
                    app.renderContext;
                }
                if (typeof app.isDarkMode !== 'function') {
                    app.isDarkMode();
                }
                if (app.renderContext !== null) {
                    app.renderContext;
                }
                typeof app.isDarkMode === 'function' || app.isDarkMode();
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 8, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 11, data: { qualifiedName: "App.renderContext", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
                { messageId: "apiNotAvailable", line: 13, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.0.0" } },
            ],
        },
        {
            // Without ?. reading setSecret throws where secretStorage is missing.
            name: "a feature check that reads a member of a new member without optional chaining",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                if (typeof app.secretStorage.setSecret === 'function') {
                    app.secretStorage.setSecret("key", "value");
                }
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 4, data: { qualifiedName: "App.secretStorage", sinceVersion: "1.11.4", minAppVersion: "1.0.0" } },
            ],
        },
        {
            // getLeaf exists from 0.11.13 on; the check does not prove the
            // PaneType signature.
            name: "a feature check for a call that needs a newer signature",
            code: `
                import { App } from 'obsidian';
                declare const app: App;
                if (typeof app.workspace.getLeaf === 'function') {
                    app.workspace.getLeaf('tab');
                }
                app.workspace.getLeaf?.('tab');
            `,
            options: [{ minAppVersion: "0.15.0" }],
            errors: [
                { messageId: "apiNotAvailable", line: 5, data: { qualifiedName: "Workspace.getLeaf", sinceVersion: "0.16.0", minAppVersion: "0.15.0" } },
                { messageId: "apiNotAvailable", line: 7, data: { qualifiedName: "Workspace.getLeaf", sinceVersion: "0.16.0", minAppVersion: "0.15.0" } },
            ],
        },
        {
            // The plugin may call its own override on an older Obsidian.
            name: "a getSettingDefinitions() override in a file that calls it",
            code: `
                import { PluginSettingTab, SettingDefinitionItem } from 'obsidian';
                abstract class Tab extends PluginSettingTab {
                    display(): void {
                        render(this.getSettingDefinitions());
                    }
                    getSettingDefinitions(): SettingDefinitionItem[] {
                        this.refreshDomState();
                        return [];
                    }
                }
                declare function render(items: SettingDefinitionItem[]): void;
            `,
            options: [{ minAppVersion: "1.0.0" }],
            errors: [{ messageId: "apiNotAvailable", line: 8, data: { qualifiedName: "SettingTab.refreshDomState", sinceVersion: "1.13.0", minAppVersion: "1.0.0" } }],
        },
        {
            name: "an override of a method the plugin calls, and a method that is not an override",
            code: `
                import { AbstractInputSuggest, App } from 'obsidian';
                declare const app: App;
                abstract class Suggest extends AbstractInputSuggest<string> {
                    setValue(value: string): void {
                        app.isDarkMode();
                    }
                }
                class Other {
                    getSettingDefinitions() {
                        app.isDarkMode();
                    }
                }
            `,
            options: [{ minAppVersion: "1.4.10" }],
            errors: [
                { messageId: "apiNotAvailable", line: 6, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.4.10" } },
                { messageId: "apiNotAvailable", line: 11, data: { qualifiedName: "App.isDarkMode", sinceVersion: "1.10.0", minAppVersion: "1.4.10" } },
            ],
        },
    ],
});
