import { RuleTester } from "@typescript-eslint/rule-tester";
import noPluginAsComponentRule from "../lib/rules/noPluginAsComponent.js";

const ruleTester = new RuleTester();

// A more accurate mock of the Obsidian API for testing purposes.
const MOCK_API = `
    declare class App {}
    declare class HTMLElement {}
    declare class Component { onunload(): void; }
    declare class Plugin extends Component { }
    declare class View extends Component { }
    declare class Modal { constructor(app: App); } // Modal does not extend Component

    declare class MarkdownRenderer {
        static renderInto(
            app: App,
            markdown: string,
            el: HTMLElement,
            sourcePath: string,
            component: Component
        ): Promise<void>;
        static render(
            app: App,
            markdown: string,
            el: HTMLElement,
            sourcePath: string,
            component: Component
        ): Promise<void>;
    }
`;

ruleTester.run("no-plugin-as-component", noPluginAsComponentRule, {
    valid: [
        {
            name: "View using this as component is allowed",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyView extends View {
                    myMethod() {
                        MarkdownRenderer.render(app, '', el, '', this);
                    }
                }
            `,
        },
        {
            name: "storing component in variable first is allowed",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyPlugin extends Plugin {
                    myMethod() {
                        const tempComponent = new Component();
                        MarkdownRenderer.render(app, '', el, '', tempComponent);
                        // Later, you could call tempComponent.unload()
                    }
                }
            `,
        },
        {
            name: "another method of MarkdownRenderer, or render() on something else, is not checked",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                declare const preview: { render(app: App, markdown: string, el: HTMLElement, sourcePath: string, component: Component): void };
                declare function render(app: App, markdown: string, el: HTMLElement, sourcePath: string, component: Component): void;
                class MyPlugin extends Plugin {
                    myMethod() {
                        MarkdownRenderer.renderInto(app, '', el, '', this);
                        preview.render(app, '', el, '', this);
                        render(app, '', el, '', this);
                    }
                }
            `,
        },
        {
            name: "a render() call without a component does not crash",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyPlugin extends Plugin {
                    myMethod() {
                        // @ts-expect-error -- the component is missing
                        MarkdownRenderer.render(app, '', el, '');
                    }
                }
            `,
        },
    ],
    invalid: [
        {
            name: "new Component() directly in render is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyPlugin extends Plugin {
                    myMethod() {
                        MarkdownRenderer.render(app, '', el, '', new Component());
                    }
                }
            `,
            errors: [{ messageId: "avoidNewComponent", column: 66, endColumn: 81 }],
        },
        {
            name: "a new plugin instance is reported once, as a new component",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                declare class MyPlugin extends Plugin {}
                MarkdownRenderer.render(app, '', el, '', new MyPlugin());
            `,
            errors: [{ messageId: "avoidNewComponent" }],
        },
        {
            name: "a value of a type parameter constrained to Plugin is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                function show<T extends Plugin>(plugin: T) {
                    MarkdownRenderer.render(app, '', el, '', plugin);
                }
            `,
            errors: [{ messageId: "avoidPluginComponent" }],
        },
        {
            name: "this from Plugin class as component is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyPlugin extends Plugin {
                    myMethod() {
                        MarkdownRenderer.render(app, '', el, '', this);
                    }
                }
            `,
            errors: [{ messageId: "avoidPluginComponent" }],
        },
        {
            name: "an instance of a generic plugin class is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                declare class SettingsPlugin<T> extends Plugin { settings: T }
                declare const plugin: SettingsPlugin<{ open: boolean }>;
                MarkdownRenderer.render(app, '', el, '', plugin);
            `,
            errors: [{ messageId: "avoidPluginComponent" }],
        },
        {
            name: "this in a plugin whose base class is generic is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                declare class SettingsPlugin<T> extends Plugin { settings: T }
                class MyPlugin extends SettingsPlugin<{ open: boolean }> {
                    myMethod() {
                        MarkdownRenderer.render(app, '', el, '', this);
                    }
                }
            `,
            errors: [{ messageId: "avoidPluginComponent" }],
        },
        {
            name: "variable holding plugin instance as component is forbidden",
            code: `
                ${MOCK_API}
                declare const app: App;
                declare const el: HTMLElement;
                class MyPlugin extends Plugin {
                    myMethod() {
                        const pluginInstance = this;
                        MarkdownRenderer.render(app, '', el, '', pluginInstance);
                    }
                }
            `,
            errors: [{ messageId: "avoidPluginComponent" }],
        },
    ],
});
