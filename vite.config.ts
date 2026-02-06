import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const reactPath = path.resolve(__dirname, 'node_modules/react')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'preact/hooks': reactPath,
      preact: reactPath,
    },
  },
})
