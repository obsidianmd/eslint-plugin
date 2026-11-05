import type { JSONRuleDefinition } from "@eslint/json";
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

// The optional fields the community directory knows. `helpUrl` is not in the
// developer docs' manifest reference, but the community scanner accepts it and
// many published plugins carry it.
const OPTIONAL_SCHEMA = {
    authorUrl: "string",
    fundingUrl: "string|object",
    helpUrl: "string",
};

// The text checks below follow the community scanner's manifest validation
// (obsidianmd/community-workers, src/worker/pluginManifest.ts), which decides
// whether a submission passes, so this rule is never stricter than the review.
// The id checks follow the developer docs' manifest reference, which the
// scanner does not check itself. They are opt-in (`checkId`): a published
// plugin's id can never change, as that would orphan every user's install,
// settings and hotkeys, so for most plugins they could never be acted on.

// The words the text checks single out: "obsidian" is the Obsidian trademark,
// and "plugin" is redundant in the plugin directory. `allowedWords` can drop
// either, per field.
const FORBIDDEN_WORDS = ["obsidian", "plugin"] as const;
type ForbiddenWord = (typeof FORBIDDEN_WORDS)[number];

// The fields the word checks apply to, and the only ones `allowedWords` can
// name.
const CHECKED_WORD_FIELDS = ["id", "name", "description"] as const;
type CheckedWordField = (typeof CHECKED_WORD_FIELDS)[number];

// Checks that can be switched off wholesale via the `ignore` option. Both are
// judgement calls about listing text rather than structural errors, so a repo
// may legitimately disagree with them; the structural checks are not ignorable.
// `noForbiddenWords` covers every word check, `descriptionFormat` the length,
// punctuation and name checks on the description.
const IGNORABLE_CHECKS = ["noForbiddenWords", "descriptionFormat"] as const;
type IgnorableCheck = (typeof IGNORABLE_CHECKS)[number];

// Parts of "Obsidian" a plugin name may not use either, besides a leading "ob".
const OBSIDIAN_FRAGMENTS = ["obsi", "sidian"];

// A description that talks about itself ("this plugin", "a plugin that")
// instead of saying what the plugin does. Mentioning plugins is fine otherwise:
// "Automatically reload plugins in development." passes.
const DESCRIPTION_SELF_REFERENCE =
    /\b(this\s+(obsidian\s+)?(plugin|tool|extension|add-?on|mod)\b|an?\s+(obsidian\s+)?plugin\s+(that|for|to|which)\b|the\s+plugin\s+\w)/i;

const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 250;

