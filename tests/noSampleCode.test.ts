import { RuleTester } from "@typescript-eslint/rule-tester";
import noSampleCode from "../lib/rules/noSampleCode.js";

const ruleTester = new RuleTester();

ruleTester.run("no-sample-code", noSampleCode, {
    valid: [
        {
            name: "custom registerInterval call is allowed",
            code: "this.registerInterval(window.setInterval(() => this.doSomething(), 1000));",
        },
        {
            name: "custom registerDomEvent call is allowed",
            code: "this.registerDomEvent(this.containerEl, 'click', () => this.onClick());",
        },
        {
            // Crashed with "Cannot read properties of undefined (reading 'type')"
            name: "registerInterval callback calling a plain function is allowed",
            code: "this.registerInterval(window.setInterval(() => maybeRotateLog(), 24 * 60 * 60 * 1000));",
        },
        {
            name: "registerDomEvent callback calling a plain function first is allowed",
            code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                handleClick(evt);
            });`,
        },
        {
            name: "registerInterval callback calling an immediately invoked function is allowed",
            code: "this.registerInterval(window.setInterval(() => (() => console.log('setInterval'))(), 1000));",
        },

        // --- A handler that does more than the sample's logging is the plugin's own code ---
        // The fix deleted the whole call, doRealWork() included.
        {
            name: "a click handler that logs and then does its own work is not the sample",
            code: `this.registerDomEvent(document, "click", (evt) => {
                console.log("click", evt);
                this.doRealWork(evt);
            });`,
        },
        {
            name: "a click handler whose own work comes before the log is not the sample",
            code: `this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                this.doRealWork(evt);
                console.log("click", evt);
            });`,
        },
        {
            name: "a click handler that does its work inside the log call is not the sample",
            code: `this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                console.log("click", this.handleClick(evt));
            });`,
        },
        {
            name: "a click handler that logs through the plugin's own logger is not the sample",
            code: `this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                this.logger.log("click", evt);
            });`,
        },
        {
            name: "a click handler that shows its own notice is not the sample",
            code: `this.registerDomEvent(activeDocument, "click", () => {
                new Notice("Clicked the ribbon");
            });`,
        },
        {
            name: "a click handler that shows the sample notice and does its own work is not the sample",
            code: `this.registerDomEvent(activeDocument, "click", (evt: MouseEvent) => {
                new Notice("Click");
                this.handleClick(evt);
            });`,
        },
        {
            name: "a click listener on another target is not the sample",
            code: `this.registerDomEvent(this.containerEl, "click", (evt: MouseEvent) => {
                new Notice("Click");
            });`,
        },
        {
            name: "an interval that logs through the plugin's own logger is not the sample",
            code: "this.registerInterval(window.setInterval(() => this.log('setInterval'), 5 * 60 * 1000));",
        },
        {
            name: "an interval whose log call does work is not the sample",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval', this.sync()), 5 * 60 * 1000));",
        },
        {
            name: "an interval with a block body that does its own work is not the sample",
            code: "this.registerInterval(window.setInterval(() => { console.log('setInterval'); this.sync(); }, 5 * 60 * 1000));",
        },

        // --- Look-alikes of the sample that are the plugin's own code: not reported, so never deleted ---
        {
            name: "an interval or a click handler that logs another label, or not with console.log(), is not the sample",
            code: `
                this.registerInterval(window.setInterval(() => console.log('tick'), 1000));
                this.registerInterval(window.setInterval(() => console.error('setInterval'), 1000));
                this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                    console.log('clicked', evt);
                });
            `,
        },
        {
            name: "registerInterval() and registerDomEvent() called on another object are not the sample",
            code: `
                plugin.registerInterval(window.setInterval(() => console.log('setInterval'), 1000));
                plugin.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                    console.log('click', evt);
                });
            `,
        },
        {
            name: "an interval that is not window.setInterval() is not the sample",
            code: `
                this.registerInterval(window.setTimeout(() => console.log('setInterval'), 1000));
                this.registerInterval(this.clock.setInterval(() => console.log('setInterval'), 1000));
            `,
        },
        {
            // An id made earlier is the common way to register an interval.
            name: "registerInterval() of an id, or with nothing to read, is not the sample and does not crash",
            code: `
                const id = window.setInterval(() => this.sync(), 1000);
                this.registerInterval(id);
                this.registerInterval();
                this.registerInterval(window.setInterval());
            `,
        },
        {
            name: "a log in an interval that computes what it logs with a call is not the sample",
            code: `
                this.registerInterval(window.setInterval(() => console.log('setInterval', this.items[this.next()]), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', this.next().value), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', \`\${this.status()}\`), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', this.count() + 1), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', 1 + this.count()), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', this.ready() ? 1 : 2), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', ready ? this.a() : 2), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', ready ? 1 : this.b()), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', delete this.cache.entry), 1000));
                this.registerInterval(window.setInterval(() => console.log('setInterval', this.next()!), 1000));
            `,
        },
        {
            name: "a listener for another event is not the sample",
            code: `this.registerDomEvent(document, 'dblclick', (evt: MouseEvent) => {
                new Notice('Click');
            });`,
        },
        {
            name: "a click handler that is a function expression, or an arrow without a block, is not the sample",
            code: `
                this.registerDomEvent(document, 'click', function (evt: MouseEvent) {
                    console.log('click', evt);
                });
                this.registerDomEvent(document, 'click', (evt: MouseEvent) => console.log('click', evt));
            `,
        },
        {
            name: "a click handler that returns the notice, or a registerDomEvent() without a handler, is not the sample and does not crash",
            code: `
                this.registerDomEvent(document, 'click', () => {
                    return new Notice('Click');
                });
                this.registerDomEvent(document, 'click');
            `,
        },
        {
            name: "a notice with a duration, or another class's, is not the sample",
            code: `
                this.registerDomEvent(document, 'click', () => {
                    new Notice('Click', 2000);
                });
                this.registerDomEvent(document, 'click', () => {
                    new Toast('Click');
                });
            `,
        },
    ],
    invalid: [
        {
            name: "sample setInterval call is forbidden",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "", // The auto-fix should remove the entire line
        },
        {
            name: "sample registerDomEvent call is forbidden",
            code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                console.log('click', evt);
            });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "", // The auto-fix should remove the entire block
        },
        {
            name: "the sample statement is removed from onload()",
            code: "class MyPlugin extends Plugin { onload() { this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000)); this.addCommand(command); } }",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "class MyPlugin extends Plugin { onload() {  this.addCommand(command); } }",
        },

        // The sample plugin's handler since November 2025, and on activeDocument since 2026.
        {
            name: "the current sample click handler on activeDocument is forbidden",
            code: `this.registerDomEvent(activeDocument, 'click', (_evt: MouseEvent) => {
                new Notice('Click');
            });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "",
        },
        {
            name: "the sample click handler showing a notice on document is forbidden",
            code: `this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                new Notice("Click");
            });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "",
        },
        {
            name: "the sample click handler with another parameter name and a member in the log is the sample",
            code: `this.registerDomEvent(document, "click", (e) => {
                console.log("click", e.target);
            });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "",
        },
        {
            name: "the sample interval with another delay is the sample",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), this.settings.minutes * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "",
        },

        {
            name: "a log that only reads values, of any kind, is the sample",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval', -1, typeof x, a ? b : c, `t${d}`, e as number, f!, <number>g, h satisfies number, i && j, this.k[l]), 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: "",
        },
        {
            name: "a sample click handler with listener options that only read values is fixed",
            code: `this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                console.log("click", evt);
            }, { capture: true, [key]: passive });`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: "",
        },
        {
            name: "a sample statement in a switch case, a static block or a namespace is removed",
            code: [
                "switch (mode) { case 1: this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000)); break; }",
                "class A { static { this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000)); } }",
                "namespace B { this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000)); }",
            ].join("\n"),
            errors: [{ messageId: "removeSampleInterval" }, { messageId: "removeSampleInterval" }, { messageId: "removeSampleInterval" }],
            output: [
                "switch (mode) { case 1:  break; }",
                "class A { static {  } }",
                "namespace B {  }",
            ].join("\n"),
        },

        // --- Deleting the call would drop a call made in its arguments: no fix ---
        {
            name: "a sample interval whose delay is computed by a call is reported without a fix",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), this.getDelay()));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample click handler with options built by a call is reported without a fix",
            code: `this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                console.log("click", evt);
            }, this.listenerOptions());`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: null,
        },

        {
            name: "a sample interval with an extra argument computed by a call is reported without a fix",
            code: "this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000), this.track());",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample click handler with listener options that call something is reported without a fix",
            code: `
                this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                    console.log("click", evt);
                }, { capture: this.useCapture() });
                this.registerDomEvent(document, "click", (evt: MouseEvent) => {
                    console.log("click", evt);
                }, { [this.key()]: true });
            `,
            errors: [{ messageId: "removeSampleDomEvent" }, { messageId: "removeSampleDomEvent" }],
            output: null,
        },

        // --- The call's value is used, or the call is not a statement of its own: no fix ---
        // Removing the declarator left `const ;`, which does not parse.
        {
            name: "a sample interval whose id is kept is reported without a fix",
            code: "const id = this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample interval assigned to a field is reported without a fix",
            code: "this.intervalId = this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a returned sample interval is reported without a fix",
            code: "function start() { return this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000)); }",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        {
            name: "a sample call as an arrow function body is reported without a fix",
            code: "const start = () => this.registerInterval(window.setInterval(() => console.log('setInterval'), 1000));",
            errors: [{ messageId: "removeSampleInterval" }],
            output: null,
        },
        // Removing the statement would make the next one the body of the `if`.
        {
            name: "a sample call as the body of an if is reported without a fix",
            code: `if (debug) this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
                console.log('click', evt);
            });
            this.addCommand(command);`,
            errors: [{ messageId: "removeSampleDomEvent" }],
            output: null,
        },
    ],
});
