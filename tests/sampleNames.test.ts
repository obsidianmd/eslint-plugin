import { RuleTester } from "@typescript-eslint/rule-tester";
import sampleNamesRule from "../lib/rules/sampleNames.js";

const ruleTester = new RuleTester();

ruleTester.run("sample-names", sampleNamesRule, {
    valid: [
        {
            name: "non-sample class name is allowed",
            code: "class NotSample {}",
        },
        {
            name: "a function or variable with a sample name is allowed",
            code: "function MyPlugin() {} const SampleModal = 1;",
        },
    ],
    invalid: [
        {
            name: "MyPlugin sample name is forbidden",
            code: "class MyPlugin {}",
            errors: [{ messageId: "rename" }],
        },
        {
            name: "an exported default sample class is forbidden",
            code: "export default class MyPlugin {}",
            errors: [{ messageId: "rename" }],
        },
        {
            name: "the sample settings interface is forbidden",
            code: "interface MyPluginSettings { mySetting: string }",
            errors: [{ messageId: "rename" }],
        },
        {
            name: "the sample setting tab and modal classes are forbidden",
            code: "class SampleSettingTab {} class SampleModal {}",
            errors: [{ messageId: "rename" }, { messageId: "rename" }],
        },
    ],
});
