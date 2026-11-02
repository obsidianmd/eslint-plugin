import { ESLintUtils, type TSESLint } from "@typescript-eslint/utils";
import type ts from "typescript";
import tseslint from "typescript-eslint";
import { docsUrl } from "../ruleCreator.js";

type RuleModule = TSESLint.RuleModule<string, readonly unknown[]>;
type RuleContext = TSESLint.RuleContext<string, readonly unknown[]>;

// The rule is typescript-eslint's own, taken from the `typescript-eslint`
// dependency so it always matches the copy the recommended config extends.
// `tseslint.plugin` is typed as a bare CompatiblePlugin, without its rules.
const upstream = (tseslint.plugin as unknown as { rules: Record<string, RuleModule> }).rules[
    "no-misused-promises"
];

// Obsidian's BaseComponent and Setting declare `then(cb: (x: this) => any): this`
// purely to allow chaining, so every Setting and every component is "thenable"
// to TypeScript. The upstream rule then reports `if (toggle)` and
// `items.forEach(n => new Setting(el).setName(n))` as misused promises (#181).
//
// This rule is the upstream rule run against a type checker that treats a `then`
// declared only in the obsidian package's own obsidian.d.ts as not callable, so
// those types stop being thenable everywhere the rule looks: conditionals,
// spreads, predicates and every void-return check. Nothing else changes. A real
// Promise's `then` comes from TypeScript's lib, and a `then` declared or merged
// in anywhere else (a user class, a subclass override, a `declare module
// "obsidian"` augmentation) keeps its declaration outside obsidian.d.ts, so those
// types are reported exactly as before.
const rule: RuleModule = {
    defaultOptions: upstream.defaultOptions,
    meta: {
        ...upstream.meta,
        docs: {
            description:
                "Disallow Promises in places not designed to handle them, without treating Obsidian's chaining `then` as a Promise",
            url: docsUrl("no-misused-promises"),
        },
    },
    create(context) {
        return upstream.create(withObsidianChainingIgnored(context));
    },
};

export default rule;

function withObsidianChainingIgnored(context: RuleContext): RuleContext {
    // Throws the same "requires type information" error the upstream rule would.
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const notCallable = checker.getUndefinedType();

    const typeChecker = forwardTo(checker, {
        getTypeOfSymbolAtLocation(symbol: ts.Symbol, node: ts.Node): ts.Type {
            return isObsidianChainingThen(symbol)
                ? notCallable
                : checker.getTypeOfSymbolAtLocation(symbol, node);
        },
    });
    const program = forwardTo(services.program, { getTypeChecker: () => typeChecker });
    const sourceCode = forwardTo(context.sourceCode, {
        parserServices: { ...services, program },
    });
    return forwardTo(context, { sourceCode });
}

// A `then` whose every declaration is in the obsidian package's obsidian.d.ts.
// Merged or overriding declarations elsewhere disqualify it.
function isObsidianChainingThen(symbol: ts.Symbol): boolean {
    const declarations = symbol.getDeclarations();
    return (
        symbol.getName() === "then" &&
        declarations !== undefined &&
        declarations.length > 0 &&
        declarations.every((declaration) =>
            /(^|\/)node_modules\/obsidian\/obsidian\.d\.ts$/.test(
                declaration.getSourceFile().fileName.replace(/\\/g, "/"),
            ),
        )
    );
}

// A stand-in for `target` with some members replaced. Every other member is read
// from `target` itself, with methods bound to it, so classes with private fields
// keep working. The proxy wraps an empty object rather than `target` because
// ESLint freezes its rule context and SourceCode, and a proxy over a frozen
// object may not report a different value for one of its properties.
function forwardTo<T extends object>(target: T, overrides: Partial<Record<keyof T, unknown>>): T {
    return new Proxy(Object.create(Object.getPrototypeOf(target) as object) as T, {
        get(_stand, property) {
            if (Object.prototype.hasOwnProperty.call(overrides, property)) {
                return overrides[property as keyof T];
            }
            const value: unknown = Reflect.get(target, property, target);
            return typeof value === "function"
                ? (value as (...args: unknown[]) => unknown).bind(target)
                : value;
        },
        has(_stand, property) {
            return property in overrides || property in target;
        },
    });
}
