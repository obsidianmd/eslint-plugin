import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// We want to catch patterns like:
//
// const styleSheet = document.createElement('link');
// styleSheet.rel = 'stylesheet';
// styleSheet.href = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/styles.css`);
// document.head.appendChild(styleSheet);
//
// or
//
// const style = document.createElement('style');
// style.textContent = `Some CSS here`;
// document.head.appendChild(style);

/**
 * Mapping from element tag name to expected type.
 */
const FORBIDDEN_ELEMENT_TYPES = ["link", "style"];

function isForbiddenCreateElementCall(node: TSESTree.CallExpression): string | undefined {
    // we are looking for document.createElement(...)
    if (!(
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "createElement" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "document"
    )) {
        return undefined;
    }

    if (node.arguments.length === 0) { 
        return undefined;
    }
    return isArgumentForbiddenElement(node.arguments[0]);
}

function isForbiddenCreateElCall(node: TSESTree.CallExpression): string | undefined {
    // we are looking for foo.createEl(...)

    if (!(
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "createEl" &&
        (node.callee.object.type === "Identifier" || node.callee.object.type === "MemberExpression")
    )) {
        return undefined;
    }

    if (node.arguments.length === 0) { 
        return undefined;
    }
    return isArgumentForbiddenElement(node.arguments[0]);
}

function isArgumentForbiddenElement(arg: TSESTree.CallExpressionArgument): string | undefined {
    if (arg.type === "Literal" && typeof arg.value === "string") {
        const tagName = arg.value.toLowerCase();
        for (const forbiddenTagName of FORBIDDEN_ELEMENT_TYPES) {
            if (tagName === forbiddenTagName) {
                return tagName;
            }
        }
    }

    return undefined;
}


export default ruleCreator({
    name: "no-forbidden-elements",
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow attachment of forbidden elements to the DOM in Obsidian plugins.",
        },
        schema: [],
        messages: {
            doNotAttachForbiddenElements: "Creating and attaching \"{{element}}\" elements is not allowed.",
            doNotAttachForbiddenStyleElements: "Creating and attaching \"{{element}}\" elements is not allowed. For loading CSS, use a \"styles.css\" file instead, which Obsidian loads for you.",
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node: TSESTree.CallExpression) {
                const element = isForbiddenCreateElementCall(node) ?? isForbiddenCreateElCall(node);
                if (element === "style" || element === "link") {
                    context.report({
                        node,
                        messageId: "doNotAttachForbiddenStyleElements",
                        data: {
                            element,
                        }
                    });
                } else if (element) {
                    context.report({
                        node,
                        messageId: "doNotAttachForbiddenElements",
                        data: {
                            element,
                        }
                    });
                }
            },
        };
    },
});
