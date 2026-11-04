// Replacing another rule's messages: the matching shared by the
// rule-custom-message rule and obsidianmd.withCustomMessages().

import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import type { Rule as ESLintRule } from "eslint";

/** Maps a message, or part of one, to the message to show instead. */
export type CustomMessages = Readonly<Record<string, string>>;

/**
 * A rule that withCustomMessages() can wrap: ESLint's `Rule.RuleModule`,
 * typescript-eslint's `RuleModule`, or any other `{ meta, create }` object.
 */
export interface WrappableRule {
    meta?: object | undefined;
    create(context: never): object;
}

/** What a wrapped rule passes to `context.report()`. */
export interface WrappedReport {
    message?: unknown;
    messageId?: unknown;
    data?: Record<string, unknown>;
    node?: TSESTree.Node;
    loc?: TSESTree.SourceLocation | TSESTree.Position;
    fix?: TSESLint.ReportFixFunction | null;
    suggest?: unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An object whose own properties are its entries: `{ … }`, one without a
 * prototype, or a class instance, but not a Map, a Set or a Date, which keep
 * theirs elsewhere and would read as empty.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && Object.prototype.toString.call(value) === "[object Object]";
}

/** What `value` is, for an error message: "a Map", "an array", "a number", "null". */
function kindOf(value: unknown): string {
    if (value === null || value === undefined) {
        return String(value);
    }
    let kind: string = typeof value;
    if (Array.isArray(value)) {
        kind = "array";
    } else if (typeof value === "object") {
        const constructor: unknown = (Object.getPrototypeOf(value) as { constructor?: unknown } | null)?.constructor;
        kind = typeof constructor === "function" && constructor.name !== "" ? constructor.name : "object";
    }
    return `${/^[aeiou]/i.test(kind) ? "an" : "a"} ${kind}`;
}

/**
 * Why `messages` is not a map of messages to the messages to show instead,
 * or undefined when it is one: a plain object whose values are strings.
 */
export function messagesProblem(messages: unknown): string | undefined {
    if (!isPlainRecord(messages)) {
        return `not ${kindOf(messages)}`;
    }
    const entry = Object.entries(messages).find(([, value]) => typeof value !== "string");
    return entry && `the value of ${JSON.stringify(entry[0])} is ${kindOf(entry[1])}, not a string`;
}

/** Fills `{{ placeholders }}` from `data` the way ESLint does. */
function interpolate(text: string, data: Record<string, unknown> | undefined): string {
    if (!isRecord(data)) {
        return text;
    }
    return text.replace(/\{\{([^{}]+)\}\}/gu, (match, term: string) => {
        const key = term.trim();
        return key in data ? String(data[key]) : match;
    });
}

/** The message, or suggestion description, a report shows. */
export function messageOf(
    report: { message?: unknown; desc?: unknown; messageId?: unknown; data?: Record<string, unknown> },
    messages: Record<string, string> | undefined,
): string | undefined {
    const text = report.message ?? report.desc;
    const template = typeof text === "string"
        ? text
        : typeof report.messageId === "string" ? messages?.[report.messageId] : undefined;
    return template === undefined ? undefined : interpolate(template, report.data);
}

/**
 * The custom message for a report: the value of the first key of `custom` that
 * the report's message equals or contains, or `undefined` if none does.
 */
export function customMessageFor(
    report: WrappedReport,
    ruleMessages: Record<string, string> | undefined,
    custom: CustomMessages,
): string | undefined {
    const message = messageOf(report, ruleMessages) ?? "";
    return Object.entries(custom).find(([original]) => message.includes(original))?.[1];
}

/** The `meta.messages` of a rule. */
function ruleMessagesOf(rule: { meta?: object | undefined }): Record<string, string> | undefined {
    const meta: unknown = rule.meta;
    return isRecord(meta) && isRecord(meta.messages) ? meta.messages as Record<string, string> : undefined;
}

/**
 * A rule context with `overrides` in place of those properties of `context`.
 * Everything else, such as `sourceCode`, `settings` or `id`, is read from
 * `context` itself, through the prototype, the way ESLint itself extends the
 * context it shares between rules.
 */
