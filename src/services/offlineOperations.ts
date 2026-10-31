import type {
  Branch,
  CurrentUser,
  InventoryItem,
  Product,
  Sale,
  SaleRequest,
  StockIntakeRequest,
  StockIntake,
  Organization,
  StockAdjustmentRequest,
} from '../data/types';
import {
  getOfflineIdentity,
  markConnected,
  markOffline,
  offlineOwnerKey,
  OfflineError,
  offlineStore,
} from './offline';
import {
  deviceChanged,
  inventoryEffects,
  projectedInventory,
  readArchivedOperation,
  readArchivedOperations,
  readDevice,
  requestDurableStorage,
  updateDevice,
} from './deviceStore';
import type { DeviceData, DeviceOperation, OperationKind } from './deviceStore';

type Receipt = {
  id: string;
  result: unknown;
  inventory: InventoryItem[];
  appliedAt: string;
  confirmed?: { id: string; result: unknown; appliedAt: string }[];
  revision?: number;
};
type Transport = {
  get: <T>(path: string) => Promise<T>;
  send: (operation: DeviceOperation) => Promise<Receipt>;
};
let transport: Transport;
export const configureDeviceTransport = (value: Transport) => {
  transport = value;
};
const tabId = typeof crypto === 'undefined' ? '' : crypto.randomUUID();
let running: Promise<void> | undefined;
let preparing: Promise<void> | undefined;
let retryAt = 0;
let syncFailures = 0;
let syncState = { syncing: false, preparing: false, message: '' };
const listeners = new Set<() => void>();
function status(value: Partial<typeof syncState>) {
  syncState = { ...syncState, ...value };
  listeners.forEach((fn) => fn());
}
export const syncStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  getSnapshot: () => syncState,
};
const active = (data: DeviceData) => data.operations.filter((op) => op.status !== 'applied');
const sameUser = (a: CurrentUser, b: CurrentUser | null) =>
  b && offlineOwnerKey(a) === offlineOwnerKey(b);

export function prepareOfflineDevice(user: CurrentUser): Promise<void> {
  if (preparing) return preparing;
  preparing = (async () => {
    status({ preparing: true });
    try {
      const verified = await transport.get<CurrentUser>('/api/v1/me');
      if (!sameUser(user, verified))
        throw new Error(
          'The server is signed into a different account. Sign in again before preparing this device.',
        );
      const before = await readDevice(user);
      const [products, inventory, branches, organization] = await Promise.all([
        transport.get<Product[]>('/api/v1/catalog/products'),
        transport.get<InventoryItem[]>('/api/v1/inventory'),
        transport.get<Branch[]>('/api/v1/branches'),
        transport.get<Organization>('/api/v1/organization/current'),
        transport.get('/api/v1/catalog/categories'),
      ]);
      if (!sameUser(user, getOfflineIdentity())) return;
      await updateDevice(user, (data) => {
        data.products = products;
        data.organization = organization;
        data.branches = branches;
        data.referenceUpdatedAt = Date.now();
        if (
          !active(data).length &&
          (data.inventoryVersion ?? 0) === (before.inventoryVersion ?? 0)
        ) {
          data.inventory = inventory;
          data.inventoryVersion = (data.inventoryVersion ?? 0) + 1;
        }
        data.preparedAt = new Date().toISOString();
      });
      await requestDurableStorage().catch(() => false);
      status({ message: 'Products and locations are saved on this device.' });
    } catch (error) {
      status({
        message:
          error instanceof Error
            ? error.message
            : 'Device preparation could not finish. Try again online.',
      });
    } finally {
      status({ preparing: false });
      preparing = undefined;
    }
  })();
  return preparing;
}

export async function effectiveInventory(fetchRows: () => Promise<InventoryItem[]>) {
  const user = getOfflineIdentity();
  if (!user) return fetchRows();
  let before: DeviceData;
  try {
    before = await readDevice(user);
  } catch {
    return fetchRows();
  }
  if (active(before).length) return projectedInventory(before);
  try {
    const inventory = await fetchRows();
    return await updateDevice(
      user,
      (data) => {
        if (
          !active(data).length &&
          (data.inventoryVersion ?? 0) === (before.inventoryVersion ?? 0)
        ) {
          data.inventory = inventory;
          data.inventoryVersion = (data.inventoryVersion ?? 0) + 1;
        }
        return projectedInventory(data);
      },
      false,
    );
  } catch (error) {
    if (
      (error instanceof OfflineError || ((error as { status?: number }).status ?? 0) >= 500) &&
      (before.inventoryVersion ?? 0) > 0
    )
      return projectedInventory(before);
    throw error;
  }
}

