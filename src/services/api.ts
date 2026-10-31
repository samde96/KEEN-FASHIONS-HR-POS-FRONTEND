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
  Customer,
  CustomerPeriodReport,
  CustomerRequest,
  Expense,
  ExpenseRequest,
  InventoryItem,
  InventoryReorderLevelRequest,
  AuditEvent,
  ModuleSummary,
  NotificationItem,
  Organization,
  Permission,
  PermissionRequest,
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
  Supplier,
  SupplierRequest,
  UserRequest,
} from '../data/types';
import {
  cacheOfflineResponse,
  clearOfflineSession,
  configureOfflineApi,
  getOfflineAuthEpoch,
  getOfflineScope,
  getOfflineIdentity,
  isOfflineAccessLocked,
  markConnected,
  markOffline,
  OfflineError,
  readOfflineResponse,
  readOfflineUser,
  rememberOfflineUser,
  removeOfflineResponse,
  unlockOfflineAccess,
} from './offline';
import { enrollOfflineLogin, offlineLogin } from './offlineLogin';
import {
  configureDeviceTransport,
  effectiveInventory,
  effectiveProducts,
  localRecords,
  localStockReceipts,
  queueAdjustment,
  queueIntake,
  queueSale,
} from './offlineOperations';
import { readDevice, updateDevice } from './deviceStore';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const isDevelopment = import.meta.env.DEV;
const apiBaseUrl = isDevelopment ? '' : configuredApiBaseUrl;
configureOfflineApi(apiBaseUrl);
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

export type DocumentEmailRequest = {
  to: string;
  from?: string;
  subject: string;
  message: string;
  attachmentFileName: string;
  attachmentContentBase64: string;
};

export type DocumentEmailResponse = {
  providerMessageId?: string;
  status: string;
};

let csrfToken: string | null = null;
let csrfHeaderName = fallbackCsrfHeaderName;
let csrfTokenRequest: Promise<string> | null = null;

