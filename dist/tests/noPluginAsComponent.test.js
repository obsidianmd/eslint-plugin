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
            errors: [{ messageId: "avoidNewComponent" }],
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
