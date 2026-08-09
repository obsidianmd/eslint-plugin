import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noHardwareFingerprinting.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-hardware-fingerprinting", rule, {
	valid: [
		{
			name: "importing obsidian is allowed",
			code: "import { Plugin } from 'obsidian';",
		},
		{
			name: "unrelated function call is allowed",
			code: "const id = generateId();",
		},
		{
			name: "importing machineId from a different package is allowed",
			code: "import machineId from 'some-other-package';",
		},
	],
	invalid: [
		{
			name: "static import of node-machine-id is forbidden",
			code: "import { machineIdSync } from 'node-machine-id';",
			errors: [{ messageId: "hardwareFingerprinting" }],
		},
		{
			name: "require of node-machine-id is forbidden",
			code: "const id = require('node-machine-id');",
			errors: [{ messageId: "hardwareFingerprinting" }],
		},
		{
			name: "calling machineIdSync is forbidden",
			code: "const id = machineIdSync();",
			errors: [{ messageId: "hardwareFingerprinting" }],
		},
		{
			name: "dynamic import of node-machine-id is forbidden",
			code: "const id = await import('node-machine-id');",
			errors: [{ messageId: "hardwareFingerprinting" }],
		},
	],
});
