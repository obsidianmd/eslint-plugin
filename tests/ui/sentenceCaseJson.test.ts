import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import rule from "../../lib/rules/ui/sentenceCaseJson.js";
import { typedRuleTesterConfig } from "../setupRuleTester.js";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

const jsonRuleTesterConfig: RuleTesterConfig = {
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      extraFileExtensions: [".json"],
    },
  },
};

RuleTester.resetDefaultConfig();
RuleTester.setDefaultConfig(jsonRuleTesterConfig);

try {
  const tester = new RuleTester(jsonRuleTesterConfig);

  tester.run("ui-sentence-case-json", rule, {
    valid: [
      {
        filename: "en.json",
        code: '{"label":"Enable auto-reveal","save":"Save to Google Drive","pdf":"Export as PDF"}',
      },
      {
        filename: "en-US.json",
        code: '{"github":"Connect to GitHub","ok":"OK"}',
      },
      {
        filename: "en.json",
        code: '{"code":"`Enable Auto-Reveal`","html":"<b>Enable Auto-Reveal</b>","msg":"Hello, ${name}!"}',
      },
      {
        filename: "locales/en/common.json",
        code: '{"open":"Open settings"}',
      },
    ],
    invalid: [
      {
        filename: "en.json",
        code: '{"label":"Enable Auto-Reveal"}',
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en.json",
        code: '{"label":"Enable Auto-Reveal"}',
        output: '{"label":"Enable auto-reveal"}',
        options: [{ allowAutoFix: true }],
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "en-US.json",
        code: '{"save":"Save To Google Drive"}',
        errors: [{ messageId: "useSentenceCase" }],
      },
      {
        filename: "locales/en/common.json",
        code: '{"open":"Open Settings"}',
        errors: [{ messageId: "useSentenceCase" }],
      },
    ],
  });
} finally {
  RuleTester.resetDefaultConfig();
  RuleTester.setDefaultConfig(typedRuleTesterConfig);
}
