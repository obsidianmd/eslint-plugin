import { RuleTester } from "@typescript-eslint/rule-tester";
import { RuleTester as EslintRuleTester, type Rule } from "eslint";
import detachLeavesRule from "../lib/rules/detachLeaves.js";

const ruleTester = new RuleTester();

const IMPORT = 'import { Plugin } from "obsidian";\n';
// A plugin whose base class is the file's own: the method that is left
// empty stays, as it overrides the base's.
const BASE = IMPORT + "class Base extends Plugin {}\n";

ruleTester.run("detach-leaves", detachLeavesRule, {
    valid: [
        {
            name: "onunload without detachLeavesOfType is allowed",
            code: "class MyPlugin { onunload() { /* nothing */ } }",
        },
        {
            name: "detachLeavesOfType nested in a block is not checked",
            code: 'class MyPlugin { onunload() { if (this.ready) { this.app.workspace.detachLeavesOfType("foo"); } } }',
        },
        {
            name: "detachLeavesOfType in a helper called from onunload is not checked",
            code: 'class MyPlugin { onunload() { this.cleanUp(); } cleanUp() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "a plain function call in onunload is not checked, and does not crash",
            code: "class MyPlugin { onunload() { cleanUp(); this.saveSettings(); } }",
        },
        {
            name: "a private #onunload method is not the lifecycle hook, so it is not checked",
            code: 'class MyPlugin { #onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "onunload as an arrow-function property is not checked",
            code: 'class MyPlugin { onunload = () => { this.app.workspace.detachLeavesOfType("foo"); }; }',
        },
        {
            // The key is whatever the variable holds, here "dispose".
            name: "a computed key named by a variable is not onunload",
            code: 'const onunload = "dispose";\nclass Cache { [onunload]() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "a computed string other than onunload is not checked",
            code: 'class MyPlugin { ["onload"]() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            // metadata-menu's FileClassViewManager: a Component the plugin
            // unloads while it keeps running, which detaches the leaves of a
            // view type it then unregisters.
            name: "the onunload of a Component, or of a class that extends nothing, is not checked",
            code: [
                'import * as obsidian from "obsidian";',
                'import { Component } from "obsidian";',
                "class Helper extends obsidian.Component {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
                "export class FileClassViewManager extends Component {",
                "    onunload(): void {",
                "        this.plugin.app.workspace.detachLeavesOfType(this.fileClassViewType);",
                "        this.plugin.app.viewRegistry.unregisterView(this.fileClassViewType);",
                "    }",
                "}",
                'class Cache { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
            ].join("\n"),
        },
        {
            name: "a Plugin that is not obsidian's is not checked",
            code: 'import { Plugin } from "./base";\nclass MyPlugin extends Plugin { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "a Plugin that is not declared is not checked",
            code: 'class MyPlugin extends Plugin { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "a class of the file's own that extends a Component is not checked",
            code: 'import { Component } from "obsidian";\nclass Base extends Component {}\nclass Child extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
    ],
    invalid: [
        {
            name: "detachLeavesOfType in onunload is forbidden",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() {} }",
        },
        {
            name: "detachLeavesOfType on the workspace in onunload is forbidden",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() {} }",
        },

        // Removing the whole method: the class extends Obsidian's Plugin, whose
        // onunload() is Component's empty hook.
        {
            name: "the sample plugin's layout loses the method and keeps one blank line between members",
            code: IMPORT + [
                "export default class MyPlugin extends Plugin {",
                "\tsettings: MyPluginSettings;",
                "",
                "\tasync onload() {",
                "\t\tawait this.loadSettings();",
                "\t}",
                "",
                "\tonunload() {",
                "\t\tthis.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);",
                "\t}",
                "",
                "\tasync loadSettings() {",
                "\t\tthis.settings = await this.loadData();",
                "\t}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "export default class MyPlugin extends Plugin {",
                "\tsettings: MyPluginSettings;",
                "",
                "\tasync onload() {",
                "\t\tawait this.loadSettings();",
                "\t}",
                "",
                "\tasync loadSettings() {",
                "\t\tthis.settings = await this.loadData();",
                "\t}",
                "}",
            ].join("\n"),
        },
        {
            name: "the last member goes without leaving a blank line before the class's }",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    settings: MyPluginSettings;",
                "",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    settings: MyPluginSettings;",
                "}",
            ].join("\n"),
        },
        {
            name: "the first member goes without leaving a blank line after the class's {",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "",
                "    async onload() {}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    async onload() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "the only member leaves an empty class body",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {}",
        },
        {
            name: "a member written on one line goes with the space before it",
            code: IMPORT + 'class MyPlugin extends Plugin { onload() {} onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin { onload() {} }",
        },
        {
            name: "the wider gap between the neighbouring members is kept",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onload() {}",
                "",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "    helper() {}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onload() {}",
                "",
                "    helper() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "a comment above the next member stays with it",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onload() {}",
                "",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "",
                "    // Settings",
                "    loadSettings() {}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onload() {}",
                "",
                "    // Settings",
                "    loadSettings() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "a comment inside the call goes with it",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    onunload() {\n        this.app.workspace.detachLeavesOfType(/* ours */ "foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {}",
        },
        {
            name: "a renamed Plugin import from obsidian counts",
            code: 'import { Plugin as ObsidianPlugin } from "obsidian";\nclass MyPlugin extends ObsidianPlugin {\n    onload() {}\n\n    override onunload(): void {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: 'import { Plugin as ObsidianPlugin } from "obsidian";\nclass MyPlugin extends ObsidianPlugin {\n    onload() {}\n}',
        },
        {
            name: "obsidian.Plugin through a namespace import counts",
            code: 'import * as obsidian from "obsidian";\nexport default class extends obsidian.Plugin {\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: 'import * as obsidian from "obsidian";\nexport default class extends obsidian.Plugin {}',
        },
        {
            name: "a class expression counts",
            code: IMPORT + 'const MyPlugin = class extends Plugin { onunload() { this.app.workspace.detachLeavesOfType("foo"); } };',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "const MyPlugin = class extends Plugin {};",
        },
        {
            name: "a stray semicolon after the method goes with it",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    onload() {}\n\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    };\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    onload() {}\n}",
        },
        {
            name: "CRLF line endings",
            code: IMPORT + 'class MyPlugin extends Plugin {\r\n    onload() {}\r\n\r\n    onunload() {\r\n        this.app.workspace.detachLeavesOfType("foo");\r\n    }\r\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\r\n    onload() {}\r\n}",
        },
        {
            name: "two calls: one line per pass, then the method",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onload() {}",
                "",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                '        this.app.workspace.detachLeavesOfType("bar");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }, { messageId: "onunload" }],
            output: [
                IMPORT + [
                    "class MyPlugin extends Plugin {",
                    "    onload() {}",
                    "",
                    "    onunload() {",
                    '        this.app.workspace.detachLeavesOfType("bar");',
                    "    }",
                    "}",
                ].join("\n"),
                IMPORT + [
                    "class MyPlugin extends Plugin {",
                    "    onload() {}",
                    "}",
                ].join("\n"),
            ],
        },

        // Removing the call's line only: something else is left in the body.
        {
            name: "the call's line goes when other statements follow",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "        this.saveSettings();",
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                "        this.saveSettings();",
                "    }",
                "}",
            ].join("\n"),
        },
        {
            name: "the call's line goes when other statements precede it",
            code: BASE + [
                "class MyPlugin extends Base {",
                "\tonunload() {",
                "\t\tthis.saveSettings();",
                '\t\tthis.app.workspace.detachLeavesOfType("foo");',
                "\t}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: BASE + [
                "class MyPlugin extends Base {",
                "\tonunload() {",
                "\t\tthis.saveSettings();",
                "\t}",
                "}",
            ].join("\n"),
        },
        {
            name: "the call's line goes with its CRLF line break",
            code: IMPORT + 'class MyPlugin extends Plugin {\r\n    onunload() {\r\n        this.app.workspace.detachLeavesOfType("foo");\r\n        this.saveSettings();\r\n    }\r\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\r\n    onunload() {\r\n        this.saveSettings();\r\n    }\r\n}",
        },
        {
            name: "a call followed by code on its line goes with the space after it",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); this.saveSettings(); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() { this.saveSettings(); } }",
        },
        {
            name: "a call after code on its line goes with the space before it",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.saveSettings(); this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() { this.saveSettings(); } }",
        },
        {
            name: "a call that ends a line after other code leaves the line break",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.saveSettings(); this.app.workspace.detachLeavesOfType("foo");\n} }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() { this.saveSettings();\n} }",
        },

        // Comments are never removed, and the method that holds them stays.
        {
            name: "a comment after the call on its line stays, and so does the method",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo"); // close our views',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                "        // close our views",
                "    }",
                "}",
            ].join("\n"),
        },
        {
            name: "a comment in the body stays, and so does the method",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                "        // Views are closed by Obsidian.",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                "        // Views are closed by Obsidian.",
                "    }",
                "}",
            ].join("\n"),
        },
        {
            name: "a comment above the method keeps the method, with an empty body",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    /** Called when the plugin is disabled. */",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    /** Called when the plugin is disabled. */",
                "    onunload() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "a comment after the method on its last line keeps the method",
            code: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    } // lifecycle",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class MyPlugin extends Plugin {",
                "    onunload() {} // lifecycle",
                "}",
            ].join("\n"),
        },

        // Keeping the method, with an empty body: removing it may change what
        // runs or what compiles.
        {
            name: "a class extending the file's own base class keeps the method, which overrides the base's",
            code: IMPORT + [
                "class BasePlugin extends Plugin {",
                "    onunload() { this.teardown(); }",
                "}",
                "class MyPlugin extends BasePlugin {",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }],
            output: IMPORT + [
                "class BasePlugin extends Plugin {",
                "    onunload() { this.teardown(); }",
                "}",
                "class MyPlugin extends BasePlugin {",
                "    onunload() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "an async onunload keeps the method, which returns a promise",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    async onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    async onunload() {}\n}",
        },
        {
            name: "a static onunload keeps the method",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    static onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    static onunload() {}\n}",
        },
        {
            name: "a decorated onunload keeps the method",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    @log\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    @log\n    onunload() {}\n}",
        },
        {
            name: "an onunload with a parameter keeps the method",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    onunload(reason = this.track()) {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    onunload(reason = this.track()) {}\n}",
        },
        {
            name: "an overloaded onunload keeps the method",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    onunload(): void;\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    onunload(): void;\n    onunload() {}\n}",
        },
        {
            name: "a field without a semicolon before the method keeps it, so the next member cannot continue the field",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    handlers = {}\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n    [Symbol.iterator]() {}\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    handlers = {}\n    onunload() {}\n    [Symbol.iterator]() {}\n}",
        },
        {
            name: "a getter, an optional, a generator or a generic onunload keeps the method",
            code: IMPORT + [
                "class GetterPlugin extends Plugin {",
                "    get onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
                "class OptionalPlugin extends Plugin {",
                "    onunload?() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
                "class GeneratorPlugin extends Plugin {",
                "    *onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
                "class GenericPlugin extends Plugin {",
                "    onunload<T>() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }, { messageId: "onunload" }, { messageId: "onunload" }, { messageId: "onunload" }],
            output: IMPORT + [
                "class GetterPlugin extends Plugin {",
                "    get onunload() {}",
                "}",
                "class OptionalPlugin extends Plugin {",
                "    onunload?() {}",
                "}",
                "class GeneratorPlugin extends Plugin {",
                "    *onunload() {}",
                "}",
                "class GenericPlugin extends Plugin {",
                "    onunload<T>() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "an onunload overloaded under a quoted name keeps the method",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    "onunload"(): void;\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + 'class MyPlugin extends Plugin {\n    "onunload"(): void;\n    onunload() {}\n}',
        },
        {
            name: "a field ended by a semicolon, or a static block, before the method lets it go",
            code: IMPORT + [
                "class FieldPlugin extends Plugin {",
                "    handlers = {};",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "    [Symbol.iterator]() {}",
                "}",
                "class BlockPlugin extends Plugin {",
                "    static {}",
                "    onunload() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "    [Symbol.iterator]() {}",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }, { messageId: "onunload" }],
            output: IMPORT + [
                "class FieldPlugin extends Plugin {",
                "    handlers = {};",
                "    [Symbol.iterator]() {}",
                "}",
                "class BlockPlugin extends Plugin {",
                "    static {}",
                "    [Symbol.iterator]() {}",
                "}",
            ].join("\n"),
        },
        {
            name: "a bodiless method without a semicolon before the method keeps it, so the next member cannot continue its type",
            code: IMPORT + 'abstract class MyPlugin extends Plugin {\n    abstract helper(): void\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n    [Symbol.iterator]() {}\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "abstract class MyPlugin extends Plugin {\n    abstract helper(): void\n    onunload() {}\n    [Symbol.iterator]() {}\n}",
        },
        {
            name: "a quoted onunload is onunload",
            code: BASE + 'class MyPlugin extends Base { "onunload"() { this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + 'class MyPlugin extends Base { "onunload"() {} }',
        },
        {
            name: "a quoted onunload in a Plugin goes like an unquoted one",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    "onunload"() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {}",
        },
        {
            name: "an onunload computed from a string is onunload, and keeps the method",
            code: IMPORT + [
                "class StringPlugin extends Plugin {",
                '    ["onunload"]() {',
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
                "class TemplatePlugin extends Plugin {",
                "    [`onunload`]() {",
                '        this.app.workspace.detachLeavesOfType("foo");',
                "    }",
                "}",
            ].join("\n"),
            errors: [{ messageId: "onunload" }, { messageId: "onunload" }],
            output: IMPORT + [
                "class StringPlugin extends Plugin {",
                '    ["onunload"]() {}',
                "}",
                "class TemplatePlugin extends Plugin {",
                "    [`onunload`]() {}",
                "}",
            ].join("\n"),
        },
        {
            // KEY may be "onunload": removing the method would let [KEY]() run
            // in its place.
            name: "a member computed from an unknown value keeps the method",
            code: 'import { Plugin } from "obsidian";\nimport { KEY } from "./keys";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: 'import { Plugin } from "obsidian";\nimport { KEY } from "./keys";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    onunload() {}\n}',
        },
        {
            name: "a member computed from a known value other than onunload lets the method go",
            code: IMPORT + 'const KEY = "dispose";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + 'const KEY = "dispose";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n}',
        },
        {
            name: "a field without a semicolon before the last member does not keep it",
            code: IMPORT + 'class MyPlugin extends Plugin {\n    handlers = {}\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {\n    handlers = {}\n}",
        },
    ],
});

