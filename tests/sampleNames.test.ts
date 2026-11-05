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
            name: "a computed property keyed by a variable called mySetting is allowed",
            code: "declare const mySetting: unique symbol; interface WordCountSettings { [mySetting]: string }",
        },
        {
            name: "a property named like a sample class is allowed",
            code: "interface Plugins { MyPlugin: unknown }",
        },
        {
            name: "a type alias with another name is allowed",
            code: "type WordCountSettings = { countSpaces: boolean };",
        },
        {
            name: "a class expression with other names is allowed",
            code: "const WordCountPlugin = class extends Plugin {}; const Modal2 = class WordCountModal {}; export default class extends Plugin {}",
        },
        {
            name: "a variable that is not a class keeps a sample name",
            code: "const MyPlugin = makePlugin(); let SampleModal = () => class {}; const MyPluginSettings = { countSpaces: true };",
        },
        {
            name: "an assignment to a sample name is not a declaration",
            code: "declare let MyPlugin: unknown; MyPlugin = class extends Plugin {};",
        },
        {
            name: "a type that uses a sample name is not a declaration",
            code: "type Settings = MyPluginSettings; let modal: SampleModal;",
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
            // Only the key is highlighted, not its type.
            errors: [{ messageId: "renameSetting", line: 1, column: 31, endColumn: 40 }],
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
        {
            name: "the sample settings as a type alias are forbidden",
            code: "type MyPluginSettings = { mySetting: string };",
            errors: [
                { messageId: "rename", line: 1, column: 6, endColumn: 22 },
                { messageId: "renameSetting", data: { name: "mySetting" } },
            ],
        },
        {
            name: "a type alias of another type with a sample name is forbidden",
            code: "export type SampleModal = Modal & { open(): void };",
            errors: [{ messageId: "rename", column: 13 }],
        },
        {
            name: "a class expression assigned to a variable with a sample name is forbidden",
            code: "const MyPlugin = class extends Plugin {}; export const SampleSettingTab = class extends PluginSettingTab {};",
            errors: [
                { messageId: "rename", line: 1, column: 7, endColumn: 15 },
                { messageId: "rename", line: 1, column: 56 },
            ],
        },
        {
            name: "a class expression with a sample name is forbidden",
            code: "module.exports = class MyPlugin extends Plugin {};",
            errors: [{ messageId: "rename", column: 24 }],
        },
        {
            name: "both sample names of a named class expression are forbidden",
            code: "const MyPlugin = class SampleModal extends Plugin {};",
            errors: [
                { messageId: "rename", column: 7 },
                { messageId: "rename", column: 24 },
            ],
        },
    ],
});
