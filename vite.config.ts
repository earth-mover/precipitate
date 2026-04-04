import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"
import { cloudflare } from "@cloudflare/vite-plugin"

export default defineConfig({
  build: {
    target: "esnext",
  },
  plugins: [cloudflare(), react(), tailwindcss(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@earthmover/icechunk", "@earthmover/icechunk-wasm32-wasi"],
    include: ["@earthmover/icechunk > @earthmover/icechunk/fetch-storage"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
})
