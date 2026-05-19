import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/wholesale/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "src/setupTests.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
