import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noSelfUpdate.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-self-update", rule, {
	valid: [
		{
			name: "file reference alone is allowed",
			code: 'const f = "main.js";',
		},
		{
			name: "file write alone is allowed",
			code: "writeFileSync(path, data);",
		},
		{
			name: "zip import alone is allowed",
			code: "import AdmZip from 'adm-zip';",
		},
		{
			name: "two of three groups is allowed (file ref + write)",
			code: 'const f = "main.js"; writeFileSync(f, data);',
		},
		{
			name: "two of three groups is allowed (file ref + zip)",
			code: `const f = "main.js"; import AdmZip from 'adm-zip';`,
		},
		{
			name: "two of three groups is allowed (write + zip)",
			code: "writeFileSync(path, data); import AdmZip from 'adm-zip';",
		},
	],
	invalid: [
		{
			name: "all three groups present triggers error",
			code: `const f = "main.js"; writeFileSync(f, data); import AdmZip from 'adm-zip';`,
			errors: [{ messageId: "selfUpdate" }],
		},
	],
});
