import { useState } from 'react';
import type { HotelMenuItem } from './types';
import { saveHotelMenuItem } from './api';
import { money } from './utils';
import { Empty, Field, HotelForm, Modal, Status } from './HotelUI';
import HotelExcelImport from './HotelExcelImport';

export default function HotelMenu({
  items,
  branchId,
  canManage,
  currency,
  saved,
}: {
  items: HotelMenuItem[];
  branchId: string;
  canManage: boolean;
  currency: string;
  saved: () => Promise<void>;
}) {
  const [editor, setEditor] = useState<HotelMenuItem | 'new'>(),
    [search, setSearch] = useState('');
  const shown = items.filter((i) =>
    `${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="hotel-panel">
      <div className="hotel-toolbar">
        <h2>Prepared food menu</h2>
        <input
          type="search"
          aria-label="Search food menu"
          placeholder="Search dishes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canManage && (
          <>
            <HotelExcelImport
              kind="menu"
              branchId={branchId}
              existingNames={items.map((item) => item.name)}
              saved={saved}
            />
            <button type="button" className="hotel-primary" onClick={() => setEditor('new')}>
              + Add dish
            </button>
          </>
        )}
      </div>
      <p className="hotel-hint">
        Set the dishes you prepare, their prices and availability. Prepared food can be sold without
        receiving stock. Use Inventory for stocked products, ingredients and supplies.
      </p>
      {!shown.length ? (
        <Empty>
          No dishes yet. Add meals such as rice, breakfast, stew or tea, ready for waiters to sell.
        </Empty>
      ) : (
        <div className="hotel-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th className="hotel-numeric">Price</th>
                <th>Availability</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </td>
                  <td>{item.category}</td>
                  <td className="hotel-numeric">{money(item.price, currency)}</td>
                  <td>
                    <Status value={item.available ? 'AVAILABLE' : 'UNAVAILABLE'} />
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" onClick={() => setEditor(item)}>
                        Edit dish
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editor && (
        <MenuEditor
          key={editor === 'new' ? 'new' : editor.id}
          item={editor === 'new' ? undefined : editor}
          branchId={branchId}
          saved={saved}
          close={() => setEditor(undefined)}
        />
      )}
    </section>
  );
}
function MenuEditor({
  item,
  branchId,
  saved,
  close,
}: {
  item?: HotelMenuItem;
  branchId: string;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Main meals',
    description: item?.description ?? '',
    price: item?.price ?? 0,
    available: item?.available ?? true,
  });
  return (
    <Modal title={item ? 'Edit dish' : 'Add prepared dish'} onClose={close}>
      <HotelForm
        label={item ? 'Save dish' : 'Add dish'}
        save={async () => {
          await saveHotelMenuItem({ ...form, branchId }, item?.id);
          await saved();
        }}
        afterSave={close}
      >
        <Field label="Dish name">
          <input
            required
            maxLength={160}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="hotel-form-grid">
          <Field label="Menu category">
            <input
              required
              maxLength={80}
              placeholder="Breakfast, Main meals, Drinks…"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field label="Selling price">
            <input
              required
              type="number"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <label className="hotel-check">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm({ ...form, available: e.target.checked })}
          />
          Available to order
        </label>
      </HotelForm>
    </Modal>
  );
}