export async function requestJson<T>(
  path: string,
  init?: RequestInit,
  options?: { onlineOnly?: boolean },
): Promise<T> {
  const isRead = (init?.method ?? 'GET').toUpperCase() === 'GET';
  const isIdentity = path === '/api/v1/me';
  const epoch = getOfflineAuthEpoch();
  const scope = getOfflineScope();
  if (isIdentity && isOfflineAccessLocked() && !options?.onlineOnly) {
    throw new Error('Sign in online to continue.');
  }
  async function savedResponse(): Promise<{ data: T } | undefined> {
    if (!isRead || options?.onlineOnly) return undefined;
    if (isIdentity) {
      const user = await readOfflineUser();
      return user ? { data: user as T } : undefined;
    }
    return readOfflineResponse<T>(scope, path);
  }
  let response: Response;
  let securedInit: RequestInit | undefined;
  try {
    securedInit = await withCsrf(path, init);
    const timeout = AbortSignal.timeout(20_000);
    response = await fetchApi(path, {
      ...securedInit,
      signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    if (
      !(error instanceof TypeError) &&
      !(error instanceof OfflineError) &&
      !(error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name))
    )
      throw error;
    markOffline();
    const saved = await savedResponse();
    if (saved) return saved.data;
    throw new OfflineError(
      isRead
        ? 'This information is not saved for offline use. Connect to load it on this device.'
        : 'The server could not confirm this change. Keep your draft and reconnect before retrying.',
    );
  }

  if (response.status >= 500) {
    markOffline();
    const saved = await savedResponse();
    if (saved) return saved.data;
    if (!isRead)
      throw new OfflineError(
        'The backend is temporarily unavailable. Your saved transaction remains on this device for retry.',
      );
  } else {
    markConnected();
  }

  if (!response.ok) {
    if (response.status === 403 && isUnsafeMethod(securedInit?.method)) {
      clearCsrfToken();
    }
    if (
      !options?.onlineOnly &&
      (response.status === 401 || (isIdentity && response.status === 403))
    )
      await clearOfflineSession();
    if (response.status === 403 && isRead) await removeOfflineResponse(scope, path);
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    throw new Error(await getUnexpectedResponseMessage(response, contentType));
  }

  const data = (await response.json()) as T;
  if (isIdentity && epoch === getOfflineAuthEpoch()) {
    await rememberOfflineUser(data as CurrentUser, epoch);
  } else if (isRead) {
    await cacheOfflineResponse(scope, path, data);
  }
  return data;
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
    signal: init?.signal ?? AbortSignal.timeout(20_000),
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
        if (response.status >= 500)
          throw new OfflineError('The backend is temporarily unavailable.');
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
  if (!isDevelopment || apiBaseUrl || !path.startsWith('/api/')) {
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

export async function getBranches() {
  const branches = await requestJson<Branch[]>('/api/v1/branches');
  const user = getOfflineIdentity();
  if (user)
    await updateDevice(
      user,
      (data) => {
        data.branches = branches;
      },
      false,
    ).catch(() => undefined);
  return branches;
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
  const user = getOfflineIdentity();
  if (
    user &&
    !user.permissionCodes.includes('admin:manage') &&
    user.permissionCodes.includes('inventory:receive')
  )
    return requestJson<Supplier[]>('/api/v1/offline/operations/suppliers');
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

export function getCustomers() {
  return requestJson<Customer[]>('/api/v1/customers');
}

export function createCustomer(customer: CustomerRequest) {
  return requestJson<Customer>('/api/v1/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customer),
  });
}

export function updateCustomer(customerId: string, customer: CustomerRequest) {
  return requestJson<Customer>(`/api/v1/customers/${customerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customer),
  });
}

export function clearCustomerData(customerId: string) {
  return requestJson<Customer>(`/api/v1/customers/${customerId}/clear`, {
    method: 'POST',
  });
}

export function deleteCustomer(customerId: string) {
  return requestJson<void>(`/api/v1/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export type CustomerPeriodReportParams = {
  from?: string;
  to?: string;
};

export function getCustomerPeriodReport(customerId: string, params?: CustomerPeriodReportParams) {
  return requestJson<CustomerPeriodReport>(
    `/api/v1/customers/${customerId}/period-report${apiSearchParams(params)}`,
  );
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

export function sendDocumentEmail(payload: DocumentEmailRequest) {
  return requestJson<DocumentEmailResponse>('/api/v1/document-delivery/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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
  return effectiveProducts(() => requestJson<Product[]>('/api/v1/catalog/products'));
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
  // The operation store owns the stock baseline. An old HTTP snapshot must not
  // overwrite inventory returned with a newly acknowledged transaction.
  return effectiveInventory(() =>
    requestJson<InventoryItem[]>('/api/v1/inventory', undefined, { onlineOnly: true }),
  );
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

export async function getStockIntakes() {
  let rows: StockIntake[];
  try {
    rows = await requestJson<StockIntake[]>('/api/v1/stock-intakes');
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    rows = [];
  }
  return localStockReceipts(await localRecords(rows, 'STOCK_INTAKE'));
}

export function addStock(stockIntake: StockIntakeRequest) {
  return queueIntake(stockIntake);
}

export function getStockAdjustments() {
  return requestJson<StockAdjustment[]>('/api/v1/stock-adjustments').then((rows) =>
    localRecords(rows, 'STOCK_ADJUSTMENT'),
  );
}

export function getStockAdjustmentSummary() {
  return requestJson<StockAdjustmentSummary>('/api/v1/stock-adjustments/summary');
}

export function createStockAdjustment(stockAdjustment: StockAdjustmentRequest) {
  return queueAdjustment(stockAdjustment);
}

export async function getSales(params?: URLSearchParams) {
  const suffix = params && Array.from(params).length > 0 ? `?${params.toString()}` : '';
  let rows: Sale[];
  try {
    rows = await requestJson<Sale[]>(`/api/v1/sales${suffix}`);
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    rows = [];
  }
  const timeZone = getOfflineIdentity()
    ? await readDevice()
        .then((data) => data.organization?.timeZone)
        .catch(() => undefined)
    : undefined;
  return localRecords(rows, 'SALE', (op) => {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timeZone ?? 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(op.occurredAt));
    const part = (name: string) => parts.find((value) => value.type === name)?.value ?? '';
    const day = `${part('year')}-${part('month')}-${part('day')}`;
    return (
      (!params?.get('from') || day >= params.get('from')!) &&
      (!params?.get('to') || day <= params.get('to')!)
    );
  });
}

export function createSale(sale: SaleRequest, idempotencyKey: string, manualMpesa = false) {
  return queueSale(sale, idempotencyKey, manualMpesa);
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

export async function login(credentials: LoginCredentials) {
  let currentUser: CurrentUser;
  try {
    currentUser = await requestJson<CurrentUser>('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
  } catch (error) {
    if (error instanceof OfflineError)
      return offlineLogin(credentials.username, credentials.password);
    throw error;
  }
  await unlockOfflineAccess(currentUser);
  await enrollOfflineLogin(
    credentials.username,
    credentials.password,
    currentUser,
    credentials.rememberDevice,
  ).catch(() => undefined);
  await refreshCsrfToken();
  return currentUser;
}

configureDeviceTransport({
  get: <T>(path: string) => requestJson<T>(path, undefined, { onlineOnly: true }),
  send: async (operation) => {
    const pendingIds = (await readDevice()).operations
      .filter((op) => op.status !== 'applied')
      .slice(0, 5000)
      .map((op) => op.id);
    return requestJson(
      '/api/v1/offline/operations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: operation.id,
          userId: operation.userId,
          occurredAt: operation.occurredAt,
          kind: operation.kind,
          payload: operation.payload,
          pendingIds,
        }),
      },
      { onlineOnly: true },
    );
  },
});

export async function logout() {
  try {
    await requestJson<void>('/api/v1/auth/logout', { method: 'POST' });
  } finally {
    clearCsrfToken();
    await clearOfflineSession();
  }
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
    if (!isDevelopment && response.url.startsWith(window.location.origin)) {
      return 'Expected backend JSON but received the frontend HTML app. Set VITE_API_BASE_URL in Vercel to the Render backend URL, then redeploy the frontend.';
    }

    return `Expected JSON from ${response.url} but received HTML with status ${response.status}. Check that the backend is running on port 8080, then refresh the app.`;
  }

  return `Expected JSON from ${response.url} but received ${received || 'a non-JSON response'} with status ${response.status}.`;
}

function looksLikeHtml(text: string) {
  return text.startsWith('<!DOCTYPE') || text.startsWith('<html');
}
