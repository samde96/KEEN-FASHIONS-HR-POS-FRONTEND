import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaleRequest } from '../data/types';
import { testBranches, testInventory, testProducts, testUser, testOrganization } from './fixtures';
import { getSales } from '../services/api';
import {
  clearOfflineSession,
  configureOfflineApi,
  getOfflineIdentity,
  markConnected,
  unlockOfflineAccess,
  OfflineError,
} from '../services/offline';
import {
  deviceDatabase,
  projectedInventory,
  readArchivedOperations,
  readDevice,
  updateDevice,
} from '../services/deviceStore';
import {
  configureDeviceTransport,
  effectiveInventory,
  exportDeviceBackup,
  importDeviceBackup,
  localRecords,
  localStockReceipts,
  queueSale,
  queueStockReceipt,
  queueTransfer,
  retryOperation,
  syncDevice,
} from '../services/offlineOperations';
import { enrollOfflineLogin, offlineLogin } from '../services/offlineLogin';

const sale: SaleRequest = {
  branchId: testBranches[0].id,
  customerName: '',
  discountAmount: 0,
  lines: [{ productId: testProducts[0].id, quantity: 1 }],
  payments: [{ method: 'CASH', amount: 3248, paymentReference: '' }],
};
const unreachable = () => Promise.reject(new TypeError('Network unavailable'));
const second = {
  ...testBranches[0],
  id: '00000000-0000-4000-8000-000000000102',
  name: 'Warehouse',
};
const row = (quantity: number) => ({
  ...testInventory[0],
  id: 'stock-row',
  branchName: testBranches[0].name,
  productName: testProducts[0].name,
  sku: testProducts[0].sku,
  categoryName: testProducts[0].categoryName,
  unitPrice: testProducts[0].unitPrice,
  stockHealth: 'HEALTHY' as const,
  reorderLevel: 0,
  productId: testProducts[0].id,
  branchId: testBranches[0].id,
  quantityOnHand: quantity,
  quantityReserved: 0,
  quantityAvailable: quantity,
});

