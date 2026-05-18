import { ESLintUtils } from "@typescript-eslint/utils";

/**
 * Base URL for rule documentation.
 * Update this single constant when migrating docs to a new host.
 */
const DOCS_BASE_URL =
	"https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules";

/**
 * Creates an ESLint rule creator for a given subdirectory.
 *
 * @param subdir - Optional subdirectory under `docs/rules/` (e.g. `"commands"`, `"ui"`).
 *                 Omit for rules at the root level.
 */
export function createRuleCreator(subdir?: string) {
	const prefix = subdir ? `${DOCS_BASE_URL}/${subdir}` : DOCS_BASE_URL;
	return ESLintUtils.RuleCreator(
		(name) => `${prefix}/${name}.md`,
	);
}

export const ruleCreator = createRuleCreator();
