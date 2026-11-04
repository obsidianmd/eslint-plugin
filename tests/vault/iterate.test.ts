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
        {
            name: "find() or getFiles() named by a computed key is not checked",
            code: `
                const find = "filter";
                vault.getFiles()[find](f => f.path === path);
                vault.getFiles()["find"](f => f.path === path);
                vault[getFiles]().find(f => f.path === path);
            `,
        },
        // Look-alikes of the optional and the destructured forms.
        {
            name: "an optional chain to a path that is not the file's is allowed",
            code: `
                vault.getFiles().find(f => f?.parent?.path === folder.path);
                vault.getFiles().find(f => f?.parent.path === folder.path);
                vault.getFiles().find(f => other?.path === path);
                vault.getFiles().find(f => f?.path === f?.name);
                vault.getFiles().find(f => f?.path !== path);
                vault.getFiles().find(f => f?.["path"] === path);
            `,
        },
        {
            name: "a destructured property other than the path, or a path compared with the file, is allowed",
            code: `
                vault.getFiles().find(({ name }) => name === target);
                vault.getFiles().find(({ name: path }) => path === target);
                vault.getFiles().find(({ parent }) => parent.path === folder.path);
                vault.getFiles().find(({ path, parent }) => path === parent.path);
                vault.getFiles().find(({ path }) => path === path);
                vault.getFiles().find(({ path: { length } }) => length === 3);
                vault.getFiles().find(({ path = fallback }) => path === target);
                vault.getFiles().find(({ ["path"]: p }) => p === target);
                vault.getFiles().find(({ [path]: p }) => p === target);
                vault.getFiles().find(({ ...rest }) => rest.path === target);
                vault.getFiles().find(([path]) => path === target);
                vault.getFiles().find(({ path } = file) => path === target);
            `,
        },
        {
            name: "a destructured path that the comparison does not read is allowed",
            code: `
                vault.getFiles().find(({ path }) => { const path2 = path; return path2 === target; });
                vault.getFiles().find(({ path }) => other.path === target);
            `,
        },
        {
            name: "an async optional or destructured predicate is allowed",
            code: `
                vault.getFiles().find(async (f) => f?.path === path);
                vault.getFiles().find(async ({ path }) => path === target);
            `,
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
            name: "the path read through an optional chain is forbidden",
            code: `
                vault.getFiles().find(f => f?.path === p);
                this.app.vault.getFiles().find((file) => p == file?.path);
                vault.getFiles().find(function (f) { return f?.path === p; });
            `,
            errors: [
                { messageId: "iterate", line: 2 },
                { messageId: "iterate", line: 3 },
                { messageId: "iterate", line: 4 },
            ],
        },
        {
            name: "a destructured path is forbidden",
            code: `
                vault.getFiles().find(({ path }) => path === p);
                this.app.vault.getFiles().find(({ path }: TFile) => normalizePath(target) == path);
                vault.getFiles().find(({ path: filePath }) => filePath === p);
                vault.getFiles().find(({ path, name }) => { return path === other.path; });
                vault.getFiles().find(function ({ path }) { return p === path; });
            `,
            errors: [
                { messageId: "iterate", line: 2 },
                { messageId: "iterate", line: 3 },
                { messageId: "iterate", line: 4 },
                { messageId: "iterate", line: 5 },
                { messageId: "iterate", line: 6 },
            ],
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
