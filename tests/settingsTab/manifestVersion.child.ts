// Run by manifestVersion.test.ts, in a fresh process whose cwd is a temporary
// directory holding the manifest.json under test. Prints one JSON line with
// the messages each settings-tab rule reports there, with its options unset
// and with an option that overrides the manifest.
import { Linter } from "eslint";
import type { Rule } from "eslint";
import noDeprecatedDisplay from "../../lib/rules/settingsTab/noDeprecatedDisplay.js";
import noProblematicSettingsHeadings from "../../lib/rules/settingsTab/noProblematicSettingsHeadings.js";
import preferUpdateOverDisplay from "../../lib/rules/settingsTab/preferUpdateOverDisplay.js";
import requireDisplay from "../../lib/rules/settingsTab/requireDisplay.js";

const rules = {
    "require-display": requireDisplay,
    "no-deprecated-display": noDeprecatedDisplay,
    "prefer-update-over-display": preferUpdateOverDisplay,
    "no-problematic-settings-headings": noProblematicSettingsHeadings,
} as unknown as Record<string, Rule.RuleModule>;

const CODE: Record<keyof typeof rules & string, string> = {
    // No display(): only rendered on 1.13+.
    "require-display": "class MyTab extends PluginSettingTab { getSettingDefinitions() { return [{ name: 'Mode' }]; } }",
    // display() next to definitions: bypassed on 1.13+.
    "no-deprecated-display": "class MyTab extends PluginSettingTab { getSettingDefinitions() { return [{ name: 'Mode' }]; } display() {} }",
    // A refresh through display(): update() is the 1.13+ API.
    "prefer-update-over-display": "class MyTab extends PluginSettingTab { refresh() { this.display(); } }",
    // A heading named after the plugin, "Word Count" in the manifests used here.
    "no-problematic-settings-headings": "class MyTab extends PluginSettingTab { display() { new Setting(this.containerEl).setName('Word Count').setHeading(); } }",
};

function messages(ruleId: string, options: unknown[]): string[] {
    const results = new Linter().verify(CODE[ruleId], [
        {
            plugins: { obsidianmd: { rules } },
            rules: { [`obsidianmd/${ruleId}`]: ["error", ...options] as Linter.RuleEntry },
        },
    ]);
    const fatal = results.find((message) => message.fatal);
    if (fatal) {
        throw new Error(fatal.message);
    }
    return results.map((message) => message.message);
}

console.log(JSON.stringify({
    requireDisplay: {
        unset: messages("require-display", []),
        below: messages("require-display", [{ minAppVersion: "1.12.0" }]),
        declarative: messages("require-display", [{ minAppVersion: "1.13.0" }]),
    },
    noDeprecatedDisplay: {
        unset: messages("no-deprecated-display", []),
        below: messages("no-deprecated-display", [{ minAppVersion: "1.12.0" }]),
        declarative: messages("no-deprecated-display", [{ minAppVersion: "1.13.2" }]),
        invalid: messages("no-deprecated-display", [{ minAppVersion: "latest" }]),
    },
    preferUpdateOverDisplay: {
        unset: messages("prefer-update-over-display", []),
        below: messages("prefer-update-over-display", [{ minAppVersion: "1.12.0" }]),
        declarative: messages("prefer-update-over-display", [{ minAppVersion: "1.13.0" }]),
    },
    noProblematicSettingsHeadings: {
        unset: messages("no-problematic-settings-headings", []),
        other: messages("no-problematic-settings-headings", [{ pluginName: "Calendar" }]),
    },
}));
