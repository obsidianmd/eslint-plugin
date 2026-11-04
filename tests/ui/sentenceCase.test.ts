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
        },
        {
            name: "a URL keeps its casing",
            code: "new Setting(el).setDesc('Visit https://obsidian.md/help for more.');",
            options: [{ enforceCamelCaseLower: true }],
        },
        {
            name: "an acronym-like URL path segment keeps its casing",
            code: "new Notice('See https://example.com/api for details');",
        },
        {
            name: "a www address keeps its casing",
            code: "new Notice('Visit www.example.com/Docs today');",
        },
        {
            name: "a date format keeps its casing",
            code: "new Setting(el).setDesc('Format: YYYY-MM-DD HH:mm');",
        },
        {
            name: "REST in capitals is allowed",
            code: "new Notice('Use the REST API to sync.');",
        },
        {
            name: "REST in capitals opening a sentence is allowed",
            code: "new Notice('REST in peace');",
        },
        {
            name: "rest as an ordinary word is allowed",
            code: "new Notice('Take a rest');",
        },
        {
            name: "a hyphenated word opening with REST keeps its capitals",
            code: "new Notice('REST-based sync');",
            options: [{ enforceCamelCaseLower: true }],
        },
        {
            name: "a hyphenated word opening with an acronym keeps it under enforceCamelCaseLower",
            code: "new Notice('API-based sync');",
            options: [{ enforceCamelCaseLower: true }],
        },
        {
            name: "a whitespace-free placeholder value is allowed",
            code: "text.setPlaceholder('sk-123…');",
        },
        {
            name: "an e.g. placeholder example is allowed",
            code: "text.setPlaceholder('e.g. My Vault');",
        },
        {
            name: "a placeholder attribute example is allowed",
            code: "el.setAttribute('placeholder', 'sk-123');",
        },
        {
            name: "a createEl placeholder attribute example is allowed",
            code: "createEl('input', { attr: { placeholder: 'e.g. My Vault' } });",
        },
        {
            name: "a placeholder property example is allowed",
            code: "input.placeholder = 'ex. My Vault';",
        },
        {
            name: "text with inline code is skipped",
            code: "new Notice('Run `npm Install` First');",
        },
        {
            name: "text with HTML tags is skipped",
            code: "el.setText('<b>Bold Title</b>');",
        },
        {
            name: "text with template placeholders is skipped",
            code: "new Notice('Saved {Count} Files'); new Notice('Moved %s To Trash');",
        },
        {
            name: "a file path is skipped",
            code: "new Notice('src/Main Plugin.ts');",
        },
        {
            name: "an all-caps identifier is skipped",
            code: "new Notice('API_KEY');",
        },
        {
            name: "a template literal with expressions is not checked",
            code: "declare const n: number; new Notice(`Saved ${n} Files`);",
        },
        {
            name: "createDiv, createSpan and createSvg options in sentence case are allowed",
            code: "createDiv({ text: 'Open settings' }); el.createSpan({ title: 'Open settings' }); el.createSvg('svg', { attr: { 'aria-label': 'Open settings' } });",
        },
        {
            // A string in place of the options is the class.
            name: "a class given as a string is not checked",
            code: "createDiv('Setting Item'); el.createSpan('Setting Item'); el.createSvg('svg', 'Setting Item'); el.createEl('div', 'Setting Item');",
        },
        {
            name: "other options of createDiv, createSpan and createSvg are not checked",
            code: "el.createDiv({ cls: 'Setting Item' }); createSpan({ attr: { 'data-name': 'Open Settings' } }); el.createSvg('svg', { attr: { viewBox: '0 0 24 24' }, cls: 'Big Icon' });",
        },
        {
            name: "the tag of createSvg is not checked",
            code: "el.createSvg('Open Settings' as never);",
        },
        {
            name: "createFragment takes no text",
            code: "createFragment((f) => f.appendText('x'));",
        },
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
        {
            name: "a prose placeholder is still checked",
            code: "text.setPlaceholder('Enter Your Name');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "an e.g. example outside a placeholder is still checked",
            code: "new Setting(el).setDesc('e.g. My Vault');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "Rest in title case is lowered like any word",
            code: "new Notice('Use the Rest API');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Use the rest API');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "text around a URL is still checked",
            code: "new Notice('Visit https://obsidian.md/help For Details');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Visit https://obsidian.md/help for details');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "setButtonText is checked",
            code: "button.setButtonText('Save All Files');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "addRibbonIcon checks its tooltip, the second argument",
            code: "this.addRibbonIcon('dice', 'Open Daily Note', () => {});",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "addOption checks its label, the second argument",
            code: "dropdown.addOption('daily', 'Daily Note');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "innerText assignment is checked",
            code: "el.innerText = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "an ariaLabel assignment is checked as aria-label",
            code: "el.ariaLabel = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "setAttribute aria-description is checked",
            code: "el.setAttribute('aria-description', 'Opens The Daily Note');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "a title assignment is checked",
            code: "el.title = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "createDiv's options are checked like createEl's",
            code: "createDiv({ text: 'Open Daily Note' }); el.createDiv({ title: 'Open Daily Note', attr: { 'aria-label': 'Open Daily Note' } }, (div) => {});",
            errors: [
                { messageId: "useSentenceCase", column: 19 },
                { messageId: "useSentenceCase", column: 63 },
                { messageId: "useSentenceCase", column: 104 },
            ],
        },
        {
            name: "createSpan's options are checked like createEl's",
            code: "createSpan({ text: 'Open Daily Note' }); el.createSpan({ attr: { placeholder: 'Type A Name' } });",
            errors: [{ messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }],
        },
        {
            name: "createSvg's attr values are checked like createEl's",
            code: "el.createSvg('svg', { attr: { 'aria-label': 'Open Daily Note' } });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "createDiv's text is fixed when allowAutoFix is on",
            code: "el.createDiv({ text: 'Open Daily Note' });",
            options: [{ allowAutoFix: true }],
            output: "el.createDiv({ text: 'Open daily note' });",
            errors: [{ messageId: "useSentenceCase" }],
        },
    ],
});
