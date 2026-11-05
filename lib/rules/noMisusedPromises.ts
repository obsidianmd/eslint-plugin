import { ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import type ts from "typescript";
import tseslint from "typescript-eslint";
import { type DisableDirectives, disableDirectives, isDisabled, problemStart } from "../disableDirectives.js";
import { docsUrl, isJsProgram, type PluginDocs } from "../ruleCreator.js";

type RuleModule = TSESLint.RuleModule<string, readonly unknown[]>;
type RuleContext = TSESLint.RuleContext<string, readonly unknown[]>;
type ReportDescriptor = Parameters<RuleContext["report"]>[0];

// The rule this one replaces in the recommended config.
const REPLACED_RULE = "@typescript-eslint/no-misused-promises";

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
const rule: TSESLint.RuleModule<string, readonly unknown[], PluginDocs> = {
    defaultOptions: upstream.defaultOptions,
    meta: {
        ...upstream.meta,
        docs: {
            description:
                "Disallow Promises in places not designed to handle them, without treating Obsidian's chaining `then` as a Promise",
            url: docsUrl("no-misused-promises"),
            requiresTypeChecking: true,
        },
    },
    create(context) {
        // Not built with ruleCreator, so it needs the same guard: another
        // language's file has no type program to wrap.
        if (!isJsProgram(context)) {
            return {};
        }
        return upstream.create(
            withObsidianChainingIgnored(withReplacedRuleDisableComments(context)),
        );
    },
};

export default rule;

// Code written for the upstream rule carries its disable comments:
// `// eslint-disable-next-line @typescript-eslint/no-misused-promises -- reason`.
// With that rule off they suppress nothing, so every finding they had accepted
// would come back under this rule's name. This rule therefore drops a problem
// that such a comment covers, with ESLint's own semantics for each directive.
//
// It drops only what ESLint would not suppress anyway. A problem that a bare
// `eslint-disable` or a comment naming this rule covers is still reported, so
// ESLint marks that comment used. A comment naming the upstream rule is never
// used, as that rule reports nothing, and with `reportUnusedDisableDirectives`
// ESLint reports it, which tells authors to rename it.
//
// A dropped problem is gone, not in ESLint's suppressedMessages, and a rule
// cannot see `noInlineConfig`, so the old comments apply even under it.
function withReplacedRuleDisableComments(context: RuleContext): RuleContext {
    let directives: DisableDirectives | undefined;
    return forwardTo(context, {
        report(descriptor: ReportDescriptor): void {
            directives ??= disableDirectives(context.sourceCode);
            const problem = problemStart(descriptor);
            const disabledByEslint = (ruleId: string | null) =>
                ruleId === null || ruleId === context.id;
            const disabledHere = (ruleId: string | null) =>
                disabledByEslint(ruleId) || ruleId === REPLACED_RULE;
            if (
                isDisabled(directives, problem, disabledHere) &&
                !isDisabled(directives, problem, disabledByEslint)
            ) {
                return;
            }
            context.report(descriptor);
        },
    });
}


function withObsidianChainingIgnored(context: RuleContext): RuleContext {
    // Throws the same "requires type information" error the upstream rule would.
    const services = ESLintUtils.getParserServices(context);
    const typeChecker = checkerIgnoringObsidianChaining(services.program.getTypeChecker());
    const program = forwardTo(services.program, { getTypeChecker: () => typeChecker });
    const sourceCode = forwardTo(context.sourceCode, {
        parserServices: { ...services, program },
    });
    return forwardTo(context, { sourceCode });
}

// The checker with getTypeOfSymbolAtLocation() ignoring Obsidian's chaining
// `then`, one per checker. The upstream rule calls the checker for each node it
// looks at, so this is not a Proxy, whose trap on every method read added 5 to
// 10% to the rule's time: it is an object holding the checker's own methods
// bound to it, and inheriting anything else from the checker.
const checkersIgnoringObsidianChaining = new WeakMap<ts.TypeChecker, ts.TypeChecker>();

function checkerIgnoringObsidianChaining(checker: ts.TypeChecker): ts.TypeChecker {
    const cached = checkersIgnoringObsidianChaining.get(checker);
    if (cached) {
        return cached;
    }
    const methods = checker as unknown as Record<string, unknown>;
    const copy = Object.create(checker) as Record<string, unknown>;
    for (const key of Object.keys(checker)) {
        const value = methods[key];
        if (typeof value === "function") {
            copy[key] = (value as (...args: unknown[]) => unknown).bind(checker);
        }
    }
    const notCallable = checker.getUndefinedType();
    copy.getTypeOfSymbolAtLocation = (symbol: ts.Symbol, node: ts.Node): ts.Type =>
        isObsidianChainingThen(symbol) ? notCallable : checker.getTypeOfSymbolAtLocation(symbol, node);
    const typeChecker = copy as unknown as ts.TypeChecker;
    checkersIgnoringObsidianChaining.set(checker, typeChecker);
    return typeChecker;
}

// A `then` whose every declaration is in the obsidian package's obsidian.d.ts.
// Merged or overriding declarations elsewhere disqualify it.
function isObsidianChainingThen(symbol: ts.Symbol): boolean {
    if (symbol.getName() !== "then") {
        return false;
    }
    const declarations = symbol.getDeclarations();
    return (
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
