import { RuleTester } from "@typescript-eslint/rule-tester";
import vaultIterateRule from "../../lib/rules/vault/iterate.js";

const ruleTester = new RuleTester();

ruleTester.run("vault-iterate", vaultIterateRule, {
	valid: [{ code: "vault.getFiles().find(f => f.size > 100);" }],
	invalid: [
		{
			code: 'vault.getFiles().find(f => f.path === "foo");',
			errors: [{ messageId: "iterate" }],
		},
	],
});