export async function effectiveProducts(fetchRows: () => Promise<Product[]>) {
  const user = getOfflineIdentity();
  if (!user) return fetchRows();
  try {
    const products = await fetchRows();
    await updateDevice(
      user,
      (data) => {
        data.products = products;
        data.referenceUpdatedAt = Date.now();
      },
      false,
    ).catch(() => undefined);
    return products;
  } catch (error) {
    if ((error as { status?: number }).status === 403)
      await updateDevice(
        user,
        (data) => {
          data.products = [];
          data.preparedAt = undefined;
        },
        false,
      ).catch(() => undefined);
    if (error instanceof OfflineError) {
      const data = await readDevice(user);
      if (data.products.length || data.preparedAt) return data.products;
    }
    throw error;
  }
}

export async function syncDevice(force = false): Promise<void> {
  if (running) return running;
  const user = getOfflineIdentity();
  if (!user || (!force && (navigator.onLine === false || Date.now() < retryAt))) return;
  running = (async () => {
    let leased = false;
    try {
      const data = await readDevice(user);
      if (!active(data).length) return;
      leased = await updateDevice(
        user,
        (current) => {
          if (current.lease && current.lease.owner !== tabId && current.lease.until > Date.now())
            return false;
          current.lease = { owner: tabId, until: Date.now() + 45_000 };
          return true;
        },
        false,
      );
      if (!leased) return;
      status({ syncing: true, message: 'Synchronizing saved transactions…' });
      const verified = await transport.get<CurrentUser>('/api/v1/me');
      if (!sameUser(user, verified))
        throw new Error(
          'Sign in as the operator who saved these transactions before synchronizing.',
        );
      for (;;) {
        if (!sameUser(user, getOfflineIdentity())) break;
        const next = active(await readDevice(user))[0];
        if (!next) {
          status({ message: 'All saved transactions are synchronized.' });
          break;
        }
        if (next.status === 'review') {
          status({
            message: 'A saved transaction needs review. Later transactions are retained in order.',
          });
          break;
        }
        await updateDevice(
          user,
          (current) => {
            current.lease = { owner: tabId, until: Date.now() + 45_000 };
            const op = current.operations.find((row) => row.id === next.id)!;
            op.attempts++;
            op.error = undefined;
          },
          false,
        );
        let receipt: Receipt;
        try {
          receipt = await transport.send(next);
        } catch (error) {
          const code = (error as { status?: number }).status;
          const message =
            error instanceof Error
              ? error.message
              : 'Connection interrupted; saved transaction will be retried.';
          await updateDevice(user, (current) => {
            const op = current.operations.find((row) => row.id === next.id)!;
            op.error = message;
            if (code && code >= 400 && code < 500 && ![401, 403, 408, 429].includes(code))
              op.status = 'review';
          });
          if (code === 401 || code === 403)
            status({
              message:
                'Sign in online again to synchronize. Saved transactions remain on this device.',
            });
          else status({ message });
          throw error;
        }
        if (receipt.id !== next.id || !Array.isArray(receipt.inventory) || !receipt.appliedAt)
          throw new Error(
            'The server returned an incomplete acknowledgement. The saved transaction will be retried with the same ID.',
          );
        if (
          receipt.confirmed &&
          !receipt.confirmed.some((item) => item.id === next.id && item.appliedAt)
        )
          throw new Error(
            'The backend did not acknowledge this transaction. Its saved details are retained for retry.',
          );
        await updateDevice(user, (current) => {
          const confirmations = receipt.confirmed ?? [
            { id: next.id, result: receipt.result, appliedAt: receipt.appliedAt },
          ];
          for (const confirmation of confirmations) {
            const op = current.operations.find((row) => row.id === confirmation.id);
            if (op) {
              op.status = 'applied';
              op.result = confirmation.result;
              op.appliedAt = confirmation.appliedAt;
              op.error = undefined;
            }
          }
          // Acknowledgement and baseline replacement are atomic; unacknowledged local
          // movements remain projected exactly once, even after an interrupted response.
          if ((receipt.revision ?? 0) >= (current.serverRevision ?? 0)) {
            current.inventory = receipt.inventory;
            current.serverRevision = receipt.revision ?? 0;
            current.inventoryVersion = (current.inventoryVersion ?? 0) + 1;
          }
        });
        syncFailures = 0;
        retryAt = 0;
        markConnected();
      }
    } catch (error) {
      syncFailures++;
      retryAt = Date.now() + Math.min(60_000, 2000 * 2 ** Math.min(syncFailures, 5));
      if (error instanceof OfflineError || error instanceof TypeError) markOffline();
      if (!syncState.message || !syncState.syncing)
        status({
          message:
            error instanceof Error
              ? error.message
              : 'Synchronization will retry. Saved work is retained.',
        });
    } finally {
      if (leased)
        await updateDevice(
          user,
          (data) => {
            if (data.lease?.owner === tabId) delete data.lease;
          },
          false,
        ).catch(() => undefined);
      status({ syncing: false });
      running = undefined;
    }
  })();
  return running;
}

