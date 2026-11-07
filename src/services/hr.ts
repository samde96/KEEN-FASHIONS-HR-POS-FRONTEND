import { requestJson } from './api';

export type HrEmployee = {
  id: string;
  userId?: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  branchId: string;
  branchName: string;
  jobTitle?: string;
  employmentType: string;
  employmentStatus: string;
  joiningDate: string;
  basicSalary: number;
  active?: boolean;
};

export type HrEmployeeRequest = {
  userId?: string;
  branchId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  employmentType: string;
  joiningDate: string;
  basicSalary: number;
};

export type HrEmployeeUpdateRequest = Omit<HrEmployeeRequest, 'userId'>;

export type HrAttendance = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  attendanceDate: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  workedMinutes: number;
  notes?: string;
};

export type HrAdminSummary = {
  month: string;
  staff: Array<{
    employeeId: string;
    userId?: string;
    employeeNumber: string;
    employeeName: string;
    jobTitle?: string;
    branchId: string;
    branchName: string;
    workedMinutes: number;
    workingDays: number;
    absentDays: number;
    offDays: number;
    sickDays: number;
    annualLeaveDays: number;
    pendingRequests: number;
    sales: number;
    transactions: number;
  }>;
  attendance: HrAttendance[];
};

export type HrAttendanceRequest = {
  employeeId: string;
  branchId: string;
  attendanceDate: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  notes?: string;
};

export type HrLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId?: string;
  branchName: string;
  leaveTypeId: string;
  leaveTypeCode?: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string;
  status: string;
  approverComments?: string;
};

export type HrLeaveType = {
  id: string;
  name: string;
  code: string;
  requiresBalance: boolean;
};

export type HrLeaveTypeRequest = {
  name: string;
  code: string;
  defaultDays: number;
  requiresBalance: boolean;
};

export type HrLeaveRequestInput = {
  employeeId: string;
  branchId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string;
};

export type PayrollPreviewLine = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchName: string;
  basicSalary: number;
  bonusAmount: number;
  deductions: number;
  netPay: number;
};

export type MyAvailability = {
  month: string;
  employee: {
    id: string;
    employeeNumber: string;
    employeeName: string;
    branchId: string;
    branchName: string;
  };
  todayAttendance: HrAttendance | null;
  calendarRecords: AvailabilityCalendarRecord[];
  attendanceHistory: Array<{
    id: string;
    attendanceDate: string;
    clockIn?: string;
    clockOut?: string;
    workedMinutes: number;
    status: string;
    notes?: string;
    locationId: string;
    locationName: string;
  }>;
  leaveTypes: HrLeaveType[];
  leaveRequests: HrLeaveRequest[];
  clockedInStaff: Array<{
    employeeId: string;
    employeeName: string;
    clockIn: string;
  }>;
  upcomingShifts: WorkforceShift[];
};

export type AvailabilityCalendarRecord = {
  id: string;
  kind: 'OFF_DAY' | 'SICK_LEAVE' | 'ANNUAL_LEAVE' | 'WORK';
  status: string;
  startDate?: string;
  endDate?: string;
  startsAt?: string;
  endsAt?: string;
  note?: string;
  reviewNote?: string;
  leaveTypeName?: string;
  locationId?: string;
  locationName?: string;
  breakMinutes?: number;
};

export type WorkforceShift = {
  id: string;
  userId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  status: string;
  note?: string;
};

export type WorkforceShiftRequest = {
  userId: string;
  branchId: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  note?: string;
};

export type OperatingHoursDay = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
};

export const getHrWorkforce = (from: string, to: string, branchId?: string) => {
  const query = new URLSearchParams({ from, to });
  if (branchId) query.set('branchId', branchId);
  return requestJson<WorkforceShift[]>(`/api/v1/hr/workforce?${query}`, undefined, {
    onlineOnly: true,
  });
};

