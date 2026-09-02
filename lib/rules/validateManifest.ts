import type { JSONRuleDefinition } from "@eslint/json/types";
import path from "node:path";
import { docsUrl } from "../ruleCreator.js";

const BASE_SCHEMA = {
    author: "string",
    minAppVersion: "string",
    name: "string",
    version: "string",
    id: "string",
    description: "string",
    isDesktopOnly: "boolean",
};

const OPTIONAL_SCHEMA = {
    authorUrl: "string",
    fundingUrl: "string|object",
};

const FORBIDDEN_WORDS = ["obsidian", "plugin"];

// The fields FORBIDDEN_WORDS applies to, and the only ones `allowedWords` can
// name.
const CHECKED_WORD_FIELDS = ["id", "name", "description"] as const;
type CheckedWordField = (typeof CHECKED_WORD_FIELDS)[number];

// Checks that can be switched off wholesale via the `ignore` option. Both are
// judgement calls about listing text rather than structural errors, so a repo
// may legitimately disagree with them; the structural checks are not ignorable.
const IGNORABLE_CHECKS = ["noForbiddenWords", "descriptionFormat"] as const;
type IgnorableCheck = (typeof IGNORABLE_CHECKS)[number];

// A description may contain any ordinary punctuation -- backticks, em dashes,
// parentheses, colons and slashes all appear in listings the directory has
// passed. What it may not contain is emoji, or invisible characters that make
// the text render differently than it reads.
const DISALLOWED_DESCRIPTION_CHARS = /[\p{Extended_Pictographic}\p{Cc}\p{Cf}\p{Cs}]/u;

interface ValidateManifestOptions {
    /**
     * Words to drop from the forbidden list, per field. Some findings can never
     * be acted on -- a published plugin id can never change, so a plugin whose
     * id contains "obsidian" carries it forever.
     */
    allowedWords?: Partial<Record<CheckedWordField, string[]>>;
    /** Checks to skip entirely. */
    ignore?: IgnorableCheck[];
}

type MessageIds =
    | "missingKey"
    | "invalidType"
    | "disallowedKey"
    | "duplicateKey"
    | "invalidFundingUrl"
    | "emptyFundingUrlObject"
    | "mustBeRootObject"
    | "noForbiddenWords"
    | "descriptionFormat";

// The manifest is strict JSON, so it is parsed by `@eslint/json` into a Momoa
// AST (Document -> Object -> Member), not into the ESTree shape the rest of the
// rules in this plugin see. `JSONRuleDefinition` types the visitor accordingly.
type ValidateManifestRuleDefinition = JSONRuleDefinition<{
    MessageIds: MessageIds;
    RuleOptions: [ValidateManifestOptions?];
}>;

// Momoa node types are the JSON spelling of the type; map them onto the names
// used by BASE_SCHEMA / OPTIONAL_SCHEMA. NaN and Infinity are JSON5-only, so
// they can never appear in a manifest and fall through to "unknown".
function getAstNodeType(node: { type: string }): string {
    switch (node.type) {
        case "String":
            return "string";
        case "Number":
            return "number";
        case "Boolean":
            return "boolean";
        case "Null":
            return "null";
        case "Object":
            return "object";
        case "Array":
            return "array";
        default:
            return "unknown";
    }
}

// A member key is a String in JSON and may be an Identifier in JSON5.
function getMemberKey(member: {
    name: { type: string; value?: string; name?: string };
}): string {
    return member.name.type === "Identifier"
        ? (member.name.name ?? "")
        : (member.name.value ?? "");
}

function isCheckedWordField(key: string): key is CheckedWordField {
    return (CHECKED_WORD_FIELDS as readonly string[]).includes(key);
}

function hasForbiddenWords(str: string, allowed: string[] = []): [boolean, string] {
    const forbiddenWordsFound = new Set<string>();
    const strLower = str.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
        if (allowed.includes(word)) {
            continue;
        }
        if (strLower.includes(word)) {
            forbiddenWordsFound.add(word);
        }
    }
    if (forbiddenWordsFound.size > 0) {
        return [true, Array.from(forbiddenWordsFound).sort().join("' or '")];
    }
    return [false, ""];
}

