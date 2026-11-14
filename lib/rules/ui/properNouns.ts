// Words that are written with a capital wherever they are in a sentence. Unlike
// brands, they are only kept as written: a capitalized one keeps its capital,
// and one in lower case is left alone, since several are ordinary words too
// ("May", "March", "Polish"). They do not depend on the `brands` option.

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const MONTHS = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September",
    "October", "November", "December",
];

const LANGUAGES = [
    "Afrikaans", "Arabic", "Bengali", "Bulgarian", "Cantonese", "Catalan", "Chinese", "Croatian",
    "Czech", "Danish", "Dutch", "English", "Esperanto", "Estonian", "Filipino", "Finnish", "French",
    "German", "Greek", "Gujarati", "Hebrew", "Hindi", "Hungarian", "Icelandic", "Indonesian",
    "Irish", "Italian", "Japanese", "Korean", "Latin", "Latvian", "Lithuanian", "Malay", "Mandarin",
    "Marathi", "Norwegian", "Persian", "Polish", "Portuguese", "Punjabi", "Romanian", "Russian",
    "Serbian", "Slovak", "Slovenian", "Spanish", "Swahili", "Swedish", "Tagalog", "Tamil", "Telugu",
    "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh",
];

// Capitalized words that are always proper nouns in UI text
export const PROPER_NOUNS: ReadonlySet<string> = new Set([...WEEKDAYS, ...MONTHS, ...LANGUAGES]);

// Names of keys that are not ordinary words, kept capitalized anywhere, as in
// "Press Enter to confirm" or "Shift-click to select"
export const KEY_NAMES: ReadonlySet<string> = new Set([
    "Enter", "Esc", "Escape", "Shift", "Ctrl", "Cmd", "Alt", "AltGr", "Backspace", "Fn", "Meta",
    "CapsLock", "PageUp", "PageDown", "PgUp", "PgDn", "Spacebar",
]);

// Function keys: F1 to F24
export const FUNCTION_KEY = /^F(?:[1-9]|1[0-9]|2[0-4])$/;

// Names of keys that are also ordinary words, as "Tab", "Home" and "Space"
// are: kept capitalized only where the text makes them a key (see
// KEY_CONTEXT_BEFORE and KEY_CONTEXT_AFTER), as in "Press Tab to indent" or
// "the Home key", and lowercased elsewhere, as in "Open in new Tab".
export const AMBIGUOUS_KEY_NAMES: ReadonlySet<string> = new Set([
    "Tab", "Home", "End", "Space", "Delete", "Del", "Insert", "Ins", "Option", "Return", "Up",
    "Down", "Left", "Right", "Control", "Command", "Super", "Win",
]);

// Words before a key name that make it a key: "Press Tab", "Hold Option"
export const KEY_CONTEXT_BEFORE: ReadonlySet<string> = new Set([
    "press", "pressing", "pressed", "hit", "hitting", "hold", "holding", "tap", "tapping", "use",
    "using", "with",
]);

// Words after a key name that make it a key: "the Home key"
export const KEY_CONTEXT_AFTER: ReadonlySet<string> = new Set(["key", "keys"]);
