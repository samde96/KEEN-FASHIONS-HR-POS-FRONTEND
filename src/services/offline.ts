import type { CurrentUser } from '../data/types';

const storagePrefix = 'keen:offline:v1:';
const maxSnapshotAge = 24 * 60 * 60 * 1000;
const maxCachedRecords = 200;
let namespace = 'same-origin';
let identity: CurrentUser | null = null;
let authEpoch = 0;
let database: Promise<IDBDatabase> | undefined;

export type OfflineState = {
  connected: boolean;
  cachedAt: number | null;
  storageAvailable: boolean;
};
let state: OfflineState = {
  connected: typeof navigator === 'undefined' || navigator.onLine !== false,
  cachedAt: null,
  storageAvailable: true,
};
const listeners = new Set<() => void>();

export class OfflineError extends Error {
  constructor(
    message = 'Connection unavailable. Reconnect before submitting changes. Your draft can stay on this device.',
  ) {
    super(message);
    this.name = 'OfflineError';
  }
}

export function isOfflineError(error: unknown): error is OfflineError {
  return error instanceof OfflineError;
}

function publish(next: Partial<OfflineState>) {
  if (Object.entries(next).every(([key, value]) => state[key as keyof OfflineState] === value))
    return;
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const offlineStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
};

export function markOffline() {
  publish({ connected: false });
}
export function markConnected() {
  publish({ connected: true, cachedAt: null });
}
export function markOfflineStorageUnavailable() {
  publish({ storageAvailable: false });
}

export function configureOfflineApi(baseUrl: string) {
  namespace = baseUrl || 'same-origin';
}

function keyFor(key: string) {
  return `${namespace}:${key}`;
}

function openDatabase() {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is unavailable'));
        return;
      }
      const request = indexedDB.open('keen-offline-v1', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('records', { keyPath: 'key' });
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        database = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        database = undefined;
        reject(new Error('Offline storage is busy'));
      };
    });
  }
  return database;
}

async function useStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction('records', mode);
    const request = action(transaction.objectStore('records'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Offline storage update was aborted'));
  });
}

export async function readOfflineValue<T>(key: string): Promise<T | undefined> {
  const fullKey = keyFor(key);
  // A fallback value can be newer than an older IndexedDB record after a failed
  // database write. Prefer it until a successful database write removes it.
  try {
    const fallback = localStorage.getItem(storagePrefix + fullKey);
    if (fallback !== null) return JSON.parse(fallback) as T;
  } catch {
    /* IndexedDB can remain available when local storage is restricted. */
  }
  try {
    const record = await useStore<{ key: string; value: T } | undefined>('readonly', (store) =>
      store.get(fullKey),
    );
    if (record) return record.value;
  } catch {
    /* Use local storage on browsers where IndexedDB is unavailable. */
  }
  return undefined;
}

export async function writeOfflineValue<T>(key: string, value: T): Promise<boolean> {
  const fullKey = keyFor(key);
  try {
    await useStore('readwrite', (store) => store.put({ key: fullKey, value }));
    try {
      localStorage.removeItem(storagePrefix + fullKey);
    } catch {
      /* Database write is durable. */
    }
    return true;
  } catch {
    /* A bounded local-storage fallback also supports restricted browsers. */
  }
  try {
    localStorage.setItem(storagePrefix + fullKey, JSON.stringify(value));
    return true;
  } catch {
    publish({ storageAvailable: false });
    return false;
  }
}

export async function removeOfflineValue(key: string) {
  const fullKey = keyFor(key);
  try {
    await useStore('readwrite', (store) => store.delete(fullKey));
  } catch {
    /* Try fallback too. */
  }
  try {
    localStorage.removeItem(storagePrefix + fullKey);
  } catch {
    publish({ storageAvailable: false });
  }
}

async function storedKeys(): Promise<string[]> {
  const keys = new Set<string>();
  try {
    (await useStore('readonly', (store) => store.getAllKeys())).forEach((key) => {
      if (typeof key === 'string' && key.startsWith(`${namespace}:`))
        keys.add(key.slice(namespace.length + 1));
    });
  } catch {
    /* Include fallback records below. */
  }
  try {
    const prefix = storagePrefix + `${namespace}:`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) keys.add(key.slice(prefix.length));
    }
  } catch {
    publish({ storageAvailable: false });
  }
  return [...keys];
}

function scopeFor(user: CurrentUser) {
  return JSON.stringify([
    user.organizationId,
    user.userId,
    [...user.branchIds].sort(),
    [...user.roleKeys].sort(),
    [...user.permissionCodes].sort(),
  ]);
}

