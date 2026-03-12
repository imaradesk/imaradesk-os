import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({ jsxRuntime: 'classic' })
  ],
  root: './',
  // Use dev origin in dev, but serve from Django static in production
  base: mode === 'production' ? '/static/' : 'http://localhost:5173/',
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
    cors: true,
    watch: { usePolling: true, disableGlobbing: false },
  },
  resolve: { extensions: ['.js', '.json', '.jsx'] },
  build: {
    outDir: resolve('./dist'),
    assetsDir: 'assets',
    emptyOutDir: true,
    target: 'es2015',
    cssCodeSplit: false,
    rollupOptions: {
      input: { main: resolve('./src/main.jsx') },
      output: {
        // Produce stable filenames so template can reference them
        entryFileNames: 'assets/main.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/main.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
}))
