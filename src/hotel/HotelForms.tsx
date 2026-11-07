import { useState } from 'react';
import type { HotelBooking, HotelItem, HotelRoom, HotelWorkspace } from './types';
import { changeHotelStock, saveHotelBooking, saveHotelItem, saveHotelRoom } from './api';
import { addDays, money, nightsBetween, roomIsBookable, statusLabel } from './utils';
import { Field, HotelForm, Modal, useCommandId } from './HotelUI';

type EditorProps = { branchId: string; saved: () => Promise<void>; close: () => void };
export function RoomEditor({ branchId, room, saved, close }: EditorProps & { room?: HotelRoom }) {
  const [form, setForm] = useState({
    number: room?.number ?? '',
    roomType: room?.roomType ?? 'Standard',
    capacity: room?.capacity ?? 2,
    nightlyRate: room?.nightlyRate ?? 0,
    status: room?.status ?? 'READY',
  });
  return (
    <Modal title={room ? `Edit room ${room.number}` : 'Add a room'} onClose={close}>
      <HotelForm
        label={room ? 'Save room' : 'Add room'}
        save={async () => {
          await saveHotelRoom({ ...form, branchId }, room?.id);
          await saved();
        }}
        afterSave={close}
      >
        <div className="hotel-form-grid">
          <Field label="Room number">
            <input
              required
              maxLength={30}
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
          </Field>
          <Field label="Room type">
            <input
              required
              maxLength={80}
              placeholder="Standard, deluxe, suite…"
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value })}
            />
          </Field>
          <Field label="Maximum guests">
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Price per night">
            <input
              required
              type="number"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              value={form.nightlyRate || ''}
              onChange={(e) => setForm({ ...form, nightlyRate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Housekeeping status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as HotelRoom['status'] })}
            >
              <option value="READY">Ready</option>
              <option value="CLEANING">Cleaning</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </Field>
        </div>
        <p className="hotel-hint">
          Each room has its own nightly rate. Existing reservations keep their agreed price.
        </p>
      </HotelForm>
    </Modal>
  );
}

