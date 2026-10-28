import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Necessário para carregamento de assets via protocolo file:// no Electron / .exe
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    strictPort: true
  }
});
