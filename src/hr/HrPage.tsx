import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Branch } from '../data/types';
import { usePlatform } from '../platform/PlatformContext';
import { getUsers } from '../services/api';
import {
  cancelHrShift,
  createHrEmployee,
  createHrShift,
  createHrLeaveRequest,
  createHrLeaveType,
  decideHrLeaveRequest,
  getHrAttendance,
  getHrEmployees,
  getHrOperatingHours,
  getHrLeaveRequests,
  getHrLeaveTypes,
  getHrWorkforce,
  getPayrollPreview,
  saveHrOperatingHours,
  setHrEmployeeActive,
  saveHrAttendance,
  updateHrShift,
  updateHrEmployee,
} from '../services/hr';
import type {
  HrEmployeeRequest,
  HrEmployeeUpdateRequest,
  OperatingHoursDay,
  WorkforceShift,
  WorkforceShiftRequest,
} from '../services/hr';

type HrWorkspace = 'employees' | 'attendance' | 'availability' | 'workforce' | 'hours' | 'payroll';

const businessDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Nairobi' });
const today = () => businessDate();
const currentPeriod = () => businessDate().slice(0, 7);
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const localInput = (value: string) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(value))
    .replace(' ', 'T');
const businessDateTime = (value: string) => new Date(`${value}:00+03:00`).toISOString();
const displayShiftTime = (value: string) =>
  new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));

export default function HrPage({
  workspace,
  currencyCode,
}: {
  workspace: HrWorkspace;
  currencyCode: string;
}) {
  const { branches } = usePlatform();
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({
    queryKey: ['hr-employees'],
    queryFn: () => getHrEmployees(true),
  });
  const employees = employeesQuery.data ?? [];
  const activeEmployees = employees.filter((employee) => employee.active !== false);
  const locations = branches.filter(
    (branch): branch is Branch => branch.branchType === 'STORE' || branch.branchType === 'SHOP',
  );
  const hrLocations = branches.filter(
    (branch): branch is Branch =>
      branch.branchType === 'STORE' ||
      branch.branchType === 'SHOP' ||
      branch.branchType === 'HOTEL',
  );
  const title =
    workspace === 'employees'
      ? 'Staff records'
      : workspace === 'attendance'
        ? 'Attendance'
        : workspace === 'availability'
          ? 'Leave & availability'
          : workspace === 'workforce'
            ? 'Staff schedule'
            : workspace === 'hours'
              ? 'Location hours'
              : 'Payroll preview';

  return (
    <section className="platform-workspace hr-workspace">
      <header className="platform-workspace-header">
        <div>
          <h1>{title}</h1>
          <p>
            {workspace === 'payroll'
              ? 'Review monthly salary, recorded bonuses and deductions. Payroll processing is not available yet.'
              : workspace === 'workforce'
                ? 'Plan and update shifts for staff assigned to your stores and shops.'
                : workspace === 'hours'
                  ? 'Set the weekly opening and closing times for each store or shop.'
                  : 'Manage workforce information for your stores, shops and hotels.'}
          </p>
        </div>
      </header>
      {employeesQuery.isError && <ErrorBanner error={employeesQuery.error} />}
      {employeesQuery.isPending ? (
        <p>Loading staff records…</p>
      ) : (
        <>
          {workspace === 'employees' && (
            <EmployeesPanel
              branches={hrLocations}
              employees={employees}
              currencyCode={currencyCode}
            />
          )}
          {workspace === 'attendance' && (
            <AttendancePanel branches={hrLocations} employees={activeEmployees} />
          )}
          {workspace === 'availability' && (
            <AvailabilityPanel branches={hrLocations} employees={activeEmployees} />
          )}
          {workspace === 'workforce' && (
            <WorkforcePanel
              branches={locations}
              employees={employees.filter(
                (employee) =>
                  employee.active !== false &&
                  Boolean(employee.userId) &&
                  locations.some((branch) => branch.id === employee.branchId),
              )}
            />
          )}
          {workspace === 'hours' && <OperatingHoursPanel branches={locations} />}
          {workspace === 'payroll' && <PayrollPanel currencyCode={currencyCode} />}
        </>
      )}
      <button
        className="secondary-action compact-action"
        type="button"
        onClick={() =>
          queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0]?.toString().startsWith('hr-') ?? false,
          })
        }
      >
        <i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh
      </button>
    </section>
  );
}

