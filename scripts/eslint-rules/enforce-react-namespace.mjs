/* eslint-disable */
/**
 * Enforces consistent React imports by requiring namespace pattern.
 * Prevents mixing named imports with namespace imports to avoid confusion
 * and maintain consistent React API access patterns.
 */

"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce namespace import for React instead of named imports.",
      category: "Best Practices",
      recommended: true,
      url: null,
    },
    fixable: "code",
    schema: [],
    messages: {
      useNamespaceImport:
        'Use namespace import (import React from "react") instead of named imports from "react".',
      useNamespaceUsage: "Use '{{reactNamespace}}.{{importedName}}' instead of '{{localName}}'.",
    },
  },

  create(context) {
    let reactNamespace = "React";
    const namedImportsFromReact = new Map();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "react") {
          return;
        }

        const namedSpecifiers = node.specifiers.filter((spec) => spec.type === "ImportSpecifier");
        const defaultSpecifier = node.specifiers.find(
          (spec) => spec.type === "ImportDefaultSpecifier",
        );

        if (defaultSpecifier) {
          reactNamespace = defaultSpecifier.local.name;
        }

        if (namedSpecifiers.length > 0) {
          // Store named imports for reference during traversal
          namedSpecifiers.forEach((spec) => {
            if (!namedImportsFromReact.has(spec.local.name)) {
              namedImportsFromReact.set(spec.local.name, {
                node: spec,
                importedName: spec.imported.name,
              });
            }
          });

          context.report({
            node,
            messageId: "useNamespaceImport",
            fix(fixer) {
              const targetImport = `import ${reactNamespace} from 'react';`;

              if (defaultSpecifier) {
                // Handle mixed imports - keep default import and remove named ones
                const fixedImport = `import ${defaultSpecifier.local.name} from 'react';`;
                return fixer.replaceText(node, fixedImport);
              } else {
                // Replace entire import with namespace pattern
                return fixer.replaceText(node, targetImport);
              }
            },
          });
        }
      },

      // Find and fix usages of named imports in standard JS
      Identifier(identifierNode) {
        const localName = identifierNode.name;

        if (!namedImportsFromReact.has(localName)) {
          return;
        }

        const importInfo = namedImportsFromReact.get(localName);
        const { importedName } = importInfo;

        // Skip fixing in certain contexts where replacement would be incorrect
        const parent = identifierNode.parent;

        // Skip original import specifier
        if (parent.type === "ImportSpecifier" && parent.local === identifierNode) {
          return;
        }

        // Skip property key usage (non-shorthand)
        if (parent.type === "Property" && parent.key === identifierNode && !parent.shorthand) {
          return;
        }

        // Skip if used as property of another object
        if (
          parent.type === "MemberExpression" &&
          parent.property === identifierNode &&
          !parent.computed
        ) {
          if (parent.object !== identifierNode) {
            return;
          }
        }

        // Fix identified usage
        context.report({
          node: identifierNode,
          messageId: "useNamespaceUsage",
          data: {
            reactNamespace,
            importedName,
            localName,
          },
          fix(fixer) {
            return fixer.replaceText(identifierNode, `${reactNamespace}.${importedName}`);
          },
        });
      },

      // Find and fix usages of named imports in JSX
      JSXIdentifier(jsxIdentifierNode) {
        const localName = jsxIdentifierNode.name;

        // Check if the identifier corresponds to a named React import
        if (!namedImportsFromReact.has(localName)) {
          return;
        }

        // Ensure it's used as a component name (part of opening/closing tag)
        const parent = jsxIdentifierNode.parent;
        if (
          !(parent.type === "JSXOpeningElement" && parent.name === jsxIdentifierNode) &&
          !(parent.type === "JSXClosingElement" && parent.name === jsxIdentifierNode)
        ) {
          return;
        }

        const importInfo = namedImportsFromReact.get(localName);
        const { importedName } = importInfo;

        context.report({
          node: jsxIdentifierNode,
          messageId: "useNamespaceUsage",
          data: {
            reactNamespace,
            importedName,
            localName,
          },
          fix(fixer) {
            return fixer.replaceText(jsxIdentifierNode, `${reactNamespace}.${importedName}`);
          },
        });
      },

      // Clean up state between files
      "Program:exit"(node) {
        reactNamespace = "React";
        namedImportsFromReact.clear();
      },
    };
  },
};
