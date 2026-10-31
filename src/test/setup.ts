import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeEach } from 'vitest';
import { configure } from '@testing-library/dom';
import { clearOfflineSession, markConnected } from '../services/offline';
import { deviceDatabase } from '../services/deviceStore';

Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
configure({ asyncUtilTimeout: 5000 });
beforeEach(async () => {
  await clearOfflineSession();
  localStorage.clear();
  markConnected();
  const db = await deviceDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['devices', 'accounts', 'archive'], 'readwrite');
    tx.objectStore('devices').clear();
    tx.objectStore('accounts').clear();
    tx.objectStore('archive').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('keen-offline-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'key' });
    request.onsuccess = () => {
      const tx = request.result.transaction('records', 'readwrite');
      tx.objectStore('records').clear();
      tx.oncomplete = () => {
        request.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
});

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 800,
            height: 320,
            x: 0,
            y: 0,
            top: 0,
            right: 800,
            bottom: 320,
            left: 0,
            toJSON: () => undefined,
          },
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {}

  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  value: 800,
});

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  value: 320,
});
