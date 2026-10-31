import { useSyncExternalStore } from 'react';
import { offlineStore } from '../services/offline';

export default function useOffline() {
  return useSyncExternalStore(
    offlineStore.subscribe,
    offlineStore.getSnapshot,
    offlineStore.getSnapshot,
  );
}
