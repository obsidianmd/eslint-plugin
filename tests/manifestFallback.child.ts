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

const nodeImport = "import fs from 'node:fs';";
const ts = await recommendedFor("src/main.ts");
const js = await recommendedFor("src/main.js");

console.log(JSON.stringify({
    noNodejsModules: {
        unset: reports("no-nodejs-modules", "warn", nodeImport),
        forcedOn: reports("no-nodejs-modules", ["warn", { isDesktopOnly: false }], nodeImport),
        tsEntry: ts.rules?.["obsidianmd/no-nodejs-modules"],
        jsEntry: js.rules?.["obsidianmd/no-nodejs-modules"],
    },
}));
