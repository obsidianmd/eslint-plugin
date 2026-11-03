import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { docsUrl, ruleCreator } from "../ruleCreator.js";

type MessageOverrides = Record<string, string>;

interface RuleConfig {
    messages: MessageOverrides;
    options?: unknown[];
    rule?: ESLintRule;
}

type RuleMessageConfig = Record<string, RuleConfig>;

type Options = [RuleMessageConfig];

type MessageIds = "customMessage" | "suggestion";

interface ESLintRule {
    meta?: {
        messages?: Record<string, string>;
        defaultOptions?: unknown[];
        schema?: unknown;
    };
    create: (context: TSESLint.RuleContext<string, unknown[]>) => TSESLint.RuleListener;
}

/** What a wrapped rule passes to `context.report()`. */
interface WrappedReport {
    message?: unknown;
    messageId?: unknown;
    data?: Record<string, unknown>;
    node?: TSESTree.Node;
    loc?: TSESTree.SourceLocation | TSESTree.Position;
    fix?: TSESLint.ReportFixFunction | null;
    suggest?: unknown;
}

interface WrappedSuggestion {
    desc?: unknown;
    messageId?: unknown;
    data?: Record<string, unknown>;
    fix?: unknown;
}

type Handler = (...args: unknown[]) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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
function messageOf(
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
 * Applies the `default`s of a rule's option schema to `value`, as ESLint's
 * option validation does (Ajv with `useDefaults`): a missing property of an
 * object gets the default of its `properties` schema, and a missing item of an
 * array that of its `items` entry. Like Ajv, it leaves `anyOf`, `oneOf` and
 * `not` alone. It returns new objects rather than changing the given ones.
 */
function withSchemaDefaults(schema: unknown, value: unknown): unknown {
    if (!isRecord(schema)) {
        return value;
    }

    const fill = (subschema: unknown, current: unknown) => {
        const filled = current === undefined && isRecord(subschema) && subschema.default !== undefined
            ? structuredClone(subschema.default)
            : current;
        return filled === undefined ? undefined : withSchemaDefaults(subschema, filled);
    };

    if (isRecord(value) && isRecord(schema.properties)) {
        const result = { ...value };
        for (const [key, subschema] of Object.entries(schema.properties)) {
            const filled = fill(subschema, result[key]);
            if (filled !== undefined) {
                result[key] = filled;
            }
        }
        return result;
    }

    if (Array.isArray(value) && Array.isArray(schema.items)) {
        const result: unknown[] = [...(value as unknown[])];
        schema.items.forEach((subschema: unknown, i) => {
            const filled = fill(subschema, result[i]);
            if (filled !== undefined) {
                result[i] = filled;
            }
        });
        return result;
    }

    return value;
}

/** ESLint's merge of `meta.defaultOptions` under the configured options. */
function deepMerge(first: unknown, second: unknown): unknown {
    if (second === undefined) {
        return first;
    }
    if (!isRecord(first) || !isRecord(second)) {
        return second;
    }
    const result: Record<string, unknown> = { ...first, ...second };
    for (const key of Object.keys(second)) {
        if (Object.prototype.propertyIsEnumerable.call(first, key)) {
            result[key] = deepMerge(first[key], second[key]);
        }
    }
    return result;
}

/**
 * The options ESLint would run `rule` with when configured with `given`:
 * the schema's defaults applied to them, then `meta.defaultOptions` merged
 * under them.
 */
function optionsFor(rule: ESLintRule, given: unknown[]): unknown[] {
    const schema = rule.meta?.schema;
    const options = withSchemaDefaults(Array.isArray(schema) ? { items: schema } : schema, given) as unknown[];
    const defaults = rule.meta?.defaultOptions;
    if (!Array.isArray(defaults)) {
        return options;
    }
    return [
        ...defaults.map((value, i) => deepMerge(value, options[i])),
        ...options.slice(defaults.length),
    ];
}

export default ruleCreator<Options, MessageIds>({
    meta: {
        docs: {
            description:
                "Allows redefining error messages from other ESLint rules that don't provide this functionality natively.",
            url: docsUrl("rule-custom-message"),
        },
        type: "problem" as const,
        // Fixes and suggestions are the wrapped rules'; ESLint rejects them
        // from a rule that does not declare them.
        fixable: "code",
        hasSuggestions: true,
        messages: {
            customMessage: "[{{ruleName}}] {{message}}",
            suggestion: "{{description}}",
        },
        schema: [
            {
                type: "object",
                description: "Map of rule names to their configuration",
                additionalProperties: {
                    type: "object",
                    description: "Rule configuration with messages and options",
                    properties: {
                        messages: {
                            type: "object",
                            description: "Map of original messages to custom messages",
                            additionalProperties: {
                                type: "string",
                            },
                        },
                        options: {
                            type: "array",
                            description: "Options to pass to the wrapped rule",
                        },
                        rule: {
                            type: "object",
                            description: "For plugin rules: the rule object from the plugin (e.g., typescriptPlugin.rules['rule-name'])",
                        },
                    },
                    required: ["messages"],
                    additionalProperties: false,
                },
            },
        ],
    },
    defaultOptions: [{}],
    create(context) {
        const messageOverrides = context.options[0] || {};
        const visitors: Record<string, Handler> = {};

        for (const [ruleName, config] of Object.entries(messageOverrides)) {
            let rule: ESLintRule | undefined = config.rule;

            if (!rule) {
                const builtinRule = builtinRules.get(ruleName);
                if (builtinRule) {
                    rule = builtinRule as unknown as ESLintRule;
                }
            }

            if (!rule) {
                console.warn(`Rule "${ruleName}" not found: it is not a core ESLint rule.`);
                continue;
            }

            const messageMap = config.messages;
            const ruleMessages = rule.meta?.messages;

            const forwardSuggestions = (suggest: unknown): TSESLint.SuggestionReportDescriptor<MessageIds>[] => {
                if (!Array.isArray(suggest)) {
                    return [];
                }
                return suggest.flatMap((suggestion: WrappedSuggestion) => {
                    if (!isRecord(suggestion) || typeof suggestion.fix !== "function") {
                        return [];
                    }
                    const description = messageOf(suggestion, ruleMessages);
                    if (description === undefined) {
                        return [];
                    }
                    return [{
                        messageId: "suggestion" as const,
                        data: { description },
                        fix: suggestion.fix as TSESLint.ReportFixFunction,
                    }];
                });
            };

            const wrappedContext = Object.create(context, {
                options: {
                    value: optionsFor(rule, config.options ?? []),
                    writable: true,
                    enumerable: true,
                    configurable: true,
                },
                report: {
                    value(descriptor: unknown) {
                        if (!isRecord(descriptor)) {
                            return;
                        }

                        const report = descriptor as WrappedReport;
                        const originalMessage = messageOf(report, ruleMessages) ?? "";
                        const match = Object.entries(messageMap).find(([originalMsg]) =>
                            originalMessage.includes(originalMsg),
                        );
                        if (!match) {
                            return;
                        }

                        const suggest = forwardSuggestions(report.suggest);
                        // Forward where the wrapped rule reported, a node, a
                        // location or both, and its fix and suggestions.
                        context.report({
                            messageId: "customMessage",
                            data: { message: match[1], ruleName },
                            ...(report.node && { node: report.node }),
                            ...(report.loc && { loc: report.loc }),
                            ...(report.fix && { fix: report.fix }),
                            ...(suggest.length > 0 && { suggest }),
                        } as TSESLint.ReportDescriptor<MessageIds>);
                    },
                    writable: true,
                    enumerable: true,
                    configurable: true,
                },
            }) as TSESLint.RuleContext<string, unknown[]>;

            try {
                const ruleInstance = rule.create(wrappedContext);

                for (const [selector, handler] of Object.entries(ruleInstance)) {
                    if (typeof handler !== "function") {
                        continue;
                    }
                    const current = handler as Handler;
                    const existing = visitors[selector];
                    // Pass every argument on: code path handlers such as
                    // onCodePathEnd(codePath, node) take more than a node.
                    visitors[selector] = existing
                        ? function (this: unknown, ...args: unknown[]) {
                            existing.apply(this, args);
                            current.apply(this, args);
                        }
                        : current;
                }
            } catch (error) {
                console.error(`Error creating rule "${ruleName}":`, error);
            }
        }

        return visitors;
    },
});
