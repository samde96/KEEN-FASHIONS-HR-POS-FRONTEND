export const devServiceWorkerClearedKey = 'keen-dev-service-worker-cleared-v2';

export async function clearDevelopmentServiceWorkers() {
  if (!import.meta.env.DEV) {
    return false;
  }

  let clearedState = false;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    clearedState = registrations.length > 0 || Boolean(navigator.serviceWorker.controller);

    if (registrations.length > 0) {
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    clearedState = clearedState || cacheNames.length > 0;

    if (cacheNames.length > 0) {
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  }

  return clearedState;
}
