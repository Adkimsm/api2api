import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: { outDir: "dist/admin", emptyOutDir: true },
});
