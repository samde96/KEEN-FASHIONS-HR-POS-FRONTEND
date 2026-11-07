import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePlatform } from '../platform/PlatformContext';
import { decideHrLeaveRequest, getHrAdminSummary, getHrLeaveRequests } from '../services/hr';
import type { HrLeaveRequest } from '../services/hr';
import './hrAdminDashboard.css';

type AdminTab = 'staff' | 'hours' | 'requests' | 'productivity';
type ProductivityMetric = 'sales' | 'salesPerHour' | 'transactions' | 'workedHours';
const productivityMetrics: Record<
  ProductivityMetric,
  { label: string; description: string; unit: string }
> = {
  sales: {
    label: 'Sales',
    description:
      'Compare POS sales and completed restaurant orders attributed to each staff member.',
    unit: 'Sales',
  },
  salesPerHour: {
    label: 'Sales per hour',
    description: 'Compare recorded sales for each confirmed working hour.',
    unit: 'Sales / hour',
  },
  transactions: {
    label: 'Transactions',
    description: 'Compare the number of sales transactions handled.',
    unit: 'Transactions',
  },
  workedHours: {
    label: 'Confirmed hours',
    description: 'Compare confirmed working hours for each staff member.',
    unit: 'Hours',
  },
};
const businessMonth = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Nairobi' }).slice(0, 7);
const monthTitle = (month: string) =>
  new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
const hours = (minutes: number) => (Number(minutes || 0) / 60).toFixed(1);
const compactValue = (value: number) =>
  new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const compactMoney = (value: number, currency: string) => `${currency} ${compactValue(value)}`;
