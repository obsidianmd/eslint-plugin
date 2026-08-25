import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noFilesystemAccess.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-filesystem-access", rule, {
	valid: [
		{
			name: "importing obsidian is allowed",
			code: "import { Plugin } from 'obsidian';",
		},
		{
			name: "importing a different Node module is allowed",
			code: "import path from 'path';",
		},
		{
			name: "using the Obsidian vault API is allowed",
			code: "const data = vault.read('test.md');",
		},
	],
	invalid: [
		{
			name: "static import of fs is forbidden",
			code: "import fs from 'fs';",
			errors: [{ messageId: "filesystemAccess", data: { module: "fs" } }],
		},
		{
			name: "static import of node:fs is forbidden",
			code: "import fs from 'node:fs';",
			errors: [
				{
					messageId: "filesystemAccess",
					data: { module: "node:fs" },
				},
			],
		},
		{
			name: "static import of fs/promises is forbidden",
			code: "import { readFile } from 'fs/promises';",
			errors: [
				{
					messageId: "filesystemAccess",
					data: { module: "fs/promises" },
				},
			],
		},
		{
			name: "require of fs is forbidden",
			code: "const fs = require('fs');",
			errors: [{ messageId: "filesystemAccess", data: { module: "fs" } }],
		},
		{
			name: "dynamic import of fs is forbidden",
			code: "const fs = await import('fs');",
			errors: [{ messageId: "filesystemAccess", data: { module: "fs" } }],
		},
		{
			name: "Platform.isDesktop guard does NOT suppress the report",
			code: "if (Platform.isDesktop) { const fs = await import('fs'); }",
			errors: [{ messageId: "filesystemAccess", data: { module: "fs" } }],
		},
	],
});