const rule: ValidateManifestRuleDefinition = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Validate the structure of manifest.json for Obsidian plugins.",
            url: docsUrl("validate-manifest"),
        },
        schema: [
            {
                type: "object",
                properties: {
                    allowedWords: {
                        type: "object",
                        description:
                            "Words to drop from the forbidden list, per field. Use this for findings that can never be acted on, such as a published plugin id that will always contain 'obsidian'.",
                        properties: Object.fromEntries(
                            CHECKED_WORD_FIELDS.map((field) => [
                                field,
                                {
                                    type: "array",
                                    description: `Forbidden words to allow in the manifest's '${field}'.`,
                                    items: { type: "string" },
                                },
                            ]),
                        ),
                        additionalProperties: false,
                    },
                    ignore: {
                        type: "array",
                        description:
                            "Checks to skip entirely. A manifest cannot carry an ignore marker of its own: a comment is a JSON parse error and would stop Obsidian loading the plugin, and an ignore key ships to every user and is itself reported as a disallowed key.",
                        items: { type: "string", enum: [...IGNORABLE_CHECKS] },
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            missingKey:
                "The manifest is missing the required '{{key}}' property.",
            invalidType:
                "The '{{key}}' property must be of type '{{expectedType}}', but was '{{actualType}}'.",
            disallowedKey:
                "The '{{key}}' property is not allowed in the manifest.",
            duplicateKey:
                "The '{{key}}' property is defined multiple times in the manifest.",
            invalidFundingUrl:
                "The 'fundingUrl' object must only contain string values.",
            emptyFundingUrlObject: "The 'fundingUrl' cannot be empty.",
            mustBeRootObject: "The manifest must be a single JSON object.",
            noForbiddenWords:
                "The '{{key}}' property cannot contain '{{word}}'.",
            descriptionFormat:
                "The 'description' property should be concise and follow the submission requirements.",
        },
    },
    create(context) {
        const filename = context.physicalFilename;
        if (!path.basename(filename).endsWith("manifest.json")) {
            return {};
        }

        const options = context.options[0] ?? {};
        const ignored = new Set<IgnorableCheck>(options.ignore ?? []);
        const allowedWords = options.allowedWords ?? {};

        const requiredKeys = BASE_SCHEMA;
        const allAllowedKeys = { ...requiredKeys, ...OPTIONAL_SCHEMA };

        return {
            Document(documentNode) {
                const node = documentNode.body;
                if (node.type !== "Object") {
                    context.report({
                        node: documentNode,
                        messageId: "mustBeRootObject",
                    });
                    return;
                }

                const members = node.members;
                // A later duplicate wins, so the type/word checks below run on
                // the last occurrence of each key.
                const presentKeys = new Map(
                    members.map((member) => [getMemberKey(member), member]),
                );

                // 1. Check for duplicate keys
                if (members.length !== presentKeys.size) {
                    const seenKeys = new Set<string>();
                    for (const member of members) {
                        const key = getMemberKey(member);
                        if (seenKeys.has(key)) {
                            context.report({
                                node: member.name,
                                messageId: "duplicateKey",
                                data: { key },
                            });
                        } else {
                            seenKeys.add(key);
                        }
                    }
                }

                // 2. Check for missing required keys
                for (const key of Object.keys(requiredKeys)) {
                    if (!presentKeys.has(key)) {
                        context.report({
                            node,
                            messageId: "missingKey",
                            data: { key },
                        });
                    }
                }

                // 3. Check types and disallowed keys
                for (const [key, member] of presentKeys.entries()) {
                    if (key && !(key in allAllowedKeys)) {
                        context.report({
                            node: member.name,
                            messageId: "disallowedKey",
                            data: { key },
                        });
                        continue;
                    }

                    const expectedType =
                        allAllowedKeys[key as keyof typeof allAllowedKeys];
                    if (!expectedType) continue;

                    const valueNode = member.value;
                    const actualType = getAstNodeType(valueNode);

                    if (expectedType.includes(actualType)) {
                        if (key === "fundingUrl") {
                            if (
                                actualType === "object" &&
                                valueNode.type === "Object"
                            ) {
                                if (valueNode.members.length > 0) {
                                    // Check for duplicate keys in fundingUrl
                                    const fundingKeys = new Set<string>();
                                    for (const fundingMember of valueNode.members) {
                                        const propKey =
                                            getMemberKey(fundingMember);

                                        if (fundingKeys.has(propKey)) {
                                            context.report({
                                                node: fundingMember.name,
                                                messageId: "duplicateKey",
                                                data: { key: propKey },
                                            });
                                        }

                                        fundingKeys.add(propKey);

                                        // Check if each property in fundingUrl is a string
                                        if (
                                            getAstNodeType(
                                                fundingMember.value,
                                            ) !== "string"
                                        ) {
                                            context.report({
                                                node: fundingMember.value,
                                                messageId: "invalidFundingUrl",
                                            });
                                        }

                                        // Check for empty string values
                                        if (
                                            fundingMember.value.type ===
                                            "String" &&
                                            fundingMember.value.value.length ===
                                            0
                                        ) {
                                            context.report({
                                                node: fundingMember.value,
                                                messageId:
                                                    "emptyFundingUrlObject",
                                            });
                                        }
                                    }
                                } else {
                                    // Check for empty fundingUrl object
                                    context.report({
                                        node: valueNode,
                                        messageId: "emptyFundingUrlObject",
                                    });
                                }
                            } else if (
                                actualType === "string" &&
                                valueNode.type === "String" &&
                                valueNode.value.length === 0
                            ) {
                                context.report({
                                    node: valueNode,
                                    messageId: "emptyFundingUrlObject",
                                });
                            }
                        } else if (
                            // check for forbidden words in specific string fields
                            actualType === "string" &&
                            valueNode.type === "String" &&
                            !ignored.has("noForbiddenWords") &&
                            isCheckedWordField(key) &&
                            hasForbiddenWords(
                                valueNode.value,
                                allowedWords[key],
                            )[0]
                        ) {
                            context.report({
                                node: valueNode,
                                messageId: "noForbiddenWords",
                                data: {
                                    word: hasForbiddenWords(
                                        valueNode.value,
                                        allowedWords[key],
                                    )[1],
                                    key,
                                },
                            });
                        } else if (
                            actualType === "string" &&
                            valueNode.type === "String" &&
                            key === "description" &&
                            !ignored.has("descriptionFormat")
                        ) {
                            // Check description format
                            const description = valueNode.value;
                            if (
                                // 10 characters min
                                description.length < 10 ||
                                // 250 characters max
                                description.length > 250 ||
                                // Should start with a capital letter
                                !description.match(/^[A-Z]/) ||
                                // Should end with a period
                                !description.endsWith(".") ||
                                // Should not contain emoji or invisible characters
                                DISALLOWED_DESCRIPTION_CHARS.test(description)
                            ) {
                                context.report({
                                    node: valueNode,
                                    messageId: "descriptionFormat",
                                });
                            }
                        }
                    } else {
                        context.report({
                            node: valueNode,
                            messageId: "invalidType",
                            data: {
                                key,
                                expectedType: expectedType.replace("|", " or "),
                                actualType,
                            },
                        });
                    }
                }
            },
        };
    },
};

export default rule;
