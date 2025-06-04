// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * @fileoverview Common utils for AST.
 */

"use strict";

export default {
  isTypeScriptParserServices(parserServices) {
    // Check properties specific to @typescript-eslint/parser
    return (
      parserServices &&
      parserServices.program &&
      parserServices.esTreeNodeToTSNodeMap &&
      parserServices.tsNodeToESTreeNodeMap
    );
  },

  hasFullTypeInformation(context) {
    return (
      context &&
      context.sourceCode &&
      context.sourceCode.parserServices &&
      this.isTypeScriptParserServices(context.sourceCode.parserServices)
    );
  },

  getFullTypeChecker(context) {
    return this.hasFullTypeInformation(context)
      ? context.sourceCode.parserServices.program.getTypeChecker()
      : null;
  },

  getNodeTypeAsString(fullTypeChecker, node, context) {
    if (
      fullTypeChecker &&
      node &&
      context.sourceCode &&
      context.sourceCode.parserServices &&
      context.sourceCode.parserServices.esTreeNodeToTSNodeMap
    ) {
      const tsNode =
        context.sourceCode.parserServices.esTreeNodeToTSNodeMap.get(node);
      if (tsNode) {
        const tsType = fullTypeChecker.getTypeAtLocation(tsNode);
        if (tsType) {
          const type = fullTypeChecker.typeToString(tsType);
          return type;
        }
      }
    }
    return "any";
  },

  isDocumentObject(node, context, fullTypeChecker) {
    console.log(
      "isDocumentObject called with node type:",
      node.type,
      "and context:",
      context
    );
    if (fullTypeChecker) {
      const type = this.getNodeTypeAsString(fullTypeChecker, node, context);
      return type === "Document";
    }

    // Best-effort checking without Type information
    switch (node.type) {
      case "Identifier":
        console.log("Checking Identifier node:", node.name);
        return node.name === "documentAPI" || node.name === "document";
      case "MemberExpression":
        return (
          node.property &&
          node.property.name === "document" &&
          ((node.object &&
            typeof node.object.name === "string" &&
            node.object.name.toLowerCase().endsWith("window")) ||
            (node.object &&
              node.object.property &&
              node.object.property.name === "window" &&
              ((node.object.object &&
                node.object.object.type === "ThisExpression") ||
                (node.object.object &&
                  node.object.object.name === "globalThis"))))
        );
      case "CallExpression":
        console.log(
          "Checking CallExpression node with callee:",
          node,
          "and node name:",
          node.name
        );
        return (
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "documentLikeAPIFunction" &&
          node.parent.type === "MemberExpression" &&
          node.parent.property.type === "Identifier" &&
          (node.parent.property.name === "write" ||
            node.parent.property.name === "writeln")
        );
      default:
        return false;
    }
  },
};