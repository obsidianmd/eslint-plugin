// Run by manifestFallback.test.ts, in a fresh process whose cwd is a temporary
// directory holding the manifest.json under test. Prints one JSON line
// describing how the plugin read that manifest.
import { ESLint, Linter } from "eslint";
import plugin from "../lib/index.js";

function reports(ruleId: string, ruleEntry: Linter.RuleEntry, code: string): number {
    const messages = new Linter().verify(code, [
        {
            plugins: { obsidianmd: plugin },
            rules: { [`obsidianmd/${ruleId}`]: ruleEntry },
        },
    ]);
    const fatal = messages.find((message) => message.fatal);
    if (fatal) {
        throw new Error(fatal.message);
    }
    return messages.filter((message) => message.ruleId === `obsidianmd/${ruleId}`).length;
}

async function recommendedFor(filename: string): Promise<Linter.Config> {
    const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: plugin.configs.recommended,
    });
    return eslint.calculateConfigForFile(filename);
}

function declaresGlobal(config: Linter.Config, name: string): boolean {
    const globals = config.languageOptions?.globals as Linter.Globals | undefined;
    return globals !== undefined && Object.hasOwn(globals, name);
}

const nodeImport = "import fs from 'node:fs';";
const pluginNameHeading = `
import { PluginSettingTab, Setting } from "obsidian";
class Tab extends PluginSettingTab {
    display() {
        new Setting(this.containerEl).setName("Sample Plugin").setHeading();
    }
}
`;
const ts = await recommendedFor("src/main.ts");
const js = await recommendedFor("src/main.js");

console.log(JSON.stringify({
    noNodejsModules: {
        unset: reports("no-nodejs-modules", "warn", nodeImport),
        forcedOn: reports("no-nodejs-modules", ["warn", { isDesktopOnly: false }], nodeImport),
        tsEntry: ts.rules?.["obsidianmd/no-nodejs-modules"],
        jsEntry: js.rules?.["obsidianmd/no-nodejs-modules"],
    },
    regexLookbehind: {
        unset: reports("regex-lookbehind", "error", "const re = /(?<=a)b/;"),
    },
    nodeGlobals: {
        ts: declaresGlobal(ts, "process"),
        js: declaresGlobal(js, "process"),
    },
    nodeNamespace: {
        ts: declaresGlobal(ts, "NodeJS"),
        js: declaresGlobal(js, "NodeJS"),
    },
    noDeprecated: {
        tsEntry: ts.rules?.["@typescript-eslint/no-deprecated"],
    },
    settingsHeadingPluginName: reports("settings-tab/no-problematic-settings-headings", "error", pluginNameHeading),
}));
