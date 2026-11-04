// A workaround like the root file.ts: the RuleTester with
// tests/fixtures/obsidian-project/tsconfig.json lints its tests as this file,
// in a project whose typings are those of a plugin: the obsidian package is
// part of the program, which declares activeDocument and activeWindow, as it
// is once any file of a plugin imports it.
export const workaround = true;
