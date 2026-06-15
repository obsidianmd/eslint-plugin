import { RuleTester } from "@typescript-eslint/rule-tester";
import noMonkeyPatchingRule from "../lib/rules/noMonkeyPatching.js";

const ruleTester = new RuleTester();

ruleTester.run("no-monkey-patching", noMonkeyPatchingRule, {
    valid: [
        {
            name: "normal import is allowed",
            code: "import { Plugin } from 'obsidian';",
        },
        {
            name: "normal require is allowed",
            code: "const obsidian = require('obsidian');",
        },
        {
            name: "assigning to own class prototype is allowed via normal property",
            code: "const obj = {}; obj.foo = 'bar';",
        },
        {
            name: "Object.assign with plain objects is allowed",
            code: "Object.assign(target, source);",
        },
        {
            name: "Object.defineProperty on plain object is allowed",
            code: "Object.defineProperty(obj, 'key', { value: 42 });",
        },
        {
            name: "accessing prototype without assignment is allowed",
            code: "const proto = Array.prototype;",
        },
        {
            name: "Object.getPrototypeOf without assignment is allowed",
            code: "const x = Object.getPrototypeOf(obj);",
        },
        {
            name: "Object.create with prototype is allowed",
            code: "const child = Object.create(Parent.prototype);",
        },
        {
            name: "Reflect.defineProperty on plain object is allowed",
            code: "Reflect.defineProperty(obj, 'key', { value: 42 });",
        },
        {
            name: "Reflect.set on plain object is allowed",
            code: "Reflect.set(target, 'key', value);",
        },
        {
            name: "delete on non-prototype member is allowed",
            code: "delete obj.foo;",
        },
        {
            name: "Object.setPrototypeOf on non-prototype target is allowed",
            code: "Object.setPrototypeOf(obj, proto);",
        },
    ],
    invalid: [
        {
            name: "direct prototype method assignment is forbidden",
            code: "Workspace.prototype.getActiveViewOfType = function() { return null; };",
            errors: [{ messageId: "directPrototypeAssignment", data: { name: "Workspace.prototype.getActiveViewOfType" } }],
        },
        {
            name: "Array.prototype assignment is forbidden",
            code: "Array.prototype.customMethod = function() {};",
            errors: [{ messageId: "directPrototypeAssignment", data: { name: "Array.prototype.customMethod" } }],
        },
        {
            name: "Object.prototype assignment is forbidden",
            code: "Object.prototype.foo = 'bar';",
            errors: [{ messageId: "directPrototypeAssignment", data: { name: "Object.prototype.foo" } }],
        },
        {
            name: "assigning to .prototype itself is forbidden",
            code: "MyClass.prototype = {};",
            errors: [{ messageId: "directPrototypeAssignment", data: { name: "MyClass.prototype" } }],
        },
        {
            name: "Object.defineProperty on prototype is forbidden",
            code: "Object.defineProperty(Workspace.prototype, 'method', { value: function() {} });",
            errors: [{ messageId: "definePropertyOnPrototype", data: { name: "Workspace.prototype" } }],
        },
        {
            name: "Object.defineProperties on prototype is forbidden",
            code: "Object.defineProperties(Array.prototype, { custom: { value: 1 } });",
            errors: [{ messageId: "definePropertyOnPrototype", data: { name: "Array.prototype" } }],
        },
        {
            name: "Object.assign on prototype is forbidden",
            code: "Object.assign(Element.prototype, { customMethod() {} });",
            errors: [{ messageId: "assignToPrototype", data: { name: "Element.prototype" } }],
        },
        {
            name: "Reflect.defineProperty on prototype is forbidden",
            code: "Reflect.defineProperty(Workspace.prototype, 'method', { value: function() {} });",
            errors: [{ messageId: "definePropertyOnPrototype", data: { name: "Workspace.prototype" } }],
        },
        {
            name: "Reflect.set on prototype is forbidden",
            code: "Reflect.set(Array.prototype, 'customMethod', function() {});",
            errors: [{ messageId: "assignToPrototype", data: { name: "Array.prototype" } }],
        },
        {
            name: "computed prototype access via bracket notation is forbidden",
            code: "Workspace['prototype'].getLeaf = function() {};",
            errors: [{ messageId: "directPrototypeAssignment", data: { name: "Workspace.prototype.getLeaf" } }],
        },
        {
            name: "Object.defineProperty with computed prototype access is forbidden",
            code: "Object.defineProperty(Workspace['prototype'], 'method', { value: function() {} });",
            errors: [{ messageId: "definePropertyOnPrototype", data: { name: "Workspace.prototype" } }],
        },
        {
            name: "Object.getPrototypeOf assignment is forbidden",
            code: "Object.getPrototypeOf(workspace).getLeaf = function() {};",
            errors: [{ messageId: "getPrototypeOfAssignment" }],
        },
        {
            name: "Reflect.getPrototypeOf assignment is forbidden",
            code: "Reflect.getPrototypeOf(workspace).getLeaf = function() {};",
            errors: [{ messageId: "getPrototypeOfAssignment" }],
        },
        {
            name: "Object.setPrototypeOf on prototype is forbidden",
            code: "Object.setPrototypeOf(MyClass.prototype, OtherClass.prototype);",
            errors: [{ messageId: "setPrototypeOf" }],
        },
        {
            name: "Reflect.setPrototypeOf on prototype is forbidden",
            code: "Reflect.setPrototypeOf(MyClass.prototype, OtherClass.prototype);",
            errors: [{ messageId: "setPrototypeOf" }],
        },
        {
            name: "delete on prototype member is forbidden",
            code: "delete Workspace.prototype.getLeaf;",
            errors: [{ messageId: "deletePrototypeMember", data: { name: "Workspace.prototype.getLeaf" } }],
        },
    ],
});