async function submit<T>(
  kind: OperationKind,
  payload: Record<string, unknown>,
  dedupeKey: string,
  build: (data: DeviceData, id: string, at: string) => T,
): Promise<T> {
  const user = getOfflineIdentity();
  if (!user) throw new Error('Sign in before recording a transaction.');
  const id = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const stored = await updateDevice(
    user,
    (data) => {
      const previous = data.operations.find((op) => op.dedupeKey === dedupeKey && op.kind === kind);
      if (previous) {
        if (JSON.stringify(previous.payload) !== JSON.stringify(payload))
          throw new Error(
            'This checkout already has saved transaction details. Recover the saved transaction before changing it.',
          );
        return previous;
      }
      if (!data.products.length || !data.branches.length)
        throw new Error(
          'Prepare this device online before recording transactions. Products and locations must be saved first.',
        );
      const localResult = build(data, id, occurredAt);
      const op: DeviceOperation = {
        id,
        userId: user.userId,
        occurredAt,
        kind,
        payload,
        localResult,
        status: 'pending',
        attempts: 0,
        dedupeKey,
      };
      // Check the effective stock inside the same IndexedDB transaction that enqueues
      // the movement. Two tabs cannot both sell the final unit on this device.
      const available = projectedInventory(data);
      for (const effect of inventoryEffects(op)) {
        const row = available.find(
          (item) => item.branchId === effect.branchId && item.productId === effect.productId,
        );
        if (effect.quantity < 0 && (row?.quantityAvailable ?? 0) < -effect.quantity)
          throw new Error(
            `${row?.productName || 'This product'} has insufficient saved stock. Refresh stock online or receive it before continuing.`,
          );
        if (effect.counted !== undefined && effect.counted < (row?.quantityReserved ?? 0))
          throw new Error('Counted quantity cannot be less than reserved stock.');
        if (row) {
          row.quantityAvailable += effect.quantity;
          row.quantityOnHand += effect.quantity;
        }
      }
      data.operations.push(op);
      return op;
    },
    true,
    { kind, key: dedupeKey },
  );
  // Once saved, transient network failures cannot make the UI discard or recreate it.
  if (offlineStore.getSnapshot().connected && navigator.onLine !== false) {
    const syncing = syncDevice(true);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      syncing,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, 1500);
      }),
    ]);
    clearTimeout(timeout);
  } else void syncDevice();
  const saved =
    (await readDevice(user)).operations.find((op) => op.id === stored.id) ??
    (await readArchivedOperation(kind, dedupeKey, user));
  if (!saved)
    throw new Error(
      'The saved operation could not be read. Keep this checkout and recover its existing transaction before retrying.',
    );
  return (saved.result ?? saved.localResult) as T;
}