function EmployeesPanel({
  branches,
  employees,
  currencyCode,
}: {
  branches: Branch[];
  employees: Awaited<ReturnType<typeof getHrEmployees>>;
  currencyCode: string;
}) {
  const [form, setForm] = useState<HrEmployeeRequest>({
    branchId: branches[0]?.id ?? '',
    firstName: '',
    lastName: '',
    employmentType: 'PERMANENT',
    joiningDate: today(),
    basicSalary: 0,
  });
  const usersQuery = useQuery({ queryKey: ['hr-system-users'], queryFn: getUsers });
  const linkedUserIds = new Set(employees.map((employee) => employee.userId).filter(Boolean));
  const systemUsers = (usersQuery.data ?? []).filter(
    (user) => user.status === 'ACTIVE' && !linkedUserIds.has(user.id),
  );
  const selectedUser = usersQuery.data?.find((user) => user.id === form.userId);
  const selectAccount = (userId: string) => {
    const user = usersQuery.data?.find((account) => account.id === userId);
    const nameParts = user?.displayName.trim().split(/\s+/) ?? [];
    setForm((current) => ({
      ...current,
      userId: userId || undefined,
      firstName: nameParts[0] ?? '',
      middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] ?? ''),
      email: user?.email ?? '',
    }));
  };
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string>();
  const mutation = useMutation({
    mutationFn: ({ id, request }: { id?: string; request: HrEmployeeRequest }) => {
      if (!id) return createHrEmployee(request);
      const updateRequest: HrEmployeeUpdateRequest = {
        branchId: request.branchId,
        firstName: request.firstName,
        middleName: request.middleName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        employmentType: request.employmentType,
        joiningDate: request.joiningDate,
        basicSalary: request.basicSalary,
      };
      return updateHrEmployee(id, updateRequest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      setEditingId(undefined);
      setForm((value) => ({
        ...value,
        firstName: '',
        middleName: '',
        lastName: '',
        userId: undefined,
        email: '',
        phone: '',
        basicSalary: 0,
      }));
    },
  });
  const activeMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setHrEmployeeActive(id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hr-employees'] }),
  });
  const editEmployee = (employee: (typeof employees)[number]) => {
    setEditingId(employee.id);
    setForm({
      userId: employee.userId,
      branchId: employee.branchId,
      firstName: employee.firstName,
      middleName: employee.middleName ?? '',
      lastName: employee.lastName,
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      employmentType: employee.employmentType,
      joiningDate: employee.joiningDate,
      basicSalary: Number(employee.basicSalary),
    });
  };
  const cancelEdit = () => {
    setEditingId(undefined);
    setForm((value) => ({
      ...value,
      userId: undefined,
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      basicSalary: 0,
    }));
  };
  return (
    <>
      <section className="platform-workspace-panel">
        <h2>{editingId ? 'Edit employee' : 'Add employee'}</h2>
        {mutation.isError && <ErrorBanner error={mutation.error} />}
        {activeMutation.isError && <ErrorBanner error={activeMutation.error} />}
        {usersQuery.isError && <ErrorBanner error={usersQuery.error} />}
        <form
          className="hr-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ id: editingId, request: form });
          }}
        >
          <label>
            System account
            <select
              aria-label="System account"
              value={form.userId ?? ''}
              disabled={Boolean(editingId)}
              onChange={(event) => selectAccount(event.target.value)}
            >
              <option value="">No account linked</option>
              {systemUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} · {user.roleNames.join(', ') || 'No assigned role'}
                </option>
              ))}
              {selectedUser && !systemUsers.some((user) => user.id === selectedUser.id) && (
                <option value={selectedUser.id}>
                  {selectedUser.displayName} · {selectedUser.roleNames.join(', ')}
                </option>
              )}
            </select>
            <small>Roles come from the account’s assignments in Users.</small>
          </label>
          <label>
            First name
            <input
              required
              readOnly={Boolean(selectedUser)}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label>
            Middle name
            <input
              readOnly={Boolean(selectedUser)}
              value={form.middleName ?? ''}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
            />
          </label>
          <label>
            Last name
            <input
              required
              readOnly={Boolean(selectedUser)}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label>
            Location
            <select
              required
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Select a location</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} · {branch.branchType}
                </option>
              ))}
            </select>
          </label>
          <label>
            Employment type
            <select
              value={form.employmentType}
              onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
            >
              {['PERMANENT', 'CONTRACT', 'TEMPORARY', 'INTERN', 'CASUAL'].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Joining date
            <input
              type="date"
              required
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </label>
          <label>
            Monthly base salary
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.basicSalary}
              onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              readOnly={Boolean(selectedUser)}
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <button
            className="primary-action"
            type="submit"
            disabled={mutation.isPending || !branches.length}
          >
            {mutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add employee'}
          </button>
          {editingId && (
            <button className="secondary-action" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </section>
      <section className="platform-workspace-panel">
        <h2>
          Employees <span className="hr-count">{employees.length}</span>
        </h2>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Location</th>
                <th>Role</th>
                <th>Type</th>
                <th>Joined</th>
                <th>Base salary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    {employee.firstName} {employee.lastName}
                    <small className="table-subtext">{employee.employeeNumber}</small>
                  </td>
                  <td>{employee.branchName}</td>
                  <td>
                    {employee.userId
                      ? usersQuery.data
                          ?.find((user) => user.id === employee.userId)
                          ?.roleNames.join(', ') || 'System account'
                      : '—'}
                  </td>
                  <td>{employee.employmentType}</td>
                  <td>{employee.joiningDate}</td>
                  <td>{money(employee.basicSalary, currencyCode)}</td>
                  <td>{employee.active === false ? 'Inactive' : 'Active'}</td>
                  <td>
                    <div className="hr-row-actions">
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={() => editEmployee(employee)}
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        disabled={activeMutation.isPending}
                        onClick={() =>
                          activeMutation.mutate({
                            id: employee.id,
                            active: employee.active === false,
                          })
                        }
                      >
                        {employee.active === false ? 'Reactivate' : 'Deactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!employees.length && <p>No employee records yet.</p>}
      </section>
    </>
  );
}

function WorkforcePanel({
  branches,
  employees,
}: {
  branches: Branch[];
  employees: Awaited<ReturnType<typeof getHrEmployees>>;
}) {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['hr-system-users'], queryFn: getUsers });
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [weekStart, setWeekStart] = useState(today);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<WorkforceShiftRequest>({
    userId: '',
    branchId: branches[0]?.id ?? '',
    startsAt: `${today()}T09:00`,
    endsAt: `${today()}T17:00`,
    breakMinutes: 30,
    note: '',
  });
  const selectedUser = usersQuery.data?.find((user) => user.id === form.userId);
  const assignedBranches = selectedUser
    ? branches.filter((branch) => selectedUser.branchIds.includes(branch.id))
    : branches;
  const scheduleQuery = useQuery({
    queryKey: ['hr-workforce', weekStart, branchId],
    queryFn: () => getHrWorkforce(weekStart, addDays(weekStart, 6), branchId || undefined),
    enabled: Boolean(branchId),
  });
  const resetForm = () => {
    setEditingId(undefined);
    setForm({
      userId: '',
      branchId: branchId || branches[0]?.id || '',
      startsAt: `${weekStart}T09:00`,
      endsAt: `${weekStart}T17:00`,
      breakMinutes: 30,
      note: '',
    });
  };
  const saveMutation = useMutation({
    mutationFn: ({ id, request }: { id?: string; request: WorkforceShiftRequest }) =>
      id ? updateHrShift(id, request) : createHrShift(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hr-workforce'] });
      resetForm();
    },
  });
  const cancelMutation = useMutation({
    mutationFn: cancelHrShift,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hr-workforce'] }),
  });
  const updateForm = (key: keyof WorkforceShiftRequest, value: string | number) =>
    setForm((current) => ({ ...current, [key]: value }));
  const editShift = (shift: WorkforceShift) => {
    const start = localInput(shift.startsAt);
    setEditingId(shift.id);
    setWeekStart(start.slice(0, 10));
    setBranchId(shift.branchId);
    setForm({
      userId: shift.userId,
      branchId: shift.branchId,
      startsAt: start,
      endsAt: localInput(shift.endsAt),
      breakMinutes: shift.breakMinutes,
      note: shift.note ?? '',
    });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate({
      id: editingId,
      request: {
        ...form,
        startsAt: businessDateTime(form.startsAt),
        endsAt: businessDateTime(form.endsAt),
      },
    });
  };

  return (
    <>
      <section className="platform-workspace-panel">
        <h2>{editingId ? 'Edit scheduled shift' : 'Schedule a shift'}</h2>
        {saveMutation.isError && <ErrorBanner error={saveMutation.error} />}
        {cancelMutation.isError && <ErrorBanner error={cancelMutation.error} />}
        {usersQuery.isError && <ErrorBanner error={usersQuery.error} />}
        <form className="hr-form-grid" onSubmit={submit}>
          <label>
            Staff account
            <select
              required
              value={form.userId}
              onChange={(event) => {
                const userId = event.target.value;
                const user = usersQuery.data?.find((account) => account.id === userId);
                const employee = employees.find((record) => record.userId === userId);
                const nextBranches = user
                  ? branches.filter((branch) => user.branchIds.includes(branch.id))
                  : [];
                setForm((current) => ({
                  ...current,
                  userId,
                  branchId: nextBranches.length
                    ? nextBranches.some((branch) => branch.id === current.branchId)
                      ? current.branchId
                      : nextBranches[0].id
                    : (employee?.branchId ?? ''),
                }));
              }}
            >
              <option value="">Select an active linked employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.userId}>
                  {employee.firstName} {employee.lastName} · {employee.employeeNumber}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              required
              value={form.branchId}
              onChange={(event) => updateForm('branchId', event.target.value)}
            >
              <option value="">Select a store or shop</option>
              {assignedBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Shift starts
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(event) => updateForm('startsAt', event.target.value)}
            />
          </label>
          <label>
            Shift ends
            <input
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(event) => updateForm('endsAt', event.target.value)}
            />
          </label>
          <label>
            Break (minutes)
            <input
              type="number"
              min="0"
              max="1440"
              required
              value={form.breakMinutes}
              onChange={(event) => updateForm('breakMinutes', Number(event.target.value))}
            />
          </label>
          <label>
            Note (optional)
            <input
              maxLength={500}
              value={form.note ?? ''}
              onChange={(event) => updateForm('note', event.target.value)}
            />
          </label>
          <button className="primary-action" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : editingId ? 'Save shift' : 'Schedule shift'}
          </button>
          {editingId && (
            <button className="secondary-action" type="button" onClick={resetForm}>
              Cancel editing
            </button>
          )}
        </form>
      </section>
      <section className="platform-workspace-panel">
        <div className="hr-panel-heading">
          <div>
            <h2>Scheduled shifts</h2>
            <p>{addDays(weekStart, 6)} · Times shown in Africa/Nairobi</p>
          </div>
          <label>
            Week starting
            <input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(event.target.value)}
            />
          </label>
          <label>
            Location
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!branches.length ? (
          <p>No active stores or shops are available for scheduling.</p>
        ) : scheduleQuery.isError ? (
          <ErrorBanner error={scheduleQuery.error} />
        ) : scheduleQuery.isPending ? (
          <p>Loading scheduled shifts…</p>
        ) : scheduleQuery.data?.length ? (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Location</th>
                  <th>Shift</th>
                  <th>Break</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduleQuery.data.map((shift) => (
                  <tr key={shift.id}>
                    <td>
                      {shift.employeeName}
                      <small className="table-subtext">{shift.employeeNumber}</small>
                    </td>
                    <td>{shift.branchName}</td>
                    <td>
                      {displayShiftTime(shift.startsAt)} – {displayShiftTime(shift.endsAt)}
                    </td>
                    <td>{shift.breakMinutes} min</td>
                    <td>{shift.status}</td>
                    <td>{shift.note || '—'}</td>
                    <td>
                      {shift.status !== 'CANCELLED' && (
                        <div className="hr-row-actions">
                          <button
                            className="secondary-action compact-action"
                            type="button"
                            onClick={() => editShift(shift)}
                          >
                            Edit
                          </button>
                          <button
                            className="secondary-action compact-action"
                            type="button"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(shift.id)}
                          >
                            Cancel shift
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No shifts are scheduled for this location and week.</p>
        )}
      </section>
    </>
  );
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaultOperatingHours = (): OperatingHoursDay[] =>
  weekDays.map((_, index) => ({
    dayOfWeek: index + 1,
    opensAt: null,
    closesAt: null,
    closed: true,
  }));

function OperatingHoursPanel({ branches }: { branches: Branch[] }) {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [days, setDays] = useState(defaultOperatingHours);
  const hoursQuery = useQuery({
    queryKey: ['hr-operating-hours', branchId],
    queryFn: () => getHrOperatingHours(branchId),
    enabled: Boolean(branchId),
  });
  useEffect(() => {
    if (hoursQuery.data) {
      setDays(
        hoursQuery.data.map((day) => ({
          ...day,
          opensAt: day.opensAt?.slice(0, 5) ?? null,
          closesAt: day.closesAt?.slice(0, 5) ?? null,
        })),
      );
    }
  }, [hoursQuery.data]);
  const saveMutation = useMutation({
    mutationFn: () => saveHrOperatingHours(branchId, days),
    onSuccess: async (savedDays) => {
      setDays(savedDays);
      await queryClient.invalidateQueries({ queryKey: ['hr-operating-hours', branchId] });
    },
  });
  const updateDay = (index: number, patch: Partial<OperatingHoursDay>) =>
    setDays((current) =>
      current.map((day, dayIndex) => (dayIndex === index ? { ...day, ...patch } : day)),
    );

  return (
    <section className="platform-workspace-panel">
      <div className="hr-panel-heading">
        <div>
          <h2>Weekly opening hours</h2>
          <p>Set store hours in local Africa/Nairobi time.</p>
        </div>
        <label>
          Location
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!branches.length && <p>No active stores or shops are available to configure.</p>}
      {hoursQuery.isError && <ErrorBanner error={hoursQuery.error} />}
      {saveMutation.isError && <ErrorBanner error={saveMutation.error} />}
      {branches.length && hoursQuery.isPending ? (
        <p>Loading operating hours…</p>
      ) : branches.length ? (
        <form
          className="hr-operating-hours"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="hr-operating-hours-header" aria-hidden="true">
            <span>Day</span>
            <span>Opening</span>
            <span>Closing</span>
            <span>Closed</span>
          </div>
          {days.map((day, index) => (
            <div className="hr-operating-hours-row" key={day.dayOfWeek}>
              <strong>{weekDays[index]}</strong>
              <input
                type="time"
                aria-label={`${weekDays[index]} opens`}
                disabled={day.closed}
                required={!day.closed}
                value={day.opensAt ?? ''}
                onChange={(event) => updateDay(index, { opensAt: event.target.value || null })}
              />
              <input
                type="time"
                aria-label={`${weekDays[index]} closes`}
                disabled={day.closed}
                required={!day.closed}
                value={day.closesAt ?? ''}
                onChange={(event) => updateDay(index, { closesAt: event.target.value || null })}
              />
              <label className="hr-checkbox-label">
                <input
                  type="checkbox"
                  aria-label={`Closed ${weekDays[index]}`}
                  checked={day.closed}
                  onChange={(event) =>
                    updateDay(index, {
                      closed: event.target.checked,
                      opensAt: event.target.checked ? null : (day.opensAt ?? '09:00'),
                      closesAt: event.target.checked ? null : (day.closesAt ?? '17:00'),
                    })
                  }
                />
                Closed
              </label>
            </div>
          ))}
          <button className="primary-action" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save weekly hours'}
          </button>
        </form>
      ) : null}
    </section>
  );
}

