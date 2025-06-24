/* eslint-disable */
import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import codegen from "eslint-plugin-codegen";
import _import from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";
import path from "node:path";
import { fileURLToPath } from "node:url";

import enforceReactNamespace from "./scripts/eslint-rules/enforce-react-namespace.mjs";
import noDeepRelativeImports from "./scripts/eslint-rules/no-deep-relative-imports.mjs";
import noRelativeImportOutsidePackage from "./scripts/eslint-rules/no-relative-import-outside-package.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      "**/dist",
      "**/build",
      "**/docs",
      "**/*.md",
      "**/vitest.config.ts",
      "**/setupTests.ts",
      "**/vitest.shared.ts",
      "**/vitest.workspace.ts",
    ],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    plugins: {
      import: fixupPluginRules(_import),
      "react-refresh": reactRefresh,
      "sort-destructure-keys": sortDestructureKeys,
      codegen,
      "simple-import-sort": simpleImportSort,
      react,
      "react-hooks": reactHooks,

      "no-relative-import-outside-package": {
        rules: {
          "no-relative-import-outside-package": noRelativeImportOutsidePackage,
        },
      },

      "enforce-react-namespace": {
        rules: {
          "enforce-react-namespace": enforceReactNamespace,
        },
      },

      "no-deep-relative-imports": {
        rules: {
          "no-deep-relative-imports": noDeepRelativeImports,
        },
      },
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        projectService: {
          allowDefaultProject: [
            "*.js",
            "*.mjs",
            "scripts/*.mjs",
            "scripts/eslint-rules/*.mjs",
            "packages/server/src/lib/worker/worker-loader.mjs",
          ],
        },
        tsconfigRootDir: process.cwd(),
      },
    },

    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },

      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      react: {
        version: "detect",
      },
    },

    rules: {
      "codegen/codegen": "error",
      "no-fallthrough": "off",
      "no-irregular-whitespace": "off",
      "object-shorthand": "error",
      "prefer-destructuring": "off",
      "sort-imports": "off",
      "no-console": "error",

      "no-relative-import-outside-package/no-relative-import-outside-package": "error",

      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='push'] > SpreadElement.arguments",
          message: "Do not use spread arguments in Array.push",
        },
        {
          selector: "ExportDefaultDeclaration",
          message: "Prefer named exports",
        },
        {
          selector:
            "ImportDeclaration[source.value='lucide-react'] ImportSpecifier > Identifier[name!=/Icon$/]",
          message: "Lucide imports must end with 'Icon' (e.g., 'ClockIcon' instead of 'Clock')",
        },
      ],

      "prefer-rest-params": "off",
      "prefer-spread": "off",
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",
      "import/no-unresolved": "off",
      "import/order": "off",
      "simple-import-sort/imports": "off",
      "sort-destructure-keys/sort-destructure-keys": "error",

      "@typescript-eslint/array-type": [
        "warn",
        {
          default: "generic",
          readonly: "generic",
        },
      ],

      "@typescript-eslint/member-delimiter-style": 0,
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/consistent-type-exports": [
        "error",
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
      ],

      // TypeScript - Variables & Usage
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          vars: "all",
          args: "all",
          varsIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
      "no-var": "error",

      // TypeScript - Code Quality
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",

      // TypeScript - Promises & Async
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/return-await": "error",

      // TypeScript - Types & Interfaces
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      "@typescript-eslint/consistent-generic-constructors": "error",

      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/no-meaningless-void-operator": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowNullableEnum: false,
          allowAny: false,
          allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
        },
      ],
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-else-return": "error",
      "no-unreachable": "error",
      "no-use-before-define": "warn",
      "dot-notation": "error",
      eqeqeq: "error",
      "no-lonely-if": "error",
      "no-return-await": "error",
      "no-useless-catch": "error",
      "consistent-return": "warn",
      "no-unneeded-ternary": "error",
      "no-plusplus": "off",
      "no-implicit-coercion": "error",
      "no-shadow": "warn",
      "no-self-compare": "error",

      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/camelcase": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/no-array-constructor": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-namespace": "off",
    },
  },
  {
    files: ["packages/client/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "react/function-component-definition": [
        "warn",
        {
          namedComponents: ["arrow-function"],
          unnamedComponents: "arrow-function",
        },
      ],
      "react/display-name": "error",
      "react/jsx-key": "error",
      "react/jsx-no-comment-textnodes": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-target-blank": "error",
      "react/jsx-no-useless-fragment": "warn",
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/no-children-prop": "off",
      "react/no-danger-with-children": "error",
      "react/no-deprecated": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-find-dom-node": "error",
      "react/no-is-mounted": "error",
      "react/no-render-return-value": "error",
      "react/no-string-refs": "error",
      "react/no-unescaped-entities": "error",
      "react/no-unknown-property": "error",
      "react/no-unsafe": "error",
      "react/require-render-return": "error",
      "react/prop-types": "off",
      "react/no-array-index-key": "warn",
      "react/no-unused-state": "error",
      "react/button-has-type": "error",
      "react/hook-use-state": "error",
      "react/jsx-fragments": ["error", "element"],
      "react/react-in-jsx-scope": "off",
      "react/jsx-curly-brace-presence": "error",
      "react/jsx-boolean-value": "error",
      "react/self-closing-comp": "error",
      "react/no-unstable-nested-components": "error",

      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "enforce-react-namespace/enforce-react-namespace": "error",
      "no-deep-relative-imports/no-deep-relative-imports": "error",
    },
  },
  {
    files: ["packages/server/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-deep-relative-imports/no-deep-relative-imports": "error",
    },
  },
  {
    files: ["packages/{domain,database}/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
