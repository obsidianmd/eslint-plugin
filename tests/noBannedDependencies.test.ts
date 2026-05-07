import { RuleTester } from "@typescript-eslint/rule-tester";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule, { resetScannedPaths } from "../lib/rules/noBannedDependencies.js";

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "noBannedDependencies");

function fixtureFile(fixture: string): string {
    return path.join(fixturesDir, fixture, "index.ts");
}

const ruleTester = new RuleTester({
    languageOptions: {
        parserOptions: {
            project: false,
        },
    },
});

ruleTester.run("no-banned-dependencies", rule, {
    valid: [
        {
            name: "no errors when package.json has only allowed dependencies",
            code: "export {};",
            filename: fixtureFile("clean"),
            before() { resetScannedPaths(); },
        },
        {
            name: "no errors when only native preset is used and dep is micro-utility",
            code: "export {};",
            filename: fixtureFile("banned"),
            options: [{ presets: ["native"], allowed: [] }],
            before() { resetScannedPaths(); },
        },
        {
            name: "no errors when package.json is malformed",
            code: "export {};",
            filename: fixtureFile("malformed"),
            before() { resetScannedPaths(); },
        },
        {
            name: "no errors when banned dep is in the allowed list",
            code: "export {};",
            filename: fixtureFile("banned"),
            options: [{ presets: ["microutilities"], allowed: ["is-number"] }],
            before() { resetScannedPaths(); },
        },
    ],
    invalid: [
        {
            name: "reports banned micro-utility in dependencies",
            code: "export {};",
            filename: fixtureFile("banned"),
            before() { resetScannedPaths(); },
            errors: [{ messageId: "bannedDependency" }],
        },
        {
            name: "reports banned deps across multiple sections",
            code: "export {};",
            filename: fixtureFile("multi-section"),
            before() { resetScannedPaths(); },
            errors: [
                { messageId: "bannedDependency" },
                { messageId: "bannedDependency" },
            ],
        },
    ],
});
