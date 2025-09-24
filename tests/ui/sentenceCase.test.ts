import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/ui/sentenceCase.js";

const tester = new RuleTester();

tester.run("ui-sentence-case", rule, {
  valid: [
    { code: "new Notice('Enable auto-reveal');" },
    { code: "this.addCommand({ id: 'x', name: 'Export as PDF' });" },
    { code: "new Setting(el).setName('Enable auto-reveal');" },
    { code: "btn.setTooltip('Connect to GitHub');" },
    { code: "el.setAttribute('aria-label', 'Open settings');" },
    { code: "el.setAttribute('placeholder', 'Enter name');" },
    { code: "createEl('div', { text: 'Save to Google Drive' });" },
    { code: "menuItem.setTitle('Open Obsidian Publish');" },
    { code: "createEl('div', { title: 'Open settings' });" },
    { code: "createEl('div', { attr: { 'aria-label': 'Open settings' as const } });" },
    { code: "new Notice('Export as PDF');" },
    { code: "button.setText('Connect to GitHub');" },
    { code: "new Notice('Ctrl+S');" },
    { code: "new Notice('v1.2.3');" },
    { code: "new Notice('ERROR_404');" },
    { code: "new Notice('OK');" },
    { code: "el.textContent = 'Open settings';" },
    { code: "new Notice('Hello. World.');" },
    { code: "new Notice('AutoReveal option');" },
    { code: "new Notice('Visit U.S. Embassy');" },
    { code: "new Notice('50% AutoReveal');" },
    {
      code: "new Notice('Enable Auto-Reveal');",
      options: [{ ignoreRegex: ['Auto-Reveal'] }],
    },
    {
      code: "class V extends ItemView { getDisplayText() { if (true) { return 'Open settings'; } return 'Open settings'; } }",
    },
  ],
  invalid: [
    {
      code: "new Notice('Enable Auto Reveal');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "this.addCommand({ id: 'x', name: 'Save To Google Drive' });",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "createEl('div', { title: 'Open Settings' });",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "btn.setTooltip('Connect To GitHub');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "el.setAttribute('placeholder', 'Enter Name');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('EXPORT AS PDF');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "class V extends ItemView { getDisplayText() { return 'Open Settings'; } }",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "el.textContent = 'Open Settings';",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "createEl('div', { attr: { 'aria-label': 'Open Settings' } });",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "createEl('div', { nested: { title: 'Open Settings' } });",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "el.placeholder = 'Enter Name';",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "class V extends ItemView { getDisplayText() { if (true) { return 'Open Settings'; } return 'Open settings'; } }",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('Enable 2fa');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('Enable 2FA');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('First Line\\nSecond Line');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('First line\\nsecond line');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('Hello. WORLD.');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('Hello. World.');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('github API access');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('GitHub API access');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('50% Complete');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('50% complete');",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      code: "new Notice('Visit U.S. EMBASSY');",
      options: [{ allowAutoFix: true }],
      output: "new Notice('Visit U.S. Embassy');",
      errors: [{ messageId: "useSentenceCase" }],
    },
  ],
});
