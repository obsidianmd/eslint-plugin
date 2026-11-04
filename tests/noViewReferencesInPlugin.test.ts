import { RuleTester } from "@typescript-eslint/rule-tester";
import noViewReferencesRule from "../lib/rules/noViewReferencesInPlugin.js";

const ruleTester = new RuleTester();

const MOCK_API = `
    declare class WorkspaceLeaf {}
    type ViewCreator = (leaf: WorkspaceLeaf) => View;
    declare class Component { }
    declare class Plugin extends Component {
        registerView(type: string, viewCreator: ViewCreator): void;
    }
    declare class View extends Component { }
    class MyCustomView extends View { }
`;

ruleTester.run("no-view-references-in-plugin", noViewReferencesRule, {
    valid: [
        {
            name: "view created and returned without storing is allowed",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    onload() {
                        this.registerView('my-view', (leaf) => new MyCustomView());
                    }
                }
            `,
        },
        {
            name: "function keyword in factory is allowed",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    onload() {
                        this.registerView('my-view', function(leaf) {
                            return new MyCustomView();
                        });
                    }
                }
            `,
        },
        {
            name: "assigning non-View property in factory is allowed",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    someFlag = false;
                    onload() {
                        this.registerView('my-view', (leaf) => {
                            this.someFlag = true;
                            return new MyCustomView();
                        });
                    }
                }
            `,
        },
        {
            name: "storing the view through a variable first is not detected",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        this.registerView('my-view', (leaf) => {
                            const view = new MyCustomView();
                            this.view = view;
                            return view;
                        });
                    }
                }
            `,
        },
        {
            name: "an assignment inside a nested block is not detected",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        this.registerView('my-view', (leaf) => {
                            if (leaf) {
                                this.view = new MyCustomView();
                            }
                            return new MyCustomView();
                        });
                    }
                }
            `,
        },
        {
            name: "a factory passed by reference is not checked",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    createView = (leaf: WorkspaceLeaf) => (this.view = new MyCustomView());
                    onload() {
                        this.registerView('my-view', this.createView);
                    }
                }
            `,
        },
        {
            name: "registerView() on an object that is not a plugin is not checked",
            code: `
                ${MOCK_API}
                declare const registry: { registerView(type: string, viewCreator: ViewCreator): void };
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        registry.registerView('my-view', (leaf) => this.view = new MyCustomView());
                    }
                }
            `,
        },
        {
            name: "a registerView() without a factory does not crash",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    onload() {
                        // @ts-expect-error -- the factory is missing
                        this.registerView('my-view');
                    }
                }
            `,
        },
        {
            name: "a view stored on something other than the plugin is not reported",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    app: { view?: MyCustomView } = {};
                    onload() {
                        const app = this.app;
                        let current: MyCustomView;
                        this.registerView('my-view', (leaf) => {
                            // @ts-expect-error -- cache is not declared
                            cache.view = new MyCustomView();
                            app.view = new MyCustomView();
                            current = new MyCustomView();
                            return current;
                        });
                    }
                }
            `,
        },
        {
            name: "a view that is not created with new, or something stored that is not a view, is not reported",
            code: `
                ${MOCK_API}
                declare function createView(leaf: WorkspaceLeaf): MyCustomView;
                declare class Helper {}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    helper: Helper;
                    onload() {
                        this.registerView('my-view', (leaf) => {
                            this.helper = new Helper();
                            return this.view = createView(leaf);
                        });
                    }
                }
            `,
        },
    ],
    invalid: [
        {
            name: "assigning view to plugin property in arrow expression is forbidden",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        this.registerView('my-view', (leaf) => this.view = new MyCustomView());
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "assigning view to plugin property in arrow block is forbidden",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        this.registerView('my-view', (leaf) => {
                            return this.view = new MyCustomView();
                        });
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "assigning on one line and returning on another is forbidden",
            code: `
                ${MOCK_API}
                 class MyPlugin extends Plugin {
                     view: MyCustomView;
                     onload() {
                         this.registerView('my-view', (leaf) => {
                             this.view = new MyCustomView(); // The bad assignment
                             return this.view;
                         });
                     }
                 }
             `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "assignment via alias (const self = this) is forbidden",
            code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    view: MyCustomView;
                    onload() {
                        const self = this;
                        this.registerView('my-view', (leaf) => self.view = new MyCustomView());
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "an instance of a generic view class is reported",
            code: `
                ${MOCK_API}
                class GenericView<T> extends View { state?: T }
                class MyPlugin extends Plugin {
                    view: GenericView<string>;
                    onload() {
                        this.registerView('my-view', (leaf) => this.view = new GenericView<string>());
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "a view whose base class is generic is reported",
            code: `
                ${MOCK_API}
                class StateView<T> extends View { state?: T }
                class SettingsView extends StateView<{ open: boolean }> { }
                class MyPlugin extends Plugin {
                    view: SettingsView;
                    onload() {
                        this.registerView('my-view', (leaf) => this.view = new SettingsView());
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "a plugin whose base class is generic is checked",
            code: `
                ${MOCK_API}
                class SettingsPlugin<T> extends Plugin { settings?: T }
                class MyPlugin extends SettingsPlugin<{ open: boolean }> {
                    view: MyCustomView;
                    onload() {
                        this.registerView('my-view', (leaf) => this.view = new MyCustomView());
                    }
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
        {
            name: "a this typed by a type parameter constrained to Plugin is checked",
            code: `
                ${MOCK_API}
                declare class ViewPlugin extends Plugin { view: MyCustomView }
                function setup<T extends ViewPlugin>(this: T) {
                    this.registerView('my-view', (leaf) => this.view = new MyCustomView());
                }
            `,
            errors: [{ messageId: "avoidViewReference" }],
        },
    ],
});
