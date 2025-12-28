import { RuleTester } from "@typescript-eslint/rule-tester";
import useNormalizePath from "../lib/rules/useNormalizePath.js";

const ruleTester = new RuleTester();

ruleTester.run("use-normalize-path", useNormalizePath, {
    valid: [
        // Using normalizePath directly in call
        {
            code: "vault.getAbstractFileByPath(normalizePath(userPath));",
        },
        // Using pre-normalized variable
        {
            code: `
const normalizedPath = normalizePath(userInput);
vault.getFileByPath(normalizedPath);
            `,
        },
        // Literal paths are generally okay (they're not user input)
        {
            code: "vault.getFileByPath('notes/my-note.md');",
        },
        // Using normalizePath with vault access patterns
        {
            code: "this.app.vault.create(normalizePath(filePath), content);",
        },
        // Non-vault method calls
        {
            code: "fs.readFile(userPath);",
        },
    ],
    invalid: [
        // Template literal path construction
        {
            code: "vault.getFileByPath(`${folder}/${file}`);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // String concatenation
        {
            code: "vault.create(folder + '/' + filename, content);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // Variable named "path" without normalization
        {
            code: "vault.getAbstractFileByPath(filePath);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // User input variable
        {
            code: "vault.getFileByPath(userInput);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // this.app.vault with unnormalized path
        {
            code: "this.app.vault.create(newPath, content);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // Member expression with path property
        {
            code: "vault.getFileByPath(settings.targetPath);",
            errors: [{ messageId: "useNormalizePath" }],
        },
        // Input value from settings
        {
            code: "vault.getFolderByPath(input.value);",
            errors: [{ messageId: "useNormalizePath" }],
        },
    ],
});
