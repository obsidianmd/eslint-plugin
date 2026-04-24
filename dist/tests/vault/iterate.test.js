import { RuleTester } from "@typescript-eslint/rule-tester";
import vaultIterateRule from "../../lib/rules/vault/iterate.js";
const ruleTester = new RuleTester();
ruleTester.run("vault-iterate", vaultIterateRule, {
    valid: [
        {
            name: "find with non-path predicate is allowed",
            code: "vault.getFiles().find(f => f.size > 100);",
        },
    ],
    invalid: [
        {
            name: "find with path comparison is forbidden",
            code: 'vault.getFiles().find(f => f.path === "foo");',
            errors: [{ messageId: "iterate" }],
        },
    ],
});