export async function queueSale(
  sale: SaleRequest,
  checkoutKey: string,
  manualMpesa = false,
): Promise<Sale> {
  const user = getOfflineIdentity();
  if (!user) throw new Error('Sign in before selling.');
  const data = await readDevice(user);
  const existing =
    data.operations.find((op) => op.kind === 'SALE' && op.dedupeKey === checkoutKey) ??
    (await readArchivedOperation('SALE', checkoutKey, user));
  if (existing) {
    if (
      JSON.stringify(existing.payload.sale) !== JSON.stringify(sale) ||
      existing.payload.manualMpesa !== manualMpesa
    )
      throw new Error(
        'This checkout already has a saved sale. Recover its saved receipt in Offline & sync.',
      );
    await syncDevice(true);
    const recovered =
      (await readDevice(user)).operations.find((op) => op.id === existing.id) ??
      (await readArchivedOperation('SALE', checkoutKey, user));
    if (!recovered)
      throw new Error(
        'The saved receipt could not be read. Export a device backup before changing this checkout.',
      );
    return (recovered.result ?? recovered.localResult) as Sale;
  }
  const prices = sale.lines.map((line) => {
    const product = data.products.find((item) => item.id === line.productId);
    if (!product)
      throw new Error(
        'A cart product is not saved on this device. Prepare the catalogue online first.',
      );
    return {
      productId: product.id,
      unitPrice: product.unitPrice,
      vatCategory: product.vatCategory,
    };
  });
  return submit(
    'SALE',
    { sale, checkoutKey, prices, manualMpesa },
    checkoutKey,
    (snapshot, id, at) => {
      const lines = sale.lines.map((line) => {
        const product = snapshot.products.find((item) => item.id === line.productId)!;
        const price = prices.find((item) => item.productId === line.productId)!;
        const lineTotal = Math.round(price.unitPrice * line.quantity * 100) / 100;
        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          categoryName: product.categoryName,
          quantity: line.quantity,
          unitPrice: price.unitPrice,
          lineTotal,
          vatCategory: price.vatCategory,
          taxRate: price.vatCategory === 'A' ? 0.16 : 0,
          taxAmount: 0,
        };
      });
      const subtotalAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const discountAmount = sale.discountAmount ?? 0;
      for (const line of lines)
        line.taxAmount =
          Math.round(
            (line.lineTotal -
              (subtotalAmount ? (discountAmount * line.lineTotal) / subtotalAmount : 0)) *
              line.taxRate *
              100,
          ) / 100;
      const taxAmount =
        Math.round(lines.reduce((sum, line) => sum + line.taxAmount, 0) * 100) / 100;
      const totalAmount = Math.round((subtotalAmount - discountAmount + taxAmount) * 100) / 100;
      if (
        !sale.payments?.length ||
        Math.round(sale.payments.reduce((sum, p) => sum + p.amount, 0) * 100) !==
          Math.round(totalAmount * 100)
      )
        throw new Error(
          'Payment amounts must match the saved sale total. Review the cart before completing.',
        );
      return {
        id,
        saleNumber: `OFF-${id.slice(0, 8).toUpperCase()}`,
        branchId: sale.branchId,
        branchName: snapshot.branches.find((row) => row.id === sale.branchId)?.name ?? '',
        customerName: sale.customerName,
        subtotalAmount,
        discountAmount,
        taxAmount,
        totalAmount,
        status: 'COMPLETED',
        soldAt: at,
        lines,
        syncStatus: 'pending',
        deviceOperationId: id,
        payments: sale.payments.map((p, index) => ({
          id: `${id}:${index}`,
          method: p.method,
          amount: p.amount,
          reference: p.paymentReference,
          status: 'SETTLED',
          cashReceived: p.cashReceived,
          changeDue:
            p.method === 'CASH' ? Math.max(0, (p.cashReceived ?? p.amount) - p.amount) : undefined,
        })),
      } satisfies Sale;
    },
  );
}

