import { ESLintUtils } from "@typescript-eslint/utils";
import { builtinRules } from "eslint/use-at-your-own-risk";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
export default ruleCreator({
    name: "rule-custom-message",
    meta: {
        docs: {
            description: "Allows redefining error messages from other ESLint rules that don't provide this functionality natively.",
        },
        type: "problem",
        messages: {
            customMessage: "[{{ruleName}}] {{message}}",
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
        const visitors = {};
        for (const [ruleName, config] of Object.entries(messageOverrides)) {
            let rule = config.rule;
            if (!rule) {
                const builtinRule = builtinRules.get(ruleName);
                if (builtinRule) {
                    rule = builtinRule;
                }
            }
            if (!rule) {
                console.warn(`Rule "${ruleName}" not found. For plugin rules, add the rule to the config: { rule: pluginName.rules["rule-name"] }`);
                continue;
            }
            const messageMap = config.messages;
            const parsedOptions = config.options || [];
            const wrappedContext = Object.create(context, {
                options: {
                    value: parsedOptions,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                },
                report: {
                    value(descriptor) {
                        if (typeof descriptor !== "object" || descriptor === null) {
                            return;
                        }
                        const reportDesc = descriptor;
                        let originalMessage = "";
                        if ("message" in reportDesc && typeof reportDesc.message === "string") {
                            originalMessage = reportDesc.message;
                        }
                        else if ("messageId" in reportDesc && typeof reportDesc.messageId === "string" && rule.meta?.messages) {
                            const messages = rule.meta.messages;
                            const template = messages[reportDesc.messageId];
                            if (template) {
                                originalMessage = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
                                    const data = reportDesc.data;
                                    if (data && typeof data === "object" && key in data) {
                                        const value = data[key];
                                        return typeof value === "string" ? value : _match;
                                    }
                                    return _match;
                                });
                            }
                        }
                        for (const [originalMsg, customMsg] of Object.entries(messageMap)) {
                            if (originalMessage === originalMsg ||
                                originalMessage.includes(originalMsg)) {
                                const baseDescriptor = {
                                    messageId: "customMessage",
                                    data: {
                                        message: customMsg,
                                        ruleName,
                                    },
                                    node: reportDesc.node,
                                };
                                const customReportDescriptor = {
                                    ...baseDescriptor,
                                    ...(reportDesc.fix && { fix: reportDesc.fix }),
                                };
                                context.report(customReportDescriptor);
                                break;
                            }
                        }
                    },
                    writable: true,
                    enumerable: true,
                    configurable: true,
                },
            });
            try {
                const ruleInstance = rule.create(wrappedContext);
                for (const [selector, handler] of Object.entries(ruleInstance)) {
                    if (typeof handler === "function") {
                        const existingHandler = visitors[selector];
                        if (existingHandler) {
                            const currentHandler = handler;
                            const existingHandlerFn = existingHandler;
                            visitors[selector] = function (node) {
                                existingHandlerFn.call(this, node);
                                currentHandler.call(this, node);
                            };
                        }
                        else {
                            visitors[selector] = handler;
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error creating rule "${ruleName}":`, error);
            }
        }
        return visitors;
    },
});
