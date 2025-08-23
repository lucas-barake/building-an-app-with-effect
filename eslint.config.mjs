import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import process from "node:process";

import enforceReactNamespace from "./scripts/eslint-rules/enforce-react-namespace.mjs";
import noDeepRelativeImports from "./scripts/eslint-rules/no-deep-relative-imports.mjs";
import noRelativeImportOutsidePackage from "./scripts/eslint-rules/no-relative-import-outside-package.mjs";

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
      "infrastructure/cdk/**",
      "packages/server/.dependency-cruiser.cjs",
      "biome.json",
      "scripts/ts-plugin/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "eslint.config.mjs"],
        },
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
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
    rules: {
      // TypeScript safety rules that Biome can't handle
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/no-unnecessary-condition": "error",
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
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/no-explicit-any": "warn",

      // Custom import rules
      "no-relative-import-outside-package/no-relative-import-outside-package": "error",
      "enforce-react-namespace/enforce-react-namespace": "error",
      "no-deep-relative-imports/no-deep-relative-imports": "error",
    },
  },
];
