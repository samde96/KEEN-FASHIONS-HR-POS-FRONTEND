import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useOffline from '../hooks/useOffline';
import { getOfflineIdentity, markOffline } from '../services/offline';
import type { CurrentUser, Sale, Organization } from '../data/types';
import ReceiptDialog from './ReceiptDialog';
import { deviceStore, readArchivedOperations, readDevice } from '../services/deviceStore';
import type { DeviceData, DeviceOperation } from '../services/deviceStore';
import {
  exportDeviceBackup,
  importDeviceBackup,
  prepareOfflineDevice,
  retryOperation,
  syncDevice,
  syncStore,
} from '../services/offlineOperations';
import { getOrganization, requestJson } from '../services/api';
import '../styles/offline.css';

export function OfflineCoordinator() {
  const client = useQueryClient();
  useEffect(() => {
    const reconnect = () => {
      void client.invalidateQueries({ refetchType: 'active' });
    };
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', reconnect);
    return () => {
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('online', reconnect);
    };
  }, [client]);
  return null;
}

export function DeviceCoordinator({ user }: { user: CurrentUser }) {
  const client = useQueryClient();
  useEffect(() => {
    if (navigator.onLine !== false) {
      void syncDevice().then(() => prepareOfflineDevice(user));
      // These optional views are also available offline after preparation.
      const paths = ['/api/v1/pos-preferences'];
      if (user.permissionCodes.some((p) => ['admin:manage', 'inventory:receive'].includes(p)))
        paths.push(
          user.permissionCodes.includes('admin:manage')
            ? '/api/v1/suppliers'
            : '/api/v1/offline/operations/suppliers',
          '/api/v1/stock-intakes',
          '/api/v1/stock-operations',
        );
      if (
        user.permissionCodes.some((p) => ['admin:manage', 'sales:view', 'reports:view'].includes(p))
      )
        paths.push('/api/v1/sales');
      if (user.permissionCodes.some((p) => ['admin:manage', 'inventory:adjust'].includes(p)))
        paths.push('/api/v1/stock-adjustments', '/api/v1/stock-adjustments/summary');
      void Promise.allSettled(paths.map((path) => requestJson(path)));
    }
    const resume = () => {
      void syncDevice(true);
    };
    const timer = window.setInterval(() => {
      void syncDevice();
    }, 10_000);
    const unsubscribe = deviceStore.subscribe(() => {
      void client.invalidateQueries({
        predicate: (q) =>
          ['inventory', 'products', 'sales', 'stock-intakes', 'stock-adjustments'].includes(
            String(q.queryKey[0]),
          ),
      });
    });
    window.addEventListener('online', resume);
    return () => {
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener('online', resume);
    };
  }, [user.organizationId, user.userId, client]);
  return null;
}

export function ConnectionBadge() {
  const { connected } = useOffline();
  return (
    <span className={`connection-badge ${connected ? 'is-connected' : 'is-offline'}`}>
      <i className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'}`} aria-hidden="true" />
      {connected ? 'Online' : 'Offline'}
    </span>
  );
}

