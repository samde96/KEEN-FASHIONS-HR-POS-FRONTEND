import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { CurrentUser, Organization } from '../data/types';
import { usePlatform } from '../platform/PlatformContext';
import { closeCashierShift, getCashierShifts, openCashierShift } from '../services/cashierShifts';

export default function CashierShiftsPage({
  user,
  organization,
}: {
  user: CurrentUser;
  organization: Organization;
}) {
  const { branches, branchId } = usePlatform();
  const client = useQueryClient();
  const key = ['cashier-shifts', user.organizationId, user.userId];
  const query = useQuery({ queryKey: key, queryFn: getCashierShifts, refetchInterval: 15_000 });
  const shifts = query.data ?? [];
  const active = shifts.find((s) => s.status === 'OPEN');
  const [shop, setShop] = useState('');
  const [openingFloat, setOpeningFloat] = useState('0');
  const [openingNote, setOpeningNote] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [message, setMessage] = useState('');
  const selectedShop = shop || branchId || branches[0]?.id || '';
  const money = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: organization.currencyCode,
    }).format(value);
  const opened = useMutation({
    mutationFn: openCashierShift,
    onSuccess: async () => {
      setMessage('Your shift is open.');
      setOpeningFloat('0');
      setOpeningNote('');
      await client.invalidateQueries({ queryKey: key });
    },
  });
  const closed = useMutation({
    mutationFn: ({ id, ...body }: { id: string; closingCash: number; closingNote: string }) =>
      closeCashierShift(id, body),
    onSuccess: async () => {
      setMessage('Your shift is closed.');
      setClosingCash('');
      setClosingNote('');
      await client.invalidateQueries({ queryKey: key });
    },
  });
  const error = opened.error ?? closed.error ?? query.error;
  const busy = opened.isPending || closed.isPending;
  return (
    <section className="branch-workspace cashier-shifts-workspace">
      <header className="page-header">
        <div>
          <h1>My Shifts</h1>
          <p>Open and close your shop shift and review your cash drawer.</p>
        </div>
      </header>
      {error && (
        <p role="alert" className="message-banner error">
          {error.message}
        </p>
      )}
      {message && (
        <p role="status" className="message-banner success">
          {message}
        </p>
      )}
      {query.isPending ? (
        <p role="status">Loading your shifts...</p>
      ) : !branches.length ? (
        <p className="message-banner">
          Ask an administrator to assign you an active shop before opening a shift.
        </p>
      ) : (
        <section className="panel-card">
          <div className="panel-title-row">
            <h2>{active ? `Open shift: ${active.branchName}` : 'Open a shift'}</h2>
          </div>
          {active ? (
            <>
              <p>
                Opened {new Date(active.openedAt).toLocaleString()} by {active.cashierName}.
              </p>
              <dl className="cashier-shift-totals">
                <div>
                  <dt>Opening float</dt>
                  <dd>{money(active.openingFloat)}</dd>
                </div>
                <div>
                  <dt>Cash sales</dt>
                  <dd>{money(active.cashSales)}</dd>
                </div>
                <div>
                  <dt>Paid cash expenses</dt>
                  <dd>{money(active.cashExpenses)}</dd>
                </div>
                <div>
                  <dt>Expected cash</dt>
                  <dd>{money(active.expectedCash)}</dd>
                </div>
              </dl>
              <p>
                {active.transactionCount} transactions · Recorded sales {money(active.totalSales)}
              </p>
              <p>
                Expected cash is opening float plus cash applied to your sales, less your paid cash
                expenses.
              </p>
              <form
                className="record-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setMessage('');
                  closed.mutate({
                    id: active.id,
                    closingCash: Number(closingCash),
                    closingNote: closingNote.trim(),
                  });
                }}
              >
                <label className="field-stack">
                  <span>Counted closing cash</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Closing note</span>
                  <textarea
                    maxLength={1000}
                    value={closingNote}
                    onChange={(e) => setClosingNote(e.target.value)}
                  />
                </label>
                <div className="form-actions">
                  <Link className="secondary-action compact-action" to="/pos">
                    Go to checkout
                  </Link>
                  <button className="primary-action compact-action" disabled={busy}>
                    Close My Shift
                  </button>
                </div>
              </form>
            </>
          ) : (
            <form
              className="record-form"
              onSubmit={(e) => {
                e.preventDefault();
                setMessage('');
                opened.mutate({
                  branchId: selectedShop,
                  openingFloat: Number(openingFloat),
                  openingNote: openingNote.trim(),
                });
              }}
            >
              <label className="field-stack">
                <span>Shop</span>
                <select required value={selectedShop} onChange={(e) => setShop(e.target.value)}>
                  {branches.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Opening float</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Opening note</span>
                <textarea
                  maxLength={1000}
                  value={openingNote}
                  onChange={(e) => setOpeningNote(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button className="primary-action compact-action" disabled={busy || !selectedShop}>
                  Open My Shift
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      <section className="panel-card">
        <div className="panel-title-row">
          <h2>My closed shifts</h2>
        </div>
        {!shifts.some((s) => s.status === 'CLOSED') ? (
          <p>No closed shifts yet.</p>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Expected cash</th>
                  <th>Counted cash</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {shifts
                  .filter((s) => s.status === 'CLOSED')
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.branchName}</td>
                      <td>{new Date(s.openedAt).toLocaleString()}</td>
                      <td>{s.closedAt ? new Date(s.closedAt).toLocaleString() : ''}</td>
                      <td>{money(s.expectedCash)}</td>
                      <td>{money(s.closingCash ?? 0)}</td>
                      <td>{money(s.variance ?? 0)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
