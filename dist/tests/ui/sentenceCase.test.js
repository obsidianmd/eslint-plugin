import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/ui/sentenceCase.js";
const tester = new RuleTester();
tester.run("ui-sentence-case", rule, {
    valid: [
        {
            name: "Notice with sentence case is allowed",
            code: "new Notice('Enable auto-reveal');",
        },
        {
            name: "command name with sentence case is allowed",
            code: "this.addCommand({ id: 'x', name: 'Export as PDF' });",
        },
        {
            name: "Setting setName with sentence case is allowed",
            code: "new Setting(el).setName('Enable auto-reveal');",
        },
        {
            name: "setTooltip with brand name is allowed",
            code: "btn.setTooltip('Connect to GitHub');",
        },
        {
            name: "setAttribute aria-label is allowed",
            code: "el.setAttribute('aria-label', 'Open settings');",
        },
        {
            name: "setAttribute placeholder is allowed",
            code: "el.setAttribute('placeholder', 'Enter name');",
        },
        {
            name: "createEl with text option is allowed",
            code: "createEl('div', { text: 'Save to Google Drive' });",
        },
        {
            name: "setTitle with brand name is allowed",
            code: "menuItem.setTitle('Open Obsidian Publish');",
        },
        {
            name: "createEl with title option is allowed",
            code: "createEl('div', { title: 'Open settings' });",
        },
        {
            name: "createEl with attr aria-label is allowed",
            code: "createEl('div', { attr: { 'aria-label': 'Open settings' as const } });",
        },
        {
            name: "Notice with acronym in middle is allowed",
            code: "new Notice('Export as PDF');",
        },
        {
            name: "setText with brand name is allowed",
            code: "button.setText('Connect to GitHub');",
        },
        {
            name: "Notice with keyboard shortcut is allowed",
            code: "new Notice('Ctrl+S');",
        },
        {
            name: "Notice with version string is allowed",
            code: "new Notice('v1.2.3');",
        },
        {
            name: "Notice with error code is allowed",
            code: "new Notice('ERROR_404');",
        },
        {
            name: "Notice with short acronym is allowed",
            code: "new Notice('OK');",
        },
        {
            name: "textContent assignment is allowed",
            code: "el.textContent = 'Open settings';",
        },
        {
            name: "Notice with multiple sentences is allowed",
            code: "new Notice('Hello. World.');",
        },
        {
            name: "Notice with camelCase word is allowed",
            code: "new Notice('AutoReveal option');",
        },
        {
            name: "Notice with abbreviation followed by word is allowed",
            code: "new Notice('Visit U.S. Embassy');",
        },
        {
            name: "Notice with percentage prefix is allowed",
            code: "new Notice('50% AutoReveal');",
        },
        {
            name: "Notice with ignoreRegex option is allowed",
            code: "new Notice('Enable Auto-Reveal');",
            options: [{ ignoreRegex: ['Auto-Reveal'] }],
        },
        {
            name: "ItemView getDisplayText with sentence case is allowed",
            code: "class V extends ItemView { getDisplayText() { if (true) { return 'Open settings'; } return 'Open settings'; } }",
        },
        {
            name: "Notice with colon separator is allowed",
            code: "new Notice('Desktop: Emulate mobile mode');",
        },
        {
            name: "Notice with colon and lowercase continuation is allowed",
            code: "new Notice('Desktop: emulate mobile mode');",
        },
        {
            name: "Notice starting with emoji is allowed",
            code: "new Notice('✅ Text is good, nothing to change.');",
        },
        {
            name: "Notice with acronym followed by brand is allowed",
            code: "new Notice('LLM by OpenAI');",
        },
        {
            name: "Notice with quoted filename is allowed",
            code: "new Notice('If there is a file \"Template.md\" at the root of the vault.');",
        },
        {
            name: "Notice with file extension is allowed",
            code: "new Notice('Separator used when exporting as .csv file.');",
        },
        {
            name: "Notice with sentence case ending period is allowed",
            code: "new Notice('Time for rest.');",
        },
        {
            name: "Notice with brand 'React' is allowed",
            code: "new Notice('Switch to React');",
        },
        {
            name: "Notice with brand 'Svelte' is allowed",
            code: "new Notice('Switch to Svelte');",
        },
        {
            name: "Notice with parenthesized sentence is allowed",
            code: "new Notice('This is a short sentence. (And this is another one.)');",
        },
        {
            code: "new Notice('WebDAV CalDAV');",
        }
    ],
    invalid: [
        {
            name: "Notice with title case is forbidden",
            code: "new Notice('Enable Auto Reveal');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "command name with title case preposition is forbidden",
            code: "this.addCommand({ id: 'x', name: 'Save To Google Drive' });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "createEl title with title case is forbidden",
            code: "createEl('div', { title: 'Open Settings' });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "setTooltip with title case preposition is forbidden",
            code: "btn.setTooltip('Connect To GitHub');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "setAttribute placeholder with title case is forbidden",
            code: "el.setAttribute('placeholder', 'Enter Name');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "Notice in all caps is forbidden",
            code: "new Notice('EXPORT AS PDF');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "getDisplayText with title case is forbidden",
            code: "class V extends ItemView { getDisplayText() { return 'Open Settings'; } }",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "textContent with title case is forbidden",
            code: "el.textContent = 'Open Settings';",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "createEl attr aria-label with title case is forbidden",
            code: "createEl('div', { attr: { 'aria-label': 'Open Settings' } });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "createEl nested title with title case is forbidden",
            code: "createEl('div', { nested: { title: 'Open Settings' } });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "placeholder assignment with title case is forbidden",
            code: "el.placeholder = 'Enter Name';",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "getDisplayText with mixed case in branches is forbidden",
            code: "class V extends ItemView { getDisplayText() { if (true) { return 'Open Settings'; } return 'Open settings'; } }",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix corrects brand casing",
            code: "new Notice('Enable 2fa');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Enable 2FA');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix lowercases multiline title case",
            code: "new Notice('First Line\\nSecond Line');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('First line\\nsecond line');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix lowercases all-caps second sentence",
            code: "new Notice('Hello. WORLD.');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Hello. World.');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix corrects brand name casing",
            code: "new Notice('github API access');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('GitHub API access');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix lowercases after percentage",
            code: "new Notice('50% Complete');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('50% complete');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "auto-fix corrects all-caps after abbreviation",
            code: "new Notice('Visit U.S. EMBASSY');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Visit U.S. Embassy');",
            errors: [{ messageId: "useSentenceCase" }],
        },
    ],
});
