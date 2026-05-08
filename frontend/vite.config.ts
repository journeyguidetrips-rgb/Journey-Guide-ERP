// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ✅ Match your backend PORT
        changeOrigin: true,
        secure: false,
        // Optional: Add timeout for slow queries
        configure: (proxy, options) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            console.log('Sending Request to the Target:', proxyReq.getHeader('x-forwarded-for'));
          });
          proxy.on('proxyRes', (proxyRes) => {
            console.log('Received Response from the Target:', proxyRes.statusCode);
          });
        },
      },
    },
  },
})