const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const leaveType = (request: HrLeaveRequest) => request.leaveTypeName || 'Time off';
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default function HrAdminDashboard({ currencyCode }: { currencyCode: string }) {
  const { branches } = usePlatform();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(businessMonth);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<AdminTab>('staff');
  const [productivityMetric, setProductivityMetric] = useState<ProductivityMetric>('sales');
  const chartGradientId = `${useId().replace(/:/g, '')}-hr-productivity`;
  const [requestStatus, setRequestStatus] = useState('PENDING');
  const [review, setReview] = useState<{
    request: HrLeaveRequest;
    status: 'APPROVED' | 'REJECTED';
  }>();
  const [reviewNote, setReviewNote] = useState('');
  const summaryQuery = useQuery({
    queryKey: ['hr-admin-summary', month, branchId],
    queryFn: () => getHrAdminSummary(month, branchId || undefined),
  });
  const requestsQuery = useQuery({
    queryKey: ['hr-leave-requests'],
    queryFn: getHrLeaveRequests,
  });
  const decisionMutation = useMutation({
    mutationFn: () => {
      if (!review) throw new Error('Choose a request to review.');
      return decideHrLeaveRequest(review.request.id, review.status, reviewNote.trim());
    },
    onSuccess: async () => {
      setReview(undefined);
      setReviewNote('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['hr-admin-summary'] }),
      ]);
    },
  });

  const locations = branches.filter(
    (branch) =>
      branch.branchType === 'STORE' ||
      branch.branchType === 'SHOP' ||
      branch.branchType === 'HOTEL',
  );
  const firstDay = `${month}-01`;
  const nextMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1))
    .toISOString()
    .slice(0, 10);
  const requests = useMemo(
    () =>
      (requestsQuery.data ?? []).filter(
        (request) =>
          request.startDate < nextMonth &&
          request.endDate >= firstDay &&
          (!branchId || request.branchId === branchId) &&
          `${request.employeeName} ${request.leaveTypeName} ${request.reason ?? ''}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [requestsQuery.data, firstDay, nextMonth, branchId, search],
  );
  const pendingRequests = requests.filter((request) => request.status === 'PENDING_APPROVAL');
  const visibleStaff = (summaryQuery.data?.staff ?? []).filter((person) =>
    `${person.employeeName} ${person.jobTitle ?? ''} ${person.employeeNumber} ${person.branchName}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const attendance = (summaryQuery.data?.attendance ?? []).filter((record) =>
    `${record.employeeName} ${record.branchName} ${record.status}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const reportStaff = [...visibleStaff].sort(
    (a, b) => b.sales - a.sales || a.employeeName.localeCompare(b.employeeName),
  );
  const chartRows = reportStaff
    .map((person) => {
      const workedHours = Number(person.workedMinutes || 0) / 60;
      const value =
        productivityMetric === 'sales'
          ? Number(person.sales || 0)
          : productivityMetric === 'salesPerHour'
            ? workedHours > 0
              ? Number(person.sales || 0) / workedHours
              : null
            : productivityMetric === 'transactions'
              ? Number(person.transactions || 0)
              : workedHours;
      return { ...person, chartValue: value };
    })
    .filter((person) => person.chartValue !== null)
    .sort(
      (a, b) =>
        Number(b.chartValue) - Number(a.chartValue) || a.employeeName.localeCompare(b.employeeName),
    );
  const selectedProductivityMetric = productivityMetrics[productivityMetric];
  const chartWidth = Math.max(300, chartRows.length * 120 + 76);
  const chartHasValues = chartRows.some((person) => Number(person.chartValue) !== 0);
  const staff = summaryQuery.data?.staff ?? [];
  const confirmedMinutes = staff.reduce(
    (sum, person) => sum + Number(person.workedMinutes || 0),
    0,
  );
  const approvedLeave = staff.reduce(
    (sum, person) =>
      sum +
      Number(person.offDays || 0) +
      Number(person.sickDays || 0) +
      Number(person.annualLeaveDays || 0),
    0,
  );
  const monthRequests = (requestsQuery.data ?? []).filter(
    (request) =>
      request.startDate < nextMonth &&
      request.endDate >= firstDay &&
      (!branchId || request.branchId === branchId),
  );
  const pendingTotal = monthRequests.filter(
    (request) => request.status === 'PENDING_APPROVAL',
  ).length;
  const refresh = () => {
    void summaryQuery.refetch();
    void requestsQuery.refetch();
  };
  const requestDecision = (request: HrLeaveRequest, status: 'APPROVED' | 'REJECTED') => {
    setReview({ request, status });
    setReviewNote('');
    decisionMutation.reset();
  };

  return (
    <section className="hr-admin-dashboard">
      <header className="hr-admin-title">
        <div>
          <span>PEOPLE, TIME & ATTENDANCE</span>
          <h1>Human Resources</h1>
        </div>
        <Link className="hr-admin-action" to="/hr/employees">
          <i className="bi bi-person-plus" aria-hidden="true" /> Add staff profile
        </Link>
      </header>

      <section className="hr-admin-filters" aria-label="Human resources report filters">
        <label>
          Staff member
          <select
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Filter staff member"
          >
            <option value="">All staff</option>
            {staff.map((person) => (
              <option key={person.employeeId} value={person.employeeName}>
                {person.employeeName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reporting period
          <select value="MONTH" disabled aria-label="Reporting period">
            <option value="MONTH">Monthly</option>
          </select>
        </label>
        <label>
          Month
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={month}
            onChange={(event) => {
              if (event.target.value) setMonth(event.target.value);
            }}
          />
        </label>
        <label>
          Store / shop
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">All assigned locations</option>
            {locations.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search staff
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, role or employee number"
          />
        </label>
        <button
          type="button"
          className="hr-admin-action"
          disabled={summaryQuery.isFetching}
          onClick={refresh}
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          {summaryQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
        <p>
          {branchId ? locations.find((branch) => branch.id === branchId)?.name : 'All staff'} ·{' '}
          {monthTitle(month)} · Nairobi time. Date ranges include the last day.
        </p>
      </section>

      {(summaryQuery.isError || requestsQuery.isError) && (
        <div className="hr-admin-error" role="alert">
          {(summaryQuery.error ?? requestsQuery.error)?.message || 'HR data could not be loaded.'}
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      <section className="hr-admin-summary" aria-label={`${monthTitle(month)} HR summary`}>
        <article>
          <i className="bi bi-clock-history" aria-hidden="true" />
          <div>
            <span>Confirmed working hours</span>
            <strong>{hours(confirmedMinutes)}</strong>
            <small>{monthTitle(month)} · all working locations</small>
          </div>
        </article>
        <article>
          <i className="bi bi-calendar2-check" aria-hidden="true" />
          <div>
            <span>Approved off / leave days</span>
            <strong>{approvedLeave}</strong>
            <small>
              {staff.reduce((sum, person) => sum + Number(person.sickDays || 0), 0)} sick ·{' '}
              {staff.reduce((sum, person) => sum + Number(person.offDays || 0), 0)} off ·{' '}
              {staff.reduce((sum, person) => sum + Number(person.annualLeaveDays || 0), 0)} annual
              leave
            </small>
          </div>
        </article>
        <article>
          <i className="bi bi-inbox" aria-hidden="true" />
          <div>
            <span>Requests awaiting review</span>
            <strong>{pendingTotal}</strong>
            <small>Pending requests do not change confirmed attendance</small>
          </div>
        </article>
        <article>
          <i className="bi bi-people" aria-hidden="true" />
          <div>
            <span>Staff accounts</span>
            <strong>{staff.length}</strong>
            <small>
              {staff.reduce((sum, person) => sum + Number(person.absentDays || 0), 0)} recorded
              absence days
            </small>
          </div>
        </article>
      </section>

      <nav className="hr-admin-tabs" aria-label="HR admin sections">
        {(
          [
            ['staff', 'bi-people', 'Staff & details'],
            ['hours', 'bi-clock', 'Working hours'],
            ['requests', 'bi-inbox', `Requests (${pendingTotal})`],
            ['productivity', 'bi-graph-up', 'Productivity'],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            <i className={`bi ${icon}`} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>

      {summaryQuery.isPending ? (
        <div className="hr-admin-panel" role="status">
          Loading HR report…
        </div>
      ) : (
        <section className="hr-admin-panel">
          <header className="hr-admin-panel-heading">
            <h2>
              {tab === 'staff'
                ? 'Staff directory'
                : tab === 'hours'
                  ? 'Working hours & attendance'
                  : tab === 'requests'
                    ? 'Requests awaiting a decision'
                    : 'Productivity by staff'}
            </h2>
            {tab === 'hours' && (
              <Link className="hr-admin-action" to="/hr/attendance">
                Manage attendance
              </Link>
            )}
            {tab === 'staff' && (
              <Link className="hr-admin-action" to="/hr/employees">
                Staff records
              </Link>
            )}
          </header>
          {tab === 'staff' &&
            (visibleStaff.length ? (
              <div className="hr-admin-staff-grid">
                {visibleStaff.map((person) => (
                  <article className="hr-admin-staff-card" key={person.employeeId}>
                    <div className="hr-admin-person">
                      <span>{initials(person.employeeName)}</span>
                      <div>
                        <h3>{person.employeeName}</h3>
                        <p>{person.jobTitle || 'Staff member'}</p>
                        <small>{person.branchName}</small>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>Working hours</dt>
                        <dd>{hours(person.workedMinutes)}</dd>
                      </div>
                      <div>
                        <dt>Off days</dt>
                        <dd>{person.offDays}</dd>
                      </div>
                      <div>
                        <dt>Sick leave</dt>
                        <dd>{person.sickDays}</dd>
                      </div>
                      <div>
                        <dt>Absence</dt>
                        <dd>{person.absentDays}</dd>
                      </div>
                    </dl>
                    <footer>
                      <span>{person.employeeNumber}</span>
                      <Link to="/hr/employees">View staff details</Link>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <p className="hr-admin-empty">No staff members match these filters.</p>
            ))}
          {tab === 'hours' &&
            (attendance.length ? (
              <div className="hr-admin-table-scroll">
                <table className="hr-admin-table">
                  <thead>
                    <tr>
                      <th>Staff member</th>
                      <th>Location</th>
                      <th>Date</th>
                      <th>Clock-in</th>
                      <th>Clock-out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id}>
                        <td>{record.employeeName}</td>
                        <td>{record.branchName}</td>
                        <td>{record.attendanceDate}</td>
                        <td>
                          {record.clockIn
                            ? new Date(record.clockIn).toLocaleTimeString('en-KE', {
                                timeZone: 'Africa/Nairobi',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td>
                          {record.clockOut
                            ? new Date(record.clockOut).toLocaleTimeString('en-KE', {
                                timeZone: 'Africa/Nairobi',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'In progress'}
                        </td>
                        <td>{hours(record.workedMinutes)}</td>
                        <td>
                          <span className="hr-admin-status">{record.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="hr-admin-empty">No attendance records for this month.</p>
            ))}
          {tab === 'requests' && (
            <>
              <div className="hr-admin-request-filters">
                <label>
                  Status
                  <select
                    value={requestStatus}
                    onChange={(event) => setRequestStatus(event.target.value)}
                  >
                    <option value="PENDING">Awaiting review</option>
                    <option value="ALL">All requests</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Declined</option>
                  </select>
                </label>
                <span>
                  {requests.length} requests · {monthTitle(month)}
                </span>
              </div>
              {requestsQuery.isPending ? (
                <p className="hr-admin-empty">Loading staff requests…</p>
              ) : (requestStatus === 'PENDING'
                  ? pendingRequests
                  : requests.filter(
                      (request) => requestStatus === 'ALL' || request.status === requestStatus,
                    )
                ).length ? (
                <div className="hr-admin-requests">
                  {(requestStatus === 'PENDING'
                    ? pendingRequests
                    : requests.filter(
                        (request) => requestStatus === 'ALL' || request.status === requestStatus,
                      )
                  ).map((request) => (
                    <article key={request.id} className="hr-admin-request">
                      <div className="hr-admin-person">
                        <span>{initials(request.employeeName)}</span>
                        <div>
                          <h3>{request.employeeName}</h3>
                          <p>
                            {leaveType(request)} · {request.branchName}
                          </p>
                          <small>
                            {request.startDate}
                            {request.startDate !== request.endDate
                              ? ` – ${request.endDate}`
                              : ''} · {request.requestedDays} days
                          </small>
                        </div>
                      </div>
                      {request.reason && <p className="hr-admin-reason">{request.reason}</p>}
                      {request.approverComments && (
                        <p className="hr-admin-review-note">
                          Review note: {request.approverComments}
                        </p>
                      )}
                      <span
                        className={`hr-admin-status hr-admin-status-${request.status.toLowerCase()}`}
                      >
                        {request.status.replaceAll('_', ' ')}
                      </span>
                      {request.status === 'PENDING_APPROVAL' && (
                        <div className="hr-admin-request-actions">
                          <button
                            type="button"
                            onClick={() => requestDecision(request, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDecision(request, 'REJECTED')}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="hr-admin-empty">No requests for this month and filter.</p>
              )}
            </>
          )}
          {tab === 'productivity' &&
            (reportStaff.length ? (
              <>
                <figure
                  className="hr-admin-productivity-chart"
                  aria-labelledby="hr-productivity-title"
                >
                  <figcaption className="hr-admin-productivity-heading">
                    <div>
                      <span className="hr-admin-productivity-kicker">STAFF COMPARISON</span>
                      <h3 id="hr-productivity-title">Staff productivity</h3>
                      <p>
                        {monthTitle(month)} ·{' '}
                        {branchId
                          ? locations.find((branch) => branch.id === branchId)?.name
                          : 'All assigned locations'}
                      </p>
                    </div>
                    <label>
                      Compare by
                      <select
                        aria-label="Compare productivity by"
                        value={productivityMetric}
                        onChange={(event) =>
                          setProductivityMetric(event.target.value as ProductivityMetric)
                        }
                      >
                        {Object.entries(productivityMetrics).map(([key, metric]) => (
                          <option key={key} value={key}>
                            {metric.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </figcaption>
                  <p className="hr-admin-productivity-description">
                    {selectedProductivityMetric.description}
                  </p>
                  {chartRows.length ? (
                    <>
                      <div className="hr-admin-chart-caption">
                        <span>
                          <i aria-hidden="true" />
                          {selectedProductivityMetric.label}
                          <small> · {chartRows.length} staff · Highest first</small>
                        </span>
                        <strong>
                          {productivityMetric === 'sales' || productivityMetric === 'salesPerHour'
                            ? currencyCode
                            : selectedProductivityMetric.unit}
                        </strong>
                      </div>
                      <div
                        className="hr-admin-chart-viewport"
                        role="region"
                        aria-label={`Staff ${selectedProductivityMetric.label.toLowerCase()} bar chart`}
                        tabIndex={0}
                      >
                        <div className="hr-admin-chart-plot" style={{ minWidth: chartWidth }}>
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart
                              data={chartRows}
                              margin={{ top: 26, right: 22, left: 2, bottom: 6 }}
                              barCategoryGap="30%"
                              accessibilityLayer
                            >
                              <defs>
                                <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#1677ff" />
                                  <stop offset="100%" stopColor="#76b5ff" />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="2 4"
                                stroke="#e3eaf5"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="employeeName"
                                interval={0}
                                height={48}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#52617a', fontSize: 11 }}
                                tickFormatter={(value: string) =>
                                  value.length > 18 ? `${value.slice(0, 17)}…` : value
                                }
                              />
                              <YAxis
                                width={58}
                                tickMargin={8}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={productivityMetric !== 'transactions'}
                                tick={{ fill: '#52617a', fontSize: 11 }}
                                tickFormatter={(value: number) =>
                                  productivityMetric === 'sales' ||
                                  productivityMetric === 'salesPerHour'
                                    ? compactMoney(value, currencyCode)
                                    : compactValue(value)
                                }
                                domain={[0, (maximum: number) => Math.max(1, maximum)]}
                              />
                              <Tooltip
                                cursor={{ fill: '#eef5ff' }}
                                labelFormatter={(label) => String(label)}
                                formatter={(value) => [
                                  productivityMetric === 'sales' ||
                                  productivityMetric === 'salesPerHour'
                                    ? money(Number(value), currencyCode)
                                    : productivityMetric === 'workedHours'
                                      ? `${Number(value).toFixed(1)} hours`
                                      : Number(value).toLocaleString('en-KE'),
                                  selectedProductivityMetric.label,
                                ]}
                              />
                              <ReferenceLine y={0} stroke="#c5d2e5" />
                              <Bar
                                dataKey="chartValue"
                                name={selectedProductivityMetric.label}
                                maxBarSize={60}
                                radius={[6, 6, 0, 0]}
                                isAnimationActive={false}
                              >
                                {chartRows.map((person) => (
                                  <Cell key={person.employeeId} fill={`url(#${chartGradientId})`} />
                                ))}
                                <LabelList
                                  dataKey="chartValue"
                                  position="top"
                                  fill="#52617a"
                                  fontSize={10}
                                  formatter={(value) =>
                                    productivityMetric === 'sales' ||
                                    productivityMetric === 'salesPerHour'
                                      ? compactMoney(Number(value), currencyCode)
                                      : compactValue(Number(value))
                                  }
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <p className="hr-admin-chart-help">
                        Hover over a bar for its exact value. Scroll sideways to see all staff.
                      </p>
                      {!chartHasValues && (
                        <p className="hr-admin-chart-note">
                          No {selectedProductivityMetric.label.toLowerCase()} recorded for this
                          month and filter.
                        </p>
                      )}
                      {chartRows.length < reportStaff.length && (
                        <p className="hr-admin-chart-note">
                          {reportStaff.length - chartRows.length} staff member(s) without confirmed
                          hours are excluded from sales per hour.
                        </p>
                      )}
                      <p className="hr-admin-chart-footnote">
                        POS sales use the recorded cashier; restaurant orders use the logged-in
                        operator. Sales per hour uses confirmed work; exact values are listed below.
                      </p>
                    </>
                  ) : (
                    <p className="hr-admin-empty" role="status">
                      No {selectedProductivityMetric.label.toLowerCase()} available to compare.
                      Confirmed attendance is needed to calculate sales per hour.
                    </p>
                  )}
                </figure>
                <div className="hr-admin-table-scroll">
                  <table className="hr-admin-table">
                    <thead>
                      <tr>
                        <th>Staff member</th>
                        <th>Working hours</th>
                        <th>Work days</th>
                        <th>Transactions</th>
                        <th>Recorded sales</th>
                        <th>Sales / hour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportStaff.map((person) => (
                        <tr key={person.employeeId}>
                          <td>
                            {person.employeeName}
                            <small>{person.jobTitle || 'Staff member'}</small>
                          </td>
                          <td>{hours(person.workedMinutes)}</td>
                          <td>{person.workingDays}</td>
                          <td>{person.transactions}</td>
                          <td>{money(person.sales, currencyCode)}</td>
                          <td>
                            {Number(person.workedMinutes) > 0
                              ? money(
                                  person.sales / (Number(person.workedMinutes) / 60),
                                  currencyCode,
                                )
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="hr-admin-empty">No staff match these filters.</p>
            ))}
        </section>
      )}

      {review && (
        <div className="hr-admin-dialog-backdrop">
          <section
            className="hr-admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hr-review-title"
          >
            <h2 id="hr-review-title">
              {review.status === 'APPROVED' ? 'Approve request?' : 'Decline request?'}
            </h2>
            <p>
              {review.request.employeeName} · {leaveType(review.request)} ·{' '}
              {review.request.startDate} – {review.request.endDate}
            </p>
            <label>
              Review note
              <textarea
                value={reviewNote}
                maxLength={500}
                required
                onChange={(event) => setReviewNote(event.target.value)}
              />
            </label>
            {decisionMutation.isError && (
              <p className="hr-admin-error" role="alert">
                {decisionMutation.error.message}
              </p>
            )}
            <footer>
              <button
                type="button"
                disabled={decisionMutation.isPending}
                onClick={() => setReview(undefined)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={decisionMutation.isPending || !reviewNote.trim()}
                onClick={() => decisionMutation.mutate()}
              >
                {decisionMutation.isPending
                  ? 'Saving…'
                  : review.status === 'APPROVED'
                    ? 'Approve request'
                    : 'Decline request'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
