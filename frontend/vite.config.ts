/// <reference types="vitest" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    !process.env.VITEST && reactRouter(),
    react()
  ].filter(Boolean),
  server: {
    port: 5173,
    proxy: {
      '/chat.v1.ChatService': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    includeSource: ['src/**/*.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.react-router', 'src/gen/**/*']
  },
  define: {
    'import.meta.vitest': 'undefined',
  }
});
