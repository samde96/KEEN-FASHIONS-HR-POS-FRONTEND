import type {
  AccountingAccount,
  AccountingAccountRequest,
  AccountingBalanceSheet,
  AccountingCashFlow,
  AccountingJournal,
  AccountingJournalRequest,
  AccountingLedgerEntry,
  AccountingPeriod,
  AccountingPeriodRequest,
  AccountingProfitAndLoss,
  AccountingTaxRule,
  AccountingTaxRuleRequest,
  AccountingTrialBalance,
  Branch,
  BranchRequest,
  CurrentUser,
  Department,
  DepartmentRequest,
  AttendancePage,
  AttendanceRecord,
  AttendanceRequest,
  EmployeeDocument,
  EmployeeDocumentUploadRequest,
  EmployeePerformanceEntry,
  EmployeePerformanceEntryRequest,
  EmployeePerformancePage,
  EmployeePage,
  EmployeeProfile,
  EmployeeRequest,
  EmployeeUserSyncResult,
  Expense,
  ExpenseRequest,
  InventoryItem,
  InventoryReorderLevelRequest,
  JobTitle,
  JobTitleRequest,
  LeavePage,
  LeaveRequestInput,
  LeaveRequestRecord,
  LeaveType,
  LeaveTypeRequest,
  AuditEvent,
  ModuleSummary,
  NotificationItem,
  Organization,
  Permission,
  PermissionRequest,
  PayrollComponent,
  PayrollComponentRequest,
  PayrollEmployeeAdjustmentRequest,
  PayrollEmployee,
  PayrollPage,
  PayrollPeriod,
  PayrollPeriodRequest,
  PayrollRun,
  PayrollRunRequest,
  PayrollSalesBonusRule,
  PayrollSalesBonusRuleRequest,
  ProductVatCategory,
  Product,
  ProductCategory,
  ProductCategoryRequest,
  ProductRequest,
  Role,
  RoleRequest,
  Sale,
  SaleRequest,
  StaffUser,
  StockAdjustment,
  StockAdjustmentRequest,
  StockAdjustmentSummary,
  StockIntake,
  StockIntakeRequest,
  StockTransfer,
  StockTransferRequest,
  Supplier,
  SupplierRequest,
  UserRequest,
} from '../data/types';

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const apiBaseUrl = import.meta.env.DEV ? '' : configuredApiBaseUrl;
const localDevelopmentApiBaseUrl = 'http://localhost:8080';
const csrfTokenPath = '/api/v1/auth/csrf';
const csrfCookieName = 'XSRF-TOKEN';
const fallbackCsrfHeaderName = 'X-XSRF-TOKEN';

type CsrfTokenResponse = {
  headerName?: string;
  token?: string;
};

type LoginCredentials = {
  username: string;
  password: string;
  rememberDevice: boolean;
};

let csrfToken: string | null = null;
let csrfHeaderName = fallbackCsrfHeaderName;
let csrfTokenRequest: Promise<string> | null = null;

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const securedInit = await withCsrf(path, init);
  const response = await fetchApi(path, securedInit);

  if (!response.ok) {
    if (response.status === 403 && isUnsafeMethod(securedInit?.method)) {
      clearCsrfToken();
    }
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new Error(await getUnexpectedResponseMessage(response, contentType));
  }

  return response.json() as Promise<T>;
}

export async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const securedInit = await withCsrf(path, {
    ...init,
    headers: {
      Accept: '*/*',
      ...headersToRecord(init?.headers),
    },
  });
  const response = await fetchApi(path, securedInit);

  if (!response.ok) {
    if (response.status === 403 && isUnsafeMethod(securedInit?.method)) {
      clearCsrfToken();
    }
    throw new Error(await getErrorMessage(response));
  }

  return response.blob();
}

async function fetchApi(path: string, init?: RequestInit) {
  const response = await fetchWithBaseUrl(apiBaseUrl, path, init);

  if (await shouldRetryAgainstLocalBackend(response.clone(), path)) {
    return fetchWithBaseUrl(localDevelopmentApiBaseUrl, path, init);
  }

  return response;
}

