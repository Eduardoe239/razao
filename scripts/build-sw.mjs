// Gera o service worker com o Workbox (D-033) depois do build do Vite.
// Só guarda os arquivos do próprio build (SEC-05): nada de fora, nenhuma rota de terceiros.
// A versão nova fica esperando e só entra quando a pessoa toca em "Atualizar" ou reabre o app.
import { generateSW } from 'workbox-build';

const { count, size, warnings } = await generateSW({
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,woff2,png,ico,webmanifest}'],
  // A página de medição não faz parte do app: não fica guardada nem é servida pelo service worker.
  globIgnores: ['sw.js', 'medicao/**', 'assets/medicao-*'],
  swDest: 'dist/sw.js',
  mode: 'production',
  sourcemap: false,
  inlineWorkboxRuntime: true,
  skipWaiting: false,
  clientsClaim: false,
  cleanupOutdatedCaches: true,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/medicao\//],
  // Os arquivos de assets/ já têm hash no nome; não precisam de outro controle de versão.
  dontCacheBustURLsMatching: /^assets\//,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  runtimeCaching: [],
});
for (const w of warnings) console.warn(w);
console.log(
  `Service worker gerado: ${String(count)} arquivos, ${(size / 1024).toFixed(0)} KB para uso offline.`,
);
