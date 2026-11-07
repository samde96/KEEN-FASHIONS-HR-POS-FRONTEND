import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StaffUser } from '../data/types';
import { getUsers } from '../services/api';
import type { HotelReceiptSettings, HotelWaiter } from './types';
import {
  deleteHotelWaiter,
  getHotelReceiptSettings,
  getHotelWaiters,
  saveHotelReceiptSettings,
  saveHotelWaiter,
} from './api';
import { Empty, Field, HotelForm, Status } from './HotelUI';

export default function HotelServiceSettings({ branchId }: { branchId: string }) {
  const client = useQueryClient(),
    [selectedUserId, setSelectedUserId] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [message, setMessage] = useState('');
  const waiters = useQuery({
    queryKey: ['hotel', 'waiters', branchId],
    queryFn: () => getHotelWaiters(branchId),
  });
  const users = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const assignedUserIds = new Set(
    (waiters.data ?? []).map((waiter) => waiter.userId).filter((id): id is string => !!id),
  );
  const availableAccounts = (users.data ?? []).filter(
    (account: StaffUser) => account.status === 'ACTIVE' && !assignedUserIds.has(account.id),
  );
  const settings = useQuery({
    queryKey: ['hotel', 'receipt-settings', branchId],
    queryFn: () => getHotelReceiptSettings(branchId),
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['hotel'] });
  };
  async function toggle(waiter: HotelWaiter) {
    if (busy) return;
    setBusy(waiter.id);
    setError('');
    try {
      await saveHotelWaiter(
        {
          branchId,
          active: !waiter.active,
          ...(waiter.userId ? { userId: waiter.userId } : { name: waiter.name }),
        },
        waiter.id,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update waiter.');
    } finally {
      setBusy('');
    }
  }
  async function remove(waiter: HotelWaiter) {
    if (
      busy ||
      !window.confirm(
        `Remove ${waiter.name} from this hotel's waiter list? Their user account and existing receipts will be kept.`,
      )
    )
      return;
    setBusy(waiter.id);
    setError('');
    try {
      await deleteHotelWaiter(waiter.id);
      await refresh();
      setMessage('Waiter account removed.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to remove waiter.');
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <section className="hotel-panel">
        <h2>Waiter accounts</h2>
        <p className="hotel-hint">
          Choose any active user account to add as a waiter at this hotel. Their account name will
          appear as the default server at restaurant checkout. Removing a waiter only removes them
          from this hotel list; it does not change their user account or existing receipts.
        </p>
        {message && (
          <p role="status" className="hotel-note">
            {message}
          </p>
        )}
        {(error || waiters.isError) && (
          <p role="alert" className="hotel-error">
            {error || waiters.error?.message}
            <button type="button" onClick={() => void waiters.refetch()}>
              Retry
            </button>
          </p>
        )}
        <HotelForm
          key="assign-waiter"
          label="Add waiter"
          save={async () => {
            if (!selectedUserId) throw new Error('Choose a user account.');
            const account = availableAccounts.find((candidate) => candidate.id === selectedUserId);
            if (!account) throw new Error('That user account is no longer available.');
            await saveHotelWaiter({
              branchId,
              userId: account.id,
              active: true,
            });
            await refresh();
          }}
          afterSave={() => {
            setMessage('Waiter account assigned.');
            setSelectedUserId('');
          }}
        >
          <Field label="User account">
            <select
              required
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              disabled={users.isPending || users.isError || availableAccounts.length === 0}
            >
              <option value="">
                {users.isPending ? 'Loading user accounts…' : 'Choose a user account'}
              </option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName} · {account.email}
                </option>
              ))}
            </select>
          </Field>
        </HotelForm>
        {(users.isError || (users.data && !availableAccounts.length)) && (
          <p role={users.isError ? 'alert' : 'status'} className="hotel-hint">
            {users.isError
              ? `User accounts could not be loaded: ${users.error.message}`
              : 'No unassigned active user accounts are available.'}
          </p>
        )}
        {waiters.isPending ? (
          <p role="status">Loading waiter accounts…</p>
        ) : !waiters.data?.length ? (
          <Empty>No waiter accounts assigned yet.</Empty>
        ) : (
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User account</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waiters.data.map((waiter) => (
                  <tr key={waiter.id}>
                    <td>
                      {waiter.name}
                      {!waiter.userId && <small> · Legacy waiter name</small>}
                    </td>
                    <td>
                      <Status value={waiter.active ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td>
                      <div className="hotel-actions">
                        <button type="button" disabled={!!busy} onClick={() => void toggle(waiter)}>
                          {waiter.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button type="button" disabled={!!busy} onClick={() => void remove(waiter)}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="hotel-panel">
        <h2>Receipt details</h2>
        <p className="hotel-hint">
          The customer receipt shows the payment details and contact phone. Kitchen tickets show
          order preparation details only. Changes apply to new orders; saved receipts keep their
          original details.
        </p>
        {settings.isPending ? (
          <p role="status">Loading receipt details…</p>
        ) : settings.isError ? (
          <p role="alert" className="hotel-error">
            {settings.error.message}
            <button type="button" onClick={() => void settings.refetch()}>
              Retry
            </button>
          </p>
        ) : (
          <ReceiptSettingsForm branchId={branchId} initial={settings.data} saved={refresh} />
        )}
      </section>
    </>
  );
}
function ReceiptSettingsForm({
  branchId,
  initial,
  saved,
}: {
  branchId: string;
  initial: HotelReceiptSettings;
  saved: () => Promise<void>;
}) {
  const [form, setForm] = useState(() => normalizeReceiptSettings(initial)),
    [message, setMessage] = useState('');
  return (
    <>
      <HotelForm
        label="Save receipt details"
        save={async () => {
          await saveHotelReceiptSettings({ ...form, branchId });
          await saved();
        }}
        afterSave={() => setMessage('Receipt details saved.')}
      >
        <div className="hotel-form-grid">
          <Field label="Hotel name on receipts">
            <input
              required
              maxLength={160}
              value={form.hotelName}
              onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <select
              value={form.paymentType}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentType: e.target.value as HotelReceiptSettings['paymentType'],
                  accountNumber: e.target.value === 'TILL' ? '' : form.accountNumber,
                })
              }
            >
              <option value="PAYBILL">Paybill</option>
              <option value="TILL">Till Number</option>
            </select>
          </Field>
          <Field label={form.paymentType === 'PAYBILL' ? 'Paybill number' : 'Till number'}>
            <input
              required
              inputMode="numeric"
              pattern="[0-9 ]+"
              maxLength={30}
              value={form.paymentNumber}
              onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
            />
          </Field>
          <Field label="Telephone number shown under the hotel name">
            <input
              required
              type="tel"
              maxLength={40}
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </Field>
          <Field label="Complaints and feedback telephone number">
            <input
              required
              type="tel"
              maxLength={40}
              value={form.complaintsPhone}
              onChange={(e) => setForm({ ...form, complaintsPhone: e.target.value })}
            />
          </Field>
          {form.paymentType === 'PAYBILL' && (
            <Field label="Account number">
              <input
                required
                maxLength={80}
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              />
            </Field>
          )}
        </div>
      </HotelForm>
      <section className="hotel-receipt-preview-section" aria-label="Receipt preview">
        <h3>Receipt preview</h3>
        <article className="hotel-receipt-copy hotel-customer-receipt hotel-settings-receipt-preview">
          <header className="hotel-receipt-brand">
            <h2>{form.hotelName.trim() || 'Hotel name'}</h2>
            {form.contactPhone.trim() && <p>Tel: {form.contactPhone}</p>}
            <h3>FOOD SALE RECEIPT</h3>
          </header>
          <div className="hotel-sale-meta">
            <span>
              Receipt No: <strong>000001</strong>
            </span>
            <span>Date: DD/MM/YYYY</span>
            <span>Cashier: Staff name</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th className="hotel-numeric">Qty</th>
                <th className="hotel-numeric">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td className="hotel-receipt-item-name">Sample item</td>
                <td className="hotel-numeric">1</td>
                <td className="hotel-numeric">0.00</td>
              </tr>
            </tbody>
          </table>
          <dl className="hotel-totals hotel-receipt-totals">
            <div className="hotel-total">
              <dt>TOTAL</dt>
              <dd>KES 0.00</dd>
            </div>
          </dl>
          {form.paymentNumber.trim() && (
            <div className="hotel-receipt-payment-details">
              <strong>
                {form.paymentType === 'PAYBILL'
                  ? `PAYBILL: ${form.paymentNumber}`
                  : `TILL NUMBER: ${form.paymentNumber}`}
              </strong>
              {form.paymentType === 'PAYBILL' && form.accountNumber.trim() && (
                <strong>ACC: {form.accountNumber}</strong>
              )}
            </div>
          )}
          {(form.paymentNumber.trim() || form.complaintsPhone.trim()) && (
            <footer className="hotel-receipt-details-footer">
              <span>THIS IS NOT A FISCAL RECEIPT</span>
              {form.complaintsPhone.trim() && (
                <>
                  <span>FOR COMPLAINTS AND FEEDBACK CALL:</span>
                  <span>{form.complaintsPhone}</span>
                </>
              )}
            </footer>
          )}
        </article>
      </section>
      {message && (
        <p role="status" className="hotel-note">
          {message}
        </p>
      )}
    </>
  );
}

export function normalizeReceiptSettings(
  value: Partial<HotelReceiptSettings> & {
    tillNumber?: string;
    paybillNumber?: string;
  },
): HotelReceiptSettings {
  const paymentType = value.paymentType ?? (value.paybillNumber?.trim() ? 'PAYBILL' : 'TILL');
  return {
    hotelName: value.hotelName ?? '',
    contactPhone: value.contactPhone ?? '',
    complaintsPhone: value.complaintsPhone ?? value.contactPhone ?? '',
    paymentType,
    paymentNumber:
      value.paymentNumber?.trim() || value.paybillNumber?.trim() || value.tillNumber?.trim() || '',
    accountNumber: value.accountNumber ?? '',
  };
}
