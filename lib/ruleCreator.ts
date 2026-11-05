import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";

/**
 * Base URL for rule documentation.
 * Update this single constant when migrating docs to a new host.
 */
const DOCS_BASE_URL =
	"https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules";

export function docsUrl(name: string, subdir?: string) {
	const prefix = subdir ? `${DOCS_BASE_URL}/${subdir}` : DOCS_BASE_URL;
	return `${prefix}/${name}.md`;
}

/**
 * Whether ESLint parsed the file being linted as JavaScript or TypeScript.
 *
 * The recommended config also lints package.json, manifest.json and LICENSE
 * with other languages, and a rule enabled without `files` reaches them too.
 * Their AST is a `Document`, not a `Program`. A TS file without type
 * information is still a `Program`, so a type-aware rule keeps throwing there.
 */
export function isJsProgram(context: { sourceCode: { ast: unknown } }): boolean {
	return (context.sourceCode.ast as { type?: unknown }).type === "Program";
}

/**
 * The `meta.docs` fields this plugin's rules may set besides `description` and
 * `url`.
 */
export interface PluginDocs {
	/**
	 * The rule calls getParserServices() without a fallback, so it throws on a
	 * file linted without type information. eslint-doc-generator reads it to
	 * mark the rule as needing type information in the README and the rule doc.
	 */
	requiresTypeChecking?: boolean;
}

/**
 * Creates a JavaScript/TypeScript rule. Every rule made here returns no
 * visitors for a file in another language, so a type-aware rule does not throw
 * from getParserServices() and abort the whole lint run on LICENSE or
 * manifest.json.
 */
export function ruleCreator<Options extends readonly unknown[], MessageIds extends string>(
	rule: Readonly<ESLintUtils.RuleWithMeta<Options, MessageIds, PluginDocs>>,
): TSESLint.RuleModule<MessageIds, Options, PluginDocs> {
	return ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
		...rule,
		create(context, optionsWithDefault) {
			return isJsProgram(context) ? rule.create(context, optionsWithDefault) : {};
		},
	});
}
