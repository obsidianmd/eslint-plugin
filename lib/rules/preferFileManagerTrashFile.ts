import { type TSESLint, TSESTree } from "@typescript-eslint/utils";
import { getParserServices } from "@typescript-eslint/utils/eslint-utils";
import type ts from "typescript";
import { type MinAppVersionOptions, minAppVersionSchema, supportsVersion } from "../minAppVersion.js";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

const BANNED_METHODS = new Set(["trash", "delete"]);

// The Obsidian version that added FileManager.trashFile().
const TRASH_FILE_SINCE = "1.6.6";

type MessageIds = "preferTrashFile" | "useTrashFile" | "useTrashFileSince";

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
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer FileManager.trashFile() over Vault.trash() or Vault.delete() to respect user settings.",
            url: docsUrl("prefer-file-manager-trash-file"),
            requiresTypeChecking: true,
        },
        schema: minAppVersionSchema,
        hasSuggestions: true,
        messages: {
            preferTrashFile:
                "Use 'FileManager.trashFile()' instead of 'Vault.{{methodName}}()' to respect the user's file deletion preference.",
            useTrashFile:
                "Replace with `fileManager.trashFile()`, which follows the user's \"Deleted files\" setting.",
            useTrashFileSince:
                "Replace with `fileManager.trashFile()`, which follows the user's \"Deleted files\" setting (needs Obsidian {{since}} or later).",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const services = getParserServices(context);
        const checker = services.program.getTypeChecker();
        const sourceCode = context.sourceCode;
        const supported = supportsVersion(context.options[0]?.minAppVersion, TRASH_FILE_SINCE);

        // `x.fileManager.trashFile(file)` for `x.vault.trash(file, system)` or
        // `x.vault.delete(file, force)`: the receiver must be `<expr>.vault`,
        // with a `fileManager` that has trashFile() on `<expr>`'s type. The
        // second argument is dropped, so only one without side effects.
        function suggestion(
            node: TSESTree.CallExpression,
            callee: TSESTree.MemberExpression,
        ): TSESLint.SuggestionReportDescriptor<MessageIds>[] {
            const vault = callee.object;
            if (
                supported === false ||
                vault.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                vault.computed ||
                vault.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                vault.property.name !== "vault" ||
                !hasTrashFile(vault.object)
            ) {
                return [];
            }
            const [file, extra, ...rest] = node.arguments;
            if (
                file === undefined ||
                rest.length > 0 ||
                file.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
                (extra !== undefined && !isWithoutSideEffects(extra))
            ) {
                return [];
            }
            const method = callee.property;
            const removed = extra === undefined ? null : extraArgumentRange(node, file);
            if (removed === undefined) {
                return [];
            }
            const fix = (fixer: TSESLint.RuleFixer) => [
                fixer.replaceText(vault.property, "fileManager"),
                fixer.replaceText(method, renamedMethod(method)),
                ...(removed ? [fixer.removeRange(removed)] : []),
            ];
            return [
                supported === undefined
                    ? { messageId: "useTrashFileSince", data: { since: TRASH_FILE_SINCE }, fix }
                    : { messageId: "useTrashFile", fix },
            ];
        }

        // Whether `fileManager.trashFile` is there on the type of `receiver`,
        // as on Obsidian's App from 1.6.6.
        function hasTrashFile(receiver: TSESTree.Expression): boolean {
            const tsNode = services.esTreeNodeToTSNodeMap.get(receiver);
            const receiverType = checker.getNonNullableType(checker.getTypeAtLocation(tsNode));
            const fileManager = checker.getPropertyOfType(receiverType, "fileManager");
            if (!fileManager) {
                return false;
            }
            const fileManagerType: ts.Type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(fileManager, tsNode));
            return checker.getPropertyOfType(fileManagerType, "trashFile") !== undefined;
        }

        // `trash` -> `trashFile`, keeping a computed key's quotes.
        function renamedMethod(method: TSESTree.Expression | TSESTree.PrivateIdentifier): string {
            if (method.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return "trashFile";
            }
            const quote = sourceCode.getText(method)[0];
            return `${quote}trashFile${quote}`;
        }

        // The `, system` after `file`, through the parentheses around it and
        // up to any trailing comma; undefined when a comment is in it.
        function extraArgumentRange(
            node: TSESTree.CallExpression,
            file: TSESTree.Node,
        ): [number, number] | undefined {
            const comma = sourceCode.getTokenAfter(file, { filter: (token) => token.value === "," });
            const closing = sourceCode.getLastToken(node);
            let last = closing && sourceCode.getTokenBefore(closing);
            if (last?.value === ",") {
                last = sourceCode.getTokenBefore(last);
            }
            if (!comma || !last || last.range[1] <= comma.range[1] || sourceCode.commentsExistBetween(comma, last)) {
                return undefined;
            }
            return [comma.range[0], last.range[1]];
        }

        return {
            CallExpression(node: TSESTree.CallExpression) {
                const callee = node.callee;
                if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) {
                    return;
                }

                const methodName = getPropertyName(callee);
                if (methodName === undefined || !BANNED_METHODS.has(methodName)) {
                    return;
                }

                // Now, check the type of the object (`vault` in `vault.trash()`),
                // without null and undefined: `Vault | null`, an optional
                // `vault?: Vault` and `plugin?.app.vault` (typed
                // `Vault | undefined` inside the chain) are unions, which have
                // no symbol of their own.
                const objectType = checker.getNonNullableType(services.getTypeAtLocation(callee.object));
                const symbol = objectType.getSymbol();

                // Check if the symbol's name is 'Vault'. This is robust and
                // works even if the type is imported from 'obsidian'.
                if (symbol?.name === "Vault") {
                    context.report({
                        node: callee.property, // Highlight the method name (`trash` or `delete`)
                        messageId: "preferTrashFile",
                        data: {
                            methodName,
                        },
                        suggest: suggestion(node, callee),
                    });
                }
            },
        };
    },
});

// A literal, or a variable read: dropping it drops no side effect.
function isWithoutSideEffects(node: TSESTree.CallExpressionArgument): boolean {
    return (
        node.type === TSESTree.AST_NODE_TYPES.Literal ||
        node.type === TSESTree.AST_NODE_TYPES.Identifier ||
        (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0)
    );
}