function fetchWithBaseUrl(baseUrl: string, path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...headersToRecord(init?.headers),
    },
  });
}

async function withCsrf(path: string, init?: RequestInit): Promise<RequestInit | undefined> {
  if (!path.startsWith('/api/') || !isUnsafeMethod(init?.method)) {
    return init;
  }

  const token = await getCsrfToken();
  return {
    ...init,
    headers: {
      ...headersToRecord(init?.headers),
      [csrfHeaderName]: token,
    },
  };
}

async function getCsrfToken() {
  const tokenFromCookie = getCookie(csrfCookieName);
  if (tokenFromCookie) {
    csrfToken = tokenFromCookie;
    return tokenFromCookie;
  }

  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = fetchApi(csrfTokenPath, { method: 'GET' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('json')) {
          throw new Error(await getUnexpectedResponseMessage(response, contentType));
        }

        const body = (await response.json()) as CsrfTokenResponse;
        if (!body.token) {
          throw new Error('CSRF token response did not include a token.');
        }

        csrfToken = body.token;
        csrfHeaderName = body.headerName || fallbackCsrfHeaderName;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }

  return csrfTokenRequest;
}

function clearCsrfToken() {
  csrfToken = null;
  csrfHeaderName = fallbackCsrfHeaderName;
}

async function refreshCsrfToken() {
  clearCsrfToken();
  try {
    await getCsrfToken();
  } catch {
    clearCsrfToken();
  }
}

function getCookie(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  return (
    document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(encodedName))
      ?.slice(encodedName.length) ?? null
  );
}

function isUnsafeMethod(method?: string) {
  const normalizedMethod = (method ?? 'GET').toUpperCase();
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod);
}

function headersToRecord(headers?: HeadersInit) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

async function shouldRetryAgainstLocalBackend(response: Response, path: string) {
  if (!import.meta.env.DEV || apiBaseUrl || !path.startsWith('/api/')) {
    return false;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    return false;
  }

  if (contentType.includes('html')) {
    return true;
  }

  if (!response.ok) {
    return false;
  }

  try {
    return looksLikeHtml((await response.text()).trim());
  } catch {
    return false;
  }
}

export function getCurrentUser() {
  return requestJson<CurrentUser>('/api/v1/me');
}

export function getOrganization() {
  return requestJson<Organization>('/api/v1/organization/current');
}

export function updateOrganizationVatSettings(defaultProductVatCategory: ProductVatCategory) {
  return requestJson<Organization>('/api/v1/organization/current/vat-settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ defaultProductVatCategory }),
  });
}

export function getBranches() {
  return requestJson<Branch[]>('/api/v1/branches');
}

export function createBranch(branch: BranchRequest) {
  return requestJson<Branch>('/api/v1/branches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(branch),
  });
}

export function updateBranch(branchId: string, branch: BranchRequest) {
  return requestJson<Branch>(`/api/v1/branches/${branchId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(branch),
  });
}

export function deactivateBranch(branchId: string) {
  return requestJson<void>(`/api/v1/branches/${branchId}`, {
    method: 'DELETE',
  });
}

export function getSuppliers() {
  return requestJson<Supplier[]>('/api/v1/suppliers');
}

export function createSupplier(supplier: SupplierRequest) {
  return requestJson<Supplier>('/api/v1/suppliers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(supplier),
  });
}

export function updateSupplier(supplierId: string, supplier: SupplierRequest) {
  return requestJson<Supplier>(`/api/v1/suppliers/${supplierId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(supplier),
  });
}

export function deactivateSupplier(supplierId: string) {
  return requestJson<void>(`/api/v1/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
}

export function getProcurementSummary() {
  return requestJson<ModuleSummary>('/api/v1/procurement/summary');
}

export function getCustomersSummary() {
  return requestJson<ModuleSummary>('/api/v1/customers/summary');
}

export function getCrmSummary() {
  return requestJson<ModuleSummary>('/api/v1/crm/summary');
}

export function getCommercialSummary() {
  return requestJson<ModuleSummary>('/api/v1/commercial/summary');
}

export function getAccountingSummary() {
  return requestJson<ModuleSummary>('/api/v1/accounting/summary');
}

export function getAccountingAccounts() {
  return requestJson<AccountingAccount[]>('/api/v1/accounting/accounts');
}

export function createAccountingAccount(account: AccountingAccountRequest) {
  return requestJson<AccountingAccount>('/api/v1/accounting/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(account)),
  });
}

export function updateAccountingAccount(accountId: string, account: AccountingAccountRequest) {
  return requestJson<AccountingAccount>(`/api/v1/accounting/accounts/${accountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(account)),
  });
}

