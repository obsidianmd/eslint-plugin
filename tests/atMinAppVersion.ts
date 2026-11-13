import type { RuleTester } from "@typescript-eslint/rule-tester";

// The repository's own manifest.json says 0.15.0, which the rules whose
// rewrites need a newer Obsidian read when a test gives no `minAppVersion`.
// This runs the tests that do not give one at `minAppVersion`; the tests of
// the version gating pass their own.
export function atMinAppVersion(tester: RuleTester, minAppVersion: string): RuleTester {
    const run = tester.run.bind(tester);
    const withVersion = (test: unknown) => {
        const item: { code?: string; options?: unknown[] } = typeof test === "string" ? { code: test } : (test as { options?: unknown[] });
        return item.options ? item : { ...item, options: [{ minAppVersion }] };
    };
    tester.run = ((name: string, rule: unknown, tests: { valid: unknown[]; invalid: unknown[] }) =>
        run(name, rule as never, {
            valid: tests.valid.map(withVersion),
            invalid: tests.invalid.map(withVersion),
        } as never)) as typeof tester.run;
    return tester;
}
