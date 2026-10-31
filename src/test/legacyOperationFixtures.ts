// Existing UI fixtures model the original business endpoints. Adapt that fixture
// transport while exercising the real IndexedDB queue and acknowledgement logic.
import { requestJson } from '../services/api';
import { configureDeviceTransport } from '../services/offlineOperations';
import type { InventoryItem } from '../data/types';

export function useLegacyOperationFixtures() {
  configureDeviceTransport({
    get: <T>(path: string) => requestJson<T>(path, undefined, { onlineOnly: true }),
    send: async (op) => {
      let result: unknown;
      const post = (path: string, payload?: unknown, method = 'POST', headers = {}) =>
        requestJson(
          path,
          {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: payload === undefined ? undefined : JSON.stringify(payload),
          },
          { onlineOnly: true },
        );
      if (op.kind === 'SALE')
        result = await post('/api/v1/sales', op.payload.sale, 'POST', {
          'Idempotency-Key': String(op.payload.checkoutKey),
        });
      else if (op.kind === 'STOCK_RECEIPT') {
        await post(`/api/v1/stock-operations/${op.payload.draftId}`, op.payload, 'PUT');
        result = await post(`/api/v1/stock-operations/${op.payload.draftId}/complete`);
      } else
        result = await post(
          op.kind === 'STOCK_INTAKE' ? '/api/v1/stock-intakes' : '/api/v1/stock-adjustments',
          op.payload,
        );
      return {
        id: op.id,
        result,
        inventory: await requestJson<InventoryItem[]>('/api/v1/inventory', undefined, {
          onlineOnly: true,
        }),
        appliedAt: new Date().toISOString(),
      };
    },
  });
}