export default function OfflineStatus() {
  const { connected, cachedAt, storageAvailable } = useOffline();
  const client = useQueryClient();
  const [checking, setChecking] = useState(false);
  const revision = useSyncExternalStore(deviceStore.subscribe, deviceStore.getSnapshot);
  const sync = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot);
  const [data, setData] = useState<DeviceData>();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ sale: Sale; organization: Organization }>();
  const [older, setOlder] = useState<DeviceOperation[]>([]);
  const [historyLimit, setHistoryLimit] = useState(100);
  useEffect(() => {
    let active = true;
    if (getOfflineIdentity())
      void readDevice()
        .then((value) => {
          if (active) setData(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [revision]);
  const pending = data?.operations.filter((op) => op.status !== 'applied') ?? [];
  const journal = [
    ...new Map([...older, ...(data?.operations ?? [])].map((op) => [op.id, op])).values(),
  ];
  const visibleOperations = [
    ...journal.filter((op) => op.status !== 'applied'),
    ...journal
      .filter((op) => op.status === 'applied')
      .reverse()
      .slice(0, historyLimit),
  ];
  return (
    <>
      <div className="offline-tools">
        <span aria-live="polite">
          {sync.syncing
            ? 'Synchronizing…'
            : pending.length
              ? `${pending.length} saved transaction${pending.length === 1 ? '' : 's'} awaiting sync`
              : data?.preparedAt
                ? `Offline ready · ${data.products.length} products`
                : sync.preparing
                  ? 'Preparing offline products…'
                  : 'Device preparation required'}
        </span>
        <button type="button" className="text-button" onClick={() => setOpen(true)}>
          Offline &amp; sync
        </button>
      </div>
      {(!connected || !storageAvailable || pending.some((op) => op.status === 'review')) && (
        <aside className="offline-banner" aria-label="Connection and offline storage">
          <div role="status">
            <strong>
              {!storageAvailable
                ? 'Device storage is unavailable'
                : !connected
                  ? 'Working offline'
                  : 'A saved transaction needs review'}
            </strong>
            <p>
              {!storageAvailable ? (
                'Keep this page open. A transaction can complete only after it has been saved successfully on this device.'
              ) : (
                <>
                  Complete cash or manual M-Pesa sales, receive stock and transfer saved products.
                  Saved transactions synchronize when connected. STK push requires internet.
                  {cachedAt && <> Saved data: {new Date(cachedAt).toLocaleString()}.</>}
                </>
              )}
            </p>
          </div>
          {!connected && (
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={checking}
              onClick={async () => {
                setChecking(true);
                try {
                  await syncDevice(true);
                  await client.invalidateQueries({ refetchType: 'active' });
                } finally {
                  setChecking(false);
                }
              }}
            >
              {checking ? 'Checking...' : 'Try reconnecting'}
            </button>
          )}
        </aside>
      )}
      {open && (
        <div className="dialog-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-sync-title"
            className="device-sync-dialog"
          >
            <div className="dialog-header">
              <h2 id="device-sync-title">Offline &amp; sync</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Close offline and sync"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <p>
              {data?.preparedAt
                ? `${data.products.length} products saved. Prepared ${new Date(data.preparedAt).toLocaleString()}.`
                : 'Connect and prepare this device before working offline.'}
            </p>
            <p>
              Pending records stay on this device until the backend acknowledges them. Keep this
              browser profile and site data. Export a backup before clearing data, changing devices
              or changing the API address.
            </p>
            <p role="status">{sync.message}</p>
            <div className="device-sync-actions">
              <button
                className="secondary-action"
                disabled={sync.preparing || !connected}
                type="button"
                onClick={() => {
                  const user = getOfflineIdentity();
                  if (user) void prepareOfflineDevice(user);
                }}
              >
                {sync.preparing ? 'Preparing…' : 'Prepare / refresh products'}
              </button>
              <button
                className="primary-action"
                type="button"
                disabled={sync.syncing}
                onClick={() => {
                  void syncDevice(true);
                }}
              >
                Sync now
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={async () => {
                  try {
                    const value = await exportDeviceBackup();
                    const url = URL.createObjectURL(
                      new Blob([value], { type: 'application/json' }),
                    );
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `keen-device-backup-${new Date().toISOString().replaceAll(':', '-')}.json`;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Backup could not be exported.');
                  }
                }}
              >
                Export backup
              </button>
              <label className="secondary-action">
                Restore backup
                <input
                  aria-label="Restore device backup"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setError('');
                      await importDeviceBackup(await file.text());
                      await syncDevice(true);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Backup could not be restored.');
                    }
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="message-banner error">
                {error}
              </p>
            )}
            <h3>Saved transactions ({pending.length} pending)</h3>
            <p>
              Pending work and recent receipts appear here. Older synced receipts are archived on
              this device and included in backups.
            </p>
            <button
              type="button"
              className="text-button"
              onClick={async () => {
                try {
                  setOlder(await readArchivedOperations());
                  setHistoryLimit((value) => value + 100);
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Load older receipts
            </button>
            <ul className="device-operation-list">
              {visibleOperations.map((op) => (
                <li key={op.id}>
                  <div>
                    <strong>
                      {op.kind.replaceAll('_', ' ')} ·{' '}
                      {op.status === 'applied'
                        ? 'Synced'
                        : op.status === 'review'
                          ? 'Needs review'
                          : 'Saved · pending sync'}
                    </strong>
                    <small>
                      {new Date(op.occurredAt).toLocaleString()} · {op.id}
                    </small>
                    {op.error && <p>{op.error}</p>}
                  </div>
                  <div className="device-sync-actions">
                    {op.kind === 'SALE' && (
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={async () => {
                          try {
                            setReceipt({
                              sale: (op.result ?? op.localResult) as Sale,
                              organization: await getOrganization(),
                            });
                            setOpen(false);
                          } catch (e) {
                            setError(String(e));
                          }
                        }}
                      >
                        Receipt
                      </button>
                    )}
                    {op.status !== 'applied' && (
                      <button
                        type="button"
                        className="secondary-action"
                        disabled={sync.syncing}
                        onClick={() => {
                          void retryOperation(op.id).catch((e) => setError(String(e)));
                        }}
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {!data?.operations.length && <p>No transactions recorded on this device yet.</p>}
          </section>
        </div>
      )}
      {receipt && (
        <ReceiptDialog
          sale={receipt.sale}
          organization={receipt.organization}
          onClose={() => {
            setReceipt(undefined);
            setOpen(true);
          }}
        />
      )}
    </>
  );
}
