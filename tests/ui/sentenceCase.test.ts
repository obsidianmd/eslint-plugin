import assert from "node:assert";
import { Linter, type Rule } from "eslint";
import { RuleTester } from "@typescript-eslint/rule-tester";
import parser, { parse } from "@typescript-eslint/parser";
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
import rule from "../../lib/rules/ui/sentenceCase.js";
import { typedRuleTesterConfig } from "../mocha-setup.js";

const tester = new RuleTester();

tester.run("ui-sentence-case", rule, {
    valid: [
        {
            name: "words that keep a capital in English are not reported, also with allowAutoFix",
            code: "new Notice('Sorry, I could not sort A-Z'); new Setting(el).setName('Copy Obsidian URI').setDesc('Press Enter on Monday, or use Ctrl-S');",
            options: [{ allowAutoFix: true }],
        },
        {
            name: "an ignored word in a hyphenated word keeps its case",
            code: "new Setting(el).setName('Use Dataview-powered queries');",
            options: [{ ignoreWords: ["Dataview"] }],
        },
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
            code: "declare const n: number; new Notice(`Saved ${n} Files`); new Notice(`Open Settings For ${n}`);",
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
        {
            name: "a placeholder example may start with eg., ex. or e. g. in any case",
            code: "text.setPlaceholder('Eg. My Vault'); text.setPlaceholder('EX. My Vault'); text.setPlaceholder('e. g. My Vault'); text.setPlaceholder('  sk-123  ');",
        },
        {
            name: "an example placeholder attribute is allowed however it is set",
            code: "el.setAttribute('placeholder', 'e.g. My Vault'); el.placeholder = 'My-Vault'; createEl('input', { attr: { placeholder: 'My-Vault' } });",
        },
        {
            name: "an attribute that holds no text is not checked",
            code: "el.setAttribute('data-name', 'Open Settings'); el.setAttribute('aria-label'); el.setAttribute(name, 'Open Settings'); createEl('div', { attr: { 'data-title': 'Open Settings' } });",
        },
        {
            name: "a property that holds no text is not checked",
            code: "el.className = 'Open Settings'; el['textContent'] = 'Open Settings'; label = 'Open Settings';",
        },
        {
            name: "a method that takes no UI text is not checked",
            code: "el.setValue('Open Settings'); el.addClass('Open Settings'); el['setText']('Open Settings'); setText('Open Settings'); el.setText(...args);",
        },
        {
            name: "an argument that is not a string is not checked",
            code: "el.setText(label); el.setText(1); el.setText(/Open Settings/); new Notice(message); new Notice(); this.addRibbonIcon('dice'); dropdown.addOption('Daily Note');",
        },
        {
            name: "only a Notice is checked among constructors",
            code: "new Modal('Open Settings'); new obsidian.Other('Open Settings');",
        },
        {
            name: "a spread or a computed key in createEl options is skipped",
            code: "createEl('div', { ...base, [key]: 'Open Settings', cls: 'Open Settings' }); createEl('div', ...args);",
        },
        {
            name: "getDisplayText that is not a method body is not checked",
            code: "class V { getDisplayText = () => 'Open Settings'; other() { return 'Open Settings'; } }",
        },
        {
            name: "a command name that is not a string is not checked",
            code: "this.addCommand({ id: 'x', name: label }); this.addCommand({ ...base }); this.addCommand(command); this.addCommand();",
        },
        {
            name: "a template literal is judged on its value, not on its escapes",
            code: "new Notice(`Open\\u0020settings`); new Notice(`Open settings\\x2E`); new Notice(`Line one\\nline two`);",
        },
        {
            name: "a number before the first word makes it a later word",
            code: "new Notice('2 files selected'); new Notice('1st place'); new Notice('3D view');",
        },
        {
            name: "the word after e.g., i.e., etc. or vs. may take either case",
            code: "new Setting(el).setDesc('Choose a folder, e.g. notes'); new Notice('Choose a folder, e.g. Notes'); new Notice('Compare local vs. remote');",
        },
        {
            name: "a first word in quotes keeps its capital",
            code: "new Notice('\"Open\" settings'); new Notice(\"'Open' settings\"); new Notice('\"open\" settings');",
        },
        {
            name: "an AM/PM token after a time format keeps its casing",
            code: "new Setting(el).setDesc('Format: hh:mm A');",
        },
        {
            name: "a mixed-case acronym keeps its listed casing",
            code: "new Notice('Sign in with OAuth');",
        },
        {
            name: "a brand that is also an ordinary word may be written as the word",
            code: "new Notice('Close all windows'); new Notice('Move the cursor'); new Notice('Leave some slack'); new Notice('The notion of time'); new Notice('Press x to close'); new Notice('Views react to changes');",
        },
        {
            name: "a data attribute set through dataset is not UI text",
            code: "el.dataset.title = 'Open Daily Note'; el.dataset.placeholder = 'Enter Name'; this.containerEl.dataset.ariaLabel = 'Open Daily Note';",
        },
        {
            name: "a property in snake case is not a DOM text property",
            code: "item.aria_label = 'Open Daily Note';",
        },
        {
            name: "a computed property named by a variable is not checked",
            code: "declare const title: string; el[title] = 'Open Daily Note';",
        },
        {
            name: "text appended with += is not checked",
            code: "el.textContent += ' done'; el.title += ' And More';",
        },
        {
            name: "the first word after a bullet, punctuation or a label keeps its case",
            code: "new Notice('[Beta] Feature'); new Notice('[beta] feature'); new Notice('- Item'); new Notice('- open settings'); new Notice('• Bullet'); new Notice('→ Next'); new Notice('(Beta) Sync');",
        },
        {
            name: "a word that starts with a number keeps its letters mid-sentence",
            code: "new Notice('Open 3D view'); new Notice('Export in 4K');",
        },
        {
            name: "a date format with spaces keeps its casing",
            code: "new Setting(el).setDesc('Format: MMM D, YYYY'); new Notice('Use DD MMM YYYY or dddd, MMMM Do');",
        },
        {
            name: "with type information, title and placeholder on an object that is not an element are not checked",
            code: "declare const frontmatter: { title: string }; frontmatter.title = 'Untitled Note'; declare const opts: { placeholder?: string }; opts.placeholder = 'Enter Name'; class Note { title = ''; rename() { this.title = 'Untitled Note'; } } function rename<T extends { title: string }>(note: T) { note.title = 'Untitled Note'; } declare const either: { title: string } | null; either!.title = 'Untitled Note';",
        },
        {
            name: "a file name or a path is still skipped",
            code: "new Notice('Open config.json'); new Notice('See docs/readme.md'); new Notice('Saved to Notes/Daily.md'); new Notice('https://x.com/a.b'); new Notice('Open .obsidian/plugins Folder');",
        },
    ],
    invalid: [
        {
            name: "Notice with title case is forbidden",
            code: "new Notice('Enable Auto Reveal');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Enable auto reveal" } }],
        },
        {
            name: "command name with title case preposition is forbidden",
            code: "this.addCommand({ id: 'x', name: 'Save To Google Drive' });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Save to Google Drive" } }],
        },
        {
            name: "createEl title with title case is forbidden",
            code: "createEl('div', { title: 'Open Settings' });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "setTooltip with title case preposition is forbidden",
            code: "btn.setTooltip('Connect To GitHub');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Connect to GitHub" } }],
        },
        {
            name: "setAttribute placeholder with title case is forbidden",
            code: "el.setAttribute('placeholder', 'Enter Name');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Enter name" } }],
        },
        {
            name: "Notice in all caps is forbidden",
            code: "new Notice('EXPORT AS PDF');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Export as PDF" } }],
        },
        {
            name: "getDisplayText with title case is forbidden",
            code: "class V extends ItemView { getDisplayText() { return 'Open Settings'; } }",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "textContent with title case is forbidden",
            code: "el.textContent = 'Open Settings';",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "createEl attr aria-label with title case is forbidden",
            code: "createEl('div', { attr: { 'aria-label': 'Open Settings' } });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "createEl options behind an angle-bracket type assertion are checked",
            code: "createEl('div', <DomElementInfo>{ title: 'Open Settings' });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "createEl nested title with title case is forbidden",
            code: "createEl('div', { nested: { title: 'Open Settings' } });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
        },
        {
            name: "placeholder assignment with title case is forbidden",
            code: "el.placeholder = 'Enter Name';",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Enter name" } }],
        },
        {
            name: "getDisplayText with mixed case in branches is forbidden",
            code: "class V extends ItemView { getDisplayText() { if (true) { return 'Open Settings'; } return 'Open settings'; } }",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings" } }],
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
            name: "auto-fix lowercases all-caps second sentence in text that is all in capitals",
            code: "new Notice('HELLO. WORLD.');",
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
            name: "auto-fix corrects all-caps after abbreviation in strict mode",
            code: "new Notice('Visit U.S. EMBASSY');",
            options: [{ allowAutoFix: true, mode: "strict" }],
            output: "new Notice('Visit U.S. Embassy');",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "a prose placeholder is still checked",
            code: "text.setPlaceholder('Enter Your Name');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Enter your name" } }],
        },
        {
            name: "an e.g. example outside a placeholder is still checked",
            code: "new Setting(el).setDesc('e.g. My Vault');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "E.g. My vault" } }],
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
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Save all files" } }],
        },
        {
            name: "addRibbonIcon checks its tooltip, the second argument",
            code: "this.addRibbonIcon('dice', 'Open Daily Note', () => {});",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "addOption checks its label, the second argument",
            code: "dropdown.addOption('daily', 'Daily Note');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Daily note" } }],
        },
        {
            name: "innerText assignment is checked",
            code: "el.innerText = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "an ariaLabel assignment is checked as aria-label",
            code: "el.ariaLabel = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "setAttribute aria-description is checked",
            code: "el.setAttribute('aria-description', 'Opens The Daily Note');",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Opens the daily note" } }],
        },
        {
            name: "a title assignment is checked",
            code: "el.title = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
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
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }, { messageId: "useSentenceCase", data: { suggestion: "Type a name" } }],
        },
        {
            name: "createSvg's attr values are checked like createEl's",
            code: "el.createSvg('svg', { attr: { 'aria-label': 'Open Daily Note' } });",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "createDiv's text is fixed when allowAutoFix is on",
            code: "el.createDiv({ text: 'Open Daily Note' });",
            options: [{ allowAutoFix: true }],
            output: "el.createDiv({ text: 'Open daily note' });",
            errors: [{ messageId: "useSentenceCase" }],
        },
        {
            name: "setName, setText and setTitle are checked",
            code: "new Setting(el).setName('Open Daily Note'); button.setText('Open Daily Note'); item.setTitle('Open Daily Note');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" }, column: 25 },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" }, column: 60 },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" }, column: 94 },
            ],
        },
        {
            name: "a string behind as, satisfies or a non-null assertion is checked",
            code: "new Notice('Open Daily Note' as string); el.setText('Open Daily Note' satisfies string); el.title = 'Open Daily Note'!;",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
            ],
        },
        {
            name: "a template literal without expressions is checked and fixed in place",
            code: "new Notice(`Open Daily Note`);",
            options: [{ allowAutoFix: true }],
            output: "new Notice(`Open daily note`);",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "a template literal with a double quote keeps its backticks",
            code: 'new Notice(`Say "Open Now" Here`);',
            options: [{ allowAutoFix: true }],
            output: 'new Notice(`Say "open now" here`);',
            errors: [{ messageId: "useSentenceCase", data: { suggestion: 'Say "open now" here' } }],
        },
        {
            name: "createEl options behind a non-null assertion are checked",
            code: "createEl('div', { title: 'Open Daily Note' }!);",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open daily note" } }],
        },
        {
            name: "an attribute name in snake case is read as kebab case",
            code: "el.setAttribute('aria_label', 'Open Daily Note'); createEl('div', { attr: { ariaDescription: 'Open Daily Note', title: 'Open Daily Note' } });",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
            ],
        },
        {
            name: "a command name under a quoted key, or in a bare addCommand call, is checked",
            code: "this.addCommand({ id: 'x', 'name': 'Open Daily Note' }); addCommand({ name: 'Open Daily Note' });",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
            ],
        },
        {
            name: "createEl options in a bare call are checked",
            code: "createEl('div', { text: 'Open Daily Note' }); createSvg('svg', { attr: { 'aria-label': 'Open Daily Note' } }); createSpan({ title: 'Open Daily Note' });",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open daily note" } },
            ],
        },
        {
            name: "createEl's text is checked even with a title beside it",
            code: "createEl('div', { text: 'Open Daily Note', title: 'Open Daily Note' });",
            errors: [
                { messageId: "useSentenceCase", column: 25 },
                { messageId: "useSentenceCase", column: 51 },
            ],
        },
        {
            name: "getDisplayText returns are found in every kind of statement",
            code: `class V extends ItemView {
                getDisplayText() {
                    switch (mode) { case 1: return 'Open Switch Case'; default: { return 'Open Switch Default'; } }
                    for (;;) { return 'Open For Loop'; }
                    for (const x of xs) return 'Open For Of';
                    while (ok) return 'Open While Loop';
                    outer: { return 'Open Labeled Block'; }
                    try { return 'Open Try Block'; } catch { return 'Open Catch Block'; } finally { return 'Open Finally Block'; }
                    if (a) return 'Open If Branch'; else return 'Open Else Branch';
                    return;
                }
            }`,
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open switch case" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open switch default" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open for loop" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open for of" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open while loop" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open labeled block" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open try block" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open catch block" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open finally block" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open if branch" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open else branch" } },
            ],
        },
        {
            name: "an assignment reports its value",
            code: "el.textContent = 'Open Daily Note';",
            errors: [{ messageId: "useSentenceCase", line: 1, column: 18, endLine: 1, endColumn: 35 }],
        },
        {
            name: "the fix keeps double quotes and escapes what needs escaping",
            code: String.raw`new Notice("Say \"Open Now\" Here"); new Notice('It\'s Open\\Now\tHere'); new Notice('Open Now\r\nOr\u2028Later\u0001Too\0' + '');`,
            options: [{ allowAutoFix: true }],
            output: String.raw`new Notice("Say \"open now\" here"); new Notice('It\'s open\\now\there'); new Notice('Open Now\r\nOr\u2028Later\u0001Too\0' + '');`,
            errors: [{ messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }],
        },
        {
            name: "the fix keeps every escape as written",
            code: String.raw`new Notice('Open Now\r\nOr\u2028Later\u0001Too\u000b\b\f\0'); new Notice('Open Now\x001\x009'); new Notice("Open Now\v\0");`,
            options: [{ allowAutoFix: true }],
            output: String.raw`new Notice('Open now\r\nor\u2028later\u0001too\u000b\b\f\0'); new Notice('Open now\x001\x009'); new Notice("Open now\v\0");`,
            errors: [{ messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }, { messageId: "useSentenceCase" }],
        },
        {
            name: "a template literal is judged and fixed on its value, its escapes kept",
            code: "new Notice(`Open Settings\\tNow`); new Notice(`Line One\\nLine Two`); new Notice(`Open\\u0020Settings`);",
            options: [{ allowAutoFix: true }],
            output: "new Notice(`Open settings\\tnow`); new Notice(`Line one\\nline two`); new Notice(`Open\\u0020settings`);",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open settings\tnow" } },
                { messageId: "useSentenceCase", data: { suggestion: "Line one\nline two" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
            ],
        },
        // The CRLF audit's cases (work/aud-win aea8604). That audit expected a
        // double-quoted string; the fix keeps the template literal as written,
        // and its value is the same.
        {
            name: "a template literal with escapes is fixed to the same value, its escapes kept",
            code: "new Notice(`Open The Settings\\nNow`); new Notice(`Don\\u2019t Open The Settings`);",
            options: [{ allowAutoFix: true }],
            output: "new Notice(`Open the settings\\nnow`); new Notice(`Don\\u2019t open the settings`);",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open the settings\nnow" } },
                { messageId: "useSentenceCase", data: { suggestion: "Don’t open the settings" } },
            ],
        },
        {
            name: "a template literal over two lines of a CRLF file keeps its line break, and its value has no \\r",
            code: "new Notice(`Open The\r\nSettings Now`);\r\n",
            options: [{ allowAutoFix: true }],
            output: "new Notice(`Open the\r\nsettings now`);\r\n",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open the\nsettings now" } }],
        },
        {
            name: "a template literal keeps its line breaks, escaped quotes and line continuations",
            code: "new Notice(`Open Settings\r\nNow \\' Here \\\r\nToo`);",
            options: [{ allowAutoFix: true }],
            output: "new Notice(`Open settings\r\nnow \\' here \\\r\ntoo`);",
            errors: [{ messageId: "useSentenceCase", data: { suggestion: "Open settings\nnow ' here too" } }],
        },
        {
            name: "a string keeps its escapes, an escaped letter included",
            code: String.raw`new Notice('\u0041pply Settings'); new Notice("Say \"Open\" Now"); new Notice('Open \
Settings'); new Notice('It\'s \u{1F600} Open');`,
            options: [{ allowAutoFix: true }],
            output: String.raw`new Notice('\u0041pply settings'); new Notice("Say \"open\" now"); new Notice('Open \
settings'); new Notice('It\'s \u{1F600} open');`,
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Apply settings" } },
                { messageId: "useSentenceCase", data: { suggestion: 'Say "open" now' } },
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                { messageId: "useSentenceCase", data: { suggestion: "It's \u{1F600} open" } },
            ],
        },
        {
            name: "a letter that has to change but is written as an escape is reported without a fix",
            code: String.raw`new Notice('Open \u0053ettings'); new Notice(` + "`Open \\x53ettings`" + String.raw`); new Notice('Open \u{53}ettings');`,
            options: [{ allowAutoFix: true }],
            output: null,
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
                { messageId: "useSentenceCase", data: { suggestion: "Open settings" } },
            ],
        },
        {
            name: "the fix changes only the string behind as, satisfies or a non-null assertion",
            code: "new Notice('Open Daily Note' as string); createEl('div', { text: 'Open Daily Note' as const }); el.setText(`Open Daily Note` satisfies string); el.title = 'Open Daily Note'!;",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Open daily note' as string); createEl('div', { text: 'Open daily note' as const }); el.setText(`Open daily note` satisfies string); el.title = 'Open daily note'!;",
            errors: [
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
            ],
        },
        {
            name: "a word after a number is a later word",
            code: "new Notice('2 Files selected'); new Notice('10x Faster');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('2 files selected'); new Notice('10x faster');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "2 files selected" } },
                { messageId: "useSentenceCase", data: { suggestion: "10x faster" } },
            ],
        },
        {
            name: "a mixed-case acronym in another case is fixed to its listed casing",
            code: "new Notice('Sign in with oauth'); new Notice('Sign in with OAUTH');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Sign in with OAuth'); new Notice('Sign in with OAuth');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Sign in with OAuth" } },
                { messageId: "useSentenceCase", data: { suggestion: "Sign in with OAuth" } },
            ],
        },
        {
            name: "a brand that is also an ordinary word is not rewritten from one casing to the other",
            code: "new Notice('Close All windows'); new Notice('Close All Windows'); new Notice('Import From NOTION');",
            options: [{ allowAutoFix: true }],
            output: "new Notice('Close all windows'); new Notice('Close all Windows'); new Notice('Import from Notion');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Close all windows" } },
                { messageId: "useSentenceCase", data: { suggestion: "Close all Windows" } },
                { messageId: "useSentenceCase", data: { suggestion: "Import from Notion" } },
            ],
        },
        {
            name: "an A that is not part of a time format is still lowercased",
            code: "new Notice('Create A new note'); new Setting(el).setDesc('Format: Create A New Note');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Create a new note" } },
                { messageId: "useSentenceCase", data: { suggestion: "Format: Create a new note" } },
            ],
        },
        {
            name: "a version number or a brand with a dot does not make the text a path",
            code: "new Notice('Version 1.2 Released'); new Notice('Install Node.js First');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "Version 1.2 released" } },
                { messageId: "useSentenceCase", data: { suggestion: "Install Node.js first" } },
            ],
        },
        {
            name: "a later word after a bullet or a label is still checked",
            code: "new Notice('- Open Settings'); new Notice('[Beta] Feature Flags'); new Notice('Get 10x Faster');",
            errors: [
                { messageId: "useSentenceCase", data: { suggestion: "- Open settings" } },
                { messageId: "useSentenceCase", data: { suggestion: "[Beta] Feature flags" } },
                { messageId: "useSentenceCase", data: { suggestion: "Get 10x faster" } },
            ],
        },
        {
            name: "with type information, title and placeholder are checked on an element, the document, and a type that says nothing",
            code: [
                "declare const div: HTMLDivElement; div.title = 'Open Daily Note';",
                "declare const input: HTMLInputElement; input.placeholder = 'Enter Name';",
                "declare const svg: SVGSVGElement; (svg as unknown as { title: string }).title = 'x'; svg.dataset.x = 'x';",
                "declare const node: Element; node.title = 'Open Daily Note';",
                "document.title = 'Open Daily Note';",
                "declare const maybe: HTMLElement | undefined; maybe!.title = 'Open Daily Note';",
                "function set<T extends HTMLElement>(e: T) { e.title = 'Open Daily Note'; }",
                "declare const both: HTMLElement & { extra: true }; both.title = 'Open Daily Note';",
                "declare const fm: any; fm.title = 'Untitled Note';",
                "declare const u: unknown; u.title = 'Untitled Note';",
                "undeclared.title = 'Untitled Note';",
                "class MyView extends HTMLElement { init() { this.title = 'Open Daily Note'; } }",
                "function any<T>(e: T) { (e as T & { title: string }).title = 'Open Daily Note'; }",
            ].join("\n"),
            errors: [
                { messageId: "useSentenceCase", line: 1 },
                { messageId: "useSentenceCase", line: 2 },
                { messageId: "useSentenceCase", line: 4 },
                { messageId: "useSentenceCase", line: 5 },
                { messageId: "useSentenceCase", line: 6 },
                { messageId: "useSentenceCase", line: 7 },
                { messageId: "useSentenceCase", line: 8 },
                { messageId: "useSentenceCase", line: 9 },
                { messageId: "useSentenceCase", line: 10 },
                { messageId: "useSentenceCase", line: 11 },
                { messageId: "useSentenceCase", line: 12 },
                { messageId: "useSentenceCase", line: 13 },
            ],
        },
        {
            name: "a DOM text property is still checked",
            code: "el.title = 'Open Daily Note'; el.ariaLabel = 'Open Daily Note'; el.ariaDescription = 'Open Daily Note'; el.innerText = 'Open Daily Note'; document.title = 'Open Daily Note'; el.dataset = 'Open Daily Note' as never; el.title ||= 'Open Daily Note';",
            errors: [
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
                { messageId: "useSentenceCase" },
            ],
        },
    ],
});

