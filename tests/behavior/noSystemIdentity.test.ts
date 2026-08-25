import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/behavior/noSystemIdentity.js";

const ruleTester = new RuleTester();

ruleTester.run("behavior-no-system-identity", rule, {
	valid: [
		{
			name: "os.cpus() is allowed",
			code: "os.cpus();",
		},
		{
			name: "process.env.NODE_ENV is allowed",
			code: "const env = process.env.NODE_ENV;",
		},
		{
			name: "unrelated hostname function is allowed",
			code: "const hostname = getHostname();",
		},
	],
	invalid: [
		{
			name: "os.hostname() is forbidden",
			code: "os.hostname();",
			errors: [
				{
					messageId: "systemIdentity",
					data: { api: "os.hostname()" },
				},
			],
		},
		{
			name: "os.userInfo() is forbidden",
			code: "os.userInfo();",
			errors: [
				{
					messageId: "systemIdentity",
					data: { api: "os.userInfo()" },
				},
			],
		},
		{
			name: "os.networkInterfaces() is forbidden",
			code: "os.networkInterfaces();",
			errors: [
				{
					messageId: "systemIdentity",
					data: { api: "os.networkInterfaces()" },
				},
			],
		},
		{
			name: "process.env.HOME is forbidden",
			code: "const home = process.env.HOME;",
			errors: [
				{
					messageId: "systemIdentity",
					data: { api: "process.env.HOME" },
				},
			],
		},
		{
			name: "process.env.USERNAME is forbidden",
			code: "const user = process.env.USERNAME;",
			errors: [
				{
					messageId: "systemIdentity",
					data: { api: "process.env.USERNAME" },
				},
			],
		},
	],
});