// ESLint's own parser, espree, with no languageOptions.parser: the recommended
// config's JavaScript files, and `ruleConfigs.recommended`, which is documented
// to work with any parser. Its methods have no `decorators`, `optional` or
// `typeParameters`, so the fix may not assume typescript-estree's defaults for
// them; reading `decorators.length` threw inside context.report() and stopped
// the whole lint run.
const method = (name: string, body = 'this.app.workspace.detachLeavesOfType("foo");') =>
    `${name}() {\n        ${body}\n    }`;
new EslintRuleTester().run("detach-leaves with ESLint's default parser", detachLeavesRule as unknown as Rule.RuleModule, {
    valid: [
        { name: "onunload without detachLeavesOfType", code: "class MyPlugin { onunload() { this.cleanUp(); } }" },
        {
            name: "a computed key named by a variable",
            code: 'const onunload = "dispose";\nclass Cache { [onunload]() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        { name: "a private #onunload", code: 'class MyPlugin { #onunload() { this.app.workspace.detachLeavesOfType("foo"); } }' },
        { name: "an arrow-function property", code: 'class MyPlugin { onunload = () => { this.app.workspace.detachLeavesOfType("foo"); }; }' },
        { name: "a class that does not extend Plugin", code: 'class MyPlugin { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }' },
        {
            name: "a Component from obsidian",
            code: 'import { Component } from "obsidian";\nclass Child extends Component { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
    ],
    invalid: [
        {
            name: "the method goes in a class that extends Obsidian's Plugin",
            code: IMPORT + `class MyPlugin extends Plugin {\n    ${method("onunload")}\n}`,
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {}",
        },
        {
            name: "the call goes, and the method stays, in a class that extends a plugin class of the file's own",
            code: BASE + 'class MyPlugin extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
            errors: [{ messageId: "onunload" }],
            output: BASE + "class MyPlugin extends Base { onunload() {} }",
        },
        {
            name: "a quoted onunload goes like an unquoted one",
            code: IMPORT + `class MyPlugin extends Plugin {\n    ${method('"onunload"')}\n}`,
            errors: [{ messageId: "onunload" }],
            output: IMPORT + "class MyPlugin extends Plugin {}",
        },
        {
            name: "an onunload computed from a string keeps the method",
            code: IMPORT + `class StringPlugin extends Plugin {\n    ${method('["onunload"]')}\n}\nclass TemplatePlugin extends Plugin {\n    ${method("[`onunload`]")}\n}`,
            errors: [{ messageId: "onunload" }, { messageId: "onunload" }],
            output: IMPORT + 'class StringPlugin extends Plugin {\n    ["onunload"]() {}\n}\nclass TemplatePlugin extends Plugin {\n    [`onunload`]() {}\n}',
        },
        {
            name: "a member computed from an unknown value keeps the method",
            code: `${IMPORT}import { KEY } from "./keys";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    ${method("onunload")}\n}`,
            errors: [{ messageId: "onunload" }],
            output: `${IMPORT}import { KEY } from "./keys";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    onunload() {}\n}`,
        },
        {
            name: "a member computed from a known value other than onunload lets the method go",
            code: `${IMPORT}const KEY = "dispose";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n    ${method("onunload")}\n}`,
            errors: [{ messageId: "onunload" }],
            output: `${IMPORT}const KEY = "dispose";\nclass MyPlugin extends Plugin {\n    [KEY]() {}\n}`,
        },
        {
            name: "an async, static, getter or generator onunload, or one with a parameter, keeps the method",
            code: IMPORT + [
                `class A extends Plugin {\n    ${method("async onunload")}\n}`,
                `class B extends Plugin {\n    ${method("static onunload")}\n}`,
                `class C extends Plugin {\n    ${method("get onunload")}\n}`,
                `class D extends Plugin {\n    ${method("*onunload")}\n}`,
                `class E extends Plugin {\n    onunload(reason = this.track()) {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}`,
            ].join("\n"),
            errors: Array.from({ length: 5 }, () => ({ messageId: "onunload" })),
            output: IMPORT + [
                "class A extends Plugin {\n    async onunload() {}\n}",
                "class B extends Plugin {\n    static onunload() {}\n}",
                "class C extends Plugin {\n    get onunload() {}\n}",
                "class D extends Plugin {\n    *onunload() {}\n}",
                "class E extends Plugin {\n    onunload(reason = this.track()) {}\n}",
            ].join("\n"),
        },
    ],
});

// With type information, a plugin class from another file counts: its base
// class is found by type.
ruleTester.run("detach-leaves with type information", detachLeavesRule, {
    valid: [
        {
            name: "a class of another file that extends Component is not a plugin",
            code: 'import { Component } from "obsidian";\ndeclare const Base: typeof Component;\nclass Child extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
        {
            name: "a class named Plugin of another package is not obsidian's",
            code: 'declare class Plugin { app: any }\ndeclare const Base: typeof Plugin;\nclass MyPlugin extends Base { onunload() { this.app.workspace.detachLeavesOfType("foo"); } }',
        },
    ],
    invalid: [
        {
            name: "a plugin whose base class comes from elsewhere is found by type, and keeps the method",
            code: 'import { Plugin } from "obsidian";\ndeclare class BasePlugin extends Plugin {}\ndeclare const Mixed: typeof BasePlugin;\nclass MyPlugin extends Mixed {\n    onunload() {\n        this.app.workspace.detachLeavesOfType("foo");\n    }\n}',
            errors: [{ messageId: "onunload" }],
            output: 'import { Plugin } from "obsidian";\ndeclare class BasePlugin extends Plugin {}\ndeclare const Mixed: typeof BasePlugin;\nclass MyPlugin extends Mixed {\n    onunload() {}\n}',
        },
    ],
});
