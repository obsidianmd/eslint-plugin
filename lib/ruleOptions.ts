export const restrictedGlobalsOptions = [
    {
        name: "app",
        message:
            "Avoid using the global app object. Instead use the reference provided by your plugin instance.",
    },
    "warn",
    {
        name: "fetch",
        message:
            "Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian.",
    },
    {
        name: "localStorage",
        message: "Prefer `App#saveLocalStorage` / `App#loadLocalStorage` functions to write / read localStorage data that's unique to a vault."
    }
] as const;

export const restrictedImportsOptions = [
    {
        name: "axios",
        message:
            "Use the built-in `requestUrl` function instead of `axios`.",
    },
    {
        name: "superagent",
        message:
            "Use the built-in `requestUrl` function instead of `superagent`.",
    },
    {
        name: "got",
        message:
            "Use the built-in `requestUrl` function instead of `got`.",
    },
    {
        name: "ofetch",
        message:
            "Use the built-in `requestUrl` function instead of `ofetch`.",
    },
    {
        name: "ky",
        message:
            "Use the built-in `requestUrl` function instead of `ky`.",
    },
    {
        name: "node-fetch",
        message:
            "Use the built-in `requestUrl` function instead of `node-fetch`.",
    },
    {
        name: "moment",
        message:
            "The 'moment' package is bundled with Obsidian. Import the `moment` value from 'obsidian' instead. For the `Moment` type, rely on the global `moment` namespace or add `type Moment = moment.Moment;` (type-only imports from 'moment' are allowed).",
        allowTypeImports: true,
    },
] as const;

export const noUnusedExpressionsOptions = [{ allowShortCircuit: true, allowTernary: true }] as const;