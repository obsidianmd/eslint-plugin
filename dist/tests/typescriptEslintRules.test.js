import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
const ruleTester = new RuleTester();
ruleTester.run("ts-no-unused-vars", tseslintPlugin.rules["no-unused-vars"], {
    valid: [
        {
            name: "used variable is allowed",
            code: "const x = 1; console.log(x);",
            options: [{ args: "none" }],
        },
        {
            name: "unused function argument is allowed with args: none",
            code: "function foo(unusedParam: string) { return 1; }; foo('test');",
            options: [{ args: "none" }],
        },
    ],
    invalid: [
        {
            name: "unused variable is forbidden",
            code: "const unused = 1;",
            options: [{ args: "none" }],
            errors: [{ messageId: "unusedVar" }],
        },
    ],
});
ruleTester.run("ts-no-explicit-any", tseslintPlugin.rules["no-explicit-any"], {
    valid: [
        {
            name: "unknown type is allowed",
            code: "const x: unknown = 1;",
            options: [{ fixToUnknown: true }],
        },
        {
            name: "specific type is allowed",
            code: "const x: string = 'hello';",
            options: [{ fixToUnknown: true }],
        },
    ],
    invalid: [
        {
            name: "any type is forbidden and auto-fixed to unknown",
            code: "const x: any = 1;",
            options: [{ fixToUnknown: true }],
            output: "const x: unknown = 1;",
            errors: [{
                    messageId: "unexpectedAny",
                    suggestions: [
                        {
                            messageId: "suggestUnknown",
                            output: "const x: unknown = 1;",
                        },
                        {
                            messageId: "suggestNever",
                            output: "const x: never = 1;",
                        },
                    ],
                }],
        },
        {
            name: "any in function parameter is forbidden and auto-fixed",
            code: "function foo(x: any) {}; foo(1);",
            options: [{ fixToUnknown: true }],
            output: "function foo(x: unknown) {}; foo(1);",
            errors: [{
                    messageId: "unexpectedAny",
                    suggestions: [
                        {
                            messageId: "suggestUnknown",
                            output: "function foo(x: unknown) {}; foo(1);",
                        },
                        {
                            messageId: "suggestNever",
                            output: "function foo(x: never) {}; foo(1);",
                        },
                    ],
                }],
        },
    ],
});
ruleTester.run("ts-no-array-constructor", tseslintPlugin.rules["no-array-constructor"], {
    valid: [
        {
            name: "array literal is allowed",
            code: "const arr = [1, 2, 3];",
        },
    ],
    invalid: [
        {
            name: "Array constructor with args is forbidden",
            code: "const arr = new Array(1, 2, 3);",
            output: "const arr = [1, 2, 3];",
            errors: [{ messageId: "useLiteral" }],
        },
    ],
});
ruleTester.run("ts-no-duplicate-enum-values", tseslintPlugin.rules["no-duplicate-enum-values"], {
    valid: [
        {
            name: "unique enum values are allowed",
            code: "enum E { A = 1, B = 2 }",
        },
    ],
    invalid: [
        {
            name: "duplicate enum values are forbidden",
            code: "enum E { A = 1, B = 1 }",
            errors: [{ messageId: "duplicateValue" }],
        },
    ],
});
ruleTester.run("ts-no-empty-object-type", tseslintPlugin.rules["no-empty-object-type"], {
    valid: [
        {
            name: "interface with members is allowed",
            code: "interface Foo { bar: string; }",
        },
    ],
    invalid: [
        {
            name: "empty interface is forbidden",
            code: "interface Foo {}",
            errors: [{ messageId: "noEmptyInterface", suggestions: [{ messageId: "replaceEmptyInterface", output: "type Foo = object" }, { messageId: "replaceEmptyInterface", output: "type Foo = unknown" }] }],
        },
    ],
});
ruleTester.run("ts-no-extra-non-null-assertion", tseslintPlugin.rules["no-extra-non-null-assertion"], {
    valid: [
        {
            name: "single non-null assertion is allowed",
            code: "const x = value!;",
        },
    ],
    invalid: [
        {
            name: "double non-null assertion is forbidden",
            code: "const x = value!!;",
            output: "const x = value!;",
            errors: [{ messageId: "noExtraNonNullAssertion" }],
        },
    ],
});
ruleTester.run("ts-no-misused-new", tseslintPlugin.rules["no-misused-new"], {
    valid: [
        {
            name: "new in class is allowed",
            code: "class C { constructor() {} }",
        },
    ],
    invalid: [
        {
            name: "new in interface is forbidden",
            code: "interface I { new(): I; }",
            errors: [{ messageId: "errorMessageInterface" }],
        },
    ],
});
ruleTester.run("ts-no-namespace", tseslintPlugin.rules["no-namespace"], {
    valid: [
        {
            name: "module declaration in .d.ts style is allowed",
            code: "declare module 'foo' {}",
        },
    ],
    invalid: [
        {
            name: "namespace declaration is forbidden",
            code: "namespace Foo {}",
            errors: [{ messageId: "moduleSyntaxIsPreferred" }],
        },
    ],
});
ruleTester.run("ts-no-non-null-asserted-optional-chain", tseslintPlugin.rules["no-non-null-asserted-optional-chain"], {
    valid: [
        {
            name: "optional chaining without non-null assertion is allowed",
            code: "const x = obj?.foo;",
        },
    ],
    invalid: [
        {
            name: "non-null assertion after optional chain is forbidden",
            code: "const x = obj?.foo!;",
            errors: [{ messageId: "noNonNullOptionalChain", suggestions: [{ messageId: "suggestRemovingNonNull", output: "const x = obj?.foo;" }] }],
        },
    ],
});
ruleTester.run("ts-no-require-imports", tseslintPlugin.rules["no-require-imports"], {
    valid: [
        {
            name: "import statement is allowed",
            code: "import x from 'x';",
        },
    ],
    invalid: [
        {
            name: "require() is forbidden",
            code: "const x = require('x');",
            errors: [{ messageId: "noRequireImports" }],
        },
    ],
});
ruleTester.run("ts-no-this-alias", tseslintPlugin.rules["no-this-alias"], {
    valid: [
        {
            name: "using this directly is allowed",
            code: "class A { method() { this.foo(); } }",
        },
    ],
    invalid: [
        {
            name: "aliasing this to a variable is forbidden",
            code: "class A { method() { const self = this; } }",
            errors: [{ messageId: "thisAssignment" }],
        },
    ],
});
ruleTester.run("ts-no-unnecessary-type-constraint", tseslintPlugin.rules["no-unnecessary-type-constraint"], {
    valid: [
        {
            name: "meaningful type constraint is allowed",
            code: "function foo<T extends string>(): T { return '' as T; }",
        },
    ],
    invalid: [
        {
            name: "extends unknown constraint is forbidden",
            code: "function foo<T extends unknown>(): T { return '' as T; }",
            errors: [{ messageId: "unnecessaryConstraint", suggestions: [{ messageId: "removeUnnecessaryConstraint", output: "function foo<T>(): T { return '' as T; }" }] }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-declaration-merging", tseslintPlugin.rules["no-unsafe-declaration-merging"], {
    valid: [
        {
            name: "class without merging interface is allowed",
            code: "class Foo { bar: string = ''; }",
        },
    ],
    invalid: [
        {
            name: "interface merging with class is forbidden",
            code: "interface Foo {} class Foo {}",
            errors: [{ messageId: "unsafeMerging" }, { messageId: "unsafeMerging" }],
        },
    ],
});
ruleTester.run("ts-no-unsafe-function-type", tseslintPlugin.rules["no-unsafe-function-type"], {
    valid: [
        {
            name: "specific function type is allowed",
            code: "const fn: () => void = () => {};",
        },
    ],
    invalid: [
        {
            name: "Function type is forbidden",
            code: "const fn: Function = () => {};",
            errors: [{ messageId: "bannedFunctionType" }],
        },
    ],
});
ruleTester.run("ts-no-unused-expressions", tseslintPlugin.rules["no-unused-expressions"], {
    valid: [
        {
            name: "expression used in assignment is allowed",
            code: "const x = 1 + 2;",
        },
    ],
    invalid: [
        {
            name: "unused expression is forbidden",
            code: "1 + 2;",
            errors: [{ messageId: "unusedExpression" }],
        },
    ],
});
ruleTester.run("ts-no-wrapper-object-types", tseslintPlugin.rules["no-wrapper-object-types"], {
    valid: [
        {
            name: "primitive string type is allowed",
            code: "const x: string = 'hello';",
        },
    ],
    invalid: [
        {
            name: "String wrapper type is forbidden",
            code: "const x: String = 'hello';",
            output: "const x: string = 'hello';",
            errors: [{ messageId: "bannedClassType" }],
        },
    ],
});
ruleTester.run("ts-prefer-as-const", tseslintPlugin.rules["prefer-as-const"], {
    valid: [
        {
            name: "as const assertion is allowed",
            code: "const x = 'hello' as const;",
        },
    ],
    invalid: [
        {
            name: "type assertion to literal type is forbidden",
            code: "const x = 'hello' as 'hello';",
            output: "const x = 'hello' as const;",
            errors: [{ messageId: "preferConstAssertion" }],
        },
    ],
});
ruleTester.run("ts-prefer-namespace-keyword", tseslintPlugin.rules["prefer-namespace-keyword"], {
    valid: [
        {
            name: "namespace keyword is allowed",
            code: "namespace Foo {}",
        },
    ],
    invalid: [
        {
            name: "module keyword for namespace is forbidden",
            code: "module Foo {}",
            output: "namespace Foo {}",
            errors: [{ messageId: "useNamespace" }],
        },
    ],
});
ruleTester.run("ts-triple-slash-reference", tseslintPlugin.rules["triple-slash-reference"], {
    valid: [
        {
            name: "import statement is allowed",
            code: "import type { Foo } from 'foo';",
        },
    ],
    invalid: [
        {
            name: "triple-slash path reference is forbidden",
            code: '/// <reference path="foo" />',
            options: [{ path: "never" }],
            errors: [{ messageId: "tripleSlashReference" }],
        },
    ],
});
ruleTester.run("ts-no-deprecated", tseslintPlugin.rules["no-deprecated"], {
    valid: [
        {
            name: "non-deprecated function is allowed",
            code: `
                function current() { return 1; }
                current();
            `,
        },
    ],
    invalid: [
        {
            name: "deprecated function call with reason is forbidden",
            code: `
                /** @deprecated Use newFn instead */
                function oldFn() { return 1; }
                oldFn();
            `,
            errors: [{ messageId: "deprecatedWithReason" }],
        },
        {
            name: "deprecated property access with reason is forbidden",
            code: `
                class Foo {
                    /** @deprecated Use newProp instead */
                    oldProp = 1;
                    newProp = 2;
                }
                const foo = new Foo();
                foo.oldProp;
            `,
            errors: [{ messageId: "deprecatedWithReason" }],
        },
    ],
});
