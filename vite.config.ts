import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [tsConfigPaths(), tanstackStart({ target: "vercel" })],
});
