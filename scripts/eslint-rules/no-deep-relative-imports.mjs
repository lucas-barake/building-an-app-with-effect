/* eslint-disable */
/**
 * @fileoverview prevent relative imports going up more than one level (../../) in client and server packages
 */

import path from "path";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

// List of packages where this rule should be enforced and aliases are configured
const ALIASED_PACKAGES_PREFIX = ["packages/client", "packages/server"];

export default {
  meta: {
    docs: {
      description:
        "prevent relative imports going up more than one level (../../) in client and server packages",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
  },

  create: function (context) {
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    function isExternal(name) {
      return isScoped(name) || isExternalModule(name);
    }

    const scopedRegExp = /^@[^/]+\/[^/]+/;
    function isScoped(name) {
      return scopedRegExp.test(name);
    }

    const externalModuleRegExp = /^\w/;
    function isExternalModule(name) {
      return externalModuleRegExp.test(name);
    }

    function getRelativePathDepth(importPath) {
      if (!importPath.startsWith(".")) {
        return 0;
      }
      const parts = importPath.split("/");
      let depth = 0;
      for (const part of parts) {
        if (part === "..") {
          depth++;
        } else if (part !== ".") {
          break; // Stop counting once we hit a directory/file name
        }
      }
      return depth;
    }

    function isInAliasedPackage(filename) {
      const relativeFilePath = path.relative(context.getCwd(), filename);
      return ALIASED_PACKAGES_PREFIX.some((prefix) =>
        relativeFilePath.startsWith(prefix + path.sep),
      );
    }

    function getPackageSrcRoot(filename) {
      const relativeFilePath = path.relative(context.getCwd(), filename);
      for (const prefix of ALIASED_PACKAGES_PREFIX) {
        if (relativeFilePath.startsWith(prefix + path.sep)) {
          // Assume alias maps to the 'src' directory within the package
          return path.join(context.getCwd(), prefix, "src");
        }
      }
      return null; // Should not happen if isInAliasedPackage is true
    }

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    const assertNoDeepRelativeImport = (node, importPath) => {
      if (typeof importPath !== "string" || isExternal(importPath)) {
        return; // skip external imports and non-strings
      }

      const fileName = context.getFilename();

      // Only apply this rule within specific packages
      if (!isInAliasedPackage(fileName)) {
        return;
      }

      const relativeDepth = getRelativePathDepth(importPath);

      // Allow './' and '../' but disallow '../../' and deeper
      if (relativeDepth > 1) {
        context.report({
          node,
          message: `Relative import "${importPath}" goes up more than one level. Use "@/..." alias instead.`,
          fix(fixer) {
            try {
              const fileDir = path.dirname(fileName);
              const srcRoot = getPackageSrcRoot(fileName);
              if (!srcRoot) return null; // Cannot determine src root

              const absoluteImportPath = path.resolve(fileDir, importPath);

              // Extract the original extension, if any
              const originalExt = path.extname(importPath);

              // Calculate the path relative to the package's src root
              let relativeToSrc = path.relative(srcRoot, absoluteImportPath);

              // Check if the path is outside the src root.
              // If it starts with '..' or is absolute (e.g., different drive on Windows),
              // the import is resolving outside the intended alias scope.
              if (relativeToSrc.startsWith("..") || path.isAbsolute(relativeToSrc)) {
                console.warn(
                  `Import ${importPath} in ${fileName} resolves outside src root ${srcRoot}. Skipping autofix.`,
                );
                return null; // Don't apply fix if import is outside src
              }

              // If there was no original extension, remove common extensions from the calculated path
              if (!originalExt) {
                relativeToSrc = relativeToSrc.replace(/\.(js|jsx|ts|tsx|mjs|cjs)$/, "");
              }

              // Ensure path uses forward slashes for consistency
              relativeToSrc = relativeToSrc.replace(/\\/g, "/");

              // Re-append the original extension if it existed, otherwise use the potentially extension-less path
              const finalRelativePath = originalExt ? relativeToSrc : relativeToSrc;

              const aliasedPath = `@/${finalRelativePath}`;
              const targetNode = node.type === "CallExpression" ? node.arguments[0] : node.source;
              return fixer.replaceText(targetNode, `'${aliasedPath}'`);
            } catch (e) {
              console.error("Error generating fix for no-deep-relative-imports:", e);
              return null; // Don't apply fix if calculation fails
            }
          },
        });
      }
    };

    return {
      ImportDeclaration: function (node) {
        if (node.importKind === "type") {
          return; // skip type imports
        }
        assertNoDeepRelativeImport(node, node.source.value);
      },

      CallExpression: function (node) {
        // Check for require() calls
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Literal"
        ) {
          assertNoDeepRelativeImport(node, node.arguments[0].value);
        }
        // Optional: Check for dynamic import() expressions
        else if (
          node.callee.type === "Import" && // Check for dynamic import()
          node.arguments.length > 0 &&
          node.arguments[0].type === "Literal"
        ) {
          assertNoDeepRelativeImport(node, node.arguments[0].value);
        }
      },
    };
  },
};
