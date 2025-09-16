import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/ui/sentenceCaseLocaleModule.js";

const tester = new RuleTester();

tester.run("ui-sentence-case-locale-module", rule, {
  valid: [
    {
      filename: "en.ts",
      code: "export default { pdf: 'Export as PDF', github: 'Connect to GitHub' };",
    },
    {
      filename: "locales/en/module.ts",
      code: "export const enUS = { autoReveal: 'Enable auto-reveal' };",
    },
    {
      filename: "en.ts",
      code: "const strings = { open: 'Open settings' } as const; export default strings;",
    },
    {
      filename: "en.ts",
      code: "export default { items: ['Open settings'] };",
    },
  ],
  invalid: [
    {
      filename: "en.ts",
      code: "export default { autoReveal: 'Enable Auto Reveal' };",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      filename: "en.ts",
      code: "const strings = { autoReveal: 'Enable Auto Reveal' } as const; export default strings;",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      filename: "en.ts",
      code: "export default { items: ['Enable Auto Reveal'] };",
      errors: [{ messageId: "useSentenceCase" }],
    },
    {
      filename: "en.ts",
      code: "export const en = { nested: { label: 'Enable Auto Reveal' as const } } satisfies LocaleStrings;",
      errors: [{ messageId: "useSentenceCase" }],
    },
  ],
});