export function contextWith<Context extends object>(context: Context, overrides: Record<string, unknown>): Context {
    const properties: PropertyDescriptorMap = {};
    for (const [key, value] of Object.entries(overrides)) {
        properties[key] = { value, writable: true, enumerable: true, configurable: true };
    }
    return Object.create(context, properties) as Context;
}

/**
 * The descriptor of a `context.report()` call, read the way ESLint reads its
 * arguments: one descriptor object, or the older `(node, message, data, fix)`
 * and `(node, loc, message, data, fix)` forms.
 */
function reportDescriptor(args: readonly unknown[]): WrappedReport | undefined {
    if (args.length <= 1) {
        return isRecord(args[0]) ? { ...args[0] } : undefined;
    }
    if (typeof args[1] === "string") {
        const [node, message, data, fix] = args;
        return { node, message, data, fix } as WrappedReport;
    }
    const [node, loc, message, data, fix] = args;
    return { node, loc, message, data, fix } as WrappedReport;
}

interface ReportingContext {
    report(...args: unknown[]): void;
}

/**
 * What withCustomMessages() adds to the type of the rule it returns, so that a
 * typescript-eslint rule fits the plugin rule type of the installed ESLint (a
 * peer dependency): a `create()` that takes any context, as typescript-eslint's
 * `LooseRuleDefinition` does, for ESLint 9.20 and later, whose context type
 * typescript-eslint's `create()` does not accept; and ESLint's own `meta`, for
 * ESLint 9.19, whose `meta.docs.recommended` is a boolean where
 * typescript-eslint's is a string.
 */
interface LooseCreate {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the visitors of any rule type
    create(context: unknown): any;
    meta?: ESLintRule.RuleModule["meta"];
}

/**
 * Returns `rule` with some of its messages replaced, for registering in a
 * plugin of your own:
 *
 * ```js
 * plugins: { custom: { rules: { "some-rule": obsidianmd.withCustomMessages(somePlugin.rules["some-rule"], { "Original message": "New message" }) } } },
 * rules: { "custom/some-rule": ["error", { ... }] },
 * ```
 *
 * A report whose message equals or contains a key of `messages` shows that
 * key's value instead, the first matching key winning, as in
 * `obsidianmd/rule-custom-message`. The message matched is the one ESLint shows,
 * placeholders filled in. The new message can use the report's placeholders,
 * such as `{{name}}`. Every other report is the rule's own, and so are the
 * fixes and suggestions.
 *
 * The result has `rule`'s `meta`, so ESLint checks its options against `rule`'s
 * schema, fills in `rule`'s defaults and accepts its fixes and suggestions.
 *
 * Its type is `rule`'s, with a `create()` and `meta` that also fit the
 * installed ESLint's own types, so a typescript-eslint rule fits ESLint's
 * `defineConfig()` and `Linter.Config`.
 */
export function withCustomMessages<Rule extends WrappableRule>(rule: Rule, messages: CustomMessages): Rule & LooseCreate {
    if (!isRecord(rule) || typeof rule.create !== "function") {
        throw new TypeError(
            "withCustomMessages() takes a rule object with a create() function, such as somePlugin.rules[\"rule-name\"], as its first argument.",
        );
    }
    const problem = messagesProblem(messages);
    if (problem !== undefined) {
        throw new TypeError(
            `withCustomMessages() takes an object mapping messages to the messages to show instead as its second argument, ${problem}.`,
        );
    }
    const custom: CustomMessages = { ...messages };

    const wrapped: WrappableRule = {
        ...rule,
        create(context: ReportingContext) {
            const ruleMessages = ruleMessagesOf(rule);
            const report = (...args: unknown[]) => {
                const descriptor = reportDescriptor(args);
                const message = descriptor && customMessageFor(descriptor, ruleMessages, custom);
                if (descriptor === undefined || message === undefined) {
                    context.report(...args);
                    return;
                }
                // ESLint rejects a report with both a message and a messageId.
                const { messageId: _messageId, ...rest } = descriptor;
                context.report({ ...rest, message });
            };
            return rule.create(contextWith(context, { report }) as never);
        },
    };
    return wrapped as Rule & LooseCreate;
}
