import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base должен совпадать с названием репозитория на GitHub Pages,
// например если репозиторий называется "my-hub", оставь '/my-hub/'
export default defineConfig({
  plugins: [react()],
  base: '/my-hub/',
})
