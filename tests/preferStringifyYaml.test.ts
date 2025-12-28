import { RuleTester } from "@typescript-eslint/rule-tester";
import preferStringifyYaml from "../lib/rules/preferStringifyYaml.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-stringify-yaml", preferStringifyYaml, {
    valid: [
        // Correct usage with stringifyYaml
        {
            code: `
import { stringifyYaml } from 'obsidian';
const yaml = stringifyYaml(data);
            `,
        },
        // Regular template literals
        { code: "const msg = `Hello ${name}`;" },
        { code: "const path = `${folder}/${file}`;" },
        // Regular string concatenation
        { code: "const str = 'hello' + 'world';" },
        { code: "const msg = 'Value: ' + value;" },
        // Importing other things
        { code: "import { parse } from 'yaml';" },
    ],
    invalid: [
        // Template literal frontmatter construction
        {
            code: `const fm = \`---
title: \${title}
---\``,
            errors: [{ messageId: "manualYamlConstruction" }],
        },
        // YAML key-value template
        {
            code: `const yaml = \`title: \${title}
author: \${author}\``,
            errors: [{ messageId: "manualYamlConstruction" }],
        },
        // String concatenation with YAML marker
        {
            code: `const fm = "---\\n" + content;`,
            errors: [{ messageId: "manualYamlConstruction" }],
        },
        // String concatenation with YAML key
        {
            code: "const line = 'title: ' + title;",
            errors: [{ messageId: "manualYamlConstruction" }],
        },
        // Importing yaml library for stringify
        {
            code: "import { stringify } from 'yaml';",
            errors: [{ messageId: "useStringifyYaml" }],
        },
        {
            code: "import { dump } from 'js-yaml';",
            errors: [{ messageId: "useStringifyYaml" }],
        },
        {
            code: "import yaml from 'yaml';",
            errors: [{ messageId: "useStringifyYaml" }],
        },
        {
            code: "import * as yaml from 'js-yaml';",
            errors: [{ messageId: "useStringifyYaml" }],
        },
    ],
});
