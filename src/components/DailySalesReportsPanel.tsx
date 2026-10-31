import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Branch } from '../data/types';
import { getCurrentUser } from '../services/api';
import { generateDailyReport, getDailyReports, resendDailyReport } from '../services/posOperations';
import type { DailySalesReport, DailyReportRow } from '../services/posOperations';

export default function DailySalesReportsPanel({
  branches,
  timeZone,
}: {
  branches: Branch[];
  timeZone: string;
}) {
  const client = useQueryClient();
  const user = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });
  const admin = user.data?.roleKeys.includes('ADMIN');
  const [branch, setBranch] = useState('');
  const shop = branches.some((item) => item.id === branch) ? branch : branches[0]?.id || '';
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
  const reports = useQuery({
    queryKey: ['daily-sales-reports', shop],
    queryFn: () => getDailyReports(shop),
    enabled: Boolean(shop),
  });
  const [selected, setSelected] = useState<DailySalesReport>();
  const generate = useMutation({
    mutationFn: () => generateDailyReport(shop, date),
    onSuccess: async (r) => {
      setSelected(r);
      await client.invalidateQueries({ queryKey: ['daily-sales-reports', shop] });
    },
  });
  const [resendKey, setResendKey] = useState<string>(() => crypto.randomUUID());
  const resend = useMutation({
    mutationFn: (id: string) => resendDailyReport(id, resendKey),
    onSuccess: () => setResendKey(crypto.randomUUID()),
  });
  const current = selected?.branchId === shop ? selected : reports.data?.[0];
  const money = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: current?.currencyCode ?? 'KES',
    }).format(value);
  const rows = (title: string, values: DailyReportRow[], cashier = false) => (
    <div>
      <h4>{title}</h4>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>{cashier ? 'Transactions' : 'Units'}</th>
              <th>Original sales {cashier ? '(incl. tax)' : '(before discounts & tax)'}</th>
            </tr>
          </thead>
          <tbody>
            {values.map((r, n) => (
              <tr key={`${r.id}-${n}`}>
                <td>
                  {r.name}
                  {r.sku && <small className="table-subtext">{r.sku}</small>}
                </td>
                <td>{cashier ? r.transactions : r.quantity}</td>
                <td>{money(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <details className="panel-card operations-panel">
      <summary>Daily sales summaries — 9:00 PM</summary>
      <p>
        Stored summaries cover 00:00 up to 21:00 in the business timezone. Transactions at 21:00 or
        later remain in the full sales reports.
      </p>
      <div className="operations-controls">
        <label className="field-stack">
          <span>Summary shop</span>
          <select
            value={shop}
            onChange={(e) => {
              setBranch(e.target.value);
              setSelected(undefined);
            }}
          >
            {branches.map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack">
          <span>Summary date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {admin && (
          <button
            className="primary-action compact-action"
            type="button"
            disabled={!shop || !date || generate.isPending}
            onClick={() => generate.mutate()}
          >
            Generate selected date
          </button>
        )}
        <label className="field-stack">
          <span>Historical summary</span>
          <select
            value={current?.id ?? ''}
            onChange={(e) => setSelected(reports.data?.find((r) => r.id === e.target.value))}
          >
            <option value="">Select report</option>
            {(reports.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.businessDate}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(reports.error || generate.error || resend.error) && (
        <p role="alert">{(reports.error || generate.error || resend.error)?.message}</p>
      )}
      {resend.isSuccess && (
        <p role="status">Summary queued for delivery to configured recipients.</p>
      )}
      {!current ? (
        <p>No stored summaries for this shop.</p>
      ) : (
        <>
          <h3>
            {current.branchName} — {current.businessDate}
          </h3>
          <p>{current.timeZone} · 00:00–20:59:59</p>
          <dl className="daily-summary-metrics">
            {[
              ['Transactions', current.transactions],
              ['Gross sales', money(current.grossSales)],
              ['Discounts', money(current.discounts)],
              [`Refunds (${current.refundTransactions})`, money(current.refunds)],
              [`Cancellations (${current.cancelledTransactions})`, money(current.cancellations)],
              ['Net sales before tax', money(current.netSales)],
              ['Net tax', money(current.tax)],
              ['Total revenue', money(current.totalRevenue)],
              ['Items sold (before returns)', current.itemsSold],
              ...Object.entries(current.payments).map(([method, amount]) => [
                method.replaceAll('_', ' '),
                money(amount),
              ]),
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>
            Refund and cancellation amounts include tax. Payment totals deduct recorded reversals.
            Historical reports retain the figures recorded when generated.
          </p>
          {rows('Products & variants', current.topVariants)}
          {rows('Parent products', current.parentProducts)}
          {rows('Cashiers', current.cashiers, true)}
          {admin && (
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={resend.isPending}
              onClick={() => resend.mutate(current.id)}
            >
              Resend this summary
            </button>
          )}
        </>
      )}
    </details>
  );
}
