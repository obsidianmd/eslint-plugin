import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";

// The first config example in the README and the quick start in
// docs/configuration.md are what most projects copy. Lint the official sample
// plugin's layout with each, exactly as written, so an example that fails on it
// (#90, #155: "was not found by the project service" on main.js and the build
// scripts) cannot ship again.

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pluginEntry = pathToFileURL(path.join(repoRoot, "lib/index.ts")).href;

function firstConfigExample(file: string, heading: string): string {
	const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
	const section = text.slice(text.indexOf(heading));
	const match = /```js\n(\/\/ eslint\.config\.mjs\n[\s\S]*?)```/.exec(section);
	assert.ok(match, `no eslint.config.mjs example under ${heading} in ${file}`);
	return match[1];
}

const SAMPLE_PLUGIN: Record<string, string> = {
	"package.json": JSON.stringify({ name: "sample-plugin", version: "1.0.0", main: "main.js" }),
	"manifest.json": JSON.stringify({
		id: "word-tally",
		name: "Word Tally",
		version: "1.0.0",
		minAppVersion: "1.5.0",
		description: "Counts words in the active note.",
		author: "Jane Doe",
		isDesktopOnly: false,
	}),
	"tsconfig.json": JSON.stringify({
		compilerOptions: { module: "ESNext", target: "ES2021", strict: true, lib: ["ES2021", "DOM"] },
		include: ["src/**/*.ts"],
	}),
	"src/main.ts": "export function count(text: string): number {\n\treturn text.split(\" \").length;\n}\n",
	"main.js": "\"use strict\";\nvar obsidian = require(\"obsidian\");\nmodule.exports = class extends obsidian.Plugin {};\n",
	"esbuild.config.mjs": "import process from \"process\";\nimport { builtinModules } from \"node:module\";\nconsole.log(process.argv, builtinModules);\n",
	"version-bump.mjs": "import { readFileSync } from \"fs\";\nconsole.log(readFileSync(\"manifest.json\", \"utf8\"));\n",
};

for (const [file, heading] of [
	["README.md", "## Usage"],
	["docs/configuration.md", "## Quick start"],
] as const) {
	describe(`${file} ${heading} example on the sample plugin's layout`, () => {
		let dir: string;
		let results: ESLint.LintResult[];

		before(async function () {
			this.timeout(60000);
			dir = fs.mkdtempSync(path.join(os.tmpdir(), "readme-example-"));
			// The example imports "eslint/config" as a project would; ESLint skips
			// node_modules, so linking the repo's in changes nothing else.
			fs.symlinkSync(path.join(repoRoot, "node_modules"), path.join(dir, "node_modules"), "junction");
			for (const [name, content] of Object.entries(SAMPLE_PLUGIN)) {
				fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
				fs.writeFileSync(path.join(dir, name), content);
			}
			const config = firstConfigExample(file, heading).replace(
				'from "eslint-plugin-obsidianmd"',
				`from ${JSON.stringify(pluginEntry)}`,
			);
			fs.writeFileSync(path.join(dir, "eslint.config.mjs"), config);
			// Run from the project root, as `eslint .` would: typescript-eslint
			// resolves allowDefaultProject against the process's working directory.
			const previous = process.cwd();
			process.chdir(dir);
			try {
				const eslint = new ESLint({ cwd: dir, overrideConfigFile: path.join(dir, "eslint.config.mjs") });
				results = await eslint.lintFiles(["."]);
			} finally {
				process.chdir(previous);
			}
		});

		after(() => {
			fs.rmSync(dir, { recursive: true, force: true });
		});

		it("lints without fatal errors", () => {
			const fatal = results.flatMap((result) =>
				result.messages
					.filter((message) => message.fatal)
					.map((message) => `${path.relative(dir, result.filePath)}: ${message.message}`),
			);
			assert.deepStrictEqual(fatal, []);
		});

		it("lints the plugin source and its manifest, but not the build output or scripts", () => {
			const linted = results.map((result) => path.relative(dir, result.filePath)).sort();
			assert.deepStrictEqual(linted, ["eslint.config.mjs", "manifest.json", "package.json", "src/main.ts"]);
		});
	});
}
