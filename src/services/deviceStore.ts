import type { Branch, CurrentUser, InventoryItem, Product, Organization } from '../data/types';
import {
  getOfflineIdentity,
  getOfflineNamespace,
  markOfflineStorageUnavailable,
  offlineOwnerKey,
  scopeFor,
} from './offline';

export type OperationKind =
  'SALE' | 'STOCK_RECEIPT' | 'STOCK_INTAKE' | 'STOCK_TRANSFER' | 'STOCK_ADJUSTMENT';
export type DeviceOperation = {
  id: string;
  userId: string;
  occurredAt: string;
  kind: OperationKind;
  payload: Record<string, unknown>;
  localResult: unknown;
  result?: unknown;
  status: 'pending' | 'review' | 'applied';
  attempts: number;
  error?: string;
  appliedAt?: string;
  dedupeKey: string;
  projectionIncluded?: boolean;
};
export type DeviceData = {
  organization?: Organization;
  key: string;
  inventory: InventoryItem[];
  products: Product[];
  branches: Branch[];
  preparedAt?: string;
  operations: DeviceOperation[];
  lease?: { owner: string; until: number };
  inventoryVersion?: number;
  serverRevision?: number;
  referenceScope?: string;
  referenceUpdatedAt?: number;
};
let dbPromise: Promise<IDBDatabase> | undefined;
const changes = new Set<() => void>();
let revision = 0;
const channel =
  typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel('keen-device-changes');
function emit() {
  revision++;
  changes.forEach((fn) => fn());
}
if (channel) channel.onmessage = emit;
export function deviceChanged() {
  emit();
  channel?.postMessage('changed');
}
export const deviceStore = {
  subscribe(fn: () => void) {
    changes.add(fn);
    return () => {
      changes.delete(fn);
    };
  },
  getSnapshot: () => revision,
};

export async function deviceDatabase() {
  if (!dbPromise)
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('Offline transaction storage is unavailable in this browser.'));
        return;
      }
      const req = indexedDB.open('keen-device-v2', 2);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('devices'))
          req.result.createObjectStore('devices', { keyPath: 'key' });
        if (!req.result.objectStoreNames.contains('accounts'))
          req.result.createObjectStore('accounts', { keyPath: 'key' });
        if (!req.result.objectStoreNames.contains('archive')) {
          const archive = req.result.createObjectStore('archive', { keyPath: 'key' });
          archive.createIndex('owner', 'owner');
          archive.createIndex('dedupe', ['owner', 'kind', 'dedupeKey'], { unique: true });
        }
      };
      req.onsuccess = () => {
        req.result.onversionchange = () => {
          req.result.close();
          dbPromise = undefined;
        };
        resolve(req.result);
      };
      req.onerror = () => {
        dbPromise = undefined;
        reject(req.error);
      };
      req.onblocked = () => {
        dbPromise = undefined;
        reject(new Error('Close older KEEN tabs to update offline storage.'));
      };
    });
  return dbPromise;
}

// Resolve only on transaction completion, never on a successful individual put.
// A failed/quota-exceeded write must leave the checkout/form intact.
export async function deviceTransaction<T>(
  storeName: 'devices' | 'accounts',
  action: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await deviceDatabase();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let failure: unknown;
    let tx: IDBTransaction;
    const stores = storeName === 'devices' ? ['devices', 'archive'] : storeName;
    try {
      tx = db.transaction(stores, 'readwrite', { durability: 'strict' });
    } catch {
      tx = db.transaction(stores, 'readwrite');
    }
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () =>
      reject(
        validationErrors.get(tx) ??
          failure ??
          tx.error ??
          new Error('Device write was not completed.'),
      );
    try {
      action(tx.objectStore(storeName), (value) => {
        result = value;
      });
    } catch (error) {
      failure = error;
      tx.abort();
    }
  });
}

export function ownerKey(user = getOfflineIdentity()) {
  if (!user) throw new Error('Sign in before opening saved device transactions.');
  return offlineOwnerKey(user);
}
export const blankDevice = (key: string): DeviceData => ({
  key,
  inventory: [],
  products: [],
  branches: [],
  operations: [],
});
export async function readDevice(user?: CurrentUser): Promise<DeviceData> {
  const key = ownerKey(user);
  const db = await deviceDatabase();
  return new Promise((resolve, reject) => {
    const req = db.transaction('devices').objectStore('devices').get(key);
    req.onsuccess = () => {
      const data: DeviceData = req.result ?? blankDevice(key);
      const identity = user ?? getOfflineIdentity();
      if (
        identity &&
        (data.referenceScope !== scopeFor(identity) ||
          Date.now() - (data.referenceUpdatedAt ?? 0) > 30 * 86400_000)
      ) {
        data.products = [];
        data.branches = [];
        data.inventory = [];
        data.preparedAt = undefined;
      }
      resolve(data);
    };
    req.onerror = () => reject(req.error);
  });
}
export async function updateDevice<T>(
  user: CurrentUser,
  action: (data: DeviceData) => T,
  notify = true,
  lookup?: { kind: OperationKind; key: string },
): Promise<T> {
  const key = ownerKey(user);
  try {
    const result = await deviceTransaction<T>('devices', (store, done) => {
      let restored: DeviceOperation | undefined;
      const get = store.get(key);
      get.onsuccess = () => {
        try {
          const data: DeviceData = get.result ?? blankDevice(key);
          if (restored && !data.operations.some((op) => op.id === restored!.id))
            data.operations.unshift(restored);
          if (data.referenceScope !== scopeFor(user)) {
            data.products = [];
            data.branches = [];
            data.inventory = [];
            data.preparedAt = undefined;
            data.referenceScope = scopeFor(user);
          }
          const value = action(data);
          // Retain full history in an indexed archive while keeping routine device
          // writes bounded. Moving a receipt and updating the working set is atomic.
          const completed = data.operations.filter((op) => op.status === 'applied');
          const older = completed.slice(0, Math.max(0, completed.length - 100));
          if (older.length) {
            const ids = new Set(older.map((op) => op.id));
            const archive = store.transaction.objectStore('archive');
            for (const op of older)
              archive.put({
                key: `${key}:${op.id}`,
                owner: key,
                kind: op.kind,
                dedupeKey: op.dedupeKey,
                op,
              });
            data.operations = data.operations.filter((op) => !ids.has(op.id));
          }
          store.put(data);
          done(value);
        } catch (error) {
          // Abort with a useful application validation error, rather than a generic abort.
          validationErrors.set(get.transaction!, error);
          get.transaction!.abort();
        }
      };
      if (lookup) {
        const apply = get.onsuccess!;
        get.onsuccess = (event) => {
          const archived = store.transaction
            .objectStore('archive')
            .index('dedupe')
            .get([key, lookup.kind, lookup.key]);
          archived.onsuccess = () => {
            restored = archived.result?.op;
            apply.call(get, event);
          };
        };
      }
    });
    if (notify) deviceChanged();
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError')
      markOfflineStorageUnavailable();
    throw error;
  }
}
const validationErrors = new WeakMap<IDBTransaction, unknown>();

