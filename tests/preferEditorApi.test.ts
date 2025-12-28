import { RuleTester } from "@typescript-eslint/rule-tester";
import preferEditorApi from "../lib/rules/preferEditorApi.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-editor-api", preferEditorApi, {
    valid: [
        // Using Editor API
        { code: "editor.replaceSelection(newText);" },
        { code: "editor.replaceRange(newText, from, to);" },
        { code: "editor.setValue(content);" },
        // Using vault.process for atomic modifications
        {
            code: `
await vault.process(file, (data) => {
    return data.replace(oldText, newText);
});
            `,
        },
        // Other vault methods
        { code: "await vault.create(path, content);" },
        { code: "await vault.read(file);" },
        { code: "await vault.cachedRead(file);" },
        // modify on non-vault objects
        { code: "await editor.modify(text);" },
        { code: "await obj.modify(data);" },
    ],
    invalid: [
        // Direct vault.modify
        {
            code: "await vault.modify(file, newContent);",
            errors: [{ messageId: "preferEditorApi" }],
        },
        // this.app.vault.modify
        {
            code: "await this.app.vault.modify(file, content);",
            errors: [{ messageId: "preferEditorApi" }],
        },
        // app.vault.modify
        {
            code: "await app.vault.modify(activeFile, updatedContent);",
            errors: [{ messageId: "preferEditorApi" }],
        },
        // In async function
        {
            code: `
class MyPlugin {
    async updateFile(file: TFile, content: string) {
        await this.app.vault.modify(file, content);
    }
}
            `,
            errors: [{ messageId: "preferEditorApi" }],
        },
    ],
});
