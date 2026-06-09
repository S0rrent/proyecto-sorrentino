import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.js", "db-adapter.js", "hooks.js", "telemetry.js"],
    },
  },
});
