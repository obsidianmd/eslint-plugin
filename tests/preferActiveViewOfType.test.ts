import { RuleTester } from "@typescript-eslint/rule-tester";
import preferActiveViewOfType from "../lib/rules/preferActiveViewOfType.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-active-view-of-type", preferActiveViewOfType, {
    valid: [
        // Correct usage with getActiveViewOfType
        {
            code: "const view = this.app.workspace.getActiveViewOfType(MarkdownView);",
        },
        {
            code: "const view = workspace.getActiveViewOfType(MarkdownView);",
        },
        // Accessing activeLeaf on non-workspace objects
        { code: "const leaf = someObject.activeLeaf;" },
        { code: "const leaf = tree.activeLeaf;" },
        // Using getLeavesOfType
        { code: "const leaves = this.app.workspace.getLeavesOfType('markdown');" },
    ],
    invalid: [
        // Direct workspace.activeLeaf access
        {
            code: "const leaf = workspace.activeLeaf;",
            errors: [{ messageId: "useGetActiveViewOfType" }],
        },
        // this.app.workspace.activeLeaf
        {
            code: "const leaf = this.app.workspace.activeLeaf;",
            errors: [{ messageId: "useGetActiveViewOfType" }],
        },
        // app.workspace.activeLeaf
        {
            code: "const leaf = app.workspace.activeLeaf;",
            errors: [{ messageId: "useGetActiveViewOfType" }],
        },
        // Chained access
        {
            code: "const view = this.app.workspace.activeLeaf?.view;",
            errors: [{ messageId: "useGetActiveViewOfType" }],
        },
        // In conditional
        {
            code: `
if (this.app.workspace.activeLeaf) {
    doSomething();
}
            `,
            errors: [{ messageId: "useGetActiveViewOfType" }],
        },
    ],
});
