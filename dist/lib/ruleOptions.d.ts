export declare const restrictedGlobalsOptions: readonly [{
    readonly name: "app";
    readonly message: "Avoid using the global app object. Instead use the reference provided by your plugin instance.";
}, "warn", {
    readonly name: "fetch";
    readonly message: "Use the built-in `requestUrl` function instead of `fetch` for network requests in Obsidian.";
}, {
    readonly name: "localStorage";
    readonly message: "Prefer `App#saveLocalStorage` / `App#loadLocalStorage` functions to write / read localStorage data that's unique to a vault.";
}];
export declare const restrictedImportsOptions: readonly [{
    readonly name: "axios";
    readonly message: "Use the built-in `requestUrl` function instead of `axios`.";
}, {
    readonly name: "superagent";
    readonly message: "Use the built-in `requestUrl` function instead of `superagent`.";
}, {
    readonly name: "got";
    readonly message: "Use the built-in `requestUrl` function instead of `got`.";
}, {
    readonly name: "ofetch";
    readonly message: "Use the built-in `requestUrl` function instead of `ofetch`.";
}, {
    readonly name: "ky";
    readonly message: "Use the built-in `requestUrl` function instead of `ky`.";
}, {
    readonly name: "node-fetch";
    readonly message: "Use the built-in `requestUrl` function instead of `node-fetch`.";
}, {
    readonly name: "moment";
    readonly message: "The 'moment' package is bundled with Obsidian. Please import it from 'obsidian' instead.";
}];
