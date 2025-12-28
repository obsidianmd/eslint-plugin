import { RuleTester } from "@typescript-eslint/rule-tester";
import noObsidianBranding from "../lib/rules/noObsidianBranding.js";

const ruleTester = new RuleTester();

ruleTester.run("no-obsidian-branding", noObsidianBranding, {
    valid: [
        // Just "Obsidian" alone is fine
        { code: "const name = 'Obsidian';" },
        { code: "new Notice('Open Obsidian settings');" },
        // Official Obsidian products/terms are allowed
        { code: "const url = 'Obsidian Publish';" },
        { code: "const sync = 'Obsidian Sync';" },
        { code: "const api = 'Obsidian API';" },
        { code: "const canvas = 'Obsidian Canvas';" },
        { code: "const docs = 'Obsidian documentation';" },
        { code: "const help = 'See Obsidian Help for more info';" },
        { code: "const vault = 'Obsidian Vault';" },
        { code: "const uri = 'Obsidian URI';" },
        { code: "const app = 'Obsidian App';" },
        // Plugin names without "Obsidian" prefix
        { code: "const name = 'My Awesome Plugin';" },
        { code: "this.addCommand({ name: 'Do something cool' });" },
        // Template literals with official terms
        { code: "const msg = `Connect to Obsidian Sync`;" },
        // Possessive is fine
        { code: "const text = \"Obsidian's API is great\";" },
    ],
    invalid: [
        // Plugin naming violations
        {
            code: "const name = 'Obsidian Tasks';",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        {
            code: "const name = 'Obsidian Git';",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        {
            code: "const name = 'Obsidian Dataview';",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        {
            code: "const title = 'Obsidian Calendar Plugin';",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        // In command names
        {
            code: "this.addCommand({ name: 'Obsidian Export: Export all' });",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        // In notices
        {
            code: "new Notice('Welcome to Obsidian Templater!');",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        // Template literals
        {
            code: "const msg = `Obsidian MyPlugin is ready`;",
            errors: [{ messageId: "noObsidianBranding" }],
        },
        // Setting names
        {
            code: "new Setting(el).setName('Obsidian Enhancer option');",
            errors: [{ messageId: "noObsidianBranding" }],
        },
    ],
});