export const createHrShift = (request: WorkforceShiftRequest) =>
  requestJson<WorkforceShift>(
    '/api/v1/hr/workforce',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const updateHrShift = (id: string, request: WorkforceShiftRequest) =>
  requestJson<WorkforceShift>(
    `/api/v1/hr/workforce/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const cancelHrShift = (id: string) =>
  requestJson<WorkforceShift>(
    `/api/v1/hr/workforce/${encodeURIComponent(id)}/cancel`,
    { method: 'PATCH' },
    { onlineOnly: true },
  );

export const getHrOperatingHours = (branchId: string) =>
  requestJson<OperatingHoursDay[]>(
    `/api/v1/hr/operating-hours?branchId=${encodeURIComponent(branchId)}`,
    undefined,
    { onlineOnly: true },
  );

export const saveHrOperatingHours = (branchId: string, days: OperatingHoursDay[]) =>
  requestJson<OperatingHoursDay[]>(
    '/api/v1/hr/operating-hours',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId, days }),
    },
    { onlineOnly: true },
  );

export type MyLeaveRequestInput = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

export type PayrollEmployee = {
  id: string;
  employeeNumber: string;
  fullName: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  roleName?: string;
  locationId: string;
  locationName: string;
  locationType: 'STORE' | 'SHOP';
  baseSalary: number;
  active: boolean;
};

export type PayrollLocation = {
  id: string;
  name: string;
  type: 'STORE' | 'SHOP';
  active: boolean;
};

export type PayrollRule = {
  id: string;
  version: number;
  locationId: string;
  locationName: string;
  effectiveFrom: string;
  dailyTarget: number;
  bonusMode: 'FIXED' | 'PERCENT_EXCESS';
  bonusValue: number;
  enabled: boolean;
};

export type PayrollLine = {
  id: string;
  employeeNumber: string;
  employeeName: string;
  userId?: string;
  locationId: string;
  locationName: string;
  locationType: 'STORE' | 'SHOP';
  baseSalary: number;
  automaticBonus: number;
  manualBonus: number;
  lossDeductions: number;
  otherDeductions: number;
  netSales: number;
  transactions: number;
  funding?: Array<{ locationId: string; locationName: string; percentage: number; amount: number }>;
  grossPay: number;
  netPay: number;
};

export type PayrollPreview = {
  month: string;
  lines: PayrollLine[];
  totalBaseSalary: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNetPay: number;
  warnings: string[];
  token: string;
};

export type PayrollSetup = {
  employees: PayrollEmployee[];
  locations: PayrollLocation[];
  rules: PayrollRule[];
};

export type PayrollWorkspace = {
  month: string;
  preview: PayrollPreview;
  run: {
    id: string;
    status: 'APPROVED' | 'PAID' | 'REOPENED';
    payroll: PayrollPreview;
    paymentReference?: string;
    approvedAt?: string;
    paidAt?: string;
    reopenReason?: string;
  } | null;
  adjustments: Array<{
    id: string;
    requestKey: string;
    employeeId: string;
    employeeName: string;
    effectiveDate: string;
    kind: 'MANUAL_BONUS' | 'AUTO_BONUS_OVERRIDE' | 'DEDUCTION';
    amount: number;
    reason: string;
    active: boolean;
  }>;
  losses: Array<{
    id: string;
    locationId: string;
    locationName: string;
    occurredOn: string;
    deductionDate: string;
    amount: number;
    recoverableAmount: number;
    waivedAmount: number;
    allocationMode: string;
    reason: string;
    allocations: Array<{ employeeId: string; employeeName: string; amount: number }>;
  }>;
  detectedLosses: Array<{
    sourceKey: string;
    locationId: string;
    locationName: string;
    date: string;
    amount: number;
    recordedLossId?: string;
  }>;
};

const payrollJson = (value: unknown, method = 'POST') => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});

export const getPayrollSetup = () =>
  requestJson<PayrollSetup>('/api/v1/payroll/setup', undefined, { onlineOnly: true });

export const getPayrollWorkspace = (month: string) =>
  requestJson<PayrollWorkspace>(
    `/api/v1/payroll/workspace?month=${encodeURIComponent(month)}`,
    undefined,
    { onlineOnly: true },
  );

export const savePayrollBonusRule = (
  value: Omit<PayrollRule, 'id' | 'version' | 'locationName'> & { id?: string },
) =>
  requestJson<PayrollRule>(
    value.id ? `/api/v1/payroll/bonus-rules/${value.id}` : '/api/v1/payroll/bonus-rules',
    payrollJson(value, value.id ? 'PUT' : 'POST'),
    { onlineOnly: true },
  );

export const savePayrollAdjustment = (
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
) =>
  requestJson(
    id ? `/api/v1/payroll/adjustments/${id}` : '/api/v1/payroll/adjustments',
    payrollJson(value, id ? 'PUT' : 'POST'),
    { onlineOnly: true },
  );

export const savePayrollLoss = (value: {
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
}) => requestJson('/api/v1/payroll/losses', payrollJson(value), { onlineOnly: true });

export const getPayrollLossEligibility = (locationId: string, date: string) =>
  requestJson<Array<{ employeeId: string; employeeName: string }>>(
    `/api/v1/payroll/loss-eligibility?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(date)}`,
    undefined,
    { onlineOnly: true },
  );

export const getPayrollFunding = (month: string) =>
  requestJson<Record<string, unknown>>(
    `/api/v1/payroll/funding?month=${encodeURIComponent(month)}`,
    undefined,
    { onlineOnly: true },
  );

export const savePayrollFunding = (month: string, value: Record<string, unknown>) =>
  requestJson(`/api/v1/payroll/funding?month=${encodeURIComponent(month)}`, payrollJson(value), {
    onlineOnly: true,
  });

export const runPayrollAction = (
  month: string,
  action: 'approve' | 'paid' | 'reopen',
  value: Record<string, unknown>,
) =>
  requestJson(`/api/v1/payroll/runs/${month}/${action}`, payrollJson(value), { onlineOnly: true });

export const getPayrollReports = (from: string, to: string) =>
  requestJson<{
    from: string;
    to: string;
    monthly: Array<{
      period: string;
      paymentReference: string;
      paidAt: string;
      totalNetPay: number;
      totalBonuses: number;
      totalDeductions: number;
    }>;
    statements: Array<{
      period: string;
      paymentReference: string;
      paidAt: string;
      employeeId: string;
      employeeNumber: string;
      employeeName: string;
      baseSalary: number;
      automaticBonus: number;
      manualBonus: number;
      lossDeductions: number;
      otherDeductions: number;
      grossPay: number;
      netPay: number;
    }>;
    paidTotal: number;
  }>(
    `/api/v1/payroll/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    undefined,
    { onlineOnly: true },
  );

