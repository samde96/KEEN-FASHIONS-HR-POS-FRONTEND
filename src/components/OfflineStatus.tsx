import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useOffline from '../hooks/useOffline';
import { markOffline } from '../services/offline';
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
  if (connected && storageAvailable) return null;
  return (
    <aside className="offline-banner" aria-label="Connection and offline storage">
      <div role="status">
        <strong>{connected ? 'Device storage is unavailable' : 'Working offline'}</strong>
        <p>
          {!storageAvailable ? (
            'New drafts may not survive closing this page. Keep it open until you can save online.'
          ) : (
            <>
              Use saved records, POS carts and stock drafts. Reconnect to confirm payments or post
              changes.
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
  );
}
