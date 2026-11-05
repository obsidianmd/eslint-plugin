import type { Linter } from "eslint";

// typescript-eslint builds each TypeScript program once for a command-line run
// (or with CI=true), except when the command line has `--fix`, because fixing
// lints the changed text again. `--fix-dry-run` fixes the same way but is not
// exempted, so from the second pass on, with `parserOptions.project`, each fixed
// file is type-checked in an isolated program of that file alone, without the
// tsconfig. On TypeScript 6 that crashes inside TypeScript ("Cannot read
// properties of undefined (reading 'includes')"). These configs give
// `--fix-dry-run` the exemption.
export function fixDryRunConfigs(argv: readonly string[]): Linter.Config[] {
    if (!argv.includes("--fix-dry-run")) {
        return [];
    }
    return [
        {
            files: ["**/*.{ts,cts,mts,tsx,js,cjs,mjs,jsx}"],
            languageOptions: { parserOptions: { disallowAutomaticSingleRunInference: true } },
        },
    ];
}
