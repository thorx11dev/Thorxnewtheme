import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run test files inside server/__tests__/ or any *.test.ts / *.spec.ts
    include: ["server/__tests__/**/*.test.ts", "**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", "dist", "client"],
    environment: "node",
    // Show each individual test name in output
    reporter: "verbose",
    coverage: {
      provider: "v8",
      include: ["server/**/*.ts"],
      exclude: ["server/__tests__", "node_modules"],
    },
  },
});
