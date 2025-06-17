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
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": "https://obsidian.md/pricing"
				}`,
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": "https://patreon.com/test"
					}
				}`,
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "valid-description",
					"name": "Valid description",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "This is a valid description.",
					"isDesktopOnly": false
				}`,
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "valid-description-with-periods",
					"name": "Valid description with periods",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "This description ends with a period.",
					"isDesktopOnly": false
				}`,
		},
	],
	invalid: [
		// Forbidden words tests
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
					data: { word: "obsidian' or 'plugin", key: "name" },
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
                    "name": "My Plugin",
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
					data: { word: "obsidian' or 'plugin", key: "id" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "plugin", key: "name" },
				},
				{
					messageId: "noForbiddenWords",
					data: { word: "obsidian", key: "description" },
				},
			],
		},
		// Structure validation tests
		{
			filename: "manifest.json",
			code: `[]`, // Test for invalid root type
			errors: [{ messageId: "mustBeRootObject" }],
		},
		// Type validation tests
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"authorUrl": 12345
				}`,
			errors: [
				{
					messageId: "invalidType",
					data: {
						key: "authorUrl",
						expectedType: "string",
						actualType: "number",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"authorUrl": null
				}`,
			errors: [
				{
					messageId: "invalidType",
					data: {
						key: "authorUrl",
						expectedType: "string",
						actualType: "null",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"authorUrl": {}
				}`,
			errors: [
				{
					messageId: "invalidType",
					data: {
						key: "authorUrl",
						expectedType: "string",
						actualType: "object",
					},
				},
			],
		},
		// FundingUrl tests
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": 12345
					}
				}`,
			errors: [
				{
					messageId: "invalidFundingUrl",
					data: {
						key: "patreon",
						expectedType: "string",
						actualType: "number",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {}
				}`,
			errors: [
				{
					messageId: "emptyFundingUrlObject",
					data: { key: "fundingUrl" },
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": ""
				}`,
			errors: [
				{
					messageId: "emptyFundingUrlObject",
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": "https://patreon.com/test",
						"ko-fi": 12345
					}
				}`,
			errors: [
				{
					messageId: "invalidFundingUrl",
					data: {
						key: "ko-fi",
						expectedType: "string",
						actualType: "number",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": "https://patreon.com/test",
						"ko-fi": ""
					}
				}`,
			errors: [
				{
					messageId: "emptyFundingUrlObject",
					data: { key: "ko-fi" },
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": "https://patreon.com/test",
						"ko-fi": {
							"url": "https://ko-fi.com/test"
						}
					}
				}`,
			errors: [
				{
					messageId: "invalidFundingUrl",
					data: {
						key: "ko-fi",
						expectedType: "string",
						actualType: "object",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
					"fundingUrl": {
						"patreon": "https://patreon.com/test",
						"patreon": "https://patreon.com/test",
					}
				}`,
			errors: [
				{
					messageId: "duplicateKey",
					data: { key: "patreon" },
				},
			],
		},
		// Duplicate keys tests
		{
			filename: "manifest.json",
			code: `{
					"id": "test-id",
					"name": "Test name",
					"name": "Test name",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "A great test.",
					"isDesktopOnly": false,
				}`,
			errors: [
				{
					messageId: "duplicateKey",
					data: { key: "name" },
				},
			],
		},
		// Description tests
		{
			filename: "manifest.json",
			code: `{
					"id": "short-description",
					"name": "Short description",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "Short.",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
				},
			],
		},
		{
			filename: "manifest.json",
			// from: https://stallman-copypasta.github.io/
			code: `{
					"id": "long-description",
					"name": "Long description",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "I'd just like to interject for a moment. What you're refering to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "remove-periods",
					"name": "Removes all periods from your life",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "Even removes them from this sentence",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
					data: {
						key: "description",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "all-lowercase",
					"name": "all lowercase",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "this description is all lowercase. it should be capitalized.",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
					data: {
						key: "description",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "more-special-characters",
					"name": "More special characters",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "This description contains special characters like @, #, $, %, ^, &, *, (, ), and more.",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
					data: {
						key: "description",
					},
				},
			],
		},
		{
			filename: "manifest.json",
			code: `{
					"id": "emojis-are-my-culture",
					"name": "Emojis are my culture",
					"author": "Me",
					"version": "1.0.0",
					"minAppVersion": "1.0.0",
					"description": "This description contains emojis 😊, which are not allowed in the description field.",
					"isDesktopOnly": false
				}`,
			errors: [
				{
					messageId: "descriptionFormat",
					data: {
						key: "description",
					},
				},
			],
		},
	],
});
