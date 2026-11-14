import { TSESTree, TSESLint } from "@typescript-eslint/utils";
import { getManifest } from "../../manifest.js";
import { toVersion } from "../../minAppVersion.js";
import { staticMemberName } from "../../memberName.js";

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
 * (`display = () => {}`), under a name written as is, quoted or computed from
 * a string (`"display"() {}`, `["display"]() {}`). `[display]() {}` is named
 * by whatever the variable holds, so it is not the member. Returns the member
 * node, or `null` if absent.
 */
export function findClassMember(
    node: ClassNode,
    name: string,
): ClassMember | null {
    for (const member of node.body.body) {
        if (
            (member.type === TSESTree.AST_NODE_TYPES.MethodDefinition ||
                member.type === TSESTree.AST_NODE_TYPES.PropertyDefinition) &&
            staticMemberName(member) === name
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
    const resolved: unknown = option ?? getManifest()?.minAppVersion;
    // "1.13" is 1.13.0, as no-unsupported-api reads it.
    if ((typeof resolved !== "string" && typeof resolved !== "number") || resolved === "") {
        return null;
    }
    return toVersion(String(resolved)) ?? null;
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
