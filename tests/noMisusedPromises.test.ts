import { RuleTester } from "@typescript-eslint/rule-tester";
import tseslint from "typescript-eslint";
import type { TSESLint } from "@typescript-eslint/utils";
import noMisusedPromisesRule from "../lib/rules/noMisusedPromises.js";

const ruleTester = new RuleTester();

const upstreamRule = (
    tseslint.plugin as unknown as { rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> }
).rules["no-misused-promises"];

// Obsidian's BaseComponent and Setting declare a chaining `then`, so the upstream
// rule reports each of these as a misused promise. None of them is a promise.
const obsidianChaining = [
    {
        name: "a Setting chain returned from a forEach callback",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            ["a", "b"].forEach((name) => new Setting(el).setName(name));
        `,
        messageId: "voidReturnArgument",
    },
    {
        name: "a Setting in an if condition",
        code: `
            import { Setting } from "obsidian";
            declare const setting: Setting;
            if (setting) { setting.setName("x"); }
        `,
        messageId: "conditional",
    },
    {
        name: "a component on the left of &&",
        code: `
            import { ToggleComponent } from "obsidian";
            declare const toggle: ToggleComponent;
            const value = toggle && toggle.getValue();
        `,
        messageId: "conditional",
    },
    {
        name: "a negated BaseComponent",
        code: `
            import { BaseComponent } from "obsidian";
            declare const component: BaseComponent;
            if (!component) { throw new Error("missing"); }
        `,
        messageId: "conditional",
    },
    {
        name: "a spread component",
        code: `
            import { ButtonComponent } from "obsidian";
            declare const button: ButtonComponent;
            const copy = { ...button };
        `,
        messageId: "spread",
    },
    {
        name: "a filter predicate returning a component",
        code: `
            import { TextComponent } from "obsidian";
            declare const texts: TextComponent[];
            const kept = texts.filter((text) => text);
        `,
        messageId: "predicate",
    },
    {
        name: "a component-returning function assigned to a void-returning variable",
        code: `
            import { ButtonComponent } from "obsidian";
            declare const el: HTMLElement;
            const make: () => void = () => new ButtonComponent(el);
        `,
        messageId: "voidReturnVariable",
    },
    {
        name: "a Setting-returning function returned where a void callback is expected",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            function factory(): () => void {
                return () => new Setting(el);
            }
        `,
        messageId: "voidReturnReturnValue",
    },
    {
        name: "a Setting-returning function in a void-returning property",
        code: `
            import { Setting } from "obsidian";
            declare const el: HTMLElement;
            const handlers: { onOpen: () => void } = { onOpen: () => new Setting(el) };
        `,
        messageId: "voidReturnProperty",
    },
];

ruleTester.run("no-misused-promises", noMisusedPromisesRule, {
    valid: [
        ...obsidianChaining.map(({ name, code }) => ({ name: `not reported: ${name}`, code })),
        {
            name: "a Setting chain in a map callback is fine, as upstream",
            code: `
                import { Setting } from "obsidian";
                declare const el: HTMLElement;
                const settings = ["a"].map((name) => new Setting(el).setName(name));
            `,
        },
        {
            name: "any is not thenable, as upstream",
            code: `
                declare const value: any;
                if (value) {}
                ["a"].forEach(() => value);
            `,
        },
        {
            name: "a union of a Setting and a Promise in a condition follows the default flagUnions: none, as for any non-thenable",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting | Promise<void>;
                if (value) {}
            `,
        },
        {
            name: "checksConditionals: false still turns the check off",
            code: `
                declare const promise: Promise<void>;
                if (promise) {}
            `,
            options: [{ checksConditionals: false }],
        },
    ],
    invalid: [
        {
            name: "a real Promise in an if condition",
            code: `
                declare const promise: Promise<void>;
                if (promise) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "an async forEach callback",
            code: `
                ["a"].forEach(async (name) => { await Promise.resolve(name); });
            `,
            errors: [{ messageId: "voidReturnArgument" }],
        },
        {
            name: "a spread Promise",
            code: `
                declare const promise: Promise<{ a: number }>;
                const copy = { ...promise };
            `,
            errors: [{ messageId: "spread" }],
        },
        {
            name: "a user class with its own then",
            code: `
                class Lazy {
                    then(onFulfilled: (value: number) => void): void { onFulfilled(1); }
                }
                declare const lazy: Lazy;
                if (lazy) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a Setting subclass overriding then",
            code: `
                import { Setting } from "obsidian";
                class MySetting extends Setting {
                    override then(cb: (setting: this) => any): this { cb(this); return this; }
                }
                declare const setting: MySetting;
                if (setting) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a then merged into Setting by a module augmentation",
            code: `
                import { Setting } from "obsidian";
                declare module "obsidian" {
                    interface Setting {
                        then<T>(onFulfilled: (value: void) => T): Promise<T>;
                    }
                }
                declare const setting: Setting;
                if (setting) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a then added to a component by a module augmentation",
            code: `
                import { ButtonComponent } from "obsidian";
                declare module "obsidian" {
                    interface ButtonComponent {
                        then<T>(onFulfilled: (value: void) => T): Promise<T>;
                    }
                }
                declare const button: ButtonComponent;
                if (button) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "a callback returning a union of a Setting and a Promise",
            code: `
                import { Setting } from "obsidian";
                declare function pick(): Setting | Promise<void>;
                ["a"].forEach(() => pick());
            `,
            errors: [{ messageId: "voidReturnArgument" }],
        },
        {
            name: "a union of a Setting and a Promise in a condition with flagUnions: all",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting | Promise<void>;
                if (value) {}
            `,
            options: [{ checksConditionals: { flagUnions: "all" } }],
            errors: [{ messageId: "conditional" }],
        },
        {
            name: "an intersection of a Setting and a Promise",
            code: `
                import { Setting } from "obsidian";
                declare const value: Setting & Promise<void>;
                if (value) {}
            `,
            errors: [{ messageId: "conditional" }],
        },
    ],
});

// The false positive this rule exists for. If typescript-eslint ever stops
// reporting these, this fails and the wrapper can be retired.
ruleTester.run("upstream no-misused-promises on Obsidian's chaining then", upstreamRule, {
    valid: [],
    invalid: obsidianChaining.map(({ name, code, messageId }) => ({
        name: `upstream reports: ${name}`,
        code,
        errors: [{ messageId }],
    })),
});
