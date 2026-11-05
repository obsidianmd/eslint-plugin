// Imported by noMisusedPromises.test.ts: a project's own file named
// obsidian.d.ts, as plugins keep their type augmentations in, is not the
// obsidian package, so a `then` declared here is a real thenable.
export interface Deferred {
    then(onFulfilled: (value: string) => void): void;
}
