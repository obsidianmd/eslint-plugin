import { ASTUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";
import { docsUrl, ruleCreator } from "../../ruleCreator.js";
import { isPluginSettingTab } from "./shared.js";

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

// A type annotation that makes a binding an HTMLElement without type information.
const HTML_ELEMENT_TYPE = /^HTML[A-Za-z]*Element$/;

const { DefinitionType } = TSESLint.Scope;

type Scope = ReturnType<TSESLint.SourceCode["getScope"]>;
type Variable = NonNullable<ReturnType<typeof ASTUtils.findVariable>>;

// Where the fix gets `Setting` from: a binding in scope, or else the file's
// named import from "obsidian", which the fix adds it to.
type SettingRef =
    | { variable: Variable; importDecl: null }
    | { variable: null; importDecl: TSESTree.ImportDeclaration };

// What the rewrite needs from TypeScript: the types `new Setting(…)`,
// `.setName(…)` and `.setClass(…)` accept, the last empty when Setting has no
// setClass().
interface SettingTypes {
    checker: ts.TypeChecker;
    containerTypes: ts.Type[];
    nameTypes: ts.Type[];
    classTypes: ts.Type[];
}

type SuggestionId =
    | "replaceWithSettingHeading"
    | "replaceWithSettingHeadingDropping"
    | "replaceWithSettingHeadingClass"
    | "replaceWithSettingHeadingClassDropping";

interface Rewrite {
    offer: "fix" | "suggest";
    fix: TSESLint.ReportFixFunction;
    // How the suggestion describes the rewrite: whether it keeps the class
    // with setClass(), and what it drops.
    suggestion: SuggestionId;
    dropped: string;
}

export default ruleCreator({
    meta: {
        docs: {
            description:
                "Disallow using HTML heading elements for settings headings.",
            url: docsUrl("no-manual-html-headings", "settings-tab"),
        },
        type: "problem" as const,
        messages: {
            headingEl:
                "For a consistent UI use `new Setting(containerEl).setName(...).setHeading()` instead of creating HTML heading elements directly.",
            replaceWithSettingHeading:
                "Replace with `new Setting(...).setName(...).setHeading()`.",
            replaceWithSettingHeadingDropping:
                "Replace with `new Setting(...).setName(...).setHeading()`, dropping {{dropped}}.",
            replaceWithSettingHeadingClass:
                "Replace with `new Setting(...).setName(...).setHeading()`, moving the class to the setting's element with `setClass()`.",
            replaceWithSettingHeadingClassDropping:
                "Replace with `new Setting(...).setName(...).setHeading()`, moving the class to the setting's element with `setClass()` and dropping {{dropped}}.",
        },
        schema: [],
        fixable: "code" as const,
        hasSuggestions: true as const,
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.sourceCode;
        // Type information when the file has it. Without it, only rewrites whose
        // types are evident from the syntax are applied as fixes.
        const services = sourceCode.parserServices;
        const program = services?.program ?? null;
        const nodeMap = services?.esTreeNodeToTSNodeMap ?? null;
        // For each enclosing class, whether it is a settings tab. The nearest one
        // decides: a class nested in a tab is checked on its own terms, and the
        // tab is checked again after it. Functions do not count, so a callback or
        // a nested function in the tab is in the tab.
        const classStack: boolean[] = [];
        const enterClass = (node: TSESTree.ClassDeclaration | TSESTree.ClassExpression) => {
            classStack.push(isPluginSettingTab(node));
        };
        const exitClass = () => {
            classStack.pop();
        };

        return {
            ClassDeclaration: enterClass,
            "ClassDeclaration:exit": exitClass,
            ClassExpression: enterClass,
            "ClassExpression:exit": exitClass,
            CallExpression(node: TSESTree.CallExpression) {
                if (!classStack.at(-1)) return;

                const callee = node.callee;
                if (
                    callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
                    callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                    callee.property.name !== "createEl"
                ) {
                    return;
                }

                const tagArg = node.arguments[0];
                if (
                    !tagArg ||
                    tagArg.type !== TSESTree.AST_NODE_TYPES.Literal ||
                    typeof tagArg.value !== "string" ||
                    !HEADING_TAGS.has(tagArg.value)
                ) {
                    return;
                }
                // Only a heading on the tab's own containerEl is a heading of the
                // settings page. One in a container of the plugin's own, a
                // description, a Notice's fragment or a setting's name element
                // is part of that element's layout and styling. A parameter
                // named containerEl is taken for the tab's, but may be a
                // container of the plugin's own, so it gets a suggestion only.
                const onTab = isTabContainer(callee.object);
                if (!onTab && !isContainerElParameter(callee.object)) {
                    return;
                }

                const rewrite = planRewrite(node, callee);
                if (rewrite && !onTab) {
                    rewrite.offer = "suggest";
                }
                if (rewrite?.offer === "fix") {
                    context.report({ node, messageId: "headingEl", fix: rewrite.fix });
                } else if (rewrite?.offer === "suggest") {
                    context.report({
                        node,
                        messageId: "headingEl",
                        suggest: [{ messageId: rewrite.suggestion, data: { dropped: rewrite.dropped }, fix: rewrite.fix }],
                    });
                } else {
                    context.report({ node, messageId: "headingEl" });
                }
            },
        };

        // The rewrite to `new Setting(<parent>).setName(<text>).setHeading()` and
        // how to offer it. It is a fix only where the heading element was never
        // used, no option or callback is dropped, and the parent and the text are
        // known to fit `Setting`. A `cls` option is kept with `.setClass()` where
        // the types show Setting has it, but the class then goes on the setting's
        // element instead of a heading element, so that is a suggestion too.
        // Anything else the rewrite drops, the suggestion's description names.
        // Null where it would not parse or compile, or would lose the text.
        function planRewrite(
            node: TSESTree.CallExpression,
            callee: TSESTree.MemberExpression,
        ): Rewrite | null {
            if (node.arguments.some((arg) => arg.type === TSESTree.AST_NODE_TYPES.SpreadElement)) {
                return null;
            }
            const droppedCallback = node.arguments.length > 2;
            // The options the rewrite does not keep, as written in the code.
            const droppedOptions: TSESTree.Property[] = [];

            let textNode: TSESTree.Expression | null = null;
            let textProp: TSESTree.Property | null = null;
            let clsProp: TSESTree.Property | null = null;
            const optionsArg = node.arguments[1];
            if (optionsArg) {
                if (optionsArg.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
                    // The text cannot be read from a variable or a string of classes.
                    return null;
                }
                for (const prop of optionsArg.properties) {
                    if (
                        prop.type !== TSESTree.AST_NODE_TYPES.Property ||
                        prop.computed ||
                        prop.kind !== "init"
                    ) {
                        return null;
                    }
                    // A repeated key keeps its last value, as in the object.
                    const name = propertyName(prop.key);
                    if (name === "text") {
                        if (textProp) {
                            droppedOptions.push(textProp);
                        }
                        textProp = prop;
                        textNode = prop.value as TSESTree.Expression;
                    } else if (name === "cls") {
                        if (clsProp) {
                            droppedOptions.push(clsProp);
                        }
                        clsProp = prop;
                    } else {
                        droppedOptions.push(prop);
                    }
                }
            }

            // `el.createEl("h2").setText(…)` sets the text on the new element.
            // setText() and setName() both take `string | DocumentFragment`, so its
            // argument becomes the name.
            let target: TSESTree.Expression = node;
            let nameNode = textNode;
            let nameFromSetText = false;
            const parent = node.parent;
            if (
                parent.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                parent.object === node &&
                !parent.computed &&
                parent.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                parent.property.name === "setText" &&
                parent.parent.type === TSESTree.AST_NODE_TYPES.CallExpression &&
                parent.parent.callee === parent &&
                parent.parent.arguments.length === 1 &&
                parent.parent.arguments[0].type !== TSESTree.AST_NODE_TYPES.SpreadElement
            ) {
                target = parent.parent;
                nameNode = parent.parent.arguments[0];
                nameFromSetText = true;
                if (textProp) {
                    droppedOptions.push(textProp);
                }
            }
            if (target.parent?.type === TSESTree.AST_NODE_TYPES.ChainExpression) {
                target = target.parent;
            }

            // A heading without text, such as `containerEl.createEl("h3")` used
            // as a spacer, would become an empty heading row.
            if (nameNode === null || isEmptyString(nameNode)) {
                return null;
            }

            // The rewrite yields a Setting, not the element, so it is a fix only
            // where the value is discarded. An unused variable keeps compiling and
            // gets a suggestion; any other use expects an element.
            const discarded = isResultDiscarded(target);
            if (!discarded && !isUnusedVariableInit(target)) {
                return null;
            }

            const settingRef = resolveSetting(node);
            if (!settingRef) {
                return null;
            }

            const receiver = callee.object;
            let typesFit: boolean;
            const types = settingTypes(settingRef);
            if (types === false) {
                // Setting has no setName() or setHeading() in this project.
                return null;
            }
            if (types) {
                const containerFits = isAssignable(types, receiver, types.containerTypes);
                const nameFits = nameNode === null || isAssignable(types, nameNode, types.nameTypes);
                if (!containerFits || !nameFits) {
                    // `new Setting(fragment)` or `.setName(maybeUndefined)` would not compile.
                    return null;
                }
                typesFit = true;
            } else {
                typesFit =
                    isKnownHtmlElement(receiver) &&
                    (nameNode === null || nameFromSetText || isKnownString(nameNode));
            }

            // setClass() takes a string of classes; `cls` may also be an array.
            const classNode = clsProp?.value as TSESTree.Expression | undefined;
            const keepsClass =
                classNode !== undefined &&
                types !== null &&
                types.classTypes.length > 0 &&
                isAssignable(types, classNode, types.classTypes);
            if (clsProp && !keepsClass) {
                droppedOptions.push(clsProp);
            }

            // The calls go in the order their arguments ran: the options before
            // a setText() argument, and in the object in the order written.
            const nameCall = `.setName(${nameNode ? argText(nameNode) : '""'})`;
            const classCall = keepsClass ? `.setClass(${argText(classNode)})` : "";
            const classFirst = keepsClass && nameNode !== null && classNode.range[0] < nameNode.range[0];
            const replacement =
                `new Setting(${argText(receiver)})` +
                (classFirst ? classCall + nameCall : nameCall + classCall) +
                ".setHeading()";
            const lastSpecifier = settingRef.importDecl?.specifiers.at(-1);
            const fix: TSESLint.ReportFixFunction = (fixer) => {
                const fixes = [fixer.replaceText(target, replacement)];
                if (lastSpecifier) {
                    fixes.push(fixer.insertTextAfter(lastSpecifier, ", Setting"));
                }
                return fixes;
            };

            const dropped = describeDropped(
                droppedOptions
                    .sort((a, b) => a.range[0] - b.range[0])
                    .map((prop) => propertyName(prop.key) ?? sourceCode.getText(prop.key)),
                droppedCallback,
            );
            const lossy = clsProp !== null || dropped !== "";
            let suggestion: SuggestionId;
            if (keepsClass) {
                suggestion = dropped ? "replaceWithSettingHeadingClassDropping" : "replaceWithSettingHeadingClass";
            } else {
                suggestion = dropped ? "replaceWithSettingHeadingDropping" : "replaceWithSettingHeading";
            }
            return { offer: discarded && !lossy && typesFit ? "fix" : "suggest", fix, suggestion, dropped };
        }

        function propertyName(key: TSESTree.Node): string | null {
            if (key.type === TSESTree.AST_NODE_TYPES.Identifier) {
                return key.name;
            }
            if (key.type === TSESTree.AST_NODE_TYPES.Literal && typeof key.value === "string") {
                return key.value;
            }
            return null;
        }

        function argText(node: TSESTree.Node): string {
            const text = sourceCode.getText(node);
            return node.type === TSESTree.AST_NODE_TYPES.SequenceExpression ? `(${text})` : text;
        }

        function isResultDiscarded(node: TSESTree.Node): boolean {
            const parent = node.parent;
            return (
                (parent?.type === TSESTree.AST_NODE_TYPES.ExpressionStatement && parent.expression === node) ||
                (parent?.type === TSESTree.AST_NODE_TYPES.UnaryExpression && parent.operator === "void")
            );
        }

        // `const heading = el.createEl("h2", …)` where `heading` is never read.
        function isUnusedVariableInit(node: TSESTree.Node): boolean {
            const declarator = node.parent;
            if (
                declarator?.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator ||
                declarator.init !== node ||
                declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
                declarator.parent.parent?.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration
            ) {
                return false;
            }
            return sourceCode
                .getDeclaredVariables(declarator)
                .every((variable) => variable.references.every((ref) => ref.init === true));
        }

        // `Setting` as the fix can use it, or null when it is a type only or
        // there is no named import from "obsidian" to add it to.
        function resolveSetting(node: TSESTree.Node): SettingRef | null {
            const variable = ASTUtils.findVariable(sourceCode.getScope(node), "Setting");
            if (variable && variable.defs.length > 0) {
                return variable.defs.every(isTypeOnlyDefinition) ? null : { variable, importDecl: null };
            }
            const importDecl = sourceCode.ast.body.find(
                (statement): statement is TSESTree.ImportDeclaration =>
                    statement.type === TSESTree.AST_NODE_TYPES.ImportDeclaration &&
                    statement.source.value === "obsidian" &&
                    statement.importKind !== "type" &&
                    statement.specifiers.length > 0 &&
                    statement.specifiers.every((s) => s.type === TSESTree.AST_NODE_TYPES.ImportSpecifier),
            );
            return importDecl ? { variable: null, importDecl } : null;
        }

        function isTypeOnlyDefinition(def: Variable["defs"][number]): boolean {
            if (def.type === DefinitionType.ImportBinding) {
                return (
                    (def.node.type === TSESTree.AST_NODE_TYPES.ImportSpecifier && def.node.importKind === "type") ||
                    (def.parent?.type === TSESTree.AST_NODE_TYPES.ImportDeclaration && def.parent.importKind === "type")
                );
            }
            // An interface or a type alias named Setting cannot be constructed.
            return def.type === DefinitionType.Type;
        }

        // The parameter types of `new Setting()` and `setName()`. False when
        // `new Setting(el)` would not compile for any `el`, Setting lacks
        // setName() or setHeading(), or obsidian does not export it. Null
        // without type information, or when Setting does not resolve to a value
        // or is `any`.
        function settingTypes(ref: SettingRef): SettingTypes | false | null {
            if (!program || !nodeMap) {
                return null;
            }
            const checker = program.getTypeChecker();
            // Public since TypeScript 5.4; earlier versions have it internally.
            if (typeof checker.isTypeAssignableTo !== "function") {
                return null;
            }
            let symbol: ts.Symbol | undefined;
            let location: ts.Node;
            if (ref.variable) {
                location = nodeMap.get(ref.variable.defs[0].name);
                symbol = checker.getSymbolAtLocation(location);
            } else {
                location = nodeMap.get(ref.importDecl.source);
                const moduleSymbol = checker.getSymbolAtLocation(location);
                symbol = moduleSymbol
                    ? checker.getExportsOfModule(moduleSymbol).find((s) => s.name === "Setting")
                    : undefined;
                if (moduleSymbol && !symbol) {
                    return false;
                }
            }
            if (!symbol) {
                return null;
            }
            if (symbol.flags & ts.SymbolFlags.Alias) {
                symbol = checker.getAliasedSymbol(symbol);
            }
            const constructorType = checker.getTypeOfSymbolAtLocation(symbol, location);
            // `new` on `any` compiles whatever it is given, so the syntax decides.
            if (constructorType.flags & ts.TypeFlags.Any) {
                return null;
            }
            // `new Setting(el)` compiles only through a construct signature that
            // takes one argument. Without one it is TS2554 ("Expected 0
            // arguments"), or Setting cannot be constructed at all.
            const signatures = constructorType
                .getConstructSignatures()
                .filter((s) => takesOneArgument(checker, s));
            const signature = signatures[0];
            if (!signature) {
                return false;
            }
            const instanceType = signature.getReturnType();
            const setName = instanceType.getProperty("setName");
            if (!setName || !instanceType.getProperty("setHeading")) {
                return false;
            }
            const nameTypes = checker
                .getTypeOfSymbolAtLocation(setName, location)
                .getCallSignatures()
                .map((s) => s.getParameters()[0])
                .filter((p): p is ts.Symbol => p !== undefined)
                .map((p) => checker.getTypeOfSymbolAtLocation(p, location));
            const setClass = instanceType.getProperty("setClass");
            const classTypes = setClass
                ? checker
                    .getTypeOfSymbolAtLocation(setClass, location)
                    .getCallSignatures()
                    .map((s) => s.getParameters()[0])
                    .filter((p): p is ts.Symbol => p !== undefined)
                    .map((p) => checker.getTypeOfSymbolAtLocation(p, location))
                : [];
            return {
                checker,
                containerTypes: signatures.map((s) => checker.getTypeOfSymbolAtLocation(s.getParameters()[0], location)),
                nameTypes,
                classTypes,
            };
        }

        function isAssignable(types: SettingTypes, node: TSESTree.Node, targets: ts.Type[]): boolean {
            const type = types.checker.getTypeAtLocation(nodeMap!.get(node));
            return targets.some((target) => types.checker.isTypeAssignableTo(type, target));
        }

        function isEmptyString(node: TSESTree.Node): boolean {
            return (
                (node.type === TSESTree.AST_NODE_TYPES.Literal && node.value === "") ||
                (node.type === TSESTree.AST_NODE_TYPES.TemplateLiteral &&
                    node.expressions.length === 0 &&
                    node.quasis[0].value.cooked === "")
            );
        }

        // Without type information: `this.containerEl` of the settings tab, a
        // binding taken from it, or one annotated as an HTML element.
        function isKnownHtmlElement(node: TSESTree.Expression): boolean {
            if (isTabContainer(node)) {
                return true;
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            const variable = singleDefinition(sourceCode.getScope(node), node.name);
            return (
                variable !== null &&
                isAnnotated(variable.defs[0].name, (type) =>
                    type.type === TSESTree.AST_NODE_TYPES.TSTypeReference &&
                    type.typeName.type === TSESTree.AST_NODE_TYPES.Identifier &&
                    HTML_ELEMENT_TYPE.test(type.typeName.name),
                )
            );
        }

        // The settings tab's own containerEl: `this.containerEl`, or a binding
        // taken from it that is not reassigned, `const containerEl =
        // this.containerEl` or `const { containerEl } = this`.
        function isTabContainer(node: TSESTree.Expression): boolean {
            if (node.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression) {
                return isTabContainer(node.expression);
            }
            if (isTabContainerEl(node)) {
                return true;
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier) {
                return false;
            }
            const variable = singleDefinition(sourceCode.getScope(node), node.name);
            if (!variable) {
                return false;
            }
            const def = variable.defs[0];
            if (def.type !== DefinitionType.Variable || isReassigned(variable)) {
                return false;
            }
            const declarator = def.node;
            // const containerEl = this.containerEl;
            if (declarator.id === def.name) {
                return declarator.init !== null && isTabContainerEl(declarator.init);
            }
            // const { containerEl } = this;
            const property = def.name.parent;
            return (
                declarator.id.type === TSESTree.AST_NODE_TYPES.ObjectPattern &&
                property?.type === TSESTree.AST_NODE_TYPES.Property &&
                property.parent === declarator.id &&
                property.value === def.name &&
                !property.computed &&
                propertyName(property.key) === "containerEl" &&
                declarator.init?.type === TSESTree.AST_NODE_TYPES.ThisExpression &&
                isTabThis(declarator.init)
            );
        }

        // A parameter named `containerEl`, as in `renderSection(containerEl:
        // HTMLElement)`, that is not reassigned.
        function isContainerElParameter(node: TSESTree.Expression): boolean {
            if (node.type === TSESTree.AST_NODE_TYPES.TSNonNullExpression) {
                return isContainerElParameter(node.expression);
            }
            if (node.type !== TSESTree.AST_NODE_TYPES.Identifier || node.name !== "containerEl") {
                return false;
            }
            const variable = singleDefinition(sourceCode.getScope(node), node.name);
            return (
                variable !== null &&
                variable.defs[0].type === DefinitionType.Parameter &&
                variable.defs[0].name.parent?.type !== TSESTree.AST_NODE_TYPES.Property &&
                !isReassigned(variable)
            );
        }

        // Without type information: a string literal, a template literal, a
        // concatenation with one, or a binding annotated as `string`.
        function isKnownString(node: TSESTree.Node): boolean {
            switch (node.type) {
                case TSESTree.AST_NODE_TYPES.Literal:
                    return typeof node.value === "string";
                case TSESTree.AST_NODE_TYPES.TemplateLiteral:
                    return true;
                case TSESTree.AST_NODE_TYPES.BinaryExpression:
                    return node.operator === "+" && (isKnownString(node.left) || isKnownString(node.right));
                case TSESTree.AST_NODE_TYPES.Identifier: {
                    const variable = singleDefinition(sourceCode.getScope(node), node.name);
                    if (!variable) {
                        return false;
                    }
                    const def = variable.defs[0];
                    if (isAnnotated(def.name, (type) => type.type === TSESTree.AST_NODE_TYPES.TSStringKeyword)) {
                        return true;
                    }
                    if (def.type !== DefinitionType.Variable) {
                        return false;
                    }
                    const declarator = def.node;
                    return (
                        declarator.id === def.name &&
                        declarator.parent.kind === "const" &&
                        declarator.init !== null &&
                        (declarator.init.type === TSESTree.AST_NODE_TYPES.Literal ||
                            declarator.init.type === TSESTree.AST_NODE_TYPES.TemplateLiteral) &&
                        isKnownString(declarator.init)
                    );
                }
                default:
                    return false;
            }
        }

        function singleDefinition(scope: Scope, name: string): Variable | null {
            const variable = ASTUtils.findVariable(scope, name);
            return variable && variable.defs.length === 1 ? variable : null;
        }

        // Whether the binding has a type annotation, and is not optional, that
        // `matches`.
        function isAnnotated(
            name: TSESTree.Node,
            matches: (type: TSESTree.TypeNode) => boolean,
        ): boolean {
            return (
                name.type === TSESTree.AST_NODE_TYPES.Identifier &&
                !name.optional &&
                name.typeAnnotation !== undefined &&
                matches(name.typeAnnotation.typeAnnotation)
            );
        }

        function isReassigned(variable: Variable): boolean {
            return variable.references.some((ref) => ref.isWrite() && !ref.init);
        }

        // `this.containerEl` with `this` the settings tab. Its type is, or
        // extends, SettingTab's `containerEl: HTMLElement`.
        function isTabContainerEl(node: TSESTree.Node): boolean {
            return (
                node.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
                !node.computed &&
                !node.optional &&
                node.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
                node.property.name === "containerEl" &&
                node.object.type === TSESTree.AST_NODE_TYPES.ThisExpression &&
                isTabThis(node.object)
            );
        }

        // Whether `this` is an instance of the class extending PluginSettingTab:
        // the nearest non-arrow function is one of its instance methods, or the
        // expression is in one of its instance fields.
        function isTabThis(node: TSESTree.ThisExpression): boolean {
            let child: TSESTree.Node = node;
            let current = node.parent;
            while (current) {
                switch (current.type) {
                    case TSESTree.AST_NODE_TYPES.ArrowFunctionExpression:
                        break;
                    case TSESTree.AST_NODE_TYPES.FunctionExpression: {
                        const method = current.parent;
                        return (
                            method?.type === TSESTree.AST_NODE_TYPES.MethodDefinition &&
                            method.value === current &&
                            !method.static &&
                            isPluginSettingTab(method.parent.parent)
                        );
                    }
                    case TSESTree.AST_NODE_TYPES.PropertyDefinition:
                        return (
                            current.value === child &&
                            !current.static &&
                            isPluginSettingTab(current.parent.parent)
                        );
                    case TSESTree.AST_NODE_TYPES.FunctionDeclaration:
                    case TSESTree.AST_NODE_TYPES.StaticBlock:
                    case TSESTree.AST_NODE_TYPES.ClassBody:
                    case TSESTree.AST_NODE_TYPES.Program:
                        return false;
                }
                child = current;
                current = current.parent;
            }
            return false;
        }
    },
});

// What the rewrite drops, for the suggestion's description: "the `attr` and
// `title` options and the callback". Empty when it drops nothing.
function describeDropped(options: string[], callback: boolean): string {
    const parts: string[] = [];
    const names = [...new Set(options)].map((name) => `\`${name}\``);
    if (names.length > 0) {
        const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
        parts.push(`the ${list} option${names.length === 1 ? "" : "s"}`);
    }
    if (callback) {
        parts.push("the callback");
    }
    return parts.join(" and ");
}

// Whether a call with one argument fits the signature: it has a first
// parameter, and every later one is optional or a rest parameter.
function takesOneArgument(checker: ts.TypeChecker, signature: ts.Signature): boolean {
    const [first, ...rest] = signature.getParameters();
    return (
        first !== undefined &&
        rest.every((param) => {
            const declaration = param.valueDeclaration;
            return (
                declaration !== undefined &&
                ts.isParameter(declaration) &&
                (declaration.dotDotDotToken !== undefined || checker.isOptionalParameter(declaration))
            );
        })
    );
}
