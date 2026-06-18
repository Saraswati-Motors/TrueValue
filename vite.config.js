import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['saraswati.png', 'favicon.ico'],
      manifest: {
        name: 'Saraswati Motors TrueValue Portal',
        short_name: 'TrueValue Admin',
        description: 'Internal Employee Portal for TrueValue Inventory & Sales Management.',
        theme_color: '#0e158d',
        background_color: '#f9f9f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'saraswati.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'saraswati.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'saraswati.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    sourcemap: false
  }
})
