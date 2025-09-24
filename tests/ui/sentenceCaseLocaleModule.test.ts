import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import rule from "../../lib/rules/ui/sentenceCaseLocaleModule.js";
import { typedRuleTesterConfig } from "../setupRuleTester.js";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

const localeModuleRuleTesterConfig: RuleTesterConfig = {
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: "module",
  },
};

RuleTester.resetDefaultConfig();
RuleTester.setDefaultConfig(localeModuleRuleTesterConfig);

try {
  const tester = new RuleTester(localeModuleRuleTesterConfig);

  tester.run("ui-sentence-case-locale-module", rule, {
    valid: [
      {
        filename: "en.ts",
        code: `export default {
          pdf: "Export as PDF",
          github: "Connect to GitHub",
        };`,
      },
      {
        filename: "locales/en/module.ts",
        code: `export const enUS = {
          autoReveal: "Enable auto-reveal",
        };`,
      },
      {
        filename: "en.ts",
        code: `const strings = {
          open: "Open settings",
        } as const;
        export default strings;`,
      },
      {
        filename: "en.ts",
        code: `export default {
          items: ["Open settings"],
        };`,
      },
    ],
    invalid: [
      {
        filename: "en.ts",
        code: `export default {
          autoReveal: "Enable Auto Reveal",
        };`,
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en.ts",
        code: "export default { label: \"Enable Auto Reveal\" };",
        output: "export default { label: \"Enable auto reveal\" };",
        options: [{ allowAutoFix: true }],
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en.ts",
        code: `const strings = {
          autoReveal: "Enable Auto Reveal",
        } as const;
        export default strings;`,
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en.ts",
        code: `export default {
          items: ["Enable Auto Reveal"],
        };`,
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en.ts",
        code: `export const en = {
          nested: {
            label: "Enable Auto Reveal" as const,
          },
        };`,
        errors: [{ messageId: "useSentenceCase" }],
      },
    ],
  });
} finally {
  RuleTester.resetDefaultConfig();
  RuleTester.setDefaultConfig(typedRuleTesterConfig);
}
