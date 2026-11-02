import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslint from "typescript-eslint";
import plugin from "../lib/index.js";

// The recommended config runs typescript-eslint's no-deprecated with an allow
// list (#175). Run the rule with exactly the options the config sets, so the
// test follows the config rather than restating it.
type RuleEntry = string | [string, ...unknown[]];

// The entry from the block for TypeScript files: the non-code blocks turn the
// rule off through disableTypeChecked.
function noDeprecatedOptions(): unknown[] {
	let entry: RuleEntry | undefined;
	for (const block of plugin.configs.recommended) {
		const value = block.rules?.["@typescript-eslint/no-deprecated"] as RuleEntry | undefined;
		if (value !== undefined && block.files?.includes("**/*.{ts,cts,mts,tsx}")) {
			entry = value;
		}
	}
	return Array.isArray(entry) ? entry.slice(1) : [];
}

const rule = (tseslint.plugin as unknown as { rules: Record<string, Parameters<RuleTester["run"]>[1]> }).rules[
	"no-deprecated"
];
const options = noDeprecatedOptions();

new RuleTester().run("no-deprecated as configured", rule, {
	valid: [
		{
			name: "caretRangeFromPoint is allowed as the fallback for caretPositionFromPoint",
			code: "document.caretRangeFromPoint(0, 0);",
			options,
		},
		{
			name: "caretRangeFromPoint is allowed on any Document",
			code: "declare const doc: Document;\ndoc.caretRangeFromPoint(0, 0);",
			options,
		},
	],
	invalid: [
		{
			name: "other deprecated DOM APIs are still reported",
			code: "document.execCommand('copy');",
			options,
			errors: [{ messageId: "deprecatedWithReason" }],
		},
	],
});