export function offlineOwnerKey(user: CurrentUser) {
  return encodeURIComponent(`${namespace}:${user.organizationId}:${user.userId}`);
}

export const getOfflineAuthEpoch = () => authEpoch;
export const getOfflineScope = () => (identity ? scopeFor(identity) : undefined);

export function isOfflineAccessLocked() {
  try {
    return localStorage.getItem(storagePrefix + keyFor('signed-out')) === 'true';
  } catch {
    return false;
  }
}

export async function rememberOfflineUser(user: CurrentUser, epoch = authEpoch) {
  if (epoch !== authEpoch || isOfflineAccessLocked()) return;
  identity = user;
  await writeOfflineValue('session', { user, savedAt: Date.now() });
}

export async function unlockOfflineAccess(user: CurrentUser) {
  authEpoch += 1;
  try {
    localStorage.removeItem(storagePrefix + keyFor('signed-out'));
  } catch {
    publish({ storageAvailable: false });
  }
  await rememberOfflineUser(user);
}

export async function readOfflineUser() {
  if (isOfflineAccessLocked()) return undefined;
  const session = await readOfflineValue<{ user: CurrentUser; savedAt: number }>('session');
  if (
    !session ||
    !Number.isFinite(session.savedAt) ||
    Date.now() - session.savedAt > maxSnapshotAge
  )
    return undefined;
  const user = session.user;
  if (
    !user?.userId ||
    !user.organizationId ||
    !Array.isArray(user.permissionCodes) ||
    !Array.isArray(user.roleKeys) ||
    !Array.isArray(user.branchIds)
  )
    return undefined;
  identity = user;
  publish({ connected: false, cachedAt: session.savedAt });
  return user;
}

export async function clearOfflineSession() {
  authEpoch += 1;
  identity = null;
  try {
    localStorage.setItem(storagePrefix + keyFor('signed-out'), 'true');
  } catch {
    publish({ storageAvailable: false });
  }
  // Session and cached business reads are purged. Unsubmitted user-scoped drafts
  // are retained so explicit sign-in can recover work after an offline sign-out.
  const keys = await storedKeys();
  await Promise.all(
    keys.filter((key) => key === 'session' || key.startsWith('cache:')).map(removeOfflineValue),
  );
  publish({ cachedAt: null });
}

export function canCacheOfflinePath(path: string) {
  return (
    path.startsWith('/api/v1/') &&
    !/^\/api\/v1\/(?:auth(?:\/|$)|mpesa(?:\/|$)|me(?:\?|$))/.test(path)
  );
}

type CachedRecord<T> = { data: T; savedAt: number };
function cacheKey(scope: string, path: string) {
  return `cache:${scope}:${path}`;
}

export async function cacheOfflineResponse<T>(scope: string | undefined, path: string, data: T) {
  if (
    !scope ||
    scope !== getOfflineScope() ||
    !canCacheOfflinePath(path) ||
    isOfflineAccessLocked()
  )
    return;
  await writeOfflineValue(cacheKey(scope, path), { data, savedAt: Date.now() });
  const keys = (await storedKeys()).filter((key) => key.startsWith('cache:'));
  if (keys.length <= maxCachedRecords) return;
  const entries = await Promise.all(
    keys.map(async (key) => ({ key, record: await readOfflineValue<CachedRecord<unknown>>(key) })),
  );
  entries.sort((a, b) => (b.record?.savedAt ?? 0) - (a.record?.savedAt ?? 0));
  await Promise.all(entries.slice(maxCachedRecords).map((entry) => removeOfflineValue(entry.key)));
}

export async function readOfflineResponse<T>(
  scope: string | undefined,
  path: string,
): Promise<CachedRecord<T> | undefined> {
  if (
    !scope ||
    scope !== getOfflineScope() ||
    !canCacheOfflinePath(path) ||
    isOfflineAccessLocked()
  )
    return undefined;
  const record = await readOfflineValue<CachedRecord<T>>(cacheKey(scope, path));
  if (!record || !Number.isFinite(record.savedAt) || Date.now() - record.savedAt > maxSnapshotAge)
    return undefined;
  publish({
    connected: false,
    cachedAt: state.cachedAt ? Math.min(state.cachedAt, record.savedAt) : record.savedAt,
  });
  return record;
}

export async function removeOfflineResponse(scope: string | undefined, path: string) {
  if (scope) await removeOfflineValue(cacheKey(scope, path));
}