export function deactivateAccountingAccount(accountId: string) {
  return requestJson<AccountingAccount>(`/api/v1/accounting/accounts/${accountId}`, {
    method: 'DELETE',
  });
}

export function getAccountingPeriods() {
  return requestJson<AccountingPeriod[]>('/api/v1/accounting/periods');
}

export function createAccountingPeriod(period: AccountingPeriodRequest) {
  return requestJson<AccountingPeriod>('/api/v1/accounting/periods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(period),
  });
}

export function updateAccountingPeriod(periodId: string, period: AccountingPeriodRequest) {
  return requestJson<AccountingPeriod>(`/api/v1/accounting/periods/${periodId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(period),
  });
}

export function getAccountingTaxRules() {
  return requestJson<AccountingTaxRule[]>('/api/v1/accounting/tax-rules');
}

export function createAccountingTaxRule(rule: AccountingTaxRuleRequest) {
  return requestJson<AccountingTaxRule>('/api/v1/accounting/tax-rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(rule)),
  });
}

export function updateAccountingTaxRule(ruleId: string, rule: AccountingTaxRuleRequest) {
  return requestJson<AccountingTaxRule>(`/api/v1/accounting/tax-rules/${ruleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(rule)),
  });
}

export function getAccountingJournals() {
  return requestJson<AccountingJournal[]>('/api/v1/accounting/journals');
}

export function createAccountingJournal(journal: AccountingJournalRequest) {
  return requestJson<AccountingJournal>('/api/v1/accounting/journals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(journal)),
  });
}

export function updateAccountingJournal(journalId: string, journal: AccountingJournalRequest) {
  return requestJson<AccountingJournal>(`/api/v1/accounting/journals/${journalId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(journal)),
  });
}

export function postAccountingJournal(journalId: string) {
  return requestJson<AccountingJournal>(`/api/v1/accounting/journals/${journalId}/post`, {
    method: 'POST',
  });
}

export function voidAccountingJournal(journalId: string) {
  return requestJson<AccountingJournal>(`/api/v1/accounting/journals/${journalId}`, {
    method: 'DELETE',
  });
}

export type AccountingReportParams = {
  accountId?: string;
  branchId?: string;
  from?: string;
  to?: string;
  asOf?: string;
};

export function getAccountingLedger(params?: AccountingReportParams) {
  return requestJson<AccountingLedgerEntry[]>(
    `/api/v1/accounting/ledger${apiSearchParams(params)}`,
  );
}

export function getAccountingTrialBalance(params?: AccountingReportParams) {
  return requestJson<AccountingTrialBalance>(
    `/api/v1/accounting/reports/trial-balance${apiSearchParams(params)}`,
  );
}

export function getAccountingProfitAndLoss(params?: AccountingReportParams) {
  return requestJson<AccountingProfitAndLoss>(
    `/api/v1/accounting/reports/profit-and-loss${apiSearchParams(params)}`,
  );
}

export function getAccountingBalanceSheet(params?: AccountingReportParams) {
  return requestJson<AccountingBalanceSheet>(
    `/api/v1/accounting/reports/balance-sheet${apiSearchParams(params)}`,
  );
}

export function getAccountingCashFlow(params?: AccountingReportParams) {
  return requestJson<AccountingCashFlow>(
    `/api/v1/accounting/reports/cash-flow${apiSearchParams(params)}`,
  );
}

export function getEtimsSummary() {
  return requestJson<ModuleSummary>('/api/v1/etims/summary');
}

export function getNotificationsSummary() {
  return requestJson<ModuleSummary>('/api/v1/notifications/summary');
}

export function getNotifications() {
  return requestJson<NotificationItem[]>('/api/v1/notifications');
}

export function getAuditEvents() {
  return requestJson<AuditEvent[]>('/api/v1/audit-events');
}

export function getRoles() {
  return requestJson<Role[]>('/api/v1/roles');
}

export function getPermissions() {
  return requestJson<Permission[]>('/api/v1/permissions');
}

export function createPermission(permission: PermissionRequest) {
  return requestJson<Permission>('/api/v1/permissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(permission),
  });
}

export function updatePermission(permissionId: string, permission: PermissionRequest) {
  return requestJson<Permission>(`/api/v1/permissions/${permissionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(permission),
  });
}

