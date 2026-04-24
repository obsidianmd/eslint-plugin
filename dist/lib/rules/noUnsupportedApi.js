import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { gt } from "semver";
import ts from "typescript";
import { getManifest } from "../manifest.js";
const ruleCreator = ESLintUtils.RuleCreator((name) => `https://github.com/obsidianmd/eslint-plugin/blob/master/docs/rules/${name}.md`);
let cachedSinceMap;
let cachedDtsPath;
export default ruleCreator({
    name: "no-unsupported-api",
    meta: {
        type: "problem",
        docs: {
            description: "Disallow usage of Obsidian APIs not available in the plugin's minimum app version",
        },
        schema: [
            {
                type: "object",
                properties: {
                    minAppVersion: {
                        type: "string",
                        description: "The minimum app version to check against. Defaults to manifest.json minAppVersion.",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            apiNotAvailable: "'{{qualifiedName}}' requires Obsidian v{{sinceVersion}}, but minAppVersion is {{minAppVersion}}.",
        },
    },
    defaultOptions: [{}],
    create(context) {
        const options = context.options[0] || {};
        const resolvedVersion = options.minAppVersion ?? getManifest()?.minAppVersion;
        if (!resolvedVersion) {
            return {};
        }
        const minAppVersion = resolvedVersion;
        const services = ESLintUtils.getParserServices(context);
        const checker = services.program.getTypeChecker();
        const dtsPath = findObsidianDtsPath(services.program);
        if (!dtsPath) {
            return {};
        }
        const sinceMap = buildSinceMap(dtsPath);
        const reported = new WeakSet();
        return {
            MemberExpression(node) {
                if (node.property.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                if (node.computed) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node, symbol);
            },
            NewExpression(node) {
                if (node.callee.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node, symbol);
            },
            ClassDeclaration(node) {
                if (!node.superClass) {
                    return;
                }
                if (node.superClass.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.superClass);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node.superClass, symbol);
            },
            CallExpression(node) {
                if (node.callee.type !== AST_NODE_TYPES.Identifier) {
                    return;
                }
                const tsNode = services.esTreeNodeToTSNodeMap.get(node.callee);
                const symbol = checker.getSymbolAtLocation(tsNode);
                checkSymbol(node.callee, symbol);
            },
        };
        function resolveSymbol(symbol) {
            if (symbol.flags & ts.SymbolFlags.Alias) {
                return checker.getAliasedSymbol(symbol);
            }
            return symbol;
        }
        function checkSymbol(node, symbol) {
            if (!symbol || reported.has(node)) {
                return;
            }
            const resolved = resolveSymbol(symbol);
            const declarations = resolved.getDeclarations();
            if (!declarations?.length) {
                return;
            }
            for (const decl of declarations) {
                if (!isObsidianDeclaration(decl)) {
                    continue;
                }
                const parentName = getParentTypeName(decl);
                const symbolName = resolved.getName();
                const qualifiedName = parentName
                    ? `${parentName}.${symbolName}`
                    : symbolName;
                const sinceVersion = sinceMap.get(qualifiedName);
                if (!sinceVersion) {
                    continue;
                }
                if (gt(sinceVersion, minAppVersion)) {
                    if (isGuardedByRequireApiVersion(node, sinceVersion)) {
                        return;
                    }
                    reported.add(node);
                    context.report({
                        node,
                        messageId: "apiNotAvailable",
                        data: {
                            qualifiedName,
                            sinceVersion,
                            minAppVersion,
                        },
                    });
                    return;
                }
            }
        }
        function extractRequireApiVersion(expr) {
            if (expr.type === AST_NODE_TYPES.CallExpression &&
                expr.callee.type === AST_NODE_TYPES.Identifier &&
                expr.callee.name === "requireApiVersion" &&
                expr.arguments.length >= 1 &&
                expr.arguments[0].type === AST_NODE_TYPES.Literal &&
                typeof expr.arguments[0].value === "string") {
                return expr.arguments[0].value;
            }
            if (expr.type === AST_NODE_TYPES.LogicalExpression && expr.operator === "&&") {
                return extractRequireApiVersion(expr.left);
            }
            return undefined;
        }
        function isGuardedByRequireApiVersion(node, sinceVersion) {
            let current = node.parent;
            let prevChild = node;
            while (current) {
                if (current.type === AST_NODE_TYPES.IfStatement) {
                    if (prevChild !== current.test && prevChild !== current.alternate) {
                        const guardVersion = extractRequireApiVersion(current.test);
                        if (guardVersion && !gt(sinceVersion, guardVersion)) {
                            return true;
                        }
                    }
                }
                else if (current.type === AST_NODE_TYPES.ConditionalExpression) {
                    if (prevChild !== current.test && prevChild !== current.alternate) {
                        const guardVersion = extractRequireApiVersion(current.test);
                        if (guardVersion && !gt(sinceVersion, guardVersion)) {
                            return true;
                        }
                    }
                }
                else if (current.type === AST_NODE_TYPES.LogicalExpression &&
                    current.operator === "&&" &&
                    prevChild === current.right) {
                    const guardVersion = extractRequireApiVersion(current.left);
                    if (guardVersion && !gt(sinceVersion, guardVersion)) {
                        return true;
                    }
                }
                prevChild = current;
                current = current.parent;
            }
            return false;
        }
    }
});
function buildSinceMap(dtsPath) {
    if (cachedSinceMap && cachedDtsPath === dtsPath) {
        return cachedSinceMap;
    }
    const obsidianVersion = getObsidianVersion(dtsPath);
    if (obsidianVersion) {
        const cached = loadCachedSinceMap(dtsPath, obsidianVersion);
        if (cached) {
            cachedSinceMap = cached;
            cachedDtsPath = dtsPath;
            return cached;
        }
    }
    const sinceMap = new Map();
    const content = readFileSync(dtsPath, "utf8");
    const sourceFile = ts.createSourceFile("obsidian.d.ts", content, ts.ScriptTarget.Latest, true);
    visit(sourceFile);
    if (obsidianVersion) {
        saveSinceMapCache(dtsPath, obsidianVersion, sinceMap);
    }
    cachedSinceMap = sinceMap;
    cachedDtsPath = dtsPath;
    return sinceMap;
    function visit(node) {
        const sinceVersion = getSinceTag(node);
        if (ts.isClassDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
            visitMembers(node.name.text, node.members);
        }
        else if (ts.isInterfaceDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
            visitMembers(node.name.text, node.members);
        }
        else if (ts.isFunctionDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        }
        else if (ts.isTypeAliasDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        }
        else if (ts.isEnumDeclaration(node) && node.name) {
            if (sinceVersion) {
                sinceMap.set(node.name.text, sinceVersion);
            }
        }
        else if (ts.isModuleDeclaration(node)) {
            ts.forEachChild(node, visit);
        }
        else if (ts.isModuleBlock(node)) {
            ts.forEachChild(node, visit);
        }
        if (ts.isSourceFile(node)) {
            ts.forEachChild(node, visit);
        }
    }
    function visitMembers(parentName, members) {
        for (const member of members) {
            const sinceVersion = getSinceTag(member);
            if (!sinceVersion) {
                continue;
            }
            let memberName;
            if (ts.isMethodDeclaration(member) ||
                ts.isPropertyDeclaration(member) ||
                ts.isMethodSignature(member) ||
                ts.isPropertySignature(member) ||
                ts.isGetAccessorDeclaration(member) ||
                ts.isSetAccessorDeclaration(member)) {
                memberName = member.name?.getText(sourceFile);
            }
            if (memberName) {
                sinceMap.set(`${parentName}.${memberName}`, sinceVersion);
            }
        }
    }
}
function findObsidianDtsPath(program) {
    for (const sourceFile of program.getSourceFiles()) {
        const normalized = sourceFile.fileName.replace(/\\/g, "/");
        if (normalized.includes("/obsidian/obsidian.d.ts")) {
            return sourceFile.fileName;
        }
    }
    return undefined;
}
function getCachePath(dtsPath) {
    const cacheDir = join(dirname(dtsPath), "..", ".cache", "eslint-plugin-obsidianmd");
    return join(cacheDir, "since-map.json");
}
function getObsidianVersion(dtsPath) {
    try {
        const pkgPath = join(dirname(dtsPath), "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        return pkg.version;
    }
    catch {
        return undefined;
    }
}
function getParentTypeName(declaration) {
    const parent = declaration.parent;
    if (ts.isClassDeclaration(parent) && parent.name) {
        return parent.name.text;
    }
    if (ts.isInterfaceDeclaration(parent) && parent.name) {
        return parent.name.text;
    }
    return undefined;
}
function getSinceTag(node) {
    const tags = ts.getJSDocTags(node);
    for (const tag of tags) {
        if (tag.tagName.text === "since" && typeof tag.comment === "string") {
            return tag.comment.trim();
        }
    }
    return undefined;
}
function isObsidianDeclaration(declaration) {
    const fileName = declaration.getSourceFile().fileName.replace(/\\/g, "/");
    return fileName.includes("/obsidian/obsidian.d.ts");
}
function loadCachedSinceMap(dtsPath, obsidianVersion) {
    try {
        const cachePath = getCachePath(dtsPath);
        const raw = readFileSync(cachePath, "utf8");
        const cache = JSON.parse(raw);
        if (cache.obsidianPackageVersion === obsidianVersion) {
            return new Map(cache.entries);
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
function saveSinceMapCache(dtsPath, obsidianVersion, sinceMap) {
    try {
        const cachePath = getCachePath(dtsPath);
        mkdirSync(dirname(cachePath), { recursive: true });
        const cache = {
            obsidianPackageVersion: obsidianVersion,
            entries: [...sinceMap.entries()],
        };
        writeFileSync(cachePath, JSON.stringify(cache), "utf8");
    }
    catch {
        // Non-critical. Caching is best-effort
    }
}