export function queueStockReceipt(
  id: string,
  branchId: string,
  form: unknown,
  lines: StockIntakeRequest[],
  version: number,
) {
  return submit(
    'STOCK_RECEIPT',
    { draftId: id, branchId, form, lines, version },
    id,
    (data, operationId, at) => ({
      id,
      branchId,
      payload: { form, lines },
      status: 'COMPLETED' as const,
      createdAt: at,
      updatedAt: at,
      completedAt: at,
      version,
      syncStatus: 'pending',
      intakes: lines.map((line, index) => ({
        ...line,
        id: `device:${operationId}:${index}`,
        branchName: data.branches.find((b) => b.id === line.branchId)?.name ?? '',
        productName: data.products.find((p) => p.id === line.productId)?.name ?? '',
        sku: data.products.find((p) => p.id === line.productId)?.sku ?? '',
        receivedAt: at,
      })),
    }),
  );
}
export function queueIntake(request: StockIntakeRequest, key = crypto.randomUUID()) {
  return submit('STOCK_INTAKE', request, key, (data, id, at) => ({
    ...request,
    id,
    branchName: data.branches.find((b) => b.id === request.branchId)?.name ?? '',
    productName: data.products.find((p) => p.id === request.productId)?.name ?? '',
    sku: data.products.find((p) => p.id === request.productId)?.sku ?? '',
    receivedAt: at,
    syncStatus: 'pending',
  }));
}
export type TransferRequest = {
  sourceBranchId: string;
  destinationBranchId: string;
  lines: { productId: string; quantity: number }[];
  notes: string;
};
export function queueTransfer(request: TransferRequest, key: string) {
  return submit('STOCK_TRANSFER', request, key, (_data, id, at) => ({
    ...request,
    id,
    occurredAt: at,
    syncStatus: 'pending',
  }));
}
export async function queueAdjustment(request: StockAdjustmentRequest, key = crypto.randomUUID()) {
  const data = await readDevice();
  const row = projectedInventory(data).find(
    (item) => item.productId === request.productId && item.branchId === request.branchId,
  );
  return submit(
    'STOCK_ADJUSTMENT',
    { adjustment: request, expectedQuantity: row?.quantityOnHand ?? 0 },
    key,
    (snapshot, id, at) => {
      const product = snapshot.products.find((p) => p.id === request.productId)!;
      const varianceQuantity = request.countedQuantity - (row?.quantityOnHand ?? 0);
      return {
        ...request,
        id,
        branchName: row?.branchName ?? '',
        productName: product.name,
        sku: product.sku,
        systemQuantity: row?.quantityOnHand ?? 0,
        varianceQuantity,
        unitCost: product.costPrice ?? 0,
        lossValue: Math.max(0, -varianceQuantity) * (product.costPrice ?? 0),
        excessValue: Math.max(0, varianceQuantity) * (product.costPrice ?? 0),
        adjustedAt: at,
        syncStatus: 'pending',
      };
    },
  );
}

export async function retryOperation(id: string) {
  const user = getOfflineIdentity();
  if (!user) return;
  await updateDevice(user, (data) => {
    const op = data.operations.find((row) => row.id === id);
    if (op && op.status !== 'applied') {
      op.status = 'pending';
      op.error = undefined;
    }
  });
  retryAt = 0;
  return syncDevice(true);
}
export async function localRecords<T>(
  server: T[],
  kind: OperationKind,
  inRange: (op: DeviceOperation) => boolean = () => true,
): Promise<T[]> {
  if (!getOfflineIdentity()) return server;
  try {
    const data = await readDevice();
    const serverIds = new Set(server.map((row) => (row as { id?: string }).id));
    const history = await readArchivedOperations();
    const byId = new Map([...history, ...data.operations].map((op) => [op.id, op]));
    const saved = [...byId.values()]
      .filter((op) => op.kind === kind && inRange(op))
      .map((op) => (op.result ?? op.localResult) as T)
      .filter((row) => !serverIds.has((row as { id?: string }).id));
    return [...saved.reverse(), ...server];
  } catch {
    return server;
  }
}

export async function exportDeviceBackup() {
  const data = await readDevice();
  const archive = await readArchivedOperations();
  data.operations = [
    ...new Map([...archive, ...data.operations].map((op) => [op.id, op])).values(),
  ];
  return JSON.stringify(
    {
      format: 'keen-offline-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      ...data,
      lease: undefined,
    },
    null,
    2,
  );
}

