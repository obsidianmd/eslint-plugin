import { RuleTester } from "@typescript-eslint/rule-tester";
import fs from "node:fs";
import manifestRule from "../lib/rules/validateManifest.js";

// --- Test Setup ---
const originalExistsSync = fs.existsSync;
const ruleTester = new RuleTester();

try {
	// --- Group 1: Plugin Manifest Tests (theme.css does NOT exist) ---
	// Mock fs.existsSync to return false for theme.css
	// This is to simulate a plugin environment where theme.css is not present.
	(fs.existsSync as any) = () => false;

	ruleTester.run("plugin-manifest", manifestRule, {
		valid: [
			{
				filename: "manifest.json",
				// Use a raw string, not JSON.stringify()
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
			},
		],
		invalid: [
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
				],
			},
			{
				filename: "manifest.json",
				code: `[]`, // Test for invalid root type
				errors: [{ messageId: "mustBeRootObject" }],
			},
		],
	});

	// --- Group 2: Theme Manifest Tests (theme.css DOES exist) ---
	// Mock fs.existsSync to return true for theme.css
	// This simulates a theme environment where theme.css is present.
	(fs.existsSync as any) = () => true;

	ruleTester.run("theme-manifest", manifestRule, {
		valid: [
			{
				filename: "manifest.json",
				code: `{
                    "name": "My Theme",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0"
                }`,
			},
		],
		invalid: [
			{
				filename: "manifest.json",
				code: `{
                    "name": "My Theme",
                    "author": "Me",
                    "version": "1.0.0",
                    "minAppVersion": "1.0.0",
                    "id": "disallowed-id",
                    "isDesktopOnly": true
                }`,
				errors: [
					{ messageId: "disallowedKey", data: { key: "id" } },
					{
						messageId: "disallowedKey",
						data: { key: "isDesktopOnly" },
					},
				],
			},
		],
	});
} finally {
	// Restore the original fs.existsSync function
	fs.existsSync = originalExistsSync;
}
