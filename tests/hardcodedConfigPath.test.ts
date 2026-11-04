import { RuleTester } from "@typescript-eslint/rule-tester";
import hardcodedConfigPathRule from "../lib/rules/hardcodedConfigPath.js";

const ruleTester = new RuleTester();

ruleTester.run("hardcoded-config-path", hardcodedConfigPathRule, {
    valid: [
        {
            name: ".config string is allowed",
            code: 'const config = ".config";',
        },
        {
            name: ".obsidian-cache string is allowed",
            code: 'const config = ".obsidian-cache";',
        },
        {
            name: ".obsidianCache string is allowed",
            code: 'const config = ".obsidianCache";',
        },
        {
            name: "URL string is allowed",
            code: 'const config = "https://publish.obsidian.md/";',
        },
        {
            name: ".obsidianrc string is allowed",
            code: 'const config = ".obsidianrc";',
        },
        {
            name: ".obsidian after a letter or a digit of any case is part of a longer name",
            code: 'const a = "vault.obsidian"; const b = "VAULT.obsidian"; const c = "backup2.obsidian";',
        },
        {
            name: ".obsidian followed by an underscore, or by a dot and a capital or a digit, is a longer name",
            code: 'const a = ".obsidian_backup"; const b = ".obsidian.Backup"; const c = ".obsidian.2";',
        },
        {
            name: "a regular expression is not a string",
            code: "const pattern = /\\.obsidian\\//;",
        },
        {
            name: "a file in the vault root named .obsidian.vimrc is allowed",
            code: 'const a = ".obsidian.vimrc"; const b = "vault/.obsidian.md"; const c = `${base}/.obsidian.${ext}`;',
        },
        {
            name: ".obsidian followed by a digit is a longer name",
            code: 'const a = ".obsidian2/plugins"; const b = `${base}/.obsidian2`;',
        },
        {
            name: "a template literal without .obsidian is allowed",
            code: "const config = `${vault.configDir}/plugins/${id}`;",
        },
        {
            name: ".obsidian as part of a longer name in a template literal is allowed",
            code: "const a = `${base}/.obsidian-cache/${id}`; const b = `.obsidianrc`; const c = `${dir}/.obsidianCache`;",
        },
        {
            name: "an Obsidian host in a template literal is allowed",
            code: "const url = `https://publish.obsidian.md/${site}/${page}`;",
        },
        {
            name: "a placeholder right before .obsidian may end the name, as in a host",
            code: "const a = `https://${sub}.obsidian.md/`; const b = `${dir}.obsidian`;",
        },
        {
            name: "a placeholder right after .obsidian may continue the name",
            code: "const a = `.obsidian${suffix}`; const b = `${base}/.obsidian${suffix}/x`;",
        },
        {
            name: "an escaped dot after a letter is not a path segment",
            code: "const a = `vault\\.obsidian`.length; const b = `a\\x2eobsidian`;",
        },
    ],
    invalid: [
        {
            name: ".obsidian string is forbidden",
            code: 'const config = ".obsidian";',
            errors: [{ messageId: "configPath" }],
        },
        {
            name: ".obsidian/ path is forbidden",
            code: 'const config = ".obsidian/workspace.json";',
            errors: [{ messageId: "configPath" }],
        },
        {
            name: ".obsidian in the middle of a path is forbidden",
            code: 'const config = "vault/.obsidian/workspace.json";',
            errors: [{ messageId: "configPath" }],
        },
        {
            name: ".obsidian at the end of a sentence is forbidden",
            code: 'const hint = "Your settings are in .obsidian."; const tip = `Open ${vault}/.obsidian. Then restart.`;',
            errors: [{ messageId: "configPath" }, { messageId: "configPath" }],
        },
        {
            name: ".obsidian with backslashes is forbidden",
            code: 'const a = "C:\\\\vault\\\\.obsidian\\\\plugins"; const b = `${vault}\\\\.obsidian`;',
            errors: [{ messageId: "configPath" }, { messageId: "configPath" }],
        },
        {
            name: "a template literal with .obsidian after a placeholder and a slash is forbidden",
            code: "const config = `${base}/.obsidian/plugins`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: "a template literal starting with .obsidian/ is forbidden",
            code: "const config = `.obsidian/${x}`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: "a template literal ending with /.obsidian is forbidden",
            code: "const config = `${vault}/.obsidian`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: "a template literal without placeholders is forbidden",
            code: "const config = `.obsidian/workspace.json`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: ".obsidian between two placeholders is forbidden when slashes separate them",
            code: "const config = `${vault}/.obsidian/plugins/${id}/data.json`;",
            errors: [{ messageId: "configPath", column: 24, endColumn: 46 }],
        },
        {
            name: "a template literal is reported once",
            code: "const config = `${a}/.obsidian/${b}/.obsidian`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: "an untagged template is matched as it evaluates",
            code: "const config = `\\x2eobsidian/plugins`;",
            errors: [{ messageId: "configPath" }],
        },
        {
            name: "a tagged template is matched as written",
            code: "const config = String.raw`${vault}\\.obsidian\\plugins`;",
            errors: [{ messageId: "configPath" }],
        },
    ],
});
