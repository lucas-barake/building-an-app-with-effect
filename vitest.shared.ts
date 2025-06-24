import * as path from "node:path";
import type { ViteUserConfig } from "vitest/config";

const alias = (name: string) => {
  const target = process.env.TEST_DIST !== undefined ? "dist/dist/esm" : "src";
  const scopedName = `@org/${name}`;
  return {
    [`${scopedName}/test`]: path.join(__dirname, "packages", name, "test"),
    [`${scopedName}`]: path.join(__dirname, "packages", name, target),
  };
};

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: ViteUserConfig = {
  esbuild: {
    target: "es2020",
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"],
  },
  test: {
    onConsoleLog: (log) => {
      console.log(log);
    },
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined,
    },
    sequence: {
      concurrent: true,
    },
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    alias: {
      ...alias("cli"),
      ...alias("domain"),
      ...alias("server"),
    },
  },
};

export default config;
