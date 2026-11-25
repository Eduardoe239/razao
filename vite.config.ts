import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Configuração do build do app. Nada aqui carrega recurso de terceiros em tempo de execução (SEC-03).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Fontes e ícones viram arquivos próprios com hash, nunca links externos.
    assetsInlineLimit: 0,
  },
});