export const getHrEmployees = (includeInactive = false) =>
  requestJson<HrEmployee[]>(
    `/api/v1/hr/employees${includeInactive ? '?includeInactive=true' : ''}`,
    undefined,
    { onlineOnly: true },
  );

export const createHrEmployee = (request: HrEmployeeRequest) =>
  requestJson<HrEmployee>(
    '/api/v1/hr/employees',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const updateHrEmployee = (id: string, request: HrEmployeeUpdateRequest) =>
  requestJson<HrEmployee>(
    `/api/v1/hr/employees/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const setHrEmployeeActive = (id: string, active: boolean) =>
  requestJson<HrEmployee>(
    `/api/v1/hr/employees/${encodeURIComponent(id)}/active`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    },
    { onlineOnly: true },
  );

export const getHrAttendance = (date: string) =>
  requestJson<HrAttendance[]>(`/api/v1/hr/attendance?date=${encodeURIComponent(date)}`, undefined, {
    onlineOnly: true,
  });

export const getHrAdminSummary = (month: string, branchId?: string) => {
  const query = new URLSearchParams({ month });
  if (branchId) query.set('branchId', branchId);
  return requestJson<HrAdminSummary>(`/api/v1/hr/admin/summary?${query}`, undefined, {
    onlineOnly: true,
  });
};

export const saveHrAttendance = (request: HrAttendanceRequest) =>
  requestJson<HrAttendance>(
    '/api/v1/hr/attendance',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const getHrLeaveTypes = () =>
  requestJson<HrLeaveType[]>('/api/v1/hr/leave-types', undefined, { onlineOnly: true });

export const createHrLeaveType = (request: HrLeaveTypeRequest) =>
  requestJson<HrLeaveType>(
    '/api/v1/hr/leave-types',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const getHrLeaveRequests = () =>
  requestJson<HrLeaveRequest[]>('/api/v1/hr/leave-requests', undefined, { onlineOnly: true });

export const createHrLeaveRequest = (request: HrLeaveRequestInput) =>
  requestJson<HrLeaveRequest>(
    '/api/v1/hr/leave-requests',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );

export const decideHrLeaveRequest = (
  id: string,
  status: 'APPROVED' | 'REJECTED',
  approverComments: string,
) =>
  requestJson<HrLeaveRequest>(
    `/api/v1/hr/leave-requests/${encodeURIComponent(id)}/decision`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approverComments }),
    },
    { onlineOnly: true },
  );

export const getPayrollPreview = (period: string) =>
  requestJson<PayrollPreviewLine[]>(
    `/api/v1/hr/payroll/preview?period=${encodeURIComponent(period)}`,
    undefined,
    { onlineOnly: true },
  );

export const getMyAvailability = (month: string) =>
  requestJson<MyAvailability>(
    `/api/v1/hr/me/availability?month=${encodeURIComponent(month)}`,
    undefined,
    { onlineOnly: true },
  );

export const clockIn = () =>
  requestJson<HrAttendance>('/api/v1/hr/me/clock-in', { method: 'POST' }, { onlineOnly: true });

export const clockOut = () =>
  requestJson<HrAttendance>('/api/v1/hr/me/clock-out', { method: 'POST' }, { onlineOnly: true });

export const requestMyLeave = (request: MyLeaveRequestInput) =>
  requestJson<HrLeaveRequest>(
    '/api/v1/hr/me/leave-requests',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    { onlineOnly: true },
  );
