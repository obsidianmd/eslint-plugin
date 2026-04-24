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
    ],
    invalid: [
        {
            name: "navigator.userAgent is forbidden",
            code: "const ua = navigator.userAgent;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "navigator.platform is forbidden",
            code: "const p = navigator.platform;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "window.navigator.userAgent is forbidden",
            code: "const ua = window.navigator.userAgent;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "window.navigator.platform is forbidden",
            code: "const p = window.navigator.platform;",
            errors: [{ messageId: "avoidNavigator" }],
        },
        {
            name: "navigator.userAgent in condition is forbidden",
            code: "if (navigator.userAgent.includes('Mac')) {}",
            errors: [{ messageId: "avoidNavigator" }],
        },
    ],
});