// Without type information the rule cannot tell an element from another
// object, so every title and placeholder assignment is checked. The default
// config has a project, so it is reset for this tester.
RuleTester.resetDefaultConfig();
try {
    new RuleTester({ languageOptions: { parser } }).run("ui-sentence-case without type information", rule, {
        valid: [],
        invalid: [
            {
                name: "title and placeholder on any object are checked",
                code: "declare const frontmatter: { title: string }; frontmatter.title = 'Untitled Note'; declare const opts: { placeholder?: string }; opts.placeholder = 'Enter Name';",
                errors: [
                    { messageId: "useSentenceCase", data: { suggestion: "Untitled note" } },
                    { messageId: "useSentenceCase", data: { suggestion: "Enter name" } },
                ],
            },
        ],
    });
} finally {
    RuleTester.resetDefaultConfig();
    RuleTester.setDefaultConfig(typedRuleTesterConfig);
}

// The value the fixed template literal holds, read back from the fixed source:
// a CRLF line break in a template is read as LF, so the fix gives it no "\r".
describe("ui-sentence-case fix of a template literal in a CRLF file", () => {
    it("holds the suggestion as its value", () => {
        const { output } = new Linter().verifyAndFix("new Notice(`Open The\r\nSettings Now`);\r\n", [{
            files: ["**/*.ts"],
            languageOptions: { parser },
            plugins: { o: { rules: { "sentence-case": rule as unknown as Rule.RuleModule } } },
            rules: { "o/sentence-case": ["warn", { allowAutoFix: true }] },
        }], "file.ts");
        const statement = parse(output).body[0];
        assert.ok(
            statement.type === AST_NODE_TYPES.ExpressionStatement &&
                statement.expression.type === AST_NODE_TYPES.NewExpression,
        );
        const template = statement.expression.arguments[0];
        assert.ok(template.type === AST_NODE_TYPES.TemplateLiteral);
        assert.strictEqual(template.quasis[0].value.cooked, "Open the\nsettings now");
    });
});
