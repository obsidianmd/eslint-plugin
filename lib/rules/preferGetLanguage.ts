import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { getTypeInfo } from "../globalWindow.js";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../minAppVersion.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

// The Obsidian version that added getLanguage().
const GET_LANGUAGE_SINCE = "1.8.7";

type MessageIds = "localStorageLanguage" | "i18nextDetector" | "useGetLanguage" | "useGetLanguageSince";
type Scope = TSESLint.Scope.Scope;

// `x.name`, `x["name"]` or `` x[`name`] ``. A computed key such as `x[key]`
// names none that can be read.
function getPropertyName(node: TSESTree.MemberExpression): string | undefined {
    const property = node.property;
    if (!node.computed) {
        return property.type === TSESTree.AST_NODE_TYPES.Identifier ? property.name : undefined;
    }
    if (property.type === TSESTree.AST_NODE_TYPES.Literal && typeof property.value === "string") {
        return property.value;
    }
    if (property.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && property.expressions.length === 0) {
        return property.quasis[0].value.cooked ?? undefined;
    }
    return undefined;
}

export default ruleCreator<MinAppVersionOptions, MessageIds>({
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Prefer Obsidian's `getLanguage()` over `localStorage.getItem('language')` and `i18next-browser-languagedetector` for detecting the user's language.",
            url: docsUrl("prefer-get-language"),
        },
        schema: minAppVersionSchema,
        hasSuggestions: true,
        messages: {
            localStorageLanguage:
                "Use Obsidian's 'getLanguage()' instead of 'localStorage.getItem(\"language\")' to detect the user's language.",
            i18nextDetector:
                "Use Obsidian's 'getLanguage()' instead of 'i18next-browser-languagedetector' to detect the user's language.",
            useGetLanguage:
                "Replace with `getLanguage()` from \"obsidian\", which returns \"en\" rather than null when no language is set.",
            useGetLanguageSince:
                "Replace with `getLanguage()` from \"obsidian\", which returns \"en\" rather than null when no language is set (needs Obsidian {{since}} or later).",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const sourceCode = context.sourceCode;
        const supported = supportsVersion(context.options[0]?.minAppVersion, GET_LANGUAGE_SINCE);

        // Below 1.8.7 there is no getLanguage(), and reading the language
        // from localStorage, which getLanguage() wraps, is the way to do it.
        if (supported === false) {
            return {};
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                if (!isLocalStorageGetItemLanguage(node)) {
                    return;
                }

                context.report({
                    node,
                    messageId: "localStorageLanguage",
                    suggest: suggestion(node),
                });
            },

            ImportDeclaration(node: TSESTree.ImportDeclaration) {
                if (node.source.value === "i18next-browser-languagedetector") {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },

            // Also catch require('i18next-browser-languagedetector')
            'CallExpression[callee.name="require"]'(node: TSESTree.CallExpression) {
                const firstArg = node.arguments[0];
                if (
                    firstArg &&
                    firstArg.type === TSESTree.AST_NODE_TYPES.Literal &&
                    firstArg.value === "i18next-browser-languagedetector"
                ) {
                    context.report({
                        node,
                        messageId: "i18nextDetector",
                    });
                }
            },
        };

        // `getLanguage()` in place of the call, with `getLanguage` added to an
        // `import { … } from "obsidian"`, or imported after the last import.
        function suggestion(node: TSESTree.CallExpression): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
            const callee = node.callee as TSESTree.MemberExpression;
            if (
                // Dropping the storage, or another argument, must drop no side effect.
                node.arguments.length !== 1 ||
                !isPlainReceiver(callee.object) ||
                sourceCode.getCommentsInside(node).length > 0
            ) {
                return [];
            }
            const binding = getLanguageBinding(node);
            if (binding === "unavailable") {
                return [];
            }
            const program = sourceCode.ast;
            const imports = program.body.filter(
                (statement): statement is TSESTree.ImportDeclaration => statement.type === TSESTree.AST_NODE_TYPES.ImportDeclaration,
            );
            const addImport = binding === "imported" ? null : importFix(imports);
            if (addImport === undefined || !typingsHaveGetLanguage(imports)) {
                return [];
            }
            const fix = (fixer: TSESLint.RuleFixer) => [
                fixer.replaceText(node, "getLanguage()"),
                ...(addImport ? [addImport(fixer)] : []),
            ];
            return [
                supported === undefined
                    ? { messageId: "useGetLanguageSince", data: { since: GET_LANGUAGE_SINCE }, fix }
                    : { messageId: "useGetLanguage", fix },
            ];
        }

        // Whether `getLanguage` at `node` is already Obsidian's, imported by
        // that name; free to import; or something else that has the name.
        // getLanguage imported under another name is left alone too.
        function getLanguageBinding(node: TSESTree.Node): "imported" | "free" | "unavailable" {
            for (const statement of sourceCode.ast.body) {
                if (!isObsidianImport(statement)) {
                    continue;
                }
                for (const specifier of statement.specifiers) {
                    if (
                        specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
                        importedName(specifier) === "getLanguage" &&
                        specifier.local.name !== "getLanguage"
                    ) {
                        return "unavailable";
                    }
                }
            }
            let scope: Scope | null = sourceCode.getScope(node);
            while (scope) {
                const variable = scope.set.get("getLanguage");
                if (variable && variable.defs.length > 0) {
                    const def = variable.defs[0];
                    const isObsidiansOwn =
                        variable.defs.length === 1 &&
                        def.type === "ImportBinding" &&
                        def.node.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
                        importedName(def.node) === "getLanguage" &&
                        def.node.importKind !== "type" &&
                        isObsidianImport(def.parent);
                    return isObsidiansOwn ? "imported" : "unavailable";
                }
                scope = scope.upper;
            }
            return "free";
        }

        // How to add `getLanguage` to the imports: into the braces of the first
        // `import { … } from "obsidian"` that imports values, or else as an
        // import of its own after the last one. undefined when the file has no
        // import to go by, such as a CommonJS file.
        function importFix(
            imports: TSESTree.ImportDeclaration[],
        ): ((fixer: TSESLint.RuleFixer) => TSESLint.RuleFix) | undefined {
            const target = imports.find(
                (declaration) =>
                    isObsidianImport(declaration) &&
                    declaration.specifiers.some((specifier) => specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier),
            );
            if (target) {
                const specifiers = target.specifiers.filter(
                    (specifier): specifier is TSESTree.ImportSpecifier => specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier,
                );
                const last = specifiers[specifiers.length - 1];
                const closing = sourceCode.getTokenAfter(last, { filter: (token) => token.value === "}" });
                if (closing && closing.loc.start.line !== last.loc.end.line) {
                    // One name per line: the new one on a line of its own.
                    const indent = /^\s*/.exec(sourceCode.lines[last.loc.start.line - 1])?.[0] ?? "";
                    return (fixer) => fixer.insertTextAfter(last, `,${lineBreakAfter(last)}${indent}getLanguage`);
                }
                return (fixer) => fixer.insertTextAfter(last, ", getLanguage");
            }
            const lastImport = imports[imports.length - 1];
            if (!lastImport) {
                return undefined;
            }
            const quote = sourceCode.getText(lastImport.source)[0];
            const semicolon = sourceCode.getLastToken(lastImport)?.value === ";" ? ";" : "";
            // After a comment that ends the line of the last import.
            const next = sourceCode.getTokenAfter(lastImport, { includeComments: true });
            const anchor =
                next && next.type === "Line" && next.loc.start.line === lastImport.loc.end.line ? next : lastImport;
            const text = `${lineBreakAfter(anchor)}import { getLanguage } from ${quote}obsidian${quote}${semicolon}`;
            return (fixer) => fixer.insertTextAfter(anchor, text);
        }

        // The line break the file uses after `node`.
        function lineBreakAfter(node: TSESTree.Node | TSESTree.Token): string {
            return /\r\n|\r|\n/.exec(sourceCode.text.slice(node.range[1]))?.[0] ?? "\n";
        }

        // With type information, whether the plugin's obsidian typings export
        // getLanguage(), from the module the file imports or else the one
        // "obsidian" resolves to. Without type information, true.
        function typingsHaveGetLanguage(imports: TSESTree.ImportDeclaration[]): boolean {
            const types = getTypeInfo(context);
            const program = sourceCode.parserServices?.program;
            if (!types || !program) {
                return true;
            }
            const obsidianImport = imports.find(isObsidianImport);
            let moduleSymbol = obsidianImport && types.checker.getSymbolAtLocation(types.toTs(obsidianImport.source));
            if (!obsidianImport) {
                const resolved = ts.resolveModuleName("obsidian", context.filename, program.getCompilerOptions(), ts.sys)
                    .resolvedModule?.resolvedFileName;
                const file = resolved === undefined ? undefined : program.getSourceFile(resolved);
                moduleSymbol = file && types.checker.getSymbolAtLocation(file);
            }
            return moduleSymbol !== undefined && types.checker.getExportsOfModule(moduleSymbol).some((symbol) => symbol.name === "getLanguage");
        }

        function isLocalStorageGetItemLanguage(node: TSESTree.CallExpression): boolean {
            const callee = node.callee;
            if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                return false;
            }

            // Check .getItem('language')
            if (getPropertyName(callee) !== "getItem") {
                return false;
            }

            const firstArg = node.arguments[0];
            if (
                !firstArg ||
                firstArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                firstArg.value !== "language"
            ) {
                return false;
            }

            // Check localStorage (direct or via variable)
            const obj = callee.object;
            if (obj.type === TSESTree.AST_NODE_TYPES.Identifier && obj.name === "localStorage") {
                return true;
            }

            // window.localStorage.getItem('language')
            if (
                obj.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                getPropertyName(obj) === "localStorage"
            ) {
                return true;
            }

            return false;
        }
    },
});

