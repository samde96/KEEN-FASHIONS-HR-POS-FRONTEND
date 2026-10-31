import { useMemo, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlatform } from '../platform/PlatformContext';
import { getInventory, getProducts } from '../services/api';
import { queueTransfer } from '../services/offlineOperations';
import { deviceStore, readDevice } from '../services/deviceStore';
import type { DeviceOperation } from '../services/deviceStore';
import { useEffect } from 'react';

export default function StockTransfersPage() {
  const { branches, selectedBranch } = usePlatform();
  const client = useQueryClient();
  const locations = branches.filter((branch) => branch.status === 'ACTIVE');
  const products = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const [source, setSource] = useState(selectedBranch?.id ?? locations[0]?.id ?? '');
  const [destination, setDestination] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<DeviceOperation[]>([]);
  const revision = useSyncExternalStore(deviceStore.subscribe, deviceStore.getSnapshot);
  useEffect(() => {
    let active = true;
    void readDevice()
      .then((data) => {
        if (active)
          setHistory(data.operations.filter((op) => op.kind === 'STOCK_TRANSFER').reverse());
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [revision]);
  const sellable = useMemo(
    () =>
      (products.data ?? []).filter(
        (p) => p.status === 'ACTIVE' && p.productType !== 'VARIABLE' && p.sellable !== false,
      ),
    [products.data],
  );
  const available =
    inventory.data?.find((row) => row.branchId === source && row.productId === productId)
      ?.quantityAvailable ?? 0;
  const mutation = useMutation({
    mutationFn: () =>
      queueTransfer(
        {
          sourceBranchId: source,
          destinationBranchId: destination,
          lines: [{ productId, quantity: Number(quantity) }],
          notes,
        },
        key,
      ),
    onSuccess: async () => {
      setMessage(
        'Transfer completed on this device. Check Offline & sync for backend confirmation.',
      );
      setError('');
      setQuantity('1');
      setNotes('');
      setKey(crypto.randomUUID());
      await client.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
  return (
    <section className="panel-card stock-transfer-page">
      <h1>Stock transfers</h1>
      <p>
        Move stock between your shops and warehouses. Transfers work offline with saved products and
        are synchronized in order.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          setMessage('');
          if (
            !source ||
            !destination ||
            source === destination ||
            !productId ||
            !Number.isSafeInteger(Number(quantity)) ||
            Number(quantity) <= 0 ||
            Number(quantity) > available
          ) {
            setError(
              'Select two different locations, a product, and a quantity within the saved available stock.',
            );
            return;
          }
          try {
            await mutation.mutateAsync();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : 'Transfer could not be saved. Your entries are still here.',
            );
          }
        }}
      >
        <fieldset disabled={mutation.isPending}>
          <label>
            From location
            <select
              required
              aria-label="From location"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {locations.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            To location
            <select
              required
              aria-label="To location"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Select destination</option>
              {locations
                .filter((b) => b.id !== source)
                .map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Product
            <select
              required
              aria-label="Transfer product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Select product</option>
              {sellable.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {p.sku}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              aria-label="Transfer quantity"
              type="number"
              min="1"
              max={available}
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <small>{available} units available at source</small>
          </label>
          <label>
            Notes
            <textarea
              aria-label="Transfer notes"
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button className="primary-action" type="submit">
            {mutation.isPending ? 'Saving transfer…' : 'Complete transfer'}
          </button>
        </fieldset>
      </form>
      {message && (
        <p role="status" className="message-banner">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="message-banner error">
          {error}
        </p>
      )}
      <h2>Transfers saved on this device</h2>
      <ul className="device-operation-list">
        {history.map((op) => (
          <li key={op.id}>
            <div>
              <strong>
                {branches.find((b) => b.id === op.payload.sourceBranchId)?.name} →{' '}
                {branches.find((b) => b.id === op.payload.destinationBranchId)?.name}
              </strong>
              <small>
                {new Date(op.occurredAt).toLocaleString()} ·{' '}
                {op.status === 'applied'
                  ? 'Synced'
                  : op.status === 'review'
                    ? 'Needs review'
                    : 'Pending sync'}{' '}
                · {op.id}
              </small>
              {op.error && <p>{op.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
