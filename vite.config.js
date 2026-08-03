import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: '/' подходит для Vercel (сайт живёт в корне домена).
// Если понадобится вернуться на GitHub Pages, где адрес вида
// skid96.github.io/my-hub/, тут нужно будет поставить '/my-hub/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
