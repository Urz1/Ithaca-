import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/test/integration/**/*.integration.test.ts"],
    exclude: ["node_modules/**"],
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/integration/setup.ts"],
    globalSetup: ["./src/test/integration/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
