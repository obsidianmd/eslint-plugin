import { RuleTester } from "@typescript-eslint/rule-tester";
import sampleNamesRule from "../lib/rules/sampleNames.js";
const ruleTester = new RuleTester();
ruleTester.run("sample-names", sampleNamesRule, {
    valid: [
        {
            name: "non-sample class name is allowed",
            code: "class NotSample {}",
        },
    ],
    invalid: [
        {
            name: "MyPlugin sample name is forbidden",
            code: "class MyPlugin {}",
            errors: [{ messageId: "rename" }],
        },
    ],
});
