import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Build para publicar como página única (artifact da Claude ou qualquer
 * hospedagem estática simples): caminhos relativos, sem divisão de código e
 * sem service worker. O script scripts/pagina-unica.py embute JS, CSS e fontes no HTML.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_SEM_SW': JSON.stringify('1') },
  build: {
    outDir: 'dist-publicar',
    assetsInlineLimit: 0,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
