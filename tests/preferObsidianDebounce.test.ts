import { RuleTester } from "@typescript-eslint/rule-tester";
import preferObsidianDebounce from "../lib/rules/preferObsidianDebounce.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-obsidian-debounce", preferObsidianDebounce, {
    valid: [
        // Correct usage - importing from obsidian
        { code: "import { debounce } from 'obsidian';" },
        // Using Obsidian's debounce
        {
            code: `
import { debounce } from 'obsidian';
const debouncedFn = debounce(() => {}, 300, true);
            `,
        },
        // Importing other things from lodash
        { code: "import { map } from 'lodash';" },
        { code: "import { throttle } from 'lodash';" },
        // Regular functions not named debounce
        {
            code: `
function myHelper() {
    let timeout: number;
    return () => {};
}
            `,
        },
    ],
    invalid: [
        // Lodash debounce import
        {
            code: "import { debounce } from 'lodash';",
            errors: [
                {
                    messageId: "useObsidianDebounce",
                    data: { source: "lodash" },
                },
            ],
        },
        // Lodash-es debounce import
        {
            code: "import { debounce } from 'lodash-es';",
            errors: [
                {
                    messageId: "useObsidianDebounce",
                    data: { source: "lodash-es" },
                },
            ],
        },
        // Direct lodash/debounce import
        {
            code: "import debounce from 'lodash/debounce';",
            errors: [
                {
                    messageId: "useObsidianDebounce",
                    data: { source: "lodash/debounce" },
                },
            ],
        },
        // Underscore debounce
        {
            code: "import { debounce } from 'underscore';",
            errors: [
                {
                    messageId: "useObsidianDebounce",
                    data: { source: "underscore" },
                },
            ],
        },
        // Custom debounce function declaration
        {
            code: `
function debounce(fn: Function, delay: number) {
    let timeout: number;
    return (...args: unknown[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => fn(...args), delay);
    };
}
            `,
            errors: [{ messageId: "customDebounce" }],
        },
        // Custom debounce arrow function
        {
            code: `
const debounce = (fn: Function, delay: number) => {
    let timer: number;
    return (...args: unknown[]) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => fn(...args), delay);
    };
};
            `,
            errors: [{ messageId: "customDebounce" }],
        },
        // Custom debounce with different naming
        {
            code: `
const createDebouncedFunction = (fn: Function, delay: number) => {
    let timeoutId: number;
    return () => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(fn, delay);
    };
};
            `,
            errors: [{ messageId: "customDebounce" }],
        },
    ],
});
