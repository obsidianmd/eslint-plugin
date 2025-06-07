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
			code: `
                ${MOCK_API}
                class MyPlugin extends Plugin {
                    onload() {
                        this.registerView('my-view', (leaf) => new MyCustomView());
                    }
                }
            `,
		},
	],
	invalid: [
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
	],
});
