import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'DUEB App',
        short_name: 'DUEB App',
        description:
          'Offline-Erfassung von Beobachtungsbögen und Patientenprofilen im Katastrophenschutz.',
        lang: 'de',
        theme_color: '#0d1b2a',
        background_color: '#0d1b2a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Diese Pfade gehören dem Backend (Single-Origin-Deployment) und dürfen
        // NICHT vom SW mit der PWA-Shell überlagert werden.
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/admin(?:\/|$)/,
          /^\/django-admin/,
          /^\/_nested_admin/,
          /^\/static/,
          /^\/media/,
        ],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],

      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
