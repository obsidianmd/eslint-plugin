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

// The suggestion. getFileByPath() came with Obsidian 1.5.7; this repo's
// manifest.json says 0.15.0, so the version is given as an option.
const since = [{ minAppVersion: "1.5.7" }] as const;
const offered = (output: string) => [{ messageId: "useGetFileByPath" as const, output }];

ruleTester.run("vault-iterate suggestions", vaultIterateRule, {
    valid: [],
    invalid: [
        {
            name: "find() by path becomes getFileByPath()",
            code: "export const file = this.app.vault.getFiles().find(f => f.path === path);",
            options: since,
            errors: [{ messageId: "iterate", suggestions: offered("export const file = this.app.vault.getFileByPath(path);") }],
        },
        {
            name: "the path on either side, ==, a block body, a function expression and a destructured path",
            code: [
                "app.vault.getFiles().find((file) => target == file.path);",
                "vault.getFiles().find((f) => { return f?.path === p; });",
                "vault.getFiles().find(function (f) { return f.path === p; });",
                "vault.getFiles().find(({ path: filePath }) => filePath === p);",
            ].join("\n"),
            options: since,
            errors: [
                { messageId: "iterate", line: 1, suggestions: offered(["app.vault.getFileByPath(target);", "vault.getFiles().find((f) => { return f?.path === p; });", "vault.getFiles().find(function (f) { return f.path === p; });", "vault.getFiles().find(({ path: filePath }) => filePath === p);"].join("\n")) },
                { messageId: "iterate", line: 2, suggestions: offered(["app.vault.getFiles().find((file) => target == file.path);", "vault.getFileByPath(p);", "vault.getFiles().find(function (f) { return f.path === p; });", "vault.getFiles().find(({ path: filePath }) => filePath === p);"].join("\n")) },
                { messageId: "iterate", line: 3, suggestions: offered(["app.vault.getFiles().find((file) => target == file.path);", "vault.getFiles().find((f) => { return f?.path === p; });", "vault.getFileByPath(p);", "vault.getFiles().find(({ path: filePath }) => filePath === p);"].join("\n")) },
                { messageId: "iterate", line: 4, suggestions: offered(["app.vault.getFiles().find((file) => target == file.path);", "vault.getFiles().find((f) => { return f?.path === p; });", "vault.getFiles().find(function (f) { return f.path === p; });", "vault.getFileByPath(p);"].join("\n")) },
            ],
        },
        {
            name: "a path built from variables, properties and literals",
            code: "export const a = vault.getFiles().find(f => f.path === `${this.folder}/${name}.md`); export const b = vault.getFiles().find(f => f.path === dir + \"/\" + settings.file);",
            options: since,
            errors: [
                { messageId: "iterate", suggestions: offered("export const a = vault.getFileByPath(`${this.folder}/${name}.md`); export const b = vault.getFiles().find(f => f.path === dir + \"/\" + settings.file);") },
                { messageId: "iterate", suggestions: offered("export const a = vault.getFiles().find(f => f.path === `${this.folder}/${name}.md`); export const b = vault.getFileByPath(dir + \"/\" + settings.file);") },
            ],
        },
        {
            name: "?. before and after, and parentheses and comments in the path, are kept",
            code: "export const name = this.app?.vault.getFiles().find(f => f.path === (dir + /* sep */ \"/a.md\"))?.basename;",
            options: since,
            errors: [{ messageId: "iterate", suggestions: offered("export const name = this.app?.vault.getFileByPath((dir + /* sep */ \"/a.md\"))?.basename;") }],
        },
        {
            name: "CRLF line endings are kept",
            code: "export const file = this.app.vault\r\n    .getFiles()\r\n    .find((f) => f.path === path);\r\n",
            options: since,
            errors: [{ messageId: "iterate", suggestions: offered("export const file = this.app.vault\r\n    .getFileByPath(path);\r\n") }],
        },
        {
            name: "a result tested for null-ish values only",
            code: "const file = vault.getFiles().find(f => f.path === p); if (!file || file == undefined) { throw new Error(); } export { file };",
            options: since,
            errors: [{ messageId: "iterate", suggestions: offered("const file = vault.getFileByPath(p); if (!file || file == undefined) { throw new Error(); } export { file };") }],
        },
        {
            name: "a minAppVersion that is not a version: the suggestion says what it needs",
            code: "vault.getFiles().find(f => f.path === p);",
            options: [{ minAppVersion: "latest" }],
            errors: [{
                messageId: "iterate",
                suggestions: [{ messageId: "useGetFileByPathSince", data: { since: "1.5.7" }, output: "vault.getFileByPath(p);" }],
            }],
        },
        // Nothing is offered:
        {
            name: "below 1.5.7, as this repo's manifest.json (0.15.0) is, or by the option",
            code: "vault.getFiles().find(f => f.path === p); vault.getFiles().find(f => f.path === q);",
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "with a minAppVersion option below 1.5.7",
            code: "vault.getFiles().find(f => f.path === p);",
            options: [{ minAppVersion: "1.5.6" }],
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
        {
            name: "where reading the path may do something else: a call or an assignment",
            code: "vault.getFiles().find(f => f.path === normalizePath(p)); vault.getFiles().find(f => f.path === this.getPath()); vault.getFiles().find(f => f.path === (last = p));",
            options: since,
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "where the path reads the function expression's own this, arguments or name",
            code: "vault.getFiles().find(function (f) { return f.path === this.target; }); vault.getFiles().find(function (f) { return f.path === arguments[2]; }); vault.getFiles().find(function self(f) { return f.path === self.name; });",
            options: since,
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "with a thisArg for find()",
            code: "vault.getFiles().find(f => f.path === p, context);",
            options: since,
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
        {
            name: "with a comment that would be lost",
            code: "vault.getFiles().find(f => /* by path */ f.path === p); vault.getFiles(/* all */).find(f => f.path === p);",
            options: since,
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "where the code compares the result with undefined",
            code: [
                "if (vault.getFiles().find(f => f.path === p) === undefined) { throw new Error(); }",
                "const a = vault.getFiles().find(f => f.path === p); if (a !== undefined) { a; }",
                "const b = vault.getFiles().find(f => f.path === p); if (typeof b === 'undefined') { b; }",
            ].join("\n"),
            options: since,
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "where the variable it is kept in is set again",
            code: "let file = vault.getFiles().find(f => f.path === p); file = undefined; export { file };",
            options: since,
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
    ],
});

// With Obsidian's own typings, the types decide.
const header = `import { App, TFile } from "obsidian";
declare const app: App;
declare const p: string;
`;

ruleTester.run("vault-iterate suggestions with obsidian typings", vaultIterateRule, {
    valid: [],
    invalid: [
        {
            name: "the suggestion is offered where nothing needs undefined",
            code: header + "export const file: TFile | null | undefined = app.vault.getFiles().find(f => f.path === p);\nexport const name: string = (app.vault.getFiles().find(f => f.path === p) ?? { name: '' }).name;",
            options: since,
            errors: [
                { messageId: "iterate", suggestions: offered(header + "export const file: TFile | null | undefined = app.vault.getFileByPath(p);\nexport const name: string = (app.vault.getFiles().find(f => f.path === p) ?? { name: '' }).name;") },
                { messageId: "iterate", suggestions: offered(header + "export const file: TFile | null | undefined = app.vault.getFiles().find(f => f.path === p);\nexport const name: string = (app.vault.getFileByPath(p) ?? { name: '' }).name;") },
            ],
        },
        {
            name: "nothing is offered where undefined is accepted and null is not",
            code: header + [
                "export const a: TFile | undefined = app.vault.getFiles().find(f => f.path === p);",
                "export function b(): TFile | undefined { return app.vault.getFiles().find(f => f.path === p); }",
                "declare function take(file?: TFile): void;",
                "take(app.vault.getFiles().find(f => f.path === p));",
                "const c = app.vault.getFiles().find(f => f.path === p); take(c);",
            ].join("\n"),
            options: since,
            errors: [
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
                { messageId: "iterate", suggestions: [] },
            ],
        },
        {
            name: "nothing is offered where the path is not a string",
            code: header + "declare const maybe: string | undefined; export const file = app.vault.getFiles().find(f => f.path === maybe);",
            options: since,
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
    ],
});

// Typings from before getFileByPath(): "obsidian" is a stub without it.
const oldObsidianRuleTester = new RuleTester({
    languageOptions: {
        parserOptions: { project: "./tsconfig.json", tsconfigRootDir: `${process.cwd()}/tests/fixtures/old-obsidian` },
    },
});

oldObsidianRuleTester.run("vault-iterate with obsidian typings older than 1.5.7", vaultIterateRule, {
    valid: [],
    invalid: [
        {
            name: "nothing is offered",
            code: 'import { Vault } from "obsidian";\ndeclare const vault: Vault;\nexport const file = vault.getFiles().find(f => f.path === "a.md");\n',
            options: since,
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
    ],
});

// Without type information: a JavaScript file, and a TypeScript one whose
// annotation is all there is to go by.
const untypedRuleTester = new RuleTester({
    languageOptions: { parserOptions: { project: null, projectService: false } },
});

untypedRuleTester.run("vault-iterate without type information", vaultIterateRule, {
    valid: [],
    invalid: [
        {
            name: "a JavaScript file gets the suggestion",
            filename: "main.js",
            code: "module.exports.find = (app, p) => app.vault.getFiles().find((f) => f.path === p);\n",
            options: since,
            errors: [{ messageId: "iterate", suggestions: offered("module.exports.find = (app, p) => app.vault.getFileByPath(p);\n") }],
        },
        {
            name: "nothing is offered for a variable annotated with undefined but not null",
            code: "const file: TFile | undefined = vault.getFiles().find((f) => f.path === p); export { file };",
            options: since,
            errors: [{ messageId: "iterate", suggestions: [] }],
        },
    ],
});
