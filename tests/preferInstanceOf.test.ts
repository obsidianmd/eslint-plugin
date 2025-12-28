import { RuleTester } from "@typescript-eslint/rule-tester";
import preferInstanceOf from "../lib/rules/preferInstanceOf.js";

const ruleTester = new RuleTester();

ruleTester.run("prefer-instance-of", preferInstanceOf, {
    valid: [
        // Using .instanceOf() method
        { code: "el.instanceOf(HTMLElement);" },
        { code: "evt.instanceOf(MouseEvent);" },
        { code: "node.instanceOf(Node);" },
        // instanceof with non-DOM classes (Obsidian types)
        { code: "file instanceof TFile;" },
        { code: "folder instanceof TFolder;" },
        { code: "plugin instanceof Plugin;" },
        { code: "view instanceof MarkdownView;" },
        { code: "leaf instanceof WorkspaceLeaf;" },
        // instanceof with custom classes
        { code: "obj instanceof MyClass;" },
        { code: "item instanceof CustomComponent;" },
        // Error types (allowed - not DOM-related)
        { code: "err instanceof Error;" },
        { code: "e instanceof TypeError;" },
        { code: "ex instanceof ReferenceError;" },
        // Not an instanceof expression
        { code: "const x = el.instanceOf(HTMLElement);" },
        { code: "if (isHTMLElement(el)) {}" },
    ],
    invalid: [
        // DOM elements
        {
            code: "el instanceof HTMLElement",
            output: "el.instanceOf(HTMLElement)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "node instanceof Element",
            output: "node.instanceOf(Element)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "target instanceof HTMLInputElement",
            output: "target.instanceOf(HTMLInputElement)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "svg instanceof SVGElement",
            output: "svg.instanceOf(SVGElement)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        // Events
        {
            code: "evt instanceof MouseEvent",
            output: "evt.instanceOf(MouseEvent)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "e instanceof KeyboardEvent",
            output: "e.instanceOf(KeyboardEvent)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "event instanceof Event",
            output: "event.instanceOf(Event)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "evt instanceof DragEvent",
            output: "evt.instanceOf(DragEvent)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        // Other DOM types
        {
            code: "obj instanceof Node",
            output: "obj.instanceOf(Node)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "x instanceof Document",
            output: "x.instanceOf(Document)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "range instanceof Range",
            output: "range.instanceOf(Range)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        // In conditional expressions
        {
            code: "if (el instanceof HTMLElement) { handle(el); }",
            output: "if (el.instanceOf(HTMLElement)) { handle(el); }",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        {
            code: "const isInput = target instanceof HTMLInputElement;",
            output: "const isInput = target.instanceOf(HTMLInputElement);",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        // Member expression left side
        {
            code: "evt.target instanceof HTMLElement",
            output: "evt.target.instanceOf(HTMLElement)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
        // Complex expression needs parentheses
        {
            code: "(a || b) instanceof HTMLElement",
            output: "(a || b).instanceOf(HTMLElement)",
            errors: [{ messageId: "useInstanceOfMethod" }],
        },
    ],
});
