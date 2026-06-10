import { TSESTree, TSESLint } from "@typescript-eslint/utils";
import { valid as semverValid } from "semver";
import { getManifest } from "../../manifest.js";

/**
 * The first Obsidian version that supports declarative settings
 * (`getSettingDefinitions()` and `PluginSettingTab#update()`).
 */
export const DECLARATIVE_MIN_VERSION = "1.13.0";

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
type ClassMember = TSESTree.MethodDefinition | TSESTree.PropertyDefinition;

/**
 * Whether `node` is a class that directly extends `PluginSettingTab`.
 *
 * Mirrors the detection used by the other settings-tab rules: only a bare
 * `Identifier` superclass is matched, so member-expression superclasses such as
 * `obsidian.PluginSettingTab` are intentionally out of scope.
 */
export function isPluginSettingTab(node: ClassNode): boolean {
    return (
        node.superClass?.type === TSESTree.AST_NODE_TYPES.Identifier &&
        node.superClass.name === "PluginSettingTab"
    );
}

/**
 * Find a member named `name` on the class body, covering both method
 * definitions (`display() {}`) and class fields holding a function
 * (`display = () => {}`). Returns the member node, or `null` if absent.
 */
export function findClassMember(
    node: ClassNode,
    name: string,
): ClassMember | null {
    for (const member of node.body.body) {
        if (
            member.type !== TSESTree.AST_NODE_TYPES.MethodDefinition &&
            member.type !== TSESTree.AST_NODE_TYPES.PropertyDefinition
        ) {
            continue;
        }
        if (member.computed) {
            continue;
        }
        const key = member.key;
        if (
            key.type === TSESTree.AST_NODE_TYPES.Identifier &&
            key.name === name
        ) {
            return member;
        }
        if (
            key.type === TSESTree.AST_NODE_TYPES.Literal &&
            key.value === name
        ) {
            return member;
        }
    }
    return null;
}

/**
 * Resolve the plugin's `minAppVersion`, preferring an explicit rule option and
 * falling back to `manifest.json`. Returns a valid semver string, or `null`
 * when it can't be determined or parsed (so callers can no-op rather than
 * throw on a malformed version).
 */
export function resolveMinAppVersion(
    context: TSESLint.RuleContext<string, readonly [{ minAppVersion?: string }?]>,
): string | null {
    const option = context.options[0]?.minAppVersion;
    const resolved = option ?? getManifest()?.minAppVersion;
    if (!resolved || !semverValid(resolved)) {
        return null;
    }
    return resolved;
}

/**
 * Shared schema for rules that accept a `minAppVersion` override.
 */
export const minAppVersionSchema = [
    {
        type: "object" as const,
        properties: {
            minAppVersion: {
                type: "string" as const,
                description:
                    "The minimum app version to check against. Defaults to manifest.json minAppVersion.",
            },
        },
        additionalProperties: false,
    },
];
