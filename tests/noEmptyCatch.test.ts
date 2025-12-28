import { RuleTester } from "@typescript-eslint/rule-tester";
import noEmptyCatch from "../lib/rules/noEmptyCatch.js";

const ruleTester = new RuleTester();

ruleTester.run("no-empty-catch", noEmptyCatch, {
    valid: [
        // Catch with error handling
        {
            code: `
try {
    doSomething();
} catch (error) {
    console.error(error);
}
            `,
        },
        // Catch with explanatory comment
        {
            code: `
try {
    doSomething();
} catch (error) {
    // Silently fail - this operation is optional
}
            `,
        },
        // Catch with block comment
        {
            code: `
try {
    doSomething();
} catch (error) {
    /* Intentionally ignored */
}
            `,
        },
        // Catch with actual code
        {
            code: `
try {
    doSomething();
} catch (error: unknown) {
    if (error instanceof Error) {
        console.error(error.message);
    }
}
            `,
        },
    ],
    invalid: [
        // Completely empty catch block
        {
            code: `
try {
    doSomething();
} catch (error) {
}
            `,
            errors: [{ messageId: "emptyCatch" }],
        },
        // Empty catch with no parameter
        {
            code: `
try {
    doSomething();
} catch {
}
            `,
            errors: [{ messageId: "emptyCatch" }],
        },
        // Empty catch with typed parameter
        {
            code: `
try {
    doSomething();
} catch (error: unknown) {
}
            `,
            errors: [{ messageId: "emptyCatch" }],
        },
    ],
});
