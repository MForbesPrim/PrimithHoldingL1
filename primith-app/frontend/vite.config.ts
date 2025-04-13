import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
 
export default defineConfig({
  build: {
    outDir: 'build',  // Change output directory to 'build'
  },
  optimizeDeps: {
    include: ['papaparse']
  },
  plugins: [react(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})