import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: {
    exclude: ['faiss-node'],
  },
  server: {
    fs: {
      allow: ['vue_docs_index', '.'],
    },
    proxy: {
      // Redirige les requêtes embeddings vers embed
      '/api/embeddings': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/embeddings/, '/api/embed'),
      },
      // Redirige les requêtes chat vers generate
      '/api/chat': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, '/api/generate'),
      },
      // Proxy général pour tout le reste de l'API Ollama
      '/api': {
        target: 'http://localhost:11434',
        changeOrigin: true,
      },
    },
  }
})
