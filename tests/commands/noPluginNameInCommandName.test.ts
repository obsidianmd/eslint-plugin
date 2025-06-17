import { RuleTester } from "@typescript-eslint/rule-tester";
// 1. Import the real manifest object.
import { manifest } from "../../lib/readManifest.js";

const ruleTester = new RuleTester();

(async () => {
	// Store original values
	const originalName = manifest.name;

	try {
		// 2. Set up the mock values.
		manifest.name = "My Awesome Plugin";

		// 3. Dynamically import the rule.
		const { default: noPluginNameRule } = await import(
			"../../lib/rules/commands/noPluginNameInCommandName.js"
		);

		// 4. Run the tests.
		ruleTester.run("no-plugin-name-in-command-name", noPluginNameRule, {
			valid: [{ code: "this.addCommand({ name: 'Open a new note' });" }],
			invalid: [
				{
					code: "this.addCommand({ name: 'My Awesome Plugin: Open a new note' });",
					errors: [{ messageId: "pluginName" }],
				},
				{
					code: "this.addCommand({ name: 'Open a new note (for My Awesome Plugin)' });",
					errors: [{ messageId: "pluginName" }],
				},
			],
		});
	} finally {
		// 5. Restore original values.
		manifest.name = originalName;
	}
})();
