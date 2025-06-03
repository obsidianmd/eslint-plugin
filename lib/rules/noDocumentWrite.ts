// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * @fileoverview Rule to disallow document.write or document.writeln method call
 * @author Antonios Katopodis
 */

import { TSESTree, TSESLint } from "@typescript-eslint/utils";
import astUtils from "../utils/ast-utils.mjs";

export default {
  name: "no-document-write",
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow use of document.write or document.writeln",
      url: "https://github.com/microsoft/eslint-plugin-sdl/blob/master/docs/rules/no-document-write.md"
    },
    schema: [],
    messages: {
      default: "Do not write to DOM directly using document.write or document.writeln methods"
    }
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<"default", []>) {
    const fullTypeChecker = astUtils.getFullTypeChecker(context);
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee &&
          node.callee.type === "MemberExpression" &&
          node.callee.property &&
          node.callee.property.type === "Identifier" &&
          ["write", "writeln"].includes(node.callee.property.name) &&
          node.arguments.length === 1 &&
          astUtils.isDocumentObject(node.callee.object, context, fullTypeChecker)
        ) {
          context.report({
            node,
            messageId: "default"
          });
        }
      }
    };
  }
};