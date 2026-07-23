import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  test: {
    // Run test files inside server/__tests__/ or any *.test.ts / *.spec.ts
    include: ["server/__tests__/**/*.test.ts", "**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", "dist", "client"],
    environment: "node",
    // Force test-safe cookie settings: isReplit=true on Replit forces secure:true
    // which tough-cookie (supertest) drops on plain HTTP — sessions never persist.
    env: {
      NODE_ENV: "test",
    },
    // Show each individual test name in output
    reporter: "verbose",
    coverage: {
      provider: "v8",
      include: ["server/**/*.ts"],
      exclude: ["server/__tests__", "node_modules"],
    },
  },
});
