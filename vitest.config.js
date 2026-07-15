import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // El plugin PWA (que provee este módulo virtual) no corre en tests.
      "virtual:pwa-register/react": fileURLToPath(new URL("./tests/stubs/pwa-register.js", import.meta.url)),
    },
  },
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
