import { RuleTester } from "@typescript-eslint/rule-tester";
import preferCachedRead from "../../lib/rules/vault/preferCachedRead.js";

const ruleTester = new RuleTester();

ruleTester.run("vault-prefer-cached-read", preferCachedRead, {
    valid: [
        // Correct usage with cachedRead
        { code: "const content = await vault.cachedRead(file);" },
        { code: "const content = await this.app.vault.cachedRead(file);" },
        { code: "const content = await app.vault.cachedRead(file);" },
        // read() on non-vault objects
        { code: "const data = await fs.read(path);" },
        { code: "const data = await file.read();" },
        { code: "const data = await reader.read();" },
        // Other vault methods
        { code: "await vault.modify(file, content);" },
        { code: "await vault.create(path, content);" },
    ],
    invalid: [
        // Direct vault.read
        {
            code: "const content = await vault.read(file);",
            errors: [{ messageId: "preferCachedRead" }],
            output: "const content = await vault.cachedRead(file);",
        },
        // this.app.vault.read
        {
            code: "const content = await this.app.vault.read(file);",
            errors: [{ messageId: "preferCachedRead" }],
            output: "const content = await this.app.vault.cachedRead(file);",
        },
        // app.vault.read
        {
            code: "const content = await app.vault.read(file);",
            errors: [{ messageId: "preferCachedRead" }],
            output: "const content = await app.vault.cachedRead(file);",
        },
        // In a method
        {
            code: `
class MyPlugin {
    async readFile(file: TFile) {
        return await this.app.vault.read(file);
    }
}
            `,
            errors: [{ messageId: "preferCachedRead" }],
            output: `
class MyPlugin {
    async readFile(file: TFile) {
        return await this.app.vault.cachedRead(file);
    }
}
            `,
        },
    ],
});
    