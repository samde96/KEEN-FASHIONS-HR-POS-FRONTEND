import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getCurrentUser, login, requestJson } from '../services/api';
import { configureOfflineApi, offlineStore, clearOfflineSession } from '../services/offline';
import { testUser } from './fixtures';

const json = (value: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
  );

function stalledFetch() {
  const fetch = vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) throw new Error('A session request must have an abort signal');
        const abort = () => reject(signal.reason);
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
      }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  configureOfflineApi('session-startup-tests');
  document.cookie = 'XSRF-TOKEN=session-test-csrf; path=/';
});

afterEach(async () => {
  await clearOfflineSession();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('ends a stalled session check at its deadline without retrying', async () => {
  const fetch = stalledFetch();
  await expect(getCurrentUser({ timeoutMs: 20 })).rejects.toThrow('not saved for offline use');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('retains saved offline session recovery when a session check times out', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => json(testUser)),
  );
  await getCurrentUser();
  stalledFetch();
  expect(await getCurrentUser({ timeoutMs: 20 })).toEqual(testUser);
  expect(offlineStore.getSnapshot().connected).toBe(false);
});

it('cancels a session request without marking the connection offline', async () => {
  stalledFetch();
  const controller = new AbortController();
  const pending = getCurrentUser({ signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(offlineStore.getSnapshot().connected).toBe(true);
});

it('finishes sign-in without another CSRF request and obtains the rotated token on the next write', async () => {
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path.endsWith('/api/v1/auth/login')) {
      document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      return json(testUser);
    }
    if (path.endsWith('/api/v1/auth/csrf'))
      return json({ token: 'rotated-csrf', headerName: 'X-XSRF-TOKEN' });
    if (path.endsWith('/api/v1/customers')) {
      expect(init?.headers).toMatchObject({ 'X-XSRF-TOKEN': 'rotated-csrf' });
      return json({ id: 'customer' });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal('fetch', fetch);
  expect(
    await login({ username: testUser.email, password: 'test-password', rememberDevice: false }),
  ).toEqual(testUser);
  expect(fetch).toHaveBeenCalledTimes(1);
  await requestJson('/api/v1/customers', { method: 'POST', body: '{}' });
  expect(fetch).toHaveBeenCalledTimes(3);
});
