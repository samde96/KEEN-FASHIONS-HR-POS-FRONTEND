import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, getProducts, login, logout, requestJson } from '../services/api';
import {
  clearOfflineSession,
  configureOfflineApi,
  markConnected,
  offlineStore,
  readOfflineUser,
} from '../services/offline';
import { testProducts, testUser } from './fixtures';

const json = (value: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

function online() {
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    if (path === '/api/v1/me' || path === '/api/v1/auth/login') return json(testUser);
    if (path === '/api/v1/auth/csrf')
      return json({ token: 'offline-test-csrf', headerName: 'X-XSRF-TOKEN' });
    if (path === '/api/v1/catalog/products') return json(testProducts);
    if (path.startsWith('/api/v1/mpesa')) return json({ enabled: true, state: 'PENDING' });
    return json([]);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function disconnected() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
}

describe('Offline API snapshots and session isolation', () => {
  beforeEach(async () => {
    configureOfflineApi('offline-tests');
    await clearOfflineSession();
    localStorage.clear();
    markConnected();
    document.cookie = 'XSRF-TOKEN=offline-test-csrf; path=/';
    online();
  });
  afterEach(async () => {
    await clearOfflineSession();
    localStorage.clear();
    markConnected();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('restores the last verified user and fetched products when the network fails', async () => {
    await getCurrentUser();
    await getProducts();
    disconnected();
    expect(await getCurrentUser()).toEqual(testUser);
    expect(await getProducts()).toEqual(testProducts);
    expect(offlineStore.getSnapshot().connected).toBe(false);
    expect(offlineStore.getSnapshot().cachedAt).not.toBeNull();
  });

  it('does not reuse snapshots after another user or different permissions are verified', async () => {
    await getCurrentUser();
    await getProducts();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ ...testUser, userId: 'other-user' })),
    );
    await getCurrentUser();
    disconnected();
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ ...testUser, permissionCodes: ['pos:sell'], roleKeys: ['CASHIER'] })),
    );
    await getCurrentUser();
    disconnected();
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
  });

  it('requires a connection for uncached data and all write confirmations', async () => {
    await getCurrentUser();
    disconnected();
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
    await expect(
      requestJson('/api/v1/branches', {
        method: 'POST',
        body: JSON.stringify({ name: 'Offline shop' }),
      }),
    ).rejects.toThrow('could not confirm this change');
  });

  it('never replays cached M-Pesa status or treats HTTP validation errors as offline success', async () => {
    await getCurrentUser();
    await getProducts();
    await requestJson('/api/v1/mpesa/config');
    disconnected();
    await expect(requestJson('/api/v1/mpesa/config')).rejects.toThrow('not saved for offline use');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({ detail: 'Access denied' }, 403)),
    );
    await expect(getProducts()).rejects.toThrow('Access denied');
    disconnected();
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
  });

  it.each([401, 403])(
    'purges saved business data on a server identity %i and prevents cached-session recovery',
    async (status) => {
      await getCurrentUser();
      await getProducts();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => json({ detail: 'Session expired' }, status)),
      );
      await expect(getCurrentUser()).rejects.toThrow('Session expired');
      disconnected();
      await expect(getCurrentUser()).rejects.toThrow('Sign in online');
      expect(await readOfflineUser()).toBeUndefined();
    },
  );

  it('keeps local access locked after offline logout until an explicit online sign-in', async () => {
    await getCurrentUser();
    await getProducts();
    disconnected();
    await expect(logout()).rejects.toThrow('could not confirm this change');
    await expect(getCurrentUser()).rejects.toThrow('Sign in online');
    online();
    await login({ username: testUser.email, password: 'mock-test-password', rememberDevice: true });
    expect(await getCurrentUser()).toEqual(testUser);
    disconnected();
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
  });

  it('expires business snapshots and offline session access after 24 hours', async () => {
    await getCurrentUser();
    await getProducts();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 24 * 60 * 60 * 1000 + 1);
    disconnected();
    await expect(getCurrentUser()).rejects.toThrow('not saved for offline use');
    await expect(getProducts()).rejects.toThrow('not saved for offline use');
  });
});
