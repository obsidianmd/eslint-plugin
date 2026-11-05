import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// The published .d.ts files must name every type through a module a consumer
// can resolve. Where an inferred type is declared only in a package's internal
// file, TypeScript would report TS2742, but the tsconfig's `baseUrl: "."` (which
// the tests' "lib/..." imports need) lets it write the type as
// `import("node_modules/<package>/...")` instead, which resolves nowhere once
// the package is installed.

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function emittedDeclaration(file: string): string {
	const config = ts.getParsedCommandLineOfConfigFile(path.join(repoRoot, "tsconfig.json"), {}, {
		...ts.sys,
		onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
			throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
		},
	});
	assert.ok(config);
	const program = ts.createProgram([path.join(repoRoot, file)], {
		...config.options,
		noEmit: false,
		declaration: true,
		emitDeclarationOnly: true,
	});
	let text: string | undefined;
	program.emit(program.getSourceFile(path.join(repoRoot, file)), (name, data) => {
		if (name.endsWith(".d.ts")) {
			text = data;
		}
	});
	assert.ok(text !== undefined, `no declaration emitted for ${file}`);
	return text;
}

describe("emitted declarations", () => {
	it("name no type by a node_modules path in lib/rules/ui/index.ts", function () {
		this.timeout(120000);
		const declaration = emittedDeclaration("lib/rules/ui/index.ts");
		assert.doesNotMatch(declaration, /import\("node_modules\//);
	});
});
