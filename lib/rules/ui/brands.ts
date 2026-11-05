// Brand names that should preserve their official casing
export const DEFAULT_BRANDS: string[] = [
    // Operating systems
    "iOS",
    "iPadOS",
    "macOS",
    "Windows",
    "Android",
    "Linux",
    // Obsidian
    "Obsidian",
    "Obsidian Sync",
    "Obsidian Publish",
    // Common APIs and services
    "Google",
    "Gemini",
    "Vertex AI", // Enterprise AI for Gemini and Claude
    "OpenAI",
    "GPT",
    "Anthropic",
    "Claude",
    "Cursor",
    "Microsoft",
    // Cloud storage
    "Google Drive",
    "Dropbox",
    "OneDrive",
    "iCloud Drive",
    // Communication platforms
    "YouTube",
    "Slack",
    "Discord",
    "Telegram",
    "WhatsApp",
    "Twitter",
    "X",
    // Productivity tools
    "Readwise",
    "Zotero",
    // Diagram tools
    "Excalidraw",
    "Mermaid",
    // Languages
    "Markdown",
    "LaTeX",
    "JavaScript",
    "TypeScript",
    "Node.js",
    // Development tools
    "npm",
    "pnpm",
    "Yarn",
    "Git",
    "GitHub",
    "GitLab",
    // Other tools
    "Anki",
    "CalDAV",
    "CardDAV",
    "Evernote",
    "IntelliJ IDEA",
    "Jekyll",
    "Logseq",
    "Notion",
    "PyCharm",
    "React",
    "Reddit",
    "Roam Research",
    "Svelte",
    "VS Code",
    "Visual Studio Code",
    "WebDAV",
    "WebStorm"
];

// Brands whose name is also an ordinary English word that UI text uses in
// its own sense: "Close all windows", "Move the cursor", "Leave some slack",
// "Press x to close", "The notion of", "Views react to changes". Written in
// lower case they are that word and are left alone; written as the brand they
// keep the brand's casing; any other casing is corrected to the brand's. This
// applies to these names in a `brands` option too.
export const DEFAULT_AMBIGUOUS_BRANDS: string[] = [
    "Windows",
    "Cursor",
    "Slack",
    "X",
    "Notion",
    "React",
];