describe('durable offline operations', () => {
  beforeEach(async () => {
    configureOfflineApi('operation-tests');
    await unlockOfflineAccess(testUser);
    markConnected();
    await updateDevice(testUser, (data) => {
      data.products = testProducts;
      data.branches = [...testBranches, second];
      data.inventory = [row(2)];
      data.preparedAt = new Date().toISOString();
      data.referenceUpdatedAt = Date.now();
    });
    configureDeviceTransport({ get: unreachable, send: unreachable });
  });
  afterEach(async () => {
    await syncDevice(true);
    vi.restoreAllMocks();
    await clearOfflineSession();
  });

  it('completes a sale durably, restores it after sign-out and never enqueues the checkout twice', async () => {
    const first = await queueSale(sale, 'pos-one');
    expect(first.syncStatus).toBe('pending');
    expect(first.totalAmount).toBe(3248);
    expect(projectedInventory(await readDevice())[0].quantityAvailable).toBe(1);
    await clearOfflineSession();
    await unlockOfflineAccess(testUser);
    const recovered = await queueSale(sale, 'pos-one');
    expect(recovered.id).toBe(first.id);
    expect((await readDevice()).operations).toHaveLength(1);
    expect(await localRecords([], 'SALE')).toEqual([first]);
  });

  it('replays a lost acknowledgement with the same ID without selling or projecting the stock twice', async () => {
    let applied = 0;
    let calls = 0;
    let serverId = '';
    configureDeviceTransport({
      get: async <T>() => testUser as T,
      send: async (op) => {
        calls++;
        if (!serverId) {
          serverId = op.id;
          applied++;
        }
        expect(op.id).toBe(serverId);
        if (calls === 1) throw new TypeError('Response lost after commit');
        return {
          id: op.id,
          result: { ...(op.localResult as object), id: 'server-sale', syncStatus: undefined },
          inventory: [row(1)],
          appliedAt: new Date().toISOString(),
        };
      },
    });
    await queueSale(sale, 'pos-lost');
    expect((await readDevice()).operations[0].status).toBe('pending');
    await syncDevice(true);
    await syncDevice(true);
    expect(applied).toBe(1);
    expect(calls).toBe(2);
    const data = await readDevice();
    expect(data.operations[0].status).toBe('applied');
    expect(projectedInventory(data)[0].quantityAvailable).toBe(1);
    expect(await localRecords([{ id: 'server-sale' }], 'SALE')).toHaveLength(1);
    expect(await localRecords([], 'SALE')).toHaveLength(1);
  });

  it('serializes concurrent tabs selling the final unit in the same storage transaction', async () => {
    await updateDevice(testUser, (data) => {
      data.inventory = [row(1)];
    });
    const results = await Promise.allSettled([
      queueSale(sale, 'tab-one'),
      queueSale(sale, 'tab-two'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await readDevice()).operations).toHaveLength(1);
    expect(projectedInventory(await readDevice())[0].quantityAvailable).toBe(0);
  });

  it('retains the order and stock effects of receipt, transfer and sale across offline reloads', async () => {
    await queueStockReceipt(
      'draft-one',
      testBranches[0].id,
      { branchId: testBranches[0].id },
      [
        {
          branchId: testBranches[0].id,
          productId: testProducts[0].id,
          quantity: 3,
          supplierName: 'Supplier',
          referenceNumber: 'INVOICE',
          unitCost: 1000,
          notes: '',
        },
      ],
      0,
    );
    await queueTransfer(
      {
        sourceBranchId: testBranches[0].id,
        destinationBranchId: second.id,
        lines: [{ productId: testProducts[0].id, quantity: 2 }],
        notes: '',
      },
      'transfer-one',
    );
    await queueSale(sale, 'after-transfer');
    const data = await readDevice();
    expect(data.operations.map((op) => op.kind)).toEqual([
      'STOCK_RECEIPT',
      'STOCK_TRANSFER',
      'SALE',
    ]);
    const receiptRows = await localStockReceipts([]);
    expect(receiptRows).toHaveLength(1);
    expect(receiptRows[0].quantity).toBe(3);
    expect(
      projectedInventory(data).find((i) => i.branchId === testBranches[0].id)?.quantityAvailable,
    ).toBe(2);
    expect(projectedInventory(data).find((i) => i.branchId === second.id)?.quantityAvailable).toBe(
      2,
    );
  });

  it('keeps conflicts and later dependent operations until an explicit retry succeeds', async () => {
    const first = await queueSale(sale, 'review-one');
    await queueSale(sale, 'review-two');
    const send = vi.fn(async () => {
      throw Object.assign(new Error('Stock changed on another device'), { status: 400 });
    });
    configureDeviceTransport({ get: async <T>() => testUser as T, send });
    await syncDevice(true);
    await syncDevice(true);
    const data = await readDevice();
    expect(data.operations.map((op) => op.status)).toEqual(['review', 'pending']);
    expect(send).toHaveBeenCalledTimes(1);
    expect(data.operations[0].error).toContain('Stock changed');
    configureDeviceTransport({
      get: async <T>() => testUser as T,
      send: async (op) => ({
        id: op.id,
        result: op.localResult,
        inventory: [row(op.id === first.id ? 1 : 0)],
        appliedAt: new Date().toISOString(),
      }),
    });
    await retryOperation(first.id);
    expect((await readDevice()).operations.every((op) => op.status === 'applied')).toBe(true);
  });

  it('refuses to synchronize into a different account and retains the pending record', async () => {
    await queueSale(sale, 'wrong-user');
    const send = vi.fn(unreachable);
    configureDeviceTransport({
      get: async <T>() => ({ ...testUser, userId: 'another-user' }) as T,
      send,
    });
    await syncDevice(true);
    expect(send).not.toHaveBeenCalled();
    expect((await readDevice()).operations[0].status).toBe('pending');
  });

  it('aborts completion when storage is full and leaves no partial operation', async () => {
    const original = IDBObjectStore.prototype.put;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      if (this.name === 'devices')
        throw new DOMException('Device storage is full', 'QuotaExceededError');
      return original.call(this, value, key);
    });
    await expect(queueSale(sale, 'storage-full')).rejects.toThrow('storage is full');
    put.mockRestore();
    expect((await readDevice()).operations).toHaveLength(0);
    expect(projectedInventory(await readDevice())[0].quantityAvailable).toBe(2);
  });

  it('exports transaction recovery without credentials, and restores IDs without double importing', async () => {
    await enrollOfflineLogin(testUser.email, 'test-local-password', testUser, true);
    const saved = await queueSale(sale, 'backup-sale');
    const backup = await exportDeviceBackup();
    expect(backup).not.toContain('test-local-password');
    expect(backup).not.toContain('verifier');
    const db = await deviceDatabase();
    await new Promise<void>((resolve) => {
      const tx = db.transaction('devices', 'readwrite');
      tx.objectStore('devices').clear();
      tx.oncomplete = () => resolve();
    });
    await importDeviceBackup(backup);
    await importDeviceBackup(backup);
    expect((await readDevice()).operations.map((op) => op.id)).toEqual([saved.id]);
    expect(projectedInventory(await readDevice())[0].quantityAvailable).toBe(1);
  });

  it('verifies a prepared password offline after logout and rejects incorrect or unenrolled accounts', async () => {
    await enrollOfflineLogin(testUser.email, 'test-local-password', testUser, true);
    await clearOfflineSession();
    await expect(offlineLogin(testUser.email, 'incorrect')).rejects.toThrow(
      'Offline sign-in failed',
    );
    expect(getOfflineIdentity()).toBeNull();
    expect(await offlineLogin(testUser.email, 'test-local-password')).toEqual(testUser);
    await expect(offlineLogin('unknown@example.test', 'anything')).rejects.toThrow(
      'Sign in online',
    );
  });
  it('retains the acknowledged stock baseline when a subsequent inventory request loses connectivity', async () => {
    configureDeviceTransport({
      get: async <T>() => testUser as T,
      send: async (op) => ({
        id: op.id,
        result: op.localResult,
        inventory: [row(1)],
        appliedAt: new Date().toISOString(),
        revision: 10,
      }),
    });
    await queueSale(sale, 'ack-stock');
    const inventory = await effectiveInventory(async () => {
      throw new OfflineError();
    });
    expect(inventory[0].quantityAvailable).toBe(1);
  });
  it('does not let a delayed response replace a newer tab stock snapshot', async () => {
    await queueSale(sale, 'delayed');
    await updateDevice(testUser, (data) => {
      data.serverRevision = 20;
      data.inventory = [row(1)];
    });
    configureDeviceTransport({
      get: async <T>() => testUser as T,
      send: async (op) => ({
        id: op.id,
        result: op.localResult,
        inventory: [row(2)],
        appliedAt: new Date().toISOString(),
        revision: 19,
      }),
    });
    await syncDevice(true);
    expect(projectedInventory(await readDevice())[0].quantityAvailable).toBe(1);
  });
  it('archives completed history without losing receipts, backup records or checkout deduplication', async () => {
    await queueSale(sale, 'archive-template');
    const original = (await readDevice()).operations[0];
    await updateDevice(testUser, (data) => {
      for (let index = 0; index < 105; index++) {
        const id = crypto.randomUUID();
        data.operations.push({
          ...original,
          id,
          dedupeKey: `archived-${index}`,
          payload: { ...original.payload, checkoutKey: `archived-${index}` },
          status: 'applied',
          result: { ...(original.localResult as object), id: `server-${index}` },
        });
      }
    });
    expect((await readDevice()).operations.filter((op) => op.status === 'applied')).toHaveLength(
      100,
    );
    expect(await readArchivedOperations()).toHaveLength(5);
    expect(JSON.parse(await exportDeviceBackup()).operations).toHaveLength(106);
    const receipt = await queueSale(sale, 'archived-0');
    expect(receipt.id).toBe('server-0');
    expect((await readDevice()).operations.filter((op) => op.status === 'pending')).toHaveLength(1);
  });
  it('rejects an invalid backup atomically without replacing current device records', async () => {
    await queueSale(sale, 'safe-backup');
    const backup = JSON.parse(await exportDeviceBackup());
    backup.inventory = null;
    await expect(importDeviceBackup(JSON.stringify(backup))).rejects.toThrow(
      'invalid product, location or stock',
    );
    expect((await readDevice()).operations).toHaveLength(1);
  });
  it('filters pending sale dates in the business timezone across midnight', async () => {
    await queueSale(sale, 'midnight-sale');
    await updateDevice(testUser, (data) => {
      data.organization = testOrganization;
      data.operations[0].occurredAt = '2026-10-31T22:30:00.000Z';
      (data.operations[0].localResult as { soldAt: string }).soldAt = data.operations[0].occurredAt;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]', { headers: { 'Content-Type': 'application/json' } })),
    );
    expect(
      await getSales(new URLSearchParams({ from: '2026-11-01', to: '2026-11-01' })),
    ).toHaveLength(1);
    expect(
      await getSales(new URLSearchParams({ from: '2026-10-31', to: '2026-10-31' })),
    ).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