interface ValidateManifestOptions {
    /**
     * Whether to check the id, which must not contain "obsidian" or end with
     * "plugin". Off by default: only a plugin not yet published can act on it.
     */
    checkId?: boolean;
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
    | "mustBeRootObject"
    | "idObsidian"
    | "idEndsWithPlugin"
    | "nameObsidian"
    | "nameObsidianFragment"
    | "namePlugin"
    | "descriptionObsidian"
    | "descriptionSelfReference"
    | "descriptionTooShort"
    | "descriptionTooLong"
    | "descriptionPunctuation"
    | "descriptionSameAsName"
    | "descriptionStartsWithName";

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

// The word checks a field's value fails, as message ids. `allowed` holds the
// words `allowedWords` drops for this field; matching is case-insensitive.
function findWordProblems(
    field: CheckedWordField,
    value: string,
    allowed: string[] = [],
): MessageIds[] {
    const allowedLower = new Set(allowed.map((word) => word.toLowerCase()));
    const checks = (word: ForbiddenWord) => !allowedLower.has(word);
    const lower = value.toLowerCase();
    const problems: MessageIds[] = [];
    switch (field) {
        case "id":
            if (checks("obsidian") && lower.includes("obsidian")) {
                problems.push("idObsidian");
            }
            if (checks("plugin") && lower.endsWith("plugin")) {
                problems.push("idEndsWithPlugin");
            }
            break;
        case "name":
            if (checks("obsidian")) {
                if (lower.includes("obsidian")) {
                    problems.push("nameObsidian");
                } else if (
                    OBSIDIAN_FRAGMENTS.some((fragment) => lower.includes(fragment)) ||
                    lower.startsWith("ob")
                ) {
                    problems.push("nameObsidianFragment");
                }
            }
            if (checks("plugin") && lower.includes("plugin")) {
                problems.push("namePlugin");
            }
            break;
        case "description":
            if (checks("obsidian") && lower.includes("obsidian")) {
                problems.push("descriptionObsidian");
            }
            if (checks("plugin") && DESCRIPTION_SELF_REFERENCE.test(value)) {
                problems.push("descriptionSelfReference");
            }
            break;
    }
    return problems;
}

// The description checks it fails besides the word checks, as message ids:
// length, ending punctuation, and repeating the name.
function findDescriptionFormatProblems(description: string, name: string | undefined): MessageIds[] {
    const trimmed = description.trim();
    const problems: MessageIds[] = [];
    if (trimmed.length < DESCRIPTION_MIN_LENGTH) {
        problems.push("descriptionTooShort");
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
        problems.push("descriptionTooLong");
    }
    if (!/[.!?]$/.test(trimmed)) {
        problems.push("descriptionPunctuation");
    }
    if (name !== undefined) {
        const descriptionLower = trimmed.toLowerCase();
        const nameLower = name.trim().toLowerCase();
        if (descriptionLower === nameLower) {
            problems.push("descriptionSameAsName");
        } else if (nameLower.length > 0 && descriptionLower.startsWith(nameLower)) {
            problems.push("descriptionStartsWithName");
        }
    }
    return problems;
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
                    checkId: {
                        type: "boolean",
                        description:
                            "Also check that the plugin id does not contain 'obsidian' or end with 'plugin', as the developer docs ask of a new plugin. Off by default: a published plugin's id can never change, and the community scanner does not check it.",
                    },
                    allowedWords: {
                        type: "object",
                        description:
                            "Words ('obsidian', 'plugin') to stop checking for, per field, matched case-insensitively. The id is checked only with checkId.",
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
            mustBeRootObject: "The manifest must be a single JSON object.",
            idObsidian:
                "The plugin id must not contain \"obsidian\". Only a plugin that is not yet published can still change its id.",
            idEndsWithPlugin:
                "The plugin id must not end with \"plugin\". Only a plugin that is not yet published can still change its id.",
            nameObsidian: "Plugin name must not include the word \"Obsidian\".",
            nameObsidianFragment:
                "Plugin name must not include parts of the name \"Obsidian\" (\"obsi\", \"sidian\" or a leading \"ob\").",
            namePlugin:
                "Plugin name must not include the word \"Plugin\"; it is redundant in the plugin directory.",
            descriptionObsidian:
                "Plugin description must not include the word \"Obsidian\"; it is implied by the plugin directory.",
            descriptionSelfReference:
                "Plugin description should not refer to itself (e.g. \"this plugin\", \"a plugin that\"). It should describe what it does.",
            descriptionTooShort:
                "Plugin description is too short. A meaningful description of what the plugin does is required.",
            descriptionTooLong:
                "Plugin description exceeds the 250 character limit (currently {{length}} characters).",
            descriptionPunctuation:
                "Plugin description should end with punctuation (., !, or ?).",
            descriptionSameAsName:
                "Plugin description must not be the same as the plugin name.",
            descriptionStartsWithName:
                "Plugin description should not start with the plugin name.",
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
        // Null-prototype, so a manifest key naming an `Object.prototype`
        // member cannot resolve to one. The own-property check below is what
        // rejects such a key; this is the second line of defence.
        const allAllowedKeys: Record<string, string | undefined> = Object.assign(
            Object.create(null) as Record<string, string | undefined>,
            requiredKeys,
            OPTIONAL_SCHEMA,
        );

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
                    if (!Object.hasOwn(allAllowedKeys, key)) {
                        context.report({
                            node: member.name,
                            messageId: "disallowedKey",
                            data: { key },
                        });
                        continue;
                    }

                    const expectedType = allAllowedKeys[key];
                    if (!expectedType) continue;

                    const valueNode = member.value;
                    const actualType = getAstNodeType(valueNode);

                    if (expectedType.includes(actualType)) {
                        if (
                            valueNode.type === "String" &&
                            !ignored.has("noForbiddenWords") &&
                            isCheckedWordField(key) &&
                            (key !== "id" || options.checkId === true)
                        ) {
                            for (const messageId of findWordProblems(
                                key,
                                valueNode.value,
                                allowedWords[key],
                            )) {
                                context.report({ node: valueNode, messageId });
                            }
                        }

                        if (
                            valueNode.type === "String" &&
                            key === "description" &&
                            !ignored.has("descriptionFormat")
                        ) {
                            const nameValue = presentKeys.get("name")?.value;
                            const name =
                                nameValue?.type === "String" ? nameValue.value : undefined;
                            for (const messageId of findDescriptionFormatProblems(
                                valueNode.value,
                                name,
                            )) {
                                context.report({
                                    node: valueNode,
                                    messageId,
                                    data: { length: String(valueNode.value.length) },
                                });
                            }
                        }

                        // An empty fundingUrl string or object, and an empty
                        // entry, are accepted: the review checks only the URLs
                        // that are there, and an empty one gives no results.
                        if (key === "fundingUrl" && valueNode.type === "Object") {
                            const fundingKeys = new Set<string>();
                            for (const fundingMember of valueNode.members) {
                                const propKey = getMemberKey(fundingMember);

                                if (fundingKeys.has(propKey)) {
                                    context.report({
                                        node: fundingMember.name,
                                        messageId: "duplicateKey",
                                        data: { key: propKey },
                                    });
                                }

                                fundingKeys.add(propKey);

                                // Each labelled entry must be a string
                                if (getAstNodeType(fundingMember.value) !== "string") {
                                    context.report({
                                        node: fundingMember.value,
                                        messageId: "invalidFundingUrl",
                                    });
                                }
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
