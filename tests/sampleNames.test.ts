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
        {
            name: "a setting with another name is allowed",
            code: "interface WordCountSettings { countSpaces: boolean }",
        },
        {
            name: "only the declaration of the sample setting is reported, not its uses",
            code: "const DEFAULT_SETTINGS = { mySetting: 'default' }; plugin.settings.mySetting = 'x';",
        },
        {
            name: "a property named like a sample class is allowed",
            code: "interface Plugins { MyPlugin: unknown }",
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
            errors: [{ messageId: "rename" }, { messageId: "renameSetting" }],
        },
        {
            name: "the sample setting is forbidden in any interface",
            code: "interface WordCountSettings { mySetting: string }",
            errors: [{ messageId: "renameSetting", line: 1, column: 31 }],
        },
        {
            name: "the sample setting is forbidden in a type literal",
            code: "type WordCountSettings = { mySetting?: string };",
            errors: [{ messageId: "renameSetting" }],
        },
        {
            name: "the sample setting is forbidden as a quoted key",
            code: "interface WordCountSettings { 'mySetting': string }",
            errors: [{ messageId: "renameSetting" }],
        },
        {
            name: "the sample setting tab and modal classes are forbidden",
            code: "class SampleSettingTab {} class SampleModal {}",
            errors: [{ messageId: "rename" }, { messageId: "rename" }],
        },
    ],
});
