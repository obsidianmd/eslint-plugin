import { RuleTester } from "@typescript-eslint/rule-tester";
import preferProcessFrontMatter from "../lib/rules/preferProcessFrontMatter.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-process-front-matter", preferProcessFrontMatter, {
    valid: [
        // Correct usage with processFrontMatter
        {
            code: `
await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.tags = ['new-tag'];
});
            `,
        },
        // Using metadataCache to read
        {
            code: "const cache = this.app.metadataCache.getFileCache(file);",
        },
        // Split on other delimiters
        { code: "const parts = str.split(',');" },
        { code: "const lines = content.split('\\n');" },
        // Regex for other patterns
        { code: "const pattern = /^#+ /;" },
        { code: "const regex = new RegExp('hello');" },
    ],
    invalid: [
        // Manual frontmatter splitting
        {
            code: "const parts = content.split('---');",
            errors: [{ messageId: "manualYamlParsing" }],
        },
        {
            code: "const parts = fileContent.split('---\\n');",
            errors: [{ messageId: "manualYamlParsing" }],
        },
        // RegExp constructor for frontmatter
        {
            code: "const fmRegex = new RegExp('^---');",
            errors: [{ messageId: "manualYamlParsing" }],
        },
        // Regex literal for frontmatter
        {
            code: "const match = content.match(/^---\\n([\\s\\S]*?)\\n---/);",
            errors: [{ messageId: "manualYamlParsing" }],
        },
    ],
});
