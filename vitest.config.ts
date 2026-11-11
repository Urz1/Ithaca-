import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    exclude: [
      "e2e/**",
      "node_modules/**",
      "src/test/integration/**",
      "eval/**",
    ],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"],
      include: ["src/lib/**/*.ts", "src/modules/**/*.ts"],
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        "src/lib/graph-export.ts",
        "src/lib/api/openalex-provider.ts",
        "src/lib/api/citation-classifier.ts",
        "src/lib/api/llm-router.ts",
        "src/lib/api/semantic-scholar-client.ts",
        "src/modules/jobs/handlers/**",
      ],
      thresholds: {
        lines: 50,
        functions: 40,
        branches: 35,
        statements: 50,
      },
    },
  },
});