export function createRole(role: RoleRequest) {
  return requestJson<Role>('/api/v1/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role),
  });
}

export function updateRole(roleId: string, role: RoleRequest) {
  return requestJson<Role>(`/api/v1/roles/${roleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role),
  });
}

export function deleteRole(roleId: string) {
  return requestJson<void>(`/api/v1/roles/${roleId}`, {
    method: 'DELETE',
  });
}

export function getUsers() {
  return requestJson<StaffUser[]>('/api/v1/users');
}

export function createUser(user: UserRequest) {
  return requestJson<StaffUser>('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });
}

export function updateUser(userId: string, user: UserRequest) {
  return requestJson<StaffUser>(`/api/v1/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });
}

export function disableUser(userId: string) {
  return requestJson<void>(`/api/v1/users/${userId}`, {
    method: 'DELETE',
  });
}

export function getHrDepartments() {
  return requestJson<Department[]>('/api/v1/hr/departments');
}

export function createHrDepartment(department: DepartmentRequest) {
  return requestJson<Department>('/api/v1/hr/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(department)),
  });
}

export function updateHrDepartment(departmentId: string, department: DepartmentRequest) {
  return requestJson<Department>(`/api/v1/hr/departments/${departmentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(department)),
  });
}

export function getHrJobTitles() {
  return requestJson<JobTitle[]>('/api/v1/hr/job-titles');
}

export function createHrJobTitle(jobTitle: JobTitleRequest) {
  return requestJson<JobTitle>('/api/v1/hr/job-titles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(jobTitle)),
  });
}

export function updateHrJobTitle(jobTitleId: string, jobTitle: JobTitleRequest) {
  return requestJson<JobTitle>(`/api/v1/hr/job-titles/${jobTitleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(jobTitle)),
  });
}

export function getHrEmployees(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  return requestJson<EmployeePage>(`/api/v1/hr/employees${suffix}`);
}

export function getHrEmployee(employeeId: string) {
  return requestJson<EmployeeProfile>(`/api/v1/hr/employees/${employeeId}`);
}

export function createHrEmployee(employee: EmployeeRequest) {
  return requestJson<EmployeeProfile>('/api/v1/hr/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(employee)),
  });
}

export function updateHrEmployee(employeeId: string, employee: EmployeeRequest) {
  return requestJson<EmployeeProfile>(`/api/v1/hr/employees/${employeeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(employee)),
  });
}

export function syncHrEmployeesFromUsers() {
  return requestJson<EmployeeUserSyncResult>('/api/v1/hr/employees/sync-users', {
    method: 'POST',
  });
}

export function getHrDocuments(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  return requestJson<EmployeeDocument[]>(`/api/v1/hr/documents${suffix}`);
}

export function uploadHrDocument(document: EmployeeDocumentUploadRequest) {
  const formData = new FormData();
  formData.append('employeeId', document.employeeId);
  formData.append('documentType', document.documentType);
  formData.append('title', document.title);
  formData.append('notes', document.notes);
  formData.append('file', document.file);

  return requestJson<EmployeeDocument>('/api/v1/hr/documents', {
    method: 'POST',
    body: formData,
  });
}

export function downloadHrDocument(documentId: string) {
  return requestBlob(`/api/v1/hr/documents/${documentId}/content`, {
    method: 'GET',
  });
}

export function getHrAttendance(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  return requestJson<AttendancePage>(`/api/v1/hr/attendance${suffix}`);
}

export function createHrAttendance(attendance: AttendanceRequest) {
  return requestJson<AttendanceRecord>('/api/v1/hr/attendance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeAttendanceRequest(attendance)),
  });
}

export function updateHrAttendance(attendanceId: string, attendance: AttendanceRequest) {
  return requestJson<AttendanceRecord>(`/api/v1/hr/attendance/${attendanceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeAttendanceRequest(attendance)),
  });
}

