import ReceiptDialog from './components/ReceiptDialog';
import {
  formatMoney,
  formatDateTime,
  formatSalePayments,
  formatPaymentMethod,
} from './services/receiptFormatting';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { appVersion } from './appVersion';
import { appName } from './appBrand';
import CrmOverview from './components/CrmOverview';
import CommercialFormSection from './components/CommercialFormSection';
import VariantProductFields, { isSellableProduct } from './components/VariantProductFields';
import PosPreferencesPanel from './components/PosPreferencesPanel';
import DailySalesReportsPanel from './components/DailySalesReportsPanel';
import CashierShiftsPage from './components/CashierShiftsPage';
import JournalHelp from './components/JournalHelp';
import MpesaPaymentPanel from './components/MpesaPaymentPanel';
import LocationsPage from './components/LocationsPage';
import ProductPhotoInput from './components/ProductPhotoInput';
import OfflineStatus, {
  ConnectionBadge,
  OfflineCoordinator,
  DeviceCoordinator,
} from './components/OfflineStatus';
import StockTransfersPage from './components/StockTransfersPage';
import useOffline from './hooks/useOffline';
import { offlineOwnerKey } from './services/offline';
import { readPosDraft, savePosDraft } from './services/posDrafts';
import { clearMpesaRecovery, getMpesaConfig, readMpesaRecovery } from './services/mpesa';
import useStockEntry from './hooks/useStockEntry';
import { StockNavigationProvider, useStockNavigationGuard } from './hooks/StockNavigationGuard';
import SaleReversalActions from './components/SaleReversalActions';
import { getSaleReversals } from './services/posOperations';
import AppLayout, { PosAppNavigation } from './platform/AppLayout';
import AppsHome from './platform/AppsHome';
import { AppWorkspace, StockActivity } from './platform/AppWorkspace';
import { PlatformProvider, inBranch, usePlatform } from './platform/PlatformContext';
import {
  canAccessPath,
  hasPermission,
  hasAnyPermission,
  isAdminUser,
  isCashierUser,
} from './platform/appRegistry';
import './styles/crm.css';
import './styles/dashboard.css';
import './styles/operations.css';
import './styles/catalog.css';
import './styles/platform.css';
import './styles/home-hero.css';
import './styles/contrast.css';
import './styles/cashier.css';
import './styles/accounting.css';
import './styles/mobile.css';
import {
  createAccountingAccount,
  createAccountingJournal,
  createAccountingPeriod,
  createAccountingTaxRule,
  createCustomer,
  createStockAdjustment,
  createExpense,
  createPermission,
  createProduct,
  createProductCategory,
  createRole,
  createSale,
  createSupplier,
  createUser,
  deactivateAccountingAccount,
  deactivateProduct,
  deactivateProductCategory,
  deactivateSupplier,
  deleteCustomer,
  deleteRole,
  disableUser,
  getAccountingAccounts,
  getAccountingBalanceSheet,
  getAccountingCashFlow,
  getAccountingJournals,
  getAccountingLedger,
  getAccountingPeriods,
  getAccountingProfitAndLoss,
  getAccountingSummary,
  getAccountingTaxRules,
  getAccountingTrialBalance,
  getAuditEvents,
  getBranches,
  getCommercialSummary,
  getCurrentUser,
  getCustomerPeriodReport,
  getCustomers,
  getCustomersSummary,
  getExpenses,
  getInventory,
  getOrganization,
  getPermissions,
  getProductCategories,
  getProducts,
  getProcurementSummary,
  getNotifications,
  getNotificationsSummary,
  getRoles,
  getSales,
  getStockAdjustments,
  getStockAdjustmentSummary,
  getStockIntakes,
  getSuppliers,
  getUsers,
  login,
  logout as logoutSession,
  markExpensePaid,
  postAccountingJournal,
  sendDocumentEmail,
  updateAccountingAccount,
  updateAccountingJournal,
  updateAccountingPeriod,
  updateAccountingTaxRule,
  updateCustomer,
  updateInventoryReorderLevel,
  updatePermission,
  updateProduct,
  updateProductCategory,
  updateOrganizationVatSettings,
  updateRole,
  updateSupplier,
  updateUser,
  voidAccountingJournal,
  voidExpense,
  clearCustomerData,
} from './services/api';
import bannerImageUrl from './assets/fashion-pos-banner.png';
import keenLogoImageUrl from './assets/keen-logo.png';
import keenLogoWhiteImageUrl from './assets/keen-logo-white.png';
import type {
  AccountingAccount,
  AccountingAccountRequest,
  AccountingAccountType,
  AccountingJournal,
  AccountingJournalLineRequest,
  AccountingJournalRequest,
  AccountingJournalStatus,
  AccountingPeriod,
  AccountingPeriodRequest,
  AccountingPeriodStatus,
  AccountingStatementRow,
  AccountingTaxRule,
  AccountingTaxRuleRequest,
  AuditEvent,
  ApiSource,
  Branch,
  CartLine,
  CurrentUser,
  Customer,
  CustomerPeriodReport,
  CustomerRequest,
  CustomerStatus,
  CustomerType,
  Expense,
  ExpensePaymentMethod,
  ExpenseRequest,
  ExpenseStatus,
  InventoryItem,
  ModuleSummary,
  ModuleWorkItem,
  Organization,
  Permission,
  PermissionRequest,
  NotificationItem,
  Product,
  ProductCategory,
  ProductCategoryRequest,
  ProductRequest,
  ProductVatCategory,
  PaymentMethod,
  Role,
  RoleRequest,
  Sale,
  SalePaymentRequest,
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
} from './data/types';

const queryClientOptions = {
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      networkMode: 'always' as const,
    },
    mutations: { networkMode: 'always' as const },
  },
};

function canViewProfit(user: CurrentUser) {
  return isAdminUser(user);
}

function primaryRoleLabel(user: CurrentUser) {
  if (user.roleNames.length === 0) {
    return 'User';
  }
  if (user.roleNames.length === 1) {
    return user.roleNames[0];
  }
  return user.roleNames.join(' / ');
}

const customerLookupSchema = z.object({
  query: z.string().trim().max(80, 'Use 80 characters or less'),
});

type CustomerLookup = z.infer<typeof customerLookupSchema>;

const ownerMetrics = [
  {
    label: 'Net Sales',
    value: 0,
    detail: '0%',
    comparison: 'current period',
    tone: 'blue',
    icon: 'bi-bar-chart-fill',
    profitOnly: false,
  },
  {
    label: 'Gross Profit',
    value: 0,
    detail: '0%',
    comparison: 'current period',
    tone: 'green',
    icon: 'bi-database',
    profitOnly: true,
  },
  {
    label: 'Expenses',
    value: 0,
    detail: '0%',
    comparison: 'current period',
    tone: 'orange',
    icon: 'bi-wallet2',
    negative: true,
    profitOnly: false,
  },
  {
    label: 'Estimated Contribution',
    value: 0,
    detail: '0%',
    comparison: 'current period',
    tone: 'cyan',
    icon: 'bi-pie-chart',
    profitOnly: true,
  },
];

const salesTrend = [{ day: 'Current', netSales: 0, grossProfit: 0 }];

const paymentMethodOptions: {
  method: PaymentMethod;
  label: string;
  icon: string;
  color: string;
}[] = [
  { method: 'MPESA', label: 'M-Pesa', icon: 'bi-phone', color: '#7357e8' },
  { method: 'CASH', label: 'Cash', icon: 'bi-cash-stack', color: '#2878f0' },
  { method: 'CARD', label: 'Card', icon: 'bi-credit-card', color: '#ff8a1f' },
];

type PaymentMode = 'single' | 'split';

type PaymentDraft = {
  id: string;
  method: PaymentMethod | '';
  amount: string;
  paymentReference: string;
  cashReceived: string;
};

type PaymentBuildResult =
  { ok: true; payments: SalePaymentRequest[] } | { ok: false; error: string };

type PaymentDraftResult = { ok: true; payment: SalePaymentRequest } | { ok: false; error: string };

const expensePaymentMethodOptions: {
  method: ExpensePaymentMethod;
  label: string;
  icon: string;
  color: string;
}[] = [
  { method: 'MPESA', label: 'M-Pesa', icon: 'bi-phone', color: '#7357e8' },
  { method: 'CASH', label: 'Cash', icon: 'bi-cash-stack', color: '#2878f0' },
  { method: 'CARD', label: 'Card', icon: 'bi-credit-card', color: '#ff8a1f' },
  {
    method: 'BANK_TRANSFER',
    label: 'Bank Transfer',
    icon: 'bi-bank',
    color: '#7357e8',
  },
];

const expenseCategoryOptions = [
  'Rent',
  'Utilities',
  'Transport',
  'Supplies',
  'Marketing',
  'Repairs',
  'Other',
];

const vatCategoryOptions: {
  category: ProductVatCategory;
  label: string;
  shortLabel: string;
  rate: number;
  description: string;
}[] = [
  {
    category: 'A',
    label: 'Category A (Standard Rated Supplies - 16%)',
    shortLabel: 'A - Standard 16%',
    rate: 0.16,
    description: 'Standard-rated supplies with 16% VAT.',
  },
  {
    category: 'G',
    label: 'Category G (Exempt Supplies - 0%)',
    shortLabel: 'G - Exempt 0%',
    rate: 0,
    description: 'Exempt supplies with no VAT charged.',
  },
];

const reportGroups = [
  {
    heading: 'Sales & Profitability',
    hint: "Understand what's driving your revenue and profit.",
    cards: [
      { title: 'Sales Summary', icon: 'bi-bar-chart-fill', tone: 'blue', type: 'sales' },
      { title: 'Product Sales', icon: 'bi-tag-fill', tone: 'blue', type: 'products' },
      {
        title: 'Category Performance',
        icon: 'bi-pie-chart-fill',
        tone: 'orange',
        type: 'category',
      },
    ],
  },
  {
    heading: 'Operations',
    hint: 'Monitor payments, sales flow and inventory health.',
    cards: [
      { title: 'Shop Snapshot', icon: 'bi-shop-window', tone: 'blue', type: 'shop' },
      {
        title: 'Payments & Reconciliation',
        icon: 'bi-credit-card-2-front-fill',
        tone: 'blue',
        type: 'payments',
      },
      { title: 'Products & Inventory', icon: 'bi-box-fill', tone: 'orange', type: 'inventory' },
    ],
  },
  {
    heading: 'Operations & Controls',
    hint: 'Keep track of expenses, inventory variances and compliance.',
    cards: [
      { title: 'Expenses', icon: 'bi-cash-coin', tone: 'purple', type: 'expenses' },
      {
        title: 'Losses & Variances',
        icon: 'bi-exclamation-triangle-fill',
        tone: 'red',
        type: 'losses',
      },
      { title: 'Audit & Compliance', icon: 'bi-shield-fill-check', tone: 'blue', type: 'audit' },
    ],
  },
];

type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

type ReportDateRange = {
  from: string;
  to: string;
};

type ReportDetailTab = 'sales' | 'receipts' | 'inventory' | 'expenses' | 'losses';

const reportPeriodOptions: { period: ReportPeriod; label: string; icon: string }[] = [
  { period: 'today', label: 'Today', icon: 'bi-calendar-day' },
  { period: 'yesterday', label: 'Yesterday', icon: 'bi-calendar-minus' },
  { period: 'week', label: 'This Week', icon: 'bi-calendar-week' },
  { period: 'month', label: 'This Month', icon: 'bi-calendar-month' },
  { period: 'custom', label: 'Custom', icon: 'bi-sliders' },
];

const PRODUCT_IMAGE_MAX_BYTES = 1_000_000;
const PRODUCT_IMAGE_DATA_URL_MAX_LENGTH = 1_500_000;

export default function App() {
  const [queryClient] = useState(() => new QueryClient(queryClientOptions));
  const [router] = useState(() => createBrowserRouter([{ path: '*', element: <AppShell /> }]));

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineCoordinator />
      <StockNavigationProvider>
        <RouterProvider router={router} />
      </StockNavigationProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const stockNavigation = useStockNavigationGuard();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLoginRoute = location.pathname.startsWith('/login');
  const userQuery = useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
    enabled: !isLoginRoute,
    retry: false,
  });
  const dataQueriesEnabled = !isLoginRoute && userQuery.isSuccess;
  const organizationQuery = useQuery({
    queryKey: ['organization'],
    queryFn: getOrganization,
    enabled: dataQueriesEnabled,
  });
  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: dataQueriesEnabled,
  });

  const currentUser = userQuery.data;
  const branches = branchesQuery.data ?? [];
  const source: ApiSource = 'api';

  async function handleLogout() {
    if (!(await stockNavigation.confirmLeave())) return;
    try {
      await logoutSession();
    } catch {
      // Offline sign-out still revokes local access and clears saved business reads.
    } finally {
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }

  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (userQuery.isPending) {
    return <AuthLoading />;
  }

  if (userQuery.isError) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser || organizationQuery.isPending || branchesQuery.isPending) {
    return <AuthLoading />;
  }

  if (organizationQuery.isError || branchesQuery.isError || !organizationQuery.data) {
    return (
      <DataLoadError
        detail={businessDataErrorMessage(
          organizationQuery.error,
          branchesQuery.error,
          organizationQuery.data,
        )}
        isRetrying={organizationQuery.isFetching || branchesQuery.isFetching}
        onLogout={handleLogout}
        onRetry={() => {
          void organizationQuery.refetch();
          void branchesQuery.refetch();
        }}
      />
    );
  }

  const organization = organizationQuery.data;
  return (
    <PlatformProvider
      key={`${currentUser.organizationId}:${currentUser.userId}`}
      user={currentUser}
      branches={branches}
    >
      <DeviceCoordinator user={currentUser} />
      <PlatformRoutes
        currentUser={currentUser}
        organization={organization}
        onLogout={handleLogout}
        source={source}
      />
    </PlatformProvider>
  );
}

function PlatformRoutes({
  currentUser,
  organization,
  onLogout,
  source,
}: {
  currentUser: CurrentUser;
  organization: Organization;
  onLogout: () => void;
  source: ApiSource;
}) {
  const location = useLocation();
  const { branchId, branches: authorizedBranches, selectedBranch } = usePlatform();
  const branches = selectedBranch ? [selectedBranch] : authorizedBranches;
  const primaryBranch = selectedBranch ?? authorizedBranches[0];
  const defaultRoute = defaultPathForUser(currentUser);

  if (location.pathname !== '/' && !canAccessPath(currentUser, location.pathname)) {
    return <Navigate to={defaultRoute} replace />;
  }

  if (location.pathname.startsWith('/pos')) {
    return (
      <Routes>
        <Route
          path="/pos"
          element={
            <PosWorkspace
              activeBranch={primaryBranch}
              branches={branches}
              organization={organization}
              onLogout={onLogout}
              source={source}
              currentUser={currentUser}
            />
          }
        />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout user={currentUser} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route
          path="/shifts"
          element={<CashierShiftsPage user={currentUser} organization={organization} />}
        />
        <Route path="/home" element={<AppsHome user={currentUser} organization={organization} />} />
        <Route path="/stock-transfers" element={<StockTransfersPage />} />
        <Route path="/apps" element={<AppsHome user={currentUser} organization={organization} />} />
        <Route
          path="/favorites"
          element={
            <AppsHome
              key="favorites"
              view="favorites"
              user={currentUser}
              organization={organization}
            />
          }
        />
        <Route
          path="/recent"
          element={
            <AppsHome key="recent" view="recent" user={currentUser} organization={organization} />
          }
        />
        <Route path="/apps/inventory/activity" element={<StockActivity user={currentUser} />} />
        <Route
          path="/apps/inventory/adjustments"
          element={<StockActivity user={currentUser} mode="adjustments" />}
        />
        <Route
          path="/apps/warehouse/receipts"
          element={<StockActivity user={currentUser} mode="receipts" />}
        />
        <Route
          path="/apps/:appId"
          element={<AppWorkspace user={currentUser} organization={organization} />}
        />
        <Route
          path="/dashboard"
          element={
            <Dashboard branches={branches} currentUser={currentUser} organization={organization} />
          }
        />
        <Route path="/branches" element={<LocationsPage timeZone={organization.timeZone} />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/product-catalog" element={<ProductsPage organization={organization} />} />
        <Route
          path="/product-categories"
          element={<ProductsPage organization={organization} view="categories" />}
        />
        <Route path="/products" element={<Navigate to="/product-catalog" replace />} />
        <Route path="/suppliers" element={<SuppliersPage organization={organization} />} />
        <Route
          path="/customers"
          element={<CustomersPage key={branchId} branches={branches} organization={organization} />}
        />
        <Route
          path="/crm"
          element={
            <CrmPage
              key={`${organization.id}:${currentUser.userId}:${branchId}`}
              branches={branches}
              currentUser={currentUser}
              organization={organization}
            />
          }
        />
        <Route
          path="/procurement"
          element={
            <ProcurementPage key={branchId} branches={branches} organization={organization} />
          }
        />
        <Route
          path="/inventory"
          element={
            <Inventory key={branchId} currentUser={currentUser} organization={organization} />
          }
        />
        <Route path="/low-stock" element={<LowStockPage organization={organization} />} />
        <Route
          path="/add-stock"
          element={<AddStockPage key={branchId} branches={branches} organization={organization} />}
        />
        <Route
          path="/expenses"
          element={
            <ExpensesPage
              key={branchId}
              branches={branches}
              organization={organization}
              currentUser={currentUser}
            />
          }
        />
        <Route path="/commercial" element={<CommercialPage organization={organization} />} />
        <Route
          path="/reports"
          element={<ReportsHub branches={branches} organization={organization} />}
        />
        <Route
          path="/accounting"
          element={
            <AccountingPage
              key={branchId}
              branches={branches}
              currentUser={currentUser}
              organization={organization}
            />
          }
        />
        <Route path="/notifications" element={<NotificationsPage organization={organization} />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/settings" element={<SettingsPage organization={organization} />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/sales" element={<SalesPage organization={organization} />} />
        <Route path="*" element={<Navigate to="/apps" replace />} />
      </Routes>
    </AppLayout>
  );
}

function defaultPathForUser(user: CurrentUser) {
  return '/apps';
}

function AuthLoading() {
  return (
    <main className="auth-loading" aria-label="Checking session">
      <span className="loading-spinner" aria-hidden="true" />
      <span>Checking session...</span>
    </main>
  );
}

function businessDataErrorMessage(
  organizationError: unknown,
  branchesError: unknown,
  organization: Organization | undefined,
) {
  if (organizationError instanceof Error) {
    return `Organization: ${organizationError.message}`;
  }

  if (branchesError instanceof Error) {
    return `Shop location: ${branchesError.message}`;
  }

  if (!organization) {
    return 'Organization: no data was returned by the API.';
  }

  return undefined;
}

function DataLoadError({
  detail,
  isRetrying,
  onLogout,
  onRetry,
}: {
  detail?: string;
  isRetrying: boolean;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="auth-loading" aria-label="Unable to load business data">
      <img src={keenLogoImageUrl} alt={appName} />
      <span>Unable to load business data.</span>
      {detail ? (
        <p className="auth-error-detail" role="alert">
          {detail}
        </p>
      ) : null}
      <div className="auth-error-actions">
        <button
          className="secondary-action compact-action"
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
        <button className="logout-action" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" />
          Log Out
        </button>
      </div>
    </main>
  );
}

function LoginPage() {
  const offline = useOffline();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login({
        username: email.trim(),
        password,
        rememberDevice,
      });
      queryClient.setQueryData(['me'], user);
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== 'me',
      });
      navigate('/apps', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel" aria-label="Sign in">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-heading">
            <p className="login-app-name">{appName}</p>
            <h1>User Login</h1>
          </div>

          <label className="login-field" htmlFor="login-email">
            <span className="visually-hidden">Email or username</span>
            <span className="field-control">
              <span className="field-icon">
                <i className="bi bi-envelope-fill" aria-hidden="true" />
              </span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="Email Address"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>

          <label className="login-field" htmlFor="login-password">
            <span className="visually-hidden">Password</span>
            <div className="field-control password-field">
              <span className="field-icon">
                <i className="bi bi-lock-fill" aria-hidden="true" />
              </span>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {error ? (
            <p className="login-error" role="alert">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
              />
              <span>Remember this device</span>
            </label>
            <a href="/login">Forgot password?</a>
          </div>

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Login'}
          </button>

          {!offline.connected && (
            <p className="message-banner" role="status">
              Use your saved email and password to sign in offline. This account must have signed in
              online on this device with Remember this device enabled within the last 30 days.
            </p>
          )}
          <p className="login-powered">Powered by CRENVIXMORAVA SYSTEMS</p>
        </form>
      </section>
    </main>
  );
}

function Brand({
  alt = appName,
  variant = 'default',
}: {
  alt?: string;
  variant?: 'default' | 'sidebar';
}) {
  const brandLogoSrc = variant === 'sidebar' ? keenLogoWhiteImageUrl : keenLogoImageUrl;

  return (
    <div className="brand-block">
      <img className="brand-logo" src={brandLogoSrc} alt={alt} />
      <span>{appName}</span>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
};

function PageHeader({ eyebrow, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
}

type WorkspaceProps = {
  activeBranch?: Branch;
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
  onLogout: () => void;
  source: ApiSource;
};

function PosWorkspace({
  activeBranch,
  branches,
  currentUser,
  organization,
  onLogout,
  source,
}: WorkspaceProps) {
  const offline = useOffline();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [mpesaLocked, setMpesaLocked] = useState(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(() =>
    newSaleIdempotencyKey(),
  );
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [saleMessage, setSaleMessage] = useState('');
  const [saleError, setSaleError] = useState('');
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const registerBranch = activeBranch ?? activeBranches[0];
  const mpesaStorageKey = `keen:mpesa:${organization.id}:${currentUser.userId}:${registerBranch?.id ?? ''}`;
  const cartStorageKey = registerBranch
    ? `keen:pos-draft:${offlineOwnerKey(currentUser)}:${registerBranch.id}`
    : '';
  const [loadedCartKey, setLoadedCartKey] = useState('');
  const [cartRecoveryMessage, setCartRecoveryMessage] = useState('');
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    refetchOnMount: 'always',
  });
  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventory,
    refetchOnMount: 'always',
  });
  const products = productsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((product) => product.categoryName)))],
    [products],
  );

  const branchAvailabilityByProduct = useMemo(() => {
    const quantities = new Map<string, number>();
    if (!registerBranch) {
      return quantities;
    }

    for (const item of inventory) {
      if (item.branchId === registerBranch.id) {
        quantities.set(item.productId, item.quantityAvailable);
      }
    }
    return quantities;
  }, [inventory, registerBranch]);

  const visibleProducts = products.filter((product) => {
    const matchesCategory = category === 'All' || product.categoryName === category;
    const haystack =
      `${product.name} ${product.sku} ${product.barcode ?? ''} ${product.categoryName} ${product.department ?? ''} ${product.sizes.join(' ')} ${product.colors.join(' ')}`.toLowerCase();
    return isSellableProduct(product) && matchesCategory && haystack.includes(search.toLowerCase());
  });

  const cartProducts = cart
    .map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return product ? { ...product, quantity: line.quantity } : null;
    })
    .filter((line): line is Product & { quantity: number } => Boolean(line));

  const subtotal = cartProducts.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discount = 0;
  const vat = taxAmountForProductLines(cartProducts, discount);
  const total = subtotal - discount + vat;
  const completeSaleMutation = useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
      manualMpesa,
    }: {
      payload: SaleRequest;
      idempotencyKey: string;
      manualMpesa?: boolean;
    }) => createSale(payload, idempotencyKey, manualMpesa),
    onSuccess: async (sale) => {
      clearMpesaRecovery(mpesaStorageKey);
      setMpesaLocked(false);
      updateSalesCache(queryClient, sale);
      decrementInventoryCacheForSale(queryClient, sale);
      decrementProductStockCacheForSale(queryClient, sale);
      setPaymentOpen(false);
      setCart([]);
      setCustomer('Walk-in Customer');
      setCheckoutIdempotencyKey(newSaleIdempotencyKey());
      setSaleError('');
      setSaleMessage(
        sale.syncStatus === 'pending'
          ? `Sale ${sale.saleNumber} completed on this device. Pending backend synchronization.`
          : `Sale ${sale.saleNumber} recorded.`,
      );
      setCompletedSale(sale);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  useEffect(() => {
    const recovery = readMpesaRecovery(mpesaStorageKey);
    const cartDraft = recovery ? undefined : readPosDraft(cartStorageKey);
    setCart(recovery?.sale.lines ?? cartDraft?.cart ?? []);
    setCustomer(recovery?.sale.customerName || cartDraft?.customer || 'Walk-in Customer');
    setCheckoutIdempotencyKey(recovery?.key ?? cartDraft?.checkoutKey ?? newSaleIdempotencyKey());
    setLoadedCartKey(cartStorageKey);
    setCartRecoveryMessage(
      cartDraft
        ? 'Saved cart restored from this device. Review current prices and stock before taking payment.'
        : '',
    );
    setMpesaLocked(Boolean(recovery));
    setPaymentOpen(Boolean(recovery));
    setSaleMessage('');
    setSaleError('');
    setCompletedSale(null);
  }, [mpesaStorageKey, cartStorageKey]);

  useEffect(() => {
    if (loadedCartKey !== cartStorageKey || mpesaLocked) return;
    savePosDraft(cartStorageKey, { cart, customer, checkoutKey: checkoutIdempotencyKey });
    if (cart.length === 0) setCartRecoveryMessage('');
  }, [cartStorageKey, loadedCartKey, cart, customer, checkoutIdempotencyKey, mpesaLocked]);

  useEffect(() => {
    function handleCheckoutShortcut(event: KeyboardEvent) {
      if (event.key === 'F3' && !paymentOpen && !completedSale) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (
        event.key !== 'Enter' ||
        paymentOpen ||
        completedSale ||
        cartProducts.length === 0 ||
        isInteractiveEventTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      openPayment();
    }

    window.addEventListener('keydown', handleCheckoutShortcut);
    return () => window.removeEventListener('keydown', handleCheckoutShortcut);
  }, [cartProducts.length, completedSale, paymentOpen, registerBranch]);

  function addToCart(product: Product) {
    if (mpesaLocked) {
      setSaleError('Finish or reconcile the saved M-Pesa checkout before changing the cart.');
      return;
    }
    setSaleMessage('');
    setSaleError('');

    if (!registerBranch) {
      setSaleError('Set up the shop location before selling.');
      return;
    }

    if (inventoryQuery.isPending) {
      setSaleError('Inventory is still loading. Try again in a moment.');
      return;
    }

    const currentQuantity = quantityInCart(product.id);
    const availableQuantity = availableForProduct(product);
    if (availableQuantity <= currentQuantity) {
      setSaleError(`${product.name} has only ${availableQuantity} units available.`);
      return;
    }

    setCart((lines) => {
      const existing = lines.find((line) => line.productId === product.id);
      if (existing) {
        return lines.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...lines, { productId: product.id, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    if (mpesaLocked) {
      setSaleError('Finish or reconcile the saved M-Pesa checkout before changing the cart.');
      return;
    }
    setSaleMessage('');
    setSaleError('');

    if (delta > 0) {
      const product = products.find((item) => item.id === productId);
      if (product && availableForProduct(product) <= quantityInCart(productId)) {
        setSaleError(`${product.name} has only ${availableForProduct(product)} units available.`);
        return;
      }
    }

    setCart((lines) =>
      lines
        .map((line) =>
          line.productId === productId
            ? { ...line, quantity: Math.max(0, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function availableForProduct(product: Product) {
    if (!registerBranch) {
      return 0;
    }
    return branchAvailabilityByProduct.get(product.id) ?? 0;
  }

  function quantityInCart(productId: string) {
    return cart.find((line) => line.productId === productId)?.quantity ?? 0;
  }

  function openPayment() {
    setSaleMessage('');
    setSaleError('');
    if (!registerBranch) {
      setSaleError('Set up the shop location before completing a sale.');
      return;
    }
    if (cartProducts.length === 0) {
      setSaleError('Add at least one product before completing a sale.');
      return;
    }
    setPaymentOpen(true);
  }

  async function completeSale(payments: SalePaymentRequest[], manualMpesa = false) {
    setSaleMessage('');
    setSaleError('');
    if (!registerBranch) {
      setSaleError('Set up the shop location before completing a sale.');
      setPaymentOpen(false);
      return;
    }
    if (payments.length === 0) {
      setSaleError('Add at least one payment before completing the sale.');
      return;
    }

    try {
      await completeSaleMutation.mutateAsync({
        idempotencyKey: checkoutIdempotencyKey,
        manualMpesa,
        payload: {
          branchId: registerBranch.id,
          customerName: customer === 'Walk-in Customer' ? '' : customer,
          discountAmount: discount,
          payments,
          lines: cartProducts.map((line) => ({
            productId: line.id,
            quantity: line.quantity,
          })),
        },
      });
    } catch (caughtError) {
      setSaleError(caughtError instanceof Error ? caughtError.message : 'Unable to record sale');
    }
  }

  return (
    <>
      <div className="pos-shell">
        <header className="pos-topbar">
          <Brand variant="sidebar" />
          <div className="pos-register">
            <span className="icon-tile blue">
              <i className="bi bi-geo-alt-fill" aria-hidden="true" />
            </span>
            <div>
              <strong>{registerBranch?.name ?? 'Shop location unavailable'}</strong>
              <span>Main Register</span>
            </div>
          </div>
          <div className="pos-session">
            <UserChip name={currentUser.displayName} role={primaryRoleLabel(currentUser)} compact />
            <span className="service-chip success">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Register Ready
            </span>
            <ConnectionBadge />
            <NavLink className="exit-command" to="/apps">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Exit POS
            </NavLink>
            <button className="exit-command" type="button" onClick={onLogout}>
              <i className="bi bi-power" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </header>

        <PosAppNavigation user={currentUser} disabled={cart.length > 0} />
        <OfflineStatus />
        {cartRecoveryMessage && (
          <p className="message-banner pos-local-draft-message">{cartRecoveryMessage}</p>
        )}
        <main className="pos-workspace">
          <section
            id="pos-products"
            className="pos-catalog"
            aria-label="Product catalogue"
            tabIndex={-1}
          >
            <div className="barcode-search">
              <i className="bi bi-upc-scan barcode-icon" aria-hidden="true" />
              <input
                aria-label="Search product by name, SKU, category, size, or color"
                placeholder="Scan barcode or search name, SKU, size or colour..."
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>F3</kbd>
              <button type="button" aria-label="Search products">
                <i className="bi bi-search" aria-hidden="true" />
              </button>
            </div>

            <div className="category-toolbar">
              <div className="category-row" aria-label="Product categories">
                {categories.map((item) => (
                  <button
                    className={`category-button ${item === category ? 'active' : ''}`}
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="catalog-tools">
                <button className="secondary-action compact-action" type="button">
                  <i className="bi bi-funnel" aria-hidden="true" />
                  Filters
                </button>
                <button className="icon-button active-tool" type="button" aria-label="Grid view">
                  <i className="bi bi-grid-3x3-gap-fill" aria-hidden="true" />
                </button>
                <button className="icon-button" type="button" aria-label="List view">
                  <i className="bi bi-list-ul" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="catalog-meta">
              <span>{visibleProducts.length} products</span>
              <span>
                Sort: <strong>Featured</strong>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </span>
            </div>

            <FormMessages error={saleError} message={saleMessage} />

            {productsQuery.isPending || inventoryQuery.isPending ? (
              <LoadingPanel label="Loading products..." />
            ) : productsQuery.isError ? (
              <EmptyState
                icon="bi-exclamation-circle"
                title="Products could not be loaded"
                detail="Refresh the page or try again after the API is available."
              />
            ) : visibleProducts.length === 0 ? (
              <EmptyState
                icon="bi-tags"
                title="No products available"
                detail="Products registered in the catalog will appear here."
              />
            ) : (
              <div className="product-grid">
                {visibleProducts.map((product, index) => {
                  const availableQuantity = availableForProduct(product);

                  return (
                    <article className="product-card" key={product.id}>
                      <button
                        className="product-card-button"
                        type="button"
                        onClick={() => addToCart(product)}
                      >
                        <ProductImage product={product} index={index} />
                        <div className="product-card-body">
                          <h3>{product.name}</h3>
                          <p>
                            {product.sizes.length > 0 ? product.sizes.join(' / ') : 'No sizes'}
                            <span> - </span>
                            {product.colors.length} colours
                          </p>
                          <p>{formatVatCategory(product.vatCategory)}</p>
                          <div>
                            <strong>
                              {formatMoney(product.unitPrice, organization.currencyCode)}
                            </strong>
                            <span>In stock: {availableQuantity}</span>
                          </div>
                        </div>
                      </button>
                      <button
                        className="add-button"
                        type="button"
                        onClick={() => addToCart(product)}
                      >
                        {availableQuantity > quantityInCart(product.id) ? 'Add' : 'Out'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside id="pos-cart" className="cart-surface" aria-label="Current cart" tabIndex={-1}>
            <div className="cart-header">
              <div>
                <h2>Current Sale</h2>
                <span>({cartProducts.length} items)</span>
              </div>
              <button
                className="text-button danger-text"
                type="button"
                disabled={mpesaLocked}
                onClick={() => setCart([])}
              >
                <i className="bi bi-trash" aria-hidden="true" />
                Clear
              </button>
            </div>

            <CustomerLookupForm customer={customer} onCustomerChange={setCustomer} />

            <div className="cart-lines">
              {cartProducts.map((line, index) => (
                <div className="cart-line" key={line.id}>
                  <ProductImage product={line} index={index} small />
                  <div className="cart-line-main">
                    <strong>{line.name}</strong>
                    <span>
                      Size: {line.sizes[0] ?? 'N/A'} &nbsp; Colour: {line.colors[0] ?? 'N/A'}
                    </span>
                    <span>
                      SKU: {line.sku} - {formatVatCategory(line.vatCategory)}
                    </span>
                    <div className="quantity-stepper" aria-label={`${line.name} quantity`}>
                      <button
                        type="button"
                        aria-label={`Remove one ${line.name}`}
                        onClick={() => updateQuantity(line.id, -1)}
                      >
                        <i className="bi bi-dash" aria-hidden="true" />
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${line.name}`}
                        onClick={() => updateQuantity(line.id, 1)}
                      >
                        <i className="bi bi-plus" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="cart-line-total">
                    <strong>{formatMoney(line.unitPrice, organization.currencyCode)}</strong>
                    <span>
                      {formatMoney(line.unitPrice * line.quantity, organization.currencyCode)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cart-remove"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => updateQuantity(line.id, -line.quantity)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="discount-row">
              <i className="bi bi-tag" aria-hidden="true" />
              <span>Discount code or promo</span>
              <button type="button">Apply</button>
            </div>

            <div className="totals-block">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal, organization.currencyCode)}</strong>
              </div>
              {discount > 0 ? (
                <div>
                  <span>Discount</span>
                  <strong className="discount-total">
                    - {formatMoney(discount, organization.currencyCode)}
                  </strong>
                </div>
              ) : null}
              <div>
                <span>VAT</span>
                <strong>{formatMoney(vat, organization.currencyCode)}</strong>
              </div>
              <div className="total-row">
                <span>Total</span>
                <strong>{formatMoney(total, organization.currencyCode)}</strong>
              </div>
            </div>

            <div className="cart-actions">
              <button
                className="primary-action"
                type="button"
                disabled={cartProducts.length === 0}
                onClick={openPayment}
              >
                <i className="bi bi-credit-card-2-front" aria-hidden="true" />
                Pay {formatMoney(total, organization.currencyCode)} (Enter)
              </button>
            </div>
          </aside>
        </main>
        <nav className="pos-mobile-actions" aria-label="Mobile checkout">
          <button
            type="button"
            onClick={() => {
              const catalog = document.getElementById('pos-products');
              catalog?.scrollIntoView({ block: 'start' });
              catalog?.focus({ preventScroll: true });
            }}
          >
            <i className="bi bi-grid" aria-hidden="true" />
            Products
          </button>
          <button
            type="button"
            onClick={() => {
              const cart = document.getElementById('pos-cart');
              cart?.scrollIntoView({ block: 'start' });
              cart?.focus({ preventScroll: true });
            }}
          >
            <i className="bi bi-bag" aria-hidden="true" />
            <span aria-live="polite">
              Cart ({cart.reduce((sum, line) => sum + line.quantity, 0)})
            </span>
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={cartProducts.length === 0}
            onClick={openPayment}
          >
            <span>Checkout</span>
            <strong>{formatMoney(total, organization.currencyCode)}</strong>
          </button>
        </nav>
      </div>

      {paymentOpen ? (
        <PaymentDialog
          key={checkoutIdempotencyKey}
          checkoutKey={checkoutIdempotencyKey}
          storageKey={mpesaStorageKey}
          saleDetails={{
            branchId: registerBranch?.id ?? '',
            customerName: customer === 'Walk-in Customer' ? '' : customer,
            discountAmount: discount,
            lines: cartProducts.map((line) => ({ productId: line.id, quantity: line.quantity })),
          }}
          mpesaLocked={mpesaLocked}
          onMpesaLock={() => setMpesaLocked(true)}
          onMpesaRetry={() => {
            clearMpesaRecovery(mpesaStorageKey);
            setMpesaLocked(false);
            setCheckoutIdempotencyKey(newSaleIdempotencyKey());
          }}
          amount={total}
          currencyCode={organization.currencyCode}
          error={saleError}
          isSubmitting={completeSaleMutation.isPending}
          onClose={() => setPaymentOpen(false)}
          onFinalize={completeSale}
        />
      ) : null}
      {completedSale ? (
        <ReceiptDialog
          organization={organization}
          sale={completedSale}
          onSynchronized={(sale) => {
            setCompletedSale(sale);
            setSaleMessage(`Sale ${sale.saleNumber} recorded.`);
          }}
          onClose={() => setCompletedSale(null)}
        />
      ) : null}
    </>
  );
}

function updateSalesCache(queryClient: QueryClient, sale: Sale) {
  queryClient.setQueryData<Sale[]>(['sales'], (sales) => {
    const nextSales = [sale, ...(sales ?? []).filter((item) => item.id !== sale.id)];
    return nextSales.sort((first, second) => Date.parse(second.soldAt) - Date.parse(first.soldAt));
  });
}

function decrementInventoryCacheForSale(queryClient: QueryClient, sale: Sale) {
  const soldQuantities = soldQuantitiesByProduct(sale);
  queryClient.setQueryData<InventoryItem[]>(['inventory'], (inventory) => {
    if (!inventory) {
      return inventory;
    }

    return inventory.map((item) => {
      const soldQuantity = soldQuantities.get(item.productId) ?? 0;
      if (item.branchId !== sale.branchId || soldQuantity === 0) {
        return item;
      }

      const quantityOnHand = Math.max(0, item.quantityOnHand - soldQuantity);
      const quantityAvailable = Math.max(0, quantityOnHand - item.quantityReserved);
      return {
        ...item,
        quantityOnHand,
        quantityAvailable,
        stockHealth: stockHealthForQuantity(quantityAvailable, item.reorderLevel),
      };
    });
  });
}

function decrementProductStockCacheForSale(queryClient: QueryClient, sale: Sale) {
  const soldQuantities = soldQuantitiesByProduct(sale);
  queryClient.setQueryData<Product[]>(['products'], (products) => {
    if (!products) {
      return products;
    }

    return products.map((product) => {
      const soldQuantity = soldQuantities.get(product.id) ?? 0;
      if (soldQuantity === 0) {
        return product;
      }

      return {
        ...product,
        totalStock: Math.max(0, product.totalStock - soldQuantity),
      };
    });
  });
}

function soldQuantitiesByProduct(sale: Sale) {
  const soldQuantities = new Map<string, number>();
  for (const line of sale.lines) {
    soldQuantities.set(line.productId, (soldQuantities.get(line.productId) ?? 0) + line.quantity);
  }
  return soldQuantities;
}

function stockHealthForQuantity(
  quantityAvailable: number,
  reorderLevel: number,
): InventoryItem['stockHealth'] {
  if (quantityAvailable === 0) {
    return 'OUT_OF_STOCK';
  }
  if (reorderLevel > 0 && quantityAvailable <= reorderLevel) {
    return 'LOW_STOCK';
  }
  return 'HEALTHY';
}

type CustomerLookupFormProps = {
  customer: string;
  onCustomerChange: (customer: string) => void;
};

function CustomerLookupForm({ customer, onCustomerChange }: CustomerLookupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerLookup>({
    resolver: zodResolver(customerLookupSchema),
    defaultValues: {
      query: '',
    },
  });

  return (
    <form
      className="customer-box"
      onSubmit={handleSubmit((values) =>
        onCustomerChange(values.query.trim() ? values.query.trim() : 'Walk-in Customer'),
      )}
    >
      <i className="bi bi-person-fill" aria-hidden="true" />
      <strong>{customer}</strong>
      <label className="visually-hidden" htmlFor="customer-query">
        Customer phone or name
      </label>
      <input id="customer-query" placeholder="Phone or name" {...register('query')} />
      <button type="submit" aria-label="Apply customer">
        <i className="bi bi-chevron-down" aria-hidden="true" />
      </button>
      {errors.query ? <span className="field-error">{errors.query.message}</span> : null}
    </form>
  );
}

type PaymentDialogProps = {
  checkoutKey: string;
  storageKey: string;
  saleDetails: Omit<SaleRequest, 'payments'>;
  mpesaLocked: boolean;
  onMpesaLock: () => void;
  onMpesaRetry: () => void;
  amount: number;
  currencyCode: string;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onFinalize: (payments: SalePaymentRequest[], manualMpesa?: boolean) => Promise<void> | void;
};

function PaymentDialog({
  checkoutKey,
  storageKey,
  saleDetails,
  mpesaLocked,
  onMpesaLock,
  onMpesaRetry,
  amount,
  currencyCode,
  error,
  isSubmitting,
  onClose,
  onFinalize,
}: PaymentDialogProps) {
  const offline = useOffline();
  const [saved] = useState(() => readMpesaRecovery(storageKey));
  const [manualMpesa, setManualMpesa] = useState(() => !offline.connected && !saved);
  const restoredTenders = saved?.sale.payments?.map((payment) => ({
    id: newSaleIdempotencyKey(),
    method: payment.method,
    amount: String(payment.amount),
    paymentReference: payment.paymentReference ?? '',
    cashReceived: String(payment.cashReceived ?? ''),
  }));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    restoredTenders && restoredTenders.length > 1 ? 'split' : 'single',
  );
  const [singlePayment, setSinglePayment] = useState<PaymentDraft>(() =>
    restoredTenders?.length === 1 ? restoredTenders[0] : newPaymentDraft(),
  );
  const [splitPayments, setSplitPayments] = useState<PaymentDraft[]>(() =>
    restoredTenders && restoredTenders.length > 1
      ? restoredTenders
      : [newPaymentDraft('MPESA'), newPaymentDraft('CASH')],
  );
  const [verifiedReceipt, setVerifiedReceipt] = useState('');
  const hasMpesa =
    paymentMode === 'single'
      ? singlePayment.method === 'MPESA'
      : splitPayments.some((payment) => payment.method === 'MPESA');
  const mpesaConfig = useQuery({
    queryKey: ['mpesa-config'],
    queryFn: getMpesaConfig,
    enabled: hasMpesa && !manualMpesa && offline.connected,
    retry: false,
    staleTime: 30_000,
  });
  const requiresStk = hasMpesa && !manualMpesa && mpesaConfig.data?.enabled === true;
  const mpesaBlocked =
    hasMpesa &&
    !manualMpesa &&
    ((!offline.connected && !verifiedReceipt) ||
      !mpesaConfig.isSuccess ||
      (requiresStk && !verifiedReceipt));
  const [localError, setLocalError] = useState('');
  const totalCents = moneyToCents(amount);
  const selectedPaymentOption = paymentMethodOptions.find(
    (option) => option.method === singlePayment.method,
  );
  const splitPaidCents = splitPayments.reduce(
    (sum, payment) => sum + (moneyInputToCents(payment.amount) ?? 0),
    0,
  );
  const splitRemainingCents = totalCents - splitPaidCents;
  const singleChangeCents = cashChangeCents({
    ...singlePayment,
    amount: centsToInput(totalCents),
  });
  const displayError = localError || error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError('');

    if (mpesaBlocked) {
      setLocalError('Confirm the M-Pesa payment before completing this sale.');
      return;
    }

    const paymentResult = buildSalePayments(
      amount,
      currencyCode,
      paymentMode,
      singlePayment,
      splitPayments,
    );
    if (!paymentResult.ok) {
      setLocalError(paymentResult.error);
      return;
    }

    void onFinalize(paymentResult.payments, hasMpesa && !requiresStk);
  }

  function updateSplitPayment(id: string, changes: Partial<PaymentDraft>) {
    setLocalError('');
    setSplitPayments((payments) =>
      payments.map((payment) => (payment.id === id ? { ...payment, ...changes } : payment)),
    );
  }

  function updateSplitPaymentAmount(id: string, amountValue: string) {
    setLocalError('');
    setSplitPayments((payments) => {
      const targetIndex = payments.findIndex((payment) => payment.id === id);
      if (targetIndex === -1) {
        return payments;
      }

      const nextPayments = payments.map((payment, index) =>
        index === targetIndex ? { ...payment, amount: amountValue } : payment,
      );
      const amountCents = moneyInputToCents(amountValue);
      if (payments.length !== 2 || amountCents == null) {
        return nextPayments;
      }

      const otherIndex = targetIndex === 0 ? 1 : 0;
      const remainingCents = Math.max(0, totalCents - amountCents);
      nextPayments[otherIndex] = {
        ...nextPayments[otherIndex],
        amount: centsToInput(remainingCents),
      };
      return nextPayments;
    });
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form
        className="payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        onSubmit={handleSubmit}
      >
        <div className="dialog-header">
          <div className="payment-title-block">
            <p className="eyebrow">Checkout payment</p>
            <h2 id="payment-title">Payment</h2>
          </div>
          <div className="payment-due-header">
            <span>Amount due</span>
            <strong>{formatMoney(amount, currencyCode)}</strong>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close payment"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <fieldset className="payment-tenders" disabled={mpesaLocked || isSubmitting}>
          {hasMpesa && (
            <label className="manual-mpesa-option">
              <input
                type="checkbox"
                checked={manualMpesa}
                onChange={(event) => setManualMpesa(event.target.checked)}
              />
              Record M-Pesa manually (no STK push)
              <small>
                Record a payment already received. This does not verify payment with Safaricom.
              </small>
            </label>
          )}
          <div className="payment-mode-tabs" aria-label="Payment type">
            <button
              className={paymentMode === 'single' ? 'active' : ''}
              type="button"
              onClick={() => {
                setLocalError('');
                setPaymentMode('single');
              }}
            >
              <i className="bi bi-credit-card-2-front" aria-hidden="true" />
              Single
            </button>
            <button
              className={paymentMode === 'split' ? 'active' : ''}
              type="button"
              onClick={() => {
                setLocalError('');
                setPaymentMode('split');
              }}
            >
              <i className="bi bi-layout-split" aria-hidden="true" />
              Split Payment
            </button>
          </div>

          {paymentMode === 'single' ? (
            <div className="payment-form-grid">
              <label className="payment-method-field" htmlFor="payment-method">
                <span>Payment method</span>
                <span className="select-shell payment-select-control">
                  <i
                    className={`bi ${selectedPaymentOption?.icon ?? 'bi-credit-card-2-front'}`}
                    aria-hidden="true"
                  />
                  <select
                    id="payment-method"
                    aria-label="Payment method"
                    value={singlePayment.method}
                    onChange={(event) => {
                      setLocalError('');
                      setSinglePayment((payment) => ({
                        ...payment,
                        method: event.target.value as PaymentMethod,
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Select payment method
                    </option>
                    {paymentMethodOptions.map((option) => (
                      <option key={option.method} value={option.method}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              {singlePayment.method === 'CASH' ? (
                <div className="payment-cash-grid">
                  <label className="payment-input-field" htmlFor="single-cash-received">
                    <span>Cash received</span>
                    <input
                      id="single-cash-received"
                      aria-label="Cash received"
                      inputMode="decimal"
                      min="0"
                      placeholder={centsToInput(totalCents)}
                      step="0.01"
                      type="number"
                      value={singlePayment.cashReceived}
                      onChange={(event) => {
                        setLocalError('');
                        setSinglePayment((payment) => ({
                          ...payment,
                          cashReceived: event.target.value,
                        }));
                      }}
                    />
                  </label>
                  <div className="payment-change-preview">
                    <span>Change</span>
                    <strong>{formatMoney(centsToMoney(singleChangeCents), currencyCode)}</strong>
                  </div>
                </div>
              ) : null}

              {singlePayment.method && singlePayment.method !== 'CASH' ? (
                <label className="payment-input-field" htmlFor="single-payment-reference">
                  <span>Reference</span>
                  <input
                    id="single-payment-reference"
                    maxLength={80}
                    placeholder="Optional"
                    value={singlePayment.paymentReference}
                    readOnly={singlePayment.method === 'MPESA' && requiresStk}
                    aria-label={
                      singlePayment.method === 'MPESA' && requiresStk
                        ? 'Verified M-Pesa receipt'
                        : undefined
                    }
                    onChange={(event) => {
                      setLocalError('');
                      setSinglePayment((payment) => ({
                        ...payment,
                        paymentReference: event.target.value,
                      }));
                    }}
                  />
                </label>
              ) : null}
            </div>
          ) : (
            <div className="split-payment-table">
              <div className="split-payment-table-head" aria-hidden="true">
                <span>Tender</span>
                <span>Method</span>
                <span>Amount</span>
                <span>Reference</span>
                <span />
              </div>

              <div className="split-payment-list">
                {splitPayments.map((payment, index) => {
                  const splitPaymentOption = paymentMethodOptions.find(
                    (option) => option.method === payment.method,
                  );

                  return (
                    <div className="split-payment-row" key={payment.id}>
                      <div className="split-payment-row-head">
                        <strong>Tender {index + 1}</strong>
                      </div>

                      <label
                        className="payment-method-field"
                        htmlFor={`split-method-${payment.id}`}
                      >
                        <span className="split-field-label">Method</span>
                        <span className="select-shell payment-select-control">
                          <i
                            className={`bi ${splitPaymentOption?.icon ?? 'bi-credit-card-2-front'}`}
                            aria-hidden="true"
                          />
                          <select
                            id={`split-method-${payment.id}`}
                            aria-label={`Payment ${index + 1} method`}
                            value={payment.method}
                            onChange={(event) =>
                              updateSplitPayment(payment.id, {
                                method: event.target.value as PaymentMethod,
                              })
                            }
                          >
                            <option value="" disabled>
                              Select method
                            </option>
                            {paymentMethodOptions.map((option) => (
                              <option key={option.method} value={option.method}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>

                      <label className="payment-input-field" htmlFor={`split-amount-${payment.id}`}>
                        <span className="split-field-label">Amount</span>
                        <input
                          id={`split-amount-${payment.id}`}
                          aria-label={`Payment ${index + 1} amount`}
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          type="number"
                          value={payment.amount}
                          onChange={(event) =>
                            updateSplitPaymentAmount(payment.id, event.target.value)
                          }
                        />
                      </label>

                      {payment.method && payment.method !== 'CASH' ? (
                        <label
                          className="payment-input-field"
                          htmlFor={`split-reference-${payment.id}`}
                        >
                          <span className="split-field-label">Reference</span>
                          <input
                            id={`split-reference-${payment.id}`}
                            aria-label={`Payment ${index + 1} reference`}
                            maxLength={80}
                            placeholder="Optional"
                            value={payment.paymentReference}
                            readOnly={payment.method === 'MPESA' && requiresStk}
                            onChange={(event) =>
                              updateSplitPayment(payment.id, {
                                paymentReference: event.target.value,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <div className="split-reference-placeholder" aria-hidden="true" />
                      )}

                      <button
                        className="icon-button split-remove-action"
                        type="button"
                        aria-label={`Remove payment ${index + 1}`}
                        disabled={splitPayments.length <= 2}
                        onClick={() =>
                          setSplitPayments((payments) =>
                            payments.filter((item) => item.id !== payment.id),
                          )
                        }
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                className="secondary-action compact-action split-add-action"
                type="button"
                onClick={() => setSplitPayments((payments) => [...payments, newPaymentDraft()])}
              >
                <i className="bi bi-plus-circle" aria-hidden="true" />
                Add Tender
              </button>
            </div>
          )}

          {paymentMode === 'split' ? (
            <div className="payment-balance-strip">
              <span>
                Paid <strong>{formatMoney(centsToMoney(splitPaidCents), currencyCode)}</strong>
              </span>
              <span>
                {splitRemainingCents >= 0 ? 'Remaining' : 'Over by'}{' '}
                <strong>
                  {formatMoney(Math.abs(centsToMoney(splitRemainingCents)), currencyCode)}
                </strong>
              </span>
            </div>
          ) : null}
        </fieldset>

        {requiresStk &&
          (() => {
            const prepared = buildSalePayments(
              amount,
              currencyCode,
              paymentMode,
              singlePayment,
              splitPayments,
            );
            const oneMpesa =
              prepared.ok &&
              prepared.payments.filter((payment) => payment.method === 'MPESA').length === 1;
            return (
              <MpesaPaymentPanel
                checkoutKey={checkoutKey}
                storageKey={storageKey}
                sale={
                  prepared.ok && oneMpesa ? { ...saleDetails, payments: prepared.payments } : null
                }
                onLock={onMpesaLock}
                onRetry={onMpesaRetry}
                onVerified={(receipt) => {
                  setVerifiedReceipt(receipt);
                  setSinglePayment((payment) =>
                    payment.method === 'MPESA'
                      ? { ...payment, paymentReference: receipt }
                      : payment,
                  );
                  setSplitPayments((payments) =>
                    payments.map((payment) =>
                      payment.method === 'MPESA'
                        ? { ...payment, paymentReference: receipt }
                        : payment,
                    ),
                  );
                }}
              />
            );
          })()}
        {hasMpesa && !manualMpesa && offline.connected && mpesaConfig.isPending && (
          <p role="status">Checking M-Pesa availability…</p>
        )}
        {hasMpesa && !manualMpesa && (!offline.connected || mpesaConfig.isError) && (
          <p className="message-banner error" role="alert">
            STK push requires internet. Choose manual M-Pesa to record a payment already received.
          </p>
        )}

        {displayError ? (
          <p className="message-banner error" role="alert">
            <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
            {displayError}
          </p>
        ) : null}
        <button
          className="primary-action payment-complete-action"
          type="submit"
          disabled={isSubmitting || mpesaBlocked}
        >
          <i className="bi bi-check2-circle" aria-hidden="true" />
          {isSubmitting ? (
            'Recording...'
          ) : (
            <>
              Complete Sale <kbd>Enter</kbd>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function buildSalePayments(
  amount: number,
  currencyCode: string,
  paymentMode: PaymentMode,
  singlePayment: PaymentDraft,
  splitPayments: PaymentDraft[],
): PaymentBuildResult {
  const totalCents = moneyToCents(amount);

  if (paymentMode === 'single') {
    const payment = paymentDraftToRequest(
      { ...singlePayment, amount: centsToInput(totalCents) },
      totalCents,
      'payment',
    );
    return payment.ok
      ? { ok: true, payments: [payment.payment] }
      : { ok: false, error: payment.error };
  }

  const payments: SalePaymentRequest[] = [];
  for (const [index, payment] of splitPayments.entries()) {
    const paymentResult = paymentDraftToRequest(payment, undefined, `payment ${index + 1}`, {
      cashReceivedFromAmount: true,
    });
    if (!paymentResult.ok) {
      return { ok: false, error: paymentResult.error };
    }
    payments.push(paymentResult.payment);
  }

  if (payments.length < 2) {
    return { ok: false, error: 'Split payment needs at least two payment rows.' };
  }

  const paidCents = payments.reduce((sum, payment) => sum + moneyToCents(payment.amount), 0);
  if (paidCents !== totalCents) {
    const difference = centsToMoney(totalCents - paidCents);
    return {
      ok: false,
      error:
        difference > 0
          ? `Split payment is short by ${formatMoney(difference, currencyCode)}.`
          : `Split payment is over by ${formatMoney(Math.abs(difference), currencyCode)}.`,
    };
  }

  return { ok: true, payments };
}

function paymentDraftToRequest(
  draft: PaymentDraft,
  fixedAmountCents: number | undefined,
  label: string,
  options: { cashReceivedFromAmount?: boolean } = {},
): PaymentDraftResult {
  if (!draft.method) {
    return { ok: false, error: `Select a method for ${label}.` };
  }

  const amountCents = fixedAmountCents ?? moneyInputToCents(draft.amount);
  if (amountCents == null || amountCents <= 0) {
    return { ok: false, error: `Enter an amount greater than zero for ${label}.` };
  }

  let cashReceived: number | undefined;
  if (draft.method === 'CASH') {
    const cashReceivedCents = options.cashReceivedFromAmount
      ? amountCents
      : moneyInputToCents(draft.cashReceived);
    if (cashReceivedCents == null) {
      return { ok: false, error: `Enter cash received for ${label}.` };
    }
    if (cashReceivedCents < amountCents) {
      return {
        ok: false,
        error: `Cash received cannot be less than the cash amount for ${label}.`,
      };
    }
    cashReceived = centsToMoney(cashReceivedCents);
  }

  return {
    ok: true,
    payment: {
      method: draft.method,
      amount: centsToMoney(amountCents),
      paymentReference: draft.paymentReference.trim(),
      ...(cashReceived == null ? {} : { cashReceived }),
    },
  };
}

function newPaymentDraft(method: PaymentMethod | '' = ''): PaymentDraft {
  return {
    id: newSaleIdempotencyKey(),
    method,
    amount: '',
    paymentReference: '',
    cashReceived: '',
  };
}

function moneyInputToCents(value: string) {
  if (!value.trim()) {
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return moneyToCents(amount);
}

function moneyToCents(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function centsToMoney(cents: number) {
  return Math.round(cents) / 100;
}

function centsToInput(cents: number) {
  return centsToMoney(cents).toFixed(2);
}

function cashChangeCents(payment: PaymentDraft) {
  if (payment.method !== 'CASH') {
    return 0;
  }

  const amountCents = moneyInputToCents(payment.amount);
  const cashReceivedCents = moneyInputToCents(payment.cashReceived);
  if (amountCents == null || cashReceivedCents == null || cashReceivedCents <= amountCents) {
    return 0;
  }
  return cashReceivedCents - amountCents;
}

function isInteractiveEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const interactiveElement = target.closest(
    'button, input, select, textarea, a, [role="button"], [contenteditable="true"]',
  );
  return Boolean(interactiveElement);
}

function SalesPage({ organization }: { organization: Organization }) {
  const { branchId: platformBranchId } = usePlatform();
  const reversalsQuery = useQuery({ queryKey: ['sale-reversals'], queryFn: getSaleReversals });
  const [dateRange, setDateRange] = useState<ReportDateRange>(() => reportPeriodRange('today'));
  const normalizedDateRange = normalizeReportDateRange(dateRange);
  const salesQuery = useQuery({
    queryKey: ['sales', 'page', normalizedDateRange.from, normalizedDateRange.to],
    queryFn: () =>
      getSales(
        new URLSearchParams({
          fromDate: normalizedDateRange.from,
          toDate: normalizedDateRange.to,
        }),
      ),
  });
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const sales = inBranch(salesQuery.data ?? [], platformBranchId);
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalItems = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );

  return (
    <section className="table-workspace">
      <PageHeader title="Sales" subtitle="Completed POS sales for the selected dates." />

      <div className="catalog-filter-bar">
        <label className="inventory-filter-field">
          <span>From</span>
          <input
            type="date"
            value={dateRange.from}
            onChange={(event) =>
              setDateRange((current) => ({ ...current, from: event.target.value }))
            }
          />
        </label>
        <label className="inventory-filter-field">
          <span>To</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(event) =>
              setDateRange((current) => ({ ...current, to: event.target.value }))
            }
          />
        </label>
      </div>

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-receipt"
          label="Transactions"
          value={String(sales.length)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-cash-stack"
          label="Sales Total"
          value={formatMoney(totalSales, organization.currencyCode)}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-bag-check"
          label="Items Sold"
          value={String(totalItems)}
          tone="orange"
        />
      </div>

      {salesQuery.isPending ? (
        <LoadingPanel label="Loading sales..." />
      ) : salesQuery.isError ? (
        <EmptyState
          icon="bi-exclamation-circle"
          title="Sales could not be loaded"
          detail="Refresh the page or try again after the API is available."
        />
      ) : sales.length === 0 ? (
        <EmptyState
          icon="bi-receipt"
          title="No sales recorded"
          detail="Completed POS payments for the selected dates will appear here."
        />
      ) : (
        <div className="responsive-table mobile-compact-table sales-history-table">
          <table aria-label="Sales history">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Sold At</th>
                <th>Actions</th>
                <th className="mobile-row-more">Details</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  className={expandedSaleId === sale.id ? 'details-expanded' : undefined}
                  key={sale.id}
                >
                  <td data-label="Receipt">
                    <span className="table-label">
                      <i className="bi bi-receipt" aria-hidden="true" />
                      {sale.saleNumber}
                    </span>
                  </td>
                  <td data-label="Customer">{sale.customerName || 'Walk-in Customer'}</td>
                  <td data-label="Items">
                    {sale.lines.reduce((sum, line) => sum + line.quantity, 0)} item
                    {sale.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? '' : 's'}
                  </td>
                  <td className="mobile-row-meta" data-label="Payment">
                    {formatSalePayments(sale)}
                  </td>
                  <td className="mobile-row-value" data-label="Total">
                    {formatMoney(sale.totalAmount, organization.currencyCode)}
                  </td>
                  <td data-label="Status">
                    <StatusPill
                      status={
                        sale.syncStatus === 'pending' ||
                        reversalsQuery.data?.some((r) => r.sale_id === sale.id)
                          ? 'pending'
                          : 'posted'
                      }
                      label={
                        sale.syncStatus === 'pending'
                          ? 'Saved · pending sync'
                          : reversalsQuery.data?.find((r) => r.sale_id === sale.id)?.kind ===
                              'REFUND'
                            ? 'Refunded'
                            : reversalsQuery.data?.find((r) => r.sale_id === sale.id)?.kind ===
                                'CANCELLATION'
                              ? 'Cancelled'
                              : reversalsQuery.isError
                                ? 'Status unavailable'
                                : 'Completed'
                      }
                    />
                  </td>
                  <td className="mobile-row-name" data-label="Sold At">
                    <time dateTime={sale.soldAt}>
                      <span className="sales-date-full">{formatDateTime(sale.soldAt)}</span>
                      <span className="sales-date-compact">{formatDateOnly(sale.soldAt)}</span>
                    </time>
                  </td>
                  <td data-label="Actions">
                    <span className="table-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setSelectedReceipt(sale)}
                      >
                        <i className="bi bi-printer" aria-hidden="true" />
                        Receipt
                      </button>
                      <SaleReversalActions sale={sale} />
                    </span>
                  </td>
                  <td className="mobile-row-more">
                    <button
                      aria-label={`Details and actions for ${sale.saleNumber}`}
                      aria-expanded={expandedSaleId === sale.id}
                      className="mobile-row-more-button"
                      type="button"
                      onClick={() =>
                        setExpandedSaleId((current) => (current === sale.id ? null : sale.id))
                      }
                    >
                      <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedReceipt ? (
        <ReceiptDialog
          organization={organization}
          sale={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      ) : null}
    </section>
  );
}

function ErpModulePage({
  icon,
  organization,
  queryFn,
  queryKey,
}: {
  icon: string;
  organization: Organization;
  queryFn: () => Promise<ModuleSummary>;
  queryKey: string;
}) {
  const summaryQuery = useQuery({ queryKey: [queryKey], queryFn });
  const title = summaryQuery.data?.title ?? moduleFallbackTitle(queryKey);
  const description = summaryQuery.data?.description ?? 'Loading module snapshot...';

  return (
    <section className="table-workspace erp-module-page">
      <PageHeader title={title} subtitle={description} />
      <ErpModuleSummaryContent
        icon={icon}
        isError={summaryQuery.isError}
        isLoading={summaryQuery.isPending}
        organization={organization}
        summary={summaryQuery.data}
      />
    </section>
  );
}

type AccountingTab = 'journals' | 'ledger' | 'reports' | 'accounts' | 'periods' | 'tax';
type AccountingEditorTab = Exclude<AccountingTab, 'ledger' | 'reports'>;
type AccountingReportTab = 'trial-balance' | 'profit-and-loss' | 'balance-sheet' | 'cash-flow';

const accountingEditorActions = {
  journals: { label: 'New Journal', back: 'Back to Journals', icon: 'bi-journal-plus' },
  accounts: { label: 'New Account', back: 'Back to Accounts', icon: 'bi-diagram-3' },
  periods: { label: 'New Period', back: 'Back to Periods', icon: 'bi-calendar-plus' },
  tax: { label: 'New Tax Rule', back: 'Back to Tax Rules', icon: 'bi-percent' },
};

type AccountingJournalLineFormState = Omit<
  AccountingJournalLineRequest,
  'debitAmount' | 'creditAmount'
> & {
  debitAmount: string;
  creditAmount: string;
};

type AccountingJournalFormState = Omit<AccountingJournalRequest, 'lines'> & {
  lines: AccountingJournalLineFormState[];
};

type AccountingLedgerFilters = {
  accountId: string;
  branchId: string;
  from: string;
  to: string;
};

type AccountingReportFilters = {
  branchId: string;
  from: string;
  to: string;
  asOf: string;
};

function AccountingPage({
  branches,
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const canManageAccounting = hasAnyPermission(currentUser, ['admin:manage', 'accounting:manage']);
  const { branchId: accountingBranchId } = usePlatform();
  const branchOptions = branches
    .filter(
      (branch) =>
        branch.status === 'ACTIVE' &&
        (currentUser.branchIds.length === 0 || currentUser.branchIds.includes(branch.id)),
    )
    .sort((first, second) => first.name.localeCompare(second.name));
  const defaultBranchId = branchOptions.some((branch) => branch.id === accountingBranchId)
    ? accountingBranchId
    : (branchOptions[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<AccountingTab>('journals');
  const [editorTab, setEditorTab] = useState<AccountingEditorTab | null>(null);
  const [activeReport, setActiveReport] = useState<AccountingReportTab>('trial-balance');
  const showEditor = canManageAccounting && editorTab === activeTab;
  const actionTab: AccountingEditorTab =
    activeTab === 'accounts' || activeTab === 'periods' || activeTab === 'tax'
      ? activeTab
      : 'journals';
  const editorAction = accountingEditorActions[actionTab];
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [editingTaxRuleId, setEditingTaxRuleId] = useState<string | null>(null);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<AccountingAccountRequest>(() =>
    defaultAccountingAccountForm(),
  );
  const [periodForm, setPeriodForm] = useState<AccountingPeriodRequest>(() =>
    defaultAccountingPeriodForm(),
  );
  const [taxRuleForm, setTaxRuleForm] = useState<AccountingTaxRuleRequest>(() =>
    defaultAccountingTaxRuleForm(),
  );
  const [journalForm, setJournalForm] = useState<AccountingJournalFormState>(() =>
    defaultAccountingJournalForm(defaultBranchId),
  );
  const [ledgerFilters, setLedgerFilters] = useState<AccountingLedgerFilters>(() =>
    defaultAccountingLedgerFilters(defaultBranchId),
  );
  const [reportFilters, setReportFilters] = useState<AccountingReportFilters>(() =>
    defaultAccountingReportFilters(defaultBranchId),
  );

  const summaryQuery = useQuery({
    queryKey: ['accounting-summary'],
    queryFn: getAccountingSummary,
  });
  const accountsQuery = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: getAccountingAccounts,
  });
  const periodsQuery = useQuery({
    queryKey: ['accounting', 'periods'],
    queryFn: getAccountingPeriods,
  });
  const taxRulesQuery = useQuery({
    queryKey: ['accounting', 'tax-rules'],
    queryFn: getAccountingTaxRules,
  });
  const journalsQuery = useQuery({
    queryKey: ['accounting', 'journals'],
    queryFn: getAccountingJournals,
  });
  const ledgerQuery = useQuery({
    queryKey: ['accounting', 'ledger', ledgerFilters],
    queryFn: () => getAccountingLedger(normalizeAccountingLedgerFilters(ledgerFilters)),
  });
  const trialBalanceQuery = useQuery({
    queryKey: ['accounting', 'reports', 'trial-balance', reportFilters],
    queryFn: () => getAccountingTrialBalance(normalizeAccountingReportFilters(reportFilters)),
  });
  const profitAndLossQuery = useQuery({
    queryKey: ['accounting', 'reports', 'profit-and-loss', reportFilters],
    queryFn: () => getAccountingProfitAndLoss(normalizeAccountingReportFilters(reportFilters)),
  });
  const balanceSheetQuery = useQuery({
    queryKey: [
      'accounting',
      'reports',
      'balance-sheet',
      reportFilters.branchId,
      reportFilters.asOf,
    ],
    queryFn: () =>
      getAccountingBalanceSheet({
        branchId: reportFilters.branchId || undefined,
        asOf: reportFilters.asOf || undefined,
      }),
  });
  const cashFlowQuery = useQuery({
    queryKey: ['accounting', 'reports', 'cash-flow', reportFilters],
    queryFn: () => getAccountingCashFlow(normalizeAccountingReportFilters(reportFilters)),
  });

  const accounts = accountsQuery.data ?? [];
  const periods = periodsQuery.data ?? [];
  const taxRules = taxRulesQuery.data ?? [];
  const journals = journalsQuery.data ?? [];
  const recentWorkItems = summaryQuery.data?.workItems ?? [];
  const journalTotals = accountingJournalFormTotals(journalForm);
  const isAccountingLoading =
    accountsQuery.isPending ||
    periodsQuery.isPending ||
    taxRulesQuery.isPending ||
    journalsQuery.isPending;

  const saveAccountMutation = useMutation({
    mutationFn: (payload: AccountingAccountRequest) =>
      editingAccountId
        ? updateAccountingAccount(editingAccountId, payload)
        : createAccountingAccount(payload),
    onSuccess: async (account) => {
      await invalidateAccountingQueries(queryClient);
      setAccountForm(defaultAccountingAccountForm());
      setEditingAccountId(null);
      setError('');
      setMessage(`Account ${account.accountCode} saved.`);
      setEditorTab((current) => (current === 'accounts' ? null : current));
    },
  });

  const deactivateAccountMutation = useMutation({
    mutationFn: deactivateAccountingAccount,
    onSuccess: async (account) => {
      await invalidateAccountingQueries(queryClient);
      setError('');
      setMessage(`Account ${account.accountCode} deactivated.`);
    },
  });

  const savePeriodMutation = useMutation({
    mutationFn: (payload: AccountingPeriodRequest) =>
      editingPeriodId
        ? updateAccountingPeriod(editingPeriodId, payload)
        : createAccountingPeriod(payload),
    onSuccess: async (period) => {
      await invalidateAccountingQueries(queryClient);
      setPeriodForm(defaultAccountingPeriodForm());
      setEditingPeriodId(null);
      setError('');
      setMessage(`Period ${period.name} saved.`);
      setEditorTab((current) => (current === 'periods' ? null : current));
    },
  });

  const saveTaxRuleMutation = useMutation({
    mutationFn: (payload: AccountingTaxRuleRequest) =>
      editingTaxRuleId
        ? updateAccountingTaxRule(editingTaxRuleId, payload)
        : createAccountingTaxRule(payload),
    onSuccess: async (rule) => {
      await invalidateAccountingQueries(queryClient);
      setTaxRuleForm(defaultAccountingTaxRuleForm());
      setEditingTaxRuleId(null);
      setError('');
      setMessage(`Tax rule ${rule.taxCode} saved.`);
      setEditorTab((current) => (current === 'tax' ? null : current));
    },
  });

  const saveJournalMutation = useMutation({
    mutationFn: (payload: AccountingJournalRequest) =>
      editingJournalId
        ? updateAccountingJournal(editingJournalId, payload)
        : createAccountingJournal(payload),
    onSuccess: async (journal) => {
      await invalidateAccountingQueries(queryClient);
      setJournalForm(defaultAccountingJournalForm(defaultBranchId));
      setEditingJournalId(null);
      setError('');
      setMessage(
        journal.status === 'POSTED'
          ? `Journal ${journal.journalNumber} posted to the Ledger and accounting reports.`
          : `Journal ${journal.journalNumber} saved as a draft. Post it when ready to include it in the Ledger and accounting reports.`,
      );
      setEditorTab((current) => (current === 'journals' ? null : current));
    },
  });

  const postJournalMutation = useMutation({
    mutationFn: postAccountingJournal,
    onSuccess: async (journal) => {
      await invalidateAccountingQueries(queryClient);
      setError('');
      setMessage(`Journal ${journal.journalNumber} posted to the Ledger and accounting reports.`);
    },
  });

  const voidJournalMutation = useMutation({
    mutationFn: voidAccountingJournal,
    onSuccess: async (journal) => {
      await invalidateAccountingQueries(queryClient);
      setError('');
      setMessage(`Journal ${journal.journalNumber} voided.`);
    },
  });

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveAccountMutation.mutateAsync({
        ...accountForm,
        accountCode: accountForm.accountCode.trim(),
        accountName: accountForm.accountName.trim(),
      });
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save account');
    }
  }

  async function handlePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await savePeriodMutation.mutateAsync({
        ...periodForm,
        name: periodForm.name.trim(),
      });
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save period');
    }
  }

  async function handleTaxRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveTaxRuleMutation.mutateAsync({
        ...taxRuleForm,
        taxCode: taxRuleForm.taxCode.trim(),
        name: taxRuleForm.name.trim(),
        taxCategory: taxRuleForm.taxCategory.trim(),
        rate: Math.max(0, toNumber(taxRuleForm.rate)),
      });
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save tax rule');
    }
  }

  async function handleJournalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateAccountingJournalForm(journalForm);
    if (validationError) {
      setMessage('');
      setError(validationError);
      return;
    }

    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const status = submitter?.value === 'POSTED' ? 'POSTED' : 'DRAFT';
      await saveJournalMutation.mutateAsync({
        ...accountingJournalFormToRequest(journalForm),
        status,
      });
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save journal');
    }
  }

  function editAccount(account: AccountingAccount) {
    setAccountForm({
      parentAccountId: account.parentAccountId ?? '',
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      active: account.active,
    });
    setEditingAccountId(account.id);
    setActiveTab('accounts');
    setEditorTab('accounts');
    setError('');
    setMessage(`Editing account ${account.accountCode}.`);
  }

  function editPeriod(period: AccountingPeriod) {
    setPeriodForm({
      name: period.name,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      status: period.status,
    });
    setEditingPeriodId(period.id);
    setActiveTab('periods');
    setEditorTab('periods');
    setError('');
    setMessage(`Editing period ${period.name}.`);
  }

  function editTaxRule(rule: AccountingTaxRule) {
    setTaxRuleForm({
      taxCode: rule.taxCode,
      name: rule.name,
      taxCategory: rule.taxCategory,
      rate: rule.rate,
      inclusive: rule.inclusive,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? '',
      active: rule.active,
    });
    setEditingTaxRuleId(rule.id);
    setActiveTab('tax');
    setEditorTab('tax');
    setError('');
    setMessage(`Editing tax rule ${rule.taxCode}.`);
  }

  function editJournal(journal: AccountingJournal) {
    setJournalForm(accountingJournalToForm(journal));
    setEditingJournalId(journal.id);
    setActiveTab('journals');
    setEditorTab('journals');
    setError('');
    setMessage(`Editing journal ${journal.journalNumber}.`);
  }

  async function handlePostJournal(journalId: string) {
    try {
      await postJournalMutation.mutateAsync(journalId);
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to post journal');
    }
  }

  async function handleVoidJournal(journalId: string) {
    try {
      await voidJournalMutation.mutateAsync(journalId);
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to void journal');
    }
  }

  async function handleDeactivateAccount(accountId: string) {
    try {
      await deactivateAccountMutation.mutateAsync(accountId);
    } catch (caughtError) {
      setMessage('');
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to deactivate account');
    }
  }

  function updateJournalLine<K extends keyof AccountingJournalLineFormState>(
    lineIndex: number,
    field: K,
    value: AccountingJournalLineFormState[K],
  ) {
    setJournalForm((current) => ({
      ...current,
      lines: current.lines.map((line, index) =>
        index === lineIndex ? { ...line, [field]: value } : line,
      ),
    }));
    setError('');
  }

  function addJournalLine() {
    setJournalForm((current) => ({
      ...current,
      lines: [...current.lines, defaultAccountingJournalLineForm()],
    }));
  }

  function removeJournalLine(lineIndex: number) {
    setJournalForm((current) => ({
      ...current,
      lines:
        current.lines.length <= 2
          ? current.lines.map((line, index) =>
              index === lineIndex ? defaultAccountingJournalLineForm() : line,
            )
          : current.lines.filter((_, index) => index !== lineIndex),
    }));
  }

  function startAccountingEntry(tab: AccountingEditorTab) {
    if (!canManageAccounting) return;
    setActiveTab(tab);
    setEditorTab(tab);
    setError('');
    setMessage('');
    if (tab === 'journals') {
      setEditingJournalId(null);
      setJournalForm(defaultAccountingJournalForm(defaultBranchId));
    } else if (tab === 'accounts') {
      setEditingAccountId(null);
      setAccountForm(defaultAccountingAccountForm());
    } else if (tab === 'periods') {
      setEditingPeriodId(null);
      setPeriodForm(defaultAccountingPeriodForm());
    } else {
      setEditingTaxRuleId(null);
      setTaxRuleForm(defaultAccountingTaxRuleForm());
    }
  }

  const reportTabs: { key: AccountingReportTab; label: string; icon: string }[] = [
    { key: 'trial-balance', label: 'Trial Balance', icon: 'bi-scale' },
    { key: 'profit-and-loss', label: 'Profit & Loss', icon: 'bi-graph-up-arrow' },
    { key: 'balance-sheet', label: 'Balance Sheet', icon: 'bi-bank' },
    { key: 'cash-flow', label: 'Cash Flow', icon: 'bi-water' },
  ];

  const tabs: { key: AccountingTab; label: string; icon: string }[] = [
    { key: 'journals', label: 'Journals', icon: 'bi-journal-plus' },
    { key: 'ledger', label: 'Ledger', icon: 'bi-list-columns' },
    { key: 'reports', label: 'Reports', icon: 'bi-graph-up' },
    { key: 'accounts', label: 'Accounts', icon: 'bi-diagram-3' },
    { key: 'periods', label: 'Periods', icon: 'bi-calendar-range' },
    { key: 'tax', label: 'Tax Rules', icon: 'bi-percent' },
  ];

  return (
    <section className="branch-workspace accounting-workspace">
      <PageHeader
        title={summaryQuery.data?.title ?? 'Accounting'}
        subtitle={
          summaryQuery.data?.description ??
          'Chart of accounts, journals, ledger activity, tax rules, periods, and financial reports.'
        }
        action={
          showEditor ? (
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => setEditorTab(null)}
            >
              <i className="bi bi-arrow-left" aria-hidden="true" />
              {editorAction.back}
            </button>
          ) : canManageAccounting ? (
            <button
              className="primary-action compact-action"
              type="button"
              onClick={() => startAccountingEntry(actionTab)}
            >
              <i className={`bi ${editorAction.icon}`} aria-hidden="true" />
              {editorAction.label}
            </button>
          ) : undefined
        }
      />

      <FormMessages error={error} message={message} />

      <div className="branch-summary-row commercial-summary-row">
        {(summaryQuery.data?.metrics ?? []).map((metric, index) => (
          <SummaryMetric
            icon={moduleMetricIcon(index, 'bi-bank')}
            key={metric.label}
            label={metric.label}
            tone={moduleMetricTone(index)}
            value={formatModuleMetricValue(metric, organization.currencyCode)}
          />
        ))}
        {summaryQuery.isPending ? <LoadingPanel label="Loading accounting snapshot..." /> : null}
      </div>

      <div className="accounting-tabs" role="tablist" aria-label="Accounting sections">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.key ? 'active' : ''}
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setEditorTab(null);
            }}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'journals' ? (
        <div className="accounting-section">
          {!showEditor && <JournalHelp currencyCode={organization.currencyCode} />}
          {showEditor ? (
            <section className="panel-card accounting-form-panel">
              <PanelHeader
                icon="bi-journal-plus"
                title={editingJournalId ? 'Edit Journal Entry' : 'New Journal Entry'}
                tone="blue"
              />
              <p>
                Describe what happened, add at least two different accounts, and enter matching
                debit and credit totals.
              </p>
              {!canManageAccounting ? (
                <EmptyState
                  icon="bi-lock"
                  title="Read-only accounting"
                  detail="Your account can view accounting records but cannot post changes."
                />
              ) : (
                <form
                  className="record-form accounting-journal-form"
                  onSubmit={handleJournalSubmit}
                >
                  <label className="field-stack">
                    <span>Shop</span>
                    <select
                      value={journalForm.branchId}
                      onChange={(event) =>
                        setJournalForm((current) => ({ ...current, branchId: event.target.value }))
                      }
                    >
                      {currentUser.branchIds.length === 0 && (
                        <option value="">Business-wide entry</option>
                      )}
                      {branchOptions.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-stack">
                    <span>Date</span>
                    <input
                      required
                      type="date"
                      value={journalForm.entryDate}
                      onChange={(event) =>
                        setJournalForm((current) => ({ ...current, entryDate: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Reference (optional)</span>
                    <input
                      maxLength={120}
                      value={journalForm.reference}
                      onChange={(event) =>
                        setJournalForm((current) => ({ ...current, reference: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack wide-field">
                    <span>Description</span>
                    <input
                      required
                      maxLength={255}
                      placeholder="e.g. Money moved from Bank to Shop Cash"
                      value={journalForm.description}
                      onChange={(event) =>
                        setJournalForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <details className="accounting-entry-options wide-field">
                    <summary>Optional details: period, entry number and source</summary>
                    <div className="accounting-entry-options-grid">
                      <label className="field-stack">
                        <span>Period</span>
                        <select
                          value={journalForm.financialPeriodId}
                          onChange={(event) =>
                            setJournalForm((current) => ({
                              ...current,
                              financialPeriodId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Auto-match by date</option>
                          {periods.map((period) => (
                            <option key={period.id} value={period.id}>
                              {period.name} ({labelizeEnum(period.status)})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-stack">
                        <span>Journal No.</span>
                        <input
                          maxLength={40}
                          placeholder="Assigned automatically"
                          value={journalForm.journalNumber}
                          onChange={(event) =>
                            setJournalForm((current) => ({
                              ...current,
                              journalNumber: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="field-stack wide-field">
                        <span>Source Module</span>
                        <input
                          maxLength={80}
                          placeholder="Manual or POS"
                          value={journalForm.sourceModule}
                          onChange={(event) =>
                            setJournalForm((current) => ({
                              ...current,
                              sourceModule: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </details>

                  <div className="wide-field accounting-lines-editor">
                    <div className="commercial-section-heading">
                      <h3>Debit and Credit Lines</h3>
                      <button className="text-button" type="button" onClick={addJournalLine}>
                        <i className="bi bi-plus-lg" aria-hidden="true" />
                        Add Line
                      </button>
                    </div>
                    <p className="accounting-line-guidance">
                      Use one amount per line: either Debit or Credit. The example on the Journals
                      page shows how to record a cash transfer.
                    </p>
                    <div className="accounting-line-grid">
                      {journalForm.lines.map((line, index) => (
                        <div className="accounting-line-row" key={`${index}-${line.accountId}`}>
                          <label className="field-stack accounting-line-account">
                            <span>Account</span>
                            <select
                              required
                              value={line.accountId}
                              onChange={(event) =>
                                updateJournalLine(index, 'accountId', event.target.value)
                              }
                            >
                              <option value="">Select account</option>
                              {accounts
                                .filter((account) => account.active)
                                .map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.accountCode} - {account.accountName}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="field-stack">
                            <span>Debit</span>
                            <input
                              min="0"
                              step="0.01"
                              type="number"
                              value={line.debitAmount}
                              onChange={(event) =>
                                updateJournalLine(index, 'debitAmount', event.target.value)
                              }
                            />
                          </label>
                          <label className="field-stack">
                            <span>Credit</span>
                            <input
                              min="0"
                              step="0.01"
                              type="number"
                              value={line.creditAmount}
                              onChange={(event) =>
                                updateJournalLine(index, 'creditAmount', event.target.value)
                              }
                            />
                          </label>
                          <label className="field-stack accounting-line-description">
                            <span>Line Memo</span>
                            <input
                              maxLength={255}
                              value={line.description}
                              onChange={(event) =>
                                updateJournalLine(index, 'description', event.target.value)
                              }
                            />
                          </label>
                          <button
                            className="icon-button compact-icon"
                            type="button"
                            aria-label="Remove journal line"
                            onClick={() => removeJournalLine(index)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="commercial-total-strip accounting-total-strip wide-field">
                    <div>
                      <span>Debit</span>
                      <strong>{formatMoney(journalTotals.debit, organization.currencyCode)}</strong>
                    </div>
                    <div>
                      <span>Credit</span>
                      <strong>
                        {formatMoney(journalTotals.credit, organization.currencyCode)}
                      </strong>
                    </div>
                    <div>
                      <span>Difference</span>
                      <strong>
                        {formatMoney(
                          Math.abs(journalTotals.debit - journalTotals.credit),
                          organization.currencyCode,
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Lines</span>
                      <strong>{journalForm.lines.length}</strong>
                    </div>
                  </div>

                  <div className="form-actions wide-field">
                    <button
                      className="primary-action compact-action"
                      type="submit"
                      name="journalAction"
                      value="DRAFT"
                      disabled={saveJournalMutation.isPending || accounts.length === 0}
                    >
                      <i className="bi bi-save" aria-hidden="true" />
                      {saveJournalMutation.isPending ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                      className="secondary-action compact-action"
                      type="submit"
                      name="journalAction"
                      value="POSTED"
                      disabled={saveJournalMutation.isPending || accounts.length === 0}
                    >
                      <i className="bi bi-check2-circle" aria-hidden="true" />
                      Save &amp; Post to Ledger
                    </button>
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={() => {
                        setJournalForm(defaultAccountingJournalForm(defaultBranchId));
                        setEditingJournalId(null);
                        setError('');
                        setMessage('Journal form cleared.');
                      }}
                    >
                      <i className="bi bi-x-circle" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <section className="panel-card">
              <PanelHeader icon="bi-journal-text" title="Journal Register" tone="purple" />
              {journalsQuery.isPending ? (
                <LoadingPanel label="Loading journals..." />
              ) : journalsQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Journals could not be loaded"
                  detail="Refresh after the API is available."
                />
              ) : journals.length === 0 ? (
                <EmptyState
                  icon="bi-journal-plus"
                  title="No journals"
                  detail="Saved and posted entries will appear here."
                />
              ) : (
                <div className="responsive-table compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Journal</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {journals.map((journal) => (
                        <tr key={journal.id}>
                          <td data-label="Journal">
                            <span className="table-label">
                              <i className="bi bi-journal-text" aria-hidden="true" />
                              <span>
                                <strong>{journal.journalNumber}</strong>
                                <small>{journal.description}</small>
                              </span>
                            </span>
                          </td>
                          <td data-label="Date">{formatDateOnly(journal.entryDate)}</td>
                          <td data-label="Status">
                            <StatusPill
                              status={accountingStatusTone(journal.status)}
                              label={labelizeEnum(journal.status)}
                            />
                            <small>
                              {journal.status === 'DRAFT'
                                ? 'Not included in the Ledger'
                                : journal.status === 'POSTED'
                                  ? 'Included in the Ledger and reports'
                                  : 'Excluded from the Ledger and reports'}
                            </small>
                          </td>
                          <td data-label="Amount">
                            {formatMoney(journal.totalDebit, organization.currencyCode)}
                          </td>
                          <td data-label="Actions">
                            <span className="table-actions commercial-table-actions">
                              {canManageAccounting && journal.status === 'DRAFT' ? (
                                <>
                                  <button
                                    className="text-button"
                                    type="button"
                                    onClick={() => editJournal(journal)}
                                  >
                                    <i className="bi bi-pencil" aria-hidden="true" />
                                    Edit Draft
                                  </button>
                                  <button
                                    className="text-button"
                                    type="button"
                                    disabled={postJournalMutation.isPending}
                                    onClick={() => handlePostJournal(journal.id)}
                                  >
                                    <i className="bi bi-check2-circle" aria-hidden="true" />
                                    Post to Ledger
                                  </button>
                                </>
                              ) : null}
                              {canManageAccounting && journal.status !== 'VOID' ? (
                                <button
                                  className="text-button danger-text"
                                  type="button"
                                  disabled={voidJournalMutation.isPending}
                                  title="Exclude this entry from the Ledger and reports. This does not refund a payment."
                                  onClick={() => handleVoidJournal(journal.id)}
                                >
                                  <i className="bi bi-slash-circle" aria-hidden="true" />
                                  Void Entry
                                </button>
                              ) : null}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      ) : null}

      {activeTab === 'ledger' ? (
        <section className="panel-card">
          <PanelHeader icon="bi-list-columns" title="General Ledger" tone="blue" />
          <div className="accounting-filter-grid">
            <label className="field-stack">
              <span>Account</span>
              <select
                value={ledgerFilters.accountId}
                onChange={(event) =>
                  setLedgerFilters((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountCode} - {account.accountName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>From</span>
              <input
                type="date"
                value={ledgerFilters.from}
                onChange={(event) =>
                  setLedgerFilters((current) => ({ ...current, from: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>To</span>
              <input
                type="date"
                value={ledgerFilters.to}
                onChange={(event) =>
                  setLedgerFilters((current) => ({ ...current, to: event.target.value }))
                }
              />
            </label>
          </div>
          {ledgerQuery.isPending ? (
            <LoadingPanel label="Loading ledger..." />
          ) : ledgerQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Ledger could not be loaded"
              detail="Check the selected filters and refresh."
            />
          ) : (ledgerQuery.data ?? []).length === 0 ? (
            <EmptyState
              icon="bi-list-columns"
              title="No ledger entries"
              detail="Posted journal lines for the selected filters will appear here."
            />
          ) : (
            <div className="responsive-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Journal</th>
                    <th>Account</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Running</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerQuery.data ?? []).map((entry) => (
                    <tr key={entry.lineId}>
                      <td data-label="Date">{formatDateOnly(entry.entryDate)}</td>
                      <td data-label="Journal">
                        <strong>{entry.journalNumber}</strong>
                        <small>{entry.journalDescription}</small>
                      </td>
                      <td data-label="Account">
                        {entry.accountCode} - {entry.accountName}
                      </td>
                      <td data-label="Debit">
                        {entry.debitAmount
                          ? formatMoney(entry.debitAmount, organization.currencyCode)
                          : '-'}
                      </td>
                      <td data-label="Credit">
                        {entry.creditAmount
                          ? formatMoney(entry.creditAmount, organization.currencyCode)
                          : '-'}
                      </td>
                      <td data-label="Running">
                        {formatMoney(entry.runningBalance, organization.currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'reports' ? (
        <div className="accounting-reports-grid">
          <div
            className="accounting-tabs accounting-report-tabs"
            role="group"
            aria-label="Financial reports"
          >
            {reportTabs.map((report) => (
              <button
                className={activeReport === report.key ? 'active' : ''}
                key={report.key}
                type="button"
                aria-pressed={activeReport === report.key}
                onClick={() => setActiveReport(report.key)}
              >
                <i className={`bi ${report.icon}`} aria-hidden="true" />
                {report.label}
              </button>
            ))}
          </div>
          <section className="panel-card accounting-reports-filter-panel">
            <PanelHeader icon="bi-funnel" title="Report Filters" tone="green" />
            <div className="accounting-filter-grid">
              <label className="field-stack">
                <span>From</span>
                <input
                  type="date"
                  value={reportFilters.from}
                  onChange={(event) =>
                    setReportFilters((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>To</span>
                <input
                  type="date"
                  value={reportFilters.to}
                  onChange={(event) =>
                    setReportFilters((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Balance Sheet As Of</span>
                <input
                  type="date"
                  value={reportFilters.asOf}
                  onChange={(event) =>
                    setReportFilters((current) => ({ ...current, asOf: event.target.value }))
                  }
                />
              </label>
            </div>
          </section>

          {activeReport === 'trial-balance' ? (
            <section className="panel-card">
              <PanelHeader icon="bi-scale" title="Trial Balance" tone="blue" />
              {trialBalanceQuery.isPending ? (
                <LoadingPanel label="Loading trial balance..." />
              ) : trialBalanceQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Trial balance could not be loaded"
                  detail="Refresh after ledger entries are available."
                />
              ) : (
                <>
                  <div className="accounting-report-kpis">
                    <SummaryMetric
                      icon="bi-arrow-down-circle"
                      label="Debits"
                      value={formatMoney(
                        trialBalanceQuery.data?.totalDebit ?? 0,
                        organization.currencyCode,
                      )}
                      tone="green"
                    />
                    <SummaryMetric
                      icon="bi-arrow-up-circle"
                      label="Credits"
                      value={formatMoney(
                        trialBalanceQuery.data?.totalCredit ?? 0,
                        organization.currencyCode,
                      )}
                      tone="blue"
                    />
                    <SummaryMetric
                      icon="bi-sliders"
                      label="Difference"
                      value={formatMoney(
                        Math.abs(trialBalanceQuery.data?.difference ?? 0),
                        organization.currencyCode,
                      )}
                      tone={(trialBalanceQuery.data?.difference ?? 0) === 0 ? 'purple' : 'orange'}
                    />
                  </div>
                  <AccountingTrialBalanceTable
                    currencyCode={organization.currencyCode}
                    rows={trialBalanceQuery.data?.rows ?? []}
                  />
                </>
              )}
            </section>
          ) : null}

          {activeReport === 'profit-and-loss' ? (
            <section className="panel-card">
              <PanelHeader icon="bi-graph-up-arrow" title="Profit & Loss" tone="purple" />
              {profitAndLossQuery.isPending ? (
                <LoadingPanel label="Loading profit and loss..." />
              ) : profitAndLossQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Profit and loss could not be loaded"
                  detail="Refresh after posted revenue and expense journals are available."
                />
              ) : (
                <>
                  <div className="accounting-report-kpis">
                    <SummaryMetric
                      icon="bi-cash-stack"
                      label="Revenue"
                      value={formatMoney(
                        profitAndLossQuery.data?.revenue ?? 0,
                        organization.currencyCode,
                      )}
                      tone="green"
                    />
                    <SummaryMetric
                      icon="bi-wallet2"
                      label="Expenses"
                      value={formatMoney(
                        (profitAndLossQuery.data?.costOfGoodsSold ?? 0) +
                          (profitAndLossQuery.data?.expenses ?? 0),
                        organization.currencyCode,
                      )}
                      tone="orange"
                    />
                    <SummaryMetric
                      icon="bi-bank"
                      label="Net Income"
                      value={formatMoney(
                        profitAndLossQuery.data?.netIncome ?? 0,
                        organization.currencyCode,
                      )}
                      tone="blue"
                    />
                  </div>
                  <AccountingStatementRowsTable
                    currencyCode={organization.currencyCode}
                    rows={[
                      ...(profitAndLossQuery.data?.revenueRows ?? []),
                      ...(profitAndLossQuery.data?.costOfGoodsSoldRows ?? []),
                      ...(profitAndLossQuery.data?.expenseRows ?? []),
                    ]}
                  />
                </>
              )}
            </section>
          ) : null}

          {activeReport === 'balance-sheet' ? (
            <section className="panel-card">
              <PanelHeader icon="bi-bank" title="Balance Sheet" tone="green" />
              {balanceSheetQuery.isPending ? (
                <LoadingPanel label="Loading balance sheet..." />
              ) : balanceSheetQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Balance sheet could not be loaded"
                  detail="Refresh after posted asset, liability, and equity journals are available."
                />
              ) : (
                <>
                  <div className="accounting-report-kpis">
                    <SummaryMetric
                      icon="bi-box-seam"
                      label="Assets"
                      value={formatMoney(
                        balanceSheetQuery.data?.assets ?? 0,
                        organization.currencyCode,
                      )}
                      tone="green"
                    />
                    <SummaryMetric
                      icon="bi-receipt"
                      label="Liabilities + Equity"
                      value={formatMoney(
                        balanceSheetQuery.data?.totalLiabilitiesAndEquity ?? 0,
                        organization.currencyCode,
                      )}
                      tone="blue"
                    />
                    <SummaryMetric
                      icon="bi-sliders"
                      label="Difference"
                      value={formatMoney(
                        Math.abs(balanceSheetQuery.data?.difference ?? 0),
                        organization.currencyCode,
                      )}
                      tone={(balanceSheetQuery.data?.difference ?? 0) === 0 ? 'purple' : 'orange'}
                    />
                  </div>
                  <AccountingStatementRowsTable
                    currencyCode={organization.currencyCode}
                    rows={[
                      ...(balanceSheetQuery.data?.assetRows ?? []),
                      ...(balanceSheetQuery.data?.liabilityRows ?? []),
                      ...(balanceSheetQuery.data?.equityRows ?? []),
                      {
                        accountId: 'retained-earnings',
                        accountCode: 'RE',
                        accountName: 'Retained Earnings',
                        accountType: 'EQUITY',
                        amount: balanceSheetQuery.data?.retainedEarnings ?? 0,
                      },
                    ]}
                  />
                </>
              )}
            </section>
          ) : null}

          {activeReport === 'cash-flow' ? (
            <section className="panel-card">
              <PanelHeader icon="bi-water" title="Cash Flow" tone="blue" />
              {cashFlowQuery.isPending ? (
                <LoadingPanel label="Loading cash flow..." />
              ) : cashFlowQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Cash flow could not be loaded"
                  detail="Refresh after cash, bank, M-Pesa, or petty cash journals are posted."
                />
              ) : (
                <>
                  <div className="accounting-report-kpis">
                    <SummaryMetric
                      icon="bi-box-arrow-in-down"
                      label="Cash In"
                      value={formatMoney(
                        cashFlowQuery.data?.cashIn ?? 0,
                        organization.currencyCode,
                      )}
                      tone="green"
                    />
                    <SummaryMetric
                      icon="bi-box-arrow-up"
                      label="Cash Out"
                      value={formatMoney(
                        cashFlowQuery.data?.cashOut ?? 0,
                        organization.currencyCode,
                      )}
                      tone="orange"
                    />
                    <SummaryMetric
                      icon="bi-cash"
                      label="Closing Cash"
                      value={formatMoney(
                        cashFlowQuery.data?.closingCash ?? 0,
                        organization.currencyCode,
                      )}
                      tone="blue"
                    />
                  </div>
                  <div className="responsive-table compact-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Opening</th>
                          <th>In</th>
                          <th>Out</th>
                          <th>Closing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cashFlowQuery.data?.rows ?? []).map((row) => (
                          <tr key={row.accountId}>
                            <td data-label="Account">
                              {row.accountCode} - {row.accountName}
                            </td>
                            <td data-label="Opening">
                              {formatMoney(row.openingBalance, organization.currencyCode)}
                            </td>
                            <td data-label="In">
                              {formatMoney(row.cashIn, organization.currencyCode)}
                            </td>
                            <td data-label="Out">
                              {formatMoney(row.cashOut, organization.currencyCode)}
                            </td>
                            <td data-label="Closing">
                              {formatMoney(row.closingBalance, organization.currencyCode)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'accounts' ? (
        <div className="accounting-section">
          {showEditor ? (
            <section className="panel-card accounting-form-panel">
              <PanelHeader icon="bi-diagram-3" title="Chart Account" tone="green" />
              {!canManageAccounting ? (
                <EmptyState
                  icon="bi-lock"
                  title="Read-only chart"
                  detail="Accounting management permission is required to change accounts."
                />
              ) : (
                <form className="record-form" onSubmit={handleAccountSubmit}>
                  <label className="field-stack">
                    <span>Code</span>
                    <input
                      required
                      maxLength={40}
                      value={accountForm.accountCode}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          accountCode: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Type</span>
                    <select
                      value={accountForm.accountType}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          accountType: event.target.value as AccountingAccountType,
                        }))
                      }
                    >
                      {accountingAccountTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {labelizeEnum(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-stack wide-field">
                    <span>Name</span>
                    <input
                      required
                      maxLength={160}
                      value={accountForm.accountName}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          accountName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack wide-field">
                    <span>Parent Account</span>
                    <select
                      value={accountForm.parentAccountId}
                      onChange={(event) =>
                        setAccountForm((current) => ({
                          ...current,
                          parentAccountId: event.target.value,
                        }))
                      }
                    >
                      <option value="">No parent</option>
                      {accounts
                        .filter((account) => account.id !== editingAccountId)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountCode} - {account.accountName}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="toggle-row wide-field">
                    <input
                      type="checkbox"
                      checked={accountForm.active}
                      onChange={(event) =>
                        setAccountForm((current) => ({ ...current, active: event.target.checked }))
                      }
                    />
                    <span>Active account</span>
                  </label>
                  <div className="form-actions wide-field">
                    <button
                      className="primary-action compact-action"
                      type="submit"
                      disabled={saveAccountMutation.isPending}
                    >
                      <i className="bi bi-save" aria-hidden="true" />
                      {saveAccountMutation.isPending ? 'Saving...' : 'Save Account'}
                    </button>
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={() => {
                        setAccountForm(defaultAccountingAccountForm());
                        setEditingAccountId(null);
                      }}
                    >
                      <i className="bi bi-x-circle" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <section className="panel-card">
              <PanelHeader icon="bi-list-check" title="Chart of Accounts" tone="blue" />
              {accountsQuery.isPending ? (
                <LoadingPanel label="Loading accounts..." />
              ) : accounts.length === 0 ? (
                <EmptyState
                  icon="bi-diagram-3"
                  title="No accounts"
                  detail="Create chart accounts before posting journals."
                />
              ) : (
                <div className="responsive-table compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id}>
                          <td data-label="Code">{account.accountCode}</td>
                          <td data-label="Name">
                            <strong>{account.accountName}</strong>
                            <small>
                              {account.parentAccountCode
                                ? `Parent ${account.parentAccountCode}`
                                : 'Top level'}
                            </small>
                          </td>
                          <td data-label="Type">{labelizeEnum(account.accountType)}</td>
                          <td data-label="Status">
                            <StatusPill
                              status={account.active ? 'posted' : 'pending'}
                              label={account.active ? 'Active' : 'Inactive'}
                            />
                          </td>
                          <td data-label="Actions">
                            {canManageAccounting ? (
                              <span className="table-actions commercial-table-actions">
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => editAccount(account)}
                                >
                                  <i className="bi bi-pencil" aria-hidden="true" />
                                  Edit
                                </button>
                                {account.active ? (
                                  <button
                                    className="text-button danger-text"
                                    type="button"
                                    onClick={() => handleDeactivateAccount(account.id)}
                                  >
                                    <i className="bi bi-pause-circle" aria-hidden="true" />
                                    Deactivate
                                  </button>
                                ) : null}
                              </span>
                            ) : (
                              'Read only'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      ) : null}

      {activeTab === 'periods' ? (
        <div className="accounting-section">
          {showEditor ? (
            <section className="panel-card accounting-form-panel">
              <PanelHeader icon="bi-calendar-range" title="Financial Period" tone="purple" />
              {!canManageAccounting ? (
                <EmptyState
                  icon="bi-lock"
                  title="Read-only periods"
                  detail="Accounting management permission is required to change periods."
                />
              ) : (
                <form className="record-form" onSubmit={handlePeriodSubmit}>
                  <label className="field-stack wide-field">
                    <span>Name</span>
                    <input
                      required
                      maxLength={120}
                      value={periodForm.name}
                      onChange={(event) =>
                        setPeriodForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Start</span>
                    <input
                      required
                      type="date"
                      value={periodForm.periodStart}
                      onChange={(event) =>
                        setPeriodForm((current) => ({
                          ...current,
                          periodStart: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>End</span>
                    <input
                      required
                      type="date"
                      value={periodForm.periodEnd}
                      onChange={(event) =>
                        setPeriodForm((current) => ({ ...current, periodEnd: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack wide-field">
                    <span>Status</span>
                    <select
                      value={periodForm.status}
                      onChange={(event) =>
                        setPeriodForm((current) => ({
                          ...current,
                          status: event.target.value as AccountingPeriodStatus,
                        }))
                      }
                    >
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      <option value="LOCKED">Locked</option>
                    </select>
                  </label>
                  <div className="form-actions wide-field">
                    <button
                      className="primary-action compact-action"
                      type="submit"
                      disabled={savePeriodMutation.isPending}
                    >
                      <i className="bi bi-save" aria-hidden="true" />
                      {savePeriodMutation.isPending ? 'Saving...' : 'Save Period'}
                    </button>
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={() => {
                        setPeriodForm(defaultAccountingPeriodForm());
                        setEditingPeriodId(null);
                      }}
                    >
                      <i className="bi bi-x-circle" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <section className="panel-card">
              <PanelHeader icon="bi-calendar-check" title="Periods" tone="blue" />
              <div className="responsive-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Range</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((period) => (
                      <tr key={period.id}>
                        <td data-label="Name">{period.name}</td>
                        <td data-label="Range">
                          {formatDateOnly(period.periodStart)} - {formatDateOnly(period.periodEnd)}
                        </td>
                        <td data-label="Status">
                          <StatusPill
                            status={accountingStatusTone(period.status)}
                            label={labelizeEnum(period.status)}
                          />
                        </td>
                        <td data-label="Actions">
                          {canManageAccounting ? (
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => editPeriod(period)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                          ) : (
                            'Read only'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : null}

      {activeTab === 'tax' ? (
        <div className="accounting-section">
          {showEditor ? (
            <section className="panel-card accounting-form-panel">
              <PanelHeader icon="bi-percent" title="Tax Rule" tone="orange" />
              {!canManageAccounting ? (
                <EmptyState
                  icon="bi-lock"
                  title="Read-only tax rules"
                  detail="Accounting management permission is required to change tax rules."
                />
              ) : (
                <form className="record-form" onSubmit={handleTaxRuleSubmit}>
                  <label className="field-stack">
                    <span>Tax Code</span>
                    <input
                      required
                      maxLength={40}
                      value={taxRuleForm.taxCode}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({ ...current, taxCode: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Category</span>
                    <input
                      required
                      maxLength={40}
                      value={taxRuleForm.taxCategory}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          taxCategory: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack wide-field">
                    <span>Name</span>
                    <input
                      required
                      maxLength={120}
                      value={taxRuleForm.name}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Rate %</span>
                    <input
                      required
                      min="0"
                      step="0.01"
                      type="number"
                      value={taxRuleForm.rate}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          rate: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Effective From</span>
                    <input
                      required
                      type="date"
                      value={taxRuleForm.effectiveFrom}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          effectiveFrom: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Effective To</span>
                    <input
                      type="date"
                      value={taxRuleForm.effectiveTo}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          effectiveTo: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={taxRuleForm.inclusive}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          inclusive: event.target.checked,
                        }))
                      }
                    />
                    <span>Inclusive tax</span>
                  </label>
                  <label className="toggle-row wide-field">
                    <input
                      type="checkbox"
                      checked={taxRuleForm.active}
                      onChange={(event) =>
                        setTaxRuleForm((current) => ({
                          ...current,
                          active: event.target.checked,
                        }))
                      }
                    />
                    <span>Active rule</span>
                  </label>
                  <div className="form-actions wide-field">
                    <button
                      className="primary-action compact-action"
                      type="submit"
                      disabled={saveTaxRuleMutation.isPending}
                    >
                      <i className="bi bi-save" aria-hidden="true" />
                      {saveTaxRuleMutation.isPending ? 'Saving...' : 'Save Tax Rule'}
                    </button>
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={() => {
                        setTaxRuleForm(defaultAccountingTaxRuleForm());
                        setEditingTaxRuleId(null);
                      }}
                    >
                      <i className="bi bi-x-circle" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : (
            <section className="panel-card">
              <PanelHeader icon="bi-receipt-cutoff" title="Tax Rules" tone="blue" />
              <div className="responsive-table compact-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Rate</th>
                      <th>Effective</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRules.map((rule) => (
                      <tr key={rule.id}>
                        <td data-label="Code">{rule.taxCode}</td>
                        <td data-label="Name">
                          <strong>{rule.name}</strong>
                          <small>{rule.taxCategory}</small>
                        </td>
                        <td data-label="Rate">{formatPercentValue(rule.rate)}</td>
                        <td data-label="Effective">
                          {formatDateOnly(rule.effectiveFrom)}
                          {rule.effectiveTo ? ` - ${formatDateOnly(rule.effectiveTo)}` : ''}
                        </td>
                        <td data-label="Status">
                          <StatusPill
                            status={rule.active ? 'posted' : 'pending'}
                            label={rule.active ? 'Active' : 'Inactive'}
                          />
                        </td>
                        <td data-label="Actions">
                          {canManageAccounting ? (
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => editTaxRule(rule)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                          ) : (
                            'Read only'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : null}

      {isAccountingLoading ? <LoadingPanel label="Refreshing accounting data..." /> : null}

      {recentWorkItems.length > 0 ? (
        <section className="panel-card">
          <PanelHeader icon="bi-clock-history" title="Recent Accounting Work" tone="blue" />
          <ModuleWorkItemsTable organization={organization} workItems={recentWorkItems} />
        </section>
      ) : null}
    </section>
  );
}

function AccountingTrialBalanceTable({
  currencyCode,
  rows,
}: {
  currencyCode: string;
  rows: NonNullable<Awaited<ReturnType<typeof getAccountingTrialBalance>>>['rows'];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-scale"
        title="No trial balance rows"
        detail="Posted journal activity will appear here."
      />
    );
  }

  return (
    <div className="responsive-table compact-table">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Type</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Net Debit</th>
            <th>Net Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.accountId}>
              <td data-label="Account">
                {row.accountCode} - {row.accountName}
              </td>
              <td data-label="Type">{labelizeEnum(row.accountType)}</td>
              <td data-label="Debit">{formatMoney(row.debitAmount, currencyCode)}</td>
              <td data-label="Credit">{formatMoney(row.creditAmount, currencyCode)}</td>
              <td data-label="Net Debit">{formatMoney(row.netDebit, currencyCode)}</td>
              <td data-label="Net Credit">{formatMoney(row.netCredit, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccountingStatementRowsTable({
  currencyCode,
  rows,
}: {
  currencyCode: string;
  rows: AccountingStatementRow[];
}) {
  const visibleRows = rows.filter((row) => row.amount !== 0);
  if (visibleRows.length === 0) {
    return (
      <EmptyState
        icon="bi-table"
        title="No statement rows"
        detail="Posted accounts for this report will appear here."
      />
    );
  }

  return (
    <div className="responsive-table compact-table">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={`${row.accountId}-${row.accountType}`}>
              <td data-label="Account">
                {row.accountCode} - {row.accountName}
              </td>
              <td data-label="Type">{labelizeEnum(row.accountType)}</td>
              <td data-label="Amount">{formatMoney(row.amount, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const accountingAccountTypeOptions: AccountingAccountType[] = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'COGS',
  'EXPENSE',
];

function defaultAccountingAccountForm(): AccountingAccountRequest {
  return {
    parentAccountId: '',
    accountCode: '',
    accountName: '',
    accountType: 'ASSET',
    active: true,
  };
}

function defaultAccountingPeriodForm(): AccountingPeriodRequest {
  const today = new Date();
  const year = today.getFullYear();
  return {
    name: `FY ${year}`,
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
    status: 'OPEN',
  };
}

function defaultAccountingTaxRuleForm(): AccountingTaxRuleRequest {
  return {
    taxCode: '',
    name: '',
    taxCategory: 'VAT',
    rate: 0,
    inclusive: false,
    effectiveFrom: todayInputValue(),
    effectiveTo: '',
    active: true,
  };
}

function defaultAccountingJournalLineForm(): AccountingJournalLineFormState {
  return {
    accountId: '',
    debitAmount: '0',
    creditAmount: '0',
    description: '',
  };
}

function defaultAccountingJournalForm(
  branchId = '',
  financialPeriodId = '',
): AccountingJournalFormState {
  return {
    branchId,
    financialPeriodId,
    journalNumber: '',
    entryDate: todayInputValue(),
    description: '',
    reference: '',
    sourceModule: 'Manual',
    status: 'DRAFT',
    lines: [defaultAccountingJournalLineForm(), defaultAccountingJournalLineForm()],
  };
}

function defaultAccountingLedgerFilters(branchId = ''): AccountingLedgerFilters {
  return {
    accountId: '',
    branchId,
    from: monthStartInputValue(),
    to: todayInputValue(),
  };
}

function defaultAccountingReportFilters(branchId = ''): AccountingReportFilters {
  return {
    branchId,
    from: monthStartInputValue(),
    to: todayInputValue(),
    asOf: todayInputValue(),
  };
}

function monthStartInputValue() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function accountingJournalFormTotals(form: AccountingJournalFormState) {
  const debit = form.lines.reduce(
    (total, line) => total + Math.max(0, toNumber(line.debitAmount)),
    0,
  );
  const credit = form.lines.reduce(
    (total, line) => total + Math.max(0, toNumber(line.creditAmount)),
    0,
  );
  return { debit, credit };
}

function validateAccountingJournalForm(form: AccountingJournalFormState) {
  if (!form.description.trim()) {
    return 'Enter a journal description.';
  }
  const meaningfulLines = form.lines.filter((line) => line.accountId);
  if (meaningfulLines.length < 2) {
    return 'Select at least two journal accounts.';
  }
  if (new Set(meaningfulLines.map((line) => line.accountId)).size < 2) {
    return 'Choose at least two different accounts for the journal entry.';
  }
  const invalidLine = meaningfulLines.find((line) => {
    const debit = Math.max(0, toNumber(line.debitAmount));
    const credit = Math.max(0, toNumber(line.creditAmount));
    return (debit > 0 && credit > 0) || (debit === 0 && credit === 0);
  });
  if (invalidLine) {
    return 'Each journal line must have either a debit or a credit amount.';
  }
  const totals = accountingJournalFormTotals({ ...form, lines: meaningfulLines });
  if (totals.debit <= 0 || Math.abs(totals.debit - totals.credit) > 0.005) {
    return 'Journal debits and credits must balance.';
  }
  return '';
}

function accountingJournalFormToRequest(
  form: AccountingJournalFormState,
): AccountingJournalRequest {
  return {
    ...form,
    branchId: form.branchId,
    financialPeriodId: form.financialPeriodId,
    journalNumber: form.journalNumber.trim(),
    description: form.description.trim(),
    reference: form.reference.trim(),
    sourceModule: form.sourceModule.trim(),
    lines: form.lines
      .filter((line) => line.accountId)
      .map((line) => ({
        accountId: line.accountId,
        debitAmount: Math.max(0, toNumber(line.debitAmount)),
        creditAmount: Math.max(0, toNumber(line.creditAmount)),
        description: line.description.trim(),
      })),
  };
}

function accountingJournalToForm(journal: AccountingJournal): AccountingJournalFormState {
  return {
    branchId: journal.branchId ?? '',
    financialPeriodId: journal.financialPeriodId ?? '',
    journalNumber: journal.journalNumber,
    entryDate: journal.entryDate,
    description: journal.description,
    reference: journal.reference ?? '',
    sourceModule: journal.sourceModule ?? 'Manual',
    status: journal.status === 'POSTED' ? 'POSTED' : 'DRAFT',
    lines: journal.lines.map((line) => ({
      accountId: line.accountId,
      debitAmount: String(line.debitAmount),
      creditAmount: String(line.creditAmount),
      description: line.description ?? '',
    })),
  };
}

function normalizeAccountingLedgerFilters(filters: AccountingLedgerFilters) {
  return {
    accountId: filters.accountId || undefined,
    branchId: filters.branchId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

function normalizeAccountingReportFilters(filters: AccountingReportFilters) {
  return {
    branchId: filters.branchId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}

function accountingStatusTone(status: AccountingJournalStatus | AccountingPeriodStatus | string) {
  if (['POSTED', 'OPEN', 'ACTIVE'].includes(status)) {
    return 'posted' as const;
  }
  if (['VOID', 'LOCKED', 'CLOSED', 'INACTIVE'].includes(status)) {
    return 'pending' as const;
  }
  return 'review' as const;
}

async function invalidateAccountingQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['accounting'] }),
    queryClient.invalidateQueries({ queryKey: ['accounting-summary'] }),
  ]);
}

function formatPercentValue(value: number) {
  return `${new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

const PROCUREMENT_PURCHASE_ORDERS_STORAGE_KEY = 'keen-procurement-purchase-orders-v1';
const PROCUREMENT_SHARE_PARAM = 'purchaseOrder';

type PurchaseOrderLine = {
  id: string;
  productId: string;
  description: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

type PurchaseOrderDocument = {
  id: string;
  purchaseOrderNumber: string;
  status: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierAddress: string;
  issueDate: string;
  deliveryDate: string;
  deliveryLocationName: string;
  deliveryAddress: string;
  orderedByName: string;
  orderedByEmail: string;
  summary: string;
  deliveryFee: string;
  terms: string;
  whatsappMessage: string;
  notes: string;
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
};

function ProcurementPage({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const summaryQuery = useQuery({
    queryKey: ['procurement-summary'],
    queryFn: getProcurementSummary,
  });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const products = productsQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const activeProducts = products.filter(isSellableProduct);
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVE');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDocument[]>(() =>
    loadPurchaseOrders(),
  );
  const [initialSharedPurchaseOrder] = useState<PurchaseOrderDocument | null>(() =>
    parsePurchaseOrderFromUrl(organization, branches),
  );
  const [draft, setDraft] = useState<PurchaseOrderDocument>(
    () =>
      initialSharedPurchaseOrder ??
      createPurchaseOrderDocument(organization, branches, nextPurchaseOrderNumber(purchaseOrders)),
  );
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(
    initialSharedPurchaseOrder?.id ?? null,
  );
  const [message, setMessage] = useState(
    initialSharedPurchaseOrder ? 'Shared purchase order loaded.' : '',
  );
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [purchaseAddQuantity, setPurchaseAddQuantity] = useState('1');
  const purchasePreviewPanel = useRef<HTMLElement>(null);

  useEffect(() => {
    savePurchaseOrders(purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [
        ...(purchasePreviewPanel.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? []),
      ].filter((element) => element.getClientRects().length > 0);
    purchasePreviewPanel.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Close purchase order preview"]')
      ?.focus({ preventScroll: true });
    function handlePreviewKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsPreviewOpen(false);
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      if (!targets.length) return;
      if (event.shiftKey && document.activeElement === targets[0]) {
        event.preventDefault();
        targets[targets.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === targets[targets.length - 1]) {
        event.preventDefault();
        targets[0].focus();
      }
    }
    window.addEventListener('keydown', handlePreviewKeyDown);
    return () => {
      window.removeEventListener('keydown', handlePreviewKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isPreviewOpen]);

  const title = summaryQuery.data?.title ?? 'Procurement';
  const description =
    summaryQuery.data?.description ??
    'Generate purchase orders for supplier restocking and share them for fulfillment.';
  const totals = purchaseOrderTotals(draft);
  const purchaseItemLines = draft.lines.filter((line) => !isBlankPurchaseOrderLine(line));
  const savedPurchaseOrder = purchaseOrders.find((order) => order.id === selectedPurchaseOrderId);
  const recentWorkItems = summaryQuery.data?.workItems ?? [];
  const metrics = procurementMetricsFromPurchaseOrders(
    purchaseOrders,
    draft,
    organization.currencyCode,
  );

  function updateDraftField<K extends keyof PurchaseOrderDocument>(
    field: K,
    value: PurchaseOrderDocument[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
    setError('');
  }

  function startPurchaseOrder() {
    const nextOrder = createPurchaseOrderDocument(
      organization,
      branches,
      nextPurchaseOrderNumber(purchaseOrders),
    );
    setDraft(nextOrder);
    setSelectedPurchaseOrderId(null);
    setShareLink('');
    setError('');
    setMessage('New purchase order draft started.');
  }

  function selectSupplier(supplierId: string) {
    const supplier = activeSuppliers.find((item) => item.id === supplierId);
    setDraft((current) => ({
      ...current,
      supplierId,
      supplierName: supplier?.name ?? '',
      supplierEmail: supplier?.email ?? '',
      supplierPhone: supplier?.phone ?? '',
      supplierAddress: supplier?.address ?? '',
      updatedAt: new Date().toISOString(),
    }));
    setError('');
  }

  function updateLineItem<K extends keyof PurchaseOrderLine>(
    lineId: string,
    field: K,
    value: PurchaseOrderLine[K],
  ) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
      updatedAt: new Date().toISOString(),
    }));
    setError('');
  }

  function addProductLine(product?: Product) {
    if (product == null) {
      return;
    }

    const requestedQuantity = toNumber(purchaseAddQuantity);
    if (requestedQuantity <= 0) {
      setError('Enter a quantity greater than zero before adding a product.');
      return;
    }

    const nextLine = {
      ...createPurchaseOrderLineFromProduct(product),
      quantity: String(requestedQuantity),
    };
    setDraft((current) => ({
      ...current,
      lines: addProductToPurchaseOrderLines(current.lines, nextLine),
      updatedAt: new Date().toISOString(),
    }));
    setPurchaseAddQuantity('1');
    setError('');
  }

  function removeLineItem(lineId: string) {
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? [createPurchaseOrderLine()]
          : current.lines.filter((line) => line.id !== lineId),
      updatedAt: new Date().toISOString(),
    }));
  }

  function savePurchaseOrder() {
    const validationError = validatePurchaseOrder(draft);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const normalizedPurchaseOrder = normalizePurchaseOrder(draft);
    setPurchaseOrders((current) => [
      normalizedPurchaseOrder,
      ...current.filter((order) => order.id !== normalizedPurchaseOrder.id),
    ]);
    setDraft(normalizedPurchaseOrder);
    setSelectedPurchaseOrderId(normalizedPurchaseOrder.id);
    setShareLink('');
    setError('');
    setMessage(`Purchase order ${normalizedPurchaseOrder.purchaseOrderNumber} saved.`);
  }

  function loadPurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
    setDraft(purchaseOrder);
    setSelectedPurchaseOrderId(purchaseOrder.id);
    setShareLink('');
    setError('');
    setMessage(`Purchase order ${purchaseOrder.purchaseOrderNumber} loaded.`);
  }

  async function sharePurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
    const validationError = validatePurchaseOrder(purchaseOrder);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const link = purchaseOrderShareUrl(normalizePurchaseOrder(purchaseOrder));
    setShareLink(link);
    try {
      await copyTextToClipboard(link);
      setMessage('Purchase order link copied to clipboard.');
      setError('');
    } catch {
      setMessage('Purchase order link generated. Copy it from the link field.');
      setError('');
    }
  }

  async function emailPurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
    const normalizedPurchaseOrder = normalizePurchaseOrder(purchaseOrder);
    const validationError = validatePurchaseOrder(normalizedPurchaseOrder);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }
    if (!normalizedPurchaseOrder.supplierEmail.trim()) {
      setError('Enter a supplier email before sending this purchase order.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('Sending purchase order PDF by email...');
    try {
      const pdfFile = createPurchaseOrderPdfFile(normalizedPurchaseOrder, organization);
      await sendDocumentEmail({
        to: normalizedPurchaseOrder.supplierEmail.trim(),
        from: normalizedPurchaseOrder.orderedByEmail.trim() || undefined,
        subject: purchaseOrderEmailSubject(normalizedPurchaseOrder, organization),
        message: purchaseOrderEmailMessage(normalizedPurchaseOrder, organization),
        attachmentFileName: pdfFile.name,
        attachmentContentBase64: await blobToBase64(pdfFile),
      });
      setMessage(`Purchase order ${normalizedPurchaseOrder.purchaseOrderNumber} emailed as PDF.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to email purchase order',
      );
      setMessage('');
    }
  }

  async function whatsappPurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
    const normalizedPurchaseOrder = normalizePurchaseOrder(purchaseOrder);
    const validationError = validatePurchaseOrder(normalizedPurchaseOrder);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const phoneNumber = normalizeWhatsAppNumber(normalizedPurchaseOrder.supplierPhone);
    if (!phoneNumber) {
      setError('Enter a supplier WhatsApp number before sending this purchase order.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('Preparing purchase order PDF for WhatsApp.');
    const pdfFile = createPurchaseOrderPdfFile(normalizedPurchaseOrder, organization);
    const shared = await sharePdfFile(
      pdfFile,
      purchaseOrderWhatsAppText(normalizedPurchaseOrder, organization),
      `Purchase Order ${normalizedPurchaseOrder.purchaseOrderNumber}`,
    );
    if (shared) {
      setMessage('Purchase order PDF opened in your share sheet.');
      return;
    }

    downloadBlob(pdfFile.name, pdfFile);
    setMessage('PDF downloaded. Attach it in the WhatsApp chat that opens.');
    window.open(
      purchaseOrderWhatsAppUrl(normalizedPurchaseOrder, organization),
      '_blank',
      'noopener,noreferrer',
    );
  }

  function printPurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
    setDraft(purchaseOrder);
    setSelectedPurchaseOrderId(purchaseOrder.id);
    setShareLink('');
    setIsPreviewOpen(true);
    window.setTimeout(() => window.print(), 120);
  }

  function openPurchaseOrderPreview() {
    setIsPreviewOpen(true);
  }

  return (
    <section className="table-workspace procurement-workspace">
      <PageHeader
        title={title}
        subtitle={description}
        action={
          <button
            className="primary-action compact-action"
            type="button"
            onClick={startPurchaseOrder}
          >
            <i className="bi bi-file-earmark-plus" aria-hidden="true" />
            New Purchase Order
          </button>
        }
      />

      <FormMessages error={error} message={message} />

      <div className="branch-summary-row commercial-summary-row">
        {metrics.map((metric, index) => (
          <SummaryMetric
            icon={moduleMetricIcon(index, 'bi-clipboard-check')}
            key={metric.label}
            label={metric.label}
            tone={moduleMetricTone(index)}
            value={metric.value}
          />
        ))}
      </div>

      <div className="procurement-mobile-toolbar" aria-label="Purchase order shortcuts">
        <button type="button" className="active" onClick={openPurchaseOrderPreview}>
          <i className="bi bi-eye" aria-hidden="true" />
          Preview
        </button>
        <button type="button" onClick={() => sharePurchaseOrder(draft)}>
          <i className="bi bi-link-45deg" aria-hidden="true" />
          Link
        </button>
        <button type="button" onClick={() => whatsappPurchaseOrder(draft)}>
          <i className="bi bi-whatsapp" aria-hidden="true" />
          WhatsApp
        </button>
        <button type="button" onClick={() => printPurchaseOrder(draft)}>
          <i className="bi bi-printer" aria-hidden="true" />
          Print
        </button>
      </div>

      <div className="commercial-layout procurement-layout">
        <section className="panel-card commercial-builder-panel procurement-builder-panel">
          <PanelHeader
            icon="bi-pencil-square"
            title="Purchase Order Builder"
            tone="blue"
            action={
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={openPurchaseOrderPreview}
              >
                <i className="bi bi-eye" aria-hidden="true" />
                Preview
              </button>
            }
          />
          <form
            className="record-form commercial-form procurement-form"
            onSubmit={(event) => {
              event.preventDefault();
              savePurchaseOrder();
            }}
          >
            <div className="procurement-meta-grid wide-field">
              <label className="field-stack">
                <span>P.O Number</span>
                <input
                  required
                  maxLength={24}
                  value={draft.purchaseOrderNumber}
                  onChange={(event) => updateDraftField('purchaseOrderNumber', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateDraftField('status', event.target.value)}
                >
                  {purchaseOrderStatusOptions().map((status) => (
                    <option key={status} value={status}>
                      {labelizeEnum(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack procurement-supplier-field procurement-meta-span-2">
                <span>Supplier</span>
                <select
                  required
                  disabled={suppliersQuery.isPending || activeSuppliers.length === 0}
                  value={draft.supplierId}
                  onChange={(event) => selectSupplier(event.target.value)}
                >
                  <option value="">
                    {suppliersQuery.isPending
                      ? 'Loading suppliers...'
                      : activeSuppliers.length === 0
                        ? 'Add an active supplier first'
                        : 'Select supplier'}
                  </option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Issue Date</span>
                <input
                  required
                  type="date"
                  value={draft.issueDate}
                  onChange={(event) => updateDraftField('issueDate', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Delivery Date</span>
                <input
                  required
                  type="date"
                  value={draft.deliveryDate}
                  onChange={(event) => updateDraftField('deliveryDate', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Delivery Fee</span>
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={draft.deliveryFee}
                  onChange={(event) => updateDraftField('deliveryFee', event.target.value)}
                />
              </label>
            </div>

            <div className="procurement-lines-editor wide-field">
              <div className="commercial-section-heading procurement-line-heading">
                <div>
                  <h3>Purchase Items</h3>
                  <p>
                    {purchaseItemLines.length} {purchaseItemLines.length === 1 ? 'line' : 'lines'} -{' '}
                    {formatMoney(totals.subtotal, organization.currencyCode)} subtotal
                  </p>
                </div>
              </div>
              <div className="field-stack procurement-product-add-field">
                <span>Add product</span>
                <div className="procurement-product-add-controls">
                  <label className="procurement-add-quantity">
                    <span>Qty</span>
                    <input
                      aria-label="Quantity before adding product"
                      min="0.01"
                      step="0.01"
                      type="number"
                      value={purchaseAddQuantity}
                      onChange={(event) => setPurchaseAddQuantity(event.target.value)}
                    />
                  </label>
                  <ProductSearchSelect
                    disabled={productsQuery.isPending}
                    emptyLabel={
                      productsQuery.isPending
                        ? 'Loading products...'
                        : 'No active products available'
                    }
                    placeholder="Search product name, SKU, category, size, or color"
                    products={activeProducts}
                    selectLabel="Search products to add"
                    value=""
                    onChange={(_, product) => addProductLine(product)}
                  />
                </div>
              </div>
              <div className="procurement-line-grid">
                <div className="procurement-line-header" aria-hidden="true">
                  <span>No.</span>
                  <span>Product</span>
                  <span>QTY</span>
                  <span>Unit Price</span>
                  <span>Total</span>
                  <span />
                </div>
                {purchaseItemLines.length === 0 ? (
                  <div className="procurement-line-empty">
                    Search for a product above to add it to this purchase order.
                  </div>
                ) : (
                  purchaseItemLines.map((line, index) => {
                    const lineTotals = purchaseOrderLineTotals(line);
                    const lineLabel = line.description || `item ${index + 1}`;
                    return (
                      <div className="procurement-line-row" key={line.id}>
                        <div
                          className="procurement-line-index"
                          aria-label={`Purchase item ${index + 1}`}
                        >
                          <span>No.</span>
                          <strong>{index + 1}</strong>
                        </div>
                        <div className="procurement-line-product-summary">
                          <span className="visually-hidden">Product</span>
                          <strong>{line.description}</strong>
                        </div>
                        <label className="procurement-line-input procurement-line-qty">
                          <span className="visually-hidden">Quantity for {lineLabel}</span>
                          <span className="procurement-mobile-field-label" aria-hidden="true">
                            Quantity
                          </span>
                          <input
                            min="0"
                            step="0.01"
                            type="number"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLineItem(line.id, 'quantity', event.target.value)
                            }
                          />
                        </label>
                        <label className="procurement-line-input procurement-line-unit">
                          <span className="visually-hidden">Unit price for {lineLabel}</span>
                          <span className="procurement-mobile-field-label" aria-hidden="true">
                            Unit price
                          </span>
                          <input
                            min="0"
                            step="0.01"
                            type="number"
                            value={line.unitPrice}
                            onChange={(event) =>
                              updateLineItem(line.id, 'unitPrice', event.target.value)
                            }
                          />
                        </label>
                        <div className="commercial-line-total procurement-line-total">
                          <span className="visually-hidden">Total for {lineLabel}</span>
                          <span className="procurement-mobile-field-label" aria-hidden="true">
                            Total
                          </span>
                          <strong>
                            {formatMoney(lineTotals.total, organization.currencyCode)}
                          </strong>
                        </div>
                        <button
                          className="icon-button compact-icon procurement-line-remove"
                          type="button"
                          aria-label={`Remove ${lineLabel}`}
                          onClick={() => removeLineItem(line.id)}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="procurement-detail-grid wide-field">
              <label className="field-stack">
                <span>Supplier Email</span>
                <input
                  type="email"
                  maxLength={120}
                  value={draft.supplierEmail}
                  onChange={(event) => updateDraftField('supplierEmail', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Supplier WhatsApp</span>
                <input
                  inputMode="tel"
                  maxLength={32}
                  placeholder="+254..."
                  value={draft.supplierPhone}
                  onChange={(event) => updateDraftField('supplierPhone', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Supplier Address</span>
                <textarea
                  maxLength={220}
                  value={draft.supplierAddress}
                  onChange={(event) => updateDraftField('supplierAddress', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Requester</span>
                <input
                  required
                  maxLength={90}
                  value={draft.orderedByName}
                  onChange={(event) => updateDraftField('orderedByName', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Procurement Email</span>
                <input
                  type="email"
                  maxLength={120}
                  value={draft.orderedByEmail}
                  onChange={(event) => updateDraftField('orderedByEmail', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Delivery Location</span>
                <input
                  maxLength={90}
                  value={draft.deliveryLocationName}
                  onChange={(event) => updateDraftField('deliveryLocationName', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Delivery Address</span>
                <textarea
                  maxLength={240}
                  value={draft.deliveryAddress}
                  onChange={(event) => updateDraftField('deliveryAddress', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Summary</span>
                <textarea
                  maxLength={240}
                  value={draft.summary}
                  onChange={(event) => updateDraftField('summary', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>WhatsApp Message</span>
                <textarea
                  maxLength={420}
                  value={draft.whatsappMessage}
                  onChange={(event) => updateDraftField('whatsappMessage', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Terms & Delivery Notes</span>
                <textarea
                  maxLength={420}
                  value={draft.terms}
                  onChange={(event) => updateDraftField('terms', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Internal Notes</span>
                <textarea
                  maxLength={360}
                  value={draft.notes}
                  onChange={(event) => updateDraftField('notes', event.target.value)}
                />
              </label>
            </div>

            <div className="commercial-total-strip wide-field">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(totals.subtotal, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>VAT</span>
                <strong>{formatMoney(totals.tax, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>{formatMoney(totals.deliveryFee, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>Grand Total</span>
                <strong>{formatMoney(totals.total, organization.currencyCode)}</strong>
              </div>
            </div>

            <div className="form-actions wide-field">
              <button className="primary-action compact-action" type="submit">
                <i className="bi bi-save" aria-hidden="true" />
                Save P.O
              </button>
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => sharePurchaseOrder(draft)}
              >
                <i className="bi bi-link-45deg" aria-hidden="true" />
                Share Link
              </button>
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => emailPurchaseOrder(draft)}
              >
                <i className="bi bi-envelope" aria-hidden="true" />
                Email
              </button>
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => whatsappPurchaseOrder(draft)}
              >
                <i className="bi bi-whatsapp" aria-hidden="true" />
                WhatsApp
              </button>
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => printPurchaseOrder(draft)}
              >
                <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                Save PDF
              </button>
            </div>

            {shareLink ? (
              <label className="field-stack wide-field commercial-share-field">
                <span>Share Link</span>
                <input readOnly value={shareLink} onFocus={(event) => event.target.select()} />
              </label>
            ) : null}
          </form>
        </section>
      </div>

      {isPreviewOpen ? (
        <div
          className="dialog-backdrop procurement-preview-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setIsPreviewOpen(false)}
        >
          <section
            aria-labelledby="procurement-preview-title"
            aria-modal="true"
            className="procurement-preview-dialog"
            role="dialog"
            ref={purchasePreviewPanel}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="dialog-header procurement-preview-dialog-header">
              <div>
                <span className="eyebrow">Purchase order preview</span>
                <h2 id="procurement-preview-title">P.O Preview</h2>
              </div>
              <div className="header-actions">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => sharePurchaseOrder(draft)}
                >
                  <i className="bi bi-link-45deg" aria-hidden="true" />
                  Link
                </button>
                <button
                  className="primary-action compact-action"
                  type="button"
                  onClick={() => printPurchaseOrder(draft)}
                >
                  <i className="bi bi-printer" aria-hidden="true" />
                  Print
                </button>
              </div>
              <button
                className="icon-button compact-icon"
                type="button"
                aria-label="Close purchase order preview"
                onClick={() => setIsPreviewOpen(false)}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </header>
            <div className="procurement-document-print-root">
              <PurchaseOrderPreview purchaseOrder={draft} organization={organization} />
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel-card commercial-documents-panel">
        <PanelHeader
          icon="bi-folder2-open"
          title="Generated Purchase Orders"
          tone="green"
          action={
            savedPurchaseOrder ? (
              <span className="invoice-total-pill">
                Loaded {savedPurchaseOrder.purchaseOrderNumber}
              </span>
            ) : undefined
          }
        />
        {purchaseOrders.length === 0 ? (
          <EmptyState
            icon="bi-file-earmark-plus"
            title="No purchase orders"
            detail="Saved purchase orders will appear here."
          />
        ) : (
          <>
            <div className="commercial-document-card-list">
              {purchaseOrders.map((purchaseOrder) => {
                const orderTotals = purchaseOrderTotals(purchaseOrder);
                return (
                  <article className="commercial-document-card" key={`po-card-${purchaseOrder.id}`}>
                    <header>
                      <span className="commercial-document-card-icon">
                        <i className="bi bi-clipboard-check" aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{purchaseOrder.purchaseOrderNumber}</strong>
                        <small>Purchase Order</small>
                      </div>
                      <StatusPill
                        label={labelizeEnum(purchaseOrder.status)}
                        status={moduleStatusTone(purchaseOrder.status)}
                      />
                    </header>
                    <dl>
                      <div>
                        <dt>Supplier</dt>
                        <dd>{purchaseOrder.supplierName || 'Supplier'}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd>{formatMoney(orderTotals.total, organization.currencyCode)}</dd>
                      </div>
                      <div>
                        <dt>Delivery</dt>
                        <dd>{commercialFormatDate(purchaseOrder.deliveryDate)}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDateTime(purchaseOrder.updatedAt)}</dd>
                      </div>
                    </dl>
                    <div className="commercial-card-actions">
                      <button type="button" onClick={() => loadPurchaseOrder(purchaseOrder)}>
                        <i className="bi bi-pencil" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" onClick={() => sharePurchaseOrder(purchaseOrder)}>
                        <i className="bi bi-link-45deg" aria-hidden="true" />
                        Link
                      </button>
                      <button type="button" onClick={() => emailPurchaseOrder(purchaseOrder)}>
                        <i className="bi bi-envelope" aria-hidden="true" />
                        Email
                      </button>
                      <button type="button" onClick={() => whatsappPurchaseOrder(purchaseOrder)}>
                        <i className="bi bi-whatsapp" aria-hidden="true" />
                        WhatsApp
                      </button>
                      <button type="button" onClick={() => printPurchaseOrder(purchaseOrder)}>
                        <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                        PDF
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="responsive-table compact-table generated-documents-table">
              <table>
                <thead>
                  <tr>
                    <th>P.O</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Delivery</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((purchaseOrder) => {
                    const orderTotals = purchaseOrderTotals(purchaseOrder);
                    return (
                      <tr key={purchaseOrder.id}>
                        <td data-label="P.O">
                          <span className="table-label">
                            <i className="bi bi-clipboard-check" aria-hidden="true" />
                            <span>
                              <strong>{purchaseOrder.purchaseOrderNumber}</strong>
                              <small>Purchase Order</small>
                            </span>
                          </span>
                        </td>
                        <td data-label="Supplier">{purchaseOrder.supplierName || 'Supplier'}</td>
                        <td data-label="Status">
                          <StatusPill
                            label={labelizeEnum(purchaseOrder.status)}
                            status={moduleStatusTone(purchaseOrder.status)}
                          />
                        </td>
                        <td data-label="Total">
                          {formatMoney(orderTotals.total, organization.currencyCode)}
                        </td>
                        <td data-label="Delivery">
                          {commercialFormatDate(purchaseOrder.deliveryDate)}
                        </td>
                        <td data-label="Updated">{formatDateTime(purchaseOrder.updatedAt)}</td>
                        <td data-label="Actions">
                          <div className="table-actions commercial-table-actions">
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => loadPurchaseOrder(purchaseOrder)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => sharePurchaseOrder(purchaseOrder)}
                            >
                              <i className="bi bi-link-45deg" aria-hidden="true" />
                              Link
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => emailPurchaseOrder(purchaseOrder)}
                            >
                              <i className="bi bi-envelope" aria-hidden="true" />
                              Email
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => whatsappPurchaseOrder(purchaseOrder)}
                            >
                              <i className="bi bi-whatsapp" aria-hidden="true" />
                              WhatsApp
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => printPurchaseOrder(purchaseOrder)}
                            >
                              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {summaryQuery.isPending ? (
        <LoadingPanel label="Loading procurement snapshot..." />
      ) : recentWorkItems.length > 0 ? (
        <section className="panel-card">
          <PanelHeader icon="bi-clock-history" title="System Recent Work" tone="blue" />
          <ModuleWorkItemsTable organization={organization} workItems={recentWorkItems} />
        </section>
      ) : null}
    </section>
  );
}

function PurchaseOrderPreview({
  organization,
  purchaseOrder,
}: {
  organization: Organization;
  purchaseOrder: PurchaseOrderDocument;
}) {
  const totals = purchaseOrderTotals(purchaseOrder);
  const meaningfulLines = purchaseOrder.lines.filter((line) => line.description.trim());

  return (
    <article className="commercial-document-preview purchase-order-preview">
      <header className="commercial-document-heading">
        <span>Documents</span>
        <h2>Purchase Order {purchaseOrder.purchaseOrderNumber || 'PO-0001'}</h2>
        <p>Procurement Order</p>
      </header>

      <div className="commercial-document-brandbar">
        <div className="commercial-document-brand">
          <strong>{organization.name}</strong>
          <span>
            {organization.taxRegistrationNumber
              ? `PIN ${organization.taxRegistrationNumber}`
              : 'Procurement Desk'}
          </span>
        </div>
        <div>
          <strong>PURCHASE ORDER</strong>
          <span>No. {purchaseOrder.purchaseOrderNumber}</span>
          <span>Date: {commercialFormatDate(purchaseOrder.issueDate)}</span>
        </div>
      </div>

      <section className="commercial-document-intro">
        <h3>Purchase Order</h3>
        <p>
          {purchaseOrder.summary ||
            `Authorised purchase order for goods and services, issued by ${organization.name}.`}
        </p>
      </section>

      <section className="commercial-document-parties purchase-order-parties">
        <div>
          <span>Supplier</span>
          <strong>{purchaseOrder.supplierName || 'Supplier name'}</strong>
          {purchaseOrder.supplierAddress ? <p>{purchaseOrder.supplierAddress}</p> : null}
          {purchaseOrder.supplierEmail ? (
            <a href={`mailto:${purchaseOrder.supplierEmail}`}>{purchaseOrder.supplierEmail}</a>
          ) : null}
          <span>Delivery Date</span>
          <strong>{commercialFormatDate(purchaseOrder.deliveryDate)}</strong>
        </div>
        <div>
          <span>Ordered By</span>
          <strong>{purchaseOrder.orderedByName || organization.name}</strong>
          <p>{purchaseOrder.purchaseOrderNumber}</p>
          {purchaseOrder.orderedByEmail ? (
            <a href={`mailto:${purchaseOrder.orderedByEmail}`}>{purchaseOrder.orderedByEmail}</a>
          ) : null}
          <span>Delivery Location</span>
          <strong>{purchaseOrder.deliveryLocationName || `${organization.name} Warehouse`}</strong>
          {purchaseOrder.deliveryAddress ? <p>{purchaseOrder.deliveryAddress}</p> : null}
        </div>
      </section>

      <section className="commercial-document-items">
        <h3>Purchase Items</h3>
        <table className="purchase-order-preview-items" aria-label="Purchase order items">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {meaningfulLines.length === 0 ? (
              <tr>
                <td colSpan={4}>Add products to complete this purchase order.</td>
              </tr>
            ) : (
              meaningfulLines.map((line) => {
                const lineTotals = purchaseOrderLineTotals(line);
                return (
                  <tr key={line.id}>
                    <td data-label="Product">{line.description}</td>
                    <td data-label="Quantity">{formatQuantity(toNumber(line.quantity))}</td>
                    <td data-label="Unit price">{formatWholeNumber(toNumber(line.unitPrice))}</td>
                    <td data-label="Total">{formatWholeNumber(lineTotals.total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="commercial-document-totals">
        <div>
          <span>Subtotal ({organization.currencyCode})</span>
          <strong>{formatWholeNumber(totals.subtotal)}</strong>
        </div>
        <div>
          <span>VAT</span>
          <strong>{formatWholeNumber(totals.tax)}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{formatWholeNumber(totals.deliveryFee)}</strong>
        </div>
        <div className="commercial-total-due">
          <span>Grand Total ({organization.currencyCode})</span>
          <strong>{formatWholeNumber(totals.total)}</strong>
        </div>
      </section>

      <section className="commercial-document-notes purchase-order-terms">
        <h3>Terms & Delivery Notes</h3>
        <p>
          {purchaseOrder.terms ||
            'Delivery should match the quantities, pricing, and product specifications listed in this purchase order.'}
        </p>
      </section>
    </article>
  );
}

function createPurchaseOrderDocument(
  organization: Organization,
  branches: Branch[],
  purchaseOrderNumber: string,
): PurchaseOrderDocument {
  const now = new Date().toISOString();
  const today = todayInputValue();
  const locationName = branches.find((branch) => branch.status === 'ACTIVE')?.name;

  return {
    id: createCommercialId(),
    purchaseOrderNumber,
    status: 'DRAFT',
    supplierId: '',
    supplierName: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierAddress: '',
    issueDate: today,
    deliveryDate: addDaysInputValue(today, 7),
    deliveryLocationName: locationName
      ? `${locationName} Warehouse`
      : `${organization.name} Warehouse`,
    deliveryAddress: '',
    orderedByName: organization.name,
    orderedByEmail: defaultProcurementEmail(organization),
    summary: `Authorised purchase order for goods and services, issued by ${organization.name}.`,
    deliveryFee: '0',
    terms: 'Please confirm availability, delivery date, and final invoice details before dispatch.',
    whatsappMessage: defaultPurchaseOrderWhatsAppMessage(purchaseOrderNumber, organization),
    notes: '',
    lines: [createPurchaseOrderLine()],
    createdAt: now,
    updatedAt: now,
  };
}

function createPurchaseOrderLine(): PurchaseOrderLine {
  return {
    id: createCommercialId(),
    productId: '',
    description: '',
    sku: '',
    quantity: '1',
    unitPrice: '0',
    taxRate: '16',
  };
}

function createPurchaseOrderLineFromProduct(product: Product): PurchaseOrderLine {
  return {
    ...createPurchaseOrderLine(),
    productId: product.id,
    description: product.name,
    sku: product.sku ?? '',
    unitPrice: String(product.costPrice ?? product.unitPrice ?? 0),
    taxRate: product.vatCategory === 'A' ? '16' : '0',
  };
}

function isBlankPurchaseOrderLine(line: PurchaseOrderLine) {
  return !line.productId && !line.description.trim();
}

function addProductToPurchaseOrderLines(lines: PurchaseOrderLine[], nextLine: PurchaseOrderLine) {
  const blankLineIndex = lines.findIndex(isBlankPurchaseOrderLine);
  if (blankLineIndex < 0) {
    return [...lines, nextLine];
  }

  return lines.map((line, index) =>
    index === blankLineIndex ? { ...nextLine, id: line.id } : line,
  );
}

function purchaseOrderStatusOptions() {
  return ['DRAFT', 'SENT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
}

function nextPurchaseOrderNumber(purchaseOrders: PurchaseOrderDocument[]) {
  const maxNumber = purchaseOrders.reduce((highest, purchaseOrder) => {
    const [, suffix] = purchaseOrder.purchaseOrderNumber.split('-');
    const numericSuffix = Number(suffix);
    return Number.isFinite(numericSuffix) ? Math.max(highest, numericSuffix) : highest;
  }, 0);

  return `PO-${String(maxNumber + 1).padStart(4, '0')}`;
}

function purchaseOrderLineTotals(line: PurchaseOrderLine) {
  const quantity = Math.max(0, toNumber(line.quantity));
  const unitPrice = Math.max(0, toNumber(line.unitPrice));
  const subtotal = quantity * unitPrice;
  const taxRate = clampCommercialPercent(toNumber(line.taxRate));
  const tax = subtotal * (taxRate / 100);

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

function purchaseOrderTotals(purchaseOrder: PurchaseOrderDocument) {
  const lineTotals = purchaseOrder.lines.map(purchaseOrderLineTotals);
  const subtotal = lineTotals.reduce((total, line) => total + line.subtotal, 0);
  const tax = lineTotals.reduce((total, line) => total + line.tax, 0);
  const deliveryFee = Math.max(0, toNumber(purchaseOrder.deliveryFee));

  return {
    deliveryFee,
    subtotal,
    tax,
    total: subtotal + tax + deliveryFee,
  };
}

function procurementMetricsFromPurchaseOrders(
  purchaseOrders: PurchaseOrderDocument[],
  draft: PurchaseOrderDocument,
  currencyCode: string,
) {
  const approvedCount = purchaseOrders.filter((order) =>
    ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status),
  ).length;
  const receivedCount = purchaseOrders.filter((order) =>
    ['PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status),
  ).length;
  const totalValue = purchaseOrders.reduce(
    (total, order) => total + purchaseOrderTotals(order).total,
    0,
  );

  return [
    {
      label: 'Purchase Orders',
      value: String(purchaseOrders.length),
    },
    {
      label: 'Active Orders',
      value: String(approvedCount),
    },
    {
      label: 'Spend To Date',
      value: formatMoney(totalValue, currencyCode),
    },
    {
      label: 'Received',
      value: String(receivedCount),
    },
  ];
}

function validatePurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
  if (!purchaseOrder.purchaseOrderNumber.trim()) {
    return 'Enter a purchase order number before saving or sharing.';
  }
  if (!purchaseOrder.supplierName.trim()) {
    return 'Select or enter a supplier before saving or sharing.';
  }
  if (
    !purchaseOrder.lines.some(
      (line) => line.description.trim() && purchaseOrderLineTotals(line).total > 0,
    )
  ) {
    return 'Add at least one product line with a quantity and price.';
  }
  return '';
}

function normalizePurchaseOrder(purchaseOrder: PurchaseOrderDocument): PurchaseOrderDocument {
  const now = new Date().toISOString();
  const meaningfulLines = purchaseOrder.lines
    .filter((line) => line.description.trim())
    .map((line) => ({
      ...line,
      description: line.description.trim(),
      sku: line.sku.trim(),
      quantity: String(Math.max(0, toNumber(line.quantity))),
      unitPrice: String(Math.max(0, toNumber(line.unitPrice))),
      taxRate: String(clampCommercialPercent(toNumber(line.taxRate))),
    }));

  return {
    ...purchaseOrder,
    purchaseOrderNumber: purchaseOrder.purchaseOrderNumber.trim(),
    supplierId: purchaseOrder.supplierId.trim(),
    supplierName: purchaseOrder.supplierName.trim(),
    supplierEmail: purchaseOrder.supplierEmail.trim(),
    supplierPhone: purchaseOrder.supplierPhone.trim(),
    supplierAddress: purchaseOrder.supplierAddress.trim(),
    deliveryLocationName: purchaseOrder.deliveryLocationName.trim(),
    deliveryAddress: purchaseOrder.deliveryAddress.trim(),
    orderedByName: purchaseOrder.orderedByName.trim(),
    orderedByEmail: purchaseOrder.orderedByEmail.trim(),
    summary: purchaseOrder.summary.trim(),
    deliveryFee: String(Math.max(0, toNumber(purchaseOrder.deliveryFee))),
    terms: purchaseOrder.terms.trim(),
    whatsappMessage: purchaseOrder.whatsappMessage.trim(),
    notes: purchaseOrder.notes.trim(),
    lines: meaningfulLines.length > 0 ? meaningfulLines : [createPurchaseOrderLine()],
    updatedAt: now,
    createdAt: purchaseOrder.createdAt || now,
  };
}

function loadPurchaseOrders() {
  try {
    const rawPurchaseOrders = window.localStorage.getItem(PROCUREMENT_PURCHASE_ORDERS_STORAGE_KEY);
    if (!rawPurchaseOrders) {
      return [];
    }
    const parsedPurchaseOrders = JSON.parse(rawPurchaseOrders);
    if (!Array.isArray(parsedPurchaseOrders)) {
      return [];
    }
    return parsedPurchaseOrders
      .map((purchaseOrder) => coercePurchaseOrder(purchaseOrder))
      .filter((purchaseOrder): purchaseOrder is PurchaseOrderDocument => Boolean(purchaseOrder));
  } catch {
    return [];
  }
}

function savePurchaseOrders(purchaseOrders: PurchaseOrderDocument[]) {
  try {
    window.localStorage.setItem(
      PROCUREMENT_PURCHASE_ORDERS_STORAGE_KEY,
      JSON.stringify(purchaseOrders),
    );
  } catch {
    // Local persistence is best-effort when storage is unavailable.
  }
}

function coercePurchaseOrder(value: unknown): PurchaseOrderDocument | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<PurchaseOrderDocument>;
  const now = new Date().toISOString();
  const purchaseOrderNumber =
    typeof raw.purchaseOrderNumber === 'string' && raw.purchaseOrderNumber.trim()
      ? raw.purchaseOrderNumber
      : 'PO-0001';

  return {
    id: typeof raw.id === 'string' ? raw.id : createCommercialId(),
    purchaseOrderNumber,
    status: stringValue(raw.status) || 'DRAFT',
    supplierId: stringValue(raw.supplierId),
    supplierName: stringValue(raw.supplierName),
    supplierEmail: stringValue(raw.supplierEmail),
    supplierPhone: stringValue(raw.supplierPhone),
    supplierAddress: stringValue(raw.supplierAddress),
    issueDate: stringValue(raw.issueDate) || todayInputValue(),
    deliveryDate: stringValue(raw.deliveryDate) || addDaysInputValue(todayInputValue(), 7),
    deliveryLocationName: stringValue(raw.deliveryLocationName),
    deliveryAddress: stringValue(raw.deliveryAddress),
    orderedByName: stringValue(raw.orderedByName),
    orderedByEmail: stringValue(raw.orderedByEmail),
    summary: stringValue(raw.summary),
    deliveryFee: stringValue(raw.deliveryFee) || '0',
    terms: stringValue(raw.terms),
    whatsappMessage:
      stringValue(raw.whatsappMessage) || defaultPurchaseOrderWhatsAppMessage(purchaseOrderNumber),
    notes: stringValue(raw.notes),
    lines:
      Array.isArray(raw.lines) && raw.lines.length > 0
        ? raw.lines.map(coercePurchaseOrderLine)
        : [createPurchaseOrderLine()],
    createdAt: stringValue(raw.createdAt) || now,
    updatedAt: stringValue(raw.updatedAt) || now,
  };
}

function coercePurchaseOrderLine(value: unknown): PurchaseOrderLine {
  if (!value || typeof value !== 'object') {
    return createPurchaseOrderLine();
  }

  const raw = value as Partial<PurchaseOrderLine>;
  return {
    id: typeof raw.id === 'string' ? raw.id : createCommercialId(),
    productId: stringValue(raw.productId),
    description: stringValue(raw.description),
    sku: stringValue(raw.sku),
    quantity: stringValue(raw.quantity) || '1',
    unitPrice: stringValue(raw.unitPrice) || '0',
    taxRate: stringValue(raw.taxRate) || '0',
  };
}

function parsePurchaseOrderFromUrl(organization: Organization, branches: Branch[]) {
  try {
    const encodedPurchaseOrder = new URLSearchParams(window.location.search).get(
      PROCUREMENT_SHARE_PARAM,
    );
    if (!encodedPurchaseOrder) {
      return null;
    }
    const decodedPurchaseOrder = decodePurchaseOrder(encodedPurchaseOrder);
    if (!decodedPurchaseOrder) {
      return null;
    }
    return {
      ...createPurchaseOrderDocument(
        organization,
        branches,
        decodedPurchaseOrder.purchaseOrderNumber,
      ),
      ...decodedPurchaseOrder,
      id: createCommercialId(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function purchaseOrderShareUrl(purchaseOrder: PurchaseOrderDocument) {
  const url = new URL(window.location.href);
  url.pathname = '/procurement';
  url.search = '';
  url.searchParams.set(PROCUREMENT_SHARE_PARAM, encodePurchaseOrder(purchaseOrder));
  return url.toString();
}

function encodePurchaseOrder(purchaseOrder: PurchaseOrderDocument) {
  const json = JSON.stringify(normalizePurchaseOrder(purchaseOrder));
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodePurchaseOrder(encodedPurchaseOrder: string) {
  try {
    const padded = encodedPurchaseOrder.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsedPurchaseOrder = JSON.parse(new TextDecoder().decode(bytes));
    return coercePurchaseOrder(parsedPurchaseOrder);
  } catch {
    return null;
  }
}

function purchaseOrderEmailSubject(
  purchaseOrder: PurchaseOrderDocument,
  organization: Organization,
) {
  return `Purchase Order ${purchaseOrder.purchaseOrderNumber} from ${organization.name}`;
}

function purchaseOrderEmailMessage(
  purchaseOrder: PurchaseOrderDocument,
  organization: Organization,
) {
  const totals = purchaseOrderTotals(purchaseOrder);
  return [
    `Hello ${purchaseOrder.supplierName || 'there'},`,
    '',
    `${organization.name} has issued purchase order ${purchaseOrder.purchaseOrderNumber}.`,
    `Grand total: ${formatMoney(totals.total, organization.currencyCode)}`,
    `Delivery date: ${commercialFormatDate(purchaseOrder.deliveryDate)}`,
    '',
    'Regards,',
    purchaseOrder.orderedByName || organization.name,
  ].join('\n');
}

function purchaseOrderWhatsAppUrl(
  purchaseOrder: PurchaseOrderDocument,
  organization: Organization,
) {
  const phoneNumber = normalizeWhatsAppNumber(purchaseOrder.supplierPhone);
  const text = purchaseOrderWhatsAppText(purchaseOrder, organization);
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
}

function purchaseOrderWhatsAppText(
  purchaseOrder: PurchaseOrderDocument,
  organization: Organization,
) {
  const message = purchaseOrder.whatsappMessage.trim();
  if (message) {
    return message;
  }

  const totals = purchaseOrderTotals(purchaseOrder);
  return [
    `Hello ${purchaseOrder.supplierName || 'there'},`,
    `${organization.name} has shared purchase order ${purchaseOrder.purchaseOrderNumber}.`,
    `Grand total: ${formatMoney(totals.total, organization.currencyCode)}`,
    `Delivery date: ${commercialFormatDate(purchaseOrder.deliveryDate)}`,
    'The PDF document is attached.',
  ].join('\n');
}

function defaultProcurementEmail(organization: Organization) {
  const slug = organization.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 36);
  return `procurement@${slug || 'company'}.co.ke`;
}

function defaultPurchaseOrderWhatsAppMessage(
  purchaseOrderNumber: string,
  organization?: Pick<Organization, 'name'>,
) {
  const sender = organization?.name ?? 'our team';
  return `Hello, please review purchase order ${purchaseOrderNumber} from ${sender}.`;
}

const COMMERCIAL_DOCUMENTS_STORAGE_KEY = 'keen-commercial-documents-v1';
const COMMERCIAL_SHARE_PARAM = 'document';

type CommercialDocumentType = 'quotation' | 'invoice';

type CommercialLineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRate: string;
};

type CommercialDocument = {
  id: string;
  type: CommercialDocumentType;
  documentNumber: string;
  status: string;
  title: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  issueDate: string;
  validUntil: string;
  dueDate: string;
  paymentTerms: string;
  preparedBy: string;
  preparedEmail: string;
  senderAddress: string;
  projectSummary: string;
  depositRate: string;
  amountPaid: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  swiftCode: string;
  mpesaPaybill: string;
  mpesaAccountNumber: string;
  mpesaAccountName: string;
  whatsappMessage: string;
  notes: string;
  lines: CommercialLineItem[];
  createdAt: string;
  updatedAt: string;
};

function CommercialPage({ organization }: { organization: Organization }) {
  const summaryQuery = useQuery({
    queryKey: ['commercial-summary'],
    queryFn: getCommercialSummary,
  });
  const [documents, setDocuments] = useState<CommercialDocument[]>(() => loadCommercialDocuments());
  const [initialSharedDocument] = useState<CommercialDocument | null>(() =>
    parseCommercialDocumentFromUrl(organization),
  );
  const [draft, setDraft] = useState<CommercialDocument>(
    () =>
      initialSharedDocument ??
      createCommercialDocument(
        organization,
        'invoice',
        nextCommercialDocumentNumber(documents, 'invoice'),
      ),
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    initialSharedDocument?.id ?? null,
  );
  const [message, setMessage] = useState(initialSharedDocument ? 'Shared document loaded.' : '');
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const previewPanel = useRef<HTMLElement>(null);
  const commercialFormId = useId();

  useEffect(() => {
    if (!showMobilePreview) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [
        ...(previewPanel.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ) ?? []),
      ].filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowMobilePreview(false);
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      if (!targets.length) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [showMobilePreview]);

  useEffect(() => {
    saveCommercialDocuments(documents);
  }, [documents]);

  const title = summaryQuery.data?.title ?? 'Invoicing';
  const description =
    summaryQuery.data?.description ??
    'Generate and share invoice documents with customers and save printable PDF copies.';
  const draftTotals = commercialDocumentTotals(draft);
  const metrics = commercialMetricsFromDocuments(documents, draft, organization.currencyCode);
  const savedDocument = documents.find((document) => document.id === selectedDocumentId);
  const recentWorkItems = summaryQuery.data?.workItems ?? [];

  function updateDraftField<K extends keyof CommercialDocument>(
    field: K,
    value: CommercialDocument[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value, updatedAt: new Date().toISOString() }));
    setError('');
  }

  function handleDocumentTypeChange() {
    setDraft((current) => {
      if (current.type === 'invoice') {
        return current;
      }

      return {
        ...current,
        type: 'invoice',
        documentNumber: nextCommercialDocumentNumber(documents, 'invoice'),
        status: 'UNPAID',
        title: 'Customer Invoice',
        dueDate: addDaysInputValue(todayInputValue(), 14),
        validUntil: addDaysInputValue(todayInputValue(), 30),
        updatedAt: new Date().toISOString(),
      };
    });
    setSelectedDocumentId(null);
    setShareLink('');
    setError('');
  }

  function startCommercialDocument() {
    const nextDocument = createCommercialDocument(
      organization,
      'invoice',
      nextCommercialDocumentNumber(documents, 'invoice'),
    );
    setDraft(nextDocument);
    setSelectedDocumentId(null);
    setShareLink('');
    setError('');
    setMessage('New invoice draft started.');
  }

  function updateLineItem<K extends keyof CommercialLineItem>(
    lineId: string,
    field: K,
    value: CommercialLineItem[K],
  ) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, [field]: value } : line)),
      updatedAt: new Date().toISOString(),
    }));
    setError('');
  }

  function addLineItem() {
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, createCommercialLineItem()],
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeLineItem(lineId: string) {
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? [createCommercialLineItem()]
          : current.lines.filter((line) => line.id !== lineId),
      updatedAt: new Date().toISOString(),
    }));
  }

  function saveDocument() {
    const validationError = validateCommercialDocument(draft);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const normalizedDocument = normalizeCommercialDocument(draft);
    setDocuments((current) => [
      normalizedDocument,
      ...current.filter((document) => document.id !== normalizedDocument.id),
    ]);
    setDraft(normalizedDocument);
    setSelectedDocumentId(normalizedDocument.id);
    setShareLink('');
    setError('');
    setMessage(
      `${commercialDocumentLabel(normalizedDocument.type)} ${normalizedDocument.documentNumber} saved.`,
    );
  }

  function loadDocument(document: CommercialDocument) {
    setDraft(document);
    setSelectedDocumentId(document.id);
    setShareLink('');
    setError('');
    setMessage(`${commercialDocumentLabel(document.type)} ${document.documentNumber} loaded.`);
  }

  async function shareDocument(document: CommercialDocument) {
    const validationError = validateCommercialDocument(document);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const link = commercialDocumentShareUrl(normalizeCommercialDocument(document));
    setShareLink(link);
    try {
      await copyTextToClipboard(link);
      setMessage('Share link copied to clipboard.');
      setError('');
    } catch {
      setMessage('Share link generated. Copy it from the link field.');
      setError('');
    }
  }

  async function emailDocument(document: CommercialDocument) {
    const normalizedDocument = normalizeCommercialDocument(document);
    const validationError = validateCommercialDocument(normalizedDocument);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }
    if (!normalizedDocument.customerEmail.trim()) {
      setError('Enter a customer email before sending this invoice.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('Sending invoice PDF by email...');
    try {
      const pdfFile = createCommercialDocumentPdfFile(normalizedDocument, organization);
      await sendDocumentEmail({
        to: normalizedDocument.customerEmail.trim(),
        from: normalizedDocument.preparedEmail.trim() || undefined,
        subject: commercialDocumentEmailSubject(normalizedDocument, organization),
        message: commercialDocumentEmailMessage(normalizedDocument, organization),
        attachmentFileName: pdfFile.name,
        attachmentContentBase64: await blobToBase64(pdfFile),
      });
      setMessage(
        `${commercialDocumentLabel(normalizedDocument.type)} ${normalizedDocument.documentNumber} emailed as PDF.`,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to email document');
      setMessage('');
    }
  }

  async function whatsappDocument(document: CommercialDocument) {
    const normalizedDocument = normalizeCommercialDocument(document);
    const validationError = validateCommercialDocument(normalizedDocument);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const phoneNumber = normalizeWhatsAppNumber(normalizedDocument.customerPhone);
    if (!phoneNumber) {
      setError('Enter a WhatsApp number before sending this document.');
      setMessage('');
      return;
    }

    setError('');
    setMessage('Preparing invoice PDF for WhatsApp.');
    const pdfFile = createCommercialDocumentPdfFile(normalizedDocument, organization);
    const shared = await sharePdfFile(
      pdfFile,
      commercialDocumentWhatsAppText(normalizedDocument, organization),
      `${commercialDocumentLabel(normalizedDocument.type)} ${normalizedDocument.documentNumber}`,
    );
    if (shared) {
      setMessage('Invoice PDF opened in your share sheet.');
      return;
    }

    downloadBlob(pdfFile.name, pdfFile);
    setMessage('PDF downloaded. Attach it in the WhatsApp chat that opens.');
    window.open(
      commercialDocumentWhatsAppUrl(normalizedDocument, organization),
      '_blank',
      'noopener,noreferrer',
    );
  }

  function printDocument(document: CommercialDocument) {
    setDraft(document);
    setSelectedDocumentId(document.id);
    setShareLink('');
    window.setTimeout(() => window.print(), 80);
  }

  return (
    <section className="table-workspace commercial-workspace">
      <PageHeader
        title={title}
        subtitle={description}
        action={
          <div className="header-actions">
            <button
              className="primary-action compact-action"
              type="button"
              onClick={startCommercialDocument}
            >
              <i className="bi bi-receipt-cutoff" aria-hidden="true" />
              New Invoice
            </button>
          </div>
        }
      />

      <FormMessages error={error} message={message} />

      <div className="branch-summary-row commercial-summary-row">
        {metrics.map((metric, index) => (
          <SummaryMetric
            icon={moduleMetricIcon(index, 'bi-receipt-cutoff')}
            key={metric.label}
            label={metric.label}
            tone={moduleMetricTone(index)}
            value={metric.value}
          />
        ))}
      </div>

      <div className="commercial-layout">
        <section className="panel-card commercial-builder-panel">
          <PanelHeader
            icon="bi-pencil-square"
            title="Document Builder"
            tone="blue"
            action={
              <button
                className="secondary-action compact-action commercial-preview-toggle"
                type="button"
                onClick={() => setShowMobilePreview(true)}
              >
                <i className="bi bi-eye" aria-hidden="true" />
                Preview
              </button>
            }
          />
          <form
            className="record-form commercial-form"
            id={commercialFormId}
            onSubmit={(event) => {
              event.preventDefault();
              saveDocument();
            }}
          >
            <div
              className="commercial-type-toggle wide-field"
              role="group"
              aria-label="Document type"
            >
              <button
                className={draft.type === 'invoice' ? 'active' : ''}
                type="button"
                onClick={handleDocumentTypeChange}
              >
                <i className="bi bi-receipt-cutoff" aria-hidden="true" />
                Invoice
              </button>
            </div>

            <label className="field-stack wide-field">
              <span>Customer Name</span>
              <input
                required
                maxLength={90}
                value={draft.customerName}
                onChange={(event) => updateDraftField('customerName', event.target.value)}
              />
            </label>
            <div className="commercial-lines-editor wide-field">
              <div className="commercial-section-heading">
                <h3>Line Items</h3>
                <button className="text-button" type="button" onClick={addLineItem}>
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  Add Line
                </button>
              </div>
              <div className="commercial-line-grid">
                {draft.lines.map((line, index) => {
                  const lineTotals = commercialLineTotals(line);
                  const lineNumber = index + 1;
                  return (
                    <div className="commercial-line-row" key={line.id}>
                      <div className="commercial-line-row-header">
                        <span>Line {lineNumber}</span>
                        <button
                          className="icon-button compact-icon"
                          type="button"
                          aria-label={`Remove line item ${lineNumber}`}
                          onClick={() => removeLineItem(line.id)}
                        >
                          <i className="bi bi-trash" aria-hidden="true" />
                        </button>
                      </div>
                      <label className="field-stack commercial-line-description">
                        <span>Description</span>
                        <input
                          maxLength={120}
                          value={line.description}
                          onChange={(event) =>
                            updateLineItem(line.id, 'description', event.target.value)
                          }
                        />
                      </label>
                      <label className="field-stack commercial-line-qty">
                        <span>Qty</span>
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLineItem(line.id, 'quantity', event.target.value)
                          }
                        />
                      </label>
                      <label className="field-stack commercial-line-rate">
                        <span>Rate</span>
                        <input
                          min="0"
                          step="0.01"
                          type="number"
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLineItem(line.id, 'unitPrice', event.target.value)
                          }
                        />
                      </label>
                      <CommercialFormSection
                        title="Discount & tax"
                        summary={`${line.discountRate || '0'}% discount · ${line.taxRate || '0'}% tax`}
                      >
                        <label className="field-stack commercial-line-discount">
                          <span>Disc. %</span>
                          <input
                            min="0"
                            max="100"
                            step="0.01"
                            type="number"
                            value={line.discountRate}
                            onChange={(event) =>
                              updateLineItem(line.id, 'discountRate', event.target.value)
                            }
                          />
                        </label>
                        <label className="field-stack commercial-line-tax">
                          <span>Tax %</span>
                          <input
                            min="0"
                            max="100"
                            step="0.01"
                            type="number"
                            value={line.taxRate}
                            onChange={(event) =>
                              updateLineItem(line.id, 'taxRate', event.target.value)
                            }
                          />
                        </label>
                      </CommercialFormSection>
                      <div className="commercial-line-total">
                        <span>Total</span>
                        <strong>{formatMoney(lineTotals.total, organization.currencyCode)}</strong>
                      </div>
                      <button
                        className="icon-button compact-icon commercial-line-delete-button"
                        type="button"
                        aria-label="Remove line item"
                        onClick={() => removeLineItem(line.id)}
                      >
                        <i className="bi bi-trash" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <CommercialFormSection
              title="Invoice details"
              summary={`${draft.documentNumber} · ${labelizeEnum(draft.status)}`}
            >
              <label className="field-stack">
                <span>Document No.</span>
                <input
                  required
                  maxLength={24}
                  value={draft.documentNumber}
                  onChange={(event) => updateDraftField('documentNumber', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateDraftField('status', event.target.value)}
                >
                  {commercialStatusOptions(draft.type).map((status) => (
                    <option key={status} value={status}>
                      {labelizeEnum(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack wide-field">
                <span>Title</span>
                <input
                  required
                  maxLength={90}
                  value={draft.title}
                  onChange={(event) => updateDraftField('title', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Summary</span>
                <textarea
                  maxLength={240}
                  value={draft.projectSummary}
                  onChange={(event) => updateDraftField('projectSummary', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Issue Date</span>
                <input
                  required
                  type="date"
                  value={draft.issueDate}
                  onChange={(event) => updateDraftField('issueDate', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>{draft.type === 'quotation' ? 'Valid Until' : 'Due Date'}</span>
                <input
                  required
                  type="date"
                  value={draft.type === 'quotation' ? draft.validUntil : draft.dueDate}
                  onChange={(event) =>
                    draft.type === 'quotation'
                      ? updateDraftField('validUntil', event.target.value)
                      : updateDraftField('dueDate', event.target.value)
                  }
                />
              </label>
              <label className="field-stack">
                <span>Payment Terms</span>
                <input
                  maxLength={80}
                  value={draft.paymentTerms}
                  onChange={(event) => updateDraftField('paymentTerms', event.target.value)}
                />
              </label>
            </CommercialFormSection>

            <CommercialFormSection
              title="Customer contact"
              summary="Company, email, phone and address"
            >
              <label className="field-stack">
                <span>Company</span>
                <input
                  maxLength={90}
                  value={draft.customerCompany}
                  onChange={(event) => updateDraftField('customerCompany', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  maxLength={120}
                  value={draft.customerEmail}
                  onChange={(event) => updateDraftField('customerEmail', event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>WhatsApp Number</span>
                <input
                  inputMode="tel"
                  maxLength={32}
                  placeholder="+254..."
                  value={draft.customerPhone}
                  onChange={(event) => updateDraftField('customerPhone', event.target.value)}
                />
              </label>
              <label className="field-stack wide-field">
                <span>Customer Address</span>
                <textarea
                  maxLength={220}
                  value={draft.customerAddress}
                  onChange={(event) => updateDraftField('customerAddress', event.target.value)}
                />
              </label>
            </CommercialFormSection>

            <CommercialFormSection
              title="Payment details"
              summary="Deposit, amount paid, bank and M-Pesa"
            >
              <div className="commercial-payment-grid wide-field">
                <label className="field-stack">
                  <span>Deposit %</span>
                  <input
                    min="0"
                    max="100"
                    step="0.01"
                    type="number"
                    value={draft.depositRate}
                    onChange={(event) => updateDraftField('depositRate', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Amount Paid</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={draft.amountPaid}
                    onChange={(event) => updateDraftField('amountPaid', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Bank Name</span>
                  <input
                    maxLength={80}
                    value={draft.bankName}
                    onChange={(event) => updateDraftField('bankName', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Account Name</span>
                  <input
                    maxLength={80}
                    value={draft.bankAccountName}
                    onChange={(event) => updateDraftField('bankAccountName', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>Account Number</span>
                  <input
                    maxLength={60}
                    value={draft.bankAccountNumber}
                    onChange={(event) => updateDraftField('bankAccountNumber', event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span>M-Pesa Paybill</span>
                  <input
                    maxLength={40}
                    value={draft.mpesaPaybill}
                    onChange={(event) => updateDraftField('mpesaPaybill', event.target.value)}
                  />
                </label>
              </div>
            </CommercialFormSection>

            <CommercialFormSection
              title="Notes & messages"
              summary="Invoice notes and WhatsApp message"
            >
              <label className="field-stack wide-field">
                <span>WhatsApp Message</span>
                <textarea
                  maxLength={420}
                  value={draft.whatsappMessage}
                  onChange={(event) => updateDraftField('whatsappMessage', event.target.value)}
                />
              </label>

              <label className="field-stack wide-field">
                <span>Notes</span>
                <textarea
                  maxLength={360}
                  value={draft.notes}
                  onChange={(event) => updateDraftField('notes', event.target.value)}
                />
              </label>
            </CommercialFormSection>

            <div className="commercial-total-strip wide-field">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(draftTotals.subtotal, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>{formatMoney(draftTotals.discount, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>VAT</span>
                <strong>{formatMoney(draftTotals.tax, organization.currencyCode)}</strong>
              </div>
              <div>
                <span>{draft.type === 'invoice' ? 'Total Due' : 'Total'}</span>
                <strong>{formatMoney(draftTotals.balanceDue, organization.currencyCode)}</strong>
              </div>
            </div>

            <div className="form-actions wide-field commercial-invoice-actions">
              <div className="commercial-invoice-primary-actions">
                <div className="commercial-mobile-total">
                  <span>Total Due</span>
                  <strong>{formatMoney(draftTotals.balanceDue, organization.currencyCode)}</strong>
                </div>
                <button
                  className="secondary-action compact-action commercial-mobile-preview"
                  type="button"
                  aria-label="Preview invoice"
                  onClick={() => setShowMobilePreview(true)}
                >
                  Preview
                </button>
                <button
                  className="primary-action compact-action"
                  type="submit"
                  aria-label={`Save ${commercialDocumentLabel(draft.type)}`}
                >
                  <i className="bi bi-save" aria-hidden="true" />
                  <span className="commercial-desktop-save-label">
                    Save {commercialDocumentLabel(draft.type)}
                  </span>
                  <span className="commercial-mobile-save-label">Save</span>
                </button>
              </div>
              <CommercialFormSection title="Share & export" summary="Link, email, WhatsApp and PDF">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => shareDocument(draft)}
                >
                  <i className="bi bi-link-45deg" aria-hidden="true" />
                  Share Link
                </button>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => emailDocument(draft)}
                >
                  <i className="bi bi-envelope" aria-hidden="true" />
                  Email
                </button>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => whatsappDocument(draft)}
                >
                  <i className="bi bi-whatsapp" aria-hidden="true" />
                  WhatsApp
                </button>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => printDocument(draft)}
                >
                  <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                  Save PDF
                </button>
              </CommercialFormSection>
            </div>

            {shareLink ? (
              <label className="field-stack wide-field commercial-share-field">
                <span>Share Link</span>
                <input readOnly value={shareLink} onFocus={(event) => event.target.select()} />
              </label>
            ) : null}
          </form>
        </section>

        <section className="panel-card commercial-preview-panel">
          <PanelHeader
            icon="bi-eye"
            title="Document Preview"
            tone="purple"
            action={
              <div className="header-actions">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => whatsappDocument(draft)}
                >
                  <i className="bi bi-whatsapp" aria-hidden="true" />
                  WhatsApp
                </button>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => shareDocument(draft)}
                >
                  <i className="bi bi-link-45deg" aria-hidden="true" />
                  Link
                </button>
                <button
                  className="primary-action compact-action"
                  type="button"
                  onClick={() => printDocument(draft)}
                >
                  <i className="bi bi-printer" aria-hidden="true" />
                  Print
                </button>
              </div>
            }
          />
          <div className="commercial-document-print-root">
            <CommercialDocumentPreview document={draft} organization={organization} />
          </div>
        </section>
      </div>

      {showMobilePreview ? (
        <div
          className="commercial-preview-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowMobilePreview(false);
          }}
        >
          <section
            className="panel-card commercial-preview-modal-panel"
            ref={previewPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Document preview"
          >
            <header className="commercial-preview-modal-header">
              <button
                className="secondary-action compact-action"
                type="button"
                aria-label="Close preview"
                onClick={() => setShowMobilePreview(false)}
              >
                <i className="bi bi-arrow-left" aria-hidden="true" />
                Back to editor
              </button>
              <h2>Preview</h2>
            </header>
            <div className="commercial-document-print-root">
              <CommercialDocumentPreview document={draft} organization={organization} />
            </div>
          </section>
        </div>
      ) : null}

      <section className="panel-card commercial-documents-panel">
        <PanelHeader
          icon="bi-folder2-open"
          title="Generated Documents"
          tone="green"
          action={
            savedDocument ? (
              <span className="invoice-total-pill">Loaded {savedDocument.documentNumber}</span>
            ) : undefined
          }
        />
        {documents.length === 0 ? (
          <EmptyState
            icon="bi-file-earmark-plus"
            title="No generated documents"
            detail="Saved quotations and invoices will appear here."
          />
        ) : (
          <>
            <div className="commercial-document-card-list">
              {documents.map((document) => {
                const totals = commercialDocumentTotals(document);
                const customer = document.customerName || document.customerCompany || 'Customer';
                return (
                  <article className="commercial-document-card" key={`card-${document.id}`}>
                    <header>
                      <span className="commercial-document-card-icon">
                        <i
                          className={`bi ${
                            document.type === 'quotation'
                              ? 'bi-file-earmark-text'
                              : 'bi-receipt-cutoff'
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <strong>{document.documentNumber}</strong>
                        <small>{commercialDocumentLabel(document.type)}</small>
                      </div>
                      <StatusPill
                        label={labelizeEnum(document.status)}
                        status={moduleStatusTone(document.status)}
                      />
                    </header>
                    <dl>
                      <div>
                        <dt>Customer</dt>
                        <dd>{customer}</dd>
                      </div>
                      <div>
                        <dt>Total</dt>
                        <dd>{formatMoney(totals.balanceDue, organization.currencyCode)}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDateTime(document.updatedAt)}</dd>
                      </div>
                    </dl>
                    <div className="commercial-card-actions">
                      <button type="button" onClick={() => loadDocument(document)}>
                        <i className="bi bi-pencil" aria-hidden="true" />
                        Edit
                      </button>
                      <button type="button" onClick={() => shareDocument(document)}>
                        <i className="bi bi-link-45deg" aria-hidden="true" />
                        Link
                      </button>
                      <button type="button" onClick={() => emailDocument(document)}>
                        <i className="bi bi-envelope" aria-hidden="true" />
                        Email
                      </button>
                      <button type="button" onClick={() => whatsappDocument(document)}>
                        <i className="bi bi-whatsapp" aria-hidden="true" />
                        WhatsApp
                      </button>
                      <button type="button" onClick={() => printDocument(document)}>
                        <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                        PDF
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="responsive-table compact-table generated-documents-table">
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => {
                    const totals = commercialDocumentTotals(document);
                    return (
                      <tr key={document.id}>
                        <td data-label="Document">
                          <span className="table-label">
                            <i
                              className={`bi ${
                                document.type === 'quotation'
                                  ? 'bi-file-earmark-text'
                                  : 'bi-receipt-cutoff'
                              }`}
                              aria-hidden="true"
                            />
                            <span>
                              <strong>{document.documentNumber}</strong>
                              <small>{commercialDocumentLabel(document.type)}</small>
                            </span>
                          </span>
                        </td>
                        <td data-label="Customer">
                          {document.customerName || document.customerCompany || 'Customer'}
                        </td>
                        <td data-label="Status">
                          <StatusPill
                            label={labelizeEnum(document.status)}
                            status={moduleStatusTone(document.status)}
                          />
                        </td>
                        <td data-label="Total">
                          {formatMoney(totals.balanceDue, organization.currencyCode)}
                        </td>
                        <td data-label="Updated">{formatDateTime(document.updatedAt)}</td>
                        <td data-label="Actions">
                          <div className="table-actions commercial-table-actions">
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => loadDocument(document)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => shareDocument(document)}
                            >
                              <i className="bi bi-link-45deg" aria-hidden="true" />
                              Link
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => emailDocument(document)}
                            >
                              <i className="bi bi-envelope" aria-hidden="true" />
                              Email
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => whatsappDocument(document)}
                            >
                              <i className="bi bi-whatsapp" aria-hidden="true" />
                              WhatsApp
                            </button>
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => printDocument(document)}
                            >
                              <i className="bi bi-file-earmark-pdf" aria-hidden="true" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {summaryQuery.isPending ? (
        <LoadingPanel label="Loading commercial snapshot..." />
      ) : recentWorkItems.length > 0 ? (
        <section className="panel-card">
          <PanelHeader icon="bi-clock-history" title="System Recent Work" tone="blue" />
          <ModuleWorkItemsTable organization={organization} workItems={recentWorkItems} />
        </section>
      ) : null}
    </section>
  );
}

function CommercialDocumentPreview({
  document,
  organization,
}: {
  document: CommercialDocument;
  organization: Organization;
}) {
  const totals = commercialDocumentTotals(document);
  const meaningfulLines = document.lines.filter((line) => line.description.trim());
  const documentLabel = commercialDocumentLabel(document.type);
  const isInvoice = document.type === 'invoice';

  return (
    <article className="commercial-document-preview">
      <header className="commercial-document-heading">
        <span>Documents</span>
        <h2>
          {documentLabel} {document.documentNumber || commercialDocumentPrefix(document.type)}
        </h2>
        <p>
          {isInvoice ? 'Sales Invoice' : `${labelizeEnum(document.status)} - Service Quotation`}
        </p>
      </header>

      <div className="commercial-document-brandbar">
        <div className="commercial-document-brand">
          <strong>{organization.name}</strong>
          <span>
            {organization.taxRegistrationNumber
              ? `PIN ${organization.taxRegistrationNumber}`
              : 'Commercial Desk'}
          </span>
        </div>
        <div>
          <strong>{isInvoice ? 'INVOICE' : `QUOTATION (${labelizeEnum(document.status)})`}</strong>
          <span>No. {document.documentNumber}</span>
          <span>Date: {commercialFormatDate(document.issueDate)}</span>
        </div>
      </div>

      <section className="commercial-document-intro">
        <h3>{document.title || (isInvoice ? 'Customer Invoice' : 'Service Quotation')}</h3>
        <p>
          {document.projectSummary ||
            (isInvoice
              ? 'Thank you for your business. Please find below the details for services provided.'
              : `Proposed services prepared by ${organization.name}.`)}
        </p>
      </section>

      <section className="commercial-document-parties">
        <div>
          <span>{isInvoice ? 'Billed To' : 'Prepared For'}</span>
          <strong>{document.customerName || 'Customer name'}</strong>
          {document.customerCompany ? <p>{document.customerCompany}</p> : null}
          {document.customerAddress ? <p>{document.customerAddress}</p> : null}
          {isInvoice ? (
            <>
              <span>Due Date</span>
              <strong>{commercialFormatDate(document.dueDate)}</strong>
            </>
          ) : (
            <>
              <span>Valid Until</span>
              <strong>{commercialFormatDate(document.validUntil)}</strong>
            </>
          )}
        </div>
        <div>
          <span>{isInvoice ? 'Issued By' : 'Prepared By'}</span>
          <strong>{document.preparedBy || organization.name}</strong>
          {document.senderAddress ? <p>{document.senderAddress}</p> : null}
          {document.preparedEmail ? (
            <a href={`mailto:${document.preparedEmail}`}>{document.preparedEmail}</a>
          ) : null}
          <span>Payment Terms</span>
          <strong>{document.paymentTerms || (isInvoice ? 'Due on receipt' : 'As agreed')}</strong>
        </div>
      </section>

      <section className="commercial-document-items">
        <h3>{isInvoice ? 'Invoice Items' : 'Pricing Summary'}</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate ({organization.currencyCode})</th>
              <th>Disc.</th>
              <th>Tax</th>
              <th>Amount ({organization.currencyCode})</th>
            </tr>
          </thead>
          <tbody>
            {meaningfulLines.length === 0 ? (
              <tr>
                <td colSpan={6}>Add line items to complete this document.</td>
              </tr>
            ) : (
              meaningfulLines.map((line) => {
                const lineTotals = commercialLineTotals(line);
                return (
                  <tr key={line.id}>
                    <td>{line.description}</td>
                    <td>{formatQuantity(toNumber(line.quantity))}</td>
                    <td>{formatWholeNumber(toNumber(line.unitPrice))}</td>
                    <td>{commercialPercentLabel(line.discountRate)}</td>
                    <td>{commercialPercentLabel(line.taxRate)}</td>
                    <td>{formatWholeNumber(lineTotals.total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <section className="commercial-document-totals">
        {isInvoice ? (
          <>
            <div>
              <span>Subtotal ({organization.currencyCode})</span>
              <strong>{formatWholeNumber(totals.subtotalAfterDiscount)}</strong>
            </div>
            <div>
              <span>VAT</span>
              <strong>{formatWholeNumber(totals.tax)}</strong>
            </div>
            <div>
              <span>Amount Paid</span>
              <strong>{formatWholeNumber(totals.amountPaid)}</strong>
            </div>
            <div className="commercial-total-due">
              <span>Total Due ({organization.currencyCode})</span>
              <strong>{formatWholeNumber(totals.balanceDue)}</strong>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>{formatWholeNumber(totals.depositRate)}% deposit to start</span>
              <strong>{formatMoney(totals.depositAmount, organization.currencyCode)}</strong>
            </div>
            <div>
              <span>{formatWholeNumber(100 - totals.depositRate)}% balance on completion</span>
              <strong>{formatMoney(totals.balanceAfterDeposit, organization.currencyCode)}</strong>
            </div>
            <div className="commercial-total-due">
              <span>Total</span>
              <strong>{formatMoney(totals.total, organization.currencyCode)}</strong>
            </div>
          </>
        )}
      </section>

      <section className="commercial-document-payment">
        <h3>Payment Information</h3>
        <div>
          <div>
            <strong>Bank Transfer</strong>
            <dl>
              <dt>Bank Name</dt>
              <dd>{document.bankName || 'Bank name'}</dd>
              <dt>Account Name</dt>
              <dd>{document.bankAccountName || organization.name}</dd>
              <dt>Account Number</dt>
              <dd>{document.bankAccountNumber || 'Account number'}</dd>
              <dt>Branch</dt>
              <dd>{document.bankBranch || 'Branch'}</dd>
              <dt>Swift Code</dt>
              <dd>{document.swiftCode || 'Swift code'}</dd>
            </dl>
          </div>
          <div>
            <strong>Mobile Money (M-Pesa)</strong>
            <dl>
              <dt>Paybill Number</dt>
              <dd>{document.mpesaPaybill || 'Paybill'}</dd>
              <dt>Account Number</dt>
              <dd>{document.mpesaAccountNumber || document.documentNumber}</dd>
              <dt>Account Name</dt>
              <dd>{document.mpesaAccountName || organization.name}</dd>
            </dl>
          </div>
        </div>
      </section>

      {document.notes ? (
        <section className="commercial-document-notes">
          <h3>Notes</h3>
          <p>{document.notes}</p>
        </section>
      ) : null}
    </article>
  );
}

function createCommercialDocument(
  organization: Organization,
  type: CommercialDocumentType,
  documentNumber: string,
): CommercialDocument {
  const now = new Date().toISOString();
  const today = todayInputValue();
  const defaultEmail = defaultCommercialEmail(organization);

  return {
    id: createCommercialId(),
    type,
    documentNumber,
    status: type === 'quotation' ? 'DRAFT' : 'UNPAID',
    title: type === 'quotation' ? 'Service Quotation' : 'Customer Invoice',
    customerName: '',
    customerCompany: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    issueDate: today,
    validUntil: addDaysInputValue(today, 30),
    dueDate: addDaysInputValue(today, 14),
    paymentTerms: type === 'quotation' ? '20% deposit, balance on completion' : 'Net 14 Days',
    preparedBy: organization.name,
    preparedEmail: defaultEmail,
    senderAddress: 'Nairobi, Kenya',
    projectSummary:
      type === 'quotation'
        ? `Proposed services prepared by ${organization.name}.`
        : 'Thank you for your business. Please find below the details for services provided.',
    depositRate: type === 'quotation' ? '20' : '0',
    amountPaid: '0',
    bankName: '',
    bankAccountName: organization.name,
    bankAccountNumber: '',
    bankBranch: '',
    swiftCode: '',
    mpesaPaybill: '',
    mpesaAccountNumber: documentNumber,
    mpesaAccountName: organization.name,
    whatsappMessage: defaultCommercialWhatsAppMessage(type, documentNumber, organization),
    notes: '',
    lines: [
      {
        ...createCommercialLineItem(),
        description: type === 'quotation' ? 'Consultation and assessment' : 'Product or service',
        quantity: '1',
        unitPrice: '0',
        taxRate: organization.defaultProductVatCategory === 'A' ? '16' : '0',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function createCommercialLineItem(): CommercialLineItem {
  return {
    id: createCommercialId(),
    description: '',
    quantity: '1',
    unitPrice: '0',
    discountRate: '0',
    taxRate: '16',
  };
}

function createCommercialId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `commercial-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function commercialDocumentLabel(type: CommercialDocumentType) {
  return type === 'quotation' ? 'Quotation' : 'Invoice';
}

function commercialDocumentPrefix(type: CommercialDocumentType) {
  return type === 'quotation' ? 'QT' : 'INV';
}

function commercialStatusOptions(type: CommercialDocumentType) {
  return type === 'quotation'
    ? ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']
    : ['UNPAID', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'];
}

function nextCommercialDocumentNumber(
  documents: CommercialDocument[],
  type: CommercialDocumentType,
) {
  const prefix = commercialDocumentPrefix(type);
  const maxNumber = documents.reduce((highest, document) => {
    if (document.type !== type) {
      return highest;
    }
    const [, suffix] = document.documentNumber.split('-');
    const numericSuffix = Number(suffix);
    return Number.isFinite(numericSuffix) ? Math.max(highest, numericSuffix) : highest;
  }, 0);

  return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
}

function commercialLineTotals(line: CommercialLineItem) {
  const quantity = Math.max(0, toNumber(line.quantity));
  const unitPrice = Math.max(0, toNumber(line.unitPrice));
  const subtotal = quantity * unitPrice;
  const discountRate = clampCommercialPercent(toNumber(line.discountRate));
  const taxRate = clampCommercialPercent(toNumber(line.taxRate));
  const discount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax;

  return {
    discount,
    subtotal,
    taxableAmount,
    tax,
    total,
  };
}

function commercialDocumentTotals(document: CommercialDocument) {
  const lineTotals = document.lines.map(commercialLineTotals);
  const subtotal = lineTotals.reduce((total, line) => total + line.subtotal, 0);
  const discount = lineTotals.reduce((total, line) => total + line.discount, 0);
  const subtotalAfterDiscount = lineTotals.reduce((total, line) => total + line.taxableAmount, 0);
  const tax = lineTotals.reduce((total, line) => total + line.tax, 0);
  const total = lineTotals.reduce((totalValue, line) => totalValue + line.total, 0);
  const amountPaid = Math.min(Math.max(0, toNumber(document.amountPaid)), total);
  const balanceDue = Math.max(0, total - amountPaid);
  const depositRate = clampCommercialPercent(toNumber(document.depositRate));
  const depositAmount = total * (depositRate / 100);

  return {
    amountPaid,
    balanceAfterDeposit: Math.max(0, total - depositAmount),
    balanceDue,
    depositAmount,
    depositRate,
    discount,
    subtotal,
    subtotalAfterDiscount,
    tax,
    total,
  };
}

function commercialMetricsFromDocuments(
  documents: CommercialDocument[],
  draft: CommercialDocument,
  currencyCode: string,
) {
  const pipelineValue = documents.reduce(
    (total, document) => total + commercialDocumentTotals(document).balanceDue,
    0,
  );
  const quotationCount = documents.filter((document) => document.type === 'quotation').length;
  const invoiceCount = documents.filter((document) => document.type === 'invoice').length;

  return [
    {
      label: 'Generated Docs',
      value: String(documents.length),
    },
    {
      label: 'Quotations',
      value: String(quotationCount),
    },
    {
      label: 'Invoices',
      value: String(invoiceCount),
    },
    {
      label: 'Current Total',
      value: formatMoney(commercialDocumentTotals(draft).total || pipelineValue, currencyCode),
    },
  ];
}

function validateCommercialDocument(document: CommercialDocument) {
  if (!document.documentNumber.trim()) {
    return 'Enter a document number before saving or sharing.';
  }
  if (!document.customerName.trim() && !document.customerCompany.trim()) {
    return 'Enter a customer name or company before saving or sharing.';
  }
  if (
    !document.lines.some((line) => line.description.trim() && commercialLineTotals(line).total > 0)
  ) {
    return 'Add at least one line item with a description and amount.';
  }
  return '';
}

function normalizeCommercialDocument(document: CommercialDocument): CommercialDocument {
  const now = new Date().toISOString();
  const meaningfulLines = document.lines
    .filter((line) => line.description.trim())
    .map((line) => ({
      ...line,
      description: line.description.trim(),
      quantity: String(Math.max(0, toNumber(line.quantity))),
      unitPrice: String(Math.max(0, toNumber(line.unitPrice))),
      discountRate: String(clampCommercialPercent(toNumber(line.discountRate))),
      taxRate: String(clampCommercialPercent(toNumber(line.taxRate))),
    }));

  return {
    ...document,
    documentNumber: document.documentNumber.trim(),
    title: document.title.trim(),
    customerName: document.customerName.trim(),
    customerCompany: document.customerCompany.trim(),
    customerEmail: document.customerEmail.trim(),
    customerPhone: document.customerPhone.trim(),
    customerAddress: document.customerAddress.trim(),
    preparedBy: document.preparedBy.trim(),
    preparedEmail: document.preparedEmail.trim(),
    senderAddress: document.senderAddress.trim(),
    projectSummary: document.projectSummary.trim(),
    bankName: document.bankName.trim(),
    bankAccountName: document.bankAccountName.trim(),
    bankAccountNumber: document.bankAccountNumber.trim(),
    bankBranch: document.bankBranch.trim(),
    swiftCode: document.swiftCode.trim(),
    mpesaPaybill: document.mpesaPaybill.trim(),
    mpesaAccountNumber: (document.mpesaAccountNumber || document.documentNumber).trim(),
    mpesaAccountName: document.mpesaAccountName.trim(),
    whatsappMessage: document.whatsappMessage.trim(),
    notes: document.notes.trim(),
    depositRate: String(clampCommercialPercent(toNumber(document.depositRate))),
    amountPaid: String(Math.max(0, toNumber(document.amountPaid))),
    lines: meaningfulLines.length > 0 ? meaningfulLines : [createCommercialLineItem()],
    updatedAt: now,
    createdAt: document.createdAt || now,
  };
}

function loadCommercialDocuments() {
  try {
    const rawDocuments = window.localStorage.getItem(COMMERCIAL_DOCUMENTS_STORAGE_KEY);
    if (!rawDocuments) {
      return [];
    }
    const parsedDocuments = JSON.parse(rawDocuments);
    if (!Array.isArray(parsedDocuments)) {
      return [];
    }
    return parsedDocuments
      .map((document) => coerceCommercialDocument(document))
      .filter((document): document is CommercialDocument => Boolean(document));
  } catch {
    return [];
  }
}

function saveCommercialDocuments(documents: CommercialDocument[]) {
  try {
    window.localStorage.setItem(COMMERCIAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
  } catch {
    // Storage can be unavailable in private browsing. The in-memory state still works.
  }
}

function coerceCommercialDocument(value: unknown): CommercialDocument | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<CommercialDocument>;
  const type: CommercialDocumentType = raw.type === 'invoice' ? 'invoice' : 'quotation';
  const now = new Date().toISOString();
  const documentNumber =
    typeof raw.documentNumber === 'string' && raw.documentNumber.trim()
      ? raw.documentNumber
      : `${commercialDocumentPrefix(type)}-0001`;

  return {
    id: typeof raw.id === 'string' ? raw.id : createCommercialId(),
    type,
    documentNumber,
    status:
      typeof raw.status === 'string' && raw.status
        ? raw.status
        : type === 'quotation'
          ? 'DRAFT'
          : 'UNPAID',
    title:
      typeof raw.title === 'string' && raw.title
        ? raw.title
        : type === 'quotation'
          ? 'Service Quotation'
          : 'Customer Invoice',
    customerName: stringValue(raw.customerName),
    customerCompany: stringValue(raw.customerCompany),
    customerEmail: stringValue(raw.customerEmail),
    customerPhone: stringValue(raw.customerPhone),
    customerAddress: stringValue(raw.customerAddress),
    issueDate: stringValue(raw.issueDate) || todayInputValue(),
    validUntil: stringValue(raw.validUntil) || addDaysInputValue(todayInputValue(), 30),
    dueDate: stringValue(raw.dueDate) || addDaysInputValue(todayInputValue(), 14),
    paymentTerms: stringValue(raw.paymentTerms),
    preparedBy: stringValue(raw.preparedBy),
    preparedEmail: stringValue(raw.preparedEmail),
    senderAddress: stringValue(raw.senderAddress),
    projectSummary: stringValue(raw.projectSummary),
    depositRate: stringValue(raw.depositRate) || '0',
    amountPaid: stringValue(raw.amountPaid) || '0',
    bankName: stringValue(raw.bankName),
    bankAccountName: stringValue(raw.bankAccountName),
    bankAccountNumber: stringValue(raw.bankAccountNumber),
    bankBranch: stringValue(raw.bankBranch),
    swiftCode: stringValue(raw.swiftCode),
    mpesaPaybill: stringValue(raw.mpesaPaybill),
    mpesaAccountNumber: stringValue(raw.mpesaAccountNumber) || documentNumber,
    mpesaAccountName: stringValue(raw.mpesaAccountName),
    whatsappMessage:
      stringValue(raw.whatsappMessage) || defaultCommercialWhatsAppMessage(type, documentNumber),
    notes: stringValue(raw.notes),
    lines:
      Array.isArray(raw.lines) && raw.lines.length > 0
        ? raw.lines.map(coerceCommercialLineItem)
        : [createCommercialLineItem()],
    createdAt: stringValue(raw.createdAt) || now,
    updatedAt: stringValue(raw.updatedAt) || now,
  };
}

function coerceCommercialLineItem(value: unknown): CommercialLineItem {
  if (!value || typeof value !== 'object') {
    return createCommercialLineItem();
  }
  const raw = value as Partial<CommercialLineItem>;
  return {
    id: typeof raw.id === 'string' ? raw.id : createCommercialId(),
    description: stringValue(raw.description),
    quantity: stringValue(raw.quantity) || '1',
    unitPrice: stringValue(raw.unitPrice) || '0',
    discountRate: stringValue(raw.discountRate) || '0',
    taxRate: stringValue(raw.taxRate) || '0',
  };
}

function parseCommercialDocumentFromUrl(organization: Organization) {
  try {
    const encodedDocument = new URLSearchParams(window.location.search).get(COMMERCIAL_SHARE_PARAM);
    if (!encodedDocument) {
      return null;
    }
    const decodedDocument = decodeCommercialDocument(encodedDocument);
    if (!decodedDocument) {
      return null;
    }
    return {
      ...createCommercialDocument(
        organization,
        decodedDocument.type,
        decodedDocument.documentNumber,
      ),
      ...decodedDocument,
      id: createCommercialId(),
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function commercialDocumentShareUrl(document: CommercialDocument) {
  const url = new URL(window.location.href);
  url.pathname = '/commercial';
  url.search = '';
  url.searchParams.set(COMMERCIAL_SHARE_PARAM, encodeCommercialDocument(document));
  return url.toString();
}

function encodeCommercialDocument(document: CommercialDocument) {
  const json = JSON.stringify(normalizeCommercialDocument(document));
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeCommercialDocument(encodedDocument: string) {
  try {
    const padded = encodedDocument.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsedDocument = JSON.parse(new TextDecoder().decode(bytes));
    return coerceCommercialDocument(parsedDocument);
  } catch {
    return null;
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.top = '-999px';
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);
  if (!copied) {
    throw new Error('Clipboard copy failed');
  }
}

function createPurchaseOrderPdfFile(
  purchaseOrder: PurchaseOrderDocument,
  organization: Organization,
) {
  const totals = purchaseOrderTotals(purchaseOrder);
  const lines = [
    `${organization.name} - PURCHASE ORDER`,
    `P.O Number: ${purchaseOrder.purchaseOrderNumber}`,
    `Issue Date: ${commercialFormatDate(purchaseOrder.issueDate)}`,
    `Delivery Date: ${commercialFormatDate(purchaseOrder.deliveryDate)}`,
    '',
    `Supplier: ${purchaseOrder.supplierName || 'Supplier name'}`,
    `Supplier Email: ${purchaseOrder.supplierEmail || 'N/A'}`,
    `Supplier Phone: ${purchaseOrder.supplierPhone || 'N/A'}`,
    `Delivery Location: ${purchaseOrder.deliveryLocationName || 'N/A'}`,
    '',
    'Items',
    ...purchaseOrder.lines
      .filter((line) => line.description.trim())
      .map((line, index) => {
        const lineTotals = purchaseOrderLineTotals(line);
        return `${index + 1}. ${line.description} | Qty ${formatQuantity(
          toNumber(line.quantity),
        )} | Unit ${formatWholeNumber(toNumber(line.unitPrice))} | Total ${formatWholeNumber(
          lineTotals.total,
        )}`;
      }),
    '',
    `Subtotal: ${formatMoney(totals.subtotal, organization.currencyCode)}`,
    `VAT: ${formatMoney(totals.tax, organization.currencyCode)}`,
    `Delivery: ${formatMoney(totals.deliveryFee, organization.currencyCode)}`,
    `Grand Total: ${formatMoney(totals.total, organization.currencyCode)}`,
    '',
    `Terms: ${purchaseOrder.terms || 'N/A'}`,
  ];
  return createPdfFile(
    lines,
    safeDocumentFileName(`Purchase-Order-${purchaseOrder.purchaseOrderNumber}`),
  );
}

function createCommercialDocumentPdfFile(document: CommercialDocument, organization: Organization) {
  const totals = commercialDocumentTotals(document);
  const label = commercialDocumentLabel(document.type);
  const lines = [
    `${organization.name} - ${label.toUpperCase()}`,
    `${label} Number: ${document.documentNumber}`,
    `Issue Date: ${commercialFormatDate(document.issueDate)}`,
    `Due Date: ${commercialFormatDate(document.dueDate)}`,
    '',
    `Customer: ${document.customerName || document.customerCompany || 'Customer'}`,
    `Company: ${document.customerCompany || 'N/A'}`,
    `Email: ${document.customerEmail || 'N/A'}`,
    `Phone: ${document.customerPhone || 'N/A'}`,
    '',
    'Items',
    ...document.lines
      .filter((line) => line.description.trim())
      .map((line, index) => {
        const lineTotals = commercialLineTotals(line);
        return `${index + 1}. ${line.description} | Qty ${formatQuantity(
          toNumber(line.quantity),
        )} | Rate ${formatWholeNumber(toNumber(line.unitPrice))} | Total ${formatWholeNumber(
          lineTotals.total,
        )}`;
      }),
    '',
    `Subtotal: ${formatMoney(totals.subtotal, organization.currencyCode)}`,
    `Discount: ${formatMoney(totals.discount, organization.currencyCode)}`,
    `VAT: ${formatMoney(totals.tax, organization.currencyCode)}`,
    `Total: ${formatMoney(totals.total, organization.currencyCode)}`,
    `Paid: ${formatMoney(totals.amountPaid, organization.currencyCode)}`,
    `Balance Due: ${formatMoney(totals.balanceDue, organization.currencyCode)}`,
    '',
    `Payment Terms: ${document.paymentTerms || 'N/A'}`,
    `M-Pesa Paybill: ${document.mpesaPaybill || 'N/A'}`,
    `M-Pesa Account: ${document.mpesaAccountNumber || document.documentNumber}`,
    `Bank: ${document.bankName || 'N/A'}`,
    `Account: ${document.bankAccountNumber || 'N/A'}`,
  ];
  return createPdfFile(lines, safeDocumentFileName(`${label}-${document.documentNumber}`));
}

async function sharePdfFile(file: File, text: string, title: string) {
  const shareNavigator = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const shareData: ShareData = { files: [file], text, title };
  if (!shareNavigator.share || !shareNavigator.canShare?.(shareData)) {
    return false;
  }
  await shareNavigator.share(shareData);
  return true;
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function createPdfFile(lines: string[], baseFileName: string) {
  const pdfBlob = new Blob([buildSimplePdf(lines)], { type: 'application/pdf' });
  return new File([pdfBlob], `${baseFileName}.pdf`, { type: 'application/pdf' });
}

function buildSimplePdf(lines: string[]) {
  const pageHeight = 842;
  const marginLeft = 48;
  const marginTop = 790;
  const lineHeight = 14;
  const linesPerPage = 48;
  const pages = chunkArray(lines.map(sanitizePdfText), linesPerPage);
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('PAGES_PLACEHOLDER');

  pages.forEach((pageLines) => {
    const pageObjectNumber = objects.length + 1;
    const contentObjectNumber = pageObjectNumber + 1;
    pageObjectNumbers.push(pageObjectNumber);
    const stream = [
      'BT',
      '/F1 10 Tf',
      `${marginLeft} ${marginTop} Td`,
      ...pageLines.flatMap((line, index) => [
        index === 0 ? '' : `0 -${lineHeight} Td`,
        `(${escapePdfString(line)}) Tj`,
      ]),
      'ET',
    ]
      .filter(Boolean)
      .join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers
    .map((objectNumber) => `${objectNumber} 0 R`)
    .join(' ')}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function chunkArray<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, '-');
}

function escapePdfString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function safeDocumentFileName(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/(^-+|-+$)/g, '') || 'document';
}

function commercialDocumentEmailSubject(document: CommercialDocument, organization: Organization) {
  const label = commercialDocumentLabel(document.type);
  return `${label} ${document.documentNumber} from ${organization.name}`;
}

function commercialDocumentEmailMessage(document: CommercialDocument, organization: Organization) {
  const label = commercialDocumentLabel(document.type);
  const totals = commercialDocumentTotals(document);
  return [
    `Hello ${document.customerName || document.customerCompany || 'there'},`,
    '',
    `Please find ${label.toLowerCase()} ${document.documentNumber} from ${organization.name}.`,
    `Amount: ${formatMoney(totals.balanceDue, organization.currencyCode)}`,
    '',
    'Regards,',
    organization.name,
  ].join('\n');
}

function commercialDocumentWhatsAppUrl(document: CommercialDocument, organization: Organization) {
  const phoneNumber = normalizeWhatsAppNumber(document.customerPhone);
  const text = commercialDocumentWhatsAppText(document, organization);
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
}

function commercialDocumentWhatsAppText(document: CommercialDocument, organization: Organization) {
  const label = commercialDocumentLabel(document.type).toLowerCase();
  const totals = commercialDocumentTotals(document);
  const message = document.whatsappMessage.trim();

  if (message) {
    return message;
  }

  return [
    `Hello ${document.customerName || document.customerCompany || 'there'},`,
    `${organization.name} has shared ${label} ${document.documentNumber}.`,
    `Amount: ${formatMoney(totals.balanceDue, organization.currencyCode)}`,
    'The PDF document is attached.',
  ].join('\n');
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!digits) {
    return '';
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return `254${digits.slice(1)}`;
  }
  return digits;
}

function defaultCommercialWhatsAppMessage(
  type: CommercialDocumentType,
  documentNumber: string,
  organization?: Pick<Organization, 'name'>,
) {
  const label = commercialDocumentLabel(type).toLowerCase();
  const sender = organization?.name ?? 'our team';
  return `Hello, please review ${label} ${documentNumber} from ${sender}.`;
}

function commercialFormatDate(value: string) {
  if (!value) {
    return 'N/A';
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(date);
}

function commercialPercentLabel(value: string) {
  const numericValue = toNumber(value);
  if (numericValue <= 0) {
    return '-';
  }
  return `${new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
  }).format(numericValue)}%`;
}

function defaultCommercialEmail(organization: Organization) {
  const slug = organization.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 36);
  return `accounts@${slug || 'company'}.co.ke`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysInputValue(value: string, days: number) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function toNumber(value: string | number | undefined) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function clampCommercialPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function NotificationsPage({ organization }: { organization: Organization }) {
  const summaryQuery = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: getNotificationsSummary,
  });
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });
  const notifications = notificationsQuery.data ?? [];

  return (
    <section className="table-workspace erp-module-page">
      <PageHeader
        title={summaryQuery.data?.title ?? 'Notifications'}
        subtitle={
          summaryQuery.data?.description ?? 'Operational alerts for approvals, stock, and payments.'
        }
      />
      <ErpModuleSummaryContent
        icon="bi-bell"
        isError={summaryQuery.isError}
        isLoading={summaryQuery.isPending}
        organization={organization}
        summary={summaryQuery.data}
      />

      <section className="panel-card">
        <PanelHeader icon="bi-inbox" title="Notification Inbox" tone="blue" />
        {notificationsQuery.isPending ? (
          <LoadingPanel label="Loading notifications..." />
        ) : notificationsQuery.isError ? (
          <EmptyState
            icon="bi-exclamation-circle"
            title="Notifications could not be loaded"
            detail="Refresh the page or try again after the API is available."
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="bi-bell"
            title="No notifications"
            detail="Workflow alerts and approval reminders will appear here."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td data-label="Notification">
                      <span className="table-label">
                        <i className="bi bi-bell" aria-hidden="true" />
                        <span>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Type">{labelizeEnum(notification.notificationType)}</td>
                    <td data-label="Source">{notification.sourceModule ?? 'System'}</td>
                    <td data-label="Status">
                      <StatusPill
                        status={moduleStatusTone(notification.status)}
                        label={labelizeEnum(notification.status)}
                      />
                    </td>
                    <td data-label="Created">{formatDateTime(notification.createdAt)}</td>
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

function AuditLogPage() {
  const auditQuery = useQuery({ queryKey: ['audit-events'], queryFn: getAuditEvents });
  const auditEvents = auditQuery.data ?? [];

  return (
    <section className="table-workspace erp-module-page">
      <PageHeader
        title="Audit Logs"
        subtitle="Backend-recorded activity across users, AI, and workflow modules."
      />

      <section className="panel-card">
        <PanelHeader icon="bi-journal-text" title="Recent Audit Events" tone="purple" />
        {auditQuery.isPending ? (
          <LoadingPanel label="Loading audit events..." />
        ) : auditQuery.isError ? (
          <EmptyState
            icon="bi-exclamation-circle"
            title="Audit logs could not be loaded"
            detail="Refresh the page or try again after the API is available."
          />
        ) : auditEvents.length === 0 ? (
          <EmptyState
            icon="bi-journal-text"
            title="No audit events recorded"
            detail="Sensitive changes and workflow actions will appear here."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Actor</th>
                  <th>Details</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Action">
                      <span className="table-label">
                        <i className="bi bi-shield-check" aria-hidden="true" />
                        {event.action}
                      </span>
                    </td>
                    <td data-label="Target">
                      {event.targetType}
                      {event.targetId ? (
                        <>
                          <br />
                          <small>{event.targetId}</small>
                        </>
                      ) : null}
                    </td>
                    <td data-label="Actor">{event.actorName ?? 'System'}</td>
                    <td data-label="Details">
                      {event.reason || auditMetadataPreview(event) || 'N/A'}
                    </td>
                    <td data-label="Time">{formatDateTime(event.createdAt)}</td>
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

function ErpModuleSummaryContent({
  icon,
  isError,
  isLoading,
  organization,
  summary,
}: {
  icon: string;
  isError: boolean;
  isLoading: boolean;
  organization: Organization;
  summary?: ModuleSummary;
}) {
  if (isLoading) {
    return <LoadingPanel label="Loading module snapshot..." />;
  }

  if (isError || !summary) {
    return (
      <EmptyState
        icon="bi-exclamation-circle"
        title="Module snapshot could not be loaded"
        detail="Refresh the page or try again after the API is available."
      />
    );
  }

  return (
    <>
      <div className="branch-summary-row">
        {summary.metrics.map((metric, index) => (
          <SummaryMetric
            icon={moduleMetricIcon(index, icon)}
            key={metric.label}
            label={metric.label}
            value={formatModuleMetricValue(metric, organization.currencyCode)}
            tone={moduleMetricTone(index)}
          />
        ))}
      </div>

      <section className="panel-card">
        <PanelHeader icon={icon} title="Recent Work" tone="blue" />
        {summary.workItems.length === 0 ? (
          <EmptyState
            icon={icon}
            title="No records yet"
            detail="Records created in this module will appear here."
          />
        ) : (
          <ModuleWorkItemsTable organization={organization} workItems={summary.workItems} />
        )}
      </section>
    </>
  );
}

function ModuleWorkItemsTable({
  organization,
  workItems,
}: {
  organization: Organization;
  workItems: ModuleWorkItem[];
}) {
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Title</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Due</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {workItems.map((item) => (
            <tr key={item.id}>
              <td data-label="Reference">
                <span className="table-label">
                  <i className="bi bi-file-earmark-text" aria-hidden="true" />
                  {item.reference}
                </span>
              </td>
              <td data-label="Title">{item.title}</td>
              <td data-label="Status">
                <StatusPill
                  status={moduleStatusTone(item.status)}
                  label={labelizeEnum(item.status)}
                />
              </td>
              <td data-label="Amount">
                {item.amount == null
                  ? 'N/A'
                  : formatMoney(Number(item.amount), organization.currencyCode)}
              </td>
              <td data-label="Due">{item.dueDate ? formatDateOnly(item.dueDate) : 'N/A'}</td>
              <td data-label="Created">
                {item.createdAt ? formatDateTime(item.createdAt) : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CRM_STORAGE_KEY = 'keen-crm-records-v1';

type CrmLeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
type CrmOpportunityStage = 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
type CrmActivityType = 'CALL' | 'MEETING' | 'TASK' | 'FOLLOW_UP' | 'NOTE';
type CrmActivityStatus = 'OPEN' | 'DONE' | 'CANCELLED';
type CrmWorkspaceView = 'overview' | 'pipeline' | 'leads' | 'opportunities' | 'activities';

type CrmLead = {
  id: string;
  leadNumber: string;
  branchId: string;
  assignedTo: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  location: string;
  source: string;
  estimatedValue: string;
  status: CrmLeadStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type CrmOpportunity = {
  id: string;
  opportunityNumber: string;
  leadId: string;
  branchId: string;
  assignedTo: string;
  title: string;
  customerName: string;
  company: string;
  phone: string;
  email: string;
  expectedValue: string;
  probabilityPercent: string;
  expectedCloseDate: string;
  stage: CrmOpportunityStage;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type CrmActivity = {
  id: string;
  leadId: string;
  opportunityId: string;
  branchId: string;
  assignedTo: string;
  activityType: CrmActivityType;
  subject: string;
  dueAt: string;
  completedAt: string;
  status: CrmActivityStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type CrmRecords = {
  leads: CrmLead[];
  opportunities: CrmOpportunity[];
  activities: CrmActivity[];
};

const crmLeadStatuses: CrmLeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
];

const crmOpportunityStages: CrmOpportunityStage[] = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

const crmActivityTypes: CrmActivityType[] = ['CALL', 'MEETING', 'TASK', 'FOLLOW_UP', 'NOTE'];
const crmActivityStatuses: CrmActivityStatus[] = ['OPEN', 'DONE', 'CANCELLED'];
const crmPipelineStages: CrmOpportunityStage[] = [
  'NEW',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

function CrmPage({
  branches,
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const { branchId: platformBranchId } = usePlatform();
  const navigate = useNavigate();
  const storageKey = `${CRM_STORAGE_KEY}:${organization.id}:${currentUser.userId}`;
  const [records, setRecords] = useState<CrmRecords>(() => loadCrmRecords(storageKey));
  const [activeView, setActiveView] = useState<CrmWorkspaceView>('overview');
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | CrmOpportunityStage>('ALL');
  const [branchFilter, setBranchFilter] = useState(platformBranchId || 'ALL');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const defaultBranchId = activeBranches[0]?.id ?? '';
  const [leadForm, setLeadForm] = useState<CrmLead>(() =>
    createCrmLead(currentUser, defaultBranchId, nextCrmLeadNumber(records.leads)),
  );
  const [opportunityForm, setOpportunityForm] = useState<CrmOpportunity>(() =>
    createCrmOpportunity(
      currentUser,
      defaultBranchId,
      nextCrmOpportunityNumber(records.opportunities),
    ),
  );
  const [activityForm, setActivityForm] = useState<CrmActivity>(() =>
    createCrmActivity(currentUser, defaultBranchId),
  );

  const { leads, opportunities, activities } = records;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLeads = useMemo(
    () =>
      leads
        .filter((lead) => {
          const matchesSearch =
            !normalizedSearch ||
            [
              lead.leadNumber,
              lead.name,
              lead.company,
              lead.phone,
              lead.email,
              lead.location,
              lead.source,
              lead.status,
            ]
              .join(' ')
              .toLowerCase()
              .includes(normalizedSearch);
          const matchesBranch = branchFilter === 'ALL' || lead.branchId === branchFilter;
          return matchesSearch && matchesBranch;
        })
        .sort(sortCrmByUpdatedAt),
    [branchFilter, leads, normalizedSearch],
  );
  const filteredOpportunities = useMemo(
    () =>
      opportunities
        .filter((opportunity) => {
          const matchesSearch =
            !normalizedSearch ||
            [
              opportunity.opportunityNumber,
              opportunity.title,
              opportunity.customerName,
              opportunity.company,
              opportunity.phone,
              opportunity.email,
              opportunity.stage,
            ]
              .join(' ')
              .toLowerCase()
              .includes(normalizedSearch);
          const matchesBranch = branchFilter === 'ALL' || opportunity.branchId === branchFilter;
          const matchesStage = stageFilter === 'ALL' || opportunity.stage === stageFilter;
          return matchesSearch && matchesBranch && matchesStage;
        })
        .sort(sortCrmByUpdatedAt),
    [branchFilter, normalizedSearch, opportunities, stageFilter],
  );
  const filteredActivities = useMemo(
    () =>
      activities
        .filter((activity) => {
          const relatedLead = leads.find((lead) => lead.id === activity.leadId);
          const relatedOpportunity = opportunities.find(
            (opportunity) => opportunity.id === activity.opportunityId,
          );
          const matchesSearch =
            !normalizedSearch ||
            [
              activity.subject,
              activity.activityType,
              activity.status,
              activity.notes,
              relatedLead?.name ?? '',
              relatedOpportunity?.title ?? '',
            ]
              .join(' ')
              .toLowerCase()
              .includes(normalizedSearch);
          const matchesBranch = branchFilter === 'ALL' || activity.branchId === branchFilter;
          return matchesSearch && matchesBranch;
        })
        .sort(sortCrmActivities),
    [activities, branchFilter, leads, normalizedSearch, opportunities],
  );
  const filteredRecords = {
    leads: filteredLeads,
    opportunities: filteredOpportunities,
    activities: filteredActivities,
  };
  const metrics = crmMetrics(filteredRecords, organization.currencyCode);
  const openActivities = filteredActivities.filter((activity) => activity.status === 'OPEN');
  const overdueActivities = openActivities.filter(isCrmActivityOverdue);
  const nextActivities = openActivities.slice().sort(sortCrmActivities).slice(0, 6);

  useEffect(() => {
    setStorageAvailable(saveCrmRecords(storageKey, records));
  }, [records, storageKey]);

  useEffect(() => {
    function syncRecords(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) {
        setRecords(loadCrmRecords(storageKey));
      }
    }
    window.addEventListener('storage', syncRecords);
    return () => window.removeEventListener('storage', syncRecords);
  }, [storageKey]);

  function openNewContact() {
    resetLeadForm();
    setActiveView('leads');
  }

  function openNewActivity() {
    resetActivityForm();
    setActiveView('activities');
  }

  function openNewOpportunity(stage: CrmOpportunityStage = 'NEW') {
    resetOpportunityForm();
    setOpportunityForm((current) => ({ ...current, stage }));
    setActiveView('opportunities');
  }

  function resetLeadForm() {
    setLeadForm(createCrmLead(currentUser, defaultBranchId, nextCrmLeadNumber(leads)));
    setError('');
  }

  function resetOpportunityForm() {
    setOpportunityForm(
      createCrmOpportunity(currentUser, defaultBranchId, nextCrmOpportunityNumber(opportunities)),
    );
    setError('');
  }

  function resetActivityForm() {
    setActivityForm(createCrmActivity(currentUser, defaultBranchId));
    setError('');
  }

  function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCrmLead(leadForm);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const savedLead = normalizeCrmLead(leadForm);
    setRecords((current) => ({
      ...current,
      leads: upsertCrmRecord(current.leads, savedLead),
    }));
    setLeadForm(savedLead);
    setError('');
    setMessage(`Lead ${savedLead.leadNumber} saved.`);
  }

  function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCrmOpportunity(opportunityForm);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const savedOpportunity = normalizeCrmOpportunity(opportunityForm);
    setRecords((current) => ({
      ...current,
      opportunities: upsertCrmRecord(current.opportunities, savedOpportunity),
    }));
    setOpportunityForm(savedOpportunity);
    setError('');
    setMessage(`Opportunity ${savedOpportunity.opportunityNumber} saved.`);
  }

  function saveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCrmActivity(activityForm);
    if (validationError) {
      setError(validationError);
      setMessage('');
      return;
    }

    const savedActivity = normalizeCrmActivity(activityForm);
    setRecords((current) => ({
      ...current,
      activities: upsertCrmRecord(current.activities, savedActivity),
    }));
    setActivityForm(savedActivity);
    setError('');
    setMessage(`Activity "${savedActivity.subject}" saved.`);
  }

  function editLead(lead: CrmLead) {
    setLeadForm(lead);
    setActiveView('leads');
    setError('');
    setMessage(`Editing ${lead.leadNumber}.`);
  }

  function editOpportunity(opportunity: CrmOpportunity) {
    setOpportunityForm(opportunity);
    setActiveView('opportunities');
    setError('');
    setMessage(`Editing ${opportunity.opportunityNumber}.`);
  }

  function editActivity(activity: CrmActivity) {
    setActivityForm(activity);
    setActiveView('activities');
    setError('');
    setMessage(`Editing ${activity.subject}.`);
  }

  function deleteLead(leadId: string) {
    setRecords((current) => ({
      leads: current.leads.filter((lead) => lead.id !== leadId),
      opportunities: current.opportunities.map((opportunity) =>
        opportunity.leadId === leadId ? { ...opportunity, leadId: '' } : opportunity,
      ),
      activities: current.activities.map((activity) =>
        activity.leadId === leadId ? { ...activity, leadId: '' } : activity,
      ),
    }));
    resetLeadForm();
    setMessage('Lead removed from the local CRM workspace.');
    setError('');
  }

  function deleteOpportunity(opportunityId: string) {
    setRecords((current) => ({
      ...current,
      opportunities: current.opportunities.filter(
        (opportunity) => opportunity.id !== opportunityId,
      ),
      activities: current.activities.map((activity) =>
        activity.opportunityId === opportunityId ? { ...activity, opportunityId: '' } : activity,
      ),
    }));
    resetOpportunityForm();
    setMessage('Opportunity removed from the local CRM workspace.');
    setError('');
  }

  function deleteActivity(activityId: string) {
    setRecords((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== activityId),
    }));
    resetActivityForm();
    setMessage('Activity removed from the local CRM workspace.');
    setError('');
  }

  function convertLeadToOpportunity(lead: CrmLead) {
    const existingOpportunity = opportunities.find((opportunity) => opportunity.leadId === lead.id);
    if (existingOpportunity) {
      editOpportunity(existingOpportunity);
      setMessage(
        `${lead.leadNumber} is already linked to ${existingOpportunity.opportunityNumber}.`,
      );
      return;
    }

    const opportunity = normalizeCrmOpportunity(
      createCrmOpportunity(
        currentUser,
        lead.branchId || defaultBranchId,
        nextCrmOpportunityNumber(opportunities),
        lead,
      ),
    );
    const updatedLead = normalizeCrmLead({ ...lead, status: 'QUALIFIED' });
    setRecords((current) => ({
      ...current,
      leads: upsertCrmRecord(current.leads, updatedLead),
      opportunities: upsertCrmRecord(current.opportunities, opportunity),
    }));
    setLeadForm(updatedLead);
    setOpportunityForm(opportunity);
    setActiveView('opportunities');
    setError('');
    setMessage(`${lead.leadNumber} converted to ${opportunity.opportunityNumber}.`);
  }

  function changeOpportunityStage(opportunityId: string, stage: CrmOpportunityStage) {
    if (!opportunities.some((opportunity) => opportunity.id === opportunityId)) return;
    setRecords((current) => ({
      ...current,
      opportunities: current.opportunities.map((opportunity) =>
        opportunity.id === opportunityId
          ? normalizeCrmOpportunity({
              ...opportunity,
              stage,
              probabilityPercent:
                stage === 'WON' ? '100' : stage === 'LOST' ? '0' : opportunity.probabilityPercent,
            })
          : opportunity,
      ),
    }));
    setMessage(`Opportunity moved to ${labelizeEnum(stage)}.`);
    setError('');
  }

  function updateActivityStatus(activityId: string, status: CrmActivityStatus) {
    setRecords((current) => ({
      ...current,
      activities: current.activities.map((activity) =>
        activity.id === activityId
          ? normalizeCrmActivity({
              ...activity,
              status,
              completedAt: status === 'DONE' ? new Date().toISOString() : '',
            })
          : activity,
      ),
    }));
    setMessage(
      status === 'DONE' ? 'Activity marked done.' : `Activity marked ${labelizeEnum(status)}.`,
    );
    setError('');
  }

  function scheduleFollowUpForLead(lead: CrmLead) {
    setActivityForm(
      createCrmActivity(currentUser, lead.branchId || defaultBranchId, {
        leadId: lead.id,
        subject: `Follow up with ${lead.name}`,
        activityType: 'FOLLOW_UP',
      }),
    );
    setActiveView('activities');
    setMessage(`Follow-up prepared for ${lead.leadNumber}.`);
    setError('');
  }

  function scheduleFollowUpForOpportunity(opportunity: CrmOpportunity) {
    setActivityForm(
      createCrmActivity(currentUser, opportunity.branchId || defaultBranchId, {
        opportunityId: opportunity.id,
        subject: `Follow up on ${opportunity.title}`,
        activityType: 'FOLLOW_UP',
      }),
    );
    setActiveView('activities');
    setMessage(`Follow-up prepared for ${opportunity.opportunityNumber}.`);
    setError('');
  }

  async function copyCrmSummary(record: CrmLead | CrmOpportunity) {
    const summary =
      'leadNumber' in record
        ? crmLeadSummary(record, organization)
        : crmOpportunitySummary(record, organization);
    try {
      await copyTextToClipboard(summary);
      setMessage('CRM summary copied to clipboard.');
      setError('');
    } catch {
      setError('Unable to copy the CRM summary. Select and copy it manually from the record.');
      setMessage('');
    }
  }

  function openCrmWhatsApp(record: CrmLead | CrmOpportunity) {
    const phoneNumber = normalizeWhatsAppNumber(record.phone);
    if (!phoneNumber) {
      setError('Add a WhatsApp number before opening this CRM message.');
      setMessage('');
      return;
    }

    const text =
      'leadNumber' in record
        ? crmLeadSummary(record, organization)
        : crmOpportunitySummary(record, organization);
    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    );
    setMessage('Opening WhatsApp with the CRM message.');
    setError('');
  }

  function openCrmEmail(record: CrmLead | CrmOpportunity) {
    if (!record.email.trim()) {
      setError('Add an email address before preparing this CRM email.');
      setMessage('');
      return;
    }

    const subject =
      'leadNumber' in record
        ? `${record.leadNumber} follow-up from ${organization.name}`
        : `${record.opportunityNumber} update from ${organization.name}`;
    const body =
      'leadNumber' in record
        ? crmLeadSummary(record, organization)
        : crmOpportunitySummary(record, organization);
    window.location.href = `mailto:${encodeURIComponent(record.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function exportCrmCsv() {
    const timestamp = todayInputValue();
    downloadCsv(`keen-crm-${timestamp}.csv`, [
      ['CRM Export', organization.name, timestamp],
      [],
      ['Leads'],
      [
        'Lead Number',
        'Name',
        'Company',
        'Phone',
        'Email',
        'Location',
        'Source',
        'Estimated Value',
        'Status',
        'Updated',
      ],
      ...leads.map((lead) => [
        lead.leadNumber,
        lead.name,
        lead.company,
        lead.phone,
        lead.email,
        lead.location,
        lead.source,
        toNumber(lead.estimatedValue).toFixed(2),
        lead.status,
        formatDateTime(lead.updatedAt),
      ]),
      [],
      ['Opportunities'],
      [
        'Opportunity Number',
        'Title',
        'Customer',
        'Company',
        'Expected Value',
        'Probability',
        'Weighted Value',
        'Stage',
        'Expected Close',
        'Updated',
      ],
      ...opportunities.map((opportunity) => [
        opportunity.opportunityNumber,
        opportunity.title,
        opportunity.customerName,
        opportunity.company,
        toNumber(opportunity.expectedValue).toFixed(2),
        toNumber(opportunity.probabilityPercent).toFixed(2),
        crmWeightedValue(opportunity).toFixed(2),
        opportunity.stage,
        opportunity.expectedCloseDate,
        formatDateTime(opportunity.updatedAt),
      ]),
      [],
      ['Activities'],
      ['Type', 'Subject', 'Due', 'Status', 'Related Record', 'Assigned To', 'Notes'],
      ...activities.map((activity) => [
        activity.activityType,
        activity.subject,
        activity.dueAt,
        activity.status,
        crmActivityRelatedLabel(activity, leads, opportunities),
        activity.assignedTo,
        activity.notes,
      ]),
    ]);
    setMessage('CRM CSV export downloaded.');
    setError('');
  }

  function updateActivityRelation(value: string) {
    if (value === 'general') {
      setActivityForm((current) => ({ ...current, leadId: '', opportunityId: '' }));
      return;
    }

    const [type, id] = value.split(':');
    if (type === 'lead') {
      const lead = leads.find((item) => item.id === id);
      setActivityForm((current) => ({
        ...current,
        leadId: id,
        opportunityId: '',
        branchId: lead?.branchId || current.branchId,
      }));
      return;
    }

    const opportunity = opportunities.find((item) => item.id === id);
    setActivityForm((current) => ({
      ...current,
      leadId: '',
      opportunityId: id,
      branchId: opportunity?.branchId || current.branchId,
    }));
  }

  return (
    <section className="table-workspace crm-workspace">
      <PageHeader
        eyebrow="CUSTOMER RELATIONSHIPS"
        title="CRM"
        subtitle="Your people. Your pipeline. Your next opportunity."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={exportCrmCsv}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Export CSV
            </button>
            <button
              className="primary-action compact-action"
              type="button"
              onClick={openNewContact}
            >
              <i className="bi bi-person-plus" aria-hidden="true" />
              Add Contact
            </button>
          </div>
        }
      />

      <FormMessages error={error} message={message} />
      {!storageAvailable ? (
        <p className="form-error" role="alert">
          Your browser could not save these changes. Export your records before leaving this page.
        </p>
      ) : null}

      <div className="crm-metrics">
        {metrics.map((metric) => (
          <article className={`crm-metric-card ${metric.tone}`} key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <span className={`crm-color-icon ${metric.tone}`}>
                <i className={`bi ${metric.icon}`} aria-hidden="true" />
              </span>
            </div>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </div>

      <section className="panel-card crm-control-panel">
        <div
          className="commercial-type-toggle crm-view-toggle"
          role="tablist"
          aria-label="CRM views"
        >
          {crmWorkspaceViews().map((view) => (
            <button
              aria-selected={activeView === view.key}
              role="tab"
              id={`crm-tab-${view.key}`}
              aria-controls={`crm-panel-${view.key}`}
              tabIndex={activeView === view.key ? 0 : -1}
              className={activeView === view.key ? 'active' : ''}
              key={view.key}
              type="button"
              onClick={() => setActiveView(view.key)}
              onKeyDown={(event) => {
                const views = crmWorkspaceViews();
                const index = views.findIndex((item) => item.key === view.key);
                const nextIndex =
                  event.key === 'ArrowRight'
                    ? (index + 1) % views.length
                    : event.key === 'ArrowLeft'
                      ? (index + views.length - 1) % views.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? views.length - 1
                          : null;
                if (nextIndex !== null) {
                  event.preventDefault();
                  setActiveView(views[nextIndex].key);
                  document.getElementById(`crm-tab-${views[nextIndex].key}`)?.focus();
                }
              }}
            >
              <i className={`bi ${view.icon}`} aria-hidden="true" />
              {view.label}
            </button>
          ))}
        </div>
        <div className="crm-filter-row">
          <label className="field-stack">
            <span>Search CRM</span>
            <input
              placeholder="Search contacts, deals, or activities..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label className="field-stack">
            <span>Branch</span>
            <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
              <option value="ALL">All branches</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-stack">
            <span>Opportunity Stage</span>
            <select
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(event.target.value as 'ALL' | CrmOpportunityStage)
              }
            >
              <option value="ALL">All stages</option>
              {crmOpportunityStages.map((stage) => (
                <option key={stage} value={stage}>
                  {labelizeEnum(stage)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStageFilter('ALL');
              setBranchFilter('ALL');
            }}
          >
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
            Reset
          </button>
        </div>
      </section>

      <div
        className="crm-view-content"
        role="tabpanel"
        id={`crm-panel-${activeView}`}
        aria-labelledby={`crm-tab-${activeView}`}
        tabIndex={0}
      >
        {activeView === 'overview' ? (
          <CrmOverview
            contacts={filteredLeads}
            opportunities={filteredOpportunities}
            activities={filteredActivities}
            currencyCode={organization.currencyCode}
            timeZone={organization.timeZone}
            onAddContact={openNewContact}
            onOpenContacts={() => setActiveView('leads')}
            onOpenPipeline={() => setActiveView('pipeline')}
            onAddActivity={openNewActivity}
            onEditContact={(id) => {
              const contact = leads.find((item) => item.id === id);
              if (contact) editLead(contact);
            }}
            onEditActivity={(id) => {
              const activity = activities.find((item) => item.id === id);
              if (activity) editActivity(activity);
            }}
            onCompleteActivity={(id) => updateActivityStatus(id, 'DONE')}
          />
        ) : null}

        {activeView === 'pipeline' ? (
          <div className="crm-main-grid crm-pipeline-layout">
            <section className="panel-card crm-pipeline-panel">
              <PanelHeader
                icon="bi-kanban"
                title="Opportunity Pipeline"
                tone="blue"
                action={
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => openNewOpportunity()}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    Opportunity
                  </button>
                }
              />
              <div className="crm-kanban-board">
                {crmPipelineStages.map((stage) => {
                  const stageOpportunities = filteredOpportunities.filter(
                    (opportunity) => opportunity.stage === stage,
                  );
                  return (
                    <section
                      className={`crm-kanban-column stage-${stage.toLowerCase()}`}
                      key={stage}
                      aria-label={`${labelizeEnum(stage)} opportunities`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        changeOpportunityStage(
                          event.dataTransfer.getData('application/x-keen-opportunity'),
                          stage,
                        );
                      }}
                    >
                      <header>
                        <span>{labelizeEnum(stage)}</span>
                        <strong>{stageOpportunities.length}</strong>
                      </header>
                      <p className="crm-stage-value">
                        {formatMoney(
                          stageOpportunities.reduce(
                            (total, opportunity) => total + toNumber(opportunity.expectedValue),
                            0,
                          ),
                          organization.currencyCode,
                        )}
                      </p>
                      <div className="crm-kanban-column-body">
                        {stageOpportunities.length === 0 ? (
                          <button
                            className="crm-empty-stage"
                            type="button"
                            onClick={() => openNewOpportunity(stage)}
                          >
                            <i className="bi bi-plus-circle" aria-hidden="true" />
                            Add an opportunity
                          </button>
                        ) : (
                          stageOpportunities.map((opportunity) => (
                            <article
                              className="crm-opportunity-card"
                              key={opportunity.id}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  'application/x-keen-opportunity',
                                  opportunity.id,
                                );
                                event.dataTransfer.effectAllowed = 'move';
                              }}
                            >
                              <div>
                                <span>{opportunity.opportunityNumber}</span>
                                <strong>{opportunity.title}</strong>
                                <p>
                                  {opportunity.customerName || opportunity.company || 'Customer'}
                                </p>
                              </div>
                              <dl>
                                <div>
                                  <dt>Value</dt>
                                  <dd>
                                    {formatMoney(
                                      toNumber(opportunity.expectedValue),
                                      organization.currencyCode,
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Probability</dt>
                                  <dd>{toNumber(opportunity.probabilityPercent).toFixed(0)}%</dd>
                                </div>
                                <div>
                                  <dt>Close</dt>
                                  <dd>{formatDateOnly(opportunity.expectedCloseDate)}</dd>
                                </div>
                              </dl>
                              <label className="crm-move-stage">
                                <span>Move to</span>
                                <select
                                  aria-label={`Stage for ${opportunity.title}`}
                                  value={opportunity.stage}
                                  onChange={(event) =>
                                    changeOpportunityStage(
                                      opportunity.id,
                                      event.target.value as CrmOpportunityStage,
                                    )
                                  }
                                >
                                  {crmOpportunityStages.map((option) => (
                                    <option key={option} value={option}>
                                      {labelizeEnum(option)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="crm-card-actions">
                                <button type="button" onClick={() => editOpportunity(opportunity)}>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => scheduleFollowUpForOpportunity(opportunity)}
                                >
                                  Follow-up
                                </button>
                                {opportunity.stage !== 'WON' ? (
                                  <button
                                    type="button"
                                    onClick={() => changeOpportunityStage(opportunity.id, 'WON')}
                                  >
                                    Won
                                  </button>
                                ) : null}
                                {opportunity.stage !== 'LOST' ? (
                                  <button
                                    type="button"
                                    onClick={() => changeOpportunityStage(opportunity.id, 'LOST')}
                                  >
                                    Lost
                                  </button>
                                ) : null}
                              </div>
                            </article>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <section className="panel-card crm-agenda-panel">
              <PanelHeader
                icon="bi-calendar-check"
                title="Follow-up Agenda"
                tone={overdueActivities.length > 0 ? 'orange' : 'green'}
                action={
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => {
                      resetActivityForm();
                      setActiveView('activities');
                    }}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    Activity
                  </button>
                }
              />
              {nextActivities.length === 0 ? (
                <EmptyState
                  icon="bi-calendar-check"
                  title="No open follow-ups"
                  detail="Activities scheduled from leads and opportunities will appear here."
                />
              ) : (
                <div className="crm-agenda-list">
                  {nextActivities.map((activity) => (
                    <article
                      className={`crm-agenda-item ${isCrmActivityOverdue(activity) ? 'overdue' : ''}`}
                      key={activity.id}
                    >
                      <div>
                        <span>{labelizeEnum(activity.activityType)}</span>
                        <strong>{activity.subject}</strong>
                        <p>{crmActivityRelatedLabel(activity, leads, opportunities)}</p>
                      </div>
                      <time>{activity.dueAt ? formatDateTime(activity.dueAt) : 'No due date'}</time>
                      <div className="crm-card-actions">
                        <button type="button" onClick={() => editActivity(activity)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateActivityStatus(activity.id, 'DONE')}
                        >
                          Done
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeView === 'leads' ? (
          <div className="crm-main-grid">
            <section className="panel-card crm-form-panel">
              <PanelHeader icon="bi-person-plus" title="Lead Capture" tone="green" />
              <form className="record-form crm-record-form" onSubmit={saveLead}>
                <label className="field-stack">
                  <span>Lead Number</span>
                  <input
                    required
                    maxLength={40}
                    value={leadForm.leadNumber}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, leadNumber: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select
                    value={leadForm.status}
                    onChange={(event) =>
                      setLeadForm((current) => ({
                        ...current,
                        status: event.target.value as CrmLeadStatus,
                      }))
                    }
                  >
                    {crmLeadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {labelizeEnum(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Name</span>
                  <input
                    required
                    maxLength={160}
                    value={leadForm.name}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Company</span>
                  <input
                    maxLength={160}
                    value={leadForm.company}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, company: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Phone</span>
                  <input
                    inputMode="tel"
                    maxLength={40}
                    placeholder="+254..."
                    value={leadForm.phone}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Email</span>
                  <input
                    type="email"
                    maxLength={254}
                    value={leadForm.email}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Location</span>
                  <input
                    maxLength={160}
                    value={leadForm.location}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, location: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Source</span>
                  <input
                    maxLength={80}
                    placeholder="Referral, walk-in, Instagram"
                    value={leadForm.source}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, source: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Estimated Value</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={leadForm.estimatedValue}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, estimatedValue: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Assigned To</span>
                  <input
                    maxLength={120}
                    value={leadForm.assignedTo}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, assignedTo: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack wide-field">
                  <span>Notes</span>
                  <textarea
                    maxLength={500}
                    value={leadForm.notes}
                    onChange={(event) =>
                      setLeadForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions wide-field">
                  <button className="primary-action compact-action" type="submit">
                    <i className="bi bi-save" aria-hidden="true" />
                    Save Lead
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={resetLeadForm}
                  >
                    <i className="bi bi-file-earmark-plus" aria-hidden="true" />
                    New Lead
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => convertLeadToOpportunity(leadForm)}
                    disabled={!leads.some((lead) => lead.id === leadForm.id)}
                  >
                    <i className="bi bi-arrow-right-circle" aria-hidden="true" />
                    Convert
                  </button>
                </div>
              </form>
            </section>

            <CrmLeadsTable
              branches={branches}
              leads={filteredLeads}
              onCopy={copyCrmSummary}
              onDelete={deleteLead}
              onEdit={editLead}
              onEmail={openCrmEmail}
              onFollowUp={scheduleFollowUpForLead}
              onConvert={convertLeadToOpportunity}
              onWhatsApp={openCrmWhatsApp}
              organization={organization}
            />
          </div>
        ) : null}

        {activeView === 'opportunities' ? (
          <div className="crm-main-grid">
            <section className="panel-card crm-form-panel">
              <PanelHeader icon="bi-graph-up-arrow" title="Opportunity Builder" tone="blue" />
              <form className="record-form crm-record-form" onSubmit={saveOpportunity}>
                <label className="field-stack">
                  <span>Opportunity Number</span>
                  <input
                    required
                    maxLength={40}
                    value={opportunityForm.opportunityNumber}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        opportunityNumber: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Stage</span>
                  <select
                    value={opportunityForm.stage}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        stage: event.target.value as CrmOpportunityStage,
                      }))
                    }
                  >
                    {crmOpportunityStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {labelizeEnum(stage)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack wide-field">
                  <span>Linked Lead</span>
                  <select
                    value={opportunityForm.leadId}
                    onChange={(event) => {
                      const lead = leads.find((item) => item.id === event.target.value);
                      setOpportunityForm((current) => ({
                        ...current,
                        leadId: event.target.value,
                        branchId: lead?.branchId || current.branchId,
                        customerName: current.customerName || lead?.name || '',
                        company: current.company || lead?.company || '',
                        phone: current.phone || lead?.phone || '',
                        email: current.email || lead?.email || '',
                      }));
                    }}
                  >
                    <option value="">No linked lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.leadNumber} - {lead.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack wide-field">
                  <span>Opportunity Title</span>
                  <input
                    required
                    maxLength={180}
                    value={opportunityForm.title}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Customer Name</span>
                  <input
                    required
                    maxLength={160}
                    value={opportunityForm.customerName}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Company</span>
                  <input
                    maxLength={160}
                    value={opportunityForm.company}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({ ...current, company: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Phone</span>
                  <input
                    inputMode="tel"
                    maxLength={40}
                    value={opportunityForm.phone}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Email</span>
                  <input
                    type="email"
                    maxLength={254}
                    value={opportunityForm.email}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Expected Value</span>
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={opportunityForm.expectedValue}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        expectedValue: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Probability %</span>
                  <input
                    min="0"
                    max="100"
                    step="1"
                    type="number"
                    value={opportunityForm.probabilityPercent}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        probabilityPercent: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Expected Close</span>
                  <input
                    type="date"
                    value={opportunityForm.expectedCloseDate}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        expectedCloseDate: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Assigned To</span>
                  <input
                    maxLength={120}
                    value={opportunityForm.assignedTo}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({
                        ...current,
                        assignedTo: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field-stack wide-field">
                  <span>Notes</span>
                  <textarea
                    maxLength={500}
                    value={opportunityForm.notes}
                    onChange={(event) =>
                      setOpportunityForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="commercial-total-strip crm-opportunity-value-strip wide-field">
                  <div>
                    <span>Expected</span>
                    <strong>
                      {formatMoney(
                        toNumber(opportunityForm.expectedValue),
                        organization.currencyCode,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Weighted</span>
                    <strong>
                      {formatMoney(crmWeightedValue(opportunityForm), organization.currencyCode)}
                    </strong>
                  </div>
                  <div>
                    <span>Probability</span>
                    <strong>{toNumber(opportunityForm.probabilityPercent).toFixed(0)}%</strong>
                  </div>
                  <div>
                    <span>Stage</span>
                    <strong>{labelizeEnum(opportunityForm.stage)}</strong>
                  </div>
                </div>
                <div className="form-actions wide-field">
                  <button className="primary-action compact-action" type="submit">
                    <i className="bi bi-save" aria-hidden="true" />
                    Save Opportunity
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={resetOpportunityForm}
                  >
                    <i className="bi bi-file-earmark-plus" aria-hidden="true" />
                    New
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => scheduleFollowUpForOpportunity(opportunityForm)}
                    disabled={
                      !opportunities.some((opportunity) => opportunity.id === opportunityForm.id)
                    }
                  >
                    <i className="bi bi-calendar-plus" aria-hidden="true" />
                    Follow-up
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => navigate('/commercial')}
                  >
                    <i className="bi bi-file-earmark-text" aria-hidden="true" />
                    Quote
                  </button>
                </div>
              </form>
            </section>

            <CrmOpportunitiesTable
              branches={branches}
              onCopy={copyCrmSummary}
              onDelete={deleteOpportunity}
              onEdit={editOpportunity}
              onEmail={openCrmEmail}
              onFollowUp={scheduleFollowUpForOpportunity}
              onStageChange={changeOpportunityStage}
              onWhatsApp={openCrmWhatsApp}
              opportunities={filteredOpportunities}
              organization={organization}
            />
          </div>
        ) : null}

        {activeView === 'activities' ? (
          <div className="crm-main-grid">
            <section className="panel-card crm-form-panel">
              <PanelHeader icon="bi-calendar-plus" title="Activity Planner" tone="orange" />
              <form className="record-form crm-record-form" onSubmit={saveActivity}>
                <label className="field-stack">
                  <span>Type</span>
                  <select
                    value={activityForm.activityType}
                    onChange={(event) =>
                      setActivityForm((current) => ({
                        ...current,
                        activityType: event.target.value as CrmActivityType,
                      }))
                    }
                  >
                    {crmActivityTypes.map((type) => (
                      <option key={type} value={type}>
                        {labelizeEnum(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select
                    value={activityForm.status}
                    onChange={(event) =>
                      setActivityForm((current) => ({
                        ...current,
                        status: event.target.value as CrmActivityStatus,
                      }))
                    }
                  >
                    {crmActivityStatuses.map((status) => (
                      <option key={status} value={status}>
                        {labelizeEnum(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack wide-field">
                  <span>Subject</span>
                  <input
                    required
                    maxLength={180}
                    value={activityForm.subject}
                    onChange={(event) =>
                      setActivityForm((current) => ({ ...current, subject: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack wide-field">
                  <span>Related Record</span>
                  <select
                    value={crmActivityRelationValue(activityForm)}
                    onChange={(event) => updateActivityRelation(event.target.value)}
                  >
                    <option value="general">General CRM activity</option>
                    {leads.length > 0 ? (
                      <optgroup label="Leads">
                        {leads.map((lead) => (
                          <option key={lead.id} value={`lead:${lead.id}`}>
                            {lead.leadNumber} - {lead.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {opportunities.length > 0 ? (
                      <optgroup label="Opportunities">
                        {opportunities.map((opportunity) => (
                          <option key={opportunity.id} value={`opportunity:${opportunity.id}`}>
                            {opportunity.opportunityNumber} - {opportunity.title}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Due At</span>
                  <input
                    type="datetime-local"
                    value={activityForm.dueAt}
                    onChange={(event) =>
                      setActivityForm((current) => ({ ...current, dueAt: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Assigned To</span>
                  <input
                    maxLength={120}
                    value={activityForm.assignedTo}
                    onChange={(event) =>
                      setActivityForm((current) => ({ ...current, assignedTo: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack wide-field">
                  <span>Notes</span>
                  <textarea
                    maxLength={500}
                    value={activityForm.notes}
                    onChange={(event) =>
                      setActivityForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions wide-field">
                  <button className="primary-action compact-action" type="submit">
                    <i className="bi bi-save" aria-hidden="true" />
                    Save Activity
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={resetActivityForm}
                  >
                    <i className="bi bi-calendar-plus" aria-hidden="true" />
                    New
                  </button>
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    onClick={() => updateActivityStatus(activityForm.id, 'DONE')}
                    disabled={!activities.some((activity) => activity.id === activityForm.id)}
                  >
                    <i className="bi bi-check2-circle" aria-hidden="true" />
                    Done
                  </button>
                </div>
              </form>
            </section>

            <CrmActivitiesTable
              activities={filteredActivities}
              leads={leads}
              onDelete={deleteActivity}
              onEdit={editActivity}
              onStatusChange={updateActivityStatus}
              opportunities={opportunities}
            />
          </div>
        ) : null}
      </div>
      <p className="crm-storage-note">
        <i
          className={`bi ${storageAvailable ? 'bi-device-hdd' : 'bi-exclamation-triangle'}`}
          aria-hidden="true"
        />
        {storageAvailable
          ? 'Saved in this browser for your account. Export CSV to keep a backup.'
          : 'Browser storage unavailable. Export CSV to keep your changes.'}
      </p>
    </section>
  );
}

function CrmLeadsTable({
  branches,
  leads,
  onCopy,
  onDelete,
  onEdit,
  onEmail,
  onFollowUp,
  onConvert,
  onWhatsApp,
  organization,
}: {
  branches: Branch[];
  leads: CrmLead[];
  onCopy: (lead: CrmLead) => void;
  onDelete: (leadId: string) => void;
  onEdit: (lead: CrmLead) => void;
  onEmail: (lead: CrmLead) => void;
  onFollowUp: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onWhatsApp: (lead: CrmLead) => void;
  organization: Organization;
}) {
  return (
    <section className="panel-card crm-records-panel">
      <PanelHeader icon="bi-person-lines-fill" title="Lead Directory" tone="green" />
      {leads.length === 0 ? (
        <EmptyState
          icon="bi-person-plus"
          title="No leads in view"
          detail="Capture a lead or clear the CRM filters."
        />
      ) : (
        <div className="responsive-table crm-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Contact</th>
                <th>Value</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td data-label="Lead">
                    <span className="table-label">
                      <i className="bi bi-person-vcard" aria-hidden="true" />
                      <span>
                        <strong>{lead.leadNumber}</strong>
                        <small>{lead.name}</small>
                        {lead.company ? <small>{lead.company}</small> : null}
                      </span>
                    </span>
                  </td>
                  <td data-label="Contact">
                    {lead.phone || lead.email || 'N/A'}
                    {lead.location ? (
                      <>
                        <br />
                        <small>{lead.location}</small>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Value">
                    {formatMoney(toNumber(lead.estimatedValue), organization.currencyCode)}
                  </td>
                  <td data-label="Status">
                    <StatusPill
                      status={crmRecordTone(lead.status)}
                      label={labelizeEnum(lead.status)}
                    />
                  </td>
                  <td data-label="Updated">{formatDateTime(lead.updatedAt)}</td>
                  <td data-label="Actions">
                    <div className="commercial-table-actions crm-table-actions">
                      <button className="text-button" type="button" onClick={() => onEdit(lead)}>
                        Edit
                      </button>
                      <button className="text-button" type="button" onClick={() => onConvert(lead)}>
                        Convert
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onFollowUp(lead)}
                      >
                        Follow-up
                      </button>
                      <button className="text-button" type="button" onClick={() => onCopy(lead)}>
                        Copy
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onWhatsApp(lead)}
                      >
                        WhatsApp
                      </button>
                      <button className="text-button" type="button" onClick={() => onEmail(lead)}>
                        Email
                      </button>
                      <button
                        className="text-button danger-text-button"
                        type="button"
                        onClick={() => onDelete(lead.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CrmOpportunitiesTable({
  branches,
  onCopy,
  onDelete,
  onEdit,
  onEmail,
  onFollowUp,
  onStageChange,
  onWhatsApp,
  opportunities,
  organization,
}: {
  branches: Branch[];
  onCopy: (opportunity: CrmOpportunity) => void;
  onDelete: (opportunityId: string) => void;
  onEdit: (opportunity: CrmOpportunity) => void;
  onEmail: (opportunity: CrmOpportunity) => void;
  onFollowUp: (opportunity: CrmOpportunity) => void;
  onStageChange: (opportunityId: string, stage: CrmOpportunityStage) => void;
  onWhatsApp: (opportunity: CrmOpportunity) => void;
  opportunities: CrmOpportunity[];
  organization: Organization;
}) {
  return (
    <section className="panel-card crm-records-panel">
      <PanelHeader icon="bi-graph-up-arrow" title="Opportunities" tone="blue" />
      {opportunities.length === 0 ? (
        <EmptyState
          icon="bi-graph-up"
          title="No opportunities in view"
          detail="Create an opportunity or clear the CRM filters."
        />
      ) : (
        <div className="responsive-table crm-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Customer</th>
                <th>Expected</th>
                <th>Weighted</th>
                <th>Stage</th>
                <th>Close</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <td data-label="Opportunity">
                    <span className="table-label">
                      <i className="bi bi-bullseye" aria-hidden="true" />
                      <span>
                        <strong>{opportunity.opportunityNumber}</strong>
                        <small>{opportunity.title}</small>
                      </span>
                    </span>
                  </td>
                  <td data-label="Customer">
                    {opportunity.customerName || opportunity.company || 'Customer'}
                    {opportunity.phone ? (
                      <>
                        <br />
                        <small>{opportunity.phone}</small>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Expected">
                    {formatMoney(toNumber(opportunity.expectedValue), organization.currencyCode)}
                  </td>
                  <td data-label="Weighted">
                    {formatMoney(crmWeightedValue(opportunity), organization.currencyCode)}
                  </td>
                  <td data-label="Stage">
                    <StatusPill
                      status={crmRecordTone(opportunity.stage)}
                      label={labelizeEnum(opportunity.stage)}
                    />
                  </td>
                  <td data-label="Close">{formatDateOnly(opportunity.expectedCloseDate)}</td>
                  <td data-label="Actions">
                    <div className="commercial-table-actions crm-table-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onEdit(opportunity)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onFollowUp(opportunity)}
                      >
                        Follow-up
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onStageChange(opportunity.id, 'WON')}
                      >
                        Won
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onStageChange(opportunity.id, 'LOST')}
                      >
                        Lost
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onCopy(opportunity)}
                      >
                        Copy
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onWhatsApp(opportunity)}
                      >
                        WhatsApp
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onEmail(opportunity)}
                      >
                        Email
                      </button>
                      <button
                        className="text-button danger-text-button"
                        type="button"
                        onClick={() => onDelete(opportunity.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CrmActivitiesTable({
  activities,
  leads,
  onDelete,
  onEdit,
  onStatusChange,
  opportunities,
}: {
  activities: CrmActivity[];
  leads: CrmLead[];
  onDelete: (activityId: string) => void;
  onEdit: (activity: CrmActivity) => void;
  onStatusChange: (activityId: string, status: CrmActivityStatus) => void;
  opportunities: CrmOpportunity[];
}) {
  return (
    <section className="panel-card crm-records-panel">
      <PanelHeader icon="bi-calendar-check" title="Activity Log" tone="orange" />
      {activities.length === 0 ? (
        <EmptyState
          icon="bi-calendar-check"
          title="No activities in view"
          detail="Schedule a call, meeting, task, note, or follow-up."
        />
      ) : (
        <div className="responsive-table crm-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Related</th>
                <th>Due</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td data-label="Activity">
                    <span className="table-label">
                      <i
                        className={`bi ${crmActivityIcon(activity.activityType)}`}
                        aria-hidden="true"
                      />
                      <span>
                        <strong>{activity.subject}</strong>
                        <small>{labelizeEnum(activity.activityType)}</small>
                      </span>
                    </span>
                  </td>
                  <td data-label="Related">
                    {crmActivityRelatedLabel(activity, leads, opportunities)}
                  </td>
                  <td data-label="Due">
                    {activity.dueAt ? formatDateTime(activity.dueAt) : 'N/A'}
                    {isCrmActivityOverdue(activity) ? (
                      <>
                        <br />
                        <small>Overdue</small>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Status">
                    <StatusPill
                      status={crmRecordTone(activity.status)}
                      label={labelizeEnum(activity.status)}
                    />
                  </td>
                  <td data-label="Assigned">{activity.assignedTo || 'Unassigned'}</td>
                  <td data-label="Actions">
                    <div className="commercial-table-actions crm-table-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onEdit(activity)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onStatusChange(activity.id, 'DONE')}
                      >
                        Done
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => onStatusChange(activity.id, 'CANCELLED')}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-button danger-text-button"
                        type="button"
                        onClick={() => onDelete(activity.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function crmWorkspaceViews(): { key: CrmWorkspaceView; label: string; icon: string }[] {
  return [
    { key: 'overview', label: 'Overview', icon: 'bi-grid-1x2' },
    { key: 'leads', label: 'Contacts', icon: 'bi-people' },
    { key: 'pipeline', label: 'Opportunities', icon: 'bi-kanban' },
    { key: 'opportunities', label: 'Deal register', icon: 'bi-list-ul' },
    { key: 'activities', label: 'Tasks & appointments', icon: 'bi-calendar-check' },
  ];
}

function createCrmLead(currentUser: CurrentUser, branchId: string, leadNumber: string): CrmLead {
  const now = new Date().toISOString();
  return {
    id: createCommercialId(),
    leadNumber,
    branchId,
    assignedTo: currentUser.displayName,
    name: '',
    company: '',
    phone: '',
    email: '',
    location: '',
    source: '',
    estimatedValue: '0',
    status: 'NEW',
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createCrmOpportunity(
  currentUser: CurrentUser,
  branchId: string,
  opportunityNumber: string,
  lead?: CrmLead,
): CrmOpportunity {
  const now = new Date().toISOString();
  return {
    id: createCommercialId(),
    opportunityNumber,
    leadId: lead?.id ?? '',
    branchId: lead?.branchId || branchId,
    assignedTo: currentUser.displayName,
    title: lead ? `${lead.company || lead.name} opportunity` : '',
    customerName: lead?.name ?? '',
    company: lead?.company ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    expectedValue: lead?.estimatedValue ?? '0',
    probabilityPercent: lead ? '45' : '20',
    expectedCloseDate: addDaysInputValue(todayInputValue(), 14),
    stage: lead ? 'QUALIFIED' : 'NEW',
    notes: lead?.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
}

function createCrmActivity(
  currentUser: CurrentUser,
  branchId: string,
  options: Partial<CrmActivity> = {},
): CrmActivity {
  const now = new Date().toISOString();
  return {
    id: createCommercialId(),
    leadId: options.leadId ?? '',
    opportunityId: options.opportunityId ?? '',
    branchId,
    assignedTo: options.assignedTo ?? currentUser.displayName,
    activityType: options.activityType ?? 'CALL',
    subject: options.subject ?? '',
    dueAt: options.dueAt ?? `${addDaysInputValue(todayInputValue(), 1)}T09:00`,
    completedAt: '',
    status: options.status ?? 'OPEN',
    notes: options.notes ?? '',
    createdAt: now,
    updatedAt: now,
  };
}

function validateCrmLead(lead: CrmLead) {
  if (!lead.leadNumber.trim()) {
    return 'Enter a lead number.';
  }
  if (!lead.name.trim()) {
    return 'Enter the lead name.';
  }
  if (toNumber(lead.estimatedValue) < 0) {
    return 'Estimated value cannot be negative.';
  }
  return '';
}

function validateCrmOpportunity(opportunity: CrmOpportunity) {
  if (!opportunity.opportunityNumber.trim()) {
    return 'Enter an opportunity number.';
  }
  if (!opportunity.title.trim()) {
    return 'Enter an opportunity title.';
  }
  if (!opportunity.customerName.trim() && !opportunity.company.trim()) {
    return 'Enter a customer name or company.';
  }
  if (toNumber(opportunity.expectedValue) < 0) {
    return 'Expected value cannot be negative.';
  }
  const probability = toNumber(opportunity.probabilityPercent);
  if (probability < 0 || probability > 100) {
    return 'Probability must be between 0 and 100.';
  }
  return '';
}

function validateCrmActivity(activity: CrmActivity) {
  if (!activity.subject.trim()) {
    return 'Enter an activity subject.';
  }
  return '';
}

function normalizeCrmLead(lead: CrmLead): CrmLead {
  const now = new Date().toISOString();
  return {
    ...lead,
    leadNumber: lead.leadNumber.trim(),
    branchId: lead.branchId.trim(),
    assignedTo: lead.assignedTo.trim(),
    name: lead.name.trim(),
    company: lead.company.trim(),
    phone: lead.phone.trim(),
    email: lead.email.trim(),
    location: lead.location.trim(),
    source: lead.source.trim(),
    estimatedValue: String(Math.max(0, toNumber(lead.estimatedValue))),
    notes: lead.notes.trim(),
    createdAt: lead.createdAt || now,
    updatedAt: now,
  };
}

function normalizeCrmOpportunity(opportunity: CrmOpportunity): CrmOpportunity {
  const now = new Date().toISOString();
  return {
    ...opportunity,
    opportunityNumber: opportunity.opportunityNumber.trim(),
    leadId: opportunity.leadId.trim(),
    branchId: opportunity.branchId.trim(),
    assignedTo: opportunity.assignedTo.trim(),
    title: opportunity.title.trim(),
    customerName: opportunity.customerName.trim(),
    company: opportunity.company.trim(),
    phone: opportunity.phone.trim(),
    email: opportunity.email.trim(),
    expectedValue: String(Math.max(0, toNumber(opportunity.expectedValue))),
    probabilityPercent: String(
      opportunity.stage === 'WON'
        ? 100
        : opportunity.stage === 'LOST'
          ? 0
          : Math.min(100, Math.max(0, toNumber(opportunity.probabilityPercent))),
    ),
    expectedCloseDate: opportunity.expectedCloseDate,
    notes: opportunity.notes.trim(),
    createdAt: opportunity.createdAt || now,
    updatedAt: now,
  };
}

function normalizeCrmActivity(activity: CrmActivity): CrmActivity {
  const now = new Date().toISOString();
  return {
    ...activity,
    leadId: activity.leadId.trim(),
    opportunityId: activity.opportunityId.trim(),
    branchId: activity.branchId.trim(),
    assignedTo: activity.assignedTo.trim(),
    subject: activity.subject.trim(),
    notes: activity.notes.trim(),
    completedAt: activity.status === 'DONE' ? activity.completedAt || now : '',
    createdAt: activity.createdAt || now,
    updatedAt: now,
  };
}

function loadCrmRecords(storageKey: string): CrmRecords {
  try {
    const rawRecords = window.localStorage.getItem(storageKey);
    if (!rawRecords) {
      return emptyCrmRecords();
    }
    const parsed = JSON.parse(rawRecords) as Partial<CrmRecords>;
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads.map(coerceCrmLead) : [],
      opportunities: Array.isArray(parsed.opportunities)
        ? parsed.opportunities.map(coerceCrmOpportunity)
        : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities.map(coerceCrmActivity) : [],
    };
  } catch {
    return emptyCrmRecords();
  }
}

function saveCrmRecords(storageKey: string, records: CrmRecords) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function emptyCrmRecords(): CrmRecords {
  return { leads: [], opportunities: [], activities: [] };
}

function coerceCrmLead(value: unknown): CrmLead {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<CrmLead>;
  const now = new Date().toISOString();
  return {
    id: stringValue(raw.id) || createCommercialId(),
    leadNumber: stringValue(raw.leadNumber) || 'LEAD-0001',
    branchId: stringValue(raw.branchId),
    assignedTo: stringValue(raw.assignedTo),
    name: stringValue(raw.name),
    company: stringValue(raw.company),
    phone: stringValue(raw.phone),
    email: stringValue(raw.email),
    location: stringValue(raw.location),
    source: stringValue(raw.source),
    estimatedValue: stringValue(raw.estimatedValue) || '0',
    status: crmLeadStatuses.includes(raw.status as CrmLeadStatus)
      ? (raw.status as CrmLeadStatus)
      : 'NEW',
    notes: stringValue(raw.notes),
    createdAt: stringValue(raw.createdAt) || now,
    updatedAt: stringValue(raw.updatedAt) || now,
  };
}

function coerceCrmOpportunity(value: unknown): CrmOpportunity {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<CrmOpportunity>;
  const now = new Date().toISOString();
  return {
    id: stringValue(raw.id) || createCommercialId(),
    opportunityNumber: stringValue(raw.opportunityNumber) || 'OPP-0001',
    leadId: stringValue(raw.leadId),
    branchId: stringValue(raw.branchId),
    assignedTo: stringValue(raw.assignedTo),
    title: stringValue(raw.title),
    customerName: stringValue(raw.customerName),
    company: stringValue(raw.company),
    phone: stringValue(raw.phone),
    email: stringValue(raw.email),
    expectedValue: stringValue(raw.expectedValue) || '0',
    probabilityPercent: stringValue(raw.probabilityPercent) || '0',
    expectedCloseDate: stringValue(raw.expectedCloseDate),
    stage: crmOpportunityStages.includes(raw.stage as CrmOpportunityStage)
      ? (raw.stage as CrmOpportunityStage)
      : 'NEW',
    notes: stringValue(raw.notes),
    createdAt: stringValue(raw.createdAt) || now,
    updatedAt: stringValue(raw.updatedAt) || now,
  };
}

function coerceCrmActivity(value: unknown): CrmActivity {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<CrmActivity>;
  const now = new Date().toISOString();
  return {
    id: stringValue(raw.id) || createCommercialId(),
    leadId: stringValue(raw.leadId),
    opportunityId: stringValue(raw.opportunityId),
    branchId: stringValue(raw.branchId),
    assignedTo: stringValue(raw.assignedTo),
    activityType: crmActivityTypes.includes(raw.activityType as CrmActivityType)
      ? (raw.activityType as CrmActivityType)
      : 'CALL',
    subject: stringValue(raw.subject),
    dueAt: stringValue(raw.dueAt),
    completedAt: stringValue(raw.completedAt),
    status: crmActivityStatuses.includes(raw.status as CrmActivityStatus)
      ? (raw.status as CrmActivityStatus)
      : 'OPEN',
    notes: stringValue(raw.notes),
    createdAt: stringValue(raw.createdAt) || now,
    updatedAt: stringValue(raw.updatedAt) || now,
  };
}

function upsertCrmRecord<T extends { id: string }>(records: T[], record: T) {
  const existing = records.some((item) => item.id === record.id);
  return existing
    ? records.map((item) => (item.id === record.id ? record : item))
    : [record, ...records];
}

function nextCrmLeadNumber(leads: CrmLead[]) {
  return nextCrmNumber(
    'LEAD',
    leads.map((lead) => lead.leadNumber),
  );
}

function nextCrmOpportunityNumber(opportunities: CrmOpportunity[]) {
  return nextCrmNumber(
    'OPP',
    opportunities.map((opportunity) => opportunity.opportunityNumber),
  );
}

function nextCrmNumber(prefix: string, existingNumbers: string[]) {
  const existing = new Set(existingNumbers);
  let counter = existingNumbers.length + 1;
  let candidate = `${prefix}-${String(counter).padStart(4, '0')}`;
  while (existing.has(candidate)) {
    counter += 1;
    candidate = `${prefix}-${String(counter).padStart(4, '0')}`;
  }
  return candidate;
}

function crmMetrics(records: CrmRecords, currencyCode: string) {
  const openLeads = records.leads.filter((lead) => !['WON', 'LOST'].includes(lead.status));
  const openOpportunities = records.opportunities.filter(
    (opportunity) => !['WON', 'LOST'].includes(opportunity.stage),
  );
  const pipelineValue = openOpportunities.reduce(
    (sum, opportunity) => sum + toNumber(opportunity.expectedValue),
    0,
  );
  const wonOpportunities = records.opportunities.filter(
    (opportunity) => opportunity.stage === 'WON',
  );
  const dueActivities = records.activities.filter(
    (activity) => activity.status === 'OPEN' && activity.dueAt,
  );
  const overdueCount = dueActivities.filter(isCrmActivityOverdue).length;
  return [
    {
      icon: 'bi-person-plus',
      label: 'Total contacts',
      value: records.leads.length.toLocaleString('en-KE'),
      detail: `${openLeads.length} open leads to nurture`,
      tone: 'blue',
    },
    {
      icon: 'bi-kanban',
      label: 'Open pipeline',
      value: formatMoney(pipelineValue, currencyCode),
      detail: `${openOpportunities.length} opportunities in progress`,
      tone: 'cyan',
    },
    {
      icon: 'bi-cash-stack',
      label: 'Won deal value',
      value: formatMoney(
        wonOpportunities.reduce((sum, opportunity) => sum + toNumber(opportunity.expectedValue), 0),
        currencyCode,
      ),
      detail: `${wonOpportunities.length} opportunities won`,
      tone: 'green',
    },
    {
      icon: 'bi-clock-history',
      label: 'Follow-ups due',
      value: overdueCount.toLocaleString('en-KE'),
      detail: `${records.activities.filter((activity) => activity.status === 'OPEN').length} open tasks & appointments`,
      tone: 'amber',
    },
  ];
}

function crmWeightedValue(
  opportunity: Pick<CrmOpportunity, 'expectedValue' | 'probabilityPercent'>,
) {
  return toNumber(opportunity.expectedValue) * (toNumber(opportunity.probabilityPercent) / 100);
}

function crmRecordTone(status: string): 'posted' | 'review' | 'pending' {
  if (['WON', 'DONE'].includes(status)) {
    return 'posted';
  }
  if (['LOST', 'CANCELLED'].includes(status)) {
    return 'pending';
  }
  return 'review';
}

function branchName(branches: Branch[], branchId: string) {
  return branches.find((branch) => branch.id === branchId)?.name ?? 'Shop';
}

function sortCrmByUpdatedAt<T extends { updatedAt: string }>(first: T, second: T) {
  return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
}

function sortCrmActivities(first: CrmActivity, second: CrmActivity) {
  if (first.status !== second.status) {
    return first.status === 'OPEN' ? -1 : 1;
  }
  const firstTime = first.dueAt ? new Date(first.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const secondTime = second.dueAt ? new Date(second.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  if (firstTime !== secondTime) {
    return firstTime - secondTime;
  }
  return sortCrmByUpdatedAt(first, second);
}

function isCrmActivityOverdue(activity: CrmActivity) {
  return activity.status === 'OPEN' && activity.dueAt
    ? new Date(activity.dueAt).getTime() < Date.now()
    : false;
}

function crmActivityRelationValue(activity: CrmActivity) {
  if (activity.leadId) {
    return `lead:${activity.leadId}`;
  }
  if (activity.opportunityId) {
    return `opportunity:${activity.opportunityId}`;
  }
  return 'general';
}

function crmActivityRelatedLabel(
  activity: CrmActivity,
  leads: CrmLead[],
  opportunities: CrmOpportunity[],
) {
  if (activity.leadId) {
    const lead = leads.find((item) => item.id === activity.leadId);
    return lead ? `${lead.leadNumber} - ${lead.name}` : 'Linked lead';
  }
  if (activity.opportunityId) {
    const opportunity = opportunities.find((item) => item.id === activity.opportunityId);
    return opportunity
      ? `${opportunity.opportunityNumber} - ${opportunity.title}`
      : 'Linked opportunity';
  }
  return 'General CRM';
}

function crmActivityIcon(type: CrmActivityType) {
  const icons: Record<CrmActivityType, string> = {
    CALL: 'bi-telephone',
    MEETING: 'bi-people',
    TASK: 'bi-list-check',
    FOLLOW_UP: 'bi-arrow-repeat',
    NOTE: 'bi-stickies',
  };
  return icons[type];
}

function crmLeadSummary(lead: CrmLead, organization: Organization) {
  return [
    `${organization.name} CRM lead ${lead.leadNumber}`,
    `Name: ${lead.name}`,
    lead.company ? `Company: ${lead.company}` : '',
    lead.phone ? `Phone: ${lead.phone}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    `Status: ${labelizeEnum(lead.status)}`,
    `Estimated value: ${formatMoney(toNumber(lead.estimatedValue), organization.currencyCode)}`,
    lead.notes ? `Notes: ${lead.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function crmOpportunitySummary(opportunity: CrmOpportunity, organization: Organization) {
  return [
    `${organization.name} CRM opportunity ${opportunity.opportunityNumber}`,
    `Title: ${opportunity.title}`,
    `Customer: ${opportunity.customerName || opportunity.company || 'Customer'}`,
    `Stage: ${labelizeEnum(opportunity.stage)}`,
    `Expected value: ${formatMoney(toNumber(opportunity.expectedValue), organization.currencyCode)}`,
    `Probability: ${toNumber(opportunity.probabilityPercent).toFixed(0)}%`,
    opportunity.expectedCloseDate
      ? `Expected close: ${formatDateOnly(opportunity.expectedCloseDate)}`
      : '',
    opportunity.notes ? `Notes: ${opportunity.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function moduleFallbackTitle(queryKey: string) {
  const titles: Record<string, string> = {
    'accounting-summary': 'Accounting',
    'commercial-summary': 'Invoicing',
    'crm-summary': 'CRM',
    'customers-summary': 'Customers',
    'procurement-summary': 'Procurement',
  };
  return titles[queryKey] ?? 'ERP Module';
}

function moduleMetricIcon(index: number, fallbackIcon: string) {
  const icons = ['bi-list-check', 'bi-clock-history', 'bi-cash-stack', 'bi-graph-up-arrow'];
  return icons[index] ?? fallbackIcon;
}

function moduleMetricTone(index: number) {
  const tones = ['green', 'blue', 'orange', 'purple'];
  return tones[index % tones.length];
}

function formatModuleMetricValue(metric: ModuleSummary['metrics'][number], currencyCode: string) {
  const numericValue = Number(metric.value);
  if (
    Number.isFinite(numericValue) &&
    metric.value.includes('.') &&
    !metric.label.toLowerCase().includes('count')
  ) {
    return formatMoney(numericValue, currencyCode);
  }
  return metric.value;
}

function moduleStatusTone(status: string): 'posted' | 'review' | 'pending' {
  const normalized = status.toUpperCase();
  if (
    [
      'CANCELLED',
      'CREDIT_HOLD',
      'DISMISSED',
      'FAILED',
      'INACTIVE',
      'LOST',
      'OVERDUE',
      'REJECTED',
      'VOID',
    ].some((token) => normalized.includes(token))
  ) {
    return 'pending';
  }

  if (
    [
      'ACCEPTED',
      'ACTIVE',
      'APPROVED',
      'CLOSED',
      'CONNECTED',
      'DONE',
      'FULFILLED',
      'INVOICED',
      'PAID',
      'POSTED',
      'PROCESSED',
      'READ',
      'WON',
    ].some((token) => normalized.includes(token))
  ) {
    return 'posted';
  }

  return 'review';
}

function auditMetadataPreview(event: AuditEvent) {
  if (!event.metadataJson) {
    return '';
  }

  try {
    const metadata = JSON.parse(event.metadataJson) as Record<string, unknown>;
    return Object.entries(metadata)
      .slice(0, 2)
      .map(([key, value]) => `${labelizeEnum(key)}: ${String(value)}`)
      .join(', ');
  } catch {
    return event.metadataJson;
  }
}

type DashboardProps = {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
};

function Dashboard({ branches, currentUser, organization }: DashboardProps) {
  const { branchId: platformBranchId } = usePlatform();
  const navigate = useNavigate();
  const salesGradientId = useId();
  const showProfit = canViewProfit(currentUser);
  const canViewStockAdjustments = hasAnyPermission(currentUser, [
    'admin:manage',
    'inventory:adjust',
    'reports:view',
  ]);
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => getSales(),
    refetchOnMount: 'always',
  });
  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
    refetchOnMount: 'always',
  });
  const stockAdjustmentSummaryQuery = useQuery({
    queryKey: ['stock-adjustments', 'summary'],
    queryFn: getStockAdjustmentSummary,
    enabled: canViewStockAdjustments,
    refetchOnMount: 'always',
  });
  const scopedAdjustmentsQuery = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: getStockAdjustments,
    enabled: canViewStockAdjustments && Boolean(platformBranchId),
  });
  const inventory = inBranch(inventoryQuery.data ?? [], platformBranchId);
  const sales = inBranch(salesQuery.data ?? [], platformBranchId);
  const expenses = inBranch(expensesQuery.data ?? [], platformBranchId);
  const stockAdjustmentSummary = platformBranchId
    ? stockAdjustmentSummaryFromAdjustments(
        inBranch(scopedAdjustmentsQuery.data ?? [], platformBranchId),
      )
    : (stockAdjustmentSummaryQuery.data ?? emptyStockAdjustmentSummary());
  const todayRange = reportPeriodRange('today');
  const dashboardSales = sales.filter((sale) => isWithinReportRange(sale.soldAt, todayRange));
  const dashboardExpenses = expenses.filter((expense) =>
    isWithinReportRange(expense.incurredAt, todayRange),
  );
  const dashboardInventory = inventory;
  const totalSales = salesTotal(dashboardSales);
  const grossProfit = grossProfitFromSales(dashboardSales);
  const totalExpenses = expensesTotal(
    dashboardExpenses.filter((expense) => expense.status !== 'VOID'),
  );
  const dashboardMetrics = dashboardMetricCards(
    totalSales,
    grossProfit,
    totalExpenses,
    grossProfit - totalExpenses,
  ).filter((metric) => showProfit || !metric.profitOnly);
  const dashboardSalesTrend = dashboardSalesTrendFromSales(dashboardSales);
  const paymentMethodTotals = paymentMethodTotalsFromSales(dashboardSales);
  const paymentColors: Record<string, string> = {
    'M-Pesa': '#16a76a',
    Cash: '#2563eb',
    Card: '#f5b916',
  };
  const dashboardPayments = paymentMethodTotals.map((payment) => ({
    ...payment,
    color: paymentColors[payment.name] ?? payment.color,
  }));
  const dashboardDate = new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: organization.timeZone,
  }).format(new Date());
  const canOpenPos = canAccessPath(currentUser, '/pos');
  const canOpenCrm = canAccessPath(currentUser, '/crm');
  const lowStockItems = dashboardInventory.filter((item) => item.stockHealth !== 'HEALTHY');
  const dashboardShortcuts = [
    {
      label: 'New Sale',
      detail: 'Open POS',
      icon: 'bi-bag-check',
      to: '/pos',
    },
    {
      label: 'Add Stock',
      detail: 'Receive items',
      icon: 'bi-box-arrow-in-down',
      to: '/add-stock',
    },
    {
      label: 'Products',
      detail: 'Catalog',
      icon: 'bi-tags',
      to: '/product-catalog',
    },
    {
      label: 'Reports',
      detail: 'Business view',
      icon: 'bi-file-earmark-text',
      to: '/reports',
    },
  ].filter((shortcut) => canAccessPath(currentUser, shortcut.to));
  const isExportDisabled =
    !showProfit ||
    inventoryQuery.isPending ||
    salesQuery.isPending ||
    expensesQuery.isPending ||
    (canViewStockAdjustments && stockAdjustmentSummaryQuery.isPending);

  return (
    <section className="dashboard-grid">
      <div className="dashboard-hero">
        <div className="dashboard-hero-meta">
          <span>
            <span className="dashboard-brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {organization.name}
            <span className="dashboard-meta-divider" />
            Business overview
          </span>
          <time dateTime={todayInputValue()}>{dashboardDate}</time>
        </div>
        <PageHeader
          eyebrow="A CLEAR VIEW. A STRONGER BUSINESS."
          title="Today's Dashboard"
          subtitle="Your sales, your people, your next opportunity. Everything you need to move your business forward."
          action={
            showProfit ? (
              <div className="header-actions">
                <button
                  className="primary-action compact-action dashboard-export"
                  type="button"
                  disabled={isExportDisabled}
                  onClick={() =>
                    exportDashboardCsv({
                      contribution: grossProfit - totalExpenses,
                      currencyCode: organization.currencyCode,
                      grossProfit,
                      lowStockItems,
                      paymentMethodTotals,
                      scope: 'Shop',
                      stockAdjustmentSummary,
                      totalExpenses,
                      totalSales,
                      transactions: dashboardSales.length,
                    })
                  }
                >
                  <i className="bi bi-download" aria-hidden="true" />
                  Export
                </button>
              </div>
            ) : undefined
          }
        />
        <div className="dashboard-hero-actions">
          <button
            className="dashboard-yellow-action"
            type="button"
            onClick={() => navigate(canOpenPos ? '/pos' : '/inventory')}
          >
            {canOpenPos ? 'Start a sale' : 'Review inventory'}
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </button>
          {canOpenCrm ? (
            <button className="dashboard-hero-link" type="button" onClick={() => navigate('/crm')}>
              Build customer relationships
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="dashboard-hero-art" aria-hidden="true">
          <span className="dashboard-art-orbit" />
          <span className="dashboard-art-orbit orbit-two" />
          <div className="dashboard-art-arrows">
            <i className="bi bi-arrow-up" />
            <i className="bi bi-arrow-up" />
            <i className="bi bi-arrow-up" />
          </div>
          <span className="dashboard-art-caption">
            <i className="bi bi-check-circle-fill" />
            Ready for your next move
          </span>
        </div>
        <div className="dashboard-hero-footer">
          <span>
            <i className="bi bi-shop" aria-hidden="true" />
            {branches.filter((branch) => branch.status === 'ACTIVE').length} active{' '}
            {branches.filter((branch) => branch.status === 'ACTIVE').length === 1
              ? 'branch'
              : 'branches'}
          </span>
          <span>
            <i className="bi bi-receipt" aria-hidden="true" />
            {dashboardSales.length} {dashboardSales.length === 1 ? 'transaction' : 'transactions'}{' '}
            today
          </span>
          <span className="dashboard-hero-footer-note">Make today a good day for business.</span>
        </div>
      </div>

      {dashboardShortcuts.length > 0 ? (
        <div className="dashboard-action-strip" aria-label="Quick actions">
          {dashboardShortcuts.map((shortcut) => (
            <button
              className="dashboard-action"
              key={shortcut.to}
              type="button"
              onClick={() => navigate(shortcut.to)}
            >
              <i className={`bi ${shortcut.icon}`} aria-hidden="true" />
              <span>
                <strong>{shortcut.label}</strong>
                <small>{shortcut.detail}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={formatMoney(metric.value, organization.currencyCode)}
            detail={metric.detail}
            comparison={metric.comparison}
            icon={metric.icon}
            tone={metric.tone}
            negative={metric.negative}
          />
        ))}
      </div>

      <div className="dashboard-chart-grid">
        <section className="chart-panel sales-trend-panel">
          <p className="dashboard-section-kicker">EVERY SALE TELLS A STORY</p>
          <PanelHeader icon="bi-bar-chart-fill" title="Today's Sales Performance" tone="blue" />
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dashboardSalesTrend}
                barCategoryGap="38%"
                margin={{ left: 18, right: 28, top: 14, bottom: 2 }}
              >
                <defs>
                  <linearGradient id={salesGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#21c4e8" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8eef6" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#1f2937', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#8c97a5' }}
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="amount"
                  allowDecimals={false}
                  tickFormatter={(value) =>
                    formatMoneyTick(Number(value), organization.currencyCode)
                  }
                  tick={{ fill: '#243b57', fontSize: 12, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#8c97a5' }}
                  tickMargin={10}
                  width={82}
                />
                <Tooltip
                  cursor={{ fill: '#eef4ff' }}
                  formatter={(value) => formatMoney(Number(value), organization.currencyCode)}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{
                    border: '1px solid #cdd8e5',
                    borderRadius: 8,
                    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
                  }}
                />
                <Bar
                  yAxisId="amount"
                  dataKey="netSales"
                  fill={`url(#${salesGradientId})`}
                  name="Net Sales"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={52}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="amount"
                  type="linear"
                  dataKey="cumulativeSales"
                  name="Running Total"
                  stroke="#16a76a"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ffffff', stroke: '#16a76a', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#ffffff', stroke: '#16a76a', strokeWidth: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-row chart-legend-bottom">
            <span>
              <i className="legend-dot sales" aria-hidden="true" />
              Net Sales
            </span>
            <span>
              <i className="legend-dot cumulative" aria-hidden="true" />
              Running Total
            </span>
          </div>
        </section>

        <section className="chart-panel payment-panel">
          <p className="dashboard-section-kicker">HOW YOUR CUSTOMERS PAY</p>
          <PanelHeader
            icon="bi-credit-card-2-front-fill"
            title="Sales by Payment Method"
            tone="green"
          />
          {salesQuery.isPending ? (
            <LoadingPanel label="Loading payment totals..." />
          ) : (
            <DonutChart
              centerValue={formatMoney(totalSales, organization.currencyCode)}
              centerLabel="Total Sales"
              currencyCode={organization.currencyCode}
              data={dashboardPayments}
            />
          )}
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="panel-card alerts-panel">
          <PanelHeader
            icon="bi-exclamation-triangle-fill"
            title="Attention Needed"
            tone="orange"
            action={
              <button className="text-button" type="button" onClick={() => navigate('/inventory')}>
                View All
              </button>
            }
          />
          {inventoryQuery.isPending ? (
            <LoadingPanel label="Loading alerts..." />
          ) : lowStockItems.length === 0 ? (
            <EmptyState
              icon="bi-check-circle"
              title="No attention items"
              detail="Inventory and approval alerts will appear here."
            />
          ) : (
            lowStockItems.slice(0, 3).map((item) => (
              <button
                className="alert-row"
                type="button"
                key={item.id}
                aria-label={`Open inventory for ${item.productName}`}
                onClick={() => navigate('/inventory')}
              >
                <span>
                  <i className="bi bi-box-seam" aria-hidden="true" />
                </span>
                <strong>{item.productName}</strong>
                <small>{stockHealthLabel(item.stockHealth)}</small>
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            ))
          )}
        </section>

        <section className="panel-card products-panel">
          <PanelHeader
            icon="bi-cart-fill"
            title="Top Products"
            action={
              hasPermission(currentUser, 'admin:manage') ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => navigate('/product-catalog')}
                >
                  View All Products
                </button>
              ) : undefined
            }
          />
          <ProductRankingTable
            organization={organization}
            sales={dashboardSales}
            showProfit={showProfit}
          />
        </section>

        {canViewStockAdjustments ? (
          <section className="panel-card loss-panel">
            <PanelHeader
              icon="bi-box-fill"
              title="Loss & Excess Summary"
              action={<span className="inventory-panel-count">All counts</span>}
            />
            {stockAdjustmentSummaryQuery.isPending ? (
              <LoadingPanel label="Loading loss summary..." />
            ) : stockAdjustmentSummaryQuery.isError ? (
              <EmptyState
                icon="bi-exclamation-circle"
                title="Loss summary unavailable"
                detail="Refresh the dashboard after the API is available."
              />
            ) : (
              <>
                <div className="loss-grid">
                  <div>
                    <span className="icon-tile red">
                      <i className="bi bi-shield-exclamation" aria-hidden="true" />
                    </span>
                    <small>Total Losses</small>
                    <strong>
                      {formatMoney(
                        stockAdjustmentSummary.totalLossValue,
                        organization.currencyCode,
                      )}
                    </strong>
                    <em>
                      {formatQuantity(stockAdjustmentSummary.totalLossQuantity)} units across{' '}
                      {stockAdjustmentSummary.lossItems} counts
                    </em>
                  </div>
                  <div>
                    <span className="icon-tile green">
                      <i className="bi bi-lock-fill" aria-hidden="true" />
                    </span>
                    <small>Total Excess</small>
                    <strong>
                      {formatMoney(
                        stockAdjustmentSummary.totalExcessValue,
                        organization.currencyCode,
                      )}
                    </strong>
                    <em>
                      {formatQuantity(stockAdjustmentSummary.totalExcessQuantity)} units across{' '}
                      {stockAdjustmentSummary.excessItems} counts
                    </em>
                  </div>
                </div>
                <div className="info-strip">
                  <i className="bi bi-info-circle-fill" aria-hidden="true" />
                  <span>
                    Net position:{' '}
                    {formatMoney(stockAdjustmentSummary.netValue, organization.currencyCode)}
                  </span>
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}

type SalesTrendInterval = 'daily' | 'weekly';

function dashboardMetricCards(
  netSales: number,
  grossProfit: number,
  expenses: number,
  contribution: number,
) {
  return ownerMetrics.map((metric) => ({
    ...metric,
    negative:
      metric.negative ||
      (metric.label === 'Estimated Contribution' && contribution < 0) ||
      (metric.label === 'Gross Profit' && grossProfit < 0),
    value:
      metric.label === 'Net Sales'
        ? netSales
        : metric.label === 'Gross Profit'
          ? grossProfit
          : metric.label === 'Expenses'
            ? expenses
            : contribution,
  }));
}

function salesTotal(sales: Sale[]) {
  return sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
}

function grossProfitFromSales(sales: Sale[]) {
  return sales.reduce(
    (saleSum, sale) =>
      saleSum + sale.lines.reduce((lineSum, line) => lineSum + saleLineGrossProfit(line), 0),
    0,
  );
}

function saleLineGrossProfit(line: Sale['lines'][number]) {
  return (line.unitPrice - (line.costPrice ?? line.unitPrice)) * line.quantity;
}

function dashboardSalesTrendFromSales(sales: Sale[]) {
  if (sales.length === 0) {
    return [{ day: 'Current', netSales: 0, cumulativeSales: 0 }];
  }

  const rowsByHour = new Map<string, { sortKey: number; day: string; netSales: number }>();
  for (const sale of sales) {
    const soldAt = new Date(sale.soldAt);
    if (Number.isNaN(soldAt.getTime())) {
      continue;
    }

    const hourStart = new Date(soldAt);
    hourStart.setMinutes(0, 0, 0);
    const hourKey = `${dateInputValue(hourStart)}-${hourStart.getHours()}`;
    const existing = rowsByHour.get(hourKey);
    if (existing) {
      existing.netSales += sale.totalAmount;
      continue;
    }

    rowsByHour.set(hourKey, {
      sortKey: hourStart.getTime(),
      day: new Intl.DateTimeFormat('en-KE', { hour: 'numeric' }).format(hourStart),
      netSales: sale.totalAmount,
    });
  }

  if (rowsByHour.size === 0) {
    return [{ day: 'Current', netSales: 0, cumulativeSales: 0 }];
  }

  let cumulativeSales = 0;
  return [...rowsByHour.values()]
    .sort((first, second) => first.sortKey - second.sortKey)
    .map(({ day, netSales }) => {
      cumulativeSales += netSales;
      return { day, netSales, cumulativeSales };
    });
}

function salesTrendFromSales(sales: Sale[], interval: SalesTrendInterval = 'daily') {
  if (sales.length === 0) {
    return [{ day: 'Current', netSales: 0, grossProfit: 0, cumulativeSales: 0 }];
  }

  const rowsByDay = new Map<
    string,
    { sortKey: number; day: string; netSales: number; grossProfit: number }
  >();
  for (const sale of sales) {
    const soldAt = new Date(sale.soldAt);
    const periodDate = interval === 'weekly' ? startOfWeek(soldAt) : soldAt;
    const dayKey = dateInputValue(periodDate);
    const existing = rowsByDay.get(dayKey);
    if (existing) {
      existing.netSales += sale.totalAmount;
      existing.grossProfit += grossProfitFromSales([sale]);
      continue;
    }

    rowsByDay.set(dayKey, {
      sortKey: periodDate.getTime(),
      day: new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(periodDate),
      netSales: sale.totalAmount,
      grossProfit: grossProfitFromSales([sale]),
    });
  }

  let cumulativeSales = 0;
  return [...rowsByDay.values()]
    .sort((first, second) => first.sortKey - second.sortKey)
    .slice(interval === 'weekly' ? -8 : -7)
    .map(({ day, netSales, grossProfit }) => {
      cumulativeSales += netSales;
      return { day, netSales, grossProfit, cumulativeSales };
    });
}

function reportSalesTrendRowsFromSales(sales: Sale[], range: ReportDateRange) {
  const normalizedRange = normalizeReportDateRange(range);
  const fromDate = normalizedRange.from
    ? dateInputToLocalDate(normalizedRange.from)
    : startOfLocalDay(new Date());
  const toDate = normalizedRange.to
    ? dateInputToLocalDate(normalizedRange.to)
    : startOfLocalDay(fromDate);
  const rowsByDay = new Map<
    string,
    { day: string; grossProfit: number; retailSales: number; sortKey: number }
  >();

  for (
    let cursor = startOfLocalDay(fromDate);
    cursor.getTime() <= endOfLocalDay(toDate).getTime();
    cursor = addLocalDays(cursor, 1)
  ) {
    rowsByDay.set(dateInputValue(cursor), {
      day: new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(cursor),
      grossProfit: 0,
      retailSales: 0,
      sortKey: cursor.getTime(),
    });
  }

  for (const sale of sales) {
    const soldAt = new Date(sale.soldAt);
    if (Number.isNaN(soldAt.getTime())) {
      continue;
    }

    const dayKey = dateInputValue(soldAt);
    const existing = rowsByDay.get(dayKey);
    if (!existing) {
      continue;
    }

    existing.retailSales += sale.totalAmount;
    existing.grossProfit += grossProfitFromSales([sale]);
  }

  return [...rowsByDay.values()].sort((first, second) => first.sortKey - second.sortKey);
}

function startOfWeek(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function paymentMethodTotalsFromSales(sales: Sale[]) {
  const totals = new Map<PaymentMethod, number>(
    paymentMethodOptions.map((option) => [option.method, 0]),
  );

  for (const sale of sales) {
    for (const payment of sale.payments) {
      totals.set(payment.method, (totals.get(payment.method) ?? 0) + payment.amount);
    }
  }

  const totalPayments = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return paymentMethodOptions.map((option) => {
    const value = totals.get(option.method) ?? 0;
    return {
      name: option.label,
      value,
      percent: totalPayments > 0 ? Math.round((value / totalPayments) * 100) : 0,
      color: option.color,
    };
  });
}

function branchPerformanceFromSales(branches: Branch[], sales: Sale[]) {
  return branches.map((branch) => {
    const branchSales = sales.filter((sale) => sale.branchId === branch.id);
    const netSales = salesTotal(branchSales);
    return {
      branch,
      grossProfit: grossProfitFromSales(branchSales),
      netSales,
      transactions: branchSales.length,
      averageBasket: branchSales.length > 0 ? netSales / branchSales.length : 0,
    };
  });
}

function emptyStockAdjustmentSummary(): StockAdjustmentSummary {
  return {
    lossItems: 0,
    excessItems: 0,
    totalLossQuantity: 0,
    totalExcessQuantity: 0,
    totalLossValue: 0,
    totalExcessValue: 0,
    netValue: 0,
  };
}

function stockAdjustmentSummaryFromAdjustments(
  stockAdjustments: StockAdjustment[],
): StockAdjustmentSummary {
  return stockAdjustments.reduce<StockAdjustmentSummary>((summary, adjustment) => {
    if (adjustment.varianceQuantity < 0) {
      return {
        ...summary,
        lossItems: summary.lossItems + 1,
        totalLossQuantity: summary.totalLossQuantity + Math.abs(adjustment.varianceQuantity),
        totalLossValue: summary.totalLossValue + adjustment.lossValue,
        netValue: summary.netValue - adjustment.lossValue,
      };
    }

    if (adjustment.varianceQuantity > 0) {
      return {
        ...summary,
        excessItems: summary.excessItems + 1,
        totalExcessQuantity: summary.totalExcessQuantity + adjustment.varianceQuantity,
        totalExcessValue: summary.totalExcessValue + adjustment.excessValue,
        netValue: summary.netValue + adjustment.excessValue,
      };
    }

    return summary;
  }, emptyStockAdjustmentSummary());
}

function buildReportSummary(
  branches: Branch[],
  sales: Sale[],
  expenses: Expense[],
  inventory: InventoryItem[],
  stockIntakes: StockIntake[] = [],
  stockAdjustments: StockAdjustment[] = [],
) {
  const nonVoidedExpenses = expenses.filter((expense) => expense.status !== 'VOID');
  const stockAdjustmentRows = [...stockAdjustments].sort(
    (first, second) => Date.parse(second.adjustedAt) - Date.parse(first.adjustedAt),
  );
  const stockAdjustmentSummary = stockAdjustmentSummaryFromAdjustments(stockAdjustmentRows);
  const totalSales = salesTotal(sales);
  const grossProfit = grossProfitFromSales(sales);
  const expenseTotal = expensesTotal(nonVoidedExpenses);
  const totalItems = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );
  const totalStockValue = inventory.reduce(
    (sum, item) => sum + item.quantityOnHand * item.unitPrice,
    0,
  );
  const lowStockItems = inventory.filter((item) => item.stockHealth === 'LOW_STOCK');
  const outOfStockItems = inventory.filter((item) => item.stockHealth === 'OUT_OF_STOCK');
  const categoryRows = salesCategoryRows(sales);
  const receivedUnits = stockIntakes.reduce((sum, intake) => sum + intake.quantity, 0);
  const receivedValue = stockIntakes.reduce(
    (sum, intake) => sum + intake.quantity * intake.unitCost,
    0,
  );
  const activityRows = reportMixRows([
    { name: 'Sales receipts', value: sales.length, color: '#2878f0' },
    { name: 'Expense entries', value: nonVoidedExpenses.length, color: '#7357e8' },
    { name: 'Stock receipts', value: stockIntakes.length, color: '#9db8d5' },
    { name: 'Stock counts', value: stockAdjustmentRows.length, color: '#e93445' },
  ]);
  const stockMovementRows = reportMixRows([
    { name: 'Units sold', value: totalItems, color: '#2878f0' },
    { name: 'Units received', value: receivedUnits, color: '#7357e8' },
    {
      name: 'Shortage units',
      value: stockAdjustmentSummary.totalLossQuantity,
      color: '#e93445',
    },
    {
      name: 'Excess units',
      value: stockAdjustmentSummary.totalExcessQuantity,
      color: '#22a567',
    },
    {
      name: 'Priority restock',
      value: lowStockItems.length + outOfStockItems.length,
      color: '#e93445',
    },
  ]);

  return {
    activityRows,
    activityTotal: activityRows.reduce((sum, row) => sum + row.value, 0),
    branchSalesRows: branchSalesReportRows(branches, sales),
    branchRows: branchPerformanceFromSales(branches, sales).sort(
      (first, second) => second.netSales - first.netSales,
    ),
    categoryRows,
    categoryRowsTotal: categoryRows.reduce((sum, row) => sum + row.value, 0),
    contribution: grossProfit - expenseTotal,
    expenseRows: expenseCategoryRows(nonVoidedExpenses),
    expenseReportRows: expenseReportRows(nonVoidedExpenses),
    expenses,
    expenseTotal,
    grossProfit,
    inventory,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    paymentTotals: paymentMethodTotalsFromSales(sales),
    productRows: productSalesRows(sales),
    receivedUnits,
    receivedValue,
    restockRows: restockReportRows(inventory),
    saleLineRows: saleLineReportRows(sales),
    sales,
    salesTrend: salesTrendFromSales(sales),
    stockAdjustments: stockAdjustmentRows,
    stockAdjustmentSummary,
    stockIntakes,
    stockMovementRows,
    stockMovementTotal: stockMovementRows.reduce((sum, row) => sum + row.value, 0),
    supplierRows: supplierReportRows(stockIntakes),
    totalItems,
    totalSales,
    totalStockValue,
    transactions: sales.length,
  };
}

function reportMetricCards(
  summary: ReturnType<typeof buildReportSummary>,
  organization: Organization,
) {
  const margin =
    summary.totalSales > 0 ? Math.round((summary.contribution / summary.totalSales) * 100) : 0;

  return [
    {
      label: 'Net Sales',
      value: formatMoney(summary.totalSales, organization.currencyCode),
      detail: String(summary.transactions),
      comparison: 'transactions',
      tone: 'blue',
      icon: 'bi-bar-chart-fill',
    },
    {
      label: 'Gross Profit',
      value: formatMoney(summary.grossProfit, organization.currencyCode),
      detail: String(summary.productRows.length),
      comparison: 'products sold',
      tone: 'blue',
      icon: 'bi-database',
    },
    {
      label: 'Expenses',
      value: formatMoney(summary.expenseTotal, organization.currencyCode),
      detail: String(summary.expenseRows.length),
      comparison: 'categories',
      tone: 'orange',
      icon: 'bi-wallet2',
      negative: summary.expenseTotal > 0,
    },
    {
      label: 'Contribution',
      value: formatMoney(summary.contribution, organization.currencyCode),
      detail: `${margin}%`,
      comparison: 'margin',
      tone: summary.contribution >= 0 ? 'purple' : 'red',
      icon: 'bi-pie-chart',
      negative: summary.contribution < 0,
    },
  ];
}

function salesCategoryRows(sales: Sale[]) {
  const colors = ['#2878f0', '#ff8a1f', '#7357e8', '#e93445', '#64748b', '#9db8d5'];
  const totals = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      totals.set(line.categoryName, (totals.get(line.categoryName) ?? 0) + line.lineTotal);
    }
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()]
    .map(([name, value], index) => ({
      color: colors[index % colors.length],
      name,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      value,
    }))
    .sort((first, second) => second.value - first.value);
}

function expenseCategoryRows(expenses: Expense[]) {
  const colors = ['#ff8a1f', '#2878f0', '#7357e8', '#e93445', '#64748b', '#9db8d5'];
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  }

  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()]
    .map(([category, amount], index) => ({
      amount,
      category,
      color: colors[index % colors.length],
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((first, second) => second.amount - first.amount);
}

function expensesTotal(expenses: Expense[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function reportPeriodRange(period: ReportPeriod): ReportDateRange {
  const today = startOfLocalDay(new Date());
  const yesterday = addLocalDays(today, -1);

  if (period === 'today') {
    return { from: dateInputValue(today), to: dateInputValue(today) };
  }

  if (period === 'yesterday') {
    return { from: dateInputValue(yesterday), to: dateInputValue(yesterday) };
  }

  if (period === 'week') {
    return { from: dateInputValue(startOfWeek(today)), to: dateInputValue(today) };
  }

  const firstMonthDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: dateInputValue(firstMonthDay), to: dateInputValue(today) };
}

function normalizeReportDateRange(range: ReportDateRange): ReportDateRange {
  if (!range.from || !range.to) {
    return range;
  }

  return Date.parse(range.from) > Date.parse(range.to) ? { from: range.to, to: range.from } : range;
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatReportDateInput(value: string) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
  }).format(dateInputToLocalDate(value));
}

function startOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfLocalDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function addLocalDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function matchesReportBranch(branchId: string, selectedBranchId: string) {
  return !selectedBranchId || branchId === selectedBranchId;
}

function isWithinReportRange(value: string, range: ReportDateRange) {
  const time = new Date(value).getTime();
  if (range.from && time < startOfLocalDay(dateInputToLocalDate(range.from)).getTime()) {
    return false;
  }
  if (range.to && time > endOfLocalDay(dateInputToLocalDate(range.to)).getTime()) {
    return false;
  }
  return true;
}

function isStoreBranch(branch: Branch) {
  const label = `${branch.name} ${branch.code}`.toLowerCase();
  return label.includes('store') || label.includes('warehouse');
}

function reportMixRows(items: { name: string; value: number; color: string }[]) {
  const activeItems = items.filter((item) => item.value > 0);
  const total = activeItems.reduce((sum, item) => sum + item.value, 0);
  return activeItems.map((item) => ({
    ...item,
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));
}

function branchSalesReportRows(branches: Branch[], sales: Sale[]) {
  const rows = branches
    .map((branch) => {
      const branchSales = sales.filter((sale) => sale.branchId === branch.id);
      const unitsSold = branchSales.reduce(
        (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
        0,
      );
      return {
        branch,
        grossProfit: grossProfitFromSales(branchSales),
        productLines: branchSales.reduce((sum, sale) => sum + sale.lines.length, 0),
        receipts: branchSales.length,
        salesAmount: salesTotal(branchSales),
        unitsSold,
      };
    })
    .sort((first, second) => second.salesAmount - first.salesAmount);
  const activeRows = rows.filter(
    (row) => row.receipts > 0 || row.productLines > 0 || row.unitsSold > 0 || row.salesAmount > 0,
  );
  return activeRows.length > 0 ? activeRows : rows;
}

function saleLineReportRows(sales: Sale[]) {
  return sales
    .flatMap((sale) => {
      const subtotal = sale.lines.reduce((sum, line) => sum + line.lineTotal, 0);
      return sale.lines.map((line, index) => {
        const discountAmount = subtotal > 0 ? sale.discountAmount * (line.lineTotal / subtotal) : 0;
        return {
          branchName: sale.branchName,
          discountAmount,
          grossProfit: saleLineGrossProfit(line) - discountAmount,
          id: `${sale.id}-${line.productId}-${index}`,
          productName: line.productName,
          quantity: line.quantity,
          receipt: sale.saleNumber,
          soldAt: sale.soldAt,
          totalAmount: line.lineTotal - discountAmount,
          unitPrice: line.unitPrice,
        };
      });
    })
    .sort((first, second) => Date.parse(second.soldAt) - Date.parse(first.soldAt));
}

function supplierReportRows(stockIntakes: StockIntake[]) {
  const rows = new Map<
    string,
    {
      amount: number;
      latestAt: string;
      productIds: Set<string>;
      receipts: number;
      supplierName: string;
      totalItems: number;
    }
  >();

  for (const intake of stockIntakes) {
    const supplierName = intake.supplierName || 'Unknown supplier';
    const existing = rows.get(supplierName) ?? {
      amount: 0,
      latestAt: intake.receivedAt,
      productIds: new Set<string>(),
      receipts: 0,
      supplierName,
      totalItems: 0,
    };

    existing.amount += intake.quantity * intake.unitCost;
    existing.latestAt =
      Date.parse(intake.receivedAt) > Date.parse(existing.latestAt)
        ? intake.receivedAt
        : existing.latestAt;
    existing.productIds.add(intake.productId);
    existing.receipts += 1;
    existing.totalItems += intake.quantity;
    rows.set(supplierName, existing);
  }

  return [...rows.values()]
    .map((row) => ({ ...row, products: row.productIds.size }))
    .sort((first, second) => second.amount - first.amount);
}

function restockReportRows(inventory: InventoryItem[]) {
  return inventory
    .filter((item) => item.stockHealth !== 'HEALTHY' || item.quantityAvailable <= item.reorderLevel)
    .map((item) => ({
      branchName: item.branchName,
      productId: item.productId,
      productName: item.productName,
      quantityAvailable: item.quantityAvailable,
      reorderLevel: item.reorderLevel,
      restockQty: Math.max(0, item.reorderLevel - item.quantityAvailable),
      sku: item.sku,
      stockHealth: item.stockHealth,
    }))
    .sort((first, second) => second.restockQty - first.restockQty);
}

function expenseReportRows(expenses: Expense[]) {
  const categoryRows = expenseCategoryRows(expenses);
  return categoryRows.map((row) => {
    const categoryExpenses = expenses.filter((expense) => expense.category === row.category);
    const latestExpense = categoryExpenses
      .slice()
      .sort((first, second) => Date.parse(second.incurredAt) - Date.parse(first.incurredAt))[0];
    return {
      ...row,
      entries: categoryExpenses.length,
      latestAt: latestExpense?.incurredAt ?? '',
    };
  });
}

function reportOverviewCards(
  summary: ReturnType<typeof buildReportSummary>,
  organization: Organization,
) {
  return [
    {
      detail: `${summary.transactions} receipts`,
      icon: 'bi-cart-check',
      label: 'Sales amount',
      tone: 'blue',
      value: formatMoney(summary.totalSales, organization.currencyCode),
    },
    {
      detail: `${formatQuantity(summary.totalItems)} items sold`,
      icon: 'bi-graph-up-arrow',
      label: 'Gross profit',
      tone: 'purple',
      value: formatMoney(summary.grossProfit, organization.currencyCode),
    },
    {
      detail: `${summary.expenseReportRows.length} categories`,
      icon: 'bi-wallet2',
      label: 'Cash expenses',
      tone: 'orange',
      value: formatMoney(summary.expenseTotal, organization.currencyCode),
    },
    {
      detail: 'Gross profit less expenses',
      icon: 'bi-cash-stack',
      label: 'Net position',
      tone: summary.contribution >= 0 ? 'blue' : 'red',
      value: formatMoney(summary.contribution, organization.currencyCode),
    },
    {
      detail: `${summary.stockIntakes.length} receipts`,
      icon: 'bi-box-arrow-in-down',
      label: 'Inventory received',
      tone: 'orange',
      value: formatMoney(summary.receivedValue, organization.currencyCode),
    },
    {
      detail: `${summary.stockAdjustmentSummary.lossItems} loss / ${summary.stockAdjustmentSummary.excessItems} excess`,
      icon: 'bi-shield-exclamation',
      label: 'Stock variance net',
      tone: summary.stockAdjustmentSummary.netValue >= 0 ? 'blue' : 'red',
      value: formatMoney(summary.stockAdjustmentSummary.netValue, organization.currencyCode),
    },
    {
      detail: `${summary.inventory.length} stock rows`,
      icon: 'bi-box-seam',
      label: 'Stock value',
      tone: 'purple',
      value: formatMoney(summary.totalStockValue, organization.currencyCode),
    },
  ];
}

function financialReportRows(
  summary: ReturnType<typeof buildReportSummary>,
  organization: Organization,
) {
  const rows = [
    { color: '#2878f0', label: 'Income', amount: summary.totalSales },
    { color: '#2878f0', label: 'Gross profit', amount: summary.grossProfit },
    { color: '#ff8a1f', label: 'Cash expenses', amount: summary.expenseTotal },
    {
      color: summary.contribution >= 0 ? '#9db8d5' : '#e93445',
      label: 'Net position',
      amount: summary.contribution,
    },
  ];
  const maxAmount = Math.max(1, ...rows.map((row) => Math.abs(row.amount)));
  return rows.map((row) => ({
    color: row.color,
    label: row.label,
    value: formatMoney(row.amount, organization.currencyCode),
    width: Math.max(3, (Math.abs(row.amount) / maxAmount) * 100),
  }));
}

function recentReportsFromSummary(summary: ReturnType<typeof buildReportSummary>) {
  const latestSale = summary.sales[0];
  const latestExpense = summary.expenses[0];

  return [
    {
      title: 'Sales Summary',
      date: latestSale ? formatDateTime(latestSale.soldAt) : 'Current snapshot',
      icon: 'bi-bar-chart-fill',
      tone: 'blue',
      type: 'sales',
    },
    {
      title: 'Expenses',
      date: latestExpense ? formatDateTime(latestExpense.incurredAt) : 'Current snapshot',
      icon: 'bi-cash-coin',
      tone: 'orange',
      type: 'expenses',
    },
    {
      title: 'Product Sales',
      date: `${summary.productRows.length} products`,
      icon: 'bi-tag-fill',
      tone: 'blue',
      type: 'products',
    },
    {
      title: 'Shop Snapshot',
      date: `${summary.transactions} transactions`,
      icon: 'bi-shop-window',
      tone: 'purple',
      type: 'shop',
    },
    {
      title: 'Inventory Health',
      date: `${summary.lowStockCount + summary.outOfStockCount} alerts`,
      icon: 'bi-box-fill',
      tone: 'red',
      type: 'inventory',
    },
  ];
}

type SupplierFormState = SupplierRequest;

function defaultSupplierForm(): SupplierFormState {
  return {
    name: '',
    supplierCode: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    kraPin: '',
    paymentTerms: '',
    creditLimit: 0,
    bankDetails: '',
    productsSupplied: '',
    outstandingBalance: 0,
    notes: '',
    status: 'ACTIVE',
  };
}

function supplierToRequest(supplier: Supplier): SupplierFormState {
  return {
    name: supplier.name,
    supplierCode: supplier.supplierCode ?? '',
    companyName: supplier.companyName ?? '',
    contactPerson: supplier.contactPerson ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    kraPin: supplier.kraPin ?? '',
    paymentTerms: supplier.paymentTerms ?? '',
    creditLimit: supplier.creditLimit ?? 0,
    bankDetails: supplier.bankDetails ?? '',
    productsSupplied: supplier.productsSupplied ?? '',
    outstandingBalance: supplier.outstandingBalance ?? 0,
    notes: supplier.notes ?? '',
    status: supplier.status,
  };
}

function normalizeSupplierRequest(form: SupplierFormState): SupplierRequest {
  return {
    name: form.name.trim(),
    supplierCode: optionalTrimmedValue(form.supplierCode),
    companyName: optionalTrimmedValue(form.companyName),
    contactPerson: form.contactPerson.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: optionalTrimmedValue(form.address),
    kraPin: optionalTrimmedValue(form.kraPin),
    paymentTerms: optionalTrimmedValue(form.paymentTerms),
    creditLimit: optionalPositiveAmount(form.creditLimit),
    bankDetails: optionalTrimmedValue(form.bankDetails),
    productsSupplied: optionalTrimmedValue(form.productsSupplied),
    outstandingBalance: optionalPositiveAmount(form.outstandingBalance),
    notes: form.notes.trim(),
    status: form.status,
  };
}

function optionalTrimmedValue(value?: string) {
  const trimmed = value?.trim() ?? '';
  return trimmed || undefined;
}

function optionalPositiveAmount(value?: number) {
  return value && value > 0 ? value : undefined;
}

function SuppliersPage({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const suppliers = suppliersQuery.data ?? [];
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVE');
  const inactiveSuppliers = suppliers.length - activeSuppliers.length;
  const contactableSuppliers = suppliers.filter((supplier) => supplier.phone || supplier.email);
  const supplierOutstanding = suppliers.reduce(
    (sum, supplier) => sum + (supplier.outstandingBalance ?? 0),
    0,
  );
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierFormState>(defaultSupplierForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editingSupplier = suppliers.find((supplier) => supplier.id === editingSupplierId);

  const saveSupplierMutation = useMutation({
    mutationFn: (payload: SupplierRequest) =>
      editingSupplierId ? updateSupplier(editingSupplierId, payload) : createSupplier(payload),
    onSuccess: async (savedSupplier) => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditingSupplierId(null);
      setForm(defaultSupplierForm());
      setMessage(`${savedSupplier.name} saved.`);
    },
  });

  const deactivateSupplierMutation = useMutation({
    mutationFn: deactivateSupplier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setMessage('Supplier deactivated.');
    },
  });

  const reactivateSupplierMutation = useMutation({
    mutationFn: (supplier: Supplier) =>
      updateSupplier(supplier.id, {
        ...supplierToRequest(supplier),
        status: 'ACTIVE',
      }),
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setMessage(`${supplier.name} reactivated.`);
    },
  });

  const isBusy =
    saveSupplierMutation.isPending ||
    deactivateSupplierMutation.isPending ||
    reactivateSupplierMutation.isPending;

  function updateForm<K extends keyof SupplierFormState>(field: K, value: SupplierFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingSupplierId(null);
    setForm(defaultSupplierForm());
    setError('');
    setMessage('');
  }

  function editSupplier(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setForm(supplierToRequest(supplier));
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await saveSupplierMutation.mutateAsync(normalizeSupplierRequest(form));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save supplier');
    }
  }

  async function handleDeactivate(supplier: Supplier) {
    setError('');
    setMessage('');
    try {
      if (supplier.status === 'ACTIVE') {
        await deactivateSupplierMutation.mutateAsync(supplier.id);
      } else {
        await reactivateSupplierMutation.mutateAsync(supplier);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update supplier');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Suppliers"
        subtitle="Register suppliers used when receiving stock."
        action={
          <button className="primary-action compact-action" type="button" onClick={resetForm}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New Supplier
          </button>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-truck"
          label="Active Suppliers"
          value={String(activeSuppliers.length)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-pause-circle"
          label="Inactive Suppliers"
          value={String(inactiveSuppliers)}
          tone="orange"
        />
        <SummaryMetric
          icon="bi-person-lines-fill"
          label="With Contact Details"
          value={String(contactableSuppliers.length)}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-cash-stack"
          label="Outstanding"
          value={formatMoney(supplierOutstanding, organization.currencyCode)}
          tone="purple"
        />
      </div>

      <div className="management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon={editingSupplier ? 'bi-pencil-square' : 'bi-plus-square'}
            title={editingSupplier ? 'Edit Supplier' : 'Register Supplier'}
          />

          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Supplier Name</span>
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Supplier Code</span>
              <input
                maxLength={40}
                value={form.supplierCode ?? ''}
                onChange={(event) => updateForm('supplierCode', event.target.value.toUpperCase())}
              />
            </label>

            <label className="field-stack">
              <span>Company Name</span>
              <input
                maxLength={160}
                value={form.companyName ?? ''}
                onChange={(event) => updateForm('companyName', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Contact Person</span>
              <input
                maxLength={160}
                value={form.contactPerson}
                onChange={(event) => updateForm('contactPerson', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Phone</span>
              <input
                maxLength={40}
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Email</span>
              <input
                maxLength={254}
                type="email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
              />
            </label>

            <label className="field-stack wide-field">
              <span>Address</span>
              <input
                maxLength={255}
                value={form.address ?? ''}
                onChange={(event) => updateForm('address', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>KRA PIN</span>
              <input
                maxLength={40}
                value={form.kraPin ?? ''}
                onChange={(event) => updateForm('kraPin', event.target.value.toUpperCase())}
              />
            </label>

            <label className="field-stack">
              <span>Payment Terms</span>
              <input
                maxLength={120}
                value={form.paymentTerms ?? ''}
                onChange={(event) => updateForm('paymentTerms', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Credit Limit</span>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.creditLimit ?? 0}
                onChange={(event) => updateForm('creditLimit', Number(event.target.value) || 0)}
              />
            </label>

            <label className="field-stack">
              <span>Outstanding Balance</span>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.outstandingBalance ?? 0}
                onChange={(event) =>
                  updateForm('outstandingBalance', Number(event.target.value) || 0)
                }
              />
            </label>

            <label className="field-stack wide-field">
              <span>Bank / Payment Information</span>
              <textarea
                maxLength={500}
                value={form.bankDetails ?? ''}
                onChange={(event) => updateForm('bankDetails', event.target.value)}
              />
            </label>

            <label className="field-stack wide-field">
              <span>Products Supplied</span>
              <textarea
                maxLength={500}
                value={form.productsSupplied ?? ''}
                onChange={(event) => updateForm('productsSupplied', event.target.value)}
              />
            </label>

            <label className="field-stack wide-field">
              <span>Notes</span>
              <textarea
                maxLength={500}
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm('status', event.target.value as SupplierFormState['status'])
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>

            <FormMessages error={error} message={message} />

            <div className="form-actions">
              {editingSupplier ? (
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
              <button className="primary-action compact-action" type="submit" disabled={isBusy}>
                <i className="bi bi-check2" aria-hidden="true" />
                {isBusy ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Register Supplier'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-list-check" title="Registered Suppliers" />

          {suppliersQuery.isPending ? (
            <LoadingPanel label="Loading suppliers..." />
          ) : suppliersQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Suppliers could not be loaded"
              detail="Refresh the page or try again after the API is available."
            />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon="bi-truck"
              title="No suppliers registered"
              detail="Suppliers you register will appear here."
            />
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>KRA PIN</th>
                    <th>Terms</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td data-label="Supplier">
                        <span className="table-label">
                          <i className="bi bi-truck" aria-hidden="true" />
                          {supplier.name}
                        </span>
                      </td>
                      <td data-label="Code">{supplier.supplierCode || 'N/A'}</td>
                      <td data-label="Contact">{supplier.contactPerson || 'N/A'}</td>
                      <td data-label="Phone">{supplier.phone || 'N/A'}</td>
                      <td data-label="Email">{supplier.email || 'N/A'}</td>
                      <td data-label="KRA PIN">{supplier.kraPin || 'N/A'}</td>
                      <td data-label="Terms">{supplier.paymentTerms || 'N/A'}</td>
                      <td data-label="Balance">
                        {formatMoney(supplier.outstandingBalance ?? 0, organization.currencyCode)}
                      </td>
                      <td data-label="Status">
                        <StatusPill
                          status={supplier.status === 'ACTIVE' ? 'posted' : 'pending'}
                          label={supplier.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td data-label="Actions">
                        <span className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editSupplier(supplier)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            className={
                              supplier.status === 'ACTIVE'
                                ? 'text-button danger-text'
                                : 'text-button'
                            }
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeactivate(supplier)}
                          >
                            <i
                              className={`bi ${
                                supplier.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'
                              }`}
                              aria-hidden="true"
                            />
                            {supplier.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

type CustomerFormState = CustomerRequest;
type CustomerPeriodPreset = 'week' | 'month' | 'quarter' | 'custom';

function defaultCustomerForm(branches: Branch[]): CustomerFormState {
  return {
    branchId: branches.find((branch) => branch.status === 'ACTIVE')?.id,
    customerCode: nextCustomerCode(),
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    kraPin: '',
    customerType: 'INDIVIDUAL',
    creditLimit: 0,
    outstandingBalance: 0,
    paymentTerms: '',
    notes: '',
    status: 'ACTIVE',
  };
}

function customerToRequest(customer: Customer): CustomerFormState {
  return {
    branchId: customer.branchId,
    customerCode: customer.customerCode,
    name: customer.name,
    contactPerson: customer.contactPerson ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    kraPin: customer.kraPin ?? '',
    customerType: customer.customerType,
    creditLimit: customer.creditLimit ?? 0,
    outstandingBalance: customer.outstandingBalance ?? 0,
    paymentTerms: customer.paymentTerms ?? '',
    notes: customer.notes ?? '',
    status: customer.status,
  };
}

function normalizeCustomerRequest(form: CustomerFormState): CustomerRequest {
  return {
    branchId: optionalTrimmedValue(form.branchId),
    customerCode: form.customerCode.trim().toUpperCase(),
    name: form.name.trim(),
    contactPerson: form.contactPerson.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
    kraPin: form.kraPin.trim().toUpperCase(),
    customerType: form.customerType,
    creditLimit: Math.max(0, form.creditLimit || 0),
    outstandingBalance: Math.max(0, form.outstandingBalance || 0),
    paymentTerms: form.paymentTerms.trim(),
    notes: form.notes.trim(),
    status: form.status,
  };
}

function customerPeriodDates(preset: CustomerPeriodPreset) {
  const today = todayInputValue();
  if (preset === 'week') {
    return { from: addDaysInputValue(today, -6), to: today };
  }
  if (preset === 'quarter') {
    return { from: addDaysInputValue(today, -89), to: today };
  }
  return { from: addDaysInputValue(today, -29), to: today };
}

function nextCustomerCode() {
  return `CUS-${Date.now().toString().slice(-6)}`;
}

function CustomersPage({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const { branchId: platformBranchId } = usePlatform();
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({ queryKey: ['customers-summary'], queryFn: getCustomersSummary });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const customers = inBranch(customersQuery.data ?? [], platformBranchId);
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerFormState>(() => defaultCustomerForm(branches));
  const [periodPreset, setPeriodPreset] = useState<CustomerPeriodPreset>('month');
  const initialPeriod = customerPeriodDates('month');
  const [reportFrom, setReportFrom] = useState(initialPeriod.from);
  const [reportTo, setReportTo] = useState(initialPeriod.to);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editingCustomer = customers.find((customer) => customer.id === editingCustomerId);
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0] ?? null;
  const activeCustomers = customers.filter((customer) => customer.status === 'ACTIVE');
  const creditHoldCustomers = customers.filter((customer) => customer.status === 'CREDIT_HOLD');
  const receivables = customers.reduce(
    (sum, customer) => sum + (customer.outstandingBalance ?? 0),
    0,
  );
  const reportQuery = useQuery({
    queryKey: ['customer-period-report', selectedCustomer?.id, reportFrom, reportTo],
    queryFn: () =>
      getCustomerPeriodReport(selectedCustomer?.id ?? '', { from: reportFrom, to: reportTo }),
    enabled: Boolean(selectedCustomer?.id),
  });
  const report = reportQuery.data;

  const saveCustomerMutation = useMutation({
    mutationFn: (payload: CustomerRequest) =>
      editingCustomerId ? updateCustomer(editingCustomerId, payload) : createCustomer(payload),
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-summary'] });
      setEditingCustomerId(null);
      setSelectedCustomerId(customer.id);
      setForm(defaultCustomerForm(branches));
      setMessage(`${customer.name} saved.`);
    },
  });

  const clearCustomerMutation = useMutation({
    mutationFn: clearCustomerData,
    onSuccess: async (customer) => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['customer-period-report'] });
      setMessage(`${customer.name} customer balances cleared.`);
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-summary'] });
      setSelectedCustomerId(null);
      setMessage('Customer deleted.');
    },
  });

  const isBusy =
    saveCustomerMutation.isPending ||
    clearCustomerMutation.isPending ||
    deleteCustomerMutation.isPending;

  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  function updateForm<K extends keyof CustomerFormState>(field: K, value: CustomerFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingCustomerId(null);
    setForm(defaultCustomerForm(branches));
    setError('');
    setMessage('');
  }

  function editCustomer(customer: Customer) {
    setEditingCustomerId(customer.id);
    setSelectedCustomerId(customer.id);
    setForm(customerToRequest(customer));
    setError('');
    setMessage('');
  }

  function selectPeriodPreset(nextPreset: CustomerPeriodPreset) {
    setPeriodPreset(nextPreset);
    if (nextPreset !== 'custom') {
      const dates = customerPeriodDates(nextPreset);
      setReportFrom(dates.from);
      setReportTo(dates.to);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveCustomerMutation.mutateAsync(normalizeCustomerRequest(form));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save customer');
    }
  }

  async function handleClearCustomer(customer: Customer) {
    setError('');
    setMessage('');
    try {
      await clearCustomerMutation.mutateAsync(customer.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to clear customer data',
      );
    }
  }

  async function handleDeleteCustomer(customer: Customer) {
    setError('');
    setMessage('');
    try {
      await deleteCustomerMutation.mutateAsync(customer.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to delete customer');
    }
  }

  return (
    <section className="branch-workspace customers-workspace">
      <PageHeader
        title={summaryQuery.data?.title ?? 'Customers'}
        subtitle={
          summaryQuery.data?.description ??
          'Manage customer records, balances, and period purchase history.'
        }
        action={
          <button className="primary-action compact-action" type="button" onClick={resetForm}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New Customer
          </button>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-person-check"
          label="Active Customers"
          value={String(activeCustomers.length)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-shield-exclamation"
          label="Credit Hold"
          value={String(creditHoldCustomers.length)}
          tone="orange"
        />
        <SummaryMetric
          icon="bi-cash-stack"
          label="Receivables"
          value={formatMoney(receivables, organization.currencyCode)}
          tone="purple"
        />
        <SummaryMetric
          icon="bi-calendar-range"
          label="Period Paid"
          value={formatMoney(report?.paidAmount ?? 0, organization.currencyCode)}
          tone="blue"
        />
      </div>

      <FormMessages error={error} message={message} />

      <div className="management-grid customers-management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon={editingCustomer ? 'bi-pencil-square' : 'bi-person-plus'}
            title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
          />
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Customer Code</span>
              <input
                required
                maxLength={40}
                value={form.customerCode}
                onChange={(event) => updateForm('customerCode', event.target.value.toUpperCase())}
              />
            </label>
            <label className="field-stack">
              <span>Customer Name</span>
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Type</span>
              <select
                value={form.customerType}
                onChange={(event) => updateForm('customerType', event.target.value as CustomerType)}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Branch</span>
              <select
                value={form.branchId ?? ''}
                onChange={(event) => updateForm('branchId', event.target.value || undefined)}
              >
                <option value="">All branches</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Contact Person</span>
              <input
                maxLength={160}
                value={form.contactPerson}
                onChange={(event) => updateForm('contactPerson', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Phone</span>
              <input
                inputMode="tel"
                maxLength={40}
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Email</span>
              <input
                maxLength={254}
                type="email"
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>KRA PIN</span>
              <input
                maxLength={40}
                value={form.kraPin}
                onChange={(event) => updateForm('kraPin', event.target.value.toUpperCase())}
              />
            </label>
            <label className="field-stack wide-field">
              <span>Address</span>
              <input
                maxLength={255}
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Credit Limit</span>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.creditLimit}
                onChange={(event) => updateForm('creditLimit', Number(event.target.value) || 0)}
              />
            </label>
            <label className="field-stack">
              <span>Outstanding Balance</span>
              <input
                min="0"
                step="0.01"
                type="number"
                value={form.outstandingBalance}
                onChange={(event) =>
                  updateForm('outstandingBalance', Number(event.target.value) || 0)
                }
              />
            </label>
            <label className="field-stack">
              <span>Payment Terms</span>
              <input
                maxLength={120}
                value={form.paymentTerms}
                onChange={(event) => updateForm('paymentTerms', event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => updateForm('status', event.target.value as CustomerStatus)}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CREDIT_HOLD">Credit Hold</option>
              </select>
            </label>
            <label className="field-stack wide-field">
              <span>Notes</span>
              <textarea
                maxLength={500}
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
              />
            </label>
            <div className="form-actions">
              {editingCustomer ? (
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
              <button className="primary-action compact-action" type="submit" disabled={isBusy}>
                <i className="bi bi-check2" aria-hidden="true" />
                {isBusy ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-people" title="Customer Records" />
          {customersQuery.isPending ? (
            <LoadingPanel label="Loading customers..." />
          ) : customersQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Customers could not be loaded"
              detail="Refresh the page or try again when the API is available."
            />
          ) : customers.length === 0 ? (
            <EmptyState
              icon="bi-person-plus"
              title="No customers registered"
              detail="Customers you add will appear here."
            />
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>Branch</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      className={customer.id === selectedCustomer?.id ? 'selected-row' : ''}
                      key={customer.id}
                    >
                      <td data-label="Customer">
                        <span className="table-label">
                          <i className="bi bi-person-lines-fill" aria-hidden="true" />
                          <span>
                            <strong>{customer.name}</strong>
                            <small>{customer.email || customer.phone || 'No contact saved'}</small>
                          </span>
                        </span>
                      </td>
                      <td data-label="Code">{customer.customerCode}</td>
                      <td data-label="Contact">{customer.contactPerson || 'N/A'}</td>
                      <td data-label="Branch">{customer.branchName || 'All branches'}</td>
                      <td data-label="Balance">
                        {formatMoney(customer.outstandingBalance ?? 0, organization.currencyCode)}
                      </td>
                      <td data-label="Status">
                        <StatusPill
                          status={
                            customer.status === 'ACTIVE'
                              ? 'posted'
                              : customer.status === 'CREDIT_HOLD'
                                ? 'review'
                                : 'pending'
                          }
                          label={labelizeEnum(customer.status)}
                        />
                      </td>
                      <td data-label="Actions">
                        <span className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => setSelectedCustomerId(customer.id)}
                          >
                            <i className="bi bi-graph-up" aria-hidden="true" />
                            Data
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editCustomer(customer)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleClearCustomer(customer)}
                          >
                            <i className="bi bi-eraser" aria-hidden="true" />
                            Clear
                          </button>
                          <button
                            className="text-button danger-text"
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel-card branch-list-panel customers-period-panel">
          <PanelHeader
            icon="bi-calendar-range"
            title={selectedCustomer ? `${selectedCustomer.name} Data` : 'Customer Data'}
          />
          {selectedCustomer ? (
            <>
              <div className="report-period-row">
                {(['week', 'month', 'quarter'] as CustomerPeriodPreset[]).map((preset) => (
                  <button
                    className={`report-period-button ${periodPreset === preset ? 'active' : ''}`}
                    key={preset}
                    type="button"
                    onClick={() => selectPeriodPreset(preset)}
                  >
                    <i className="bi bi-calendar-week" aria-hidden="true" />
                    {preset === 'week' ? 'Weekly' : preset === 'quarter' ? '3 Months' : 'Monthly'}
                  </button>
                ))}
              </div>
              <div className="record-form customer-period-form">
                <label className="field-stack">
                  <span>From</span>
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={(event) => {
                      setPeriodPreset('custom');
                      setReportFrom(event.target.value);
                    }}
                  />
                </label>
                <label className="field-stack">
                  <span>To</span>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={(event) => {
                      setPeriodPreset('custom');
                      setReportTo(event.target.value);
                    }}
                  />
                </label>
              </div>
              {reportQuery.isPending ? (
                <LoadingPanel label="Loading customer data..." />
              ) : reportQuery.isError ? (
                <EmptyState
                  icon="bi-exclamation-circle"
                  title="Customer data could not be loaded"
                  detail="Check the selected dates and try again."
                />
              ) : (
                <>
                  <div className="invoice-summary-row">
                    <div>
                      <span>Bought</span>
                      <strong>
                        {formatMoney(report?.boughtAmount ?? 0, organization.currencyCode)}
                      </strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong>
                        {formatMoney(report?.paidAmount ?? 0, organization.currencyCode)}
                      </strong>
                    </div>
                    <div>
                      <span>Balance</span>
                      <strong>
                        {formatMoney(report?.balanceAmount ?? 0, organization.currencyCode)}
                      </strong>
                    </div>
                  </div>
                  {report?.activities.length ? (
                    <div className="responsive-table compact-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Sale</th>
                            <th>Date</th>
                            <th>Branch</th>
                            <th>Bought</th>
                            <th>Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.activities.map((activity) => (
                            <tr key={`${activity.reference}-${activity.occurredAt}`}>
                              <td data-label="Sale">{activity.reference}</td>
                              <td data-label="Date">{formatDateTime(activity.occurredAt)}</td>
                              <td data-label="Branch">{activity.branchName}</td>
                              <td data-label="Bought">
                                {formatMoney(activity.boughtAmount, organization.currencyCode)}
                              </td>
                              <td data-label="Paid">
                                {formatMoney(activity.paidAmount, organization.currencyCode)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon="bi-receipt"
                      title="No customer activity"
                      detail="Sales matching this customer name will appear for the selected period."
                    />
                  )}
                </>
              )}
            </>
          ) : (
            <EmptyState
              icon="bi-person-lines-fill"
              title="Select a customer"
              detail="Customer purchases and payments will appear here."
            />
          )}
        </section>
      </div>
    </section>
  );
}

type RoleFormState = RoleRequest;
type PermissionFormState = PermissionRequest;
type RoleManagementDialog = 'role' | 'permission' | null;

function defaultRoleForm(): RoleFormState {
  return {
    name: '',
    key: '',
    description: '',
    permissionIds: [],
  };
}

function defaultPermissionForm(): PermissionFormState {
  return {
    code: '',
    description: '',
  };
}

function roleKeyFromName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniquePermissionCodes(codes: string[]) {
  return Array.from(new Set(codes.filter(Boolean))).sort((first, second) =>
    first.localeCompare(second),
  );
}

const MANAGED_ROLE_KEYS = new Set(['ADMIN', 'SHOP_MANAGER', 'CASHIER']);

function isManagedRole(role: Role) {
  return MANAGED_ROLE_KEYS.has(role.key);
}

function PermissionCodeList({ codes, limit }: { codes: string[]; limit?: number }) {
  const uniqueCodes = uniquePermissionCodes(codes);

  if (uniqueCodes.length === 0) {
    return <span className="table-subtext">N/A</span>;
  }

  const visibleCodes = limit ? uniqueCodes.slice(0, limit) : uniqueCodes;
  const hiddenCount = uniqueCodes.length - visibleCodes.length;

  return (
    <span
      className="permission-chip-list"
      title={hiddenCount > 0 ? uniqueCodes.join(', ') : undefined}
    >
      {visibleCodes.map((code) => (
        <span className="permission-chip" key={code}>
          {code}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="permission-chip permission-chip-more">+{hiddenCount} more</span>
      ) : null}
    </span>
  );
}

function TextPillList({ emptyLabel = 'N/A', values }: { emptyLabel?: string; values: string[] }) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));

  if (uniqueValues.length === 0) {
    return <span className="table-subtext">{emptyLabel}</span>;
  }

  return (
    <span className="text-pill-list">
      {uniqueValues.map((value) => (
        <span className="text-pill" key={value}>
          {value}
        </span>
      ))}
    </span>
  );
}

function RolesPage() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles });
  const permissionsQuery = useQuery({ queryKey: ['permissions'], queryFn: getPermissions });
  const roles = (rolesQuery.data ?? []).filter(isManagedRole);
  const permissions = permissionsQuery.data ?? [];
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleFormState>(() => defaultRoleForm());
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>(() =>
    defaultPermissionForm(),
  );
  const [isRoleKeyEdited, setIsRoleKeyEdited] = useState(false);
  const [accessSearch, setAccessSearch] = useState('');
  const [roleDialog, setRoleDialog] = useState<RoleManagementDialog>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editingRole = roles.find((role) => role.id === editingRoleId);
  const editingPermission = permissions.find((permission) => permission.id === editingPermissionId);
  const normalizedAccessSearch = accessSearch.trim().toLowerCase();
  const filteredRoles = roles.filter((role) => {
    if (!normalizedAccessSearch) {
      return true;
    }

    return [role.name, role.key, role.description ?? '', ...role.permissionCodes]
      .join(' ')
      .toLowerCase()
      .includes(normalizedAccessSearch);
  });
  const filteredPermissions = permissions.filter((permission) => {
    if (!normalizedAccessSearch) {
      return true;
    }

    return [permission.code, permission.description ?? '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedAccessSearch);
  });

  const saveRoleMutation = useMutation({
    mutationFn: (payload: RoleRequest) =>
      editingRoleId ? updateRole(editingRoleId, payload) : createRole(payload),
    onSuccess: async (role) => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingRoleId(null);
      setForm(defaultRoleForm());
      setIsRoleKeyEdited(false);
      setRoleDialog(null);
      setMessage(`${role.name} saved.`);
    },
  });

  const savePermissionMutation = useMutation({
    mutationFn: (payload: PermissionRequest) =>
      editingPermissionId
        ? updatePermission(editingPermissionId, payload)
        : createPermission(payload),
    onSuccess: async (permission) => {
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingPermissionId(null);
      setPermissionForm(defaultPermissionForm());
      setRoleDialog(null);
      setMessage(`${permission.code} saved.`);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setMessage('Role removed.');
    },
  });

  function editRole(role: Role) {
    setEditingRoleId(role.id);
    setForm({
      name: role.name,
      key: role.key,
      description: role.description ?? '',
      permissionIds: role.permissionIds,
    });
    setIsRoleKeyEdited(true);
    setError('');
    setMessage('');
    setRoleDialog('role');
  }

  function resetForm() {
    setEditingRoleId(null);
    setForm(defaultRoleForm());
    setIsRoleKeyEdited(false);
    setError('');
    setMessage('');
  }

  function openNewRoleDialog() {
    resetForm();
    setRoleDialog('role');
  }

  function editPermission(permission: Permission) {
    setEditingPermissionId(permission.id);
    setPermissionForm({
      code: permission.code,
      description: permission.description ?? '',
    });
    setError('');
    setMessage('');
    setRoleDialog('permission');
  }

  function resetPermissionForm() {
    setEditingPermissionId(null);
    setPermissionForm(defaultPermissionForm());
    setError('');
    setMessage('');
  }

  function openPermissionDialog() {
    resetPermissionForm();
    setRoleDialog('permission');
  }

  function toggleRolePermission(permissionId: string) {
    setForm((current) => {
      const values = new Set(current.permissionIds);
      if (values.has(permissionId)) {
        values.delete(permissionId);
      } else {
        values.add(permissionId);
      }
      return { ...current, permissionIds: Array.from(values) };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveRoleMutation.mutateAsync({
        name: form.name.trim(),
        key: form.key.trim(),
        description: form.description.trim(),
        permissionIds: form.permissionIds,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save role');
    }
  }

  useEffect(() => {
    if (roleDialog == null) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setRoleDialog(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [roleDialog]);

  async function handlePermissionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await savePermissionMutation.mutateAsync({
        code: permissionForm.code.trim(),
        description: permissionForm.description.trim(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save permission');
    }
  }

  async function handleDelete(role: Role) {
    setError('');
    setMessage('');
    try {
      await deleteRoleMutation.mutateAsync(role.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to remove role');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Roles"
        subtitle="Manage Admin, Shop Manager, and Cashier access. Cashiers sell, register expenses, and manage their own shifts at assigned shops."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={openPermissionDialog}
            >
              <i className="bi bi-key" aria-hidden="true" />
              Permissions
            </button>
          </div>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-person-badge"
          label="Roles"
          value={String(roles.length)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-people"
          label="Assigned Users"
          value={String(roles.reduce((sum, role) => sum + role.assignedUsers, 0))}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-key"
          label="Permissions"
          value={String(permissions.length)}
          tone="orange"
        />
      </div>

      <label className="search-field access-search-field">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          aria-label="Search roles and permissions"
          placeholder="Search roles and permissions..."
          value={accessSearch}
          onChange={(event) => setAccessSearch(event.target.value)}
        />
      </label>

      {roleDialog ? null : <FormMessages error={error} message={message} />}

      <div className="management-grid roles-permissions-grid roles-main-grid">
        {roleDialog === 'role' ? (
          <div
            className="dialog-backdrop role-management-dialog-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setRoleDialog(null);
              }
            }}
          >
            <section
              className="panel-card branch-form-panel role-management-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={editingRole ? 'Edit Role' : 'Register Role'}
            >
              <PanelHeader
                icon={editingRole ? 'bi-pencil-square' : 'bi-plus-square'}
                title={editingRole ? 'Edit Role' : 'Register Role'}
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close role dialog"
                    onClick={() => setRoleDialog(null)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />

              <form className="record-form" onSubmit={handleSubmit}>
                <label className="field-stack">
                  <span>Role Name</span>
                  <input
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                        key: isRoleKeyEdited ? current.key : roleKeyFromName(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field-stack">
                  <span>Role Key</span>
                  <input
                    required
                    maxLength={80}
                    value={form.key}
                    onChange={(event) => {
                      setIsRoleKeyEdited(true);
                      setForm((current) => ({
                        ...current,
                        key: roleKeyFromName(event.target.value),
                      }));
                    }}
                  />
                </label>

                <label className="field-stack">
                  <span>Description</span>
                  <input
                    maxLength={255}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>

                <CheckboxGroup
                  items={permissions}
                  label="Permissions"
                  selectedIds={form.permissionIds}
                  emptyLabel="No permissions registered"
                  getLabel={(permission) =>
                    permission.description
                      ? `${permission.code} - ${permission.description}`
                      : permission.code
                  }
                  onToggle={toggleRolePermission}
                />

                <FormMessages error={error} message={message} />

                <div className="form-actions">
                  {editingRole ? (
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className="primary-action compact-action"
                    type="submit"
                    disabled={saveRoleMutation.isPending}
                  >
                    <i className="bi bi-check2" aria-hidden="true" />
                    {saveRoleMutation.isPending
                      ? 'Saving...'
                      : editingRole
                        ? 'Save Changes'
                        : 'Register Role'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        <div className="access-management-stack">
          <section className="panel-card branch-list-panel roles-list-panel">
            <PanelHeader
              icon="bi-list-check"
              title="Registered Roles"
              action={
                <span className="catalog-count-pill">
                  {filteredRoles.length} of {roles.length} roles
                </span>
              }
            />
            {rolesQuery.isPending ? (
              <LoadingPanel label="Loading roles..." />
            ) : roles.length === 0 ? (
              <EmptyState
                icon="bi-person-badge"
                title="No roles registered"
                detail="Roles created here will appear in user assignment."
              />
            ) : filteredRoles.length === 0 ? (
              <EmptyState
                icon="bi-search"
                title="No matching roles"
                detail="Adjust the search to see more roles."
              />
            ) : (
              <div className="responsive-table roles-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Key</th>
                      <th>Permissions</th>
                      <th>Assigned Users</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoles.map((role) => (
                      <tr key={role.id}>
                        <td data-label="Role">
                          <span className="table-label">
                            <i className="bi bi-person-badge" aria-hidden="true" />
                            <span>
                              <strong>{role.name}</strong>
                              <small>{role.description || 'N/A'}</small>
                            </span>
                          </span>
                        </td>
                        <td data-label="Key">{role.key}</td>
                        <td data-label="Permissions">
                          <PermissionCodeList codes={role.permissionCodes} limit={5} />
                        </td>
                        <td data-label="Assigned Users">{role.assignedUsers}</td>
                        <td data-label="Actions">
                          <span className="table-actions">
                            <button
                              className="text-button"
                              type="button"
                              disabled={role.key === 'CASHIER'}
                              onClick={() => editRole(role)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              className="text-button danger-text"
                              type="button"
                              disabled={deleteRoleMutation.isPending || role.assignedUsers >= 0}
                              onClick={() => handleDelete(role)}
                            >
                              <i className="bi bi-trash" aria-hidden="true" />
                              Remove
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {roleDialog === 'permission' ? (
            <div
              className="dialog-backdrop role-management-dialog-backdrop"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setRoleDialog(null);
                }
              }}
            >
              <section
                className="panel-card branch-list-panel permissions-catalog-panel role-management-dialog permissions-management-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Permissions"
              >
                <PanelHeader
                  icon="bi-key"
                  title="Permissions"
                  action={
                    <span className="dialog-title-actions">
                      <span className="catalog-count-pill">
                        {filteredPermissions.length} of {permissions.length} permissions
                      </span>
                      <button
                        className="icon-button compact-icon"
                        type="button"
                        aria-label="Close permissions dialog"
                        onClick={() => setRoleDialog(null)}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    </span>
                  }
                />

                <form className="permission-inline-form" onSubmit={handlePermissionSubmit}>
                  <label className="field-stack">
                    <span>Permission Code</span>
                    <input
                      required
                      maxLength={120}
                      placeholder="module:action"
                      value={permissionForm.code}
                      onChange={(event) =>
                        setPermissionForm((current) => ({
                          ...current,
                          code: event.target.value.toLowerCase(),
                        }))
                      }
                    />
                  </label>
                  <label className="field-stack">
                    <span>Description</span>
                    <input
                      maxLength={255}
                      value={permissionForm.description}
                      onChange={(event) =>
                        setPermissionForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="form-actions">
                    {editingPermission ? (
                      <button
                        className="secondary-action compact-action"
                        type="button"
                        onClick={resetPermissionForm}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      className="primary-action compact-action"
                      type="submit"
                      disabled={savePermissionMutation.isPending}
                    >
                      <i className="bi bi-check2" aria-hidden="true" />
                      {savePermissionMutation.isPending
                        ? 'Saving...'
                        : editingPermission
                          ? 'Save Permission'
                          : 'Add Permission'}
                    </button>
                  </div>
                </form>

                <FormMessages error={error} message={message} />

                {permissionsQuery.isPending ? (
                  <LoadingPanel label="Loading permissions..." />
                ) : permissions.length === 0 ? (
                  <EmptyState
                    icon="bi-key"
                    title="No permissions registered"
                    detail="Permissions created here can be assigned to roles."
                  />
                ) : filteredPermissions.length === 0 ? (
                  <EmptyState
                    icon="bi-search"
                    title="No matching permissions"
                    detail="Adjust the search to see more permissions."
                  />
                ) : (
                  <div className="permission-catalog-list">
                    {filteredPermissions.map((permission) => (
                      <div className="permission-catalog-row" key={permission.id}>
                        <span>
                          <strong>{permission.code}</strong>
                          <small>{permission.description || 'N/A'}</small>
                        </span>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => editPermission(permission)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type UserFormState = UserRequest & {
  password: string;
};

function defaultUserForm(): UserFormState {
  return {
    email: '',
    password: '',
    displayName: '',
    status: 'ACTIVE',
    roleIds: [],
    branchIds: [],
  };
}

function UsersPage() {
  const { branches } = usePlatform();
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles });
  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(defaultUserForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const editingUser = users.find((user) => user.id === editingUserId);

  const saveUserMutation = useMutation({
    mutationFn: (payload: UserRequest) =>
      editingUserId ? updateUser(editingUserId, payload) : createUser(payload),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUserId(null);
      setForm(defaultUserForm());
      setMessage(`${user.displayName} saved.`);
    },
  });

  const disableUserMutation = useMutation({
    mutationFn: disableUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setMessage('User disabled.');
    },
  });

  function resetForm() {
    setEditingUserId(null);
    setForm(defaultUserForm());
    setError('');
    setMessage('');
  }

  function editUser(user: StaffUser) {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      password: '',
      displayName: user.displayName,
      status: user.status,
      roleIds: user.roleIds,
      branchIds: user.branchIds,
    });
    setError('');
    setMessage('');
  }

  function toggleRoleAssignment(id: string) {
    setForm((current) => {
      const remaining = current.roleIds.filter((value) => value !== id);
      return {
        ...current,
        roleIds: current.roleIds.includes(id)
          ? remaining
          : roles.find((role) => role.id === id)?.key === 'CASHIER'
            ? [id]
            : [
                ...remaining.filter(
                  (value) => roles.find((role) => role.id === value)?.key !== 'CASHIER',
                ),
                id,
              ],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (
        roles.some((role) => role.key === 'CASHIER' && form.roleIds.includes(role.id)) &&
        !form.branchIds.length
      ) {
        setError('Select at least one shop for the cashier.');
        return;
      }
      await saveUserMutation.mutateAsync({
        email: form.email.trim(),
        password: form.password || undefined,
        displayName: form.displayName.trim(),
        status: form.status,
        roleIds: form.roleIds,
        branchIds: form.branchIds,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save user');
    }
  }

  async function handleStatusChange(user: StaffUser) {
    setError('');
    setMessage('');
    try {
      if (user.status === 'ACTIVE') {
        await disableUserMutation.mutateAsync(user.id);
        return;
      }
      await updateUser(user.id, {
        email: user.email,
        displayName: user.displayName,
        status: 'ACTIVE',
        roleIds: user.roleIds,
        branchIds: user.branchIds,
      });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setMessage(`${user.displayName} reactivated.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update user');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Users"
        subtitle="Manage sign-in accounts, roles and permissions."
        action={
          <button className="primary-action compact-action" type="button" onClick={resetForm}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New User
          </button>
        }
      />
      <FormMessages error={error} message={message} />
      <div className="management-grid users-management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon={editingUser ? 'bi-pencil-square' : 'bi-person-plus'}
            title={editingUser ? 'Edit User' : 'Register User'}
          />
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Display Name</span>
              <input
                required
                maxLength={160}
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Email</span>
              <input
                required
                maxLength={254}
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Password</span>
              <input
                required={!editingUser}
                minLength={8}
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as UserFormState['status'],
                  }))
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </label>
            <CheckboxGroup
              items={roles}
              label="Roles"
              selectedIds={form.roleIds}
              emptyLabel="No roles registered"
              getLabel={(role) => `${role.name} (${role.key})`}
              onToggle={toggleRoleAssignment}
            />
            <CheckboxGroup
              items={branches}
              label="Assigned shops"
              selectedIds={form.branchIds}
              emptyLabel="Register an active shop before assigning cashiers."
              getLabel={(branch) => branch.name}
              onToggle={(id) =>
                setForm((current) => ({
                  ...current,
                  branchIds: current.branchIds.includes(id)
                    ? current.branchIds.filter((value) => value !== id)
                    : [...current.branchIds, id],
                }))
              }
            />
            {roles.some((role) => role.key === 'CASHIER' && form.roleIds.includes(role.id)) && (
              <p>
                Cashiers require at least one assigned shop and cannot be combined with another
                role.
              </p>
            )}
            {form.roleIds.length > 0 ? (
              <div className="field-stack wide-field">
                <span>Assigned permissions</span>
                <PermissionCodeList
                  codes={roles
                    .filter((role) => form.roleIds.includes(role.id))
                    .flatMap((role) => role.permissionCodes)}
                />
              </div>
            ) : null}
            <div className="form-actions">
              {editingUser ? (
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              ) : null}
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={saveUserMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveUserMutation.isPending
                  ? 'Saving...'
                  : editingUser
                    ? 'Save Changes'
                    : 'Register User'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-people" title="Registered Users" />
          {usersQuery.isPending || rolesQuery.isPending ? (
            <LoadingPanel label="Loading users..." />
          ) : usersQuery.isError || rolesQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Users could not be loaded"
              detail="Refresh the page or try again when the API is available."
            />
          ) : users.length === 0 ? (
            <EmptyState
              icon="bi-people"
              title="No users registered"
              detail="Users you register will appear here."
            />
          ) : (
            <div className="responsive-table users-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Roles and permissions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td data-label="User">
                        <span className="table-label">
                          <i className="bi bi-person" aria-hidden="true" />
                          <span>
                            <strong>{user.displayName}</strong>
                            <small>{user.email}</small>
                          </span>
                        </span>
                      </td>
                      <td data-label="Status">
                        <StatusPill
                          status={user.status === 'ACTIVE' ? 'posted' : 'pending'}
                          label={user.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        />
                      </td>
                      <td data-label="Roles and permissions">
                        <span>{user.roleNames.join(', ') || 'No roles assigned'}</span>
                        <div>
                          <PermissionCodeList codes={user.permissionCodes} />
                        </div>
                      </td>
                      <td data-label="Actions">
                        <span className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editUser(user)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            className={
                              user.status === 'ACTIVE' ? 'text-button danger-text' : 'text-button'
                            }
                            type="button"
                            disabled={disableUserMutation.isPending}
                            onClick={() => void handleStatusChange(user)}
                          >
                            {user.status === 'ACTIVE' ? 'Disable' : 'Reactivate'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

type ProductFormState = ProductRequest;

function generatedBarcode() {
  const digits = Math.floor(Math.random() * 10_000_000_000)
    .toString()
    .padStart(10, '0');
  return `200${digits}`;
}

function defaultProductForm(categories: ProductCategory[], productCount: number): ProductFormState {
  return {
    name: '',
    sku: `SKU-${String(productCount + 1).padStart(4, '0')}`,
    barcode: generatedBarcode(),
    categoryId: categories.find((category) => category.status === 'ACTIVE')?.id ?? '',
    department: '',
    description: '',
    imageUrl: '',
    unitPrice: 0,
    costPrice: 0,
    vatCategory: 'A',
    sizes: [],
    colors: [],
    status: 'ACTIVE',
  };
}

function ProductsPage({
  organization,
  view = 'products',
}: {
  organization: Organization;
  view?: 'products' | 'categories';
}) {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(() => defaultProductForm([], 0));
  const [categoryName, setCategoryName] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const editingProduct = products.find((product) => product.id === editingProductId);

  useEffect(() => {
    if (!isProductDialogOpen && !isCategoryDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProductDialogOpen(false);
        setIsCategoryDialogOpen(false);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isProductDialogOpen, isCategoryDialogOpen]);

  const saveProductMutation = useMutation({
    mutationFn: (payload: ProductRequest) =>
      editingProductId ? updateProduct(editingProductId, payload) : createProduct(payload),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsProductDialogOpen(false);
      setEditingProductId(null);
      setMessage(`${product.name} saved.`);
    },
  });
  const saveCategoryMutation = useMutation({
    mutationFn: () =>
      createProductCategory({
        name: categoryName.trim(),
        code: categoryCode.trim().toUpperCase(),
        status: 'ACTIVE',
      }),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setCategoryName('');
      setCategoryCode('');
      setIsCategoryDialogOpen(false);
      setMessage(`${category.name} category saved.`);
    },
  });

  function resetProductForm() {
    setIsPhotoProcessing(false);
    setEditingProductId(null);
    setForm(defaultProductForm(categories, products.length));
    setError('');
    setMessage('');
    setIsProductDialogOpen(true);
  }

  function editProduct(product: Product) {
    setIsPhotoProcessing(false);
    setEditingProductId(product.id);
    setForm({
      name: product.variantName ?? product.name,
      productType: product.productType ?? 'SIMPLE',
      parentProductId: product.parentProductId,
      variantAttributes: product.variantAttributes ?? {},
      reorderLevel: product.reorderLevel ?? 0,
      sku: product.sku,
      barcode: product.barcode || generatedBarcode(),
      categoryId: product.categoryId,
      department: product.department ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      unitPrice: product.unitPrice,
      costPrice: product.costPrice ?? 0,
      vatCategory: product.vatCategory ?? organization.defaultProductVatCategory,
      sizes: product.sizes,
      colors: product.colors,
      status: product.status,
    });
    setError('');
    setMessage('');
    setIsProductDialogOpen(true);
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (isPhotoProcessing) {
      setError('Wait for the photo to finish preparing before saving.');
      return;
    }
    try {
      await saveProductMutation.mutateAsync({
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        barcode: form.barcode.trim(),
        department: form.department.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        sizes: form.sizes.map((value) => value.trim()).filter(Boolean),
        colors: form.colors.map((value) => value.trim()).filter(Boolean),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save product');
    }
  }

  async function handleProductStatus(product: Product) {
    setError('');
    setMessage('');
    try {
      if (product.status === 'ACTIVE') {
        await deactivateProduct(product.id);
        await queryClient.invalidateQueries({ queryKey: ['products'] });
        setMessage(`${product.name} deactivated.`);
        return;
      }
      const savedProduct = await updateProduct(product.id, {
        ...product,
        name: product.variantName ?? product.name,
        barcode: product.barcode ?? '',
        department: product.department ?? '',
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? '',
        costPrice: product.costPrice ?? 0,
        status: 'ACTIVE',
      });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setMessage(`${savedProduct.name} reactivated.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update product');
    }
  }

  async function handleCategoryStatus(category: ProductCategory) {
    setError('');
    setMessage('');
    try {
      if (category.status === 'ACTIVE') {
        await deactivateProductCategory(category.id);
        await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
        setMessage(`${category.name} category deactivated.`);
        return;
      }
      await updateProductCategory(category.id, {
        name: category.name,
        code: category.code,
        status: 'ACTIVE',
      });
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setMessage(`${category.name} category reactivated.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update category');
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveCategoryMutation.mutateAsync();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save category');
    }
  }

  return (
    <section className="branch-workspace product-catalog-workspace">
      <PageHeader
        title={view === 'products' ? 'Product Catalog' : 'Product Categories'}
        subtitle={
          view === 'products'
            ? 'Manage product details, variants and selling prices.'
            : 'Manage the categories used to organize your products.'
        }
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => downloadProductCatalogWorkbook(products, categories, organization)}
            >
              <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
              Download Excel
            </button>
            <button
              className="primary-action compact-action"
              type="button"
              onClick={() => {
                if (view === 'products') resetProductForm();
                else {
                  setError('');
                  setMessage('');
                  setIsCategoryDialogOpen(true);
                }
              }}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              {view === 'products' ? 'New Product' : 'New Category'}
            </button>
          </div>
        }
      />
      <nav className="catalog-module-switcher" aria-label="Product modules">
        <NavLink className="secondary-action compact-action" to="/product-catalog">
          <i className="bi bi-box-seam" aria-hidden="true" />
          Products
        </NavLink>
        <NavLink className="secondary-action compact-action" to="/product-categories">
          <i className="bi bi-tags" aria-hidden="true" />
          Product Categories
        </NavLink>
      </nav>
      <FormMessages error={error} message={message} />
      {isProductDialogOpen ? (
        <div
          className="dialog-backdrop catalog-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsProductDialogOpen(false);
            }
          }}
        >
          <section
            className="panel-card branch-form-panel catalog-dialog-card catalog-product-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={editingProduct ? 'Edit Product' : 'Register Product'}
          >
            <PanelHeader
              icon={editingProduct ? 'bi-pencil-square' : 'bi-plus-square'}
              title={editingProduct ? 'Edit Product' : 'Register Product'}
              action={
                <button
                  className="icon-button compact-icon"
                  type="button"
                  aria-label="Close product dialog"
                  onClick={() => setIsProductDialogOpen(false)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              }
            />
            <form className="record-form" onSubmit={handleProductSubmit}>
              <VariantProductFields
                form={form}
                products={products}
                onChange={setForm}
                parentLocked={Boolean(editingProduct?.parentProductId)}
              />
              <label className="field-stack">
                <span>Product Name</span>
                <input
                  required
                  maxLength={160}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>SKU</span>
                <input
                  required
                  maxLength={80}
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Barcode</span>
                <input
                  maxLength={80}
                  value={form.barcode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, barcode: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Category</span>
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  <option value="">Select a category</option>
                  {categories
                    .filter(
                      (category) => category.status === 'ACTIVE' || category.id === form.categoryId,
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Department</span>
                <input
                  maxLength={120}
                  value={form.department}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, department: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Selling Price</span>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.unitPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unitPrice: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Buying Price</span>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.costPrice}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      costPrice: Number(event.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>VAT Category</span>
                <select
                  value={form.vatCategory}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vatCategory: event.target.value as ProductVatCategory,
                    }))
                  }
                >
                  <option value="A">Standard rate</option>
                  <option value="G">Exempt</option>
                </select>
              </label>
              <label className="field-stack">
                <span>Sizes (comma-separated)</span>
                <input
                  value={form.sizes.join(', ')}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sizes: parseCsv(event.target.value) }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Colors (comma-separated)</span>
                <input
                  value={form.colors.join(', ')}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, colors: parseCsv(event.target.value) }))
                  }
                />
              </label>
              <label className="field-stack wide-field">
                <span>Description</span>
                <textarea
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <div className="field-stack wide-field">
                <ProductPhotoInput
                  key={editingProductId ?? 'new'}
                  value={form.imageUrl}
                  disabled={saveProductMutation.isPending}
                  onBusyChange={setIsPhotoProcessing}
                  onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))}
                />
              </div>
              <FormMessages error={error} message="" />
              <div className="form-actions">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => setIsProductDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-action compact-action"
                  type="submit"
                  disabled={
                    saveProductMutation.isPending || isPhotoProcessing || categories.length === 0
                  }
                >
                  <i className="bi bi-check2" aria-hidden="true" />
                  {saveProductMutation.isPending
                    ? 'Saving...'
                    : editingProduct
                      ? 'Save Changes'
                      : 'Register Product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {view === 'products' ? (
        <section className="panel-card branch-list-panel catalog-module-panel">
          <PanelHeader icon="bi-box-seam" title="Products" />
          {productsQuery.isPending || categoriesQuery.isPending ? (
            <LoadingPanel label="Loading products..." />
          ) : productsQuery.isError || categoriesQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Products could not be loaded"
              detail="Refresh the page or try again when the API is available."
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon="bi-box-seam"
              title="No products registered"
              detail="Products you register will appear here."
            />
          ) : (
            <div className="responsive-table catalog-module-table catalog-products-table mobile-compact-table">
              <table aria-label="Products">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU / Barcode</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                    <th className="mobile-row-more">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr
                      className={expandedProductId === product.id ? 'details-expanded' : undefined}
                      key={product.id}
                    >
                      <td className="mobile-row-name" data-label="Product">
                        <span className="table-label">
                          <ProductImage product={product} index={index} small />
                          <span className="catalog-product-label">
                            <strong>{product.name}</strong>
                            {product.productType === 'VARIABLE' && (
                              <small className="table-subtext">
                                Parent ·{' '}
                                {products.filter((p) => p.parentProductId === product.id).length}{' '}
                                variants
                              </small>
                            )}
                          </span>
                        </span>
                      </td>
                      <td data-label="SKU / Barcode">
                        <span className="catalog-code-label">
                          <span>{product.sku}</span>
                          <small className="table-subtext">{product.barcode || 'N/A'}</small>
                        </span>
                      </td>
                      <td data-label="Category">{product.categoryName}</td>
                      <td data-label="Department">{product.department || 'N/A'}</td>
                      <td className="mobile-row-value" data-label="Price">
                        {formatMoney(product.unitPrice, organization.currencyCode)}
                      </td>
                      <td data-label="Stock">{formatQuantity(product.totalStock)}</td>
                      <td data-label="Status">
                        <StatusPill
                          status={product.status === 'ACTIVE' ? 'posted' : 'pending'}
                          label={product.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td data-label="Actions">
                        <span className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editProduct(product)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                          {product.productType === 'VARIABLE' && (
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => {
                                setEditingProductId(null);
                                setForm({
                                  ...defaultProductForm(categories, products.length),
                                  name: '',
                                  parentProductId: product.id,
                                  productType: 'SIMPLE',
                                  categoryId: product.categoryId,
                                  vatCategory: product.vatCategory,
                                  variantAttributes: { Volume: '' },
                                });
                                setError('');
                                setIsProductDialogOpen(true);
                              }}
                            >
                              Add Variant
                            </button>
                          )}
                          <button
                            className={
                              product.status === 'ACTIVE'
                                ? 'text-button danger-text'
                                : 'text-button'
                            }
                            type="button"
                            onClick={() => void handleProductStatus(product)}
                          >
                            {product.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </span>
                      </td>
                      <td className="mobile-row-more">
                        <button
                          aria-label={`Details and actions for ${product.name}`}
                          aria-expanded={expandedProductId === product.id}
                          className="mobile-row-more-button"
                          type="button"
                          onClick={() =>
                            setExpandedProductId((current) =>
                              current === product.id ? null : product.id,
                            )
                          }
                        >
                          <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="panel-card branch-list-panel catalog-module-panel">
          <PanelHeader icon="bi-tags" title="Product Categories" />
          {categoriesQuery.isPending ? (
            <LoadingPanel label="Loading categories..." />
          ) : categoriesQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Categories could not be loaded"
              detail="Refresh the page or try again when the API is available."
            />
          ) : categories.length === 0 ? (
            <EmptyState
              icon="bi-tags"
              title="No categories registered"
              detail="Use New Category to organize your products."
            />
          ) : (
            <div className="responsive-table catalog-module-table catalog-categories-table">
              <table aria-label="Product categories">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Category Code</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td data-label="Category Name">
                        <strong>{category.name}</strong>
                      </td>
                      <td data-label="Category Code">{category.code}</td>
                      <td data-label="Status">
                        <StatusPill
                          status={category.status === 'ACTIVE' ? 'posted' : 'pending'}
                          label={category.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td data-label="Actions">
                        <button
                          className={
                            category.status === 'ACTIVE' ? 'text-button danger-text' : 'text-button'
                          }
                          type="button"
                          onClick={() => void handleCategoryStatus(category)}
                        >
                          {category.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {isCategoryDialogOpen ? (
        <div
          className="dialog-backdrop catalog-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsCategoryDialogOpen(false);
          }}
        >
          <section
            className="panel-card catalog-dialog-card catalog-category-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="New Category"
          >
            <PanelHeader
              icon="bi-tags"
              title="New Category"
              action={
                <button
                  className="icon-button compact-icon"
                  type="button"
                  aria-label="Close category dialog"
                  onClick={() => setIsCategoryDialogOpen(false)}
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              }
            />
            <form className="record-form" onSubmit={handleCategorySubmit}>
              <label className="field-stack">
                <span>Category Name</span>
                <input
                  autoFocus
                  required
                  maxLength={120}
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                />
              </label>
              <label className="field-stack">
                <span>Category Code</span>
                <input
                  required
                  maxLength={40}
                  value={categoryCode}
                  onChange={(event) => setCategoryCode(event.target.value.toUpperCase())}
                />
              </label>
              <FormMessages error={error} message="" />
              <div className="form-actions">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => setIsCategoryDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-action compact-action"
                  type="submit"
                  disabled={saveCategoryMutation.isPending}
                >
                  {saveCategoryMutation.isPending ? 'Saving...' : 'Add Category'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type InventoryHealthFilter = 'ALL' | InventoryItem['stockHealth'];
type InventoryInsightDialog = 'category' | 'branch' | 'alerts' | null;
type InventoryDetailTab = 'overview' | 'stock' | 'history';

function Inventory({
  currentUser,
  organization,
}: {
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const { branchId: platformBranchId } = usePlatform();
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const canAdjustInventory = hasAnyPermission(currentUser, ['admin:manage', 'inventory:adjust']);
  const canViewStockAdjustments = hasAnyPermission(currentUser, [
    'admin:manage',
    'inventory:adjust',
    'reports:view',
  ]);
  const stockAdjustmentsQuery = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: getStockAdjustments,
    enabled: canViewStockAdjustments,
  });
  const inventory = inBranch(inventoryQuery.data ?? [], platformBranchId);
  const stockAdjustments = inBranch(stockAdjustmentsQuery.data ?? [], platformBranchId);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState<InventoryHealthFilter>('ALL');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [activeInventoryDetailTab, setActiveInventoryDetailTab] =
    useState<InventoryDetailTab>('overview');
  const [inventoryDialog, setInventoryDialog] = useState<InventoryInsightDialog>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentMessage, setAdjustmentMessage] = useState('');
  const totalStockValue = inventory.reduce(
    (sum, item) => sum + item.quantityOnHand * item.unitPrice,
    0,
  );
  const totalUnits = inventory.reduce((sum, item) => sum + item.quantityOnHand, 0);
  const totalAvailable = inventory.reduce((sum, item) => sum + item.quantityAvailable, 0);
  const totalReserved = inventory.reduce((sum, item) => sum + item.quantityReserved, 0);
  const lowStock = inventory.filter((item) => item.stockHealth === 'LOW_STOCK');
  const outOfStock = inventory.filter((item) => item.stockHealth === 'OUT_OF_STOCK');
  const healthyStock = inventory.filter((item) => item.stockHealth === 'HEALTHY');
  const categories = inventoryByCategory(inventory);
  const branches = inventoryByBranch(inventory);
  const maxCategoryCount = Math.max(1, ...categories.map((item) => item.count));
  const maxBranchCount = Math.max(1, ...branches.map((item) => item.count));
  const alertItems = [...outOfStock, ...lowStock].slice(0, 5);
  const alertCount = lowStock.length + outOfStock.length;
  const activeFilterCount = [
    searchTerm.trim().length > 0,
    branchFilter !== 'ALL',
    categoryFilter !== 'ALL',
    healthFilter !== 'ALL',
  ].filter(Boolean).length;
  const topCategory = categories[0];
  const topBranch = branches[0];
  const healthSummary = [
    { key: 'HEALTHY', label: 'Healthy', count: healthyStock.length, tone: 'healthy' },
    { key: 'LOW_STOCK', label: 'Low Stock', count: lowStock.length, tone: 'low' },
    { key: 'OUT_OF_STOCK', label: 'Out', count: outOfStock.length, tone: 'out' },
  ];
  const filteredInventory = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesSearch =
        !query ||
        [item.productName, item.sku, item.categoryName].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesBranch = branchFilter === 'ALL' || item.branchName === branchFilter;
      const matchesCategory = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesHealth = healthFilter === 'ALL' || item.stockHealth === healthFilter;

      return matchesSearch && matchesBranch && matchesCategory && matchesHealth;
    });
  }, [branchFilter, categoryFilter, healthFilter, inventory, searchTerm]);
  const selectedInventoryItem = useMemo(
    () =>
      filteredInventory.find((item) => item.id === selectedInventoryId) ??
      filteredInventory[0] ??
      null,
    [filteredInventory, selectedInventoryId],
  );
  const selectedStockValue = selectedInventoryItem
    ? selectedInventoryItem.quantityOnHand * selectedInventoryItem.unitPrice
    : 0;
  const selectedAvailablePercent =
    selectedInventoryItem && selectedInventoryItem.quantityOnHand > 0
      ? Math.round(
          (selectedInventoryItem.quantityAvailable / selectedInventoryItem.quantityOnHand) * 100,
        )
      : 0;
  const selectedReservedPercent =
    selectedInventoryItem && selectedInventoryItem.quantityOnHand > 0
      ? Math.round(
          (selectedInventoryItem.quantityReserved / selectedInventoryItem.quantityOnHand) * 100,
        )
      : 0;
  const selectedStockAdjustments = selectedInventoryItem
    ? stockAdjustments
        .filter((adjustment) => adjustment.productId === selectedInventoryItem.productId)
        .slice(0, 3)
    : [];
  const recentStockAdjustments = stockAdjustments.slice(0, 8);

  function resetFilters() {
    setSearchTerm('');
    setBranchFilter('ALL');
    setCategoryFilter('ALL');
    setHealthFilter('ALL');
  }

  function startAdjustment(item: InventoryItem) {
    setAdjustingItem(item);
    setAdjustmentMessage('');
  }

  useEffect(() => {
    if (filteredInventory.length === 0) {
      if (selectedInventoryId !== null) {
        setSelectedInventoryId(null);
      }
      return;
    }

    if (!filteredInventory.some((item) => item.id === selectedInventoryId)) {
      setSelectedInventoryId(filteredInventory[0].id);
    }
  }, [filteredInventory, selectedInventoryId]);

  useEffect(() => {
    if (inventoryDialog == null) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setInventoryDialog(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventoryDialog]);

  return (
    <section className="inventory-workspace">
      <PageHeader
        title="Inventory"
        subtitle="Monitor stock value, available units, and reorder signals."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => setInventoryDialog('category')}
            >
              <i className="bi bi-tags" aria-hidden="true" />
              Category Mix
            </button>
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => setInventoryDialog('branch')}
            >
              <i className="bi bi-shop" aria-hidden="true" />
              Branch Stock
            </button>
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => setInventoryDialog('alerts')}
            >
              <i className="bi bi-bell" aria-hidden="true" />
              Stock Alerts
            </button>
            <NavLink className="primary-action compact-action" to="/add-stock">
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Stock
            </NavLink>
          </div>
        }
      />

      {adjustmentMessage ? (
        <p className="message-banner success">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          {adjustmentMessage}
        </p>
      ) : null}

      {inventoryDialog ? (
        <div
          className="dialog-backdrop inventory-insight-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setInventoryDialog(null);
            }
          }}
        >
          {inventoryDialog === 'category' ? (
            <section
              className="panel-card inventory-category-panel inventory-insight-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Category Mix"
            >
              <PanelHeader
                icon="bi-tags"
                title="Category Mix"
                tone="blue"
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close category mix"
                    onClick={() => setInventoryDialog(null)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              {categories.length === 0 ? (
                <EmptyState
                  icon="bi-grid"
                  title="No inventory by category"
                  detail="Stock added to products will be grouped here."
                />
              ) : (
                <>
                  <span className="inventory-panel-count">{categories.length} categories</span>
                  <div className="category-bars">
                    {categories.map((item) => (
                      <div className="category-bar-row" key={item.label}>
                        <span className="category-bar-label">
                          <strong>{item.label}</strong>
                          <small>{formatMoney(item.value, organization.currencyCode)}</small>
                        </span>
                        <div className="category-bar-track">
                          <span
                            className={`category-bar ${item.tone}`}
                            style={{ width: `${(item.count / maxCategoryCount) * 100}%` }}
                          />
                        </div>
                        <strong>{item.count.toLocaleString('en-KE')}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          ) : null}

          {inventoryDialog === 'branch' ? (
            <section
              className="panel-card inventory-branch-panel inventory-insight-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Branch Stock"
            >
              <PanelHeader
                icon="bi-shop"
                title="Branch Stock"
                tone="blue"
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close branch stock"
                    onClick={() => setInventoryDialog(null)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              <div className="horizontal-bars">
                {branches.map((row) => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{formatQuantity(row.count)}</strong>
                    <div>
                      <i style={{ width: `${Math.round((row.count / maxBranchCount) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {inventoryDialog === 'alerts' ? (
            <section
              className="panel-card stock-alerts-panel inventory-insight-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Stock Alerts"
            >
              <PanelHeader
                icon="bi-bell"
                title="Stock Alerts"
                tone={alertCount > 0 ? 'orange' : 'blue'}
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close stock alerts"
                    onClick={() => setInventoryDialog(null)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              {alertItems.length === 0 ? (
                <EmptyState
                  icon="bi-check-circle"
                  title="No stock alerts"
                  detail="Low and out-of-stock items will appear here."
                />
              ) : (
                <>
                  <span className="inventory-panel-count">{alertCount} alerts</span>
                  {alertItems.map((item) => (
                    <div className="stock-alert-row" key={item.id}>
                      <span className={`inventory-alert-icon ${stockHealthTone(item.stockHealth)}`}>
                        <i
                          className={`bi ${
                            item.stockHealth === 'OUT_OF_STOCK'
                              ? 'bi-x-circle'
                              : 'bi-exclamation-triangle'
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>{item.sku}</span>
                      </div>
                      <em className={item.stockHealth === 'OUT_OF_STOCK' ? 'danger' : 'warning'}>
                        <i
                          className={`bi ${
                            item.stockHealth === 'OUT_OF_STOCK'
                              ? 'bi-x-circle'
                              : 'bi-exclamation-triangle'
                          }`}
                          aria-hidden="true"
                        />
                        {stockHealthLabel(item.stockHealth)}
                      </em>
                    </div>
                  ))}
                </>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {adjustingItem ? (
        <StockAdjustmentDialog
          item={adjustingItem}
          organization={organization}
          onAdjusted={(adjustment) => {
            setAdjustmentMessage(
              `${adjustment.productName} count recorded for ${adjustment.branchName}.`,
            );
            setAdjustingItem(null);
          }}
          onClose={() => setAdjustingItem(null)}
        />
      ) : null}

      <section className="inventory-command-panel" aria-label="Inventory overview">
        <div className="inventory-value-block">
          <span className={`inventory-status-badge ${alertCount > 0 ? 'warning' : 'healthy'}`}>
            <i
              className={`bi ${alertCount > 0 ? 'bi-exclamation-triangle' : 'bi-check2-circle'}`}
              aria-hidden="true"
            />
            {alertCount > 0 ? `${alertCount} lines need attention` : 'All lines healthy'}
          </span>
          <h2>{formatMoney(totalStockValue, organization.currencyCode)}</h2>
          <p>
            {totalUnits.toLocaleString('en-KE')} units on hand -{' '}
            {totalAvailable.toLocaleString('en-KE')} available for sale.
          </p>
        </div>

        <dl className="inventory-hero-stats">
          <div>
            <dt>Reserved</dt>
            <dd>{totalReserved.toLocaleString('en-KE')}</dd>
            <span>Units held aside</span>
          </div>
          <div>
            <dt>Available</dt>
            <dd>{totalAvailable.toLocaleString('en-KE')}</dd>
            <span>Units ready for sale</span>
          </div>
          <div>
            <dt>Categories</dt>
            <dd>{categories.length.toLocaleString('en-KE')}</dd>
            <span>{topCategory ? `${topCategory.label} is largest` : 'No category stock'}</span>
          </div>
        </dl>

        <div className="inventory-health-block">
          <div className="inventory-health-title">
            <span>Stock Health</span>
            <strong>{inventory.length.toLocaleString('en-KE')} lines</strong>
          </div>
          <div className="inventory-health-meter" aria-hidden="true">
            {healthSummary.map((item) => (
              <span
                className={`inventory-health-segment ${item.tone}`}
                key={item.key}
                style={{
                  width: `${inventory.length ? (item.count / inventory.length) * 100 : 0}%`,
                }}
              />
            ))}
          </div>
          <div className="inventory-health-legend">
            {healthSummary.map((item) => (
              <span key={item.key}>
                <i className={item.tone} aria-hidden="true" />
                {item.label}
                <strong>{item.count.toLocaleString('en-KE')}</strong>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="inventory-toolbar" aria-label="Inventory filters">
        <label className="inventory-search-field">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="sr-only">Search inventory</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            placeholder="Search products, SKU, or category"
          />
        </label>
        <label className="inventory-filter-field">
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.currentTarget.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map((category) => (
              <option key={category.label} value={category.label}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inventory-filter-field">
          <span>Health</span>
          <select
            value={healthFilter}
            onChange={(event) =>
              setHealthFilter(event.currentTarget.value as InventoryHealthFilter)
            }
          >
            <option value="ALL">All health</option>
            <option value="HEALTHY">Healthy</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </label>
        <button
          className="secondary-action compact-action inventory-reset-button"
          type="button"
          disabled={activeFilterCount === 0}
          onClick={resetFilters}
        >
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          Reset
        </button>
      </div>

      {selectedInventoryItem ? (
        <section className="inventory-focus-board" aria-label="Inventory item detail">
          <aside className="inventory-focus-list">
            <div className="inventory-focus-list-heading">
              <strong>Active Items</strong>
              <span>{filteredInventory.length.toLocaleString('en-KE')}</span>
            </div>
            <div className="inventory-focus-options">
              {filteredInventory.map((item) => (
                <button
                  aria-pressed={item.id === selectedInventoryItem.id}
                  className={`inventory-focus-option ${
                    item.id === selectedInventoryItem.id ? 'active' : ''
                  }`}
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedInventoryId(item.id);
                    setActiveInventoryDetailTab('overview');
                  }}
                >
                  <span className={`inventory-focus-check ${stockHealthTone(item.stockHealth)}`}>
                    <i
                      className={`bi ${
                        item.id === selectedInventoryItem.id ? 'bi-check2' : 'bi-box'
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <span>
                    <strong>{item.productName}</strong>
                    <small>{item.sku}</small>
                  </span>
                  <em>{formatQuantity(item.quantityAvailable)}</em>
                </button>
              ))}
            </div>
          </aside>

          <section className="inventory-detail-panel">
            <div className="inventory-detail-heading">
              <div>
                <span className="inventory-detail-eyebrow">{selectedInventoryItem.sku}</span>
                <h2>{selectedInventoryItem.productName}</h2>
              </div>
              <StockHealthPill health={stockHealthLabel(selectedInventoryItem.stockHealth)} />
            </div>

            <div className="inventory-detail-tabs" role="tablist" aria-label="Inventory detail">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'stock', label: 'Stock' },
                { id: 'history', label: 'History' },
              ].map((tab) => (
                <button
                  aria-selected={activeInventoryDetailTab === tab.id}
                  className={activeInventoryDetailTab === tab.id ? 'active' : ''}
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => setActiveInventoryDetailTab(tab.id as InventoryDetailTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeInventoryDetailTab === 'overview' ? (
              <dl className="inventory-detail-grid">
                <div>
                  <dt>Item Type</dt>
                  <dd>Inventory Item</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{selectedInventoryItem.categoryName}</dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>{selectedInventoryItem.branchName}</dd>
                </div>
                <div>
                  <dt>Unit Price</dt>
                  <dd>{formatMoney(selectedInventoryItem.unitPrice, organization.currencyCode)}</dd>
                </div>
                <div>
                  <dt>Reorder Level</dt>
                  <dd>{formatQuantity(selectedInventoryItem.reorderLevel)}</dd>
                </div>
                <div>
                  <dt>Stock Value</dt>
                  <dd>{formatMoney(selectedStockValue, organization.currencyCode)}</dd>
                </div>
              </dl>
            ) : null}

            {activeInventoryDetailTab === 'stock' ? (
              <div className="inventory-stock-ledger">
                <div>
                  <span>On Hand</span>
                  <strong>{formatQuantity(selectedInventoryItem.quantityOnHand)}</strong>
                </div>
                <div>
                  <span>Committed Stock</span>
                  <strong>{formatQuantity(selectedInventoryItem.quantityReserved)}</strong>
                </div>
                <div>
                  <span>Available for Sale</span>
                  <strong>{formatQuantity(selectedInventoryItem.quantityAvailable)}</strong>
                </div>
                <div>
                  <span>Reorder Level</span>
                  <strong>{formatQuantity(selectedInventoryItem.reorderLevel)}</strong>
                </div>
              </div>
            ) : null}

            {activeInventoryDetailTab === 'history' ? (
              <div className="inventory-detail-history">
                {selectedStockAdjustments.length > 0 ? (
                  selectedStockAdjustments.map((adjustment) => (
                    <div key={adjustment.id}>
                      <span>{commercialFormatDate(adjustment.adjustedAt)}</span>
                      <strong>
                        {adjustment.varianceQuantity > 0 ? '+' : ''}
                        {formatQuantity(adjustment.varianceQuantity)}
                      </strong>
                      <small>{adjustment.reason}</small>
                    </div>
                  ))
                ) : (
                  <p>No variance adjustments recorded for this item.</p>
                )}
              </div>
            ) : null}
          </section>

          <aside className="inventory-stock-panel">
            <div className="inventory-stock-panel-head">
              <span>Accounting Stock</span>
              <strong>{formatQuantity(selectedInventoryItem.quantityOnHand)}</strong>
            </div>
            <div className="inventory-stock-meter">
              <span style={{ width: `${selectedAvailablePercent}%` }} />
            </div>
            <dl className="inventory-stock-lines">
              <div>
                <dt>Stock on Hand</dt>
                <dd>{formatQuantity(selectedInventoryItem.quantityOnHand)}</dd>
              </div>
              <div>
                <dt>Committed Stock</dt>
                <dd>{formatQuantity(selectedInventoryItem.quantityReserved)}</dd>
              </div>
              <div>
                <dt>Available for Sale</dt>
                <dd>{formatQuantity(selectedInventoryItem.quantityAvailable)}</dd>
              </div>
              <div>
                <dt>Reserved Share</dt>
                <dd>{selectedReservedPercent}%</dd>
              </div>
            </dl>
            <div className="inventory-stock-actions">
              <NavLink className="primary-action compact-action" to="/add-stock">
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Add Stock
              </NavLink>
              {canAdjustInventory ? (
                <button
                  className="secondary-action compact-action"
                  type="button"
                  onClick={() => startAdjustment(selectedInventoryItem)}
                >
                  <i className="bi bi-calculator" aria-hidden="true" />
                  Adjust
                </button>
              ) : null}
            </div>
          </aside>
        </section>
      ) : null}

      <section className="panel-card inventory-table-panel">
        <div className="table-title-row inventory-table-title-row">
          <div>
            <h2>Product Inventory</h2>
            <p>
              {filteredInventory.length === inventory.length
                ? `${inventory.length} stock records`
                : `${filteredInventory.length} of ${inventory.length} stock records`}
            </p>
          </div>
          <span className="inventory-panel-count">
            {activeFilterCount === 0 ? 'All records' : `${activeFilterCount} filters active`}
          </span>
        </div>
        {inventoryQuery.isPending ? (
          <LoadingPanel label="Loading inventory..." />
        ) : inventory.length === 0 ? (
          <EmptyState
            icon="bi-box"
            title="No inventory registered"
            detail="Use Add Stock to create stock quantities from supplier receipts."
          />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            icon="bi-funnel"
            title="No inventory matches filters"
            detail="Adjust the search, category, or health filter."
          />
        ) : (
          <div className="responsive-table mobile-compact-table">
            <table aria-label="Product inventory">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Stock Value</th>
                  <th>Stock Health</th>
                  {canAdjustInventory ? <th>Actions</th> : null}
                  <th className="mobile-row-more">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <InventoryTableRow
                    canAdjustInventory={canAdjustInventory}
                    compactOnMobile
                    item={item}
                    key={item.id}
                    onAdjust={startAdjustment}
                    organization={organization}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canViewStockAdjustments ? (
        <section className="panel-card inventory-table-panel stock-adjustment-history-panel">
          <div className="table-title-row inventory-table-title-row">
            <div>
              <h2>Recent Variance Adjustments</h2>
              <p>{stockAdjustments.length.toLocaleString('en-KE')} stock count records</p>
            </div>
            <span className="inventory-panel-count">
              {recentStockAdjustments.length.toLocaleString('en-KE')} shown
            </span>
          </div>
          {stockAdjustmentsQuery.isPending ? (
            <LoadingPanel label="Loading count adjustments..." />
          ) : stockAdjustmentsQuery.isError ? (
            <EmptyState
              icon="bi-exclamation-circle"
              title="Variance records unavailable"
              detail="Refresh the page after the API is available."
            />
          ) : recentStockAdjustments.length === 0 ? (
            <EmptyState
              icon="bi-check-circle"
              title="No variance adjustments"
              detail="Recorded physical stock counts will appear here."
            />
          ) : (
            <StockAdjustmentHistoryTable
              organization={organization}
              rows={recentStockAdjustments}
            />
          )}
        </section>
      ) : null}
    </section>
  );
}

function InventoryTableRow({
  canAdjustInventory,
  compactOnMobile = false,
  item,
  onAdjust,
  organization,
}: {
  canAdjustInventory: boolean;
  compactOnMobile?: boolean;
  item: InventoryItem;
  onAdjust: (item: InventoryItem) => void;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [reorderLevel, setReorderLevel] = useState(String(item.reorderLevel));
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const reorderMutation = useMutation({
    mutationFn: (nextReorderLevel: number) =>
      updateInventoryReorderLevel(item.id, { reorderLevel: nextReorderLevel }),
    onSuccess: async (updatedItem) => {
      queryClient.setQueryData<InventoryItem[]>(['inventory'], (current) =>
        current?.map((inventoryItem) =>
          inventoryItem.id === updatedItem.id ? updatedItem : inventoryItem,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setReorderLevel(String(updatedItem.reorderLevel));
      setStatusMessage('Saved');
    },
    onError: (caughtError) => {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save reorder level');
    },
  });
  const currentValue = Number(reorderLevel);
  const hasValidValue =
    reorderLevel.trim() !== '' && Number.isInteger(currentValue) && currentValue >= 0;
  const hasChanges = hasValidValue && currentValue !== item.reorderLevel;

  useEffect(() => {
    setReorderLevel(String(item.reorderLevel));
    setError('');
  }, [item.reorderLevel]);

  function handleReorderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setStatusMessage('');

    if (!hasValidValue) {
      setError('Use a whole number');
      return;
    }

    if (!hasChanges) {
      return;
    }

    reorderMutation.mutate(currentValue);
  }

  return (
    <tr className={compactOnMobile && detailsExpanded ? 'details-expanded' : undefined}>
      <td className="mobile-row-name" data-label="Product">
        <span className="inventory-product-cell">
          <span className={`inventory-product-icon ${stockHealthTone(item.stockHealth)}`}>
            <i className="bi bi-box-seam" aria-hidden="true" />
          </span>
          <span>
            <strong>{item.productName}</strong>
            <small>{item.sku}</small>
          </span>
        </span>
      </td>
      <td data-label="SKU">
        <span className="inventory-sku">{item.sku}</span>
      </td>
      <td data-label="Category">{item.categoryName}</td>
      <td data-label="On Hand" className="number-cell">
        {item.quantityOnHand.toLocaleString('en-KE')}
      </td>
      <td data-label="Reserved" className="number-cell">
        {item.quantityReserved.toLocaleString('en-KE')}
      </td>
      <td data-label="Available" className="number-cell mobile-row-value">
        {item.quantityAvailable.toLocaleString('en-KE')}
      </td>
      <td data-label="Reorder Level">
        <form className="reorder-level-form" onSubmit={handleReorderSubmit}>
          <input
            aria-label={`Reorder level for ${item.productName}`}
            inputMode="numeric"
            min={0}
            step={1}
            type="number"
            value={reorderLevel}
            onChange={(event) => {
              setReorderLevel(event.currentTarget.value);
              setError('');
              setStatusMessage('');
            }}
          />
          <button
            aria-label={`Save reorder level for ${item.productName}`}
            className="secondary-action compact-action"
            disabled={!hasChanges || reorderMutation.isPending}
            type="submit"
          >
            Save
          </button>
          {error ? <small className="reorder-level-feedback error">{error}</small> : null}
          {statusMessage ? (
            <small className="reorder-level-feedback success">{statusMessage}</small>
          ) : null}
        </form>
      </td>
      <td data-label="Stock Value" className="money-cell">
        {formatMoney(item.quantityOnHand * item.unitPrice, organization.currencyCode)}
      </td>
      <td data-label="Stock Health">
        <StockHealthPill health={stockHealthLabel(item.stockHealth)} />
      </td>
      {canAdjustInventory ? (
        <td data-label="Actions">
          <button className="text-button" type="button" onClick={() => onAdjust(item)}>
            <i className="bi bi-calculator" aria-hidden="true" />
            Adjust Count
          </button>
        </td>
      ) : null}
      {compactOnMobile ? (
        <td className="mobile-row-more">
          <button
            aria-label={`Details and actions for ${item.productName}`}
            aria-expanded={detailsExpanded}
            className="mobile-row-more-button"
            type="button"
            onClick={() => setDetailsExpanded((current) => !current)}
          >
            <i className="bi bi-three-dots-vertical" aria-hidden="true" />
          </button>
        </td>
      ) : null}
    </tr>
  );
}

type StockAdjustmentFormState = {
  countedQuantity: string;
  reason: string;
  notes: string;
};

function defaultStockAdjustmentForm(item: InventoryItem): StockAdjustmentFormState {
  return {
    countedQuantity: String(item.quantityOnHand),
    reason: '',
    notes: '',
  };
}

function StockAdjustmentDialog({
  item,
  onAdjusted,
  onClose,
  organization,
}: {
  item: InventoryItem;
  onAdjusted: (adjustment: StockAdjustment) => void;
  onClose: () => void;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const [form, setForm] = useState<StockAdjustmentFormState>(() =>
    defaultStockAdjustmentForm(item),
  );
  const [error, setError] = useState('');
  const countedQuantity = Number(form.countedQuantity);
  const hasValidCount =
    form.countedQuantity.trim() !== '' && Number.isInteger(countedQuantity) && countedQuantity >= 0;
  const varianceQuantity = hasValidCount ? countedQuantity - item.quantityOnHand : 0;
  const varianceTone =
    varianceQuantity < 0 ? 'negative-text' : varianceQuantity > 0 ? 'positive-text' : '';

  useEffect(() => {
    setForm(defaultStockAdjustmentForm(item));
    setError('');
  }, [item]);

  const adjustmentMutation = useMutation({
    mutationFn: (payload: StockAdjustmentRequest) => createStockAdjustment(payload),
    onSuccess: async (adjustment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] }),
      ]);
      onAdjusted(adjustment);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!hasValidCount) {
      setError('Use a whole physical count.');
      return;
    }
    if (countedQuantity < item.quantityReserved) {
      setError('Physical count cannot be below reserved stock.');
      return;
    }
    if (!form.reason.trim()) {
      setError('Reason is required.');
      return;
    }

    try {
      await adjustmentMutation.mutateAsync({
        branchId: item.branchId,
        productId: item.productId,
        countedQuantity,
        reason: form.reason.trim(),
        notes: form.notes.trim(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to record count');
    }
  }

  return (
    <div
      className="dialog-backdrop stock-adjustment-dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !adjustmentMutation.isPending) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="payment-dialog stock-adjustment-dialog"
        role="dialog"
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">Physical Count</p>
            <h2 id={titleId}>Adjust Stock Count</h2>
            <p>{item.productName}</p>
          </div>
          <button
            aria-label="Close adjustment dialog"
            className="icon-button"
            disabled={adjustmentMutation.isPending}
            type="button"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="adjustment-preview-grid">
          <div>
            <span>System</span>
            <strong>{formatQuantity(item.quantityOnHand)}</strong>
          </div>
          <div>
            <span>Reserved</span>
            <strong>{formatQuantity(item.quantityReserved)}</strong>
          </div>
          <div>
            <span>Counted</span>
            <strong>{hasValidCount ? formatQuantity(countedQuantity) : '-'}</strong>
          </div>
          <div>
            <span>Variance</span>
            <strong className={varianceTone}>{formatSignedQuantity(varianceQuantity)}</strong>
          </div>
        </div>

        {error ? (
          <p className="message-banner error" role="alert">
            <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <form className="record-form stock-adjustment-form" onSubmit={handleSubmit}>
          <label className="field-stack">
            <span>Physical Count</span>
            <input
              autoFocus
              inputMode="numeric"
              min={item.quantityReserved}
              step={1}
              type="number"
              value={form.countedQuantity}
              onChange={(event) =>
                setForm((current) => ({ ...current, countedQuantity: event.target.value }))
              }
            />
          </label>
          <label className="field-stack">
            <span>Reason</span>
            <input
              maxLength={160}
              value={form.reason}
              onChange={(event) =>
                setForm((current) => ({ ...current, reason: event.target.value }))
              }
            />
          </label>
          <label className="field-stack wide-field">
            <span>Notes</span>
            <textarea
              maxLength={500}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>
          <div className="receipt-line-total adjustment-value-note">
            <span>Current Retail Value</span>
            <strong>
              {formatMoney(item.quantityOnHand * item.unitPrice, organization.currencyCode)}
            </strong>
          </div>
          <div className="form-actions">
            <button
              className="secondary-action compact-action"
              disabled={adjustmentMutation.isPending}
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="primary-action compact-action"
              disabled={adjustmentMutation.isPending}
              type="submit"
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {adjustmentMutation.isPending ? 'Recording...' : 'Record Count'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StockAdjustmentHistoryTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: StockAdjustment[];
}) {
  const [expandedAdjustmentId, setExpandedAdjustmentId] = useState<string | null>(null);

  return (
    <div className="responsive-table mobile-compact-table stock-adjustment-history-table">
      <table aria-label="Recent variance adjustments">
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>System</th>
            <th>Counted</th>
            <th>Variance</th>
            <th>Loss</th>
            <th>Excess</th>
            <th>Reason</th>
            <th className="mobile-row-more">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={expandedAdjustmentId === row.id ? 'details-expanded' : undefined}
              key={row.id}
            >
              <td data-label="Date">{formatDateTime(row.adjustedAt)}</td>
              <td className="mobile-row-name" data-label="Product">
                <span className="inventory-product-cell">
                  <span className={`inventory-product-icon ${stockAdjustmentTone(row)}`}>
                    <i className="bi bi-box-seam" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{row.productName}</strong>
                    <small>{row.sku}</small>
                  </span>
                </span>
              </td>
              <td data-label="System" className="number-cell">
                {formatQuantity(row.systemQuantity)}
              </td>
              <td data-label="Counted" className="number-cell">
                {formatQuantity(row.countedQuantity)}
              </td>
              <td
                data-label="Variance"
                className={`number-cell mobile-row-value ${
                  row.varianceQuantity < 0 ? 'negative-text' : 'positive-text'
                }`}
              >
                {formatSignedQuantity(row.varianceQuantity)}
              </td>
              <td data-label="Loss" className="money-cell">
                {formatMoney(row.lossValue, organization.currencyCode)}
              </td>
              <td data-label="Excess" className="money-cell">
                {formatMoney(row.excessValue, organization.currencyCode)}
              </td>
              <td data-label="Reason">{row.reason}</td>
              <td className="mobile-row-more">
                <button
                  aria-label={`Adjustment details for ${row.productName}`}
                  aria-expanded={expandedAdjustmentId === row.id}
                  className="mobile-row-more-button"
                  type="button"
                  onClick={() =>
                    setExpandedAdjustmentId((current) => (current === row.id ? null : row.id))
                  }
                >
                  <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockPage({ organization }: { organization: Organization }) {
  const { branchId: platformBranchId } = usePlatform();
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const inventory = inBranch(inventoryQuery.data ?? [], platformBranchId);
  const lowStockItems = useMemo(
    () =>
      inventory
        .filter((item) => item.reorderLevel > 0 && item.quantityAvailable <= item.reorderLevel)
        .sort((first, second) => {
          const firstOut = first.stockHealth === 'OUT_OF_STOCK' ? 0 : 1;
          const secondOut = second.stockHealth === 'OUT_OF_STOCK' ? 0 : 1;
          if (firstOut !== secondOut) {
            return firstOut - secondOut;
          }
          return first.quantityAvailable - second.quantityAvailable;
        }),
    [inventory],
  );
  const outOfStockCount = lowStockItems.filter(
    (item) => item.stockHealth === 'OUT_OF_STOCK',
  ).length;
  const lowStockCount = lowStockItems.length - outOfStockCount;
  const neededUnits = lowStockItems.reduce(
    (sum, item) => sum + Math.max(0, item.reorderLevel - item.quantityAvailable),
    0,
  );

  return (
    <section className="inventory-workspace">
      <PageHeader
        title="Low Stock"
        subtitle="Products at or below their configured reorder level."
        action={
          <div className="header-actions">
            <NavLink className="secondary-action compact-action" to="/inventory">
              <i className="bi bi-box" aria-hidden="true" />
              Inventory
            </NavLink>
            <NavLink className="primary-action compact-action" to="/add-stock">
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Stock
            </NavLink>
          </div>
        }
      />

      <section className="inventory-command-panel low-stock-summary" aria-label="Low stock summary">
        <dl className="inventory-hero-stats">
          <div>
            <dt>Below Reorder</dt>
            <dd>{lowStockItems.length.toLocaleString('en-KE')}</dd>
            <span>Inventory lines</span>
          </div>
          <div>
            <dt>Out of Stock</dt>
            <dd>{outOfStockCount.toLocaleString('en-KE')}</dd>
            <span>Available quantity is zero</span>
          </div>
          <div>
            <dt>Low Stock</dt>
            <dd>{lowStockCount.toLocaleString('en-KE')}</dd>
            <span>In stock but below reorder</span>
          </div>
          <div>
            <dt>Needed</dt>
            <dd>{neededUnits.toLocaleString('en-KE')}</dd>
            <span>Units to reach reorder levels</span>
          </div>
        </dl>
      </section>

      <section className="panel-card inventory-table-panel">
        <div className="table-title-row inventory-table-title-row">
          <div>
            <h2>Products At or Below Reorder Level</h2>
            <p>
              Restocking these items above their reorder level removes them from this page after the
              stock receipt posts.
            </p>
          </div>
          <span className="inventory-panel-count">
            {lowStockItems.length.toLocaleString('en-KE')} alerts
          </span>
        </div>
        {inventoryQuery.isPending ? (
          <LoadingPanel label="Loading low stock items..." />
        ) : inventory.length === 0 ? (
          <EmptyState
            icon="bi-box"
            title="No inventory registered"
            detail="Use Add Stock to create stock quantities from supplier receipts."
          />
        ) : lowStockItems.length === 0 ? (
          <EmptyState
            icon="bi-check-circle"
            title="No products below reorder level"
            detail="Items appear here when available quantity falls below the configured reorder level."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Needed</th>
                  <th>Stock Value</th>
                  <th>Stock Health</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Product">
                      <span className="inventory-product-cell">
                        <span
                          className={`inventory-product-icon ${stockHealthTone(item.stockHealth)}`}
                        >
                          <i className="bi bi-box-seam" aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{item.productName}</strong>
                          <small>{item.categoryName}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="SKU">
                      <span className="inventory-sku">{item.sku}</span>
                    </td>
                    <td data-label="Available" className="number-cell">
                      {item.quantityAvailable.toLocaleString('en-KE')}
                    </td>
                    <td data-label="Reorder Level" className="number-cell">
                      {item.reorderLevel.toLocaleString('en-KE')}
                    </td>
                    <td data-label="Needed" className="number-cell">
                      {Math.max(0, item.reorderLevel - item.quantityAvailable).toLocaleString(
                        'en-KE',
                      )}
                    </td>
                    <td data-label="Stock Value" className="money-cell">
                      {formatMoney(item.quantityOnHand * item.unitPrice, organization.currencyCode)}
                    </td>
                    <td data-label="Stock Health">
                      <StockHealthPill health={stockHealthLabel(item.stockHealth)} />
                    </td>
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

type StockIntakeFormState = {
  branchId: string;
  productId: string;
  supplierName: string;
  referenceNumber: string;
  quantity: string;
  unitCost: string;
  notes: string;
};

type StockReceiptLine = StockIntakeRequest & {
  id: string;
  branchName: string;
  productName: string;
  sku: string;
};

function defaultStockIntakeForm(
  branchId = '',
  productId = '',
  unitCost = '',
): StockIntakeFormState {
  return {
    branchId,
    productId,
    supplierName: '',
    referenceNumber: '',
    quantity: '',
    unitCost,
    notes: '',
  };
}

function buildStockReceiptLine(
  form: StockIntakeFormState,
  branches: Branch[],
  products: Product[],
): StockReceiptLine {
  const branch = branches.find((item) => item.id === form.branchId);
  if (!branch) {
    throw new Error('Set up the shop location before adding the stock line.');
  }

  const product = products.find((item) => item.id === form.productId);
  if (!product) {
    throw new Error('Select a product before adding the stock line.');
  }

  const quantity = Number(form.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a whole number greater than zero.');
  }

  if (!form.unitCost.trim()) {
    throw new Error('Unit Cost is required.');
  }

  const unitCost = Number(form.unitCost);
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    throw new Error('Unit Cost cannot be negative.');
  }

  const supplierName = form.supplierName.trim();
  if (!supplierName) {
    throw new Error('Supplier is required.');
  }

  return {
    id: nextStockReceiptLineId(),
    branchId: branch.id,
    productId: product.id,
    supplierName,
    referenceNumber: form.referenceNumber.trim(),
    quantity,
    unitCost,
    notes: form.notes.trim(),
    branchName: branch.name,
    productName: product.name,
    sku: product.sku,
  };
}

function stockReceiptLineFromRequest(
  request: StockIntakeRequest,
  branches: Branch[],
  products: Product[],
): StockReceiptLine {
  const branch = branches.find((item) => item.id === request.branchId);
  const product = products.find((item) => item.id === request.productId);

  if (!branch || !product) {
    throw new Error('Imported stock line references an unavailable shop location or product.');
  }

  return {
    ...request,
    id: nextStockReceiptLineId(),
    branchName: branch.name,
    productName: product.name,
    sku: product.sku,
  };
}

function stockReceiptLineTotal(line: Pick<StockReceiptLine, 'quantity' | 'unitCost'>) {
  return line.quantity * line.unitCost;
}

function nextStockReceiptLineId() {
  return globalThis.crypto?.randomUUID?.() ?? `stock-line-${Date.now()}-${Math.random()}`;
}

type ProductSearchSelectProps = {
  products: Product[];
  value: string;
  onChange: (productId: string, product: Product | undefined) => void;
  disabled?: boolean;
  selectLabel?: string;
  placeholder?: string;
  emptyLabel?: string;
};

function productSearchSelectLabel(product: Product) {
  return product.name;
}

function ProductSearchSelect({
  products,
  value,
  onChange,
  disabled = false,
  selectLabel = 'Product',
  placeholder = 'Search product name, category, size, or color',
  emptyLabel = 'No active products available',
}: ProductSearchSelectProps) {
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedProduct = products.find((product) => product.id === value);
  const selectedProductLabel = selectedProduct ? productSearchSelectLabel(selectedProduct) : '';
  const normalizedQuery =
    selectedProductLabel && query.trim() === selectedProductLabel ? '' : query.trim().toLowerCase();
  const matchingProducts = useMemo(() => {
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.sku,
        product.barcode ?? '',
        product.categoryName,
        product.department ?? '',
        product.description ?? '',
        product.sizes.join(' '),
        product.colors.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, products]);
  const isDisabled = disabled || products.length === 0;
  const activeProduct = matchingProducts[activeIndex];

  useEffect(() => {
    if (selectedProduct) {
      setQuery(productSearchSelectLabel(selectedProduct));
    } else if (!value && !isOpen) {
      setQuery('');
    }
  }, [isOpen, selectedProduct, value]);

  useEffect(() => {
    setActiveIndex(matchingProducts.length > 0 ? 0 : -1);
  }, [matchingProducts.length, normalizedQuery]);

  function selectProduct(product: Product) {
    setQuery(productSearchSelectLabel(product));
    setIsOpen(false);
    onChange(product.id, product);
  }

  return (
    <div className="product-search-select" onBlur={() => setIsOpen(false)}>
      <div className="product-select-search-field">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          aria-activedescendant={
            isOpen && activeProduct ? `${listboxId}-${activeProduct.id}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-label={selectLabel}
          disabled={isDisabled}
          placeholder={isDisabled ? emptyLabel : placeholder}
          role="combobox"
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsOpen(true);
            if (value && nextQuery.trim() !== selectedProductLabel) {
              onChange('', undefined);
            }
          }}
          onFocus={(event) => {
            setIsOpen(true);
            if (selectedProductLabel) {
              event.currentTarget.select();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                matchingProducts.length === 0
                  ? -1
                  : Math.min(current < 0 ? 0 : current + 1, matchingProducts.length - 1),
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) =>
                matchingProducts.length === 0 ? -1 : Math.max(current - 1, 0),
              );
            } else if (event.key === 'Enter' && isOpen && activeProduct) {
              event.preventDefault();
              selectProduct(activeProduct);
            } else if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        />
        <i className="bi bi-chevron-down product-combobox-chevron" aria-hidden="true" />
      </div>
      {isOpen && !isDisabled ? (
        <div className="product-combobox-results" id={listboxId} role="listbox">
          {matchingProducts.length === 0 ? (
            <div className="product-combobox-empty">No matching products</div>
          ) : (
            matchingProducts.map((product, index) => (
              <button
                aria-selected={product.id === value}
                className={index === activeIndex ? 'active' : ''}
                id={`${listboxId}-${product.id}`}
                key={product.id}
                role="option"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectProduct(product)}
              >
                {product.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function AddStockPage({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const { branchId: platformBranchId } = usePlatform();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const stockIntakesQuery = useQuery({ queryKey: ['stock-intakes'], queryFn: getStockIntakes });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const products = productsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const activeProducts = products.filter(isSellableProduct);
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVE');
  const firstActiveBranchId = activeBranches[0]?.id ?? '';
  const firstActiveProductId = activeProducts[0]?.id ?? '';
  const firstActiveSupplierName = activeSuppliers[0]?.name ?? '';
  const stockIntakes = inBranch(stockIntakesQuery.data ?? [], platformBranchId);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const [form, setForm] = useState<StockIntakeFormState>(() =>
    defaultStockIntakeForm(firstActiveBranchId, firstActiveProductId),
  );
  const [receiptLines, setReceiptLines] = useState<StockReceiptLine[]>([]);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isStockImporting, setIsStockImporting] = useState(false);
  const receiptInvoiceTotal = receiptLines.reduce(
    (sum, line) => sum + stockReceiptLineTotal(line),
    0,
  );
  const receiptUnits = receiptLines.reduce((sum, line) => sum + line.quantity, 0);
  const currentLineTotal =
    (Number(form.quantity) > 0 ? Number(form.quantity) : 0) *
    (Number(form.unitCost) >= 0 ? Number(form.unitCost) : 0);

  useEffect(() => {
    setForm((current) => {
      const productId = current.productId || firstActiveProductId;
      const branchId = current.branchId || firstActiveBranchId;
      const supplierName = current.supplierName || firstActiveSupplierName;
      const defaultUnitCost = productById.get(productId)?.costPrice;
      const unitCost = current.unitCost || (defaultUnitCost == null ? '' : String(defaultUnitCost));

      if (
        current.branchId === branchId &&
        current.productId === productId &&
        current.supplierName === supplierName &&
        current.unitCost === unitCost
      ) {
        return current;
      }

      return {
        ...current,
        branchId,
        productId,
        supplierName,
        unitCost,
      };
    });
  }, [firstActiveBranchId, firstActiveProductId, firstActiveSupplierName, productById]);

  useEffect(() => {
    if (!isReceiptDialogOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsReceiptDialogOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReceiptDialogOpen]);

  const postReceiptMutation = useMutation({
    mutationFn: async (lines: StockReceiptLine[]) => {
      await stockEntry.complete();
      const intakes = lines;
      return {
        intakes,
        total: lines.reduce((sum, line) => sum + stockReceiptLineTotal(line), 0),
        units: lines.reduce((sum, line) => sum + line.quantity, 0),
      };
    },
    onSuccess: async ({ intakes, total, units }) => {
      await queryClient.invalidateQueries({ queryKey: ['stock-intakes'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      const lastIntake = intakes.at(-1);
      const lastProduct = lastIntake ? productById.get(lastIntake.productId) : undefined;
      setReceiptLines([]);
      setForm(
        defaultStockIntakeForm(
          lastIntake?.branchId ?? firstActiveBranchId,
          lastIntake?.productId ?? firstActiveProductId,
          lastProduct?.costPrice == null ? '' : String(lastProduct.costPrice),
        ),
      );
      setMessage(
        `Posted ${intakes.length} stock line${intakes.length === 1 ? '' : 's'} (${units} units). Supplier invoice total: ${formatMoney(total, organization.currencyCode)}.`,
      );
    },
  });
  const isStockBusy = postReceiptMutation.isPending || isStockImporting;
  const stockEntry = useStockEntry({
    draftBranchId: platformBranchId,
    form,
    lines: receiptLines,
    busy: isStockBusy,
    restore: (nextForm, nextLines) => {
      setForm(nextForm);
      setReceiptLines(nextLines);
      setIsReceiptDialogOpen(false);
    },
    clear: () => {
      setForm(defaultStockIntakeForm(firstActiveBranchId, firstActiveProductId));
      setReceiptLines([]);
    },
  });

  function handleAddReceiptLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const receiptLine = buildStockReceiptLine(form, activeBranches, activeProducts);
      const selectedProduct = productById.get(receiptLine.productId);
      setReceiptLines((current) => [...current, receiptLine]);
      stockEntry.markChanged();
      setForm((current) => ({
        ...current,
        productId: receiptLine.productId,
        quantity: '',
        unitCost:
          selectedProduct?.costPrice == null ? current.unitCost : String(selectedProduct.costPrice),
        notes: '',
      }));
      setIsReceiptDialogOpen(false);
      setMessage(
        `Added ${receiptLine.quantity} units of ${receiptLine.productName} to the supplier invoice.`,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add invoice line');
    }
  }

  async function handlePostReceipt() {
    setError('');
    setMessage('');

    if (form.quantity.trim() || form.notes.trim()) {
      setError('Add the current stock line to the invoice, or clear it, before posting.');
      setIsReceiptDialogOpen(true);
      return;
    }

    if (receiptLines.length === 0) {
      setError('Add at least one stock line before posting the supplier receipt.');
      return;
    }

    try {
      await postReceiptMutation.mutateAsync(receiptLines);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to post receipt');
    }
  }

  function handleRemoveReceiptLine(lineId: string) {
    setReceiptLines((current) => current.filter((line) => line.id !== lineId));
    setMessage('');
    setError('');
  }

  function handleClearReceiptLines() {
    if (!window.confirm('Remove all lines from this stock receipt?')) return;
    setReceiptLines([]);
    setMessage('');
    setError('');
  }

  async function handleStockWorksheetUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError('');
    setMessage('');
    setIsStockImporting(true);

    try {
      const rows = await readWorkbookRows(file);
      if (rows.length === 0) {
        setError('The stock worksheet is empty.');
        return;
      }

      let imported = 0;
      const importedLines: StockReceiptLine[] = [];
      for (const [index, row] of rows.entries()) {
        const payload = stockIntakeRequestFromWorksheetRow(
          row,
          activeBranches,
          activeProducts,
          index + 2,
        );
        importedLines.push(stockReceiptLineFromRequest(payload, activeBranches, activeProducts));
        imported += 1;
      }

      setReceiptLines((current) => [...current, ...importedLines]);
      stockEntry.markChanged();
      setMessage(`Added ${imported} stock rows to the supplier invoice.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to import stock');
    } finally {
      setIsStockImporting(false);
    }
  }

  return (
    <section
      className="branch-workspace"
      onChange={() => stockEntry.interact(true)}
      onPointerDownCapture={() => stockEntry.interact()}
      onKeyDownCapture={() => stockEntry.interact()}
    >
      <PageHeader
        title="Add Stock"
        subtitle="Receive inventory from suppliers into the shop."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => setIsReceiptDialogOpen(true)}
            >
              <i className="bi bi-box-arrow-in-down" aria-hidden="true" />
              Supplier Receipt
            </button>
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() =>
                downloadStockWorksheet(activeBranches, activeProducts, inventory, organization)
              }
            >
              <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
              Download Excel
            </button>
            <label className="secondary-action compact-action product-image-upload-button">
              <i className="bi bi-upload" aria-hidden="true" />
              {isStockImporting ? 'Importing...' : 'Upload Excel'}
              <input
                accept=".xlsx,.xls,.csv"
                aria-label="Upload stock Excel"
                disabled={isStockImporting}
                type="file"
                onChange={handleStockWorksheetUpload}
              />
            </label>
            <NavLink className="secondary-action compact-action" to="/inventory">
              <i className="bi bi-box" aria-hidden="true" />
              Inventory
            </NavLink>
          </div>
        }
      />

      {isReceiptDialogOpen ? null : stockEntry.controls}
      {isReceiptDialogOpen ? null : <FormMessages error={error} message={message} />}

      <div className="management-grid add-stock-grid">
        {isReceiptDialogOpen ? (
          <div
            className="dialog-backdrop stock-receipt-dialog-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsReceiptDialogOpen(false);
              }
            }}
          >
            <section
              className="panel-card branch-form-panel stock-receipt-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Supplier Receipt"
            >
              <PanelHeader
                icon="bi-box-arrow-in-down"
                title="Supplier Receipt"
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close supplier receipt"
                    onClick={() => setIsReceiptDialogOpen(false)}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              <form className="record-form" onSubmit={handleAddReceiptLine}>
                <div className="wide-field">{stockEntry.controls}</div>
                <div className="field-stack">
                  <span>Product</span>
                  <ProductSearchSelect
                    products={activeProducts}
                    value={form.productId}
                    onChange={(productId, selectedProduct) => {
                      setForm((current) => ({
                        ...current,
                        productId,
                        unitCost:
                          selectedProduct == null
                            ? current.unitCost
                            : selectedProduct.costPrice == null
                              ? current.unitCost
                              : String(selectedProduct.costPrice),
                      }));
                    }}
                  />
                </div>
                <label className="field-stack">
                  <span>Supplier</span>
                  <select
                    required
                    disabled={suppliersQuery.isPending || activeSuppliers.length === 0}
                    value={form.supplierName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, supplierName: event.target.value }))
                    }
                  >
                    <option value="">
                      {suppliersQuery.isPending
                        ? 'Loading suppliers...'
                        : activeSuppliers.length === 0
                          ? 'Add active supplier first'
                          : 'Select supplier'}
                    </option>
                    {activeSuppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Reference</span>
                  <input
                    maxLength={80}
                    value={form.referenceNumber}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, referenceNumber: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Quantity</span>
                  <input
                    required
                    min="1"
                    step="1"
                    type="number"
                    value={form.quantity}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, quantity: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Unit Cost</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={form.unitCost}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, unitCost: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack wide-field">
                  <span>Notes</span>
                  <input
                    maxLength={500}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="receipt-line-total">
                  <span>Line Total</span>
                  <strong>{formatMoney(currentLineTotal, organization.currencyCode)}</strong>
                </div>

                <FormMessages error={error} message={message} />

                <div className="form-actions">
                  <button
                    className="primary-action compact-action"
                    type="submit"
                    disabled={isStockBusy}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    {isStockBusy ? 'Saving...' : 'Add Line'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        <div className="stock-receipt-stack">
          <section className="panel-card branch-list-panel supplier-invoice-panel">
            <PanelHeader
              icon="bi-receipt"
              title="Supplier Invoice"
              action={
                <span className="invoice-total-pill">
                  {formatMoney(receiptInvoiceTotal, organization.currencyCode)}
                </span>
              }
            />
            <div className="invoice-summary-row">
              <div>
                <span>Invoice Lines</span>
                <strong>{receiptLines.length}</strong>
              </div>
              <div>
                <span>Total Units</span>
                <strong>{receiptUnits}</strong>
              </div>
              <div>
                <span>Total Invoice Amount</span>
                <strong>{formatMoney(receiptInvoiceTotal, organization.currencyCode)}</strong>
              </div>
            </div>
            {receiptLines.length === 0 ? (
              <EmptyState
                icon="bi-receipt"
                title="No invoice lines"
                detail="Supplier invoice lines will appear here before posting."
              />
            ) : (
              <>
                <div className="responsive-table compact-table receipt-lines-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Supplier</th>
                        <th>Reference</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Line Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptLines.map((line) => (
                        <tr key={line.id}>
                          <td data-label="Product">
                            <span className="table-label stock-product-cell">
                              <i className="bi bi-box" aria-hidden="true" />
                              <span>
                                <strong>{line.productName}</strong>
                                <small>{line.sku}</small>
                              </span>
                            </span>
                          </td>
                          <td data-label="Supplier">{line.supplierName}</td>
                          <td data-label="Reference">{line.referenceNumber || 'N/A'}</td>
                          <td data-label="Quantity">{line.quantity}</td>
                          <td data-label="Unit Cost">
                            {formatMoney(line.unitCost, organization.currencyCode)}
                          </td>
                          <td data-label="Line Total">
                            {formatMoney(stockReceiptLineTotal(line), organization.currencyCode)}
                          </td>
                          <td data-label="Actions">
                            <button
                              className="text-button danger-text"
                              type="button"
                              disabled={isStockBusy}
                              onClick={() => handleRemoveReceiptLine(line.id)}
                            >
                              <i className="bi bi-trash3" aria-hidden="true" />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="form-actions receipt-post-actions">
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    disabled={isStockBusy}
                    onClick={handleClearReceiptLines}
                  >
                    <i className="bi bi-x-circle" aria-hidden="true" />
                    Clear
                  </button>
                  <button
                    className="primary-action compact-action"
                    type="button"
                    disabled={isStockBusy || receiptLines.length === 0}
                    onClick={() => {
                      void handlePostReceipt();
                    }}
                  >
                    <i className="bi bi-check2" aria-hidden="true" />
                    {postReceiptMutation.isPending ? 'Posting...' : 'Post Receipt'}
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="panel-card branch-list-panel">
            <PanelHeader icon="bi-clock-history" title="Recent Stock Receipts" />
            {stockIntakesQuery.isPending || productsQuery.isPending ? (
              <LoadingPanel label="Loading receipts..." />
            ) : stockIntakes.length === 0 ? (
              <EmptyState
                icon="bi-box-arrow-in-down"
                title="No stock receipts"
                detail="Supplier receipts will appear here after stock is added."
              />
            ) : (
              <StockIntakesTable intakes={stockIntakes} organization={organization} />
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function FormMessages({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error ? (
        <p className="message-banner error" role="alert">
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="message-banner success" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          {message}
        </p>
      ) : null}
    </>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="loading-panel" role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function CheckboxGroup<TItem extends { id: string }>({
  emptyLabel,
  getLabel,
  items,
  label,
  onToggle,
  selectedIds,
}: {
  emptyLabel: string;
  getLabel: (item: TItem) => string;
  items: TItem[];
  label: string;
  onToggle: (id: string) => void;
  selectedIds: string[];
}) {
  return (
    <fieldset className="checkbox-group">
      <legend>{label}</legend>
      {items.length === 0 ? (
        <span>{emptyLabel}</span>
      ) : (
        items.map((item) => (
          <label key={item.id}>
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span>{getLabel(item)}</span>
          </label>
        ))
      )}
    </fieldset>
  );
}

function StockIntakesTable({
  intakes,
  organization,
}: {
  intakes: StockIntake[];
  organization: Organization;
}) {
  return (
    <div className="responsive-table stock-intakes-table">
      <table>
        <thead>
          <tr>
            <th>Received</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Reference</th>
            <th>Quantity</th>
            <th>Unit Cost</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {intakes.map((intake) => (
            <tr key={intake.id}>
              <td data-label="Received">{formatDateTime(intake.receivedAt)}</td>
              <td data-label="Product">
                <span className="table-label stock-product-cell">
                  <i className="bi bi-box" aria-hidden="true" />
                  <span>
                    <strong>{intake.productName}</strong>
                    <small>{intake.sku}</small>
                  </span>
                </span>
              </td>
              <td data-label="Supplier">{intake.supplierName}</td>
              <td data-label="Reference">{intake.referenceNumber || 'N/A'}</td>
              <td data-label="Quantity">{intake.quantity}</td>
              <td data-label="Unit Cost">
                {formatMoney(intake.unitCost, organization.currencyCode)}
              </td>
              <td data-label="Line Total">
                {formatMoney(intake.quantity * intake.unitCost, organization.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ExpenseFormStatus = Exclude<ExpenseStatus, 'VOID'>;

type ExpenseFormState = Omit<ExpenseRequest, 'amount' | 'status'> & {
  amount: string;
  status: ExpenseFormStatus;
};

function defaultExpenseForm(branchId = ''): ExpenseFormState {
  return {
    branchId,
    category: expenseCategoryOptions[0],
    description: '',
    vendorName: '',
    amount: '',
    paymentMethod: 'MPESA',
    paymentReference: '',
    status: 'PAID',
    notes: '',
  };
}

function ExpensesPage({
  branches,
  organization,
  currentUser,
}: {
  branches: Branch[];
  organization: Organization;
  currentUser: CurrentUser;
}) {
  const canManageExpenses = !isCashierUser(currentUser);
  const { branchId: platformBranchId } = usePlatform();
  const queryClient = useQueryClient();
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const expenses = inBranch(expensesQuery.data ?? [], platformBranchId);
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const firstActiveBranchId = activeBranches[0]?.id ?? '';
  const [form, setForm] = useState<ExpenseFormState>(() => defaultExpenseForm(firstActiveBranchId));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const nonVoidedExpenses = expenses.filter((expense) => expense.status !== 'VOID');
  const paidExpenses = expenses.filter((expense) => expense.status === 'PAID');
  const pendingExpenses = expenses.filter((expense) => expense.status === 'PENDING');
  const totalExpenses = expensesTotal(nonVoidedExpenses);
  const paidTotal = expensesTotal(paidExpenses);
  const pendingTotal = expensesTotal(pendingExpenses);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      branchId: current.branchId || firstActiveBranchId,
    }));
  }, [firstActiveBranchId]);

  const createExpenseMutation = useMutation({
    mutationFn: (payload: ExpenseRequest) => createExpense(payload),
    onSuccess: async (expense) => {
      updateExpensesCache(queryClient, expense);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setForm(defaultExpenseForm(expense.branchId));
      setMessage(`${expense.expenseNumber} recorded.`);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: markExpensePaid,
    onSuccess: async (expense) => {
      updateExpensesCache(queryClient, expense);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setMessage(`${expense.expenseNumber} marked paid.`);
    },
  });

  const voidExpenseMutation = useMutation({
    mutationFn: voidExpense,
    onSuccess: async (expense) => {
      updateExpensesCache(queryClient, expense);
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setMessage(`${expense.expenseNumber} voided.`);
    },
  });

  const isBusy =
    createExpenseMutation.isPending || markPaidMutation.isPending || voidExpenseMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.branchId) {
      setError('Set up the shop location before recording an expense.');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        branchId: form.branchId,
        category: form.category.trim(),
        description: form.description.trim(),
        vendorName: form.vendorName.trim(),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference.trim(),
        status: form.status,
        notes: form.notes.trim(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to record expense');
    }
  }

  async function handleMarkPaid(expense: Expense) {
    setError('');
    setMessage('');
    try {
      await markPaidMutation.mutateAsync(expense.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to mark expense paid');
    }
  }

  async function handleVoid(expense: Expense) {
    setError('');
    setMessage('');
    try {
      await voidExpenseMutation.mutateAsync(expense.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to void expense');
    }
  }

  return (
    <section className="branch-workspace expenses-workspace">
      <PageHeader
        title="Expenses"
        subtitle="Record shop expenses and monitor operating spend."
        action={
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={() => {
              setForm(defaultExpenseForm(firstActiveBranchId));
              setError('');
              setMessage('');
            }}
          >
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New Expense
          </button>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-wallet2"
          label="Open Spend"
          value={formatMoney(totalExpenses, organization.currencyCode)}
          tone="orange"
        />
        <SummaryMetric
          icon="bi-check-circle"
          label="Paid"
          value={formatMoney(paidTotal, organization.currencyCode)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-hourglass-split"
          label="Pending"
          value={formatMoney(pendingTotal, organization.currencyCode)}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-receipt"
          label="Records"
          value={String(expenses.length)}
          tone="purple"
        />
      </div>

      <FormMessages error={error} message={message} />

      <div className="management-grid expenses-management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader icon="bi-wallet2" title="Record Expense" tone="orange" />
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {expenseCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack wide-field">
              <span>Description</span>
              <input
                required
                maxLength={180}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <label className="field-stack">
              <span>Vendor</span>
              <input
                maxLength={160}
                value={form.vendorName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, vendorName: event.target.value }))
                }
              />
            </label>

            <label className="field-stack">
              <span>Amount</span>
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>

            <label className="field-stack">
              <span>Payment Method</span>
              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value as ExpensePaymentMethod,
                  }))
                }
              >
                {expensePaymentMethodOptions.map((option) => (
                  <option key={option.method} value={option.method}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ExpenseFormStatus,
                  }))
                }
              >
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
              </select>
            </label>

            <label className="field-stack">
              <span>Reference</span>
              <input
                maxLength={80}
                value={form.paymentReference}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentReference: event.target.value }))
                }
              />
            </label>

            <label className="field-stack wide-field">
              <span>Notes</span>
              <input
                maxLength={500}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>

            <div className="form-actions">
              <button className="primary-action compact-action" type="submit" disabled={isBusy}>
                <i className="bi bi-check2" aria-hidden="true" />
                {createExpenseMutation.isPending ? 'Saving...' : 'Record Expense'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel-card branch-list-panel">
        <div className="table-title-row">
          <div>
            <h2>Expense Register</h2>
            <p>{expenses.length} records</p>
          </div>
          <button
            className="secondary-action compact-action"
            type="button"
            onClick={() => exportExpensesCsv(expenses, organization)}
          >
            <i className="bi bi-download" aria-hidden="true" />
            Export
          </button>
        </div>

        {expensesQuery.isPending ? (
          <LoadingPanel label="Loading expenses..." />
        ) : expensesQuery.isError ? (
          <EmptyState
            icon="bi-exclamation-circle"
            title="Expenses could not be loaded"
            detail="Refresh the page or try again after the API is available."
          />
        ) : expenses.length === 0 ? (
          <EmptyState
            icon="bi-wallet2"
            title="No expenses recorded"
            detail="Shop operating costs will appear here."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td data-label="Date">{formatDateTime(expense.incurredAt)}</td>
                    <td data-label="Expense">
                      <span className="table-label">
                        <i className="bi bi-receipt" aria-hidden="true" />
                        <span>
                          <strong>{expense.description}</strong>
                          <small>
                            {expense.expenseNumber}
                            {expense.vendorName ? ` - ${expense.vendorName}` : ''}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Category">{expense.category}</td>
                    <td data-label="Payment">
                      <span className="table-label compact-label">
                        <i
                          className={`bi ${expensePaymentIcon(expense.paymentMethod)}`}
                          aria-hidden="true"
                        />
                        {formatExpensePaymentMethod(expense.paymentMethod)}
                      </span>
                      {expense.paymentReference ? (
                        <small className="table-subtext">{expense.paymentReference}</small>
                      ) : null}
                    </td>
                    <td data-label="Amount">
                      {formatMoney(expense.amount, organization.currencyCode)}
                    </td>
                    <td data-label="Status">
                      <StatusPill
                        status={expenseStatusPillStatus(expense.status)}
                        label={formatExpenseStatus(expense.status)}
                      />
                    </td>
                    <td data-label="Actions">
                      <span className="table-actions">
                        {canManageExpenses ? (
                          <>
                            <button
                              className="text-button"
                              type="button"
                              disabled={isBusy || expense.status !== 'PENDING'}
                              onClick={() => handleMarkPaid(expense)}
                            >
                              <i className="bi bi-check2-circle" aria-hidden="true" />
                              Mark Paid
                            </button>
                            <button
                              className="text-button danger-text"
                              type="button"
                              disabled={isBusy || expense.status === 'VOID'}
                              onClick={() => handleVoid(expense)}
                            >
                              <i className="bi bi-x-circle" aria-hidden="true" />
                              Void
                            </button>
                          </>
                        ) : (
                          <span className="table-subtext">Registered</span>
                        )}
                      </span>
                    </td>
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

function updateExpensesCache(queryClient: QueryClient, expense: Expense) {
  queryClient.setQueryData<Expense[]>(['expenses'], (expenses) => {
    const nextExpenses = [expense, ...(expenses ?? []).filter((item) => item.id !== expense.id)];
    return nextExpenses.sort(
      (first, second) => Date.parse(second.incurredAt) - Date.parse(first.incurredAt),
    );
  });
}

function ReportsHub({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const { branchId: platformBranchId } = usePlatform();
  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status === 'ACTIVE'),
    [branches],
  );
  const [selectedBranchId, setSelectedBranchId] = useState(platformBranchId);
  useEffect(() => setSelectedBranchId(platformBranchId), [platformBranchId]);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');
  const [activeDetailTab, setActiveDetailTab] = useState<ReportDetailTab>('sales');
  const [areReportFiltersOpen, setAreReportFiltersOpen] = useState(false);
  const [draftDateRange, setDraftDateRange] = useState<ReportDateRange>(() =>
    reportPeriodRange('month'),
  );
  const [dateRange, setDateRange] = useState<ReportDateRange>(() => reportPeriodRange('month'));
  const salesQuery = useQuery({ queryKey: ['sales'], queryFn: () => getSales() });
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const stockIntakesQuery = useQuery({ queryKey: ['stock-intakes'], queryFn: getStockIntakes });
  const stockAdjustmentsQuery = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: getStockAdjustments,
  });
  const sales = inBranch(salesQuery.data ?? [], platformBranchId);
  const expenses = inBranch(expensesQuery.data ?? [], platformBranchId);
  const inventory = inBranch(inventoryQuery.data ?? [], platformBranchId);
  const stockIntakes = inBranch(stockIntakesQuery.data ?? [], platformBranchId);
  const stockAdjustments = inBranch(stockAdjustmentsQuery.data ?? [], platformBranchId);
  const reportBranches = activeBranches;
  const filteredSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          matchesReportBranch(sale.branchId, selectedBranchId) &&
          isWithinReportRange(sale.soldAt, dateRange),
      ),
    [dateRange, sales, selectedBranchId],
  );
  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          matchesReportBranch(expense.branchId, selectedBranchId) &&
          isWithinReportRange(expense.incurredAt, dateRange),
      ),
    [dateRange, expenses, selectedBranchId],
  );
  const filteredInventory = useMemo(
    () => inventory.filter((item) => matchesReportBranch(item.branchId, selectedBranchId)),
    [inventory, selectedBranchId],
  );
  const filteredStockIntakes = useMemo(
    () =>
      stockIntakes.filter(
        (intake) =>
          matchesReportBranch(intake.branchId, selectedBranchId) &&
          isWithinReportRange(intake.receivedAt, dateRange),
      ),
    [dateRange, selectedBranchId, stockIntakes],
  );
  const filteredStockAdjustments = useMemo(
    () =>
      stockAdjustments.filter(
        (adjustment) =>
          matchesReportBranch(adjustment.branchId, selectedBranchId) &&
          isWithinReportRange(adjustment.adjustedAt, dateRange),
      ),
    [dateRange, selectedBranchId, stockAdjustments],
  );
  const summary = useMemo(
    () =>
      buildReportSummary(
        reportBranches,
        filteredSales,
        filteredExpenses,
        filteredInventory,
        filteredStockIntakes,
        filteredStockAdjustments,
      ),
    [
      filteredExpenses,
      filteredInventory,
      filteredSales,
      filteredStockAdjustments,
      filteredStockIntakes,
      reportBranches,
    ],
  );
  const isLoading =
    salesQuery.isPending ||
    expensesQuery.isPending ||
    inventoryQuery.isPending ||
    stockIntakesQuery.isPending ||
    stockAdjustmentsQuery.isPending;
  const loadError = [
    salesQuery.error,
    expensesQuery.error,
    inventoryQuery.error,
    stockIntakesQuery.error,
    stockAdjustmentsQuery.error,
  ]
    .filter((error): error is Error => error instanceof Error)
    .at(0);
  const scopeLabel = 'Shop';
  const reportTitle = 'Business reports';
  const reportSubtitle =
    'View sales, stock movement, expenses, and financial position for the shop.';
  const canExport = !isLoading && !loadError;
  const overviewCards = reportOverviewCards(summary, organization);
  const reportSalesTrendRows = useMemo(
    () => reportSalesTrendRowsFromSales(filteredSales, dateRange),
    [dateRange, filteredSales],
  );
  const reportRangeLabel = `${formatReportDateInput(dateRange.from)} to ${formatReportDateInput(
    dateRange.to,
  )}`;
  const reportDetailTabs: {
    count: number;
    icon: string;
    id: ReportDetailTab;
    label: string;
  }[] = [
    { count: summary.branchSalesRows.length, icon: 'bi-shop', id: 'sales', label: 'Sales' },
    { count: summary.saleLineRows.length, icon: 'bi-receipt', id: 'receipts', label: 'Receipts' },
    {
      count: summary.restockRows.length + summary.supplierRows.length,
      icon: 'bi-box-arrow-in-down',
      id: 'inventory',
      label: 'Inventory',
    },
    {
      count: summary.expenseReportRows.length,
      icon: 'bi-wallet2',
      id: 'expenses',
      label: 'Expenses',
    },
    {
      count: summary.stockAdjustments.length,
      icon: 'bi-shield-exclamation',
      id: 'losses',
      label: 'Variances',
    },
  ];

  useEffect(() => {
    if (selectedBranchId && !activeBranches.some((branch) => branch.id === selectedBranchId)) {
      setSelectedBranchId('');
    }
  }, [activeBranches, selectedBranchId]);

  function applyPreset(period: ReportPeriod) {
    setSelectedPeriod(period);
    if (period === 'custom') {
      const nextRange = normalizeReportDateRange(draftDateRange);
      setDraftDateRange(nextRange);
      setDateRange(nextRange);
      return;
    }

    const nextRange = reportPeriodRange(period);
    setDraftDateRange(nextRange);
    setDateRange(nextRange);
  }

  function updateDraftDateRange(field: keyof ReportDateRange, value: string) {
    setSelectedPeriod('custom');
    setDraftDateRange((current) => ({ ...current, [field]: value }));
  }

  function applyDraftDateRange() {
    const nextRange = normalizeReportDateRange(draftDateRange);
    setSelectedPeriod('custom');
    setDraftDateRange(nextRange);
    setDateRange(nextRange);
  }

  return (
    <section className="reports-workspace reports-center">
      <PageHeader
        eyebrow={`${organization.name.toUpperCase()} OPERATIONS`}
        title={reportTitle}
        subtitle={reportSubtitle}
        action={
          <div className="header-actions reports-header-actions">
            <button
              className="primary-action compact-action report-excel-action"
              type="button"
              disabled={!canExport}
              onClick={() => exportReportsWorkbook(summary, organization, scopeLabel, dateRange)}
            >
              <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
              Excel
            </button>
          </div>
        }
      />

      <DailySalesReportsPanel branches={branches} timeZone={organization.timeZone} />

      {loadError ? (
        <p className="message-banner error" role="alert">
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
          {loadError.message}
        </p>
      ) : null}

      <div className="report-filter-panel">
        <div className="report-filter-summary">
          <div>
            <span>Report scope</span>
            <strong>{scopeLabel}</strong>
          </div>
          <p>{reportRangeLabel}</p>
          <button
            className="report-filter-menu-button"
            type="button"
            aria-label="Toggle report date filters"
            aria-expanded={areReportFiltersOpen}
            onClick={() => setAreReportFiltersOpen((isOpen) => !isOpen)}
          >
            <i className="bi bi-three-dots-vertical" aria-hidden="true" />
          </button>
        </div>
        <div className={`report-filter-controls ${areReportFiltersOpen ? 'open' : ''}`}>
          <div className="report-period-row" aria-label="Report period presets">
            {reportPeriodOptions.map((option) => (
              <button
                className={`report-period-button ${selectedPeriod === option.period ? 'active' : ''}`}
                key={option.period}
                type="button"
                onClick={() => applyPreset(option.period)}
              >
                <i className={`bi ${option.icon}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
          <div className="report-date-grid">
            <label className="report-date-field">
              <span>From date</span>
              <input
                aria-label="Report from date"
                type="date"
                value={draftDateRange.from}
                onChange={(event) => updateDraftDateRange('from', event.target.value)}
              />
            </label>
            <label className="report-date-field">
              <span>Date to</span>
              <input
                aria-label="Report to date"
                type="date"
                value={draftDateRange.to}
                onChange={(event) => updateDraftDateRange('to', event.target.value)}
              />
            </label>
            <button
              className="primary-action report-apply-button"
              type="button"
              onClick={applyDraftDateRange}
            >
              <i className="bi bi-funnel" aria-hidden="true" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {isLoading ? <LoadingPanel label="Loading reports..." /> : null}

      <div className="report-kpi-grid report-kpi-unified">
        {overviewCards.map((metric) => (
          <ReportKpiCard key={metric.label} metric={metric} />
        ))}
      </div>

      <ReportSalesTrendPanel currencyCode={organization.currencyCode} rows={reportSalesTrendRows} />

      <div className="report-section-heading">
        <h2>Performance overview</h2>
      </div>
      <div className="report-analysis-grid">
        <ReportPanel
          className="report-financial-panel report-analysis-primary"
          eyebrow="Position"
          icon="bi-bar-chart-line"
          title="Financial overview"
        >
          <div className="report-financial-bars">
            {financialReportRows(summary, organization).map((row) => (
              <div className="report-financial-row" key={row.label}>
                <span>{row.label}</span>
                <div>
                  <i style={{ width: `${row.width}%`, backgroundColor: row.color }} />
                </div>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </ReportPanel>

        <ReportPanel
          className="report-sales-mix-panel"
          eyebrow="Income"
          icon="bi-pie-chart"
          title="Sales mix"
        >
          {summary.categoryRows.length === 0 ? (
            <EmptyState
              icon="bi-pie-chart"
              title="No sales mix"
              detail="Product category sales will appear here after sales are recorded."
            />
          ) : (
            <DonutChart
              centerLabel="Sales"
              centerValue={formatMoney(summary.categoryRowsTotal, organization.currencyCode)}
              currencyCode={organization.currencyCode}
              data={summary.categoryRows}
            />
          )}
        </ReportPanel>

        <ReportPanel eyebrow="Records" icon="bi-activity" title="Activity mix">
          {summary.activityRows.length === 0 ? (
            <EmptyState
              icon="bi-activity"
              title="No activity"
              detail="Sales, expenses, receipts, and stock counts will appear in this mix."
            />
          ) : (
            <DonutChart
              centerLabel="Records"
              centerValue={formatWholeNumber(summary.activityTotal)}
              currencyCode={organization.currencyCode}
              data={summary.activityRows}
              valueFormatter={formatWholeNumber}
            />
          )}
        </ReportPanel>

        <ReportPanel eyebrow="Units" icon="bi-boxes" title="Stock movement">
          {summary.stockMovementRows.length === 0 ? (
            <EmptyState
              icon="bi-boxes"
              title="No stock movement"
              detail="Sold and received units will appear here."
            />
          ) : (
            <DonutChart
              centerLabel="Units"
              centerValue={formatWholeNumber(summary.stockMovementTotal)}
              currencyCode={organization.currencyCode}
              data={summary.stockMovementRows}
              valueFormatter={formatWholeNumber}
            />
          )}
        </ReportPanel>
      </div>

      <div className="report-section-heading">
        <h2>Report details</h2>
      </div>
      <div className="report-detail-tabs" role="tablist" aria-label="Report detail sections">
        {reportDetailTabs.map((tab) => (
          <button
            aria-selected={activeDetailTab === tab.id}
            className={`report-detail-tab ${activeDetailTab === tab.id ? 'active' : ''}`}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => setActiveDetailTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" />
            <span>{tab.label}</span>
            <strong>{formatWholeNumber(tab.count)}</strong>
          </button>
        ))}
      </div>

      <div className="report-detail-content">
        {activeDetailTab === 'sales' ? (
          <ReportPanel
            action={
              <NavLink className="secondary-action compact-action" to="/sales">
                Sales data
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </NavLink>
            }
            eyebrow="Shop report"
            icon="bi-shop"
            title="Sales summary"
          >
            <ReportBranchSalesTable organization={organization} rows={summary.branchSalesRows} />
          </ReportPanel>
        ) : null}

        {activeDetailTab === 'receipts' ? (
          <ReportPanel
            action={
              <button
                className="text-button"
                type="button"
                disabled={!canExport}
                onClick={() => exportReportCsv('sales', summary, organization)}
              >
                Export CSV
                <i className="bi bi-download" aria-hidden="true" />
              </button>
            }
            eyebrow="Receipts"
            icon="bi-receipt"
            title="Sales receipt details"
          >
            <ReportSalesLinesTable
              organization={organization}
              rows={summary.saleLineRows.slice(0, 12)}
            />
          </ReportPanel>
        ) : null}

        {activeDetailTab === 'inventory' ? (
          <div className="report-detail-split">
            <ReportPanel
              action={
                <NavLink
                  className="secondary-action compact-action danger-outline-action"
                  to="/inventory"
                >
                  Inventory
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </NavLink>
              }
              eyebrow="Requests"
              icon="bi-exclamation-octagon"
              title="Priority restock"
            >
              <ReportRestockTable rows={summary.restockRows} />
            </ReportPanel>

            <ReportPanel
              action={
                <NavLink className="secondary-action compact-action" to="/add-stock">
                  Add stock
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </NavLink>
              }
              eyebrow="Inventory received"
              icon="bi-box-arrow-in-down"
              title="Supplier receipts"
            >
              <ReportSupplierTable organization={organization} rows={summary.supplierRows} />
            </ReportPanel>
          </div>
        ) : null}

        {activeDetailTab === 'expenses' ? (
          <ReportPanel
            action={
              <button
                className="text-button"
                type="button"
                disabled={!canExport}
                onClick={() => exportReportCsv('expenses', summary, organization)}
              >
                Export CSV
                <i className="bi bi-download" aria-hidden="true" />
              </button>
            }
            eyebrow="Cash expenses"
            icon="bi-wallet2"
            title="Expense categories"
          >
            <ReportExpenseTable organization={organization} rows={summary.expenseReportRows} />
          </ReportPanel>
        ) : null}

        {activeDetailTab === 'losses' ? (
          <ReportPanel
            action={
              <button
                className="text-button"
                type="button"
                disabled={!canExport}
                onClick={() => exportReportCsv('losses', summary, organization)}
              >
                Export CSV
                <i className="bi bi-download" aria-hidden="true" />
              </button>
            }
            eyebrow="Stock counts"
            icon="bi-shield-exclamation"
            title="Losses and excesses"
          >
            <ReportStockAdjustmentTable
              organization={organization}
              rows={summary.stockAdjustments}
            />
          </ReportPanel>
        ) : null}
      </div>
    </section>
  );
}

type ReportOverviewCard = ReturnType<typeof reportOverviewCards>[number];

function ReportKpiCard({ metric }: { metric: ReportOverviewCard }) {
  return (
    <article className="report-kpi-card">
      <span className={`icon-tile ${metric.tone}`}>
        <i className={`bi ${metric.icon}`} aria-hidden="true" />
      </span>
      <div>
        <span>{metric.label}</span>
        <strong>{metric.value}</strong>
        <small>{metric.detail}</small>
      </div>
    </article>
  );
}

function ReportSalesTrendPanel({
  currencyCode,
  rows,
}: {
  currencyCode: string;
  rows: ReturnType<typeof reportSalesTrendRowsFromSales>;
}) {
  const retailSalesTotal = rows.reduce((sum, row) => sum + row.retailSales, 0);
  const grossProfitTotal = rows.reduce((sum, row) => sum + row.grossProfit, 0);

  return (
    <section className="report-panel report-trend-panel">
      <div className="report-trend-header">
        <div>
          <span className="report-panel-eyebrow">Analytics</span>
          <h2>Sales and profit</h2>
        </div>
        <div className="report-trend-meta">
          <span className="report-trend-source-pill">
            <i className="bi bi-database" aria-hidden="true" />
            Database
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </span>
          <div className="report-trend-legend" aria-label="Sales trend totals">
            <div>
              <span>
                <i className="retail" />
                Retail sales
              </span>
              <strong>{formatMoney(retailSalesTotal, currencyCode)}</strong>
            </div>
            <div>
              <span>
                <i className="profit" />
                Gross profit
              </span>
              <strong>{formatMoney(grossProfitTotal, currencyCode)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="report-trend-chart" aria-label="Sales and gross profit trend">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 18, bottom: 0, left: -6 }}>
            <defs>
              <linearGradient id="reportRetailSalesFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2878f0" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#2878f0" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#dbe7f7" strokeDasharray="2 6" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(value) => formatMoneyTick(Number(value), currencyCode)}
              tick={{ fill: 'var(--muted)', fontSize: 12, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={58}
            />
            <Tooltip
              formatter={(value, name) => [
                formatMoney(Number(value), currencyCode),
                name === 'retailSales' ? 'Retail sales' : 'Gross profit',
              ]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                border: '1px solid #d4dde9',
                borderRadius: 8,
                boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="retailSales"
              stroke="#2878f0"
              fill="url(#reportRetailSalesFill)"
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="grossProfit"
              stroke="#18bf7a"
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ReportPanel({
  action,
  children,
  className = '',
  eyebrow,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow: string;
  icon: string;
  title: string;
}) {
  return (
    <section className={`report-panel ${className}`}>
      <div className="report-panel-header">
        <div>
          <span className="report-panel-eyebrow">{eyebrow}</span>
          <h2>
            <i className={`bi ${icon}`} aria-hidden="true" />
            {title}
          </h2>
        </div>
        {action ? <div className="report-panel-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ReportBranchSalesTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: ReturnType<typeof branchSalesReportRows>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-shop"
        title="No shop sales"
        detail="Completed sales will appear in the shop summary."
      />
    );
  }

  const totals = rows.reduce(
    (current, row) => ({
      grossProfit: current.grossProfit + row.grossProfit,
      productLines: current.productLines + row.productLines,
      receipts: current.receipts + row.receipts,
      salesAmount: current.salesAmount + row.salesAmount,
      unitsSold: current.unitsSold + row.unitsSold,
    }),
    { grossProfit: 0, productLines: 0, receipts: 0, salesAmount: 0, unitsSold: 0 },
  );

  return (
    <div className="responsive-table report-table">
      <table>
        <thead>
          <tr>
            <th>Shop</th>
            <th>Receipts</th>
            <th>Product Lines</th>
            <th>Units Sold</th>
            <th>Sales Amount</th>
            <th>Profit</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.branch.id}>
              <td data-label="Shop">
                <strong>{row.branch.name}</strong>
              </td>
              <td data-label="Receipts">{row.receipts}</td>
              <td data-label="Product Lines">{row.productLines}</td>
              <td data-label="Units Sold">{formatQuantity(row.unitsSold)}</td>
              <td data-label="Sales Amount">
                {formatMoney(row.salesAmount, organization.currencyCode)}
              </td>
              <td data-label="Profit">{formatMoney(row.grossProfit, organization.currencyCode)}</td>
              <td data-label="Action">
                <NavLink className="text-button report-row-action" to="/sales">
                  View details
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </NavLink>
              </td>
            </tr>
          ))}
          <tr className="report-total-row">
            <td data-label="Shop">Total</td>
            <td data-label="Receipts">{totals.receipts}</td>
            <td data-label="Product Lines">{totals.productLines}</td>
            <td data-label="Units Sold">{formatQuantity(totals.unitsSold)}</td>
            <td data-label="Sales Amount">
              {formatMoney(totals.salesAmount, organization.currencyCode)}
            </td>
            <td data-label="Profit">
              {formatMoney(totals.grossProfit, organization.currencyCode)}
            </td>
            <td data-label="Action">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ReportRestockTable({ rows }: { rows: ReturnType<typeof restockReportRows> }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-check-circle"
        title="No priority restock"
        detail="Low-stock and out-of-stock products will appear here."
      />
    );
  }

  return (
    <div className="responsive-table report-table">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Restock Qty</th>
            <th>Available</th>
            <th>Reorder Level</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.branchName}-${row.productId}`}>
              <td data-label="Product">
                <span className="table-label">
                  <i className="bi bi-box" aria-hidden="true" />
                  <span>
                    <strong>{row.productName}</strong>
                    <small>{row.sku}</small>
                  </span>
                </span>
              </td>
              <td data-label="Restock Qty">{formatQuantity(row.restockQty)}</td>
              <td data-label="Available">{formatQuantity(row.quantityAvailable)}</td>
              <td data-label="Reorder Level">{formatQuantity(row.reorderLevel)}</td>
              <td data-label="Status">
                <StockHealthPill health={stockHealthLabel(row.stockHealth)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSalesLinesTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: ReturnType<typeof saleLineReportRows>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-receipt"
        title="No receipt details"
        detail="Receipt-level product lines will appear here after sales are recorded."
      />
    );
  }

  return (
    <div className="responsive-table report-table report-table-strong">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Receipt</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Discount</th>
            <th>Total</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Date">{formatDateOnly(row.soldAt)}</td>
              <td data-label="Receipt">{row.receipt}</td>
              <td data-label="Product">{row.productName}</td>
              <td data-label="Qty">{formatQuantity(row.quantity)}</td>
              <td data-label="Unit Price">
                {formatMoney(row.unitPrice, organization.currencyCode)}
              </td>
              <td data-label="Discount">
                {formatMoney(row.discountAmount, organization.currencyCode)}
              </td>
              <td data-label="Total">{formatMoney(row.totalAmount, organization.currencyCode)}</td>
              <td data-label="Profit">{formatMoney(row.grossProfit, organization.currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSupplierTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: ReturnType<typeof supplierReportRows>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-box-arrow-in-down"
        title="No supplier receipts"
        detail="Supplier intake totals will appear here after stock is received."
      />
    );
  }

  return (
    <div className="responsive-table report-table">
      <table>
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Receipts</th>
            <th>Products</th>
            <th>Total Items</th>
            <th>Amount</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.supplierName}>
              <td data-label="Supplier">
                <strong>{row.supplierName}</strong>
              </td>
              <td data-label="Receipts">{row.receipts}</td>
              <td data-label="Products">{row.products}</td>
              <td data-label="Total Items">{formatQuantity(row.totalItems)}</td>
              <td data-label="Amount">{formatMoney(row.amount, organization.currencyCode)}</td>
              <td data-label="Latest">{formatDateOnly(row.latestAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportExpenseTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: ReturnType<typeof expenseReportRows>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-wallet2"
        title="No expenses"
        detail="Expense categories will appear after shop costs are recorded."
      />
    );
  }

  return (
    <div className="responsive-table report-table">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Entries</th>
            <th>Share</th>
            <th>Amount</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <td data-label="Category">
                <span className="table-label">
                  <i className="bi bi-receipt" aria-hidden="true" />
                  <strong>{row.category}</strong>
                </span>
              </td>
              <td data-label="Entries">{row.entries}</td>
              <td data-label="Share">{row.percent}%</td>
              <td data-label="Amount">{formatMoney(row.amount, organization.currencyCode)}</td>
              <td data-label="Latest">{formatDateOnly(row.latestAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportStockAdjustmentTable({
  organization,
  rows,
}: {
  organization: Organization;
  rows: StockAdjustment[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="bi-check-circle"
        title="No stock variances"
        detail="Physical count losses and excesses will appear here after adjustments are recorded."
      />
    );
  }

  return (
    <div className="responsive-table report-table report-table-strong">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>System</th>
            <th>Counted</th>
            <th>Variance</th>
            <th>Value</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const value = row.varianceQuantity < 0 ? row.lossValue : row.excessValue;
            return (
              <tr key={row.id}>
                <td data-label="Date">{formatDateOnly(row.adjustedAt)}</td>
                <td data-label="Product">
                  <span className="table-label">
                    <i className="bi bi-box" aria-hidden="true" />
                    <span>
                      <strong>{row.productName}</strong>
                      <small>{row.sku}</small>
                    </span>
                  </span>
                </td>
                <td data-label="System">{formatQuantity(row.systemQuantity)}</td>
                <td data-label="Counted">{formatQuantity(row.countedQuantity)}</td>
                <td
                  data-label="Variance"
                  className={row.varianceQuantity < 0 ? 'negative-text' : 'positive-text'}
                >
                  {formatSignedQuantity(row.varianceQuantity)}
                </td>
                <td data-label="Value">{formatMoney(value, organization.currencyCode)}</td>
                <td data-label="Reason">{row.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPage({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const [defaultVatCategory, setDefaultVatCategory] = useState<ProductVatCategory>(
    organization.defaultProductVatCategory ?? 'A',
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDefaultVatCategory(organization.defaultProductVatCategory ?? 'A');
  }, [organization.defaultProductVatCategory]);

  const updateVatSettingsMutation = useMutation({
    mutationFn: updateOrganizationVatSettings,
    onSuccess: async (updatedOrganization) => {
      queryClient.setQueryData(['organization'], updatedOrganization);
      await queryClient.invalidateQueries({ queryKey: ['organization'] });
      setMessage('VAT settings saved.');
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await updateVatSettingsMutation.mutateAsync(defaultVatCategory);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save VAT settings');
    }
  }

  return (
    <section className="branch-workspace settings-workspace">
      <PageHeader
        title="Settings"
        subtitle="Organization controls for taxes and default product behavior."
        action={
          <NavLink className="secondary-action compact-action" to="/branches">
            <i className="bi bi-shop" aria-hidden="true" /> Shops &amp; warehouses
          </NavLink>
        }
      />

      <PosPreferencesPanel />

      <FormMessages error={error} message={message} />

      <div className="management-grid settings-management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader icon="bi-receipt-cutoff" title="VAT Settings" tone="green" />
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack wide-field">
              <span>Default Product VAT Category</span>
              <select
                value={defaultVatCategory}
                onChange={(event) =>
                  setDefaultVatCategory(event.target.value as ProductVatCategory)
                }
              >
                {vatCategoryOptions.map((option) => (
                  <option key={option.category} value={option.category}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="vat-option-list wide-field">
              {vatCategoryOptions.map((option) => (
                <div
                  className={`vat-option-row ${
                    option.category === defaultVatCategory ? 'active' : ''
                  }`}
                  key={option.category}
                >
                  <span>{option.category}</span>
                  <div>
                    <strong>{option.shortLabel}</strong>
                    <small>{option.description}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={updateVatSettingsMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {updateVatSettingsMutation.isPending ? 'Saving...' : 'Save VAT Settings'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-list-check" title="Product VAT Categories" tone="blue" />
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Supply Type</th>
                  <th>VAT Rate</th>
                </tr>
              </thead>
              <tbody>
                {vatCategoryOptions.map((option) => (
                  <tr key={option.category}>
                    <td data-label="Code">{option.category}</td>
                    <td data-label="Supply Type">{option.label}</td>
                    <td data-label="VAT Rate">{Math.round(option.rate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

const developerWebsite = 'https://www.creativeaglemedia.co.ke/';

function HelpPage() {
  const copyrightYear = new Date().getFullYear();

  return (
    <section className="help-workspace" aria-labelledby="help-page-title">
      <header className="help-page-heading">
        <p>{appName}</p>
        <h1 id="help-page-title">Help & product information</h1>
        <span>Everything you need to know about your workspace and support.</span>
      </header>

      <section className="help-product-hero" aria-labelledby="help-product-title">
        <div className="help-product-brandmark" aria-hidden="true">
          <img src={keenLogoImageUrl} alt="" />
        </div>
        <div className="help-product-copy">
          <h2 id="help-product-title">{appName}</h2>
          <span className="help-version-badge">Version {appVersion}</span>
          <p>
            Your central workspace for products, stock movement, security, sales, and reporting.
          </p>
        </div>
        <div className="help-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <div className="help-card-grid">
        <section className="help-info-card" aria-labelledby="help-offline-title">
          <div className="help-card-heading">
            <span className="help-card-icon">
              <i className="bi bi-wifi-off" aria-hidden="true" />
            </span>
            <div>
              <h2 id="help-offline-title">Working offline</h2>
            </div>
          </div>
          <p>
            Sign in online with Remember this device enabled, then wait for Offline ready. Products,
            stock and locations are downloaded automatically, including products you have not
            opened. You can sign in with your saved password offline for 30 days after online
            sign-in.
          </p>
          <p>
            Complete cash and manual M-Pesa sales, receive stock, transfer stock and record counts
            offline. STK push needs internet. Transactions save on this device before forms clear,
            then synchronize in order when connected. Open Offline &amp; sync to check progress.
          </p>
          <p>
            Sign-out locks access and retains saved work. Failed sync attempts retain their
            transaction IDs and details for retry or review. Export a backup before clearing site
            data or changing devices. Stock conflicts across devices may need review; they are never
            silently discarded.
          </p>
        </section>
        <section className="help-info-card" aria-labelledby="help-about-title">
          <div className="help-card-heading">
            <span className="help-card-icon">
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
            </span>
            <div>
              <h2 id="help-about-title">About this software</h2>
              <p>Key information about this admin workspace.</p>
            </div>
          </div>

          <dl className="help-detail-list">
            <div>
              <dt>Developed by</dt>
              <dd>CRENVIXMORAVA SYSTEMS</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                <a href={developerWebsite} target="_blank" rel="noreferrer">
                  www.creativeaglemedia.co.ke
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                <a href="tel:+254790220453">+254790220453</a>
              </dd>
            </div>
            <div>
              <dt>Copyright</dt>
              <dd>Copyright @{copyrightYear} CRENVIXMORAVA SYSTEMS. All rights reserved.</dd>
            </div>
          </dl>
        </section>

        <aside className="help-info-card help-support-card" aria-labelledby="help-support-title">
          <div className="help-card-heading">
            <span className="help-card-icon">
              <i className="bi bi-life-preserver" aria-hidden="true" />
            </span>
            <div>
              <h2 id="help-support-title">Need assistance?</h2>
              <p>Get help with your account, inventory, sales, or daily operations.</p>
            </div>
          </div>

          <a
            className="help-website-action"
            href={developerWebsite}
            target="_blank"
            rel="noreferrer"
          >
            Visit website
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </a>

          <p className="help-support-note">
            For product guides, updates, and more information, please visit our website.
          </p>
        </aside>
      </div>

      <footer className="help-page-footer">
        <div>
          <strong>{appName}</strong>
          <span>
            Version {appVersion} | Copyright @{copyrightYear} CRENVIXMORAVA SYSTEMS. All rights
            reserved.
          </span>
        </div>
        <p>Built for a more organized business.</p>
      </footer>
    </section>
  );
}

type ShiftRecord = {
  id: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openingFloat: number;
  openingNote: string;
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  closingCash?: number;
  closingNote?: string;
};

type ShiftSummary = {
  cashExpenseTotal: number;
  cashSales: number;
  expectedCash: number;
  expenseTotal: number;
  expenses: Expense[];
  grossProfit: number;
  itemCount: number;
  paymentTotals: ReturnType<typeof paymentMethodTotalsFromSales>;
  sales: Sale[];
  totalSales: number;
  transactions: number;
  variance?: number;
};

type ShiftsPageProps = {
  activeBranch?: Branch;
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
};

function ShiftsPage({ activeBranch, branches, currentUser, organization }: ShiftsPageProps) {
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const showProfit = canViewProfit(currentUser);
  const fallbackBranchId =
    activeBranch?.id ??
    currentUser.branchIds.find((branchId) =>
      activeBranches.some((branch) => branch.id === branchId),
    ) ??
    activeBranches[0]?.id ??
    '';
  const [selectedBranchId, setSelectedBranchId] = useState(fallbackBranchId);
  const [shifts, setShifts] = useState<ShiftRecord[]>(loadShiftRecords);
  const [openingFloat, setOpeningFloat] = useState('0.00');
  const [openingNote, setOpeningNote] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => getSales(),
    refetchOnMount: 'always',
  });
  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
    refetchOnMount: 'always',
  });
  useEffect(() => {
    if (activeBranch?.id) {
      setSelectedBranchId(activeBranch.id);
      return;
    }

    if (!selectedBranchId && fallbackBranchId) {
      setSelectedBranchId(fallbackBranchId);
    }
  }, [activeBranch?.id, fallbackBranchId, selectedBranchId]);

  useEffect(() => {
    saveShiftRecords(shifts);
  }, [shifts]);

  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const openShifts = shifts
    .filter((shift) => shift.status === 'OPEN')
    .sort((first, second) => Date.parse(second.openedAt) - Date.parse(first.openedAt));
  const activeShift = shifts.find(
    (shift) => shift.status === 'OPEN' && shift.branchId === selectedBranchId,
  );
  const sales = salesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const todayRange = reportPeriodRange('today');
  const selectedBranchSales = selectedBranchId
    ? sales.filter((sale) => sale.branchId === selectedBranchId)
    : [];
  const selectedBranchExpenses = selectedBranchId
    ? expenses.filter((expense) => expense.branchId === selectedBranchId)
    : [];
  const liveShiftSales = activeShift
    ? selectedBranchSales.filter((sale) => isWithinShiftWindow(sale.soldAt, activeShift))
    : selectedBranchSales.filter((sale) => isWithinReportRange(sale.soldAt, todayRange));
  const liveShiftExpenses = activeShift
    ? selectedBranchExpenses.filter((expense) =>
        isWithinShiftWindow(expense.incurredAt, activeShift),
      )
    : selectedBranchExpenses.filter((expense) =>
        isWithinReportRange(expense.incurredAt, todayRange),
      );
  const activeSummary = buildShiftSummary(
    liveShiftSales,
    liveShiftExpenses,
    activeShift?.openingFloat ?? 0,
    activeShift?.closingCash,
  );
  const closingCashCents = moneyInputToCents(closingCash);
  const closingVariance =
    activeShift && closingCashCents != null
      ? centsToMoney(closingCashCents) - activeSummary.expectedCash
      : undefined;
  const closedShifts = shifts
    .filter((shift) => shift.status === 'CLOSED' && shift.branchId === selectedBranchId)
    .sort((first, second) => Date.parse(second.closedAt ?? '') - Date.parse(first.closedAt ?? ''));
  const isLoadingActivity = salesQuery.isPending || expensesQuery.isPending;

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId);
    setError('');
    setMessage('');
    setClosingCash('');
    setClosingNote('');
  }

  function handleOpenShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedBranch) {
      setError('Set up the shop location before opening a shift.');
      return;
    }

    if (activeShift) {
      setError(`${selectedBranch.name} already has an open shift.`);
      return;
    }

    const openingFloatCents = moneyInputToCents(openingFloat.trim() ? openingFloat : '0');
    if (openingFloatCents == null) {
      setError('Enter a valid opening float.');
      return;
    }

    const shift: ShiftRecord = {
      id: newShiftId(),
      branchId: selectedBranch.id,
      cashierId: currentUser.userId,
      cashierName: currentUser.displayName,
      openingFloat: centsToMoney(openingFloatCents),
      openingNote: openingNote.trim(),
      openedAt: new Date().toISOString(),
      status: 'OPEN',
    };

    setShifts((current) => [shift, ...current]);
    setOpeningFloat('0.00');
    setOpeningNote('');
    setMessage(`Shift opened for ${selectedBranch.name}.`);
  }

  function handleCloseShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!activeShift || !selectedBranch) {
      setError('Open a shift before closing.');
      return;
    }

    if (closingCashCents == null) {
      setError('Enter the counted closing cash.');
      return;
    }

    const closedAt = new Date().toISOString();
    const closingCashValue = centsToMoney(closingCashCents);
    setShifts((current) =>
      current.map((shift) =>
        shift.id === activeShift.id
          ? {
              ...shift,
              closedAt,
              closingCash: closingCashValue,
              closingNote: closingNote.trim(),
              status: 'CLOSED',
            }
          : shift,
      ),
    );
    setClosingCash('');
    setClosingNote('');
    setMessage(`Shift closed for ${selectedBranch.name}.`);
  }

  function handleExportShift(shift: ShiftRecord) {
    const summary = summaryForShift(shift, sales, expenses);
    exportShiftCsv(
      shift,
      selectedBranchForShift(shift, branches),
      summary,
      organization,
      showProfit,
    );
  }

  return (
    <section className="shift-workspace">
      <PageHeader
        title="Shifts"
        subtitle="Open, close, and reconcile register sessions against live sales and expenses."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={!activeShift || isLoadingActivity}
              onClick={() => activeShift && handleExportShift(activeShift)}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Export Active
            </button>
          </div>
        }
      />

      <div className="branch-summary-row shift-summary-row">
        <SummaryMetric
          icon="bi-cash-stack"
          label="Opening Float"
          value={formatMoney(activeShift?.openingFloat ?? 0, organization.currencyCode)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-receipt"
          label={activeShift ? 'Shift Sales' : 'Today Sales'}
          value={formatMoney(activeSummary.totalSales, organization.currencyCode)}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-wallet2"
          label="Expected Cash"
          value={formatMoney(activeSummary.expectedCash, organization.currencyCode)}
          tone="orange"
        />
        <SummaryMetric
          icon="bi-clock-history"
          label="Shift Status"
          value={activeShift ? shiftDurationLabel(activeShift) : 'No Open Shift'}
          tone={activeShift ? 'purple' : 'blue'}
        />
      </div>

      {error ? (
        <p className="message-banner error" role="alert">
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="message-banner success" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          {message}
        </p>
      ) : null}

      <div className="shift-layout">
        <section className="panel-card shift-control-panel">
          <PanelHeader
            icon={activeShift ? 'bi-clock-history' : 'bi-play-circle'}
            title={activeShift ? 'Active Shift' : 'Open Shift'}
          />

          {!selectedBranch ? (
            <EmptyState
              icon="bi-shop"
              title="Shop location unavailable"
              detail="Set up the shop location before opening or reconciling a shift."
            />
          ) : activeShift ? (
            <>
              <div className="shift-status-card">
                <StatusPill status="posted" label="Open" />
                <strong>{selectedBranch.name}</strong>
                <span>
                  Opened {formatDateTime(activeShift.openedAt)} by {activeShift.cashierName}
                </span>
                {activeShift.openingNote ? <p>{activeShift.openingNote}</p> : null}
              </div>

              <form className="record-form" onSubmit={handleCloseShift}>
                <label className="field-stack">
                  <span>Closing Cash Count</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    placeholder={activeSummary.expectedCash.toFixed(2)}
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={(event) => setClosingCash(event.target.value)}
                  />
                </label>

                <label className="field-stack wide-field">
                  <span>Closing Note</span>
                  <textarea
                    maxLength={240}
                    rows={3}
                    value={closingNote}
                    onChange={(event) => setClosingNote(event.target.value)}
                  />
                </label>

                <div className="shift-variance-row">
                  <span>Live variance</span>
                  <strong
                    className={
                      closingVariance == null
                        ? ''
                        : closingVariance < 0
                          ? 'negative-text'
                          : 'positive-text'
                    }
                  >
                    {closingVariance == null
                      ? 'Enter cash count'
                      : formatMoney(closingVariance, organization.currencyCode)}
                  </strong>
                </div>

                <div className="form-actions">
                  <button
                    className="secondary-action compact-action"
                    type="button"
                    disabled={isLoadingActivity}
                    onClick={() => setClosingCash(activeSummary.expectedCash.toFixed(2))}
                  >
                    Use Expected
                  </button>
                  <button
                    className="primary-action compact-action"
                    type="submit"
                    disabled={isLoadingActivity}
                  >
                    <i className="bi bi-check2-circle" aria-hidden="true" />
                    Close Shift
                  </button>
                </div>
              </form>
            </>
          ) : (
            <form className="record-form" onSubmit={handleOpenShift}>
              <label className="field-stack">
                <span>Shop</span>
                <input value={selectedBranch.name} readOnly />
              </label>

              <label className="field-stack">
                <span>Cashier</span>
                <input value={currentUser.displayName} readOnly />
              </label>

              <label className="field-stack">
                <span>Opening Float</span>
                <input
                  inputMode="decimal"
                  min="0"
                  type="number"
                  step="0.01"
                  value={openingFloat}
                  onChange={(event) => setOpeningFloat(event.target.value)}
                />
              </label>

              <label className="field-stack wide-field">
                <span>Opening Note</span>
                <textarea
                  maxLength={240}
                  rows={3}
                  value={openingNote}
                  onChange={(event) => setOpeningNote(event.target.value)}
                />
              </label>

              <div className="form-actions">
                <button className="primary-action compact-action" type="submit">
                  <i className="bi bi-play-fill" aria-hidden="true" />
                  Open Shift
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="panel-card shift-reconciliation-panel">
          <PanelHeader icon="bi-calculator" title="Reconciliation" tone="blue" />
          {isLoadingActivity ? (
            <LoadingPanel label="Loading shift activity..." />
          ) : (
            <>
              <div className="shift-reconciliation-grid">
                <div>
                  <span>Transactions</span>
                  <strong>{formatWholeNumber(activeSummary.transactions)}</strong>
                </div>
                <div>
                  <span>Items Sold</span>
                  <strong>{formatQuantity(activeSummary.itemCount)}</strong>
                </div>
                {showProfit ? (
                  <div>
                    <span>Gross Profit</span>
                    <strong>
                      {formatMoney(activeSummary.grossProfit, organization.currencyCode)}
                    </strong>
                  </div>
                ) : null}
                <div>
                  <span>Paid Expenses</span>
                  <strong>
                    {formatMoney(activeSummary.expenseTotal, organization.currencyCode)}
                  </strong>
                </div>
              </div>

              <div className="shift-payment-list">
                {activeSummary.paymentTotals.map((payment) => (
                  <div key={payment.name}>
                    <span>
                      <i style={{ backgroundColor: payment.color }} />
                      {payment.name}
                    </span>
                    <strong>{formatMoney(payment.value, organization.currencyCode)}</strong>
                  </div>
                ))}
                <div>
                  <span>
                    <i className="cash-expense-dot" />
                    Cash expenses
                  </span>
                  <strong>
                    - {formatMoney(activeSummary.cashExpenseTotal, organization.currencyCode)}
                  </strong>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="panel-card shift-selector-panel">
          <PanelHeader icon="bi-list-check" title="Open Shifts" tone="purple" />
          {openShifts.length === 0 ? (
            <EmptyState
              icon="bi-clock"
              title="No open shifts"
              detail="Open register shifts will appear here."
            />
          ) : (
            <div className="shift-open-list">
              {openShifts.map((shift) => {
                const branch = selectedBranchForShift(shift, branches);
                return (
                  <button
                    className={`shift-open-button ${
                      shift.branchId === selectedBranchId ? 'active' : ''
                    }`}
                    key={shift.id}
                    type="button"
                    onClick={() => handleBranchChange(shift.branchId)}
                  >
                    <span>
                      <strong>{branch?.name ?? 'Shop'}</strong>
                      <small>{shift.cashierName}</small>
                    </span>
                    <em>{shiftDurationLabel(shift)}</em>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel-card shift-activity-panel">
          <PanelHeader icon="bi-receipt" title="Shift Sales" />
          {isLoadingActivity ? (
            <LoadingPanel label="Loading sales..." />
          ) : activeSummary.sales.length === 0 ? (
            <EmptyState
              icon="bi-receipt"
              title="No sales recorded"
              detail="Sales posted in this shift window will appear here."
            />
          ) : (
            <div className="responsive-table compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Time</th>
                    <th>Payments</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSummary.sales
                    .slice()
                    .sort((first, second) => Date.parse(second.soldAt) - Date.parse(first.soldAt))
                    .slice(0, 6)
                    .map((sale) => (
                      <tr key={sale.id}>
                        <td data-label="Receipt">{sale.saleNumber}</td>
                        <td data-label="Time">{formatDateTime(sale.soldAt)}</td>
                        <td data-label="Payments">
                          {formatSalePayments(sale, organization.currencyCode)}
                        </td>
                        <td data-label="Total">
                          {formatMoney(sale.totalAmount, organization.currencyCode)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel-card shift-expense-panel">
          <PanelHeader icon="bi-wallet2" title="Shift Expenses" tone="orange" />
          {isLoadingActivity ? (
            <LoadingPanel label="Loading expenses..." />
          ) : activeSummary.expenses.length === 0 ? (
            <EmptyState
              icon="bi-wallet2"
              title="No expenses recorded"
              detail="Paid expenses in this shift window will appear here."
            />
          ) : (
            <div className="shift-ledger-list">
              {activeSummary.expenses
                .slice()
                .sort(
                  (first, second) => Date.parse(second.incurredAt) - Date.parse(first.incurredAt),
                )
                .slice(0, 6)
                .map((expense) => (
                  <div className="shift-ledger-row" key={expense.id}>
                    <span>
                      <strong>{expense.category}</strong>
                      <small>
                        {formatExpensePaymentMethod(expense.paymentMethod)} -{' '}
                        {formatDateTime(expense.incurredAt)}
                      </small>
                    </span>
                    <em>{formatMoney(expense.amount, organization.currencyCode)}</em>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="panel-card shift-history-panel">
          <PanelHeader icon="bi-archive" title="Closed Shift History" tone="purple" />
          {closedShifts.length === 0 ? (
            <EmptyState
              icon="bi-archive"
              title="No closed shifts"
              detail="Closed register shifts will appear here."
            />
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Opened</th>
                    <th>Closed</th>
                    <th>Cashier</th>
                    <th>Sales</th>
                    <th>Expected Cash</th>
                    <th>Variance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {closedShifts.map((shift) => {
                    const summary = summaryForShift(shift, sales, expenses);
                    return (
                      <tr key={shift.id}>
                        <td data-label="Opened">{formatDateTime(shift.openedAt)}</td>
                        <td data-label="Closed">
                          {shift.closedAt ? formatDateTime(shift.closedAt) : 'N/A'}
                        </td>
                        <td data-label="Cashier">{shift.cashierName}</td>
                        <td data-label="Sales">
                          {formatMoney(summary.totalSales, organization.currencyCode)}
                        </td>
                        <td data-label="Expected Cash">
                          {formatMoney(summary.expectedCash, organization.currencyCode)}
                        </td>
                        <td
                          data-label="Variance"
                          className={
                            summary.variance == null
                              ? ''
                              : summary.variance < 0
                                ? 'negative-text'
                                : 'positive-text'
                          }
                        >
                          {summary.variance == null
                            ? 'N/A'
                            : formatMoney(summary.variance, organization.currencyCode)}
                        </td>
                        <td data-label="Actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => handleExportShift(shift)}
                          >
                            <i className="bi bi-download" aria-hidden="true" />
                            Export
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function BackOffice() {
  const modules = [
    { label: 'Sales', icon: 'bi-receipt', detail: 'History, returns, and voids' },
    { label: 'Expenses', icon: 'bi-wallet2', detail: 'Approvals and categories' },
    { label: 'Commercial', icon: 'bi-receipt-cutoff', detail: 'Invoices' },
    { label: 'Settings', icon: 'bi-gear', detail: 'Organization controls' },
  ];

  return (
    <section className="module-workspace">
      <PageHeader title="Back Office" subtitle="Operational modules for controlled workflows." />
      <div className="module-grid">
        {modules.map((module) => (
          <article className="module-card" key={module.label}>
            <i className={`bi ${module.icon}`} aria-hidden="true" />
            <h3>{module.label}</h3>
            <p>{module.detail}</p>
            <button className="module-button" type="button">
              Open
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  comparison: string;
  icon: string;
  tone: string;
  negative?: boolean;
};

function MetricCard({ label, value, icon, tone }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span className={`icon-tile ${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className="summary-metric">
      <span className={`line-icon ${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function PanelHeader({
  icon,
  title,
  action,
  tone = 'green',
}: {
  icon?: string;
  title: string;
  action?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="panel-title-row">
      <div>
        {icon ? (
          <span className={`panel-icon ${tone}`}>
            <i className={`bi ${icon}`} aria-hidden="true" />
          </span>
        ) : null}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function DonutChart({
  centerValue,
  centerLabel,
  currencyCode,
  data,
  valueFormatter,
}: {
  centerValue: string;
  centerLabel: string;
  currencyCode: string;
  data: { name: string; value: number; percent: number; color: string }[];
  valueFormatter?: (value: number) => string;
}) {
  const formatValue = valueFormatter ?? ((value: number) => formatMoney(value, currencyCode));

  return (
    <div className="donut-layout">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={1}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell fill={entry.color} key={entry.name} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div>
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="donut-legend">
        {data.map((entry) => (
          <div key={entry.name}>
            <span>
              <i style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <strong>{entry.percent}%</strong>
            <em>{formatValue(entry.value)}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductRankingTable({
  organization,
  sales,
  showProfit = true,
}: {
  organization: Organization;
  sales: Sale[];
  showProfit?: boolean;
}) {
  const productRows = productSalesRows(sales).slice(0, 5);

  if (productRows.length === 0) {
    return (
      <EmptyState
        icon="bi-cart"
        title="No product sales yet"
        detail={`Sales rankings will use ${organization.currencyCode} transactions once sales are recorded.`}
      />
    );
  }

  return (
    <div className="responsive-table compact-table">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Units</th>
            <th>Sales</th>
            {showProfit ? <th>Profit</th> : null}
          </tr>
        </thead>
        <tbody>
          {productRows.map((row) => (
            <tr key={row.productId}>
              <td data-label="Product">
                <span className="table-label">
                  <i className="bi bi-bag-check" aria-hidden="true" />
                  {row.productName}
                </span>
              </td>
              <td data-label="Units">{row.quantity}</td>
              <td data-label="Sales">{formatMoney(row.salesValue, organization.currencyCode)}</td>
              {showProfit ? (
                <td
                  data-label="Profit"
                  className={row.grossProfit >= 0 ? 'positive-text' : 'negative-text'}
                >
                  {formatMoney(row.grossProfit, organization.currencyCode)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function productSalesRows(sales: Sale[]) {
  const rows = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantity: number;
      salesValue: number;
      grossProfit: number;
    }
  >();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const existing = rows.get(line.productId);
      if (existing) {
        existing.quantity += line.quantity;
        existing.salesValue += line.lineTotal;
        existing.grossProfit += saleLineGrossProfit(line);
      } else {
        rows.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          salesValue: line.lineTotal,
          grossProfit: saleLineGrossProfit(line),
        });
      }
    }
  }

  return [...rows.values()].sort(
    (first, second) => second.salesValue - first.salesValue || second.quantity - first.quantity,
  );
}

function InventoryFilters({ showProductSearch = false }: { showProductSearch?: boolean }) {
  return (
    <div className="filter-row">
      {showProductSearch ? (
        <div className="search-field table-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input aria-label="Search products" placeholder="Search products, SKU or barcode..." />
        </div>
      ) : null}
      <label className="select-shell">
        <select aria-label="Inventory category filter" defaultValue="all">
          <option value="all">All Categories</option>
        </select>
      </label>
      <label className="select-shell">
        <select aria-label="Inventory supplier filter" defaultValue="supplier">
          <option value="supplier">Supplier</option>
        </select>
      </label>
      <label className="select-shell">
        <select aria-label="Inventory stock status filter" defaultValue="all">
          <option value="all">Stock Status</option>
          <option value="healthy">Healthy</option>
          <option value="low">Low Stock</option>
        </select>
      </label>
      <label className="select-shell">
        <select aria-label="Inventory size filter" defaultValue="size">
          <option value="size">Size</option>
        </select>
      </label>
      <label className="select-shell">
        <select aria-label="Inventory colour filter" defaultValue="colour">
          <option value="colour">Colour</option>
        </select>
      </label>
      <button className="text-button reset-button" type="button">
        Reset filters
      </button>
    </div>
  );
}

function ReportCard({
  card,
  isLoading,
  organization,
  summary,
}: {
  card: { title: string; icon: string; tone: string; type: string };
  isLoading: boolean;
  organization: Organization;
  summary: ReturnType<typeof buildReportSummary>;
}) {
  return (
    <article className="report-card">
      <div className="report-card-header">
        <span className={`icon-tile ${card.tone}`}>
          <i className={`bi ${card.icon}`} aria-hidden="true" />
        </span>
        <div>
          <h3>{card.title}</h3>
          <p>{reportDescription(card.type)}</p>
        </div>
      </div>
      <ReportCardBody
        isLoading={isLoading}
        type={card.type}
        organization={organization}
        summary={summary}
      />
      <button
        className="text-button report-link"
        type="button"
        onClick={() => exportReportCsv(card.type, summary, organization)}
      >
        Export CSV
        <i className="bi bi-download" aria-hidden="true" />
      </button>
    </article>
  );
}

function ReportCardBody({
  isLoading,
  type,
  organization,
  summary,
}: {
  isLoading: boolean;
  type: string;
  organization: Organization;
  summary: ReturnType<typeof buildReportSummary>;
}) {
  if (isLoading) {
    return <LoadingPanel label="Loading report..." />;
  }

  if (type === 'sales') {
    return (
      <div className="mini-report-chart">
        <strong>{formatMoney(summary.totalSales, organization.currencyCode)}</strong>
        <span className="positive-text">{summary.transactions} transactions</span>
        <ResponsiveContainer width="100%" height={96}>
          <AreaChart data={summary.salesTrend} margin={{ left: -28, right: 0, top: 8, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="netSales"
              stroke="#2878f0"
              fill="#e9f1ff"
              strokeWidth={3}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'products') {
    return <ProductRankingTable organization={organization} sales={summary.sales} />;
  }

  if (type === 'category') {
    if (summary.categoryRows.length === 0) {
      return (
        <EmptyState
          icon="bi-pie-chart"
          title="No category sales"
          detail="Category totals will appear after sales are recorded."
        />
      );
    }

    return (
      <DonutChart
        centerValue={formatMoney(summary.categoryRowsTotal, organization.currencyCode)}
        centerLabel="Total Sales"
        currencyCode={organization.currencyCode}
        data={summary.categoryRows}
      />
    );
  }

  if (type === 'shop') {
    return (
      <div className="split-stat">
        <div>
          <strong>{formatMoney(summary.totalSales, organization.currencyCode)}</strong>
          <span>Shop Sales</span>
          <em className="positive-text">{summary.transactions} transactions</em>
        </div>
        <div>
          <strong>{formatMoney(summary.contribution, organization.currencyCode)}</strong>
          <span>Net Position</span>
          <em className={summary.contribution >= 0 ? 'positive-text' : 'negative-text'}>
            Sales less expenses
          </em>
        </div>
      </div>
    );
  }

  if (type === 'payments') {
    return (
      <div className="horizontal-bars payments-bars">
        {summary.paymentTotals.map((method) => (
          <div key={method.name}>
            <span>{method.name}</span>
            <strong>{method.percent}%</strong>
            <div>
              <i style={{ width: `${method.percent}%`, backgroundColor: method.color }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'inventory') {
    return (
      <div className="split-stat">
        <div>
          <strong>{summary.lowStockCount}</strong>
          <span>Low Stock Items</span>
          <em className={summary.lowStockCount > 0 ? 'negative-text' : 'positive-text'}>
            {summary.outOfStockCount} out of stock
          </em>
        </div>
        <div>
          <strong>{formatMoney(summary.totalStockValue, organization.currencyCode)}</strong>
          <span>Total Stock Value</span>
          <em className="positive-text">{summary.inventory.length} stock rows</em>
        </div>
      </div>
    );
  }

  if (type === 'expenses') {
    if (summary.expenseRows.length === 0) {
      return (
        <EmptyState
          icon="bi-wallet2"
          title="No expenses"
          detail="Expense reports will appear after costs are recorded."
        />
      );
    }

    return (
      <div className="horizontal-bars expense-report-bars">
        {summary.expenseRows.slice(0, 4).map((row) => (
          <div key={row.category}>
            <span>{row.category}</span>
            <strong>{row.percent}%</strong>
            <div>
              <i style={{ width: `${row.percent}%`, backgroundColor: row.color }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'losses') {
    return (
      <div className="split-stat">
        <div>
          <strong>
            {formatMoney(summary.stockAdjustmentSummary.totalLossValue, organization.currencyCode)}
          </strong>
          <span>Total Losses</span>
          <em className={summary.stockAdjustmentSummary.totalLossValue > 0 ? 'negative-text' : ''}>
            {formatQuantity(summary.stockAdjustmentSummary.totalLossQuantity)} units
          </em>
        </div>
        <div>
          <strong>
            {formatMoney(
              summary.stockAdjustmentSummary.totalExcessValue,
              organization.currencyCode,
            )}
          </strong>
          <span>Total Excess</span>
          <em className="positive-text">
            Net {formatMoney(summary.stockAdjustmentSummary.netValue, organization.currencyCode)}
          </em>
        </div>
      </div>
    );
  }

  if (type === 'audit') {
    return (
      <div className="simple-stat">
        <strong>{summary.sales.length + summary.expenses.length}</strong>
        <span>Recorded Events</span>
        <em className="positive-text">Sales and expense activity</em>
      </div>
    );
  }

  return (
    <div className="simple-stat">
      <strong>{formatMoney(summary.contribution, organization.currencyCode)}</strong>
      <span>Current Contribution</span>
      <em className={summary.contribution >= 0 ? 'positive-text' : 'negative-text'}>
        Sales less expenses
      </em>
    </div>
  );
}

function ProductImage({
  product,
  index,
  small,
}: {
  product: Pick<Product, 'name' | 'categoryName' | 'imageUrl'>;
  index: number;
  small?: boolean;
}) {
  const imageUrl = product.imageUrl?.trim();
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <span
      className={`product-photo ${small ? 'small' : ''}`}
      style={{
        backgroundImage: productTileBackground(product, index),
        backgroundPosition: `${12 + ((index * 13) % 74)}% center`,
      }}
      aria-hidden="true"
    >
      {imageUrl && !hasImageError ? (
        <img alt="" loading="lazy" src={imageUrl} onError={() => setHasImageError(true)} />
      ) : null}
    </span>
  );
}

function StockHealthPill({ health }: { health: string }) {
  const className = health === 'Healthy' ? 'healthy' : health === 'Out of Stock' ? 'out' : 'low';
  return <span className={`stock-health ${className}`}>{health}</span>;
}

function StatusPill({
  status,
  label,
}: {
  status: 'posted' | 'review' | 'pending';
  label?: string;
}) {
  const icon =
    status === 'posted' ? 'bi-check-circle' : status === 'review' ? 'bi-eye' : 'bi-hourglass-split';

  return (
    <span className={`status-pill ${status}`}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      {label ?? status}
    </span>
  );
}

function labelizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function UserChip({
  name,
  role,
  compact = false,
}: {
  name: string;
  role: string;
  compact?: boolean;
}) {
  return (
    <div className={`user-chip ${compact ? 'compact' : ''}`} aria-label="Signed in user">
      <span>{initials(name)}</span>
      <div>
        <small>{role}</small>
        <strong>{name}</strong>
      </div>
      {!compact ? <i className="bi bi-chevron-down" aria-hidden="true" /> : null}
    </div>
  );
}

function Sparkline({ offset }: { offset: number }) {
  const data = [
    { v: 10 + offset * 2 },
    { v: 15 + offset },
    { v: 13 + offset * 3 },
    { v: 22 + offset },
    { v: 16 + offset * 2 },
    { v: 28 + offset },
    { v: 25 + offset * 2 },
  ];

  return (
    <span className="sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="v"
            dot={false}
            stroke="#2878f0"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </span>
  );
}

function reportDescription(type: string) {
  const descriptions: Record<string, string> = {
    sales: 'Total sales, trends and key breakdowns.',
    products: 'Top selling products and performance.',
    category: 'Sales by product category.',
    shop: 'Daily sales, contribution and transaction health.',
    payments: 'Track payment methods and matching rates.',
    inventory: 'Stock levels, low stock items and stock value.',
    expenses: 'Business expenses and spending.',
    losses: 'Track losses, variances and adjustments.',
    audit: 'System activity and compliance logs.',
  };

  return descriptions[type] ?? 'Detailed operational report.';
}

function parseCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinWithFallback(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'N/A';
}

function inventoryByCategory(inventory: InventoryItem[]) {
  const tones = ['blue', 'emerald', 'amber', 'violet', 'rose', 'slate'];
  const counts = new Map<string, { count: number; value: number }>();
  for (const item of inventory) {
    const category = counts.get(item.categoryName) ?? { count: 0, value: 0 };
    category.count += item.quantityOnHand;
    category.value += item.quantityOnHand * item.unitPrice;
    counts.set(item.categoryName, category);
  }

  return Array.from(counts.entries())
    .sort(([, left], [, right]) => right.count - left.count)
    .map(([label, summary], index) => ({
      label,
      count: summary.count,
      value: summary.value,
      tone: tones[index % tones.length],
    }));
}

function inventoryByBranch(inventory: InventoryItem[]) {
  const counts = new Map<
    string,
    { alerts: number; available: number; count: number; lines: number; value: number }
  >();
  for (const item of inventory) {
    const branch = counts.get(item.branchName) ?? {
      alerts: 0,
      available: 0,
      count: 0,
      lines: 0,
      value: 0,
    };
    branch.alerts += item.stockHealth === 'HEALTHY' ? 0 : 1;
    branch.available += item.quantityAvailable;
    branch.count += item.quantityOnHand;
    branch.lines += 1;
    branch.value += item.quantityOnHand * item.unitPrice;
    counts.set(item.branchName, branch);
  }

  return Array.from(counts.entries())
    .sort(([, left], [, right]) => right.count - left.count)
    .map(([label, summary]) => ({
      label,
      ...summary,
    }));
}

function stockHealthTone(health: InventoryItem['stockHealth']) {
  if (health === 'OUT_OF_STOCK') {
    return 'out';
  }
  if (health === 'LOW_STOCK') {
    return 'low';
  }
  return 'healthy';
}

function stockAdjustmentTone(adjustment: Pick<StockAdjustment, 'varianceQuantity'>) {
  if (adjustment.varianceQuantity < 0) {
    return 'out';
  }
  if (adjustment.varianceQuantity > 0) {
    return 'healthy';
  }
  return 'low';
}

function stockHealthLabel(health: InventoryItem['stockHealth']) {
  if (health === 'OUT_OF_STOCK') {
    return 'Out of Stock';
  }
  if (health === 'LOW_STOCK') {
    return 'Low Stock';
  }
  return 'Healthy';
}

function vatRateForCategory(category: ProductVatCategory | undefined) {
  return vatCategoryOptions.find((option) => option.category === category)?.rate ?? 0.16;
}

function formatVatCategory(category: ProductVatCategory | undefined) {
  return (
    vatCategoryOptions.find((option) => option.category === category)?.shortLabel ??
    vatCategoryOptions[0].shortLabel
  );
}

function taxAmountForProductLines(
  lines: Array<Pick<Product, 'unitPrice' | 'vatCategory'> & { quantity: number }>,
  discount: number,
) {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return roundMoney(
    lines.reduce((sum, line) => {
      const lineTotal = line.unitPrice * line.quantity;
      const lineDiscount = subtotal > 0 ? (discount * lineTotal) / subtotal : 0;
      return sum + Math.max(0, lineTotal - lineDiscount) * vatRateForCategory(line.vatCategory);
    }, 0),
  );
}

function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function isInlineProductImage(value: string) {
  return value.trim().startsWith('data:image/');
}

function productTileBackground(product: Pick<Product, 'categoryName'>, index: number) {
  const overlayByCategory: Record<string, string> = {
    Tops: 'linear-gradient(180deg, rgba(248, 250, 252, .1), rgba(248, 250, 252, .74))',
    Shirts: 'linear-gradient(180deg, rgba(219, 234, 254, .08), rgba(219, 234, 254, .6))',
    Trousers: 'linear-gradient(180deg, rgba(30, 64, 175, .04), rgba(30, 64, 175, .34))',
    Dresses: 'linear-gradient(180deg, rgba(255, 237, 213, .08), rgba(255, 237, 213, .62))',
    Skirts: 'linear-gradient(180deg, rgba(255, 228, 230, .08), rgba(255, 228, 230, .58))',
    Jackets: 'linear-gradient(180deg, rgba(219, 234, 254, .06), rgba(15, 23, 42, .28))',
    Shoes: 'linear-gradient(180deg, rgba(241, 245, 249, .08), rgba(203, 213, 225, .52))',
    Accessories: 'linear-gradient(180deg, rgba(254, 243, 199, .08), rgba(254, 243, 199, .58))',
  };
  const overlay =
    overlayByCategory[product.categoryName] ??
    'linear-gradient(180deg, rgba(255,255,255,.12), rgba(226,232,240,.62))';
  return `${overlay}, url(${bannerImageUrl})`;
}

function formatPayslipAmount(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatWholeNumber(value: number) {
  return new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 3,
  }).format(value);
}

function formatSignedQuantity(value: number) {
  if (value === 0) {
    return '0';
  }
  return `${value > 0 ? '+' : '-'}${formatQuantity(Math.abs(value))}`;
}

function formatMoneyTick(amount: number, currencyCode: string) {
  const prefix = currencyCode === 'KES' ? 'KSh' : currencyCode;
  const absoluteAmount = Math.abs(amount);
  if (absoluteAmount >= 1_000_000) {
    return `${prefix} ${formatChartNumber(amount / 1_000_000)}M`;
  }
  if (absoluteAmount >= 1_000) {
    return `${prefix} ${formatChartNumber(amount / 1_000)}K`;
  }
  return `${prefix} ${formatChartNumber(amount)}`;
}

function formatChartNumber(value: number) {
  const absoluteValue = Math.abs(value);
  return new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: absoluteValue > 0 && absoluteValue < 10 ? 1 : 0,
  }).format(value);
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 KB';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

function formatDateOnly(value: string) {
  if (!value) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatExpensePaymentMethod(method: ExpensePaymentMethod | undefined) {
  if (method === 'MPESA') {
    return 'M-Pesa';
  }
  if (method === 'CASH') {
    return 'Cash';
  }
  if (method === 'CARD') {
    return 'Card';
  }
  if (method === 'BANK_TRANSFER') {
    return 'Bank Transfer';
  }
  return 'N/A';
}

function expensePaymentIcon(method: ExpensePaymentMethod) {
  return (
    expensePaymentMethodOptions.find((option) => option.method === method)?.icon ??
    'bi-credit-card-2-front'
  );
}

function formatExpenseStatus(status: ExpenseStatus) {
  if (status === 'PAID') {
    return 'Paid';
  }
  if (status === 'VOID') {
    return 'Void';
  }
  return 'Pending';
}

function expenseStatusPillStatus(status: ExpenseStatus): 'posted' | 'review' | 'pending' {
  if (status === 'PAID') {
    return 'posted';
  }
  if (status === 'VOID') {
    return 'review';
  }
  return 'pending';
}

const SHIFT_STORAGE_KEY = 'keen-fashion-shifts';

function loadShiftRecords(): ShiftRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SHIFT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isShiftRecord);
  } catch {
    return [];
  }
}

function saveShiftRecords(shifts: ShiftRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(shifts));
}

function isShiftRecord(value: unknown): value is ShiftRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const shift = value as Partial<ShiftRecord>;
  return (
    typeof shift.id === 'string' &&
    typeof shift.branchId === 'string' &&
    typeof shift.cashierId === 'string' &&
    typeof shift.cashierName === 'string' &&
    typeof shift.openingFloat === 'number' &&
    typeof shift.openedAt === 'string' &&
    (shift.status === 'OPEN' || shift.status === 'CLOSED')
  );
}

function selectedBranchForShift(shift: ShiftRecord, branches: Branch[]) {
  return branches.find((branch) => branch.id === shift.branchId);
}

function isWithinShiftWindow(value: string, shift: ShiftRecord) {
  const time = Date.parse(value);
  const openedAt = Date.parse(shift.openedAt);
  const closedAt = shift.closedAt ? Date.parse(shift.closedAt) : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) && time >= openedAt && time <= closedAt;
}

function summaryForShift(shift: ShiftRecord, sales: Sale[], expenses: Expense[]) {
  const shiftSales = sales.filter(
    (sale) => sale.branchId === shift.branchId && isWithinShiftWindow(sale.soldAt, shift),
  );
  const shiftExpenses = expenses.filter(
    (expense) =>
      expense.branchId === shift.branchId && isWithinShiftWindow(expense.incurredAt, shift),
  );
  return buildShiftSummary(shiftSales, shiftExpenses, shift.openingFloat, shift.closingCash);
}

function buildShiftSummary(
  sales: Sale[],
  expenses: Expense[],
  openingFloat: number,
  closingCash?: number,
): ShiftSummary {
  const paidExpenses = expenses.filter((expense) => expense.status === 'PAID');
  const cashExpenseTotal = expensesTotal(
    paidExpenses.filter((expense) => expense.paymentMethod === 'CASH'),
  );
  const totalSales = salesTotal(sales);
  const cashSales = sales.reduce(
    (sum, sale) =>
      sum +
      sale.payments
        .filter((payment) => payment.method === 'CASH')
        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0,
  );
  const expectedCash = openingFloat + cashSales - cashExpenseTotal;
  const variance = closingCash == null ? undefined : closingCash - expectedCash;

  return {
    cashExpenseTotal,
    cashSales,
    expectedCash,
    expenseTotal: expensesTotal(paidExpenses),
    expenses: paidExpenses,
    grossProfit: grossProfitFromSales(sales),
    itemCount: sales.reduce(
      (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
      0,
    ),
    paymentTotals: paymentMethodTotalsFromSales(sales),
    sales,
    totalSales,
    transactions: sales.length,
    variance,
  };
}

function shiftDurationLabel(shift: Pick<ShiftRecord, 'openedAt' | 'closedAt'>) {
  const openedAt = Date.parse(shift.openedAt);
  const closedAt = shift.closedAt ? Date.parse(shift.closedAt) : Date.now();
  if (!Number.isFinite(openedAt) || !Number.isFinite(closedAt)) {
    return 'N/A';
  }

  const totalMinutes = Math.max(1, Math.round((closedAt - openedAt) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${totalMinutes} min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function exportShiftCsv(
  shift: ShiftRecord,
  branch: Branch | undefined,
  summary: ShiftSummary,
  organization: Organization,
  includeProfit: boolean,
) {
  const branchName = branch?.name ?? 'Unknown shop';
  const branchCode = branch?.code ?? shift.branchId;
  const rows: string[][] = [
    ['Shift Summary'],
    ['Shop', branchName],
    ['Cashier', shift.cashierName],
    ['Status', shift.status],
    ['Opened At', formatDateTime(shift.openedAt)],
    ['Closed At', shift.closedAt ? formatDateTime(shift.closedAt) : 'Open'],
    ['Duration', shiftDurationLabel(shift)],
    ['Currency', organization.currencyCode],
    ['Opening Float', shift.openingFloat.toFixed(2)],
    ['Total Sales', summary.totalSales.toFixed(2)],
  ];

  if (includeProfit) {
    rows.push(['Gross Profit', summary.grossProfit.toFixed(2)]);
  }

  rows.push(
    ['Paid Expenses', summary.expenseTotal.toFixed(2)],
    ['Cash Sales', summary.cashSales.toFixed(2)],
    ['Cash Expenses', summary.cashExpenseTotal.toFixed(2)],
    ['Expected Cash', summary.expectedCash.toFixed(2)],
    ['Closing Cash', shift.closingCash?.toFixed(2) ?? ''],
    ['Variance', summary.variance?.toFixed(2) ?? ''],
    [],
    ['Payment Mix'],
    ['Method', 'Amount', 'Percent'],
    ...summary.paymentTotals.map((payment) => [
      payment.name,
      payment.value.toFixed(2),
      `${payment.percent}%`,
    ]),
    [],
    ['Sales'],
    ['Receipt', 'Sold At', 'Customer', 'Payments', 'Subtotal', 'Tax', 'Total'],
    ...summary.sales.map((sale) => [
      sale.saleNumber,
      formatDateTime(sale.soldAt),
      sale.customerName ?? 'Walk-in Customer',
      formatSalePayments(sale, organization.currencyCode),
      sale.subtotalAmount.toFixed(2),
      sale.taxAmount.toFixed(2),
      sale.totalAmount.toFixed(2),
    ]),
    [],
    ['Paid Expenses'],
    ['Expense Number', 'Incurred At', 'Category', 'Method', 'Reference', 'Amount'],
    ...summary.expenses.map((expense) => [
      expense.expenseNumber,
      formatDateTime(expense.incurredAt),
      expense.category,
      formatExpensePaymentMethod(expense.paymentMethod),
      expense.paymentReference ?? '',
      expense.amount.toFixed(2),
    ]),
  );
  downloadCsv(`keen-shift-${branchCode}-${dateInputValue(new Date(shift.openedAt))}.csv`, rows);
}

function exportDashboardCsv({
  contribution,
  currencyCode,
  grossProfit,
  lowStockItems,
  paymentMethodTotals,
  scope,
  stockAdjustmentSummary,
  totalExpenses,
  totalSales,
  transactions,
}: {
  contribution: number;
  currencyCode: string;
  grossProfit: number;
  lowStockItems: InventoryItem[];
  paymentMethodTotals: ReturnType<typeof paymentMethodTotalsFromSales>;
  scope: string;
  stockAdjustmentSummary: StockAdjustmentSummary;
  totalExpenses: number;
  totalSales: number;
  transactions: number;
}) {
  downloadCsv('keen-dashboard-summary.csv', [
    ['Scope', scope],
    ['Currency', currencyCode],
    [],
    ['Metric', 'Value'],
    ['Net Sales', totalSales.toFixed(2)],
    ['Gross Profit', grossProfit.toFixed(2)],
    ['Expenses', totalExpenses.toFixed(2)],
    ['Estimated Contribution', contribution.toFixed(2)],
    ['Transactions', String(transactions)],
    ['Stock Loss Value', stockAdjustmentSummary.totalLossValue.toFixed(2)],
    ['Stock Excess Value', stockAdjustmentSummary.totalExcessValue.toFixed(2)],
    ['Stock Variance Net', stockAdjustmentSummary.netValue.toFixed(2)],
    [],
    ['Payment Method', 'Percent', 'Amount'],
    ...paymentMethodTotals.map((row) => [row.name, `${row.percent}%`, row.value.toFixed(2)]),
    [],
    ['Attention Item', 'Health', 'On Hand', 'Reorder Level'],
    ...lowStockItems.map((item) => [
      item.productName,
      stockHealthLabel(item.stockHealth),
      String(item.quantityOnHand),
      String(item.reorderLevel),
    ]),
  ]);
}

function exportExpensesCsv(expenses: Expense[], organization: Organization) {
  downloadCsv('keen-expenses.csv', [
    ['Number', 'Date', 'Category', 'Description', 'Vendor', 'Payment', 'Status', 'Amount'],
    ...expenses.map((expense) => [
      expense.expenseNumber,
      formatDateTime(expense.incurredAt),
      expense.category,
      expense.description,
      expense.vendorName ?? '',
      formatExpensePaymentMethod(expense.paymentMethod),
      formatExpenseStatus(expense.status),
      expense.amount.toFixed(2),
    ]),
    [],
    ['Currency', organization.currencyCode],
  ]);
}

function exportReportsWorkbook(
  summary: ReturnType<typeof buildReportSummary>,
  organization: Organization,
  scopeLabel: string,
  dateRange: ReportDateRange,
) {
  downloadWorkbookRows('keen-reports-center.xlsx', 'Reports', [
    ['Scope', scopeLabel],
    ['From date', formatReportDateInput(dateRange.from)],
    ['Date to', formatReportDateInput(dateRange.to)],
    ['Currency', organization.currencyCode],
    [],
    ['Metric', 'Value'],
    ['Sales amount', summary.totalSales.toFixed(2)],
    ['Gross profit', summary.grossProfit.toFixed(2)],
    ['Cash expenses', summary.expenseTotal.toFixed(2)],
    ['Net position', summary.contribution.toFixed(2)],
    ['Items sold', summary.totalItems],
    ['Stock value', summary.totalStockValue.toFixed(2)],
    ['Inventory received value', summary.receivedValue.toFixed(2)],
    ['Stock loss value', summary.stockAdjustmentSummary.totalLossValue.toFixed(2)],
    ['Stock excess value', summary.stockAdjustmentSummary.totalExcessValue.toFixed(2)],
    ['Stock variance net', summary.stockAdjustmentSummary.netValue.toFixed(2)],
    ['Priority restock lines', summary.restockRows.length],
    [],
    ['Shop sales summary'],
    ['Shop', 'Receipts', 'Product Lines', 'Units Sold', 'Sales Amount', 'Profit'],
    ...summary.branchSalesRows.map((row) => [
      row.branch.name,
      row.receipts,
      row.productLines,
      row.unitsSold,
      row.salesAmount.toFixed(2),
      row.grossProfit.toFixed(2),
    ]),
    [],
    ['Priority restock'],
    ['Product', 'SKU', 'Restock Qty', 'Available', 'Reorder Level', 'Status'],
    ...summary.restockRows.map((row) => [
      row.productName,
      row.sku,
      row.restockQty,
      row.quantityAvailable,
      row.reorderLevel,
      stockHealthLabel(row.stockHealth),
    ]),
    [],
    ['Supplier receipts'],
    ['Supplier', 'Receipts', 'Products', 'Total Items', 'Amount', 'Latest'],
    ...summary.supplierRows.map((row) => [
      row.supplierName,
      row.receipts,
      row.products,
      row.totalItems,
      row.amount.toFixed(2),
      formatDateOnly(row.latestAt),
    ]),
    [],
    ['Stock count variances'],
    ['Date', 'Product', 'SKU', 'System', 'Counted', 'Variance', 'Loss', 'Excess', 'Reason'],
    ...summary.stockAdjustments.map((row) => [
      formatDateOnly(row.adjustedAt),
      row.productName,
      row.sku,
      row.systemQuantity,
      row.countedQuantity,
      row.varianceQuantity,
      row.lossValue.toFixed(2),
      row.excessValue.toFixed(2),
      row.reason,
    ]),
    [],
    ['Expense categories'],
    ['Category', 'Entries', 'Share', 'Amount', 'Latest'],
    ...summary.expenseReportRows.map((row) => [
      row.category,
      row.entries,
      `${row.percent}%`,
      row.amount.toFixed(2),
      formatDateOnly(row.latestAt),
    ]),
  ]);
}

function exportReportCsv(
  type: string,
  summary: ReturnType<typeof buildReportSummary>,
  organization: Organization,
) {
  if (type === 'sales') {
    downloadCsv('keen-sales-summary.csv', [
      ['Receipt', 'Date', 'Customer', 'Items', 'Payment', 'Subtotal', 'VAT', 'Total'],
      ...summary.sales.map((sale) => [
        sale.saleNumber,
        formatDateTime(sale.soldAt),
        sale.customerName || 'Walk-in Customer',
        String(sale.lines.reduce((sum, line) => sum + line.quantity, 0)),
        formatSalePayments(sale, organization.currencyCode),
        sale.subtotalAmount.toFixed(2),
        sale.taxAmount.toFixed(2),
        sale.totalAmount.toFixed(2),
      ]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'products') {
    downloadCsv('keen-product-sales.csv', [
      ['Product', 'Units', 'Sales', 'Gross Profit'],
      ...summary.productRows.map((row) => [
        row.productName,
        String(row.quantity),
        row.salesValue.toFixed(2),
        row.grossProfit.toFixed(2),
      ]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'category') {
    downloadCsv('keen-category-performance.csv', [
      ['Category', 'Percent', 'Sales'],
      ...summary.categoryRows.map((row) => [row.name, `${row.percent}%`, row.value.toFixed(2)]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'branches') {
    downloadCsv('keen-shop-performance.csv', [
      ['Shop', 'Transactions', 'Net Sales', 'Gross Profit', 'Average Basket'],
      ...summary.branchRows.map((row) => [
        row.branch.name,
        String(row.transactions),
        row.netSales.toFixed(2),
        row.grossProfit.toFixed(2),
        row.averageBasket.toFixed(2),
      ]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'payments') {
    downloadCsv('keen-payments-reconciliation.csv', [
      ['Payment Method', 'Percent', 'Amount'],
      ...summary.paymentTotals.map((row) => [row.name, `${row.percent}%`, row.value.toFixed(2)]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'inventory') {
    downloadCsv('keen-inventory-report.csv', [
      ['Product', 'SKU', 'Category', 'On Hand', 'Available', 'Unit Price', 'Stock Value', 'Health'],
      ...summary.inventory.map((item) => [
        item.productName,
        item.sku,
        item.categoryName,
        String(item.quantityOnHand),
        String(item.quantityAvailable),
        item.unitPrice.toFixed(2),
        (item.quantityOnHand * item.unitPrice).toFixed(2),
        stockHealthLabel(item.stockHealth),
      ]),
      [],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'expenses') {
    exportExpensesCsv(summary.expenses, organization);
    return;
  }

  if (type === 'losses') {
    downloadCsv('keen-losses-variances.csv', [
      ['Date', 'Product', 'SKU', 'System', 'Counted', 'Variance', 'Loss', 'Excess', 'Reason'],
      ...summary.stockAdjustments.map((row) => [
        formatDateTime(row.adjustedAt),
        row.productName,
        row.sku,
        String(row.systemQuantity),
        String(row.countedQuantity),
        String(row.varianceQuantity),
        row.lossValue.toFixed(2),
        row.excessValue.toFixed(2),
        row.reason,
      ]),
      [],
      ['Total Loss Value', summary.stockAdjustmentSummary.totalLossValue.toFixed(2)],
      ['Total Excess Value', summary.stockAdjustmentSummary.totalExcessValue.toFixed(2)],
      ['Net Position', summary.stockAdjustmentSummary.netValue.toFixed(2)],
      ['Currency', organization.currencyCode],
    ]);
    return;
  }

  if (type === 'audit') {
    downloadCsv('keen-audit-compliance.csv', [
      ['Activity', 'Count'],
      ['Completed sales', String(summary.sales.length)],
      ['Expense records', String(summary.expenses.length)],
      ['Inventory rows', String(summary.inventory.length)],
    ]);
    return;
  }

  downloadCsv('keen-report-summary.csv', [
    ['Metric', 'Value'],
    ['Currency', organization.currencyCode],
    ['Net Sales', summary.totalSales.toFixed(2)],
    ['Gross Profit', summary.grossProfit.toFixed(2)],
    ['Transactions', String(summary.transactions)],
    ['Items Sold', String(summary.totalItems)],
    ['Expenses', summary.expenseTotal.toFixed(2)],
    ['Contribution', summary.contribution.toFixed(2)],
    ['Inventory Value', summary.totalStockValue.toFixed(2)],
    ['Low Stock Items', String(summary.lowStockCount)],
    ['Out of Stock Items', String(summary.outOfStockCount)],
  ]);
}

type WorksheetRow = Record<string, unknown>;

const EXCEL_CELL_TEXT_LIMIT = 32767;
const EXCEL_TRUNCATION_SUFFIX = '... [truncated]';

const productCatalogWorksheetHeaders = [
  'Product Name',
  'SKU',
  'Barcode',
  'Category Code',
  'Category Name',
  'Department',
  'Description',
  'Image URL',
  'Selling Price',
  'Buying Price',
  'VAT Category',
  'Sizes',
  'Colors',
  'Status',
];

const stockWorksheetHeaders = [
  'Product SKU',
  'Product Name',
  'Product VAT Category',
  'Current Quantity',
  'Quantity To Add',
  'Unit Cost',
  'Supplier Name',
  'Reference Number',
  'Notes',
];

async function readWorkbookRows(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<WorksheetRow>(sheet, { defval: '', raw: false });
  return rows
    .map(normalizeWorksheetRow)
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim()));
}

type WorksheetCategoryReference = {
  code: string;
  name: string;
};

function normalizeWorksheetRow(row: WorksheetRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeWorksheetKey(key), value]),
  );
}

function normalizeWorksheetKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function worksheetText(row: WorksheetRow, ...headers: string[]) {
  for (const header of headers) {
    const value = row[normalizeWorksheetKey(header)];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeWorksheetLookupValue(value: string) {
  return value
    .trim()
    .replace(/[\u2019\u2018]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function worksheetCategoryReference(row: WorksheetRow): WorksheetCategoryReference {
  return {
    code: worksheetText(row, 'Category Code').toUpperCase(),
    name: worksheetText(row, 'Category Name', 'Category'),
  };
}

function requiredWorksheetText(row: WorksheetRow, rowNumber: number, label: string) {
  const value = worksheetText(row, label);
  if (!value) {
    throw new Error(`Row ${rowNumber}: ${label} is required.`);
  }
  return value;
}

function worksheetNumber(row: WorksheetRow, ...headers: string[]) {
  const value = worksheetText(row, ...headers);
  if (!value) {
    return undefined;
  }

  const number = Number(value.replaceAll(',', ''));
  if (!Number.isFinite(number)) {
    throw new Error(`${headers[0]} must be a number.`);
  }
  return number;
}

function requiredWorksheetNumber(
  row: WorksheetRow,
  rowNumber: number,
  label: string,
  ...aliases: string[]
) {
  const value = worksheetNumber(row, label, ...aliases);
  if (value == null) {
    throw new Error(`Row ${rowNumber}: ${label} is required.`);
  }
  return value;
}

function productRequestFromWorksheetRow(
  row: WorksheetRow,
  categories: ProductCategory[],
  defaultVatCategory: ProductVatCategory,
  rowNumber: number,
): ProductRequest {
  const sku = worksheetText(row, 'SKU').toUpperCase();
  const category = findWorksheetCategory(row, categories, rowNumber);
  const unitPrice = requiredWorksheetNumber(row, rowNumber, 'Selling Price', 'Unit Price', 'Price');
  const costPrice = requiredWorksheetNumber(
    row,
    rowNumber,
    'Buying Price',
    'Cost Price',
    'Supplier Price',
  );

  if (unitPrice < 0) {
    throw new Error(`Row ${rowNumber}: Selling Price cannot be negative.`);
  }
  if (costPrice < 0) {
    throw new Error(`Row ${rowNumber}: Buying Price cannot be negative.`);
  }

  return {
    name: requiredWorksheetText(row, rowNumber, 'Product Name'),
    sku,
    barcode: worksheetText(row, 'Barcode'),
    categoryId: category.id,
    department: worksheetText(row, 'Department'),
    description: worksheetText(row, 'Description'),
    imageUrl: worksheetText(row, 'Image URL', 'Image Url'),
    unitPrice,
    costPrice,
    vatCategory: vatCategoryFromWorksheet(
      worksheetText(row, 'VAT Category', 'Tax Category'),
      defaultVatCategory,
      rowNumber,
    ),
    sizes: parseCsv(worksheetText(row, 'Sizes')),
    colors: parseCsv(worksheetText(row, 'Colors', 'Colours')),
    status: productStatusFromWorksheet(row, rowNumber),
  };
}

async function ensureWorksheetCategories(
  rows: WorksheetRow[],
  existingCategories: ProductCategory[],
) {
  const categoriesByCode = new Map(
    existingCategories.map((category) => [category.code.toUpperCase(), category]),
  );
  const categoriesByName = new Map(
    existingCategories.map((category) => [normalizeWorksheetLookupValue(category.name), category]),
  );
  const categories = [...existingCategories];
  let created = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const categoryReference = worksheetCategoryReference(row);
    const normalizedName = normalizeWorksheetLookupValue(categoryReference.name);
    const matchingCategory =
      (categoryReference.code && categoriesByCode.get(categoryReference.code)) ||
      (normalizedName && categoriesByName.get(normalizedName));

    if (matchingCategory) {
      continue;
    }

    if (!categoryReference.code || !categoryReference.name.trim()) {
      throw new Error(
        `Row ${rowNumber}: Category Code and Category Name are required to create a missing category.`,
      );
    }

    const category = await createProductCategory({
      name: categoryReference.name.trim(),
      code: categoryReference.code,
      status: 'ACTIVE',
    });
    categories.push(category);
    categoriesByCode.set(category.code.toUpperCase(), category);
    categoriesByName.set(normalizeWorksheetLookupValue(category.name), category);
    created += 1;
  }

  return { categories, created };
}

function stockIntakeRequestFromWorksheetRow(
  row: WorksheetRow,
  branches: Branch[],
  products: Product[],
  rowNumber: number,
): StockIntakeRequest {
  const branch = findWorksheetBranch(row, branches, rowNumber);
  const product = findWorksheetProduct(row, products, rowNumber);
  const quantity =
    worksheetNumber(row, 'Quantity To Add', 'Quantity') ??
    requiredWorksheetNumber(row, rowNumber, 'Quantity');
  const unitCost =
    worksheetNumber(row, 'Unit Cost', 'Buying Price', 'Supplier Price') ?? product.costPrice;

  if (quantity <= 0) {
    throw new Error(`Row ${rowNumber}: Quantity To Add must be greater than zero.`);
  }
  if (unitCost == null) {
    throw new Error(`Row ${rowNumber}: Unit Cost is required.`);
  }
  if (unitCost < 0) {
    throw new Error(`Row ${rowNumber}: Unit Cost cannot be negative.`);
  }

  return {
    branchId: branch.id,
    productId: product.id,
    supplierName: worksheetText(row, 'Supplier Name', 'Supplier') || 'Worksheet Import',
    referenceNumber: worksheetText(row, 'Reference Number', 'Reference'),
    quantity,
    unitCost,
    notes: worksheetText(row, 'Notes'),
  };
}

function findWorksheetCategory(
  row: WorksheetRow,
  categories: ProductCategory[],
  rowNumber: number,
) {
  const { code: categoryCode, name: categoryName } = worksheetCategoryReference(row);
  const normalizedCategoryName = normalizeWorksheetLookupValue(categoryName);
  const category = categories.find(
    (item) =>
      (categoryCode && item.code.toUpperCase() === categoryCode) ||
      (normalizedCategoryName &&
        normalizeWorksheetLookupValue(item.name) === normalizedCategoryName),
  );

  if (!category) {
    throw new Error(`Row ${rowNumber}: Category Code or Category Name does not match a category.`);
  }
  return category;
}

function findWorksheetBranch(row: WorksheetRow, branches: Branch[], rowNumber: number) {
  const branchCode = worksheetText(row, 'Branch Code').toUpperCase();
  const branchName = worksheetText(row, 'Branch Name', 'Branch').toLowerCase();
  if (!branchCode && !branchName) {
    const defaultBranch = branches.find((item) => item.status === 'ACTIVE') ?? branches[0];
    if (!defaultBranch) {
      throw new Error(`Row ${rowNumber}: Shop location is not available.`);
    }
    return defaultBranch;
  }

  const branch = branches.find(
    (item) =>
      (branchCode && item.code.toUpperCase() === branchCode) ||
      (branchName && item.name.toLowerCase() === branchName),
  );

  if (!branch) {
    throw new Error(`Row ${rowNumber}: Shop Code or Shop Name does not match the configured shop.`);
  }
  return branch;
}

function findWorksheetProduct(row: WorksheetRow, products: Product[], rowNumber: number) {
  const productSku = worksheetText(row, 'Product SKU', 'SKU').toUpperCase();
  const productName = worksheetText(row, 'Product Name', 'Product').toLowerCase();
  const product = products.find(
    (item) =>
      (productSku && item.sku.toUpperCase() === productSku) ||
      (productName && item.name.toLowerCase() === productName),
  );

  if (!product) {
    throw new Error(`Row ${rowNumber}: Product SKU or Product Name does not match a product.`);
  }
  return product;
}

function productStatusFromWorksheet(row: WorksheetRow, rowNumber: number): Product['status'] {
  const status = worksheetText(row, 'Status');
  if (!status) {
    return 'ACTIVE';
  }

  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus === 'ACTIVE' || normalizedStatus === 'INACTIVE') {
    return normalizedStatus;
  }
  throw new Error(`Row ${rowNumber}: Status must be ACTIVE or INACTIVE.`);
}

function vatCategoryFromWorksheet(
  value: string,
  fallback: ProductVatCategory,
  rowNumber: number,
): ProductVatCategory {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    return fallback;
  }
  if (normalized === 'A' || normalized.includes('CATEGORY A') || normalized.includes('STANDARD')) {
    return 'A';
  }
  if (normalized === 'G' || normalized.includes('CATEGORY G') || normalized.includes('EXEMPT')) {
    return 'G';
  }
  throw new Error(`Row ${rowNumber}: VAT Category must be A or G.`);
}

function downloadProductCatalogWorkbook(
  products: Product[],
  categories: ProductCategory[],
  organization: Organization,
) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rows =
    products.length > 0
      ? products.map((product) => {
          const category = categoryById.get(product.categoryId);
          return [
            product.name,
            product.sku,
            product.barcode ?? '',
            category?.code ?? '',
            product.categoryName,
            product.department ?? '',
            product.description ?? '',
            exportableProductImageUrl(product.imageUrl),
            product.unitPrice,
            product.costPrice ?? '',
            product.vatCategory ?? organization.defaultProductVatCategory,
            product.sizes.join(', '),
            product.colors.join(', '),
            product.status,
          ];
        })
      : [
          [
            'Oxford Shirt',
            'OXF-001',
            '6001234567890',
            categories[0]?.code ?? 'SHIRTS',
            categories[0]?.name ?? 'Shirts',
            'Menswear',
            'Long sleeve cotton oxford shirt',
            'https://example.test/oxford-shirt.png',
            2800,
            1200,
            organization.defaultProductVatCategory,
            'M, L, XL',
            'Blue, White',
            'ACTIVE',
          ],
        ];

  downloadWorkbook('keen-product-catalog.xlsx', 'Products', productCatalogWorksheetHeaders, rows);
}

function exportableProductImageUrl(imageUrl: string | undefined) {
  if (!imageUrl || isInlineProductImage(imageUrl)) {
    return '';
  }

  return imageUrl;
}

function downloadStockWorksheet(
  branches: Branch[],
  products: Product[],
  inventory: InventoryItem[],
  organization: Organization,
) {
  const branch = branches.find((item) => item.status === 'ACTIVE') ?? branches[0];
  const inventoryByBranchProduct = new Map(
    inventory.map((item) => [`${item.branchId}:${item.productId}`, item]),
  );
  const rows: (string | number)[][] = [];

  if (branch) {
    for (const product of products) {
      const stock = inventoryByBranchProduct.get(`${branch.id}:${product.id}`);
      rows.push([
        product.sku,
        product.name,
        product.vatCategory ?? organization.defaultProductVatCategory,
        stock?.quantityOnHand ?? 0,
        '',
        product.costPrice ?? '',
        '',
        '',
        '',
      ]);
    }
  }

  downloadWorkbook('keen-stock-worksheet.xlsx', 'Stock', stockWorksheetHeaders, rows);
}

function downloadWorkbook(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const safeRows = [headers, ...rows].map(sanitizeWorkbookRow);
  const worksheet = XLSX.utils.aoa_to_sheet(safeRows);
  worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(14, header.length + 2) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    filename,
    new Blob([workbookBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
}

function downloadWorkbookRows(filename: string, sheetName: string, rows: (string | number)[][]) {
  const safeRows = rows.map(sanitizeWorkbookRow);
  const worksheet = XLSX.utils.aoa_to_sheet(safeRows);
  const columnCount = safeRows.reduce((count, row) => Math.max(count, row.length), 0);
  worksheet['!cols'] = Array.from({ length: columnCount }, (_, columnIndex) => {
    const width = safeRows.reduce((maxWidth, row) => {
      const value = row[columnIndex];
      return Math.max(maxWidth, String(value ?? '').length + 2);
    }, 12);
    return { wch: Math.min(34, width) };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const workbookBytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    filename,
    new Blob([workbookBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
}

function sanitizeWorkbookRow(row: (string | number)[]) {
  return row.map(sanitizeWorkbookCell);
}

function sanitizeWorkbookCell(value: string | number) {
  if (typeof value !== 'string' || value.length <= EXCEL_CELL_TEXT_LIMIT) {
    return value;
  }

  return `${value.slice(0, EXCEL_CELL_TEXT_LIMIT - EXCEL_TRUNCATION_SUFFIX.length)}${EXCEL_TRUNCATION_SUFFIX}`;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
}

function downloadBlob(filename: string, blob: Blob) {
  if (typeof URL.createObjectURL !== 'function') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function newSaleIdempotencyKey() {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return `pos-${window.crypto.randomUUID()}`;
  }
  return `pos-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newShiftId() {
  if ('crypto' in window && typeof window.crypto.randomUUID === 'function') {
    return `shift-${window.crypto.randomUUID()}`;
  }
  return `shift-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
