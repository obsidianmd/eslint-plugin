import { RuleTester } from "@typescript-eslint/rule-tester";
import type { RuleModule } from "@typescript-eslint/utils/ts-eslint";
import globals from "globals";
import { builtinRules } from "eslint/use-at-your-own-risk";

const noUndefRule = builtinRules.get("no-undef")! as unknown as RuleModule<string, readonly unknown[]>;

const obsidianGlobals = {
	DomElementInfo: "readonly",
	activeDocument: "readonly",
	activeWindow: "readonly",
	ajax: "readonly",
	ajaxPromise: "readonly",
	createDiv: "readonly",
	createEl: "readonly",
	createFragment: "readonly",
	createSpan: "readonly",
	createSvg: "readonly",
	fish: "readonly",
	fishAll: "readonly",
	isBoolean: "readonly",
	nextFrame: "readonly",
	ready: "readonly",
	sleep: "readonly"
} as const;

const desktopRuleTester = new RuleTester({
	languageOptions: {
		globals: {
			...globals.browser,
			...globals.node,
			NodeJS: "readonly",
			...obsidianGlobals
		}
	}
});

const browserRuleTester = new RuleTester({
	languageOptions: {
		globals: {
			...globals.browser,
			...obsidianGlobals
		}
	}
});

const obsidianValid = [
	{
		code: "let domElementInfo: DomElementInfo;",
	},
	{
		code: "activeDocument;",
	},
	{
		code: "activeWindow;",
	},
	{
		code: "ajax({ url: 'test' });",
	},
	{
		code: "ajaxPromise({ url: 'test' });",
	},
	{
		code: "createDiv();",
	},
	{
		code: "createEl('p');",
	},
	{
		code: "createFragment(() => {});",
	},
	{
		code: "createSpan();",
	},
	{
		code: "createSvg('svg');",
	},
	{
		code: "fish('.my-selector');",
	},
	{
		code: "fishAll('.my-selector');",
	},
	{
		code: "isBoolean(true)",
	},
	{
		code: "nextFrame(() => {});",
	},
	{
		code: "ready(() => {});",
	},
	{
		code: "sleep(1000);",
	}
];

const browserValid = [
	{
		code: "console",
	},
	{
		code: "document",
	},
	{
		code: "window",
	},
];

desktopRuleTester.run("no-undef (desktop-only)", noUndefRule, {
	valid: [
		...obsidianValid,
		...browserValid,
		{
			code: "require('path');",
		},
		{
			code: "process.env.NODE_ENV;",
		},
		{
			code: "__dirname;",
		},
		{
			code: "__filename;",
		},
		{
			code: "setImmediate(() => {});",
		}
	],
	invalid: [
		{
			code: "undefinedGlobal;",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "someUndefinedFunction();",
			errors: [{ messageId: "undef" }],
		}
	],
});

browserRuleTester.run("no-undef (browser)", noUndefRule, {
	valid: [
		...obsidianValid,
		...browserValid,
	],
	invalid: [
		{
			code: "undefinedGlobal;",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "someUndefinedFunction();",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "require('path');",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "process.env.NODE_ENV;",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "__dirname;",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "__filename;",
			errors: [{ messageId: "undef" }],
		},
		{
			code: "setImmediate(() => {});",
			errors: [{ messageId: "undef" }],
		}
	],
});
