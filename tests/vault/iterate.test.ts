import assert from "node:assert";
import { RuleTester } from "@typescript-eslint/rule-tester";
import { Linter } from "eslint";
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
            name: "find with path comparison on getFiles() of an object not named vault is allowed",
            code: 'store.getFiles().find(f => f.path === "foo");',
        },
        {
            name: "filter() with a path comparison is allowed: it does not stop at one file",
            code: 'vault.getFiles().filter(f => f.path === "foo");',
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
        // Look-alikes: the predicate has to compare the file's own path with a
        // value that does not depend on the file.
        {
            name: "comparing the path of the file's parent is allowed",
            code: `
                vault.getFiles().find(f => folder.path === f.parent.path);
                vault.getFiles().find(f => f.parent?.path === folder.path);
                vault.getFiles().find(function (f) { return folder.path === f.parent.path; });
            `,
        },
        {
            name: "comparing a path that is not the file's is allowed",
            code: `
                vault.getFiles().find(f => other.path === target);
                vault.getFiles().find(f => target === other.path);
                vault.getFiles().find(f => f[path] === target);
            `,
        },
        {
            name: "comparing the path with a value built from the file is allowed",
            code: `
                vault.getFiles().find(f => \`\${f.parent?.path}/\${name}.md\` === f.path);
                vault.getFiles().find(f => f.path === \`\${f.parent?.path}/\${name}.md\`);
            `,
        },
        {
            name: "comparing the file's name rather than its path is allowed",
            code: 'vault.getFiles().find(f => f.name === "foo.md");',
        },
        {
            name: "a path that must differ is allowed",
            code: "vault.getFiles().find(f => f.path !== path);",
        },
        {
            name: "a predicate that does more than return the comparison is allowed",
            code: `
                vault.getFiles().find((f) => { seen.push(f); return f.path === path; });
                vault.getFiles().find((f) => { if (f.path === path) return true; return false; });
            `,
        },
        {
            name: "an async or generator predicate, which returns an object for every file, is allowed",
            code: `
                vault.getFiles().find(async (f) => f.path === path);
                vault.getFiles().find(async function (f) { return path === f.path; });
                vault.getFiles().find(function* (f) { return f.path === path; });
            `,
        },
        {
            name: "a predicate passed by name, a find() without one, or find() on something other than a call is not checked",
            code: `
                vault.getFiles().find(matchesPath);
                vault.getFiles().find();
                this.files.find((f) => f.path === path);
            `,
        },
        {
            name: "a predicate that is not the argument of find() is allowed",
            code: "check(f => f.path === path, vault.getFiles().find);",
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
        {
            name: "the path on the right is forbidden",
            code: `
                vault.getFiles().find(f => path === f.path);
                this.app.vault.getFiles().find((file: TFile) => normalizePath(target) == file.path);
            `,
            errors: [{ messageId: "iterate", line: 2 }, { messageId: "iterate", line: 3 }],
        },
        {
            name: "a block body that only returns the comparison is forbidden",
            code: `
                this.app.vault.getFiles().find((f) => { return f.path === path; });
                app.vault.getFiles().find((f) => { return other.path == f.path; });
            `,
            errors: [{ messageId: "iterate", line: 2 }, { messageId: "iterate", line: 3 }],
        },
        {
            name: "a function expression that only returns the comparison is forbidden",
            code: `
                this.app.vault.getFiles().find(function (f) { return f.path === path; });
                vault.getFiles().find(function (this: void, file: TFile) { return path == file.path; });
            `,
            errors: [{ messageId: "iterate", line: 2 }, { messageId: "iterate", line: 3 }],
        },
    ],
});

describe("vault-iterate message", () => {
    it("ends the message without a line break", () => {
        const messages = new Linter().verify("vault.getFiles().find((f) => f.path === path);", [{
            plugins: { o: { rules: { r: vaultIterateRule as never } } },
            rules: { "o/r": "error" },
        }]);
        assert.deepStrictEqual(messages.map((m) => m.message), [
            "Avoid iterating all files to find a file by its path",
        ]);
    });
});