export function getHrLeavePage() {
  return requestJson<LeavePage>('/api/v1/hr/leave');
}

export function createHrLeaveType(leaveType: LeaveTypeRequest) {
  return requestJson<LeaveType>('/api/v1/hr/leave/types', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(leaveType)),
  });
}

export function updateHrLeaveType(leaveTypeId: string, leaveType: LeaveTypeRequest) {
  return requestJson<LeaveType>(`/api/v1/hr/leave/types/${leaveTypeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(leaveType)),
  });
}

export function createHrLeaveRequest(request: LeaveRequestInput) {
  return requestJson<LeaveRequestRecord>('/api/v1/hr/leave/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(request)),
  });
}

export function updateHrLeaveRequest(requestId: string, request: LeaveRequestInput) {
  return requestJson<LeaveRequestRecord>(`/api/v1/hr/leave/requests/${requestId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(request)),
  });
}

export function getHrPerformance(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  return requestJson<EmployeePerformancePage>(`/api/v1/hr/performance${suffix}`);
}

export function createHrPerformanceEntry(entry: EmployeePerformanceEntryRequest) {
  return requestJson<EmployeePerformanceEntry>('/api/v1/hr/performance/entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(entry)),
  });
}

export function getHrPayrollPage() {
  return requestJson<PayrollPage>('/api/v1/hr/payroll');
}

export function createHrPayrollComponent(component: PayrollComponentRequest) {
  return requestJson<PayrollComponent>('/api/v1/hr/payroll/components', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(component)),
  });
}

export function updateHrPayrollSalesBonusRule(rule: PayrollSalesBonusRuleRequest) {
  return requestJson<PayrollSalesBonusRule>('/api/v1/hr/payroll/sales-bonus-rule', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(rule)),
  });
}

export function createHrPayrollPeriod(period: PayrollPeriodRequest) {
  return requestJson<PayrollPeriod>('/api/v1/hr/payroll/periods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(period)),
  });
}

export function createHrPayrollRun(run: PayrollRunRequest) {
  return requestJson<PayrollRun>('/api/v1/hr/payroll/runs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizeNullableRequest(run)),
  });
}

export function recalculateHrPayrollRun(runId: string) {
  return requestJson<PayrollRun>(`/api/v1/hr/payroll/runs/${runId}/recalculate`, {
    method: 'POST',
  });
}

export function updateHrPayrollEmployeeAdjustment(
  runId: string,
  payrollEmployeeId: string,
  adjustment: PayrollEmployeeAdjustmentRequest,
) {
  return requestJson<PayrollEmployee>(
    `/api/v1/hr/payroll/runs/${runId}/employees/${payrollEmployeeId}/adjustments`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizeNullableRequest(adjustment)),
    },
  );
}

export function getProductCategories() {
  return requestJson<ProductCategory[]>('/api/v1/catalog/categories');
}

export function createProductCategory(category: ProductCategoryRequest) {
  return requestJson<ProductCategory>('/api/v1/catalog/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(category),
  });
}

