import { RuleTester } from "@typescript-eslint/rule-tester";
// 1. Import the real manifest object so we can modify it.
import { manifest } from "../../lib/readManifest.js";

const ruleTester = new RuleTester();

// Use an async IIFE to allow top-level await for the dynamic import.
(async () => {
	// Store original values for cleanup
	const originalId = manifest.id;

	try {
		// 2. Set up the mock values for this test file.
		manifest.id = "my-plugin";

		// 3. Dynamically import the rule *after* the mock is in place.
		const { default: noPluginIdRule } = await import(
			"../../lib/rules/commands/noPluginIdInCommandId.js"
		);

		// 4. Run the tests with the mocked manifest.
		ruleTester.run("no-plugin-id-in-command-id", noPluginIdRule, {
			valid: [
				{ code: "this.addCommand({ id: 'open-new-note' });" },
				{ code: "this.addCommand({ id: 'another-action' });" },
			],
			invalid: [
				{
					code: "this.addCommand({ id: 'my-plugin-open-note' });",
					errors: [{ messageId: "pluginId" }],
				},
				{
					code: "this.addCommand({ id: 'open-note-for-my-plugin' });",
					errors: [{ messageId: "pluginId" }],
				},
			],
		});
	} finally {
		// 5. Restore the original values to prevent test pollution.
		manifest.id = originalId;
	}
})();
