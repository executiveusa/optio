import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // componentTagger() disabled — scans filesystem on every transform (too slow on Windows)
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@chenglou/pretext": path.resolve(__dirname, "./synthia-pretext/dist/layout.js"),
      "@chenglou/pretext/rich-inline": path.resolve(__dirname, "./synthia-pretext/dist/rich-inline.js"),
    },
  },
  optimizeDeps: {
    // Only scan src/ — avoids picking up ext-apps/ examples which have unresolved deps
    entries: ["src/**/*.{ts,tsx,js,jsx}"],
  },
}));
