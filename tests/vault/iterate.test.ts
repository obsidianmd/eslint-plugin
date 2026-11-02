import { RuleTester } from "@typescript-eslint/rule-tester";
import vaultIterateRule from "../../lib/rules/vault/iterate.js";

const ruleTester = new RuleTester();

ruleTester.run("vault-iterate", vaultIterateRule, {
    valid: [
        {
            name: "find with non-path predicate is allowed",
            code: "vault.getFiles().find(f => f.size > 100);",
        },
        {
            name: "find with path comparison on another method is allowed",
            code: 'this.app.vault.getMarkdownFiles().find(f => f.path === "foo");',
        },
        {
            name: "find with path comparison on a property not named vault is allowed",
            code: 'this.app.store.getFiles().find(f => f.path === "foo");',
        },
        {
            name: "find with path comparison on a computed vault access is allowed",
            code: 'this.app["vault"].getFiles().find(f => f.path === "foo");',
        },
        {
            name: "find with path comparison on a computed member named by a variable is allowed",
            code: 'this.stores[vault].getFiles().find(f => f.path === "foo");',
        },
        {
            name: "find with a non-path predicate through this.app.vault is allowed",
            code: "this.app.vault.getFiles().find(f => f.stat.size > 100);",
        },
    ],
    invalid: [
        {
            name: "find with path comparison is forbidden",
            code: 'vault.getFiles().find(f => f.path === "foo");',
            errors: [{ messageId: "iterate" }],
        },
        {
            name: "find with path comparison through this.app.vault is forbidden",
            code: "this.app.vault.getFiles().find(f => f.path === path);",
            errors: [{ messageId: "iterate" }],
        },
        {
            name: "find with path comparison through app.vault is forbidden",
            code: "app.vault.getFiles().find((file) => file.path == target);",
            errors: [{ messageId: "iterate" }],
        },
        {
            name: "find with path comparison through plugin.app.vault is forbidden",
            code: 'plugin.app.vault.getFiles().find(f => f.path === "a.md");',
            errors: [{ messageId: "iterate" }],
        },
        {
            name: "find with path comparison through this.vault is forbidden",
            code: 'this.vault.getFiles().find(f => f.path === "a.md");',
            errors: [{ messageId: "iterate" }],
        },
    ],
});
