import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    testTimeout: 120_000,
  },
  plugins: [tsConfigPaths()],
});
