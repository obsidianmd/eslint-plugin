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
		// A valid case where a view is created and returned without storing it in the plugin.
		{
			code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    onload() {
                        this.registerView('my-view', (leaf) => new MyCustomView());
                    }
                }
            `,
		},
		// Using a function keyword instead of an arrow function.
		{
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
		// Assigning a non-View property inside the factory. This is perfectly fine and should not be flagged.
		{
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
		// Invalid cases where a view is assigned to a property of the plugin, which can cause memory leaks.
		{
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
		// Invalid case where a view is assigned to a property of the plugin, but using an arrow function.
		{
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
		// Assigning on one line and returning on another.
		{
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
		// Assignment via an Alias (const self = this;)
		{
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