export async function readArchivedOperation(
  kind: OperationKind,
  dedupeKey: string,
  user?: CurrentUser,
): Promise<DeviceOperation | undefined> {
  const key = ownerKey(user);
  const db = await deviceDatabase();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction('archive')
      .objectStore('archive')
      .index('dedupe')
      .get([key, kind, dedupeKey]);
    request.onsuccess = () => resolve(request.result?.op);
    request.onerror = () => reject(request.error);
  });
}
export async function readArchivedOperations(user?: CurrentUser): Promise<DeviceOperation[]> {
  const key = ownerKey(user);
  const db = await deviceDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('archive').objectStore('archive').index('owner').getAll(key);
    request.onsuccess = () =>
      resolve(
        request.result
          .map((record) => record.op)
          .sort((a: DeviceOperation, b: DeviceOperation) =>
            a.occurredAt.localeCompare(b.occurredAt),
          ),
      );
    request.onerror = () => reject(request.error);
  });
}

export async function requestDurableStorage() {
  if (typeof navigator.storage?.persist === 'function') return navigator.storage.persist();
  return false;
}
export const accountKey = (username: string) =>
  `${getOfflineNamespace()}:${username.trim().toLowerCase()}`;

export function inventoryEffects(
  op: DeviceOperation,
): { branchId: string; productId: string; quantity: number; counted?: number }[] {
  const p = op.payload;
  if (op.kind === 'SALE') {
    const sale = p.sale as { branchId: string; lines: { productId: string; quantity: number }[] };
    return sale.lines.map((line) => ({
      ...line,
      branchId: sale.branchId,
      quantity: -line.quantity,
    }));
  }
  if (op.kind === 'STOCK_RECEIPT')
    return p.lines as { branchId: string; productId: string; quantity: number }[];
  if (op.kind === 'STOCK_INTAKE')
    return [p as { branchId: string; productId: string; quantity: number }];
  if (op.kind === 'STOCK_TRANSFER')
    return (p.lines as { productId: string; quantity: number }[]).flatMap((line) => [
      { ...line, branchId: p.sourceBranchId as string, quantity: -line.quantity },
      { ...line, branchId: p.destinationBranchId as string },
    ]);
  const a = p.adjustment as { branchId: string; productId: string; countedQuantity: number };
  return [
    { branchId: a.branchId, productId: a.productId, quantity: 0, counted: a.countedQuantity },
  ];
}

export function projectedInventory(data: DeviceData): InventoryItem[] {
  const rows = data.inventory.map((row) => ({ ...row }));
  for (const op of data.operations.filter(
    (row) => row.status !== 'applied' && !row.projectionIncluded,
  ))
    for (const effect of inventoryEffects(op)) {
      let row = rows.find(
        (item) => item.branchId === effect.branchId && item.productId === effect.productId,
      );
      if (!row) {
        const product = data.products.find((item) => item.id === effect.productId);
        row = {
          id: `device:${effect.branchId}:${effect.productId}`,
          branchId: effect.branchId,
          branchName: data.branches.find((item) => item.id === effect.branchId)?.name ?? '',
          productId: effect.productId,
          productName: product?.name ?? '',
          sku: product?.sku ?? '',
          categoryName: product?.categoryName ?? '',
          vatCategory: product?.vatCategory,
          unitPrice: product?.unitPrice ?? 0,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityAvailable: 0,
          reorderLevel: product?.reorderLevel ?? 0,
          stockHealth: 'OUT_OF_STOCK',
        };
        rows.push(row);
      }
      row.quantityOnHand = effect.counted ?? row.quantityOnHand + effect.quantity;
      row.quantityAvailable = Math.max(0, row.quantityOnHand - row.quantityReserved);
      row.stockHealth =
        row.quantityAvailable === 0
          ? 'OUT_OF_STOCK'
          : row.quantityAvailable <= row.reorderLevel
            ? 'LOW_STOCK'
            : 'HEALTHY';
    }
  return rows;
}
