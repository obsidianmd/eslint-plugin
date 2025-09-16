import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import rule from "../../lib/rules/ui/sentenceCaseJson.js";
import { typedRuleTesterConfig } from "../setupRuleTester";
import type { RuleTesterConfig } from "@typescript-eslint/rule-tester";

const jsonRuleTesterConfig: RuleTesterConfig = {
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      tsconfigRootDir: process.cwd(),
      extraFileExtensions: [".json"],
    },
  },
};

RuleTester.resetDefaultConfig();
RuleTester.setDefaultConfig(jsonRuleTesterConfig);

try {
  // Use a dedicated tester to avoid mutating the shared configuration
  const tester = new RuleTester(jsonRuleTesterConfig);

  const previousDebug = process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE;
  process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE = "1";

  try {
    tester.run("ui-sentence-case-json", rule, {
    valid: [
      {
        filename: "en.json",
        code: '{ "label": "Enable auto-reveal", "save": "Save to Google Drive", "pdf": "Export as PDF" }',
        
      },
      {
        filename: "en-US.json",
        code: '{ "github": "Connect to GitHub", "ok": "OK" }',
        
      },
      {
        filename: "en.json",
        code: '{ "code": "`Enable Auto-Reveal`", "html": "<b>Enable Auto-Reveal</b>", "msg": "Hello, ${name}!" }',
        
      },
      {
        filename: "locales/en/common.json",
        code: '{ "open": "Open settings" }',
        
      },
    ],
    invalid: [
      {
        filename: "en.json",
        code: '{ "label": "Enable Auto-Reveal" }',
        errors: [{ messageId: "useSentenceCase" }],
        
      },
      {
        filename: "en-US.json",
        code: '{ "save": "Save To Google Drive" }',
        errors: [{ messageId: "useSentenceCase" }],
        
      },
      {
        filename: "locales/en/common.json",
        code: '{ "open": "Open Settings" }',
        errors: [{ messageId: "useSentenceCase" }],
        
      },
    ],
    });
  } finally {
    if (previousDebug === undefined) {
      delete process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE;
    } else {
      process.env.OBSIDIANMD_DEBUG_SENTENCE_CASE = previousDebug;
    }
  }
} finally {
  RuleTester.resetDefaultConfig();
  RuleTester.setDefaultConfig(typedRuleTesterConfig);
}
