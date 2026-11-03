import { ConfigCommentParser } from "@eslint/plugin-kit";
import { ESLintUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import type ts from "typescript";
import tseslint from "typescript-eslint";
import { docsUrl, isJsProgram } from "../ruleCreator.js";

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

// A disable directive for one rule (or every rule, `null`) at the position it
// takes effect from, as ESLint's apply-disable-directives lays them out: block
// comments as written, and each line comment as a disable at the start of its
// line and an enable at column 0 of the line after. ESLint resolves the two
// kinds separately, and a problem either disables is suppressed.
interface PositionedDirective {
    type: "disable" | "enable";
    ruleId: string | null;
    line: number;
    column: number;
}

interface DisableDirectives {
    block: PositionedDirective[];
    line: PositionedDirective[];
}

interface DirectiveComment {
    type: "disable" | "enable" | "disable-line" | "disable-next-line";
    value: string;
    loc: TSESTree.SourceLocation;
}

const commentParser = new ConfigCommentParser();

function disableDirectives(sourceCode: RuleContext["sourceCode"]): DisableDirectives {
    const result: DisableDirectives = { block: [], line: [] };
    for (const { type, value, loc } of directiveComments(sourceCode)) {
        const ruleIds = Object.keys(commentParser.parseListConfig(value));
        for (const ruleId of ruleIds.length > 0 ? ruleIds : [null]) {
            if (type === "disable" || type === "enable") {
                result.block.push({
                    type,
                    ruleId,
                    line: loc.start.line,
                    column: loc.start.column + 1,
                });
            } else {
                const line = type === "disable-line" ? loc.start.line : loc.end.line + 1;
                result.line.push(
                    { type: "disable", ruleId, line, column: 1 },
                    { type: "enable", ruleId, line: line + 1, column: 0 },
                );
            }
        }
    }
    result.block.sort(compareLocations);
    result.line.sort(compareLocations);
    return result;
}

// The directive comments ESLint itself reads. Every supported ESLint (9.19 to
// 10) lists them with getDisableDirectives(); a SourceCode without that method
// has its comments read the way the method reads them, with the same parser.
function directiveComments(sourceCode: RuleContext["sourceCode"]): DirectiveComment[] {
    const { getDisableDirectives } = sourceCode as {
        getDisableDirectives?: () => {
            directives: readonly { type: DirectiveComment["type"]; value: string; node: unknown }[];
        };
    };
    if (typeof getDisableDirectives === "function") {
        return getDisableDirectives.call(sourceCode).directives.map(({ type, value, node }) => ({
            type,
            value,
            loc: (node as TSESTree.Comment).loc,
        }));
    }
    return sourceCode.getAllComments().flatMap((comment): DirectiveComment[] => {
        const kind = comment.type as string;
        const directive = kind === "Shebang" ? undefined : commentParser.parseDirective(comment.value);
        const type = directive && DIRECTIVE_TYPES.get(directive.label);
        if (
            !directive ||
            !type ||
            // A line comment can only disable its own line or the next.
            (kind === "Line" && (type === "disable" || type === "enable")) ||
            // ESLint reports, and ignores, an eslint-disable-line over several lines.
            (type === "disable-line" && comment.loc.start.line !== comment.loc.end.line)
        ) {
            return [];
        }
        return [{ type, value: directive.value, loc: comment.loc }];
    });
}

const DIRECTIVE_TYPES = new Map<string, DirectiveComment["type"]>([
    ["eslint-disable", "disable"],
    ["eslint-enable", "enable"],
    ["eslint-disable-line", "disable-line"],
    ["eslint-disable-next-line", "disable-next-line"],
]);

// Where ESLint places a problem: the start of `loc` if given, else of the node,
// with a 1-based column.
function problemStart(descriptor: ReportDescriptor): { line: number; column: number } {
    const loc = descriptor.loc ?? (descriptor as { node: TSESTree.Node | TSESTree.Token }).node.loc;
    const start = "start" in loc ? loc.start : loc;
    return { line: start.line, column: start.column + 1 };
}

// ESLint's own rule: the last applicable directive at or before the problem
// decides, and an enable for the rule clears every disable before it, bare ones
// included.
function isDisabled(
    directives: DisableDirectives,
    problem: { line: number; column: number },
    applies: (ruleId: string | null) => boolean,
): boolean {
    return [directives.block, directives.line].some((list) => {
        let disabled = false;
        for (const directive of list) {
            if (compareLocations(directive, problem) > 0) {
                break;
            }
            if (applies(directive.ruleId)) {
                disabled = directive.type === "disable";
            }
        }
        return disabled;
    });
}

function compareLocations(
    a: { line: number; column: number },
    b: { line: number; column: number },
): number {
    return a.line - b.line || a.column - b.column;
}

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
