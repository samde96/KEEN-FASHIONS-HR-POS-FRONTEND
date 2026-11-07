import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHotelAssets, saveHotelAsset } from './api';
import { displayDate, money } from './utils';
import { Empty, Field, HotelForm, Modal, Status } from './HotelUI';
import type { HotelAsset, HotelAssetRequest } from './types';

const categories: { value: HotelAsset['category']; label: string }[] = [
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'OTHER', label: 'Other' },
];

export default function HotelAssets({
  branchId,
  date,
  currency,
  canManage,
  saved,
}: {
  branchId: string;
  date: string;
  currency: string;
  canManage: boolean;
  saved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<HotelAsset | null | undefined>();
  const query = useQuery({
    queryKey: ['hotel', 'assets', branchId],
    queryFn: () => getHotelAssets(branchId),
  });
  return (
    <>
      <section className="hotel-panel">
        <div className="hotel-toolbar">
          <div>
            <h2>Hotel asset register</h2>
            <p className="hotel-hint">
              Track durable items such as fridges, chairs and TVs separately from sale stock.
              Purchase costs recorded here do not reduce operating profit.
            </p>
          </div>
          {canManage && (
            <button type="button" className="hotel-primary" onClick={() => setEditing(null)}>
              + Register asset
            </button>
          )}
        </div>
      </section>
      {query.isPending ? (
        <p role="status">Loading hotel assets…</p>
      ) : query.isError ? (
        <p className="hotel-error" role="alert">
          {query.error.message}{' '}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data.length ? (
        <section className="hotel-panel">
          <Empty>No assets registered yet.</Empty>
        </section>
      ) : (
        <section className="hotel-panel">
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Purchase date</th>
                  <th className="hotel-numeric">Purchase cost</th>
                  <th>Location</th>
                  <th>Status</th>
                  {canManage && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {query.data.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <strong>{asset.name}</strong>
                      {asset.notes && <small className="hotel-hint">{asset.notes}</small>}
                    </td>
                    <td>
                      {categories.find((category) => category.value === asset.category)?.label}
                    </td>
                    <td>{asset.quantity}</td>
                    <td>{displayDate(asset.purchaseDate)}</td>
                    <td className="hotel-numeric">{money(asset.purchaseCost, currency)}</td>
                    <td>{asset.location || '—'}</td>
                    <td>
                      <Status value={asset.status} />
                    </td>
                    {canManage && (
                      <td>
                        <button type="button" onClick={() => setEditing(asset)}>
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {editing !== undefined && (
        <AssetEditor
          key={editing?.id ?? 'new'}
          branchId={branchId}
          date={date}
          currency={currency}
          asset={editing ?? undefined}
          saved={saved}
          close={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function AssetEditor({
  branchId,
  date,
  currency,
  asset,
  saved,
  close,
}: {
  branchId: string;
  date: string;
  currency: string;
  asset?: HotelAsset;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    category: asset?.category ?? ('EQUIPMENT' as HotelAsset['category']),
    quantity: asset?.quantity ?? 1,
    purchaseDate: asset?.purchaseDate ?? date,
    purchaseCost: asset?.purchaseCost ? String(asset.purchaseCost) : '0',
    location: asset?.location ?? '',
    status: asset?.status ?? ('ACTIVE' as HotelAsset['status']),
    notes: asset?.notes ?? '',
  });
  return (
    <Modal title={asset ? `Edit ${asset.name}` : 'Register hotel asset'} onClose={close} wide>
      <HotelForm
        label={asset ? 'Save changes' : 'Register asset'}
        save={async () => {
          const body: HotelAssetRequest = {
            ...form,
            branchId,
            purchaseCost: Number(form.purchaseCost),
          };
          await saveHotelAsset(body, asset?.id);
          await saved();
        }}
        afterSave={close}
      >
        <div className="hotel-form-grid">
          <Field label="Asset name">
            <input
              required
              maxLength={160}
              placeholder="Fridge, dining chairs, television…"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as HotelAsset['category'] })
              }
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input
              required
              type="number"
              min={1}
              max={100000}
              step={1}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Purchase date">
            <input
              required
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </Field>
          <Field label={`Total purchase cost (${currency})`}>
            <input
              required
              type="number"
              min={0}
              max="999999999999.99"
              step="0.01"
              value={form.purchaseCost}
              onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <input
              maxLength={160}
              placeholder="Kitchen, dining room, reception…"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as HotelAsset['status'] })}
            >
              <option value="ACTIVE">In use</option>
              <option value="NEEDS_REPAIR">Needs repair</option>
              <option value="RETIRED">Retired</option>
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
      </HotelForm>
    </Modal>
  );
}
