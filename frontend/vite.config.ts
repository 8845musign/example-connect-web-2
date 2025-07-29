import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 5173,
    proxy: {
      '/chat.v1.ChatService': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
});
