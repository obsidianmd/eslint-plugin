import { RuleTester } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import globals from "globals";
import { restrictedGlobalsOptions, restrictedImportsOptions } from "../lib/ruleOptions.js";
const ruleTester = new RuleTester();
const scriptRuleTester = new RuleTester({
    languageOptions: { sourceType: "script" },
});
const browserGlobalsRuleTester = new RuleTester({
    languageOptions: { globals: globals.browser },
});
const es2022RuleTester = new RuleTester({
    languageOptions: { ecmaVersion: 2022 },
});
testJsConfigsRecommendedRules();
testExplicitlyConfiguredRules();
testTseslintEslintRecommendedRules();
function testJsConfigsRecommendedRules() {
    ruleTester.run("constructor-super", getBuiltinRule("constructor-super"), {
        valid: [
            {
                name: "constructor calling super in derived class is allowed",
                code: "class A {} class B extends A { constructor() { super(); } }",
            },
        ],
        invalid: [
            {
                name: "constructor without super in derived class is forbidden",
                code: "class A {} class B extends A { constructor() {} }",
                errors: [{ messageId: "missingAll" }],
            },
        ],
    });
    ruleTester.run("for-direction", getBuiltinRule("for-direction"), {
        valid: [
            {
                name: "incrementing counter with < condition is allowed",
                code: "for (let i = 0; i < 10; i++) {}",
            },
        ],
        invalid: [
            {
                name: "decrementing counter with < condition is forbidden",
                code: "for (let i = 0; i < 10; i--) {}",
                errors: [{ messageId: "incorrectDirection" }],
            },
        ],
    });
    ruleTester.run("getter-return", getBuiltinRule("getter-return"), {
        valid: [
            {
                name: "getter with return is allowed",
                code: "const obj = { get foo() { return 1; } };",
            },
        ],
        invalid: [
            {
                name: "getter without return is forbidden",
                code: "const obj = { get foo() {} };",
                errors: [{ messageId: "expected" }],
            },
        ],
    });
    ruleTester.run("no-async-promise-executor", getBuiltinRule("no-async-promise-executor"), {
        valid: [
            {
                name: "sync promise executor is allowed",
                code: "new Promise((resolve) => { resolve(1); });",
            },
        ],
        invalid: [
            {
                name: "async promise executor is forbidden",
                code: "new Promise(async (resolve) => { resolve(1); });",
                errors: [{ messageId: "async" }],
            },
        ],
    });
    ruleTester.run("no-case-declarations", getBuiltinRule("no-case-declarations"), {
        valid: [
            {
                name: "case with braces wrapping declarations is allowed",
                code: "switch (x) { case 0: { const a = 1; break; } }",
            },
        ],
        invalid: [
            {
                name: "case with unwrapped declaration is forbidden",
                code: "switch (x) { case 0: const a = 1; break; }",
                errors: [{ messageId: "unexpected", suggestions: [{ messageId: "addBrackets", output: "switch (x) { case 0: { const a = 1; break; } }" }] }],
            },
        ],
    });
    ruleTester.run("no-class-assign", getBuiltinRule("no-class-assign"), {
        valid: [
            {
                name: "using class without reassigning is allowed",
                code: "class A {} const a = new A();",
            },
        ],
        invalid: [
            {
                name: "reassigning class is forbidden",
                code: "class A {} A = 0;",
                errors: [{ messageId: "class" }],
            },
        ],
    });
    ruleTester.run("no-compare-neg-zero", getBuiltinRule("no-compare-neg-zero"), {
        valid: [
            {
                name: "comparing with zero is allowed",
                code: "if (x === 0) {}",
            },
        ],
        invalid: [
            {
                name: "comparing with -0 is forbidden",
                code: "if (x === -0) {}",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-cond-assign", getBuiltinRule("no-cond-assign"), {
        valid: [
            {
                name: "comparison in condition is allowed",
                code: "if (x === 1) {}",
            },
        ],
        invalid: [
            {
                name: "assignment in condition is forbidden",
                code: "if (x = 1) {}",
                errors: [{ messageId: "missing" }],
            },
        ],
    });
    ruleTester.run("no-const-assign", getBuiltinRule("no-const-assign"), {
        valid: [
            {
                name: "assigning to let variable is allowed",
                code: "let x = 1; x = 2;",
            },
        ],
        invalid: [
            {
                name: "reassigning const is forbidden",
                code: "const x = 1; x = 2;",
                errors: [{ messageId: "const" }],
            },
        ],
    });
    ruleTester.run("no-constant-binary-expression", getBuiltinRule("no-constant-binary-expression"), {
        valid: [
            {
                name: "comparing variables is allowed",
                code: "const result = a ?? b;",
            },
        ],
        invalid: [
            {
                name: "nullish coalescing on non-nullable is forbidden",
                code: "const result = {} ?? 'default';",
                errors: [{ messageId: "constantShortCircuit" }],
            },
        ],
    });
    ruleTester.run("no-constant-condition", getBuiltinRule("no-constant-condition"), {
        valid: [
            {
                name: "variable condition is allowed",
                code: "if (x) {}",
            },
        ],
        invalid: [
            {
                name: "constant true condition is forbidden",
                code: "if (true) {}",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-control-regex", getBuiltinRule("no-control-regex"), {
        valid: [
            {
                name: "normal regex is allowed",
                code: "const re = /foo/;",
            },
        ],
        invalid: [
            {
                name: "control character in regex is forbidden",
                code: "const re = /\\x00/;",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-debugger", getBuiltinRule("no-debugger"), {
        valid: [
            {
                name: "console.log is allowed",
                code: "console.log('debug');",
            },
        ],
        invalid: [
            {
                name: "debugger statement is forbidden",
                code: "debugger;",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    scriptRuleTester.run("no-delete-var", getBuiltinRule("no-delete-var"), {
        valid: [
            {
                name: "delete on object property is allowed",
                code: "var obj = { a: 1 }; delete obj.a;",
            },
        ],
        invalid: [
            {
                name: "delete on variable is forbidden",
                code: "var x = 1; delete x;",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    scriptRuleTester.run("no-dupe-args", getBuiltinRule("no-dupe-args"), {
        valid: [
            {
                name: "unique function parameters are allowed",
                code: "function foo(a, b) {}",
            },
        ],
        invalid: [
            {
                name: "duplicate function parameters are forbidden",
                code: "function foo(a, a) {}",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-dupe-class-members", getBuiltinRule("no-dupe-class-members"), {
        valid: [
            {
                name: "unique class methods are allowed",
                code: "class A { foo() {} bar() {} }",
            },
        ],
        invalid: [
            {
                name: "duplicate class methods are forbidden",
                code: "class A { foo() {} foo() {} }",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-dupe-else-if", getBuiltinRule("no-dupe-else-if"), {
        valid: [
            {
                name: "unique else-if conditions are allowed",
                code: "if (a) {} else if (b) {}",
            },
        ],
        invalid: [
            {
                name: "duplicate else-if condition is forbidden",
                code: "if (a) {} else if (a) {}",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-dupe-keys", getBuiltinRule("no-dupe-keys"), {
        valid: [
            {
                name: "unique object keys are allowed",
                code: "const obj = { a: 1, b: 2 };",
            },
        ],
        invalid: [
            {
                name: "duplicate object keys are forbidden",
                code: "const obj = { a: 1, a: 2 };",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-duplicate-case", getBuiltinRule("no-duplicate-case"), {
        valid: [
            {
                name: "unique switch cases are allowed",
                code: "switch (x) { case 1: break; case 2: break; }",
            },
        ],
        invalid: [
            {
                name: "duplicate switch case is forbidden",
                code: "switch (x) { case 1: break; case 1: break; }",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-empty", getBuiltinRule("no-empty"), {
        valid: [
            {
                name: "block with comment is allowed",
                code: "if (x) { /* intentional */ }",
            },
        ],
        invalid: [
            {
                name: "empty block is forbidden",
                code: "if (x) {}",
                errors: [{ messageId: "unexpected", suggestions: [{ messageId: "suggestComment", output: "if (x) { /* empty */ }" }] }],
            },
        ],
    });
    ruleTester.run("no-empty-character-class", getBuiltinRule("no-empty-character-class"), {
        valid: [
            {
                name: "non-empty character class is allowed",
                code: "const re = /[abc]/;",
            },
        ],
        invalid: [
            {
                name: "empty character class is forbidden",
                code: "const re = /[]/;",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-empty-pattern", getBuiltinRule("no-empty-pattern"), {
        valid: [
            {
                name: "non-empty destructuring pattern is allowed",
                code: "const { a } = obj;",
            },
        ],
        invalid: [
            {
                name: "empty destructuring pattern is forbidden",
                code: "const {} = obj;",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    es2022RuleTester.run("no-empty-static-block", getBuiltinRule("no-empty-static-block"), {
        valid: [
            {
                name: "static block with content is allowed",
                code: "class A { static { this.x = 1; } }",
            },
        ],
        invalid: [
            {
                name: "empty static block is forbidden",
                code: "class A { static {} }",
                errors: [{ messageId: "unexpected", suggestions: [{ messageId: "suggestComment", output: "class A { static { /* empty */ } }" }] }],
            },
        ],
    });
    ruleTester.run("no-ex-assign", getBuiltinRule("no-ex-assign"), {
        valid: [
            {
                name: "using catch parameter without reassignment is allowed",
                code: "try {} catch (e) { console.log(e); }",
            },
        ],
        invalid: [
            {
                name: "reassigning catch parameter is forbidden",
                code: "try {} catch (e) { e = 10; }",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    ruleTester.run("no-extra-boolean-cast", getBuiltinRule("no-extra-boolean-cast"), {
        valid: [
            {
                name: "single negation is allowed",
                code: "if (!x) {}",
            },
        ],
        invalid: [
            {
                name: "double negation in boolean context is forbidden",
                code: "if (!!x) {}",
                output: "if (x) {}",
                errors: [{ messageId: "unexpectedNegation" }],
            },
        ],
    });
    ruleTester.run("no-fallthrough", getBuiltinRule("no-fallthrough"), {
        valid: [
            {
                name: "case with break is allowed",
                code: "switch (x) { case 1: doSomething(); break; case 2: break; }",
            },
        ],
        invalid: [
            {
                name: "case without break falling through is forbidden",
                code: "switch (x) { case 1: doSomething(); case 2: break; }",
                errors: [{ messageId: "case" }],
            },
        ],
    });
    ruleTester.run("no-func-assign", getBuiltinRule("no-func-assign"), {
        valid: [
            {
                name: "using function without reassignment is allowed",
                code: "function foo() {} foo();",
            },
        ],
        invalid: [
            {
                name: "reassigning function declaration is forbidden",
                code: "function foo() {} foo = 1;",
                errors: [{ messageId: "isAFunction" }],
            },
        ],
    });
    ruleTester.run("no-global-assign", getBuiltinRule("no-global-assign"), {
        valid: [
            {
                name: "reading global is allowed",
                code: "const x = undefined;",
            },
        ],
        invalid: [
            {
                name: "assigning to global is forbidden",
                code: "undefined = 1;",
                errors: [{ messageId: "globalShouldNotBeModified" }],
            },
        ],
    });
    ruleTester.run("no-import-assign", getBuiltinRule("no-import-assign"), {
        valid: [
            {
                name: "using import binding is allowed",
                code: "import x from 'mod'; console.log(x);",
            },
        ],
        invalid: [
            {
                name: "reassigning import binding is forbidden",
                code: "import x from 'mod'; x = 1;",
                errors: [{ messageId: "readonly" }],
            },
        ],
    });
    ruleTester.run("no-invalid-regexp", getBuiltinRule("no-invalid-regexp"), {
        valid: [
            {
                name: "valid RegExp constructor is allowed",
                code: "new RegExp('abc');",
            },
        ],
        invalid: [
            {
                name: "invalid RegExp pattern is forbidden",
                code: "new RegExp('[');",
                errors: [{ messageId: "regexMessage" }],
            },
        ],
    });
    ruleTester.run("no-irregular-whitespace", getBuiltinRule("no-irregular-whitespace"), {
        valid: [
            {
                name: "regular whitespace is allowed",
                code: "const x = 1;",
            },
        ],
        invalid: [
            {
                name: "irregular whitespace is forbidden",
                code: "const x =\u00a01;",
                errors: [{ messageId: "noIrregularWhitespace" }],
            },
        ],
    });
    ruleTester.run("no-loss-of-precision", getBuiltinRule("no-loss-of-precision"), {
        valid: [
            {
                name: "precise number literal is allowed",
                code: "const x = 12345;",
            },
        ],
        invalid: [
            {
                name: "number literal losing precision is forbidden",
                code: "const x = 9007199254740993;",
                errors: [{ messageId: "noLossOfPrecision" }],
            },
        ],
    });
    ruleTester.run("no-misleading-character-class", getBuiltinRule("no-misleading-character-class"), {
        valid: [
            {
                name: "simple character class is allowed",
                code: "const re = /[abc]/;",
            },
        ],
        invalid: [
            {
                name: "surrogate pair in character class without u flag is forbidden",
                code: "const re = /[👍]/;",
                errors: [{ messageId: "surrogatePairWithoutUFlag", suggestions: [{ messageId: "suggestUnicodeFlag", output: "const re = /[👍]/u;" }] }],
            },
        ],
    });
    ruleTester.run("no-new-native-nonconstructor", getBuiltinRule("no-new-native-nonconstructor"), {
        valid: [
            {
                name: "calling Symbol without new is allowed",
                code: "const s = Symbol('foo');",
            },
        ],
        invalid: [
            {
                name: "new Symbol() is forbidden",
                code: "const s = new Symbol('foo');",
                errors: [{ messageId: "noNewNonconstructor" }],
            },
        ],
    });
    scriptRuleTester.run("no-nonoctal-decimal-escape", getBuiltinRule("no-nonoctal-decimal-escape"), {
        valid: [
            {
                name: "normal string is allowed",
                code: "var x = 'hello';",
            },
        ],
        invalid: [
            {
                name: "non-octal decimal escape in string is forbidden",
                code: "var x = '\\8';",
                errors: [{ messageId: "decimalEscape", suggestions: [{ messageId: "refactor", output: "var x = '8';" }, { messageId: "escapeBackslash", output: "var x = '\\\\8';" }] }],
            },
        ],
    });
    browserGlobalsRuleTester.run("no-obj-calls", getBuiltinRule("no-obj-calls"), {
        valid: [
            {
                name: "using Math property is allowed",
                code: "const x = Math.PI;",
            },
        ],
        invalid: [
            {
                name: "calling Math as function is forbidden",
                code: "const x = Math();",
                errors: [{ messageId: "unexpectedCall" }],
            },
        ],
    });
    scriptRuleTester.run("no-octal", getBuiltinRule("no-octal"), {
        valid: [
            {
                name: "decimal number is allowed",
                code: "var x = 10;",
            },
        ],
        invalid: [
            {
                name: "octal literal is forbidden",
                code: "var x = 071;",
                errors: [{ messageId: "noOctal" }],
            },
        ],
    });
    ruleTester.run("no-prototype-builtins", getBuiltinRule("no-prototype-builtins"), {
        valid: [
            {
                name: "Object.prototype.hasOwnProperty.call is allowed",
                code: "Object.prototype.hasOwnProperty.call(obj, 'foo');",
            },
        ],
        invalid: [
            {
                name: "calling hasOwnProperty directly on object is forbidden",
                code: "obj.hasOwnProperty('foo');",
                errors: [{ messageId: "prototypeBuildIn", suggestions: [{ messageId: "callObjectPrototype", output: "Object.prototype.hasOwnProperty.call(obj, 'foo');" }] }],
            },
        ],
    });
    scriptRuleTester.run("no-redeclare", getBuiltinRule("no-redeclare"), {
        valid: [
            {
                name: "unique variable names are allowed",
                code: "var a = 1; var b = 2;",
            },
        ],
        invalid: [
            {
                name: "redeclaring variable is forbidden",
                code: "var a = 1; var a = 2;",
                errors: [{ messageId: "redeclared" }],
            },
        ],
    });
    ruleTester.run("no-regex-spaces", getBuiltinRule("no-regex-spaces"), {
        valid: [
            {
                name: "regex with single space is allowed",
                code: "const re = /foo bar/;",
            },
        ],
        invalid: [
            {
                name: "regex with multiple consecutive spaces is forbidden",
                code: "const re = /foo  bar/;",
                output: "const re = /foo {2}bar/;",
                errors: [{ messageId: "multipleSpaces" }],
            },
        ],
    });
    ruleTester.run("no-self-assign", getBuiltinRule("no-self-assign"), {
        valid: [
            {
                name: "assigning different values is allowed",
                code: "let a = 1; a = 2;",
            },
        ],
        invalid: [
            {
                name: "self-assignment is forbidden",
                code: "let a = 1; a = a;",
                errors: [{ messageId: "selfAssignment" }],
            },
        ],
    });
    ruleTester.run("no-setter-return", getBuiltinRule("no-setter-return"), {
        valid: [
            {
                name: "setter without return value is allowed",
                code: "const obj = { set foo(val) { this._foo = val; } };",
            },
        ],
        invalid: [
            {
                name: "setter with return value is forbidden",
                code: "const obj = { set foo(val) { return val; } };",
                errors: [{ messageId: "returnsValue" }],
            },
        ],
    });
    ruleTester.run("no-shadow-restricted-names", getBuiltinRule("no-shadow-restricted-names"), {
        valid: [
            {
                name: "normal variable name is allowed",
                code: "const myVar = 1;",
            },
        ],
        invalid: [
            {
                name: "shadowing undefined is forbidden",
                code: "const undefined = 1;",
                errors: [{ messageId: "shadowingRestrictedName" }],
            },
        ],
    });
    ruleTester.run("no-sparse-arrays", getBuiltinRule("no-sparse-arrays"), {
        valid: [
            {
                name: "dense array is allowed",
                code: "const arr = [1, 2, 3];",
            },
        ],
        invalid: [
            {
                name: "sparse array with holes is forbidden",
                code: "const arr = [1, , 3];",
                errors: [{ messageId: "unexpectedSparseArray" }],
            },
        ],
    });
    ruleTester.run("no-this-before-super", getBuiltinRule("no-this-before-super"), {
        valid: [
            {
                name: "this after super is allowed",
                code: "class A {} class B extends A { constructor() { super(); this.x = 1; } }",
            },
        ],
        invalid: [
            {
                name: "this before super is forbidden",
                code: "class A {} class B extends A { constructor() { this.x = 1; super(); } }",
                errors: [{ messageId: "noBeforeSuper" }],
            },
        ],
    });
    ruleTester.run("no-unexpected-multiline", getBuiltinRule("no-unexpected-multiline"), {
        valid: [
            {
                name: "separate statements on separate lines are allowed",
                code: "const a = 1;\nconst b = 2;",
            },
        ],
        invalid: [
            {
                name: "unexpected function call from multiline is forbidden",
                code: "const a = b\n(1 + 2).toString()",
                errors: [{ messageId: "function" }],
            },
        ],
    });
    ruleTester.run("no-unreachable", getBuiltinRule("no-unreachable"), {
        valid: [
            {
                name: "code before return is allowed",
                code: "function foo() { const x = 1; return x; }",
            },
        ],
        invalid: [
            {
                name: "code after return is forbidden",
                code: "function foo() { return 1; const x = 2; }",
                errors: [{ messageId: "unreachableCode" }],
            },
        ],
    });
    ruleTester.run("no-unsafe-finally", getBuiltinRule("no-unsafe-finally"), {
        valid: [
            {
                name: "finally without control flow is allowed",
                code: "try {} finally { cleanup(); }",
            },
        ],
        invalid: [
            {
                name: "return in finally is forbidden",
                code: "function foo() { try {} finally { return 1; } }",
                errors: [{ messageId: "unsafeUsage" }],
            },
        ],
    });
    ruleTester.run("no-unsafe-negation", getBuiltinRule("no-unsafe-negation"), {
        valid: [
            {
                name: "negating before comparison is allowed",
                code: "if (!(a instanceof b)) {}",
            },
        ],
        invalid: [
            {
                name: "negating left side of instanceof is forbidden",
                code: "if (!a instanceof b) {}",
                errors: [{ messageId: "unexpected", suggestions: [{ messageId: "suggestNegatedExpression", output: "if (!(a instanceof b)) {}" }, { messageId: "suggestParenthesisedNegation", output: "if ((!a) instanceof b) {}" }] }],
            },
        ],
    });
    ruleTester.run("no-unsafe-optional-chaining", getBuiltinRule("no-unsafe-optional-chaining"), {
        valid: [
            {
                name: "optional chaining in non-arithmetic context is allowed",
                code: "const x = obj?.foo;",
            },
        ],
        invalid: [
            {
                name: "spreading optional chaining result is forbidden",
                code: "const arr = [...obj?.items];",
                errors: [{ messageId: "unsafeOptionalChain" }],
            },
        ],
    });
    ruleTester.run("no-unused-labels", getBuiltinRule("no-unused-labels"), {
        valid: [
            {
                name: "label used by break is allowed",
                code: "outer: for (;;) { break outer; }",
            },
        ],
        invalid: [
            {
                name: "unused label is forbidden",
                code: "unused: for (;;) { break; }",
                output: "for (;;) { break; }",
                errors: [{ messageId: "unused" }],
            },
        ],
    });
    es2022RuleTester.run("no-unused-private-class-members", getBuiltinRule("no-unused-private-class-members"), {
        valid: [
            {
                name: "used private field is allowed",
                code: "class A { #x = 1; getX() { return this.#x; } }",
            },
        ],
        invalid: [
            {
                name: "unused private field is forbidden",
                code: "class A { #x = 1; }",
                errors: [{ messageId: "unusedPrivateClassMember" }],
            },
        ],
    });
    ruleTester.run("no-useless-backreference", getBuiltinRule("no-useless-backreference"), {
        valid: [
            {
                name: "backreference after capturing group is allowed",
                code: "const re = /(a)\\1/;",
            },
        ],
        invalid: [
            {
                name: "backreference into a following group is forbidden",
                code: "const re = /\\1(a)/;",
                errors: [{ messageId: "forward" }],
            },
        ],
    });
    ruleTester.run("no-useless-catch", getBuiltinRule("no-useless-catch"), {
        valid: [
            {
                name: "catch that transforms error is allowed",
                code: "try {} catch (e) { throw new Error(e.message); }",
            },
        ],
        invalid: [
            {
                name: "catch that only rethrows is forbidden",
                code: "try {} catch (e) { throw e; }",
                errors: [{ messageId: "unnecessaryCatch" }],
            },
        ],
    });
    ruleTester.run("no-useless-escape", getBuiltinRule("no-useless-escape"), {
        valid: [
            {
                name: "necessary escape is allowed",
                code: "const x = '\\n';",
            },
        ],
        invalid: [
            {
                name: "useless escape is forbidden",
                code: "const x = '\\a';",
                errors: [{ messageId: "unnecessaryEscape", suggestions: [{ messageId: "removeEscape", output: "const x = 'a';" }, { messageId: "escapeBackslash", output: "const x = '\\\\a';" }] }],
            },
        ],
    });
    scriptRuleTester.run("no-with", getBuiltinRule("no-with"), {
        valid: [
            {
                name: "property access without with is allowed",
                code: "var x = obj.prop;",
            },
        ],
        invalid: [
            {
                name: "with statement is forbidden",
                code: "with (obj) { prop; }",
                errors: [{ messageId: "unexpectedWith" }],
            },
        ],
    });
    ruleTester.run("require-yield", getBuiltinRule("require-yield"), {
        valid: [
            {
                name: "generator with yield is allowed",
                code: "function* foo() { yield 1; }",
            },
        ],
        invalid: [
            {
                name: "generator without yield is forbidden",
                code: "function* foo() { return 1; }",
                errors: [{ messageId: "missingYield" }],
            },
        ],
    });
    ruleTester.run("use-isnan", getBuiltinRule("use-isnan"), {
        valid: [
            {
                name: "Number.isNaN is allowed",
                code: "if (Number.isNaN(x)) {}",
            },
        ],
        invalid: [
            {
                name: "comparison with NaN is forbidden",
                code: "if (x === NaN) {}",
                errors: [{ messageId: "comparisonWithNaN", suggestions: [{ messageId: "replaceWithIsNaN", output: "if (Number.isNaN(x)) {}" }] }],
            },
        ],
    });
    ruleTester.run("valid-typeof", getBuiltinRule("valid-typeof"), {
        valid: [
            {
                name: "valid typeof comparison is allowed",
                code: "if (typeof x === 'string') {}",
            },
        ],
        invalid: [
            {
                name: "invalid typeof comparison is forbidden",
                code: "if (typeof x === 'strig') {}",
                errors: [{ messageId: "invalidValue" }],
            },
        ],
    });
}
function testExplicitlyConfiguredRules() {
    ruleTester.run("no-self-compare", getBuiltinRule("no-self-compare"), {
        valid: [
            {
                name: "comparing different variables is allowed",
                code: "if (a === b) {}",
            },
        ],
        invalid: [
            {
                name: "comparing variable to itself is forbidden",
                code: "if (x === x) {}",
                errors: [{ messageId: "comparingToSelf" }],
            },
        ],
    });
    ruleTester.run("no-eval", getBuiltinRule("no-eval"), {
        valid: [
            {
                name: "normal function call is allowed",
                code: "JSON.parse('{}');",
            },
        ],
        invalid: [
            {
                name: "eval() is forbidden",
                code: "eval('alert(1)');",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
    browserGlobalsRuleTester.run("no-implied-eval", getBuiltinRule("no-implied-eval"), {
        valid: [
            {
                name: "setTimeout with function reference is allowed",
                code: "setTimeout(function() {}, 100);",
            },
            {
                name: "setTimeout with arrow function is allowed",
                code: "setTimeout(() => {}, 100);",
            },
        ],
        invalid: [
            {
                name: "setTimeout with string is forbidden",
                code: "setTimeout('alert(1)', 100);",
                errors: [{ messageId: "impliedEval" }],
            },
            {
                name: "setInterval with string is forbidden",
                code: "setInterval('doSomething()', 1000);",
                errors: [{ messageId: "impliedEval" }],
            },
        ],
    });
    scriptRuleTester.run("no-implicit-globals", getBuiltinRule("no-implicit-globals"), {
        valid: [
            {
                name: "IIFE-wrapped variable is allowed",
                code: "(function() { var x = 1; })();",
            },
            {
                name: "module sourceType is allowed",
                code: "var x = 1;",
                languageOptions: { sourceType: "module" },
            },
        ],
        invalid: [
            {
                name: "top-level var in script mode is forbidden",
                code: "var x = 1;",
                errors: [{ messageId: "globalNonLexicalBinding" }],
            },
            {
                name: "top-level function declaration in script mode is forbidden",
                code: "function foo() {}",
                errors: [{ messageId: "globalNonLexicalBinding" }],
            },
        ],
    });
    ruleTester.run("no-restricted-globals", getBuiltinRule("no-restricted-globals"), {
        valid: [
            {
                name: "non-restricted global is allowed",
                code: "console.log('hello');",
                options: restrictedGlobalsOptions,
            },
            {
                name: "local variable named app is allowed",
                code: "const app = getApp(); app.vault;",
                options: restrictedGlobalsOptions,
            },
        ],
        invalid: [
            {
                name: "global app is forbidden",
                code: "app.vault.getFiles();",
                options: restrictedGlobalsOptions,
                errors: [{ messageId: "customMessage" }],
            },
            {
                name: "global fetch is forbidden",
                code: "fetch('https://example.com');",
                options: restrictedGlobalsOptions,
                errors: [{ messageId: "customMessage" }],
            },
            {
                name: "global localStorage is forbidden",
                code: "localStorage.getItem('key');",
                options: restrictedGlobalsOptions,
                errors: [{ messageId: "customMessage" }],
            },
        ],
    });
    ruleTester.run("no-restricted-imports", getBuiltinRule("no-restricted-imports"), {
        valid: [
            {
                name: "importing obsidian is allowed",
                code: "import { Plugin } from 'obsidian';",
                options: restrictedImportsOptions,
            },
            {
                name: "importing moment from obsidian is allowed",
                code: "import { moment } from 'obsidian';",
                options: restrictedImportsOptions,
            },
        ],
        invalid: [
            {
                name: "importing axios is forbidden",
                code: "import axios from 'axios';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing got is forbidden",
                code: "import got from 'got';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing node-fetch is forbidden",
                code: "import fetch from 'node-fetch';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing moment directly is forbidden",
                code: "import moment from 'moment';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing ky is forbidden",
                code: "import ky from 'ky';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing ofetch is forbidden",
                code: "import { ofetch } from 'ofetch';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
            {
                name: "importing superagent is forbidden",
                code: "import superagent from 'superagent';",
                options: restrictedImportsOptions,
                errors: [{ messageId: "pathWithCustomMessage" }],
            },
        ],
    });
    ruleTester.run("no-alert", getBuiltinRule("no-alert"), {
        valid: [
            {
                name: "new Notice is allowed",
                code: "new Notice('Hello');",
            },
        ],
        invalid: [
            {
                name: "alert() is forbidden",
                code: "alert('Hello');",
                errors: [{ messageId: "unexpected" }],
            },
            {
                name: "confirm() is forbidden",
                code: "confirm('Are you sure?');",
                errors: [{ messageId: "unexpected" }],
            },
            {
                name: "prompt() is forbidden",
                code: "prompt('Enter value:');",
                errors: [{ messageId: "unexpected" }],
            },
        ],
    });
}
function testTseslintEslintRecommendedRules() {
    ruleTester.run("no-var", getBuiltinRule("no-var"), {
        valid: [
            {
                name: "const declaration is allowed",
                code: "const x = 1;",
            },
        ],
        invalid: [
            {
                name: "var declaration is forbidden",
                code: "var x = 1;",
                output: "let x = 1;",
                errors: [{ messageId: "unexpectedVar" }],
            },
        ],
    });
    ruleTester.run("prefer-rest-params", getBuiltinRule("prefer-rest-params"), {
        valid: [
            {
                name: "rest parameters are allowed",
                code: "function foo(...args) { return args; }",
            },
        ],
        invalid: [
            {
                name: "arguments object is forbidden",
                code: "function foo() { return arguments; }",
                errors: [{ messageId: "preferRestParams" }],
            },
        ],
    });
    ruleTester.run("prefer-spread", getBuiltinRule("prefer-spread"), {
        valid: [
            {
                name: "spread syntax is allowed",
                code: "Math.max(...args);",
            },
        ],
        invalid: [
            {
                name: "Function.prototype.apply is forbidden",
                code: "Math.max.apply(Math, args);",
                errors: [{ messageId: "preferSpread" }],
            },
        ],
    });
}
function getBuiltinRule(name) {
    const rule = builtinRules.get(name);
    if (!rule) {
        throw new Error(`Rule "${name}" not found`);
    }
    return rule;
}
