import { defineConfig } from "vitest/config";
import path from "node:path";

// Tests use an isolated SQLite database and the deterministic mock LLM provider,
// so the suite runs with zero API keys and never touches the dev database.
const TEST_DB = "file:/tmp/internpilot-test.db";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    globalSetup: ["./tests/global-setup.ts"],
    // DB-backed tests share one SQLite file; run serially to avoid write races.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DB,
      LLM_PROVIDER: "mock",
      ENCRYPTION_KEY: "test-encryption-key-deterministic",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
