import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getHotelReport } from './api';
import { displayDate, money, nightsBetween } from './utils';
import { Empty, Field, Metric } from './HotelUI';
import type { HotelReport } from './types';

const expenseCategoryNames: Record<string, string> = {
  FOOD_SUPPLIES: 'Food supplies',
  UTILITIES: 'Utilities',
  RENT: 'Rent',
  REPAIRS_MAINTENANCE: 'Repairs & maintenance',
  PAYROLL: 'Payroll',
  TRANSPORT: 'Transport',
  OTHER: 'Other',
};

const expenseCategoryLabel = (category: string) =>
  expenseCategoryNames[category] ?? category.replaceAll('_', ' ');

function download(report: HotelReport) {
  const rows: (string | number)[][] = [
    ['Hotel report', report.from, report.to],
    ['Accommodation revenue', report.roomRevenue],
    ['Food revenue', report.foodRevenue],
    ['Stocked product revenue', report.productRevenue],
    ['Total revenue', report.totalRevenue],
    ['Operating expenses', report.totalExpenses],
    ['Profit / (loss)', report.profitLoss],
    [],
    ['Expenses by category'],
    ...report.expensesByCategory.map((expense) => [
      expenseCategoryLabel(expense.category),
      expense.amount,
    ]),
    ['Net payments received', report.paymentsReceived],
    ['Current active balances', report.outstandingBalance],
    ['Booked room nights', report.bookedRoomNights],
    ['Configured room nights', report.availableRoomNights],
    ['Booked occupancy %', report.bookedOccupancyRate],
    [],
    [
      'Date',
      'Accommodation',
      'Prepared food',
      'Stocked products',
      'Expenses',
      'Profit / (loss)',
      'Net payments',
    ],
    ...report.daily.map((d) => [
      d.date,
      d.accommodation,
      d.food,
      d.products,
      d.expenses,
      d.accommodation + d.food + d.products - d.expenses,
      d.payments,
    ]),
    [],
    ['Room', 'Completed stays', 'Sold nights', 'Accommodation revenue'],
    ...report.rooms.map((r) => [r.roomNumber, r.completedStays, r.soldNights, r.revenue]),
  ];
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          return `"${(typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `hotel-report-${report.from}-${report.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HotelReports({
  branchId,
  date,
  currency,
}: {
  branchId: string;
  date: string;
  currency: string;
}) {
  const [from, setFrom] = useState(`${date.slice(0, 7)}-01`),
    [to, setTo] = useState(date);
  const [period, setPeriod] = useState({ from, to }),
    [error, setError] = useState('');
  const report = useQuery({
    queryKey: ['hotel', 'reports', branchId, period.from, period.to],
    queryFn: () => getHotelReport(branchId, period.from, period.to),
  });
  const data = report.data;
  return (
    <>
      <section className="hotel-panel">
        <form
          className="hotel-report-filters"
          onSubmit={(e) => {
            e.preventDefault();
            if (nightsBetween(from, to) < 0 || nightsBetween(from, to) > 365) {
              setError('Choose a period of 1 to 366 days.');
              return;
            }
            setError('');
            setPeriod({ from, to });
          }}
        >
          <Field label="From">
            <input required type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input
              required
              type="date"
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <button type="submit" className="hotel-primary">
            Apply period
          </button>
          {data && (
            <button type="button" onClick={() => download(data)}>
              Export CSV
            </button>
          )}
        </form>
        {error && (
          <p className="hotel-error" role="alert">
            {error}
          </p>
        )}
        <p className="hotel-hint">
          Accommodation revenue is counted on check-out. Prepared food and stocked product revenue
          are counted separately when ordered, including room charges. Guest payments do not count
          that revenue again. Profit/loss is revenue minus recorded operating expenses; asset
          purchases are tracked separately and excluded. Occupancy measures reserved nights against
          the rooms currently configured.
        </p>
      </section>
      {report.isPending ? (
        <p role="status">Loading hotel reports…</p>
      ) : report.isError ? (
        <p className="hotel-error" role="alert">
          {report.error.message}{' '}
          <button type="button" onClick={() => void report.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        data && (
          <>
            <div className="hotel-metrics hotel-report-metrics">
              <Metric
                label="Total revenue"
                value={money(data.totalRevenue, currency)}
                detail={`${displayDate(data.from)} – ${displayDate(data.to)}`}
              />
              <Metric
                label="Operating expenses"
                value={money(data.totalExpenses, currency)}
                detail="Expenses recorded during this period"
              />
              <Metric
                label={data.profitLoss < 0 ? 'Net loss' : 'Net profit'}
                value={money(data.profitLoss, currency)}
                detail="Revenue minus operating expenses"
              />
              <Metric
                label="Accommodation revenue"
                value={money(data.roomRevenue, currency)}
                detail={`${data.completedStays} completed stays · ${data.soldNights} nights`}
              />
              <Metric
                label="Prepared food revenue"
                value={money(data.foodRevenue, currency)}
                detail="Prepared dishes, including room charges"
              />
              <Metric
                label="Stocked product revenue"
                value={money(data.productRevenue, currency)}
                detail="Products sold through hotel checkout"
              />
              <Metric
                label="Net payments received"
                value={money(data.paymentsReceived, currency)}
                detail="Deposits and sales, less refunds"
              />
            </div>
            <div className="hotel-metrics hotel-report-metrics">
              <Metric
                label="Booked occupancy"
                value={`${data.bookedOccupancyRate}%`}
                detail={`${data.bookedRoomNights} booked / ${data.availableRoomNights} configured room nights`}
              />
              <Metric
                label="Average nightly rate"
                value={money(data.averageDailyRate, currency)}
                detail="Completed stays in this period"
              />
              <Metric
                label="Current outstanding balances"
                value={money(data.outstandingBalance, currency)}
                detail="Active stays, future reservations and unpaid orders"
              />
            </div>
            <section className="hotel-panel">
              <h2>Revenue and expenses by day</h2>
              <div
                className="hotel-chart"
                role="img"
                aria-label="Daily hotel revenue and operating expenses; exact values in the table below"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => value.slice(5)}
                      minTickGap={25}
                    />
                    <YAxis width={65} />
                    <Tooltip formatter={(value) => money(Number(value), currency)} />
                    <Legend />
                    <Bar
                      dataKey="accommodation"
                      isAnimationActive={false}
                      name="Accommodation"
                      fill="#255ce5"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="food"
                      name="Prepared food"
                      fill="#0b8075"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="products"
                      isAnimationActive={false}
                      name="Stocked products"
                      fill="#a97730"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      isAnimationActive={false}
                      name="Operating expenses"
                      fill="#c94c4c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="hotel-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="hotel-numeric">Accommodation</th>
                      <th className="hotel-numeric">Prepared food</th>
                      <th className="hotel-numeric">Stocked products</th>
                      <th className="hotel-numeric">Expenses</th>
                      <th className="hotel-numeric">Profit / (loss)</th>
                      <th className="hotel-numeric">Net payments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{displayDate(day.date)}</td>
                        <td className="hotel-numeric">{money(day.accommodation, currency)}</td>
                        <td className="hotel-numeric">{money(day.food, currency)}</td>
                        <td className="hotel-numeric">{money(day.products, currency)}</td>
                        <td className="hotel-numeric">{money(day.expenses, currency)}</td>
                        <td className="hotel-numeric">
                          {money(
                            day.accommodation + day.food + day.products - day.expenses,
                            currency,
                          )}
                        </td>
                        <td className="hotel-numeric">{money(day.payments, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="hotel-panel">
              <h2>Operating expenses by category</h2>
              {!data.expensesByCategory.length ? (
                <Empty>No expenses recorded in this period.</Empty>
              ) : (
                <div className="hotel-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="hotel-numeric">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expensesByCategory.map((expense) => (
                        <tr key={expense.category}>
                          <td>{expenseCategoryLabel(expense.category)}</td>
                          <td className="hotel-numeric">{money(expense.amount, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
            <section className="hotel-panel">
              <h2>Room performance</h2>
              {!data.rooms.length ? (
                <Empty>No rooms configured yet.</Empty>
              ) : (
                <div className="hotel-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Completed stays</th>
                        <th>Sold nights</th>
                        <th className="hotel-numeric">Accommodation revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rooms.map((room) => (
                        <tr key={room.roomNumber}>
                          <td>{room.roomNumber}</td>
                          <td>{room.completedStays}</td>
                          <td>{room.soldNights}</td>
                          <td className="hotel-numeric">{money(room.revenue, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
