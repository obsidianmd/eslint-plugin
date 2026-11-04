// What "obsidian" resolves to in tests/fixtures/old-obsidian: typings from
// before getLanguage() (1.8.7) and Vault.getFileByPath() (1.5.7).
export declare class Plugin {}
export declare class TFile {
    path: string;
}
export declare class Vault {
    getFiles(): TFile[];
}
