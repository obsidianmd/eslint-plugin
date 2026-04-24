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
    ],
});
