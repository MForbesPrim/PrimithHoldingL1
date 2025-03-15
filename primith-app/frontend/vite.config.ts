import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Basic React dependencies
          if (id.includes('react/') || id.includes('react-dom/') || id.includes('react-router-dom/')) {
            return 'vendor-react';
          }
          
          // TipTap editor chunks
          if (id.includes('@tiptap/')) {
            return 'vendor-tiptap';
          }

          // Radix UI - split into smaller chunks
          if (id.includes('@radix-ui/')) {
            if (id.includes('dialog') || id.includes('popover') || id.includes('menu')) {
              return 'radix-overlays';
            }
            if (id.includes('avatar') || id.includes('progress') || id.includes('scroll')) {
              return 'radix-display';
            }
            return 'radix-base';
          }

          // Split clerk auth separately
          if (id.includes('@clerk/')) {
            return 'vendor-auth';
          }

          // Charts and data visualization
          if (id.includes('recharts/')) {
            return 'vendor-charts';
          }

          // UI utilities
          if (id.includes('lucide-react') || id.includes('date-fns')) {
            return 'vendor-ui-utils';
          }

          // Data management
          if (id.includes('@tanstack/') || id.includes('axios')) {
            return 'vendor-data';
          }

          // Default chunk
          return null;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    target: 'esnext'
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})