export function updateProductCategory(categoryId: string, category: ProductCategoryRequest) {
  return requestJson<ProductCategory>(`/api/v1/catalog/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(category),
  });
}

export function deactivateProductCategory(categoryId: string) {
  return requestJson<void>(`/api/v1/catalog/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export function getProducts() {
  return requestJson<Product[]>('/api/v1/catalog/products');
}

export function createProduct(product: ProductRequest) {
  return requestJson<Product>('/api/v1/catalog/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });
}

export function updateProduct(productId: string, product: ProductRequest) {
  return requestJson<Product>(`/api/v1/catalog/products/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  });
}

export function deactivateProduct(productId: string) {
  return requestJson<void>(`/api/v1/catalog/products/${productId}`, {
    method: 'DELETE',
  });
}

export function getInventory() {
  return requestJson<InventoryItem[]>('/api/v1/inventory');
}

export function updateInventoryReorderLevel(
  inventoryItemId: string,
  request: InventoryReorderLevelRequest,
) {
  return requestJson<InventoryItem>(`/api/v1/inventory/${inventoryItemId}/reorder-level`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
}

export function getStockIntakes() {
  return requestJson<StockIntake[]>('/api/v1/stock-intakes');
}

export function addStock(stockIntake: StockIntakeRequest) {
  return requestJson<StockIntake>('/api/v1/stock-intakes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stockIntake),
  });
}

export function getStockAdjustments() {
  return requestJson<StockAdjustment[]>('/api/v1/stock-adjustments');
}

export function getStockAdjustmentSummary() {
  return requestJson<StockAdjustmentSummary>('/api/v1/stock-adjustments/summary');
}

export function createStockAdjustment(stockAdjustment: StockAdjustmentRequest) {
  return requestJson<StockAdjustment>('/api/v1/stock-adjustments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(stockAdjustment),
  });
}

export function getTransfers() {
  return requestJson<StockTransfer[]>('/api/v1/transfers');
}

export function createTransfer(transfer: StockTransferRequest) {
  return requestJson<StockTransfer>('/api/v1/transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transfer),
  });
}

export function getSales(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  return requestJson<Sale[]>(`/api/v1/sales${suffix}`);
}

export function createSale(sale: SaleRequest, idempotencyKey: string) {
  return requestJson<Sale>('/api/v1/sales', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(sale),
  });
}

export function getExpenses() {
  return requestJson<Expense[]>('/api/v1/expenses');
}

export function createExpense(expense: ExpenseRequest) {
  return requestJson<Expense>('/api/v1/expenses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expense),
  });
}

export function markExpensePaid(expenseId: string) {
  return requestJson<Expense>(`/api/v1/expenses/${expenseId}/paid`, {
    method: 'POST',
  });
}

export function voidExpense(expenseId: string) {
  return requestJson<Expense>(`/api/v1/expenses/${expenseId}`, {
    method: 'DELETE',
  });
}

function apiSearchParams(params?: Record<string, string | undefined>) {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

function normalizeNullableRequest<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === 'string' && value.trim() === '' ? null : value,
    ]),
  );
}

function normalizeAttendanceRequest(attendance: AttendanceRequest) {
  const normalized = normalizeNullableRequest(attendance);
  return {
    ...normalized,
    clockIn: normalizeOffsetDateTimeInput(attendance.clockIn),
    clockOut: normalizeOffsetDateTimeInput(attendance.clockOut),
  };
}

function normalizeOffsetDateTimeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toISOString();
}

export async function login(credentials: LoginCredentials) {
  const currentUser = await requestJson<CurrentUser>('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  await refreshCsrfToken();
  return currentUser;
}

export async function logout() {
  await requestJson<void>('/api/v1/auth/logout', {
    method: 'POST',
  });
  await refreshCsrfToken();
}

async function getErrorMessage(response: Response) {
  const fallback = `API request failed with ${response.status} from ${response.url}`;
  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('json')) {
    return (await response.text()) || fallback;
  }

  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}

async function getUnexpectedResponseMessage(response: Response, contentType: string) {
  const text = await response.text();
  const trimmed = text.trim();
  const received = contentType || 'unknown content type';

  if (looksLikeHtml(trimmed)) {
    if (!import.meta.env.DEV && response.url.startsWith(window.location.origin)) {
      return 'Expected backend JSON but received the frontend HTML app. Set VITE_API_BASE_URL in Vercel to the Render backend URL, then redeploy the frontend.';
    }

    return `Expected JSON from ${response.url} but received HTML with status ${response.status}. Check that the backend is running on port 8080, then refresh the app.`;
  }

  return `Expected JSON from ${response.url} but received ${received || 'a non-JSON response'} with status ${response.status}.`;
}

function looksLikeHtml(text: string) {
  return text.startsWith('<!DOCTYPE') || text.startsWith('<html');
}
