import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHotelExpenses, saveHotelExpense } from './api';
import { displayDate, money } from './utils';
import { Empty, Field, HotelForm, Modal, useCommandId } from './HotelUI';
import type { HotelExpense, HotelExpenseCategory, HotelExpenseRequest } from './types';

const categories: { value: HotelExpenseCategory; label: string }[] = [
  { value: 'FOOD_SUPPLIES', label: 'Food supplies' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'RENT', label: 'Rent' },
  { value: 'REPAIRS_MAINTENANCE', label: 'Repairs & maintenance' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
];

const categoryLabel = (category: string) =>
  categories.find((item) => item.value === category)?.label ?? category;

export default function HotelExpenses({
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
  const [editing, setEditing] = useState<HotelExpense | null | undefined>();
  const query = useQuery({
    queryKey: ['hotel', 'expenses', branchId],
    queryFn: () => getHotelExpenses(branchId),
  });
  const total = query.data?.reduce((sum, expense) => sum + expense.amount, 0) ?? 0;
  return (
    <>
      <section className="hotel-panel">
        <div className="hotel-toolbar">
          <div>
            <h2>Operating expenses</h2>
            <p className="hotel-hint">
              Record day-to-day costs such as food supplies, utilities, rent and repairs. These
              reduce profit in the report for their recorded date.
            </p>
          </div>
          {canManage && (
            <button type="button" className="hotel-primary" onClick={() => setEditing(null)}>
              + Record expense
            </button>
          )}
        </div>
        <div className="hotel-metrics">
          <article className="hotel-metric">
            <span>Recorded expenses</span>
            <strong>{query.data?.length ?? '—'}</strong>
            <small>All dates at this location</small>
          </article>
          <article className="hotel-metric">
            <span>Total recorded</span>
            <strong>{money(total, currency)}</strong>
            <small>See Reports for date-filtered profit/loss</small>
          </article>
        </div>
      </section>
      {query.isPending ? (
        <p role="status">Loading hotel expenses…</p>
      ) : query.isError ? (
        <p className="hotel-error" role="alert">
          {query.error.message}{' '}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      ) : !query.data.length ? (
        <section className="hotel-panel">
          <Empty>No expenses recorded yet.</Empty>
        </section>
      ) : (
        <section className="hotel-panel">
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Vendor</th>
                  <th>Payment</th>
                  <th className="hotel-numeric">Amount</th>
                  {canManage && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {query.data.map((expense) => (
                  <tr key={expense.id}>
                    <td>{displayDate(expense.expenseDate)}</td>
                    <td>{categoryLabel(expense.category)}</td>
                    <td>
                      <strong>{expense.description}</strong>
                      {expense.notes && <small className="hotel-hint">{expense.notes}</small>}
                    </td>
                    <td>{expense.vendor || '—'}</td>
                    <td>{expense.paymentMethod}</td>
                    <td className="hotel-numeric">{money(expense.amount, currency)}</td>
                    {canManage && (
                      <td>
                        <button type="button" onClick={() => setEditing(expense)}>
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
        <ExpenseEditor
          key={editing?.id ?? 'new'}
          branchId={branchId}
          date={date}
          expense={editing ?? undefined}
          saved={saved}
          close={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function ExpenseEditor({
  branchId,
  date,
  expense,
  saved,
  close,
}: {
  branchId: string;
  date: string;
  expense?: HotelExpense;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const [form, setForm] = useState({
    expenseDate: expense?.expenseDate ?? date,
    category: expense?.category ?? ('FOOD_SUPPLIES' as HotelExpenseCategory),
    description: expense?.description ?? '',
    vendor: expense?.vendor ?? '',
    amount: expense?.amount ? String(expense.amount) : '',
    paymentMethod: expense?.paymentMethod ?? ('CASH' as HotelExpenseRequest['paymentMethod']),
    reference: expense?.reference ?? '',
    notes: expense?.notes ?? '',
  });
  const requestId = useCommandId();
  return (
    <Modal title={expense ? 'Edit hotel expense' : 'Record hotel expense'} onClose={close} wide>
      <HotelForm
        label={expense ? 'Save changes' : 'Record expense'}
        save={async () => {
          const body = {
            ...form,
            branchId,
            amount: Number(form.amount),
          };
          await saveHotelExpense({ ...body, requestId: requestId(body) }, expense?.id);
          await saved();
        }}
        afterSave={close}
      >
        <div className="hotel-form-grid">
          <Field label="Date">
            <input
              required
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as HotelExpenseCategory })
              }
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              required
              maxLength={160}
              placeholder="Potatoes, electricity, room repairs…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Amount">
            <input
              required
              type="number"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
          <Field label="Vendor / supplier">
            <input
              maxLength={160}
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            />
          </Field>
          <Field label="Payment method">
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentMethod: e.target.value as HotelExpenseRequest['paymentMethod'],
                })
              }
            >
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Payment reference">
            <input
              maxLength={100}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
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
      </HotelForm>
    </Modal>
  );
}
