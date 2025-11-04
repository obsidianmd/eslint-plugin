import { type Linter, type Rule } from "eslint";

declare module 'eslint-plugin-obsidianmd' {
	export const meta: {
		name: string;
		version: string;
	};
	export const configs: {
		recommended: Linter.Config;
		recommendedWithLocalesEn: Linter.Config;
	};
	export const rules: {
		[key: string]: Rule.RuleModule;
	}
}
