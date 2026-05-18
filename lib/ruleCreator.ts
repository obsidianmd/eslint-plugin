import { ESLintUtils } from "@typescript-eslint/utils";

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

export const ruleCreator = ESLintUtils.RuleCreator.withoutDocs;
