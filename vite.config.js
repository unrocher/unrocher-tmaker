import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon-v2.png',
        'icons/icon-192-v2.png',
        'icons/icon-512-v2.png',
        'icons/icon-512-maskable-v2.png',
      ],
      manifest: {
        name: 'アンロシェカスタムTメーカー',
        short_name: 'Tメーカー',
        description: 'アンロシェカスタムTメーカー',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192-v2.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable-v2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})