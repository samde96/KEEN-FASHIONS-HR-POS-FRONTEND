import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BranchSelector } from '../platform/AppLayout';
import { usePlatform } from '../platform/PlatformContext';
import { getHotelKitchenOrders, prepareHotelOrder } from './api';
import { statusLabel } from './utils';
import { Empty, useCommandId } from './HotelUI';
import './hotel.css';

export default function HotelKitchenPage() {
  const { branchId } = usePlatform();
  const client = useQueryClient();
  const commandId = useCommandId();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [requestIds, setRequestIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['hotel', 'kitchen', branchId],
    queryFn: () => getHotelKitchenOrders(branchId),
    enabled: !!branchId,
    refetchInterval: 10000,
  });

  async function prepare(orderId: string, lineId: string, quantity: number, remaining: number) {
    const attemptKey = `${lineId}:${quantity}`;
    const id = requestIds[attemptKey] ?? crypto.randomUUID();
    setRequestIds((current) => ({ ...current, [attemptKey]: id }));
    setBusy(lineId);
    setError('');
    try {
      await prepareHotelOrder(orderId, {
        requestId: id,
        lines: [{ lineId, quantity }],
      });
      setRequestIds((current) => {
        const next = { ...current };
        delete next[attemptKey];
        return next;
      });
      setQuantities((current) => ({ ...current, [lineId]: String(remaining - quantity) }));
      await client.invalidateQueries({ queryKey: ['hotel'] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to record kitchen preparation.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="hotel-pos-orders">
      <header className="hotel-toolbar">
        <div>
          <p className="hotel-eyebrow">Hotel operations</p>
          <h1>Kitchen queue</h1>
          <p>Record prepared quantities to deduct their recipe ingredients from stock.</p>
        </div>
        <BranchSelector required />
      </header>
      {error && (
        <p className="hotel-error" role="alert">
          {error}
        </p>
      )}
      {!branchId ? (
        <p className="hotel-note">Choose a hotel location to view its kitchen queue.</p>
      ) : query.isPending ? (
        <p role="status">Loading kitchen orders…</p>
      ) : query.isError ? (
        <p className="hotel-error" role="alert">
          {query.error.message}{' '}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data.length ? (
        <Empty>No food orders are waiting for preparation.</Empty>
      ) : (
        <div className="hotel-order-grid">
          {query.data.map((order) => (
            <article className="hotel-order-card" key={order.id}>
              <div className="hotel-toolbar">
                <h2>
                  {order.serviceType === 'DINE_IN' && order.tableNumber
                    ? `Table ${order.tableNumber}`
                    : statusLabel(order.serviceType)}
                </h2>
                <span className="hotel-reference">{statusLabel(order.status)}</span>
              </div>
              <p className="hotel-reference">{order.reference}</p>
              {order.notes && <p className="hotel-note">{order.notes}</p>}
              <ul className="hotel-kitchen-lines">
                {order.lines.map((line) => {
                  const remaining = line.quantity - line.preparedQuantity;
                  const amount = quantities[line.lineId] ?? remaining.toFixed(3);
                  const quantity = Number(amount);
                  return (
                    <li key={line.lineId}>
                      <div>
                        <strong>{line.itemName}</strong>
                        <small>
                          {line.preparedQuantity} / {line.quantity} prepared
                        </small>
                        {!line.recipeConfigured && (
                          <small className="hotel-error">
                            No recipe is attached; preparation will not deduct ingredients.
                          </small>
                        )}
                      </div>
                      {remaining > 0 && (
                        <div className="hotel-kitchen-prepare">
                          <input
                            type="number"
                            aria-label={`Quantity to prepare for ${line.itemName}`}
                            min="0.001"
                            max={remaining}
                            step="0.001"
                            value={amount}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [line.lineId]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="hotel-primary"
                            disabled={
                              !!busy ||
                              !Number.isFinite(quantity) ||
                              quantity <= 0 ||
                              quantity > remaining
                            }
                            onClick={() => void prepare(order.id, line.lineId, quantity, remaining)}
                          >
                            {busy === line.lineId ? 'Saving…' : 'Record prepared'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
