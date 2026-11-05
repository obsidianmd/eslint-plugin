import { RuleTester } from "@typescript-eslint/rule-tester";
import platformRule from "../lib/rules/platform.js";

const ruleTester = new RuleTester();

ruleTester.run("platform", platformRule, {
    valid: [
        {
            name: "window.alert is allowed",
            code: "window.alert('hello');",
        },
        {
            name: "window.innerHeight is allowed",
            code: "const x = window.innerHeight;",
        },
        {
            name: "navigator.clipboard is allowed",
            code: "navigator.clipboard.writeText('copy');",
        },
        {
            name: "other member expressions are allowed",
            code: "console.log('test');",
        },
        {
            name: "navigator.userAgentData is not reported",
            code: "const p = navigator.userAgentData.platform;",
        },
        {
            name: "a computed access by a variable is not reported",
            code: `
                const userAgent = "appVersion";
                const ua = navigator[userAgent];
                function read(navigator: "clipboard", platform: "language") {
                    return [window[navigator].platform, window.navigator[platform]];
                }
            `,
        },
        {
            name: "another window's navigator is not reported",
            code: "const ua = activeWindow.navigator.userAgent;",
        },
        {
            name: "userAgent or platform of another object is not reported",
            code: "const a = request.userAgent; const b = process.platform; const c = window.process.platform;",
        },
    ],
    invalid: [
        {
            name: "navigator.userAgent is forbidden",
            code: "const ua = navigator.userAgent;",
            errors: [{ messageId: "avoidNavigator", line: 1, column: 12, endColumn: 31 }],
        },
        {
            name: "navigator.platform is forbidden",
            code: "const p = navigator.platform;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "window.navigator.userAgent is forbidden",
            code: "const ua = window.navigator.userAgent;",
            errors: [{ messageId: "avoidNavigator", line: 1, column: 12, endColumn: 38 }],
        },
        {
            name: "window.navigator.platform is forbidden",
            code: "const p = window.navigator.platform;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "a computed access with the name spelled out is forbidden",
            code: `
                const ua = navigator["userAgent"];
                const p = navigator[\`platform\`];
                const wua = window["navigator"]["userAgent"];
                const wp = window[\`navigator\`].platform;
            `,
            errors: [
                { messageId: "avoidNavigator", line: 2 },
                { messageId: "avoidNavigator", line: 3 },
                { messageId: "avoidNavigator", line: 4 },
                { messageId: "avoidNavigator", line: 5 },
            ],
        },
        {
            name: "navigator.userAgent in condition is forbidden",
            code: "if (navigator.userAgent.includes('Mac')) {}",
            errors: [{ messageId: "avoidNavigator" }],
        },
    ],
});
