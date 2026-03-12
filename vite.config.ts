import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    },
    manifest: {
      name: 'Punch Card & Voice Assistant',
      short_name: 'Punch',
      description: 'Super fast punch card tracker',
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
    }
  }), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})