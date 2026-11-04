import { ConfigCommentParser } from "@eslint/plugin-kit";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

// Reading ESLint's disable directives from inside a rule, with ESLint's own
// semantics, for rules whose problems depend on another rule's directives.

type SourceCode = Readonly<TSESLint.SourceCode>;
type ReportDescriptor = Parameters<TSESLint.RuleContext<string, readonly unknown[]>["report"]>[0];

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

export interface DisableDirectives {
    block: PositionedDirective[];
    line: PositionedDirective[];
}

interface DirectiveComment {
    type: "disable" | "enable" | "disable-line" | "disable-next-line";
    value: string;
    loc: TSESTree.SourceLocation;
}

const commentParser = new ConfigCommentParser();

function readDisableDirectives(sourceCode: SourceCode): DisableDirectives {
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
function directiveComments(sourceCode: SourceCode): DirectiveComment[] {
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
export function problemStart(descriptor: ReportDescriptor): { line: number; column: number } {
    const loc = descriptor.loc ?? (descriptor as { node: TSESTree.Node | TSESTree.Token }).node.loc;
    const start = "start" in loc ? loc.start : loc;
    return { line: start.line, column: start.column + 1 };
}

// ESLint's own rule: the last applicable directive at or before the problem
// decides, and an enable for the rule clears every disable before it, bare ones
// included.
export function isDisabled(
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

// The directives of a file, read once per SourceCode however many rules ask.
const cache = new WeakMap<SourceCode, DisableDirectives>();

export function disableDirectives(sourceCode: SourceCode): DisableDirectives {
    let directives = cache.get(sourceCode);
    if (!directives) {
        directives = readDisableDirectives(sourceCode);
        cache.set(sourceCode, directives);
    }
    return directives;
}
