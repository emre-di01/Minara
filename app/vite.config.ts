import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service Worker auch für nicht-root Routen aktivieren
      scope: '/',
      manifest: {
        name: 'Minara',
        short_name: 'Minara',
        description: 'Digital Signage für Moscheen',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'fullscreen',
        start_url: '/tv',
      },
      workbox: {
        // App-Shell (JS, CSS, HTML, Fonts) — stale-while-revalidate
        globPatterns: ['**/*.{js,css,html,woff2,woff,ttf,eot}'],
        // Nicht gecachte URLs nicht als "offline-fähig" markieren
        navigateFallback: null,
        runtimeCaching: [
          {
            // Supabase Storage Medien (Bilder, Videos) — 30 Tage
            urlPattern: /https:\/\/mosque-api\.401dev\.de\/storage\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'minara-media',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // alquran.cloud Ayahs — 7 Tage
            urlPattern: /https:\/\/api\.alquran\.cloud\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'minara-quran',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Meteo Wetter — NetworkFirst, 3h Fallback
            urlPattern: /https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'minara-weather',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 3 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Open-Meteo Geocoding (Stadt → Koordinaten) — 7 Tage
            urlPattern: /https:\/\/geocoding-api\.open-meteo\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'minara-geo',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // rss2json — NetworkFirst, 24h Fallback
            urlPattern: /https:\/\/api\.rss2json\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'minara-rss',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // AwqatSalah Gebetszeiten — 24h
            urlPattern: /https:\/\/mosque-api\.401dev\.de\/awqat\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'minara-prayer',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Wikipedia Stadtfotos (cinematic Wetter) — 7 Tage
            urlPattern: /https:\/\/.*\.wikipedia\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'minara-wiki',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5178,
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54341',
        rewrite: path => path.replace(/^\/supabase/, ''),
        changeOrigin: true,
        ws: true,
      },
      '/awqat': {
        target: 'http://127.0.0.1:8082',
        rewrite: path => path.replace(/^\/awqat/, ''),
        changeOrigin: true,
      },
    },
  },
})
