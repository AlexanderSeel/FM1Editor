import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function deploymentBase(): string {
  const configured = process.env.FM1_BASE_PATH?.trim()
  if (!configured || configured === '/') return '/'
  return `/${configured.replace(/^\/+|\/+$/g, '')}/`
}

export default defineConfig({
  base: deploymentBase(),
  plugins: [react(), tailwindcss()],
})
