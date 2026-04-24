import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
const ruleTester = new RuleTester();
ruleTester.run("ts-await-thenable", tseslintPlugin.rules["await-thenable"], {
    valid: [
        {
            name: "awaiting a Promise is allowed",
            code: "async function f() { await Promise.resolve(1); }",
        },
    ],
    invalid: [
        {
            name: "awaiting a non-thenable is forbidden",
            code: "async function f() { await 1; }",
            errors: [{ messageId: "await", suggestions: [{ messageId: "removeAwait", output: "async function f() {  1; }" }] }],
        },
    ],
});
ruleTester.run("ts-no-array-delete", tseslintPlugin.rules["no-array-delete"], {
    valid: [
        {
            name: "splice on array is allowed",
            code: "const arr = [1, 2, 3]; arr.splice(1, 1);",
        },
    ],
    invalid: [
        {
            name: "delete on array element is forbidden",
            code: "const arr = [1, 2, 3]; delete arr[1];",
            errors: [{ messageId: "noArrayDelete", suggestions: [{ messageId: "useSplice", output: "const arr = [1, 2, 3]; arr.splice(1, 1);" }] }],
        },
    ],
});
ruleTester.run("ts-no-base-to-string", tseslintPlugin.rules["no-base-to-string"], {
    valid: [
        {
            name: "string concatenation with string is allowed",
            code: "const x = 'hello' + ' world';",
        },
    ],
    invalid: [
        {
            name: "template literal with object is forbidden",
            code: "const obj = {}; const x = `${obj}`;",
            errors: [{ messageId: "baseToString" }],
        },
    ],
});
ruleTester.run("ts-no-duplicate-type-constituents", tseslintPlugin.rules["no-duplicate-type-constituents"], {
    valid: [
        {
            name: "union with unique types is allowed",
            code: "type T = string | number;",
        },
    ],
    invalid: [
        {
            name: "union with duplicate types is forbidden",
            code: "type T = string | string;",
            output: "type T = string  ;",
            errors: [{ messageId: "duplicate" }],
        },
    ],
});
ruleTester.run("ts-no-floating-promises", tseslintPlugin.rules["no-floating-promises"], {
    valid: [
        {
            name: "awaited promise is allowed",
            code: "async function f() { await Promise.resolve(1); }",
        },
    ],
    invalid: [
        {
            name: "unhandled promise is forbidden",
            code: "async function f() { Promise.resolve(1); }",
            errors: [{ messageId: "floatingVoid", suggestions: [{ messageId: "floatingFixVoid", output: "async function f() { void Promise.resolve(1); }" }, { messageId: "floatingFixAwait", output: "async function f() { await Promise.resolve(1); }" }] }],
        },
    ],
});
ruleTester.run("ts-no-for-in-array", tseslintPlugin.rules["no-for-in-array"], {
    valid: [
        {
            name: "for-of on array is allowed",
            code: "const arr = [1, 2, 3]; for (const x of arr) {}",
        },
    ],
    invalid: [
        {
            name: "for-in on array is forbidden",
            code: "const arr = [1, 2, 3]; for (const x in arr) {}",
            errors: [{ messageId: "forInViolation" }],
        },
    ],
});
ruleTester.run("ts-no-implied-eval", tseslintPlugin.rules["no-implied-eval"], {
    valid: [
        {
            name: "setTimeout with function is allowed",
            code: "setTimeout(() => {}, 100);",
        },
    ],
    invalid: [
        {
            name: "setTimeout with string variable is forbidden",
            code: "const code = 'alert(1)'; setTimeout(code, 100);",
            errors: [{ messageId: "noImpliedEvalError" }],
        },
    ],
});
ruleTester.run("ts-no-misused-promises", tseslintPlugin.rules["no-misused-promises"], {
    valid: [
        {
            name: "non-async function in boolean context is allowed",
            code: "function check(): boolean { return true; } if (check()) {}",
        },
    ],
    invalid: [
        {
            name: "async function in boolean context is forbidden",
            code: "async function check() { return true; } if (check()) {}",
            errors: [{ messageId: "conditional" }],
        },
    ],
});
ruleTester.run("ts-no-redundant-type-constituents", tseslintPlugin.rules["no-redundant-type-constituents"], {
    valid: [
        {
            name: "union without redundant types is allowed",
            code: "type T = string | number;",
        },
    ],
    invalid: [
        {
            name: "string literal in string union is redundant",
            code: "type T = string | 'hello';",
            errors: [{ messageId: "literalOverridden" }],
        },
    ],
});
ruleTester.run("ts-no-unnecessary-type-assertion", tseslintPlugin.rules["no-unnecessary-type-assertion"], {
    valid: [
        {
            name: "necessary type assertion is allowed",
            code: "const x: unknown = 1; const y = x as number;",
        },
    ],
    invalid: [
        {
            name: "unnecessary non-null assertion is forbidden",
            code: "const x = 1; const y = x!;",
            output: "const x = 1; const y = x;",
            errors: [{ messageId: "unnecessaryAssertion" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-argument", tseslintPlugin.rules["no-unsafe-argument"], {
    valid: [
        {
            name: "passing typed argument is allowed",
            code: "function foo(x: string) {} foo('hello');",
        },
    ],
    invalid: [
        {
            name: "passing any-typed argument is forbidden",
            code: "declare const x: any; function foo(a: string) {} foo(x);",
            errors: [{ messageId: "unsafeArgument" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-assignment", tseslintPlugin.rules["no-unsafe-assignment"], {
    valid: [
        {
            name: "typed assignment is allowed",
            code: "const x: string = 'hello';",
        },
    ],
    invalid: [
        {
            name: "any-typed assignment is forbidden",
            code: "declare const x: any; const y: string = x;",
            errors: [{ messageId: "anyAssignment" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-call", tseslintPlugin.rules["no-unsafe-call"], {
    valid: [
        {
            name: "calling typed function is allowed",
            code: "function foo(): void {} foo();",
        },
    ],
    invalid: [
        {
            name: "calling any-typed value is forbidden",
            code: "declare const fn: any; fn();",
            errors: [{ messageId: "unsafeCall" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-enum-comparison", tseslintPlugin.rules["no-unsafe-enum-comparison"], {
    valid: [
        {
            name: "comparing enum to same enum is allowed",
            code: "enum E { A, B } const x: E = E.A; if (x === E.B) {}",
        },
    ],
    invalid: [
        {
            name: "comparing enum to number is forbidden",
            code: "enum E { A, B } const x: E = E.A; if (x === 1) {}",
            errors: [{ messageId: "mismatchedCondition" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-member-access", tseslintPlugin.rules["no-unsafe-member-access"], {
    valid: [
        {
            name: "accessing typed property is allowed",
            code: "const obj = { foo: 1 }; obj.foo;",
        },
    ],
    invalid: [
        {
            name: "accessing property on any-typed value is forbidden",
            code: "declare const obj: any; obj.foo;",
            errors: [{ messageId: "unsafeMemberExpression" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-return", tseslintPlugin.rules["no-unsafe-return"], {
    valid: [
        {
            name: "returning typed value is allowed",
            code: "function foo(): string { return 'hello'; }",
        },
    ],
    invalid: [
        {
            name: "returning any-typed value is forbidden",
            code: "declare const x: any; function foo(): string { return x; }",
            errors: [{ messageId: "unsafeReturn" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-unary-minus", tseslintPlugin.rules["no-unsafe-unary-minus"], {
    valid: [
        {
            name: "negating a number is allowed",
            code: "const x = 1; const y = -x;",
        },
    ],
    invalid: [
        {
            name: "negating string-typed value is forbidden",
            code: "const x = 'hello'; const y = -x;",
            errors: [{ messageId: "unaryMinus" }],
        },
    ],
});
ruleTester.run("ts-only-throw-error", tseslintPlugin.rules["only-throw-error"], {
    valid: [
        {
            name: "throwing Error instance is allowed",
            code: "throw new Error('oops');",
        },
    ],
    invalid: [
        {
            name: "throwing string literal is forbidden",
            code: "throw 'oops';",
            errors: [{ messageId: "object" }],
        },
    ],
});
ruleTester.run("ts-prefer-promise-reject-errors", tseslintPlugin.rules["prefer-promise-reject-errors"], {
    valid: [
        {
            name: "rejecting with Error is allowed",
            code: "Promise.reject(new Error('oops'));",
        },
    ],
    invalid: [
        {
            name: "rejecting with string is forbidden",
            code: "Promise.reject('oops');",
            errors: [{ messageId: "rejectAnError" }],
        },
    ],
});
ruleTester.run("ts-restrict-plus-operands", tseslintPlugin.rules["restrict-plus-operands"], {
    valid: [
        {
            name: "adding two numbers is allowed",
            code: "const x = 1 + 2;",
        },
    ],
    invalid: [
        {
            name: "adding bigint and number is forbidden",
            code: "const x = 1n + 1;",
            errors: [{ messageId: "bigintAndNumber" }],
        },
    ],
});
ruleTester.run("ts-restrict-template-expressions", tseslintPlugin.rules["restrict-template-expressions"], {
    valid: [
        {
            name: "template literal with string is allowed",
            code: "const name = 'world'; const x = `hello ${name}`;",
        },
    ],
    invalid: [
        {
            name: "template literal with object is forbidden",
            code: "const obj = {}; const x = `hello ${obj}`;",
            errors: [{ messageId: "invalidType" }],
        },
    ],
});
ruleTester.run("ts-unbound-method", tseslintPlugin.rules["unbound-method"], {
    valid: [
        {
            name: "calling method directly is allowed",
            code: "class A { method() {} } const a = new A(); a.method();",
        },
    ],
    invalid: [
        {
            name: "extracting method without binding is forbidden",
            code: "class A { method() {} } const a = new A(); const fn = a.method;",
            errors: [{ messageId: "unboundWithoutThisAnnotation" }],
        },
    ],
});