function isObsidianImport(node: TSESTree.Node): node is TSESTree.ImportDeclaration {
    return (
        node.type === TSESTree.AST_NODE_TYPES.ImportDeclaration &&
        node.source.value === "obsidian" &&
        node.importKind !== "type"
    );
}

// The name an import specifier takes from the module: `a` in `{ a as b }`,
// also when written as a string, `{ "a" as b }`.
function importedName(specifier: TSESTree.ImportSpecifier): string {
    return specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier
        ? specifier.imported.name
        : String(specifier.imported.value);
}

// The storage the call reads, as variables and properties only, so that
// dropping it drops no side effect: `localStorage`, `window.localStorage`,
// `this.win?.localStorage`.
function isPlainReceiver(node: TSESTree.Node): boolean {
    switch (node.type) {
        case TSESTree.AST_NODE_TYPES.Identifier:
        case TSESTree.AST_NODE_TYPES.ThisExpression:
            return true;
        case TSESTree.AST_NODE_TYPES.MemberExpression:
            return (
                (!node.computed || node.property.type === TSESTree.AST_NODE_TYPES.Literal) &&
                isPlainReceiver(node.object)
            );
        case TSESTree.AST_NODE_TYPES.TSNonNullExpression:
        case TSESTree.AST_NODE_TYPES.TSAsExpression:
            return isPlainReceiver(node.expression);
        default:
            return false;
    }
}
