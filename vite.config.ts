import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    proxy: {
      // WebSocket transport to socket server
      '/api/socket': {
        target: process.env.SOCKET_SERVER_URL ?? 'http://localhost:3001',
        ws: true,
        changeOrigin: true
      },
      // REST broadcast passthrough (for browser if needed)
      '/api/chat/broadcast': {
        target: process.env.SOCKET_SERVER_URL ?? 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});