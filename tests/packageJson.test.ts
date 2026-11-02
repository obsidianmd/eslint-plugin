import assert from "node:assert";
import fs from "node:fs";

// typescript-eslint is both a dependency and a peer dependency. Raising its
// floor does not make npm refuse a project's older copy: npm quietly nests a
// second copy under the plugin, and a project that also spreads its own
// tseslint configs then fails with "Cannot redefine plugin @typescript-eslint"
// (#199). The floor stays at 8.35.1; a newer typescript-eslint is recommended
// in the README instead of required here.

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
	dependencies: Record<string, string>;
	peerDependencies: Record<string, string>;
};

describe("package.json", () => {
	it("gives typescript-eslint the same range as a dependency and a peer", () => {
		assert.strictEqual(
			packageJson.dependencies["typescript-eslint"],
			packageJson.peerDependencies["typescript-eslint"]
		);
	});

	it("keeps the typescript-eslint floor at 8.35.1", () => {
		assert.strictEqual(packageJson.peerDependencies["typescript-eslint"], "^8.35.1");
	});
});
