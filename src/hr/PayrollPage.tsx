import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPayrollFunding,
  getPayrollLossEligibility,
  getPayrollReports,
  getPayrollSetup,
  getPayrollWorkspace,
  runPayrollAction,
  savePayrollAdjustment,
  savePayrollBonusRule,
  savePayrollFunding,
  savePayrollLoss,
} from '../services/hr';
import type { PayrollEmployee, PayrollLine, PayrollWorkspace } from '../services/hr';

type PayrollTab =
  'overview' | 'staff' | 'bonuses' | 'deductions' | 'funding' | 'payroll' | 'reports';
type PayrollView = 'monthly' | 'history';
const tabs: Array<[PayrollTab, string]> = [
  ['overview', 'Overview'],
  ['staff', 'Staff'],
  ['bonuses', 'Bonuses'],
  ['deductions', 'Losses & deductions'],
  ['funding', 'Salary funding'],
  ['payroll', 'Payroll'],
  ['reports', 'Reports'],
];

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Nairobi' });
const monthToday = () => today().slice(0, 7);
const uuid = () => crypto.randomUUID();
const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function PayrollPage({ currencyCode }: { currencyCode: string }) {
  const [month, setMonth] = useState(monthToday);
  const [tab, setTab] = useState<PayrollTab>('overview');
  const [payrollView, setPayrollView] = useState<PayrollView>('monthly');
  const [branchId, setBranchId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const setup = useQuery({ queryKey: ['payroll-setup'], queryFn: getPayrollSetup });
  const workspace = useQuery({
    queryKey: ['payroll-workspace', month],
    queryFn: () => getPayrollWorkspace(month),
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payroll-workspace'] }),
      queryClient.invalidateQueries({ queryKey: ['payroll-funding'] }),
      queryClient.invalidateQueries({ queryKey: ['payroll-setup'] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      setErrorMessage('');
      setMessage('Your changes have been saved.');
      await invalidate();
    },
    onError: (error: Error) => {
      setMessage('');
      setErrorMessage(error.message || 'The change could not be saved.');
    },
  });
  const run = workspace.data;
  const activeRun = run?.run;
  const preview = activeRun && activeRun.status !== 'REOPENED' ? activeRun.payroll : run?.preview;
  const employees = setup.data?.employees ?? [];
  const locations = setup.data?.locations.filter((location) => location.active) ?? [];
  const visibleEmployees = employees.filter(
    (employee) =>
      (!branchId || employee.locationId === branchId) &&
      `${employee.fullName} ${employee.employeeNumber} ${employee.locationName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const visiblePayrollLines = (preview?.lines ?? []).filter(
    (line) =>
      (!branchId ||
        line.locationId === branchId ||
        line.funding?.some((share) => share.locationId === branchId)) &&
      `${line.employeeName} ${line.employeeNumber} ${line.locationName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const scopedWorkspace = useMemo(() => {
    if (!workspace.data) return undefined;
    const normalized = {
      ...workspace.data,
      adjustments: workspace.data.adjustments ?? [],
      losses: workspace.data.losses ?? [],
      detectedLosses: workspace.data.detectedLosses ?? [],
    };
    if (!branchId) return normalized;
    const scopedEmployees = new Set(
      employees
        .filter((employee) => employee.locationId === branchId)
        .map((employee) => employee.id),
    );
    return {
      ...normalized,
      adjustments: normalized.adjustments.filter((adjustment) =>
        scopedEmployees.has(adjustment.employeeId),
      ),
      losses: normalized.losses.filter((loss) => loss.locationId === branchId),
      detectedLosses: normalized.detectedLosses.filter((loss) => loss.locationId === branchId),
    };
  }, [workspace.data, branchId, employees]);
  const money = (value: number | string | null | undefined) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  const startOfMonth = `${month}-01`;
  const endOfMonth = useMemo(() => {
    const [year, selectedMonth] = month.split('-').map(Number);
    return new Date(Date.UTC(year, selectedMonth, 0)).toISOString().slice(0, 10);
  }, [month]);

  return (
    <section className="platform-workspace hr-workspace payroll-workspace">
      <header className="platform-workspace-header">
        <div>
          <p>PEOPLE, PAY & PERFORMANCE</p>
          <h1>Payroll</h1>
          <p>Manage salary funding, bonuses, losses, payroll approvals and payment records.</p>
        </div>
      </header>

      <div className="payroll-toolbar">
        <label>
          Payroll month
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={month}
            disabled={mutation.isPending}
            onChange={(event) => {
              if (event.target.value) {
                setMonth(event.target.value);
                setMessage('');
                setErrorMessage('');
              }
            }}
          />
        </label>
        <label className="payroll-search">
          Search staff
          <input
            type="search"
            placeholder="Name, employee number or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Store / shop
          <select
            aria-label="Filter payroll by location"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">All stores and shops</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary-action compact-action"
          disabled={workspace.isFetching || setup.isFetching}
          onClick={() => void invalidate()}
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
        </button>
      </div>

      <nav className="payroll-tabs" aria-label="Payroll sections">
        {tabs.map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={tab === key ? 'active' : ''}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && (
        <p className="message-banner success" role="status">
          {message}
        </p>
      )}
      {(errorMessage || workspace.error || setup.error) && (
        <p className="message-banner error" role="alert">
          {errorMessage || workspace.error?.message || setup.error?.message}
        </p>
      )}
      {(workspace.isPending || setup.isPending) && <p role="status">Loading payroll records…</p>}
      {branchId && (
        <p className="payroll-filter-note" role="status">
          Location filters narrow the displayed records. Payroll totals and approval still cover all
          locations.
        </p>
      )}
      {workspace.data && setup.data && (
        <>
          {tab === 'overview' && (
            <>
              <section className="payroll-stat-grid" aria-label={`${month} payroll summary`}>
                <Stat label="Employees in payroll" value={visiblePayrollLines.length} />
                <Stat label="Base salaries" value={money(preview?.totalBaseSalary)} />
                <Stat label="Bonuses" value={money(preview?.totalBonuses)} />
                <Stat label="Net payroll" value={money(preview?.totalNetPay)} />
              </section>
              <div className="payroll-shortcuts">
                <button type="button" onClick={() => setTab('bonuses')}>
                  <i className="bi bi-gift" aria-hidden="true" /> Set bonus rules
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayrollView('monthly');
                    setTab('payroll');
                  }}
                >
                  <i className="bi bi-wallet2" aria-hidden="true" /> Open payroll
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </div>
              <Panel title="Cash shortages">
                <Table headers={['Date', 'Location', 'Shortage', 'Action']}>
                  {scopedWorkspace?.detectedLosses
                    .filter((loss) => !loss.recordedLossId)
                    .map((loss) => (
                      <tr key={loss.sourceKey}>
                        <td>{loss.date}</td>
                        <td>{loss.locationName}</td>
                        <td>{money(loss.amount)}</td>
                        <td>
                          <button
                            className="secondary-action compact-action"
                            type="button"
                            onClick={() => setTab('deductions')}
                          >
                            Review / allocate
                          </button>
                        </td>
                      </tr>
                    ))}
                  {!scopedWorkspace?.detectedLosses.some((loss) => !loss.recordedLossId) && (
                    <tr>
                      <td colSpan={4}>No pending cash shortages.</td>
                    </tr>
                  )}
                </Table>
              </Panel>
            </>
          )}

          {tab === 'staff' && (
            <Panel title="Staff directory">
              <Table
                headers={[
                  'Employee',
                  'System account',
                  'Assigned role',
                  'Location',
                  'Monthly salary',
                  'Status',
                ]}
              >
                {visibleEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      {employee.fullName}
                      <small className="table-subtext">{employee.employeeNumber}</small>
                    </td>
                    <td>{employee.userEmail || 'Not linked'}</td>
                    <td>{employee.userId ? employee.roleName || 'No role assigned' : '—'}</td>
                    <td>{employee.locationName}</td>
                    <td>{money(employee.baseSalary)}</td>
                    <td>{employee.active ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </Table>
            </Panel>
          )}

          {tab === 'bonuses' && (
            <BonusPanel
              locations={locations.filter(
                (location) => location.type === 'SHOP' && (!branchId || location.id === branchId),
              )}
              rules={setup.data.rules.filter((rule) => !branchId || rule.locationId === branchId)}
              busy={mutation.isPending}
              onSave={(value) => mutation.mutate(() => savePayrollBonusRule(value))}
            />
          )}

          {tab === 'deductions' && (
            <DeductionsPanel
              employees={visibleEmployees.filter((employee) => employee.active)}
              locations={locations.filter((location) => !branchId || location.id === branchId)}
              data={scopedWorkspace ?? workspace.data}
              busy={mutation.isPending}
              money={money}
              onAdjustment={(value, id) => mutation.mutate(() => savePayrollAdjustment(value, id))}
              onLoss={(value) => mutation.mutate(() => savePayrollLoss(value))}
            />
          )}

          {tab === 'funding' && (
            <FundingPanel
              month={month}
              employees={employees.filter((employee) => employee.active)}
              locations={locations}
              branchId={branchId}
              money={money}
              busy={mutation.isPending}
              onSave={(value) => mutation.mutate(() => savePayrollFunding(month, value))}
            />
          )}

          {tab === 'payroll' && (
            <PayrollPanel
              month={month}
              lines={visiblePayrollLines}
              preview={preview ?? workspace.data.preview}
              status={activeRun?.status ?? 'DRAFT'}
              reference={activeRun?.paymentReference}
              busy={mutation.isPending}
              money={money}
              run={(action, command) =>
                mutation.mutate(() => runPayrollAction(month, action, command))
              }
              view={payrollView}
              onViewChange={setPayrollView}
              employees={visibleEmployees}
              branchId={branchId}
            />
          )}

          {tab === 'reports' && <ReportsPanel from={startOfMonth} to={endOfMonth} money={money} />}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="platform-workspace-panel">
      <header className="payroll-panel-header">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function BonusPanel({
  locations,
  rules,
  busy,
  onSave,
}: {
  locations: Array<{ id: string; name: string }>;
  rules: Array<{
    id: string;
    locationId: string;
    locationName: string;
    effectiveFrom: string;
    dailyTarget: number;
    bonusMode: string;
    bonusValue: number;
    enabled: boolean;
  }>;
  busy: boolean;
  onSave: (value: {
    id?: string;
    locationId: string;
    effectiveFrom: string;
    dailyTarget: number;
    bonusMode: 'FIXED' | 'PERCENT_EXCESS';
    bonusValue: number;
    enabled: boolean;
  }) => void;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [date, setDate] = useState(today);
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState<'FIXED' | 'PERCENT_EXCESS'>('FIXED');
  const [value, setValue] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string>();
  const editRule = (rule: (typeof rules)[number]) => {
    setEditingId(rule.id);
    setLocationId(rule.locationId);
    setDate(rule.effectiveFrom);
    setTarget(String(rule.dailyTarget));
    setMode(rule.bonusMode as typeof mode);
    setValue(String(rule.bonusValue));
    setEnabled(rule.enabled);
  };
  const resetRule = () => {
    setEditingId(undefined);
    setDate(today);
    setTarget('');
    setMode('FIXED');
    setValue('');
    setEnabled(true);
  };
  useEffect(() => {
    if (!locations.some((location) => location.id === locationId)) {
      setLocationId(locations[0]?.id ?? '');
      setEditingId(undefined);
    }
  }, [locations, locationId]);
  return (
    <>
      <Panel title="Automatic shop bonus rules">
        <p>Bonus rules calculate employee rewards from their recorded shop sales.</p>
        <form
          className="hr-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              id: editingId,
              locationId,
              effectiveFrom: date,
              dailyTarget: Number(target),
              bonusMode: mode,
              bonusValue: Number(value),
              enabled,
            });
          }}
        >
          <label>
            Shop
            <select
              required
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Effective from
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Daily sales target
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            />
          </label>
          <label>
            Bonus method
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
              <option value="FIXED">Fixed amount for each qualifying day</option>
              <option value="PERCENT_EXCESS">Percentage of sales above target</option>
            </select>
          </label>
          <label>
            {mode === 'FIXED' ? 'Bonus per qualifying day' : 'Percent of sales above target'}
            <input
              type="number"
              min="0"
              max={mode === 'FIXED' ? undefined : '100'}
              step="0.01"
              required
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <label className="hr-checkbox-label">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />{' '}
            Rule enabled
          </label>
          <div className="hr-row-actions">
            <button className="primary-action" type="submit" disabled={busy || !locations.length}>
              {editingId ? 'Update bonus rule' : 'Save bonus rule'}
            </button>
            {editingId && (
              <button className="secondary-action" type="button" onClick={resetRule}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Panel>
      <Panel title="Current bonus rules">
        <Table
          headers={[
            'Shop',
            'Effective date',
            'Daily target',
            'Method',
            'Reward',
            'Status',
            'Actions',
          ]}
        >
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td>{rule.locationName}</td>
              <td>{rule.effectiveFrom}</td>
              <td>{rule.dailyTarget}</td>
              <td>
                {rule.bonusMode === 'FIXED' ? 'Fixed per qualifying day' : 'Percent above target'}
              </td>
              <td>{rule.bonusMode === 'FIXED' ? rule.bonusValue : `${rule.bonusValue}%`}</td>
              <td>{rule.enabled ? 'Enabled' : 'Disabled'}</td>
              <td>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => editRule(rule)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
          {!rules.length && (
            <tr>
              <td colSpan={7}>No bonus rules have been configured.</td>
            </tr>
          )}
        </Table>
      </Panel>
    </>
  );
}

function DeductionsPanel({
  employees,
  locations,
  data,
  busy,
  money,
  onAdjustment,
  onLoss,
}: {
  employees: PayrollEmployee[];
  locations: Array<{ id: string; name: string }>;
  data: PayrollWorkspace;
  busy: boolean;
  money: (value: number | string | null | undefined) => string;
  onAdjustment: (
    value: {
      employeeId: string;
      requestKey: string;
      effectiveDate: string;
      kind: 'MANUAL_BONUS' | 'AUTO_BONUS_OVERRIDE' | 'DEDUCTION';
      amount: number;
      reason: string;
      active: boolean;
    },
    id?: string,
  ) => void;
  onLoss: (value: {
    requestKey: string;
    sourceKey?: string;
    locationId: string;
    occurredOn: string;
    deductionDate: string;
    amount: number;
    recoverableAmount: number;
    allocationMode: 'CUSTOM' | 'WAIVED';
    reason: string;
    allocations: Array<{ employeeId: string; amount: number }>;
  }) => void;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [kind, setKind] = useState<'MANUAL_BONUS' | 'AUTO_BONUS_OVERRIDE' | 'DEDUCTION'>(
    'MANUAL_BONUS',
  );
  const [effectiveDate, setEffectiveDate] = useState(`${data.month}-01`);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sourceLoss, setSourceLoss] = useState('');
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '');
  const [lossDate, setLossDate] = useState(today);
  const [recoveries, setRecoveries] = useState<Record<string, string>>({});
  const [recoverableAmount, setRecoverableAmount] = useState('');
  const [lossAmount, setLossAmount] = useState('');
  const [lossReason, setLossReason] = useState('');
  useEffect(() => {
    if (!employees.some((employee) => employee.id === employeeId)) {
      setEmployeeId(employees[0]?.id ?? '');
    }
    if (!locations.some((location) => location.id === locationId)) {
      setLocationId(locations[0]?.id ?? '');
    }
    if (!data.detectedLosses.some((loss) => loss.sourceKey === sourceLoss)) {
      setSourceLoss('');
    }
  }, [data.detectedLosses, employeeId, employees, locationId, locations, sourceLoss]);
  const eligibility = useQuery({
    queryKey: ['payroll-loss-eligibility', locationId, lossDate],
    queryFn: () => getPayrollLossEligibility(locationId, lossDate),
    enabled: Boolean(locationId && lossDate),
  });
  const detected = data.detectedLosses.find((loss) => loss.sourceKey === sourceLoss);
  const eligible = eligibility.data ?? [];
  const periodStart = `${data.month}-01`;
  const [periodYear, periodMonth] = data.month.split('-').map(Number);
  const periodEnd = new Date(Date.UTC(periodYear, periodMonth, 0)).toISOString().slice(0, 10);
  const occurredOn = detected?.date ?? lossDate;
  const deductionDate = occurredOn < periodStart ? periodStart : occurredOn;
  const totalLoss = Number(detected?.amount ?? lossAmount);
  const recoverable = Number(recoverableAmount || 0);
  const allocations = Object.entries(recoveries).map(([id, value]) => ({
    employeeId: id,
    amount: Number(value || 0),
  }));
  const allocationTotal = allocations.reduce((total, allocation) => total + allocation.amount, 0);
  const validRecovery =
    recoverable >= 0 &&
    recoverable <= totalLoss &&
    (recoverable === 0
      ? allocations.length === 0
      : allocations.length > 0 &&
        allocations.every((allocation) => allocation.amount > 0) &&
        Math.round(allocationTotal * 100) === Math.round(recoverable * 100));
  return (
    <>
      <Panel title="Bonuses and other salary adjustments">
        <form
          className="hr-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onAdjustment({
              requestKey: uuid(),
              employeeId,
              effectiveDate,
              kind,
              amount: Number(amount),
              reason,
              active: true,
            });
          }}
        >
          <label>
            Employee
            <select
              required
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} · {employee.employeeNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Effective date
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
          </label>
          <label>
            Adjustment type
            <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
              <option value="MANUAL_BONUS">Manual bonus</option>
              <option value="AUTO_BONUS_OVERRIDE">
                Override automatic sales bonus for this day
              </option>
              <option value="DEDUCTION">Other salary deduction</option>
            </select>
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label>
            Reason
            <input
              maxLength={500}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="primary-action" type="submit" disabled={busy || !employees.length}>
            Save adjustment
          </button>
        </form>
      </Panel>
      <Panel title="Record a loss or review a cash shortage">
        <form
          className="hr-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onLoss({
              requestKey: uuid(),
              sourceKey: detected?.sourceKey,
              locationId: detected?.locationId ?? locationId,
              occurredOn,
              deductionDate,
              amount: totalLoss,
              recoverableAmount: recoverable,
              allocationMode: allocations.length ? 'CUSTOM' : 'WAIVED',
              reason: lossReason,
              allocations,
            });
          }}
        >
          <label>
            Pending POS shortage
            <select
              value={sourceLoss}
              onChange={(event) => {
                const selected = data.detectedLosses.find(
                  (loss) => loss.sourceKey === event.target.value,
                );
                setSourceLoss(event.target.value);
                if (selected) {
                  setLocationId(selected.locationId);
                  setLossDate(selected.date);
                  setLossAmount(String(selected.amount));
                  setRecoveries({});
                  setRecoverableAmount('');
                }
              }}
            >
              <option value="">Record a manual loss</option>
              {data.detectedLosses
                .filter((loss) => !loss.recordedLossId)
                .map((loss) => (
                  <option key={loss.sourceKey} value={loss.sourceKey}>
                    {loss.locationName} · {loss.date} · {money(loss.amount)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Store or shop
            <select
              required
              disabled={Boolean(detected)}
              value={detected?.locationId ?? locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                setRecoveries({});
                setRecoverableAmount('');
              }}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Loss date
            <input
              type="date"
              required
              disabled={Boolean(detected)}
              value={detected?.date ?? lossDate}
              onChange={(event) => {
                setLossDate(event.target.value);
                setRecoveries({});
                setRecoverableAmount('');
              }}
            />
          </label>
          <label>
            Total loss
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              readOnly={Boolean(detected)}
              value={detected?.amount ?? lossAmount}
              onChange={(event) => setLossAmount(event.target.value)}
            />
          </label>
          <label>
            Recoverable from staff
            <input
              type="number"
              min="0"
              max={totalLoss || undefined}
              step="0.01"
              value={recoverableAmount}
              onChange={(event) => setRecoverableAmount(event.target.value)}
            />
          </label>
          <fieldset className="payroll-share-fieldset">
            <legend>Allocate recovery among staff present · {money(allocationTotal)}</legend>
            {eligible.map((person) => (
              <label key={person.employeeId}>
                <input
                  type="checkbox"
                  checked={recoveries[person.employeeId] !== undefined}
                  onChange={(event) =>
                    setRecoveries((current) => {
                      if (!event.target.checked) {
                        const next = { ...current };
                        delete next[person.employeeId];
                        return next;
                      }
                      return { ...current, [person.employeeId]: '' };
                    })
                  }
                />
                {person.employeeName}
                {recoveries[person.employeeId] !== undefined && (
                  <input
                    aria-label={`${person.employeeName} recovery amount`}
                    type="number"
                    min="0.01"
                    max={totalLoss || undefined}
                    step="0.01"
                    required
                    value={recoveries[person.employeeId]}
                    onChange={(event) =>
                      setRecoveries((current) => ({
                        ...current,
                        [person.employeeId]: event.target.value,
                      }))
                    }
                  />
                )}
              </label>
            ))}
            {!eligible.length && <p>No staff with confirmed attendance are eligible.</p>}
          </fieldset>
          <p className="payroll-recovery-summary">
            Payroll deduction date: {deductionDate}. Business absorbs{' '}
            {money(totalLoss - recoverable)}.
          </p>
          <label>
            Reason / decision
            <input
              required
              maxLength={500}
              value={lossReason}
              onChange={(event) => setLossReason(event.target.value)}
            />
          </label>
          {eligibility.isError && <p role="alert">{eligibility.error.message}</p>}
          <button
            className="primary-action"
            type="submit"
            disabled={
              busy ||
              eligibility.isPending ||
              !locations.length ||
              !Number.isFinite(totalLoss) ||
              totalLoss <= 0 ||
              occurredOn > periodEnd ||
              !validRecovery
            }
          >
            Save loss decision
          </button>
        </form>
      </Panel>
      <Panel title="Payroll adjustments">
        <Table headers={['Date', 'Employee', 'Type', 'Amount', 'Reason', 'Status', 'Actions']}>
          {data.adjustments.map((adjustment) => (
            <tr key={adjustment.id}>
              <td>{adjustment.effectiveDate}</td>
              <td>{adjustment.employeeName}</td>
              <td>
                {adjustment.kind === 'MANUAL_BONUS'
                  ? 'Manual bonus'
                  : adjustment.kind === 'AUTO_BONUS_OVERRIDE'
                    ? 'Automatic bonus override'
                    : 'Deduction'}
              </td>
              <td>{money(adjustment.amount)}</td>
              <td>{adjustment.reason}</td>
              <td>{adjustment.active ? 'Applied' : 'Cancelled'}</td>
              <td>
                {adjustment.active && (
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onAdjustment(
                        {
                          requestKey: adjustment.requestKey,
                          employeeId: adjustment.employeeId,
                          effectiveDate: adjustment.effectiveDate,
                          kind: adjustment.kind,
                          amount: adjustment.amount,
                          reason: adjustment.reason,
                          active: false,
                        },
                        adjustment.id,
                      )
                    }
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!data.adjustments.length && (
            <tr>
              <td colSpan={7}>No adjustments for this month.</td>
            </tr>
          )}
        </Table>
      </Panel>
      <Panel title="Recorded losses">
        <Table
          headers={[
            'Loss date',
            'Location',
            'Total loss',
            'Staff deductions',
            'Business absorbs',
            'Reason',
          ]}
        >
          {data.losses.map((loss) => (
            <tr key={loss.id}>
              <td>{loss.occurredOn}</td>
              <td>{loss.locationName}</td>
              <td>{money(loss.amount)}</td>
              <td>
                {money(loss.recoverableAmount)}
                {loss.allocations.map((share) => (
                  <small className="table-subtext" key={share.employeeId}>
                    {share.employeeName}: {money(share.amount)}
                  </small>
                ))}
              </td>
              <td>{money(loss.waivedAmount)}</td>
              <td>{loss.reason}</td>
            </tr>
          ))}
          {!data.losses.length && (
            <tr>
              <td colSpan={6}>No losses recorded for this month.</td>
            </tr>
          )}
        </Table>
      </Panel>
    </>
  );
}

function FundingPanel({
  month,
  employees,
  locations,
  branchId,
  money,
  busy,
  onSave,
}: {
  month: string;
  employees: PayrollEmployee[];
  locations: Array<{ id: string; name: string }>;
  branchId: string;
  money: (value: number | string | null | undefined) => string;
  busy: boolean;
  onSave: (value: Record<string, unknown>) => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [salary, setSalary] = useState('');
  const [shares, setShares] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const funding = useQuery({
    queryKey: ['payroll-funding', month],
    queryFn: () => getPayrollFunding(month),
  });
  const plans =
    (funding.data?.plans as
      | Array<{
          id: string;
          employeeId: string;
          employeeName: string;
          month: string;
          monthlySalary: number;
          reason?: string;
          shares: Array<{
            locationId: string;
            locationName: string;
            percentage: number;
            amount: number;
          }>;
        }>
      | undefined) ?? [];
  const visiblePlans = plans.filter(
    (plan) =>
      !branchId ||
      plan.shares.some((share) => share.locationId === branchId) ||
      employees.some(
        (employee) => employee.id === plan.employeeId && employee.locationId === branchId,
      ),
  );
  const selectedEmployee = employees.find((employee) => employee.id === employeeId);
  const shareTotal = Object.values(shares).reduce(
    (total, percentage) => total + Number(percentage || 0),
    0,
  );
  const hasShares = Object.keys(shares).length > 0;
  const validShares = !hasShares || Math.round(shareTotal * 100) === 10000;
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employeeId) return;
    onSave({
      employeeId,
      monthlySalary: Number(salary || selectedEmployee?.baseSalary || 0),
      reason,
      shares: Object.entries(shares).map(([locationId, percentage]) => ({
        locationId,
        percentage: Number(percentage),
      })),
    });
  };
  return (
    <>
      <Panel title={`Salary funding · ${month}`}>
        <p>
          Set an effective monthly salary and split its funding across locations. With no locations
          selected, the employee’s home location funds the salary.
        </p>
        {funding.isError && <p role="alert">{funding.error.message}</p>}
        <form className="hr-form-grid" onSubmit={save}>
          <label>
            Employee
            <select
              required
              value={employeeId}
              disabled={funding.isPending || funding.isError}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                const person = employees.find((employee) => employee.id === event.target.value);
                const existingPlan = plans.find((plan) => plan.employeeId === event.target.value);
                setSalary(String(existingPlan?.monthlySalary ?? person?.baseSalary ?? ''));
                setShares(
                  existingPlan?.shares.length
                    ? Object.fromEntries(
                        existingPlan.shares.map((share) => [
                          share.locationId,
                          String(share.percentage),
                        ]),
                      )
                    : person
                      ? { [person.locationId]: '100' }
                      : {},
                );
              }}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Effective salary
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={salary}
              onChange={(event) => setSalary(event.target.value)}
            />
          </label>
          <fieldset className="payroll-share-fieldset">
            <legend>Funding shares {hasShares && `· ${shareTotal.toFixed(2)}%`}</legend>
            {locations.map((location) => (
              <label key={location.id}>
                <input
                  type="checkbox"
                  checked={shares[location.id] !== undefined}
                  onChange={(event) =>
                    setShares((current) => {
                      if (!event.target.checked) {
                        const next = { ...current };
                        delete next[location.id];
                        return next;
                      }
                      return {
                        ...current,
                        [location.id]: selectedEmployee?.locationId === location.id ? '100' : '',
                      };
                    })
                  }
                />
                {location.name}
                {shares[location.id] !== undefined && (
                  <input
                    aria-label={`${location.name} funding percentage`}
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    required
                    value={shares[location.id]}
                    onChange={(event) =>
                      setShares((current) => ({ ...current, [location.id]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </fieldset>
          <label>
            Reason
            <input
              maxLength={500}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button
            className="primary-action"
            type="submit"
            disabled={busy || funding.isPending || funding.isError || !employeeId || !validShares}
          >
            Save salary funding
          </button>
        </form>
      </Panel>
      <Panel title="Effective salary plans">
        <Table
          headers={['Employee', 'Effective month', 'Monthly salary', 'Funding shares', 'Reason']}
        >
          {visiblePlans.map((plan) => (
            <tr key={String(plan.id)}>
              <td>{String(plan.employeeName)}</td>
              <td>{String(plan.month)}</td>
              <td>{money(Number(plan.monthlySalary))}</td>
              <td>
                {Array.isArray(plan.shares)
                  ? (
                      plan.shares as Array<{
                        locationName: string;
                        percentage: number;
                        amount: number;
                      }>
                    )
                      .map(
                        (share) =>
                          `${share.locationName} ${share.percentage}% · ${money(share.amount)}`,
                      )
                      .join(', ') || 'Home location'
                  : 'Home location'}
              </td>
              <td>{String(plan.reason ?? '')}</td>
            </tr>
          ))}
          {!funding.isPending && !visiblePlans.length && (
            <tr>
              <td colSpan={5}>No salary funding plans for this period.</td>
            </tr>
          )}
        </Table>
      </Panel>
    </>
  );
}

function PayrollPanel({
  month,
  lines,
  preview,
  status,
  reference,
  busy,
  money,
  run,
  view,
  onViewChange,
  employees,
  branchId,
}: {
  month: string;
  lines: PayrollLine[];
  preview: { token: string; lines: PayrollLine[]; totalNetPay: number };
  status: string;
  reference?: string;
  busy: boolean;
  money: (value: number | string | null | undefined) => string;
  run: (action: 'approve' | 'paid' | 'reopen', command: Record<string, unknown>) => void;
  view: PayrollView;
  onViewChange: (view: PayrollView) => void;
  employees: PayrollEmployee[];
  branchId: string;
}) {
  const [paymentReference, setPaymentReference] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  return (
    <>
      <nav className="payroll-view-tabs" aria-label="Payroll views">
        <button
          type="button"
          className={view === 'monthly' ? 'active' : ''}
          aria-pressed={view === 'monthly'}
          onClick={() => onViewChange('monthly')}
        >
          <i className="bi bi-calendar3" aria-hidden="true" /> Monthly payroll
        </button>
        <button
          type="button"
          className={view === 'history' ? 'active' : ''}
          aria-pressed={view === 'history'}
          onClick={() => onViewChange('history')}
        >
          <i className="bi bi-clock-history" aria-hidden="true" /> Staff history
        </button>
      </nav>
      {view === 'history' ? (
        <PayrollHistoryPanel month={month} employees={employees} money={money} />
      ) : (
        <Panel
          title={`Payroll · ${month}`}
          action={
            <button
              type="button"
              className="secondary-action compact-action"
              disabled={!lines.length}
              onClick={() =>
                downloadCsv(`payroll-${month}.csv`, [
                  [
                    'Employee',
                    'Employee number',
                    'Location',
                    'Base salary',
                    'Net sales',
                    'Transactions',
                    'Sales bonus',
                    'Manual bonus',
                    'Deductions',
                    'Net pay',
                  ],
                  ...lines.map((line) => [
                    line.employeeName,
                    line.employeeNumber,
                    line.locationName,
                    line.baseSalary,
                    line.netSales,
                    line.transactions,
                    line.automaticBonus,
                    line.manualBonus,
                    Number(line.lossDeductions) + Number(line.otherDeductions),
                    line.netPay,
                  ]),
                ])
              }
            >
              <i className="bi bi-download" aria-hidden="true" /> Export CSV
            </button>
          }
        >
          <p>
            Net payroll is base salary plus bonuses less recorded deductions. Review the complete
            payroll before approval.
          </p>
          {branchId && (
            <p className="payroll-filter-note" role="status">
              Showing employees assigned to or funded by the selected location. Payroll totals and
              approval still cover all locations.
            </p>
          )}
          <Table
            headers={[
              'Employee',
              'Location',
              'Funding shares',
              'Base salary',
              'Net sales',
              'Transactions',
              'Sales bonus',
              'Manual bonus',
              'Deductions',
              'Net pay',
            ]}
          >
            {lines.map((line) => (
              <tr key={line.id}>
                <td>
                  {line.employeeName}
                  <small className="table-subtext">{line.employeeNumber}</small>
                </td>
                <td>{line.locationName}</td>
                <td>
                  {line.funding?.length
                    ? line.funding
                        .map(
                          (share) =>
                            `${share.locationName} ${share.percentage}% · ${money(share.amount)}`,
                        )
                        .join(', ')
                    : `Home location · ${money(line.baseSalary)}`}
                </td>
                <td>{money(line.baseSalary)}</td>
                <td>{money(line.netSales)}</td>
                <td>{line.transactions}</td>
                <td>{money(line.automaticBonus)}</td>
                <td>{money(line.manualBonus)}</td>
                <td>{money(Number(line.lossDeductions) + Number(line.otherDeductions))}</td>
                <td>
                  <strong>{money(line.netPay)}</strong>
                </td>
              </tr>
            ))}
            {!lines.length && (
              <tr>
                <td colSpan={10}>No active employees are included in this period.</td>
              </tr>
            )}
          </Table>
          <div className="payroll-run-total">
            <span>{status} · Net payroll for all employees</span>
            <strong>{money(preview.totalNetPay)}</strong>
          </div>
          <div className="payroll-run-actions">
            {(status === 'DRAFT' || status === 'REOPENED') && (
              <button
                className="primary-action"
                type="button"
                disabled={busy || !preview.lines.length}
                onClick={() => run('approve', { previewToken: preview.token })}
              >
                Review & approve payroll
              </button>
            )}
            {status === 'APPROVED' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run('paid', { paymentReference });
                }}
              >
                <label>
                  Payment reference
                  <input
                    required
                    maxLength={180}
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                  />
                </label>
                <button type="submit" className="primary-action" disabled={busy}>
                  Record payment
                </button>
              </form>
            )}
            {['APPROVED', 'PAID'].includes(status) && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  run('reopen', { reason: reopenReason });
                }}
              >
                <label>
                  Reason for reopening
                  <input
                    required
                    maxLength={500}
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                  />
                </label>
                <button type="submit" className="secondary-action" disabled={busy}>
                  Reopen payroll
                </button>
              </form>
            )}
          </div>
          {reference && (
            <p>
              Recorded payment reference: {reference}. This records a payment already made; no
              transfer is initiated.
            </p>
          )}
        </Panel>
      )}
    </>
  );
}

function PayrollHistoryPanel({
  month,
  employees,
  money,
}: {
  month: string;
  employees: PayrollEmployee[];
  money: (value: number | string | null | undefined) => string;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [from, setFrom] = useState(`${month.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(() => {
    const [year, selectedMonth] = month.split('-').map(Number);
    return new Date(Date.UTC(year, selectedMonth, 0)).toISOString().slice(0, 10);
  });
  useEffect(() => {
    const [year, selectedMonth] = month.split('-').map(Number);
    setFrom(`${year}-01-01`);
    setTo(new Date(Date.UTC(year, selectedMonth, 0)).toISOString().slice(0, 10));
  }, [month]);
  useEffect(() => {
    if (employeeId && !employees.some((employee) => employee.id === employeeId)) {
      setEmployeeId('');
    }
  }, [employeeId, employees]);
  const history = useQuery({
    queryKey: ['payroll-staff-history', employeeId, from, to],
    queryFn: () => getPayrollReports(from, to),
    enabled: Boolean(employeeId && from && to && from <= to),
  });
  const employee = employees.find((item) => item.id === employeeId);
  const entries = (history.data?.statements ?? []).filter(
    (statement) => statement.employeeId === employeeId,
  );
  return (
    <Panel title="Staff payroll history">
      <form className="hr-form-grid" onSubmit={(event) => event.preventDefault()}>
        <label>
          Staff member
          <select
            required
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
          >
            <option value="">Choose staff member</option>
            {employees.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName} · {person.employeeNumber}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            min="2000-01-01"
            max={to}
            required
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            min={from}
            max="2100-12-31"
            required
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </form>
      {history.isFetching && <p role="status">Loading staff payroll history…</p>}
      {history.isError && (
        <p className="message-banner error" role="alert">
          {history.error.message}
        </p>
      )}
      {employeeId && history.data && (
        <>
          <header className="payroll-history-heading">
            <div>
              <h3>{employee?.fullName ?? 'Staff member'}</h3>
              <p>{employee?.employeeNumber} · paid payroll statements</p>
            </div>
            <button
              type="button"
              className="secondary-action compact-action"
              disabled={!entries.length}
              onClick={() =>
                downloadCsv(
                  `staff-payroll-${employee?.employeeNumber ?? employeeId}-${from}-${to}.csv`,
                  [
                    [
                      'Payroll month',
                      'Payment date',
                      'Reference',
                      'Base salary',
                      'Bonuses',
                      'Deductions',
                      'Net pay',
                    ],
                    ...entries.map((entry) => [
                      String(entry.period).slice(0, 7),
                      entry.paidAt,
                      entry.paymentReference,
                      entry.baseSalary,
                      Number(entry.automaticBonus) + Number(entry.manualBonus),
                      Number(entry.lossDeductions) + Number(entry.otherDeductions),
                      entry.netPay,
                    ]),
                  ],
                )
              }
            >
              <i className="bi bi-download" aria-hidden="true" /> Export history
            </button>
          </header>
          <Table
            headers={[
              'Payroll month',
              'Payment date',
              'Payment reference',
              'Base salary',
              'Bonuses',
              'Deductions',
              'Net paid',
            ]}
          >
            {entries.map((entry, index) => (
              <tr key={`${entry.period}-${entry.paymentReference}-${index}`}>
                <td>{String(entry.period).slice(0, 7)}</td>
                <td>{entry.paidAt ? new Date(entry.paidAt).toLocaleDateString() : '—'}</td>
                <td>{entry.paymentReference}</td>
                <td>{money(entry.baseSalary)}</td>
                <td>{money(Number(entry.automaticBonus) + Number(entry.manualBonus))}</td>
                <td>{money(Number(entry.lossDeductions) + Number(entry.otherDeductions))}</td>
                <td>
                  <strong>{money(entry.netPay)}</strong>
                </td>
              </tr>
            ))}
            {!entries.length && (
              <tr>
                <td colSpan={7}>No paid payroll records for this staff member and period.</td>
              </tr>
            )}
          </Table>
        </>
      )}
      {!employeeId && <p>Select a staff member to view recorded payroll payments.</p>}
    </Panel>
  );
}

function ReportsPanel({
  from,
  to,
  money,
}: {
  from: string;
  to: string;
  money: (value: number | string | null | undefined) => string;
}) {
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  useEffect(() => {
    setStart(from);
    setEnd(to);
  }, [from, to]);
  const report = useQuery({
    queryKey: ['payroll-reports', start, end],
    queryFn: () => getPayrollReports(start, end),
    enabled: Boolean(start && end && start <= end),
  });
  return (
    <Panel
      title="Payroll payment reports"
      action={
        <button
          type="button"
          className="secondary-action compact-action"
          disabled={!report.data?.statements.length}
          onClick={() =>
            downloadCsv(`payroll-statements-${start}-${end}.csv`, [
              [
                'Payroll month',
                'Employee',
                'Employee number',
                'Base salary',
                'Sales bonus',
                'Manual bonus',
                'Deductions',
                'Net paid',
                'Payment reference',
              ],
              ...(report.data?.statements ?? []).map((statement) => [
                String(statement.period).slice(0, 7),
                statement.employeeName,
                statement.employeeNumber,
                statement.baseSalary,
                statement.automaticBonus,
                statement.manualBonus,
                Number(statement.lossDeductions) + Number(statement.otherDeductions),
                statement.netPay,
                statement.paymentReference,
              ]),
            ])
          }
        >
          <i className="bi bi-download" aria-hidden="true" /> Export CSV
        </button>
      }
    >
      <form className="hr-form-grid" onSubmit={(event) => event.preventDefault()}>
        <label>
          From
          <input
            type="date"
            required
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            required
            min={start}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </form>
      {report.isError && <p role="alert">{report.error.message}</p>}
      <p>
        <strong>Total recorded payroll payments: {money(report.data?.paidTotal)}</strong>
      </p>
      <Table
        headers={[
          'Payroll month',
          'Paid at',
          'Payment reference',
          'Bonuses',
          'Deductions',
          'Net paid',
        ]}
      >
        {(report.data?.monthly ?? []).map((row, index) => (
          <tr key={`${row.period}-${row.paymentReference}-${index}`}>
            <td>{String(row.period).slice(0, 7)}</td>
            <td>{row.paidAt ? new Date(row.paidAt).toLocaleString() : '—'}</td>
            <td>{row.paymentReference}</td>
            <td>{money(row.totalBonuses)}</td>
            <td>{money(row.totalDeductions)}</td>
            <td>{money(row.totalNetPay)}</td>
          </tr>
        ))}
        {!report.isPending && !report.data?.monthly.length && (
          <tr>
            <td colSpan={6}>No payroll payments in this range.</td>
          </tr>
        )}
      </Table>
      <h3 className="payroll-report-heading">Employee payment statements</h3>
      <Table
        headers={[
          'Month',
          'Employee',
          'Base salary',
          'Sales bonus',
          'Manual bonus',
          'Deductions',
          'Net paid',
          'Payment reference',
        ]}
      >
        {(report.data?.statements ?? []).map((statement, index) => (
          <tr key={`${statement.employeeId}-${statement.paymentReference}-${index}`}>
            <td>{String(statement.period).slice(0, 7)}</td>
            <td>
              {statement.employeeName}
              <small className="table-subtext">{statement.employeeNumber}</small>
            </td>
            <td>{money(statement.baseSalary)}</td>
            <td>{money(statement.automaticBonus)}</td>
            <td>{money(statement.manualBonus)}</td>
            <td>{money(Number(statement.lossDeductions) + Number(statement.otherDeductions))}</td>
            <td>{money(statement.netPay)}</td>
            <td>{statement.paymentReference}</td>
          </tr>
        ))}
        {!report.isPending && !report.data?.statements.length && (
          <tr>
            <td colSpan={8}>No employee payment statements in this range.</td>
          </tr>
        )}
      </Table>
    </Panel>
  );
}
