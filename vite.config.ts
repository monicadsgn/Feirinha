import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Feirinha',
        short_name: 'Feirinha',
        description: 'Despensa, lista e calculadora da feira do mês',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#faf5ec',
        theme_color: '#2f6b4f',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        share_target: {
          action: './',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        shortcuts: [
          { name: 'Receitas', short_name: 'Receitas', url: './?tela=receitas' },
          { name: 'Acabou algo', short_name: 'Acabou', url: './?acao=acabou' },
          { name: 'Adicionar à lista', short_name: 'Adicionar', url: './?acao=adicionar' },
          { name: 'Modo Mercado', short_name: 'Mercado', url: './?tela=mercado' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
