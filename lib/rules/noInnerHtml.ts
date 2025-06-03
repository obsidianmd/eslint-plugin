// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * @fileoverview Rule to disallow assignment to innerHTML or outerHTML properties
 * @author Antonios Katopodis
 */

import { TSESTree, TSESLint } from "@typescript-eslint/utils";
import astUtils from "../utils/ast-utils.mjs";

export default {
  name: "no-inner-html",
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Disallow assignment to innerHTML/outerHTML or use of insertAdjacentHTML",
      url: "https://github.com/microsoft/eslint-plugin-sdl/blob/master/docs/rules/no-inner-html.md",
    },
    schema: [],
    messages: {
      noInnerHtml: "Do not write to DOM directly using innerHTML/outerHTML property",
      noInsertAdjacentHTML: "Do not write to DOM using insertAdjacentHTML method",
    },
  },
  defaultOptions: [],
  create(
    context: TSESLint.RuleContext<"noInnerHtml" | "noInsertAdjacentHTML", []>
  ) {
    const fullTypeChecker = astUtils.getFullTypeChecker(context);
    function mightBeHTMLElement(node: any) {
      const type = astUtils.getNodeTypeAsString(fullTypeChecker, node, context);
      return /HTML.*Element/.test(type) || type === "any";
    }
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee &&
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "insertAdjacentHTML" &&
          node.arguments.length === 2 &&
          mightBeHTMLElement(node.callee.object)
        ) {
          // Ignore known false positives: element.insertAdjacentHTML('')
          if (
            node.arguments[1] &&
            node.arguments[1].type === "Literal" &&
            node.arguments[1].value === ""
          ) {
            return;
          }
          context.report({
            node,
            messageId: "noInsertAdjacentHTML",
          });
        }
      },
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.left.type === "MemberExpression" &&
          node.left.property.type === "Identifier" &&
          ["innerHTML", "outerHTML"].includes(node.left.property.name) &&
          mightBeHTMLElement(node.left.object)
        ) {
          // Ignore known false positives: element.innerHTML = ''
          if (
            node.right &&
            node.right.type === "Literal" &&
            node.right.value === ""
          ) {
            return;
          }
          context.report({
            node,
            messageId: "noInnerHtml",
          });
        }
      },
    };
  },
};