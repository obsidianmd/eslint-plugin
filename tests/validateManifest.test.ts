import { RuleTester } from "@typescript-eslint/rule-tester";
import manifestRule from "../lib/rules/validateManifest.js";

const ruleTester = new RuleTester();

ruleTester.run("validate-manifest", manifestRule, {
	valid: [
		{
			filename: "manifest.json",
			code: `{
                    "id": "obsidianifier",
                    "name": "Obsidianifier",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A way to obsidianify your life.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
		},
	],
	invalid: [
		{
			filename: "manifest.json",
			code: `{
                    "id": "my-plugin",
                    "name": "My Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great plugin.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
			errors: [
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "id" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "name" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "description" },
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{"name": "My Plugin"}`,
			errors: [
				{ messageId: "missingKey", data: { key: "author" } },
				{ messageId: "missingKey", data: { key: "minAppVersion" } },
				{ messageId: "missingKey", data: { key: "version" } },
				{ messageId: "missingKey", data: { key: "id" } },
				{ messageId: "missingKey", data: { key: "description" } },
				{ messageId: "missingKey", data: { key: "isDesktopOnly" } },
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "name" },
				},
			],
		},
		{
			filename: "manifest.json",
			code: `[]`, // Test for invalid root type
			errors: [{ messageId: "mustBeRootObject" }],
		},
		{
			filename: "manifest.json",
			code: `{
                    "id": "my-plugin",
                    "name": "My Obsidian Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great plugin.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
			errors: [
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "id" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "obsidian", key: "name" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "description" },
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
                    "id": "my-obsidian-plugin",
                    "name": "My Obsidian Plugin",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "description": "A great tool for Obsidian.",
                    "isDesktopOnly": false,
                    "authorUrl": "https://example.com"
                }`,
			errors: [
				{
					messageId: "noForbiddenWords",
					data: { word: "obsidian", key: "id" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "obsidian", key: "name" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "obsidian", key: "description" },
				},
			],
		},
	],
});
