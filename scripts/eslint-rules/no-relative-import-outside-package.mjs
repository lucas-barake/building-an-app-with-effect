/* eslint-disable */
/**
 * @fileoverview prevent relative imports above the nearest package.json
 */

import path from "path";
import { readPackageUpSync } from "read-package-up";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export default {
  meta: {
    docs: {
      description: "prevent relative imports above the nearest package.json",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
  },

  create: function (context) {
    const packagePaths = {};

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

    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    const assertNoRelativeImportPath = (importPath) => {
      if (isExternal(importPath)) {
        // skip external imports b/c they're not reaching into other monorepo packages
        return null;
      }

      const importBase = path.dirname(importPath);
      if (importBase === ".") {
        // skip imports relative to the current file b/c they're in our module
        return null;
      }

      if (!/^\./.test(importBase)) {
        return null;
      }

      const fileName = context.getFilename();
      const fileDir = path.dirname(fileName);
      const importDir = path.resolve(fileDir, importBase);

      const fileBasePath = path.dirname(fileName);

      if (!packagePaths[fileBasePath]) {
        const packageInfo = (packagePaths[fileBasePath] = {});

        // should only call this if the current filename path doesn't include a previously found package
        const nearestPkg = readPackageUpSync({
          cwd: fileName,
          normalize: false,
        });

        packageInfo.path = path.dirname(nearestPkg.path);
        packageInfo.name = nearestPkg.packageJson.name;
      }

      const packageInfo = packagePaths[fileBasePath];
      if (importDir.includes(packageInfo.path) === false) {
        return packageInfo.name;
      }

      return null;
    };

    return {
      ImportDeclaration: function (node) {
        if (node.importKind === "type") {
          return;
        }

        const importPath = node.source.value;
        const failPackage = assertNoRelativeImportPath(importPath);
        if (failPackage) {
          context.report({
            node,
            message: `Import of "${importPath}" reaches outside of the package "${failPackage}". Use absolute imports with the @org namespace instead.`,
            fix(fixer) {
              // Extract the package name from the relative path
              const parts = importPath.split("/");
              let packageName = "";
              for (let i = 0; i < parts.length; i++) {
                if (parts[i] === "..") continue;
                packageName = parts[i];
                break;
              }

              if (packageName) {
                // Create the absolute import path
                // Remove /src/ directory and file extensions
                let absolutePath = importPath.replace(/(?:\.\.\/)+.*?\//, `@org/${packageName}/`);
                // Remove /src/ directory if present
                absolutePath = absolutePath.replace(/\/src\//, "/");
                // Remove file extension
                absolutePath = absolutePath.replace(/\.(js|jsx|ts|tsx)$/, "");
                return fixer.replaceText(node.source, `'${absolutePath}'`);
              }
              return null;
            },
          });
        }
      },

      CallExpression: function (node) {
        if (node.callee.name === "require") {
          const [requirePath] = node.arguments;
          if (!requirePath) return;
          const failPackage = assertNoRelativeImportPath(requirePath.value);
          if (failPackage) {
            context.report({
              node,
              message: `Require of "${requirePath.value}" reaches outside of the package "${failPackage}". Use absolute imports with the @org namespace instead.`,
              fix(fixer) {
                // Extract the package name from the relative path
                const parts = requirePath.value.split("/");
                let packageName = "";
                for (let i = 0; i < parts.length; i++) {
                  if (parts[i] === "..") continue;
                  packageName = parts[i];
                  break;
                }

                if (packageName) {
                  // Create the absolute import path
                  // Remove /src/ directory and file extensions
                  let absolutePath = requirePath.value.replace(
                    /(?:\.\.\/)+.*?\//,
                    `@org/${packageName}/`,
                  );
                  // Remove /src/ directory if present
                  absolutePath = absolutePath.replace(/\/src\//, "/");
                  // Remove file extension
                  absolutePath = absolutePath.replace(/\.(js|jsx|ts|tsx)$/, "");
                  return fixer.replaceText(requirePath, `'${absolutePath}'`);
                }
                return null;
              },
            });
          }
        }
      },
    };
  },
};