function AttendancePanel({
  branches: _branches,
  employees,
}: {
  branches: Branch[];
  employees: Awaited<ReturnType<typeof getHrEmployees>>;
}) {
  const [date, setDate] = useState(today());
  const queryClient = useQueryClient();
  const attendanceQuery = useQuery({
    queryKey: ['hr-attendance', date],
    queryFn: () => getHrAttendance(date),
  });
  const mutation = useMutation({
    mutationFn: saveHrAttendance,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hr-attendance', date] }),
  });
  return (
    <section className="platform-workspace-panel">
      <div className="hr-panel-heading">
        <h2>Daily attendance</h2>
        <label>
          Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      {mutation.isError && <ErrorBanner error={mutation.error} />}
      {attendanceQuery.isError && <ErrorBanner error={attendanceQuery.error} />}
      {attendanceQuery.isPending ? (
        <p>Loading attendance…</p>
      ) : (
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Location</th>
                <th>Recorded status</th>
                <th>Mark status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const existing = attendanceQuery.data?.find(
                  (row) => row.employeeId === employee.id,
                );
                return (
                  <AttendanceRow
                    key={employee.id}
                    employee={employee}
                    existing={existing}
                    date={date}
                    onSave={mutation.mutate}
                    saving={mutation.isPending}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AttendanceRow({
  employee,
  existing,
  date,
  onSave,
  saving,
}: {
  employee: Awaited<ReturnType<typeof getHrEmployees>>[number];
  existing?: Awaited<ReturnType<typeof getHrAttendance>>[number];
  date: string;
  onSave: (request: Parameters<typeof saveHrAttendance>[0]) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState(existing?.status ?? 'PRESENT');
  useEffect(() => setStatus(existing?.status ?? 'PRESENT'), [existing?.status]);
  return (
    <tr>
      <td>
        {employee.firstName} {employee.lastName}
        <small className="table-subtext">{employee.employeeNumber}</small>
      </td>
      <td>{employee.branchName}</td>
      <td>{existing?.status ?? 'Not recorded'}</td>
      <td>
        <select
          aria-label={`Attendance status for ${employee.firstName} ${employee.lastName}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'OFF_DAY'].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </td>
      <td>
        <button
          className="secondary-action compact-action"
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              employeeId: employee.id,
              branchId: employee.branchId,
              attendanceDate: date,
              status,
            })
          }
        >
          {existing ? 'Update' : 'Save'}
        </button>
      </td>
    </tr>
  );
}

function AvailabilityPanel({
  branches: _branches,
  employees,
}: {
  branches: Branch[];
  employees: Awaited<ReturnType<typeof getHrEmployees>>;
}) {
  const queryClient = useQueryClient();
  const requestsQuery = useQuery({ queryKey: ['hr-leave-requests'], queryFn: getHrLeaveRequests });
  const typesQuery = useQuery({ queryKey: ['hr-leave-types'], queryFn: getHrLeaveTypes });
  const [employeeId, setEmployeeId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [requestedDays, setRequestedDays] = useState(1);
  const [reason, setReason] = useState('');
  const [leaveTypeName, setLeaveTypeName] = useState('');
  const [leaveTypeCode, setLeaveTypeCode] = useState('');
  const [defaultLeaveDays, setDefaultLeaveDays] = useState(0);
  const [requiresLeaveBalance, setRequiresLeaveBalance] = useState(true);
  const selectedEmployee = employees.find((employee) => employee.id === employeeId);
  const typeMutation = useMutation({
    mutationFn: createHrLeaveType,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr-leave-types'] });
      setLeaveTypeName('');
      setLeaveTypeCode('');
      setDefaultLeaveDays(0);
    },
  });
  const createMutation = useMutation({
    mutationFn: createHrLeaveRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] });
      setReason('');
    },
  });
  const decisionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      decideHrLeaveRequest(id, status, ''),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] }),
  });
  return (
    <>
      <section className="platform-workspace-panel">
        <h2>Record a leave request</h2>
        <details className="hr-leave-type-details">
          <summary>Manage leave types</summary>
          {typeMutation.isError && <ErrorBanner error={typeMutation.error} />}
          <form
            className="hr-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              typeMutation.mutate({
                name: leaveTypeName,
                code: leaveTypeCode,
                defaultDays: defaultLeaveDays,
                requiresBalance: requiresLeaveBalance,
              });
            }}
          >
            <label>
              Type name
              <input
                required
                value={leaveTypeName}
                onChange={(e) => setLeaveTypeName(e.target.value)}
              />
            </label>
            <label>
              Code
              <input
                required
                pattern="[A-Za-z0-9_-]{2,40}"
                value={leaveTypeCode}
                onChange={(e) => setLeaveTypeCode(e.target.value)}
              />
            </label>
            <label>
              Default annual days
              <input
                type="number"
                min="0"
                step="1"
                value={defaultLeaveDays}
                onChange={(e) => setDefaultLeaveDays(Number(e.target.value))}
              />
            </label>
            <label className="hr-checkbox-label">
              <input
                type="checkbox"
                checked={requiresLeaveBalance}
                onChange={(e) => setRequiresLeaveBalance(e.target.checked)}
              />{' '}
              Requires an available balance
            </label>
            <button
              className="secondary-action compact-action"
              type="submit"
              disabled={typeMutation.isPending}
            >
              {typeMutation.isPending ? 'Saving…' : 'Add leave type'}
            </button>
          </form>
        </details>
        {createMutation.isError && <ErrorBanner error={createMutation.error} />}
        <form
          className="hr-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedEmployee) return;
            createMutation.mutate({
              employeeId,
              branchId: selectedEmployee.branchId,
              leaveTypeId,
              startDate,
              endDate,
              requestedDays,
              reason,
            });
          }}
        >
          <label>
            Employee
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} · {employee.branchName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Leave type
            <select required value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select leave type</option>
              {(typesQuery.data ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Requested days
            <input
              type="number"
              min="0.5"
              step="0.5"
              required
              value={requestedDays}
              onChange={(e) => setRequestedDays(Number(e.target.value))}
            />
          </label>
          <label>
            Reason
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <button
            className="primary-action"
            type="submit"
            disabled={createMutation.isPending || !employees.length || !typesQuery.data?.length}
          >
            {createMutation.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
        {typesQuery.isError && <ErrorBanner error={typesQuery.error} />}
        {!typesQuery.isPending && !typesQuery.data?.length && (
          <p>Create an active leave type before recording requests.</p>
        )}
      </section>
      <section className="platform-workspace-panel">
        <h2>Requests</h2>
        {requestsQuery.isError && <ErrorBanner error={requestsQuery.error} />}
        {decisionMutation.isError && <ErrorBanner error={decisionMutation.error} />}
        {requestsQuery.isPending ? (
          <p>Loading requests…</p>
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {(requestsQuery.data ?? []).map((request) => (
                  <tr key={request.id}>
                    <td>
                      {request.employeeName}
                      <small className="table-subtext">{request.branchName}</small>
                    </td>
                    <td>{request.leaveTypeName}</td>
                    <td>
                      {request.startDate} – {request.endDate}
                    </td>
                    <td>{request.requestedDays}</td>
                    <td>{request.reason || '—'}</td>
                    <td>{request.status}</td>
                    <td>
                      {request.status === 'PENDING_APPROVAL' ? (
                        <div className="hr-row-actions">
                          <button
                            className="secondary-action compact-action"
                            type="button"
                            disabled={decisionMutation.isPending}
                            onClick={() =>
                              decisionMutation.mutate({ id: request.id, status: 'APPROVED' })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="secondary-action compact-action"
                            type="button"
                            disabled={decisionMutation.isPending}
                            onClick={() =>
                              decisionMutation.mutate({ id: request.id, status: 'REJECTED' })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function PayrollPanel({ currencyCode }: { currencyCode: string }) {
  const [period, setPeriod] = useState(currentPeriod());
  const payrollQuery = useQuery({
    queryKey: ['hr-payroll-preview', period],
    queryFn: () => getPayrollPreview(period),
  });
  const totals = useMemo(
    () =>
      (payrollQuery.data ?? []).reduce(
        (result, line) => ({
          base: result.base + line.basicSalary,
          bonuses: result.bonuses + line.bonusAmount,
          deductions: result.deductions + line.deductions,
          net: result.net + line.netPay,
        }),
        { base: 0, bonuses: 0, deductions: 0, net: 0 },
      ),
    [payrollQuery.data],
  );
  return (
    <>
      <section className="platform-workspace-panel">
        <div className="hr-panel-heading">
          <div>
            <h2>Monthly payroll estimate</h2>
            <p>Preview only; amounts are not yet approved or recorded as payments.</p>
          </div>
          <label>
            Payroll month
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </label>
        </div>
        {payrollQuery.isError && <ErrorBanner error={payrollQuery.error} />}
        {payrollQuery.isPending ? (
          <p>Calculating payroll…</p>
        ) : (
          <>
            <div className="platform-kpis hr-payroll-totals">
              <Metric label="Base salaries" value={money(totals.base, currencyCode)} />
              <Metric label="Recorded bonuses" value={money(totals.bonuses, currencyCode)} />
              <Metric label="Recorded deductions" value={money(totals.deductions, currencyCode)} />
              <Metric label="Estimated net pay" value={money(totals.net, currencyCode)} />
            </div>
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Location</th>
                    <th>Base salary</th>
                    <th>Bonuses</th>
                    <th>Deductions</th>
                    <th>Estimated net</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrollQuery.data ?? []).map((line) => (
                    <tr key={line.employeeId}>
                      <td>
                        {line.employeeName}
                        <small className="table-subtext">{line.employeeNumber}</small>
                      </td>
                      <td>{line.branchName}</td>
                      <td>{money(line.basicSalary, currencyCode)}</td>
                      <td>{money(line.bonusAmount, currencyCode)}</td>
                      <td>{money(line.deductions, currencyCode)}</td>
                      <td>
                        <strong>{money(line.netPay, currencyCode)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!payrollQuery.data?.length && <p>No eligible employees for this period.</p>}
          </>
        )}
      </section>
      <p className="hr-disclaimer">
        This estimate includes base salaries and manual bonus/loss entries currently recorded for
        the selected month. Statutory deductions and payment processing are not included.
      </p>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ErrorBanner({ error }: { error: Error }) {
  return (
    <p className="message-banner error" role="alert">
      {error.message}
    </p>
  );
}

function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}
