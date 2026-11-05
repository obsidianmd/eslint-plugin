import assert from "node:assert";
import { execFile } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

// The config examples in the README and docs/configuration.md are what most
// projects copy. Lint the official sample plugin's layout with each, exactly as
// written, so an example that fails on it (#90, #155: "was not found by the
// project service" on main.js and the build scripts) cannot ship again.
//
// Each example runs in a fresh process, as `eslint .` would: typescript-eslint
// keeps one project service per process, created with the options of the first
// file that asks for one, so in this process the examples would share it with
// each other and with every test before them.

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const pluginEntry = pathToFileURL(path.join(repoRoot, "lib/index.ts")).href;
const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const eslintBin = path.join(repoRoot, "node_modules/eslint/bin/eslint.js");

// The first `// eslint.config.mjs` example in the section under `heading`, up to
// the next heading of the same or a higher level, so an example that loses its
// header comment fails here instead of the next section's being tested.
function configExample(file: string, heading: string): string {
	const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
	const start = text.split("\n").indexOf(heading);
	assert.ok(start !== -1, `no heading ${JSON.stringify(heading)} in ${file}`);
	const level = /^#+/.exec(heading)?.[0].length ?? 0;
	const lines = text.split("\n").slice(start + 1);
	const end = lines.findIndex((line) => {
		const hashes = /^(#+) /.exec(line)?.[1].length;
		return hashes !== undefined && hashes <= level;
	});
	const section = (end === -1 ? lines : lines.slice(0, end)).join("\n");
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

interface LintResult {
	filePath: string;
	messages: { fatal?: boolean; message: string }[];
}

// Runs the ESLint CLI on `dir`. It exits 1 when it reports an error, and 2 when
// it cannot lint at all (a config that does not load, a rule that throws).
async function eslintDot(dir: string): Promise<LintResult[]> {
	const args = ["--import", tsxLoader, eslintBin, "--format", "json", "."];
	try {
		const { stdout } = await promisify(execFile)(process.execPath, args, { cwd: dir, maxBuffer: 64 * 1024 * 1024 });
		return JSON.parse(stdout) as LintResult[];
	} catch (error) {
		const { code, stdout, stderr } = error as { code?: number; stdout?: string; stderr?: string };
		if (code === 1 && stdout) {
			return JSON.parse(stdout) as LintResult[];
		}
		throw new Error(`eslint exited with ${code}: ${stderr}`);
	}
}

const ALL_LINTED = ["eslint.config.mjs", "manifest.json", "package.json", "src/main.ts"];

for (const [file, heading, linted] of [
	["README.md", "## Usage", ALL_LINTED],
	["README.md", "### Usage (flat config)", ALL_LINTED],
	["docs/configuration.md", "## Quick start", ALL_LINTED],
	["docs/configuration.md", "## Using alongside stricter typescript-eslint configs", ALL_LINTED],
	// Without the recommended config nothing lints package.json or manifest.json.
	["docs/configuration.md", "## Using only obsidianmd rules (without the recommended config)", ["eslint.config.mjs", "src/main.ts"]],
	// The scanner leaves out every .mjs file, the config among them.
	["docs/configuration.md", "## Community plugin scanner configuration", ["manifest.json", "package.json", "src/main.ts"]],
] as const) {
	describe(`${file} ${heading} example on the sample plugin's layout`, () => {
		let dir: string;
		let results: LintResult[];

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
			const example = configExample(file, heading);
			const config = example.replace('from "eslint-plugin-obsidianmd"', `from ${JSON.stringify(pluginEntry)}`);
			assert.notStrictEqual(config, example, "the example does not import eslint-plugin-obsidianmd");
			fs.writeFileSync(path.join(dir, "eslint.config.mjs"), config);
			results = await eslintDot(dir);
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

		it("lints the plugin source, but not the build output or scripts", () => {
			const lintedFiles = results.map((result) => path.relative(dir, result.filePath)).sort();
			assert.deepStrictEqual(lintedFiles, [...linted]);
		});
	});
}
