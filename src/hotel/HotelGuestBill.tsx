import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Organization } from '../data/types';
import type { HotelBooking, HotelOrder, HotelPaymentMethod } from './types';
import { getHotelBookingOrders, hotelBookingAction, payHotelBooking } from './api';
import { displayDate, money, statusLabel } from './utils';
import { Empty, Field, HotelForm, Modal, Status, useCommandId } from './HotelUI';

export function GuestBill({
  booking,
  canManage,
  currency,
  date,
  saved,
  close,
  edit,
  receipt,
}: {
  booking: HotelBooking;
  canManage: boolean;
  currency: string;
  date: string;
  saved: () => Promise<void>;
  close: () => void;
  edit: () => void;
  receipt: (booking: HotelBooking, orders: HotelOrder[]) => void;
}) {
  const orders = useQuery({
    queryKey: ['hotel', 'booking-orders', booking.id],
    queryFn: () => getHotelBookingOrders(booking.id),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmCancel, setConfirmCancel] = useState(false);
  const active = ['RESERVED', 'CHECKED_IN'].includes(booking.status);
  async function action(value: 'check-in' | 'check-out' | 'cancel') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await hotelBookingAction(booking.id, value);
      await saved();
      setConfirmCancel(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the stay.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Guest bill · Room ${booking.roomNumber}`} onClose={close} wide>
      <div className="hotel-bill-heading">
        <div>
          <h3>{booking.guestName}</h3>
          <p>
            {booking.guestPhone}
            {booking.guestPhone && booking.guestEmail ? ' · ' : ''}
            {booking.guestEmail}
          </p>
          <small>{booking.reference}</small>
        </div>
        <Status value={booking.status} />
      </div>
      <p>
        {displayDate(booking.arrival)} → {displayDate(booking.departure)} · {booking.nights} nights
        · {booking.guests} guests
      </p>
      {booking.notes && <p className="hotel-note">{booking.notes}</p>}
      {error && (
        <p role="alert" className="hotel-error">
          {error}
        </p>
      )}
      <dl className="hotel-totals">
        <div>
          <dt>
            Accommodation ({booking.nights} × {money(booking.nightlyRate, currency)})
          </dt>
          <dd>{money(booking.roomTotal, currency)}</dd>
        </div>
        <div>
          <dt>Restaurant charges to room</dt>
          <dd>{money(booking.foodTotal, currency)}</dd>
        </div>
        <div>
          <dt>Total charges</dt>
          <dd>{money(booking.total, currency)}</dd>
        </div>
        <div>
          <dt>Payments held, after refunds</dt>
          <dd>{money(booking.paid, currency)}</dd>
        </div>
        <div className="hotel-total">
          <dt>{booking.status === 'CANCELLED' ? 'Cancelled · Balance' : 'Outstanding balance'}</dt>
          <dd>{money(booking.balance, currency)}</dd>
        </div>
      </dl>
      <div className="hotel-actions">
        {canManage && booking.status === 'RESERVED' && (
          <>
            <button type="button" disabled={busy} onClick={edit}>
              Edit reservation
            </button>
            <button
              type="button"
              className="hotel-primary"
              disabled={busy || booking.arrival > date || booking.departure <= date}
              onClick={() => void action('check-in')}
            >
              Check in guest
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)}>
              Cancel reservation
            </button>
          </>
        )}
        {canManage && booking.status === 'CHECKED_IN' && (
          <button
            type="button"
            className="hotel-primary"
            disabled={busy || booking.balance !== 0}
            onClick={() => void action('check-out')}
          >
            Check out guest
          </button>
        )}
        {booking.status !== 'CANCELLED' && (
          <button
            type="button"
            disabled={!orders.isSuccess || orders.isFetching || busy}
            onClick={() => receipt(booking, orders.data ?? [])}
          >
            {booking.status === 'CHECKED_OUT' ? 'View stay receipt' : 'View guest statement'}
          </button>
        )}
      </div>
      {booking.status === 'CHECKED_IN' && booking.balance > 0 && (
        <p className="hotel-hint">Take the remaining payment to enable check-out.</p>
      )}
      {booking.status === 'CHECKED_IN' && booking.departure < date && (
        <p className="hotel-hint">
          This stay is overdue for check-out. The room remains occupied until the guest is checked
          out.
        </p>
      )}
      {confirmCancel && (
        <div className="hotel-note">
          <p>Cancel this reservation and release the room? Any deposit must be refunded first.</p>
          <div className="hotel-actions">
            <button type="button" disabled={busy} onClick={() => void action('cancel')}>
              Confirm cancellation
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)}>
              Keep reservation
            </button>
          </div>
        </div>
      )}
      {canManage && active && (
        <section className="hotel-subsection">
          <h3>Payment or deposit</h3>
          <PaymentForm
            key={`${booking.id}:${booking.paid}:${booking.balance}`}
            booking={booking}
            saved={saved}
          />
        </section>
      )}
      <section className="hotel-subsection">
        <h3>Payments & refunds</h3>
        {!booking.payments.length ? (
          <Empty>No payments recorded yet.</Empty>
        ) : (
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Method / reference</th>
                  <th className="hotel-numeric">Amount</th>
                </tr>
              </thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleString()}</td>
                    <td>{statusLabel(p.kind)}</td>
                    <td>
                      {p.method}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </td>
                    <td className="hotel-numeric">
                      {p.kind === 'REFUND' ? '−' : ''}
                      {money(p.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="hotel-subsection">
        <h3>Restaurant orders charged to this room</h3>
        {orders.isPending ? (
          <p role="status">Loading room charges…</p>
        ) : orders.isError ? (
          <p className="hotel-error" role="alert">
            {orders.error.message}{' '}
            <button type="button" onClick={() => void orders.refetch()}>
              Retry
            </button>
          </p>
        ) : !orders.data.length ? (
          <Empty>No food charged to this stay.</Empty>
        ) : (
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th className="hotel-numeric">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order.id}>
                    <td>{order.reference}</td>
                    <td>
                      {order.lines.map((line) => `${line.quantity} × ${line.itemName}`).join(', ')}
                    </td>
                    <td className="hotel-numeric">{money(order.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Modal>
  );
}

function PaymentForm({ booking, saved }: { booking: HotelBooking; saved: () => Promise<void> }) {
  const [amount, setAmount] = useState(booking.balance > 0 ? String(booking.balance) : '');
  const [kind, setKind] = useState<'PAYMENT' | 'REFUND'>(
    booking.balance > 0 ? 'PAYMENT' : 'REFUND',
  );
  const [method, setMethod] = useState<HotelPaymentMethod>('CASH'),
    [reference, setReference] = useState('');
  const requestId = useCommandId();
  return (
    <HotelForm
      label={kind === 'REFUND' ? 'Record refund' : 'Record payment'}
      save={async () => {
        const body = { amount: Number(amount), kind, method, reference };
        await payHotelBooking(booking.id, { ...body, requestId: requestId(body) });
        await saved();
      }}
    >
      <div className="hotel-form-grid">
        <Field label="Transaction">
          <select
            value={kind}
            onChange={(e) => {
              const value = e.target.value as typeof kind;
              setKind(value);
              setAmount(String(value === 'REFUND' ? booking.paid : booking.balance));
            }}
          >
            <option value="PAYMENT" disabled={booking.balance <= 0}>
              Payment / deposit
            </option>
            <option value="REFUND" disabled={booking.paid <= 0}>
              Refund
            </option>
          </select>
        </Field>
        <Field label="Amount">
          <input
            required
            type="number"
            min="0.01"
            max={kind === 'REFUND' ? booking.paid : booking.balance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Payment method">
          <select value={method} onChange={(e) => setMethod(e.target.value as HotelPaymentMethod)}>
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
          </select>
        </Field>
        <Field label="Transaction reference">
          <input
            required={method !== 'CASH'}
            maxLength={100}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
      </div>
      <p className="hotel-hint">
        Record payments after receiving them. Enter the provider's transaction reference for
        non-cash payments.
      </p>
    </HotelForm>
  );
}

export function HotelReceipt({
  booking,
  order,
  orders = [],
  organization,
  branchName,
  close,
}: {
  booking?: HotelBooking;
  order?: HotelOrder;
  orders?: HotelOrder[];
  organization: Organization;
  branchName: string;
  close: () => void;
}) {
  const currency = organization.currencyCode;
  const title = order
    ? order.method === 'ROOM'
      ? 'Room charge slip'
      : 'Food receipt'
    : booking?.status === 'CHECKED_OUT'
      ? 'Stay receipt'
      : 'Guest statement';
  return (
    <Modal title={title} onClose={close}>
      <div className="hotel-receipt-print">
        <div className="hotel-receipt-brand">
          <h2>{organization.name}</h2>
          <p>{branchName}</p>
          <h3>{title}</h3>
        </div>
        <p className="hotel-reference">{order?.reference ?? booking?.reference}</p>
        <p>
          {order?.customerName ?? booking?.guestName}
          {(order?.roomNumber ?? booking?.roomNumber)
            ? ` · Room ${order?.roomNumber ?? booking?.roomNumber}`
            : ''}
        </p>
        {order && (
          <p>
            {new Date(order.createdAt).toLocaleString('en-GB', { timeZone: organization.timeZone })}
          </p>
        )}
        {booking && (
          <p>
            {displayDate(booking.arrival)} → {displayDate(booking.departure)} ·{' '}
            {statusLabel(booking.status)}
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="hotel-numeric">Amount</th>
            </tr>
          </thead>
          <tbody>
            {booking && (
              <tr>
                <td>
                  Accommodation · {booking.nights} nights × {money(booking.nightlyRate, currency)}
                </td>
                <td className="hotel-numeric">{money(booking.roomTotal, currency)}</td>
              </tr>
            )}
            {order
              ? order.lines.map((line) => (
                  <tr key={line.itemId}>
                    <td>
                      {line.quantity} × {line.itemName}
                      <small>{money(line.unitPrice, currency)} each</small>
                    </td>
                    <td className="hotel-numeric">{money(line.total, currency)}</td>
                  </tr>
                ))
              : orders.flatMap((o) =>
                  o.lines.map((line) => (
                    <tr key={`${o.id}-${line.itemId}`}>
                      <td>
                        {line.quantity} × {line.itemName}
                        <small>{o.reference}</small>
                      </td>
                      <td className="hotel-numeric">{money(line.total, currency)}</td>
                    </tr>
                  )),
                )}
          </tbody>
        </table>
        <dl className="hotel-totals">
          <div className="hotel-total">
            <dt>Total</dt>
            <dd>{money(order?.total ?? booking?.total ?? 0, currency)}</dd>
          </div>
          {booking && (
            <>
              <div>
                <dt>Payments, after refunds</dt>
                <dd>{money(booking.paid, currency)}</dd>
              </div>
              <div className="hotel-total">
                <dt>Balance</dt>
                <dd>{money(booking.balance, currency)}</dd>
              </div>
            </>
          )}
        </dl>
        {order && (
          <p>
            {order.method === 'ROOM'
              ? 'Charged to room · Payable with the guest bill'
              : `Paid by ${order.method}`}
            {order.paymentReference ? ` · ${order.paymentReference}` : ''}
          </p>
        )}
        {booking?.payments.map((p) => (
          <p className="hotel-receipt-payment" key={p.id}>
            {statusLabel(p.kind)} · {p.method} · {money(p.amount, currency)}
            {p.reference ? ` · ${p.reference}` : ''}
          </p>
        ))}
        <p className="hotel-receipt-thanks">Thank you for visiting.</p>
      </div>
      <div className="hotel-form-actions">
        <button className="hotel-primary" type="button" onClick={() => window.print()}>
          Print {title.toLowerCase()}
        </button>
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </Modal>
  );
}
