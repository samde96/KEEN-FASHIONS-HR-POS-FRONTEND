import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as {
  version?: string;
};

function devServiceWorkerCleanupPlugin() {
  const workerCleanupScript = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => caches.keys())
      .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url)))),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
`;

  const registrationCleanupScript = `
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => {
      if (!('caches' in window)) {
        return undefined;
      }

      return caches.keys().then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))));
    })
    .then(() => {
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    })
    .catch((error) => console.warn('Unable to clean development service worker', error));
}
`;

  return {
    name: 'stylepos-dev-service-worker-cleanup',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (middleware: Function) => void } }) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url?.split('?')[0];

        if (pathname === '/sw.js') {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(workerCleanupScript);
          return;
        }

        if (pathname === '/registerSW.js') {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(registrationCleanupScript);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const isDevServer = command === 'serve';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
    },
    plugins: [
      react(),
      devServiceWorkerCleanupPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        selfDestroying: isDevServer,
        devOptions: {
          enabled: isDevServer,
          suppressWarnings: true,
        },
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'KEEN Fashion POS',
          short_name: 'KEEN POS',
          description: 'Multi-branch fashion POS and inventory workspace',
          theme_color: '#0f766e',
          background_color: '#f7f8f5',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/favicon.svg',
              sizes: '64x64',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,svg,webp,ico}'],
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
            forms: ['@hookform/resolvers', 'react-hook-form', 'zod'],
            query: ['@tanstack/react-query'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      exclude: [...configDefaults.exclude, 'e2e/**', 'playwright-report/**'],
      css: true,
    },
  };
});
