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
          The customer receipt shows the Till number and contact phone. Kitchen tickets show order
          preparation details only. Changes apply to new orders; saved receipts keep their original
          details.
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
  const [form, setForm] = useState(initial),
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
          <Field label="Till number">
            <input
              required
              inputMode="numeric"
              pattern="[0-9 ]+"
              maxLength={30}
              value={form.tillNumber}
              onChange={(e) => setForm({ ...form, tillNumber: e.target.value })}
            />
          </Field>
          <Field label="Phone for complaints and orders">
            <input
              required
              type="tel"
              maxLength={40}
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </Field>
        </div>
      </HotelForm>
      {message && (
        <p role="status" className="hotel-note">
          {message}
        </p>
      )}
    </>
  );
}
