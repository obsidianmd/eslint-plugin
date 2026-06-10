import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import { restrictedImportsOptions } from "../lib/ruleOptions.js";

// We configure `@typescript-eslint/no-restricted-imports` rather than the core
// `no-restricted-imports` rule so that `allowTypeImports` is honored for the
// `moment` entry. The TS parser (default in this RuleTester) is also required to
// parse the `import type` syntax exercised below.
const rule = tseslintPlugin.rules["no-restricted-imports"];

const ruleTester = new RuleTester();

ruleTester.run("no-restricted-imports", rule, {
    valid: [
        {
            name: "importing obsidian is allowed",
            code: "import { Plugin } from 'obsidian';",
            options: restrictedImportsOptions,
        },
        {
            name: "importing the moment value from obsidian is allowed",
            code: "import { moment } from 'obsidian';",
            options: restrictedImportsOptions,
        },
        {
            name: "type-only import of Moment from moment is allowed",
            code: "import type { Moment } from 'moment';",
            options: restrictedImportsOptions,
        },
        {
            name: "inline type-only import of Moment from moment is allowed",
            code: "import { type Moment } from 'moment';",
            options: restrictedImportsOptions,
        },
    ],
    invalid: [
        {
            name: "value import of moment is forbidden",
            code: "import moment from 'moment';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "named value import from moment is forbidden",
            code: "import { duration } from 'moment';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing axios is forbidden",
            code: "import axios from 'axios';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing got is forbidden",
            code: "import got from 'got';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing node-fetch is forbidden",
            code: "import fetch from 'node-fetch';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing ky is forbidden",
            code: "import ky from 'ky';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing ofetch is forbidden",
            code: "import { ofetch } from 'ofetch';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
        {
            name: "importing superagent is forbidden",
            code: "import superagent from 'superagent';",
            options: restrictedImportsOptions,
            errors: [{ messageId: "pathWithCustomMessage" }],
        },
    ],
});
