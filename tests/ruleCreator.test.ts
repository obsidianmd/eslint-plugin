import assert from "node:assert";
import json from "@eslint/json";
import { Linter } from "eslint";
import type { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, isJsProgram, ruleCreator } from "../lib/ruleCreator.js";
import { PlainTextLanguage } from "../lib/plainTextLanguage.js";

const DOCS = "https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules";

describe("docsUrl", () => {
    it("points at the rule's page under docs/rules", () => {
        assert.strictEqual(docsUrl("detach-leaves"), `${DOCS}/detach-leaves.md`);
    });

    it("puts a rule with a subdirectory under it", () => {
        assert.strictEqual(docsUrl("sentence-case", "ui"), `${DOCS}/ui/sentence-case.md`);
    });
});

describe("isJsProgram", () => {
    const of = (ast: unknown) => isJsProgram({ sourceCode: { ast } });

    it("is true for a JavaScript or TypeScript AST", () => {
        assert.strictEqual(of({ type: "Program" }), true);
    });

    it("is false for another language's root node", () => {
        assert.strictEqual(of({ type: "Document" }), false);
        assert.strictEqual(of({}), false);
    });
});

// A rule made by ruleCreator reports each identifier, with the option it was given.
const reportIdentifiers = ruleCreator<[{ prefix?: string }], "found">({
    name: "report-identifiers",
    meta: {
        type: "problem",
        docs: { description: "Reports identifiers." },
        schema: [{ type: "object", properties: { prefix: { type: "string" } }, additionalProperties: false }],
        messages: { found: "{{prefix}}{{name}}" },
    },
    defaultOptions: [{ prefix: "default:" }],
    create(context, [{ prefix }]) {
        return {
            Identifier(node: TSESTree.Identifier) {
                context.report({ node, messageId: "found", data: { prefix: prefix ?? "", name: node.name } });
            },
            // A JSON5 key is an Identifier as well; Document is the root of
            // every non-JavaScript language this plugin lints.
            Document() {
                context.report({ loc: { line: 1, column: 0 }, messageId: "found", data: { prefix: "", name: "Document" } });
            },
        };
    },
});

function lint(filename: string, code: string, config: Linter.Config, options?: unknown[]): string[] {
    return new Linter().verify(code, [
        {
            ...config,
            plugins: { ...config.plugins, test: { rules: { rule: reportIdentifiers as never } } },
            rules: { "test/rule": ["error", ...(options ?? [])] as Linter.RuleEntry },
        },
    ], filename).map((message) => message.message);
}

describe("ruleCreator", () => {
    it("runs the rule on JavaScript, with its default options", () => {
        assert.deepStrictEqual(lint("a.js", "foo;", { files: ["**/*.js"] }), ["default:foo"]);
    });

    it("passes the configured options over the defaults", () => {
        assert.deepStrictEqual(lint("a.js", "foo;", { files: ["**/*.js"] }, [{ prefix: "set:" }]), ["set:foo"]);
    });

    it("returns no visitors for JSON, including JSON5's identifier keys", () => {
        assert.deepStrictEqual(lint("a.json", "{ \"a\": 1 }", { files: ["**/*.json"], plugins: { json }, language: "json/json" }), []);
        assert.deepStrictEqual(lint("a.json5", "{ foo: 1 }", { files: ["**/*.json5"], plugins: { json }, language: "json/json5" }), []);
    });

    it("returns no visitors for plain text", () => {
        assert.deepStrictEqual(
            lint("LICENSE", "foo", {
                files: ["LICENSE"],
                plugins: { obsidianmd: { languages: { "plain-text": PlainTextLanguage } } },
                language: "obsidianmd/plain-text",
            }),
            [],
        );
    });

    it("keeps the rule's meta", () => {
        assert.strictEqual(reportIdentifiers.meta.messages.found, "{{prefix}}{{name}}");
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- the top-level defaultOptions, which typescript-eslint 8.35.1 reads (see PluginRule)
        assert.deepStrictEqual(reportIdentifiers.defaultOptions, [{ prefix: "default:" }]);
    });
});