export function BookingEditor({
  branchId,
  booking,
  initialRoom,
  initialDate,
  data,
  currency,
  saved,
  close,
}: EditorProps & {
  booking?: HotelBooking;
  initialRoom?: HotelRoom;
  initialDate?: string;
  data: HotelWorkspace;
  currency: string;
}) {
  const [form, setForm] = useState({
    roomId: booking?.roomId ?? initialRoom?.id ?? '',
    guestName: booking?.guestName ?? '',
    guestPhone: booking?.guestPhone ?? '',
    guestEmail: booking?.guestEmail ?? '',
    guests: booking?.guests ?? 1,
    arrival: booking?.arrival ?? initialDate ?? data.businessDate,
    departure: booking?.departure ?? addDays(initialDate ?? data.businessDate, 1),
    nightlyRate: booking?.nightlyRate ?? initialRoom?.nightlyRate ?? 0,
    notes: booking?.notes ?? '',
  });
  const requestId = useCommandId();
  const nights = nightsBetween(form.arrival, form.departure);
  const selected = data.rooms.find((r) => r.id === form.roomId);
  const available =
    selected &&
    roomIsBookable(selected, data.bookings, form.arrival, form.departure, form.guests, booking?.id);
  return (
    <Modal title={booking ? 'Edit reservation' : 'New reservation / walk-in'} onClose={close} wide>
      <HotelForm
        label={booking ? 'Save reservation' : 'Create reservation'}
        save={async () => {
          if (!available)
            throw new Error('Choose an available room for these dates and guest count.');
          const body = { ...form, branchId };
          await saveHotelBooking({ ...body, requestId: requestId(body) }, booking?.id);
          await saved();
        }}
        afterSave={close}
      >
        <div className="hotel-form-grid">
          <Field label="Guest name">
            <input
              required
              maxLength={160}
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              maxLength={40}
              value={form.guestPhone}
              onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              maxLength={254}
              value={form.guestEmail}
              onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
            />
          </Field>
          <Field label="Number of guests">
            <input
              type="number"
              required
              min={1}
              max={100}
              value={form.guests}
              onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
            />
          </Field>
          <Field label="Arrival">
            <input
              type="date"
              required
              min={data.businessDate}
              value={form.arrival}
              onChange={(e) => setForm({ ...form, arrival: e.target.value })}
            />
          </Field>
          <Field label="Departure">
            <input
              type="date"
              required
              min={addDays(form.arrival || data.businessDate, 1)}
              max={addDays(form.arrival || data.businessDate, 366)}
              value={form.departure}
              onChange={(e) => setForm({ ...form, departure: e.target.value })}
            />
          </Field>
          <Field label="Room">
            <select
              required
              value={form.roomId}
              onChange={(e) => {
                const room = data.rooms.find((r) => r.id === e.target.value);
                setForm({ ...form, roomId: e.target.value, nightlyRate: room?.nightlyRate ?? 0 });
              }}
            >
              <option value="">Choose a room</option>
              {data.rooms.map((room) => {
                const bookable = roomIsBookable(
                  room,
                  data.bookings,
                  form.arrival,
                  form.departure,
                  form.guests,
                  booking?.id,
                );
                return (
                  <option key={room.id} value={room.id} disabled={!bookable}>
                    Room {room.number} · {room.roomType} · {money(room.nightlyRate, currency)}
                    {!bookable ? ' · Unavailable' : ''}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Agreed price per night">
            <input
              type="number"
              required
              min="0.01"
              max="999999999999.99"
              step="0.01"
              value={form.nightlyRate || ''}
              onChange={(e) => setForm({ ...form, nightlyRate: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            maxLength={1000}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        {selected && !available && (
          <p className="hotel-error" role="alert">
            This room is unavailable for these dates or guest count.
          </p>
        )}
        <p className="hotel-estimate">
          {nights > 0 ? `${nights} night${nights === 1 ? '' : 's'}` : 'Choose your stay dates'}{' '}
          <strong>{money(Math.max(0, nights || 0) * form.nightlyRate, currency)}</strong>
        </p>
        <p className="hotel-hint">
          Departure day is free for the next arrival. Create the reservation, then open the guest
          bill to take a deposit or check in.
        </p>
      </HotelForm>
    </Modal>
  );
}

export function ItemEditor({ branchId, item, saved, close }: EditorProps & { item?: HotelItem }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'PRODUCT',
    unit: item?.unit ?? 'piece',
    sellable: item?.sellable ?? true,
    price: item?.price ?? 0,
    reorderLevel: item?.reorderLevel ?? 5,
    active: item?.active ?? true,
  });
  return (
    <Modal title={item ? `Edit ${item.name}` : 'Add hotel inventory item'} onClose={close}>
      <HotelForm
        label={item ? 'Save item' : 'Add item'}
        save={async () => {
          await saveHotelItem({ ...form, branchId }, item?.id);
          await saved();
        }}
        afterSave={close}
      >
        <div className="hotel-form-grid">
          <Field label="Item name">
            <input
              required
              maxLength={160}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as HotelItem['category'],
                  sellable: e.target.value !== 'PRODUCT' ? false : form.sellable,
                })
              }
            >
              <option value="PRODUCT">Stocked product</option>
              <option value="INGREDIENT">Kitchen ingredient</option>
              <option value="SUPPLY">Hotel supply</option>
            </select>
          </Field>
          <Field label="Stock unit">
            <input
              required
              maxLength={30}
              placeholder="serving, bottle, kg, piece…"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Field label="Low stock level">
            <input
              required
              type="number"
              min={0}
              max="99999999999.999"
              step="0.001"
              value={form.reorderLevel}
              onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
            />
          </Field>
          <Field label="Selling price">
            <input
              required
              type="number"
              min={form.sellable ? '0.01' : 0}
              max="999999999999.99"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </Field>
        </div>
        <label className="hotel-check">
          <input
            type="checkbox"
            checked={form.sellable}
            disabled={form.category !== 'PRODUCT'}
            onChange={(e) => setForm({ ...form, sellable: e.target.checked })}
          />
          Sell this stocked product at checkout
        </label>
        <label className="hotel-check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active item
        </label>
        <p className="hotel-hint">
          Receive stock after saving. Only stocked products deduct inventory when sold. Prepared
          meals are managed in the Food Menu. Record ingredient and supply usage here.
        </p>
      </HotelForm>
    </Modal>
  );
}

export function StockEditor({
  item,
  kind,
  saved,
  close,
}: Omit<EditorProps, 'branchId'> & { item: HotelItem; kind: 'RECEIPT' | 'USAGE' }) {
  const [quantity, setQuantity] = useState(''),
    [note, setNote] = useState(''),
    [unitCost, setUnitCost] = useState('');
  const requestId = useCommandId();
  return (
    <Modal
      title={`${kind === 'RECEIPT' ? 'Receive stock' : 'Record usage'} · ${item.name}`}
      onClose={close}
    >
      <p>
        On hand:{' '}
        <strong>
          {item.stock} {item.unit}
        </strong>
      </p>
      <HotelForm
        label={kind === 'RECEIPT' ? 'Receive stock' : 'Record usage'}
        save={async () => {
          const body = {
            quantity: Number(quantity),
            kind,
            note,
            ...(kind === 'RECEIPT' && item.category === 'INGREDIENT'
              ? { unitCost: Number(unitCost) }
              : {}),
          };
          await changeHotelStock(item.id, { ...body, requestId: requestId(body) });
          await saved();
        }}
        afterSave={close}
      >
        <Field label={`Quantity (${item.unit})`}>
          <input
            required
            type="number"
            min="0.001"
            max={kind === 'USAGE' ? item.stock : '99999999999.999'}
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        {kind === 'RECEIPT' && item.category === 'INGREDIENT' ? (
          <Field label={`Purchase cost per ${item.unit}`}>
            <input
              required
              type="number"
              min="0.0001"
              max="999999999999.9999"
              step="0.0001"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
          </Field>
        ) : null}
        <Field
          label={kind === 'RECEIPT' ? 'Supplier / delivery reference' : 'Reason for use or wastage'}
        >
          <textarea
            required
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p className="hotel-hint">{statusLabel(kind)} will be recorded in stock movements.</p>
      </HotelForm>
    </Modal>
  );
}
