import { getManifest } from "../manifest.js";
import { TSESTree } from "@typescript-eslint/utils";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

type Options = [{ isDesktopOnly?: boolean }?];

/**
 * Whether a regex source contains a lookbehind group. Escaped characters and character classes are
 * skipped, because `\(?<=` and `[(?<!]` match those characters literally and parse everywhere.
 */
function hasLookbehind(pattern: string): boolean {
    let inClass = false;
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (char === "\\") {
            i++;
        } else if (inClass) {
            if (char === "]") {
                inClass = false;
            }
        } else if (char === "[") {
            inClass = true;
        } else if (
            pattern.startsWith("(?<", i) &&
            (pattern[i + 3] === "=" || pattern[i + 3] === "!")
        ) {
            return true;
        }
    }
    return false;
}

export default ruleCreator<Options, "lookbehind">({
    meta: {
        docs: {
            description:
                "Using lookbehinds in Regex is not supported in some iOS versions",
            url: docsUrl("regex-lookbehind"),
        },
        type: "problem" as const,
        messages: {
            lookbehind:
                "Lookbehinds are not supported on iOS versions before 16.4.",
        },
        schema: [
            {
                type: "object",
                properties: {
                    isDesktopOnly: {
                        type: "boolean",
                        description: "Whether the plugin is desktop-only. Defaults to manifest.json isDesktopOnly.",
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const isDesktopOnly = options.isDesktopOnly ?? getManifest()?.isDesktopOnly;
        return {
            Literal(node: TSESTree.Literal) {
                // Check RegExp literals
                if (
                    "regex" in node &&
                    node.regex &&
                    typeof node.regex.pattern === "string"
                ) {
                    if (hasLookbehind(node.regex.pattern)) {
                        if (!isDesktopOnly) {
                            context.report({
                                node,
                                messageId: "lookbehind",
                            });
                        }
                    }
                }
                // Also check string literals (for RegExp constructor)
                if (
                    typeof node.value === "string" &&
                    hasLookbehind(node.value)
                ) {
                    if (!isDesktopOnly) {
                        context.report({
                            node,
                            messageId: "lookbehind",
                        });
                    }
                }
            },
        };
    },
});