export async function localStockReceipts(server: StockIntake[]) {
  if (!getOfflineIdentity()) return server;
  const data = await readDevice();
  const history = await readArchivedOperations();
  const ids = new Set(server.map((row) => row.id));
  const records = [...new Map([...history, ...data.operations].map((op) => [op.id, op])).values()];
  const local = records
    .filter((op) => op.kind === 'STOCK_RECEIPT')
    .flatMap((op) => ((op.result ?? op.localResult) as { intakes?: StockIntake[] }).intakes ?? []);
  return [...local.filter((row) => !ids.has(row.id)).reverse(), ...server];
}
export async function importDeviceBackup(text: string) {
  const user = getOfflineIdentity();
  if (!user) throw new Error('Sign in before restoring a backup.');
  const value = JSON.parse(text) as DeviceData & { format?: string; version?: number };
  if (
    value.format !== 'keen-offline-backup' ||
    value.version !== 1 ||
    value.key !== offlineOwnerKey(user) ||
    !Array.isArray(value.operations)
  )
    throw new Error('Choose a KEEN backup belonging to this account and backend.');
  if (
    !Array.isArray(value.products) ||
    !Array.isArray(value.inventory) ||
    !Array.isArray(value.branches) ||
    value.products.some(
      (p) =>
        !p?.id ||
        !p.name ||
        !p.sku ||
        !Array.isArray(p.sizes) ||
        !Array.isArray(p.colors) ||
        !Number.isFinite(p.unitPrice),
    ) ||
    value.inventory.some(
      (i) =>
        !i?.productId ||
        !i.branchId ||
        !Number.isSafeInteger(i.quantityOnHand) ||
        !Number.isSafeInteger(i.quantityAvailable),
    ) ||
    value.branches.some((b) => !b?.id || !b.name)
  )
    throw new Error(
      'The backup has invalid product, location or stock data. No records were restored.',
    );
  if (value.organization) {
    if (value.organization.id !== user.organizationId)
      throw new Error('The backup belongs to another organization.');
    new Intl.DateTimeFormat('en', { timeZone: value.organization.timeZone });
  }
  const kinds: OperationKind[] = [
    'SALE',
    'STOCK_RECEIPT',
    'STOCK_INTAKE',
    'STOCK_TRANSFER',
    'STOCK_ADJUSTMENT',
  ];
  const archived = await readArchivedOperations(user);
  for (const op of value.operations) {
    if (
      !/^[0-9a-f-]{36}$/i.test(op.id) ||
      op.userId !== user.userId ||
      !kinds.includes(op.kind) ||
      !op.payload ||
      !op.dedupeKey ||
      !Number.isFinite(Date.parse(op.occurredAt))
    )
      throw new Error('The backup contains an invalid transaction. No records were restored.');
    const effects = inventoryEffects(op);
    if (
      !Array.isArray(effects) ||
      effects.some(
        (e) =>
          !e?.branchId ||
          !e.productId ||
          !Number.isSafeInteger(e.quantity) ||
          (e.counted !== undefined && (!Number.isSafeInteger(e.counted) || e.counted < 0)),
      ) ||
      !op.localResult ||
      typeof op.localResult !== 'object'
    )
      throw new Error('The backup contains invalid stock movements. No records were restored.');
    if (op.kind === 'SALE') {
      const local = op.localResult as Sale;
      if (
        !local.saleNumber ||
        !Array.isArray(local.lines) ||
        !Array.isArray(local.payments) ||
        !Number.isFinite(local.totalAmount)
      )
        throw new Error('The backup contains an invalid sale receipt. No records were restored.');
    }
  }
  await updateDevice(user, (data) => {
    for (const op of value.operations) {
      const existing = [...data.operations, ...archived].find(
        (row) => row.id === op.id || (row.kind === op.kind && row.dedupeKey === op.dedupeKey),
      );
      if (
        existing &&
        (existing.id !== op.id || JSON.stringify(existing.payload) !== JSON.stringify(op.payload))
      )
        throw new Error(
          'A restored transaction conflicts with existing device data. No records were replaced.',
        );
    }
    if (data.operations.length === 0) {
      data.inventory = value.inventory;
      data.organization = value.organization;
      data.products = value.products;
      data.branches = value.branches;
      data.preparedAt = value.preparedAt;
      data.referenceUpdatedAt = Date.now();
    }
    for (const [index, op] of value.operations.entries())
      if (![...data.operations, ...archived].some((row) => row.id === op.id)) {
        // Never trust a backup's acknowledgement. Replay every restored record with
        // its original ID so the server either returns its receipt or applies it once.
        const nextKnown = value.operations
          .slice(index + 1)
          .find((row) => data.operations.some((current) => current.id === row.id));
        const position = nextKnown
          ? data.operations.findIndex((row) => row.id === nextKnown.id)
          : data.operations.length;
        data.operations.splice(position, 0, {
          ...op,
          status: 'pending',
          projectionIncluded: op.projectionIncluded || op.status === 'applied',
          result: undefined,
          appliedAt: undefined,
          attempts: 0,
          error: 'Restored from backup; waiting for server confirmation.',
        });
      }
  });
  deviceChanged();
  retryAt = 0;
}
