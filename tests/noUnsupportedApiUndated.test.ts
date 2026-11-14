import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../lib/rules/noUnsupportedApi.js";

const ruleTester = new RuleTester();

const error = (
    line: number,
    qualifiedName: string,
    sinceVersion: string,
    minAppVersion: string,
    messageId: "apiNotAvailable" | "apiNotAvailableCheck" | "apiNotAvailableRaise" = "apiNotAvailable",
) => ({
    messageId,
    line,
    data: { qualifiedName, sinceVersion, minAppVersion },
});

// Declarations without @since need the first typings in the obsidian-api
// history that declare them (UNDATED_DECLARATIONS in obsidianDeclarationHistory.ts).
ruleTester.run("no-unsupported-api: declarations without @since", rule, {
    valid: [
        {
            name: "at or above the first typings that declare them",
            code: `
                import { App } from 'obsidian';
                declare const el: HTMLElement;
                declare const evt: MouseEvent;
                el.setCssProps({ "--width": "1px" });
                el.setCssStyles({ display: "none" });
                evt.targetNode?.instanceOf(HTMLElement);
                activeDocument.body.append(createSvg("svg"));
                activeWindow.setTimeout(() => {}, 1);
                void nextFrame();
                [1, 2].unique();
            `,
            options: [{ minAppVersion: "1.1.7" }],
        },
        {
            name: "a member the oldest typings already declare",
            code: `
                import 'obsidian';
                declare const el: HTMLElement;
                el.empty();
                el.createDiv({ cls: "x" });
            `,
            options: [{ minAppVersion: "0.10.0" }],
        },
        {
            name: "the plugin's own declarations of the same names",
            code: `
                import 'obsidian';
                function sleep(ms: number) {
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }
                const activeDocument = document;
                declare const box: { innerWidth: number };
                declare const either: HTMLElement | { innerWidth: number };
                void sleep(10);
                activeDocument.body;
                box.innerWidth;
                either.innerWidth;
            `,
            options: [{ minAppVersion: "0.12.0" }],
        },
        {
            name: "lib.dom members, types and options the plugin supplies",
            code: `
                import 'obsidian';
                declare const el: HTMLElement;
                declare const info: DomElementInfo;
                el.closest("div");
                el.innerText;
                let doc: typeof activeDocument;
                info.placeholder;
            `,
            options: [{ minAppVersion: "0.10.0" }],
        },
        {
            name: "guards",
            code: `
                import { requireApiVersion } from 'obsidian';
                declare const el: HTMLElement;
                if (typeof el.setCssProps === "function") {
                    el.setCssProps({ "--x": "1" });
                }
                const doc = typeof activeDocument !== "undefined" ? activeDocument : document;
                if (requireApiVersion("1.2.3")) {
                    void nextFrame();
                }
                el.setCssStyles?.({ display: "none" });
            `,
            options: [{ minAppVersion: "0.14.0" }],
        },
        {
            // FileView.navigation is first in the 0.15.1 typings, View.navigation in
            // the oldest; WorkspaceLeaf.parent, Modal.scope and PopoverSuggest.app
            // are first in typings later than their classes.
            name: "inherited members and fields of Obsidian's classes",
            code: `
                import { EditorSuggest, FileView, Modal, WorkspaceLeaf } from 'obsidian';
                declare const view: FileView;
                declare const leaf: WorkspaceLeaf;
                declare const modal: Modal;
                abstract class Suggest extends EditorSuggest<string> {
                    vault() {
                        return this.app.vault;
                    }
                }
                view.navigation;
                leaf.parent;
                modal.scope.register([], "Enter", () => false);
            `,
            options: [{ minAppVersion: "0.12.17" }],
        },
        {
            // Scope.register's modifiers take null from the 1.7.2 typings on; the
            // older Modifier[] took it too without strictNullChecks.
            name: "null where older typings left it out",
            code: `
                import { Modal } from 'obsidian';
                declare const modal: Modal;
                modal.scope.register(null, null, () => false);
            `,
            options: [{ minAppVersion: "0.15.0" }],
        },
        {
            // Node.doc is first in the 0.15.3 typings.
            name: "a write to a property",
            code: `
                import 'obsidian';
                declare const el: HTMLElement;
                el.doc = document;
            `,
            options: [{ minAppVersion: "0.14.0" }],
        },
    ],
    invalid: [
        {
            name: "DOM helpers newer than minAppVersion",
            code: `
                import 'obsidian';
                declare const el: HTMLElement;
                declare const evt: MouseEvent;
                el.setCssProps({ "--width": "1px" });
                evt.targetNode;
                el.instanceOf(HTMLElement);
                createSvg("svg");
                void nextFrame();
                el.innerWidth;
            `,
            options: [{ minAppVersion: "0.14.0" }],
            errors: [
                error(5, "HTMLElement.setCssProps", "1.1.7", "0.14.0"),
                error(6, "UIEvent.targetNode", "0.15.3", "0.14.0"),
                error(7, "Node.instanceOf", "0.15.3", "0.14.0"),
                error(8, "createSvg", "1.1.0", "0.14.0"),
                error(9, "nextFrame", "1.1.7", "0.14.0"),
                error(10, "HTMLElement.innerWidth", "0.15.0", "0.14.0"),
            ],
        },
        {
            name: "globals and module variables",
            code: `
                import { apiVersion } from 'obsidian';
                activeDocument.body;
                window.activeWindow;
                const { body } = activeDocument;
                console.log(apiVersion);
            `,
            options: [{ minAppVersion: "0.13.0" }],
            errors: [
                error(3, "activeDocument", "0.15.0", "0.13.0", "apiNotAvailableCheck"),
                error(4, "Window.activeWindow", "0.15.0", "0.13.0", "apiNotAvailableCheck"),
                error(5, "activeDocument", "0.15.0", "0.13.0", "apiNotAvailableCheck"),
                error(6, "apiVersion", "0.13.21", "0.13.0", "apiNotAvailableCheck"),
            ],
        },
        {
            name: "built-in extensions and global functions",
            code: `
                import 'obsidian';
                [1, 2].unique();
                Array.combine([[1], [2]]);
                void sleep(100);
            `,
            options: [{ minAppVersion: "0.14.0" }],
            errors: [
                error(3, "Array.unique", "0.14.4", "0.14.0"),
                error(4, "ArrayConstructor.combine", "1.1.0", "0.14.0"),
                error(5, "sleep", "0.14.3", "0.14.0"),
            ],
        },
        {
            // requestUrl took only a RequestUrlParam until 0.16.0 took a URL
            // string. It is first in the 0.13.26 typings, whose RequestUrlParam
            // has `url` and RequestUrlResponse `json`: the history has only
            // hashes of those types, which changed since, so that cannot be
            // told, and without a @since the first typings decide.
            name: "a class member and a module function",
            code: `
                import { Modal, App, requestUrl } from 'obsidian';
                class M extends Modal {
                    onOpen() {
                        this.setTitle("Title");
                    }
                }
                void requestUrl("https://example.com");
                async function fetchJson() {
                    const response = await requestUrl({ url: "https://example.com" });
                    return response.json;
                }
            `,
            options: [{ minAppVersion: "0.12.0" }],
            errors: [
                error(5, "Modal.setTitle", "1.5.1", "0.12.0", "apiNotAvailableCheck"),
                error(8, "requestUrl", "0.16.0", "0.12.0", "apiNotAvailableRaise"),
                error(10, "requestUrl", "0.13.26", "0.12.0", "apiNotAvailableCheck"),
            ],
        },
    ],
});
