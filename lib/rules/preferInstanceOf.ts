import { TSESTree, ESLintUtils } from "@typescript-eslint/utils";

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

// DOM and browser built-in classes that should use .instanceOf() due to pop-out window prototype differences
const DOM_CLASSES = new Set([
    // DOM Elements
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLButtonElement",
    "HTMLAnchorElement",
    "HTMLDivElement",
    "HTMLSpanElement",
    "HTMLFormElement",
    "HTMLImageElement",
    "HTMLCanvasElement",
    "HTMLVideoElement",
    "HTMLAudioElement",
    "HTMLSelectElement",
    "HTMLOptionElement",
    "HTMLTableElement",
    "HTMLTableRowElement",
    "HTMLTableCellElement",
    "HTMLHeadingElement",
    "HTMLParagraphElement",
    "HTMLPreElement",
    "HTMLLIElement",
    "HTMLUListElement",
    "HTMLOListElement",
    "SVGElement",
    "Element",
    "Node",
    "Document",
    "DocumentFragment",
    "Text",
    "Comment",
    // Events
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "FocusEvent",
    "InputEvent",
    "WheelEvent",
    "TouchEvent",
    "PointerEvent",
    "DragEvent",
    "ClipboardEvent",
    "UIEvent",
    "CustomEvent",
    // Other browser built-ins
    "Window",
    "Range",
    "Selection",
    "NodeList",
    "HTMLCollection",
    "DOMRect",
    "DOMRectReadOnly",
    "MutationRecord",
    "IntersectionObserverEntry",
    "ResizeObserverEntry",
]);

export default ruleCreator({
    name: "prefer-instance-of",
    meta: {
        docs: {
            description:
                "Prefer .instanceOf() method over instanceof operator for DOM classes in pop-out window compatible code.",
            url: "https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines",
        },
        type: "suggestion" as const,
        messages: {
            useInstanceOfMethod:
                "Use '{{expression}}.instanceOf({{className}})' instead of 'instanceof {{className}}' for pop-out window compatibility. DOM prototypes differ between windows.",
        },
        fixable: "code" as const,
        schema: [],
    },
    defaultOptions: [],
    create: (context) => {
        return {
            BinaryExpression(node: TSESTree.BinaryExpression) {
                if (node.operator !== "instanceof") {
                    return;
                }

                // Check if the right side is an identifier that's a DOM class
                if (node.right.type !== "Identifier") {
                    return;
                }

                const className = node.right.name;

                if (!DOM_CLASSES.has(className)) {
                    return;
                }

                const sourceCode = context.sourceCode;
                const leftText = sourceCode.getText(node.left);

                context.report({
                    node,
                    messageId: "useInstanceOfMethod",
                    data: {
                        expression: leftText,
                        className,
                    },
                    fix: (fixer) => {
                        // Need to wrap complex expressions in parentheses
                        const needsParens =
                            node.left.type === "BinaryExpression" ||
                            node.left.type === "LogicalExpression" ||
                            node.left.type === "ConditionalExpression" ||
                            node.left.type === "AssignmentExpression" ||
                            node.left.type === "SequenceExpression";

                        const wrappedLeft = needsParens
                            ? `(${leftText})`
                            : leftText;

                        return fixer.replaceText(
                            node,
                            `${wrappedLeft}.instanceOf(${className})`,
                        );
                    },
                });
            },
        };
    },
});
