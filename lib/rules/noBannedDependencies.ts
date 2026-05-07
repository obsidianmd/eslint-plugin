import { ESLintUtils } from "@typescript-eslint/utils";
import fs from "node:fs";
import path from "node:path";
import type { ModuleReplacement } from "module-replacements";
import {
    nativeReplacements,
    microUtilsReplacements,
    preferredReplacements,
} from "module-replacements";

// Strategy: Import banned-dependency lists directly from module-replacements
// (the same data source eslint-plugin-depend uses). This avoids needing
// a files: ['package.json'] config block with @eslint/json, which causes
// config-merge issues with typescript-eslint typed linting.
// See: https://github.com/eslint/eslint/issues/20354

const ruleCreator = ESLintUtils.RuleCreator(
    (name) =>
        `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`,
);

type Preset = "native" | "microutilities" | "preferred";

const availablePresets: Record<Preset, ModuleReplacement[]> = {
    native: nativeReplacements.moduleReplacements,
    microutilities: microUtilsReplacements.moduleReplacements,
    preferred: preferredReplacements.moduleReplacements,
};

const depSections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
] as const;

// Cache scan results keyed by resolved package.json path so that linting
// many source files in one ESLint run only reads the file once. The cache
// lives for the duration of the ESLint process (module-level state) and
// is automatically discarded when the process exits.
const scannedPackageJsonPaths = new Set<string>();

export function resetScannedPaths(): void {
    scannedPackageJsonPaths.clear();
}

function findPackageJson(startDir: string): string | undefined {
    let dir = startDir;
    for (let i = 0; i < 10; i++) {
        const candidate = path.join(dir, "package.json");
        if (fs.existsSync(candidate)) {
            return candidate;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return undefined;
}

function getSuggestion(replacement: ModuleReplacement): string {
    switch (replacement.type) {
        case "native":
            return `Use the native \`${replacement.replacement}\` instead.`;
        case "simple":
            return `Use \`${replacement.replacement}\` instead.`;
        case "documented":
            return `See https://github.com/es-tooling/module-replacements/blob/main/docs/modules/${replacement.docPath}.md for alternatives.`;
        case "none":
            return "This module can likely be removed.";
    }
}

type Options = [
    {
        presets: Preset[];
        allowed: string[];
    },
];

export default ruleCreator({
    name: "no-banned-dependencies",
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow dependencies in package.json that have native or preferred replacements.",
            url: "https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/no-banned-dependencies.md",
        },
        schema: [
            {
                type: "object",
                properties: {
                    presets: {
                        type: "array",
                        items: {
                            type: "string",
                            enum: ["native", "microutilities", "preferred"],
                        },
                        default: ["native", "microutilities", "preferred"],
                    },
                    allowed: {
                        type: "array",
                        items: { type: "string" },
                        default: [],
                        description:
                            "Package names to allow even if they appear in the banned presets.",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            bannedDependency:
                '"{{name}}" in {{section}} should not be used. {{suggestion}}',
        },
    },
    defaultOptions: [
        {
            presets: ["native", "microutilities", "preferred"] as Preset[],
            allowed: [] as string[],
        },
    ],
    create(context, [options]) {
        return {
            Program(programNode) {
                const filename = context.physicalFilename ?? context.filename;
                const startDir = path.dirname(filename);
                const pkgPath = findPackageJson(startDir);

                if (!pkgPath) return;

                const resolvedPath = path.resolve(pkgPath);
                if (scannedPackageJsonPaths.has(resolvedPath)) return;
                scannedPackageJsonPaths.add(resolvedPath);

                let pkg: Record<string, unknown>;
                try {
                    pkg = JSON.parse(
                        fs.readFileSync(resolvedPath, "utf8"),
                    ) as Record<string, unknown>;
                } catch {
                    return;
                }

                const allowedSet = new Set(options.allowed);
                const bannedMap = new Map<string, ModuleReplacement>();
                for (const preset of options.presets) {
                    const replacements = availablePresets[preset];
                    if (!replacements) continue;
                    for (const rep of replacements) {
                        if (!allowedSet.has(rep.moduleName)) {
                            bannedMap.set(rep.moduleName, rep);
                        }
                    }
                }

                for (const section of depSections) {
                    const deps = pkg[section];
                    if (
                        !deps ||
                        typeof deps !== "object" ||
                        Array.isArray(deps)
                    ) {
                        continue;
                    }

                    for (const depName of Object.keys(
                        deps as Record<string, unknown>,
                    )) {
                        const match = bannedMap.get(depName);
                        if (match) {
                            context.report({
                                node: programNode,
                                messageId: "bannedDependency",
                                data: {
                                    name: depName,
                                    section,
                                    suggestion: getSuggestion(match),
                                },
                            });
                        }
                    }
                }
            },
        };
    },
});
