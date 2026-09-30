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
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
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
import {
  addStock,
  createStockAdjustment,
  createBranch,
  createExpense,
  createHrDepartment,
  createHrAttendance,
  createHrEmployee,
  createHrJobTitle,
  createHrLeaveRequest,
  createHrLeaveType,
  createHrPayrollComponent,
  createHrPayrollPeriod,
  createHrPayrollRun,
  createHrPerformanceEntry,
  createPermission,
  createProduct,
  createProductCategory,
  createRole,
  createSale,
  createSupplier,
  createTransfer,
  createUser,
  deactivateBranch,
  deactivateProduct,
  deactivateProductCategory,
  deactivateSupplier,
  deleteRole,
  disableUser,
  downloadHrDocument,
  getBranches,
  getCurrentUser,
  getExpenses,
  getHrAttendance,
  getHrDepartments,
  getHrDocuments,
  getHrEmployee,
  getHrEmployees,
  getHrJobTitles,
  getHrLeavePage,
  getHrPayrollPage,
  getHrPerformance,
  getInventory,
  getOrganization,
  getPermissions,
  getProductCategories,
  getProducts,
  getRoles,
  getSales,
  getStockAdjustments,
  getStockAdjustmentSummary,
  getStockIntakes,
  getSuppliers,
  getTransfers,
  getUsers,
  login,
  logout as logoutSession,
  markExpensePaid,
  recalculateHrPayrollRun,
  syncHrEmployeesFromUsers,
  updateBranch,
  updateHrAttendance,
  updateHrDepartment,
  updateHrEmployee,
  updateHrPayrollEmployeeAdjustment,
  updateHrPayrollSalesBonusRule,
  updateHrJobTitle,
  updateHrLeaveRequest,
  updateHrLeaveType,
  updateInventoryReorderLevel,
  updatePermission,
  updateProduct,
  updateProductCategory,
  updateOrganizationVatSettings,
  updateRole,
  updateSupplier,
  updateUser,
  uploadHrDocument,
  voidExpense,
} from './services/api';
import { askAiAssistant } from './services/aiAssistant';
import bannerUrl from './assets/fashion-pos-banner.png';
import keenLogoUrl from './assets/keen-logo.png';
import keenLogoWhiteUrl from './assets/keen-logo-white.png';
import type {
  AttendancePage,
  AttendanceRecord,
  AttendanceRequest,
  AttendanceStatus,
  ApiSource,
  Branch,
  BranchRequest,
  CartLine,
  CurrentUser,
  Department,
  DepartmentRequest,
  EmployeeEmploymentStatus,
  EmployeeEmploymentType,
  EmployeeDocument,
  EmployeePerformanceEntryRequest,
  EmployeePerformanceEntryType,
  EmployeePerformanceSummary,
  EmployeeProfile,
  EmployeeRequest,
  EmployeeSummary,
  Expense,
  ExpensePaymentMethod,
  ExpenseRequest,
  ExpenseStatus,
  InventoryItem,
  JobTitle,
  JobTitleRequest,
  LeaveBalance,
  LeavePage,
  LeaveRequestInput,
  LeaveRequestRecord,
  LeaveRequestStatus,
  LeaveType,
  LeaveTypeRequest,
  Organization,
  Permission,
  PermissionRequest,
  PayrollComponent,
  PayrollComponentRequest,
  PayrollComponentType,
  PayrollEmployeeAdjustmentRequest,
  PayrollPage,
  PayrollPeriod,
  PayrollPeriodRequest,
  PayrollPeriodStatus,
  PayrollRun,
  PayrollRunRequest,
  PayrollRunStatus,
  PayrollSalesBonusRuleRequest,
  SalaryPaymentMethod,
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
  StockTransfer,
  StockTransferRequest,
  Supplier,
  SupplierRequest,
  AiAssistantReply,
  UserRequest,
} from './data/types';

const queryClientOptions = {
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
};

type AppPermission =
  | 'admin:manage'
  | 'audit:view'
  | 'hr:attendance:correct'
  | 'hr:attendance:manage'
  | 'hr:attendance:view'
  | 'hr:dashboard:view'
  | 'hr:employee:create'
  | 'hr:employee:edit'
  | 'hr:employee:manage-status'
  | 'hr:employee:view'
  | 'hr:leave:approve'
  | 'hr:leave:manage'
  | 'hr:leave:request'
  | 'hr:leave:view'
  | 'hr:payroll:approve'
  | 'hr:payroll:process'
  | 'hr:payroll:view'
  | 'hr:payroll:view-payslip'
  | 'hr:performance:manage'
  | 'hr:performance:view'
  | 'hr:settings:manage'
  | 'inventory:adjust'
  | 'inventory:receive'
  | 'pos:sell'
  | 'pos:supervise'
  | 'profit:view'
  | 'reports:view'
  | 'sales:view'
  | 'transfer:create'
  | 'transfer:receive';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  anyPermissions?: AppPermission[];
  allPermissions?: AppPermission[];
};

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'bi-house-door',
    anyPermissions: ['admin:manage', 'reports:view', 'sales:view'],
  },
  { to: '/branches', label: 'Branches', icon: 'bi-shop', anyPermissions: ['admin:manage'] },
  { to: '/roles', label: 'Roles', icon: 'bi-person-badge', anyPermissions: ['admin:manage'] },
  { to: '/users', label: 'Users', icon: 'bi-people', anyPermissions: ['admin:manage'] },
  {
    to: '/product-catalog',
    label: 'Product Catalog',
    icon: 'bi-tags',
    adminOnly: true,
    anyPermissions: ['admin:manage'],
  },
  { to: '/suppliers', label: 'Suppliers', icon: 'bi-truck', anyPermissions: ['admin:manage'] },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: 'bi-box',
    anyPermissions: [
      'admin:manage',
      'inventory:adjust',
      'inventory:receive',
      'pos:sell',
      'reports:view',
      'sales:view',
      'transfer:create',
      'transfer:receive',
    ],
  },
  {
    to: '/low-stock',
    label: 'Low Stock',
    icon: 'bi-exclamation-triangle',
    anyPermissions: [
      'admin:manage',
      'inventory:adjust',
      'inventory:receive',
      'pos:sell',
      'reports:view',
      'sales:view',
      'transfer:create',
      'transfer:receive',
    ],
  },
  {
    to: '/add-stock',
    label: 'Add Stock',
    icon: 'bi-box-arrow-in-down',
    anyPermissions: ['admin:manage', 'inventory:receive'],
  },
  {
    to: '/transfers',
    label: 'Transfers',
    icon: 'bi-arrow-left-right',
    anyPermissions: ['admin:manage', 'transfer:create', 'transfer:receive'],
  },
  { to: '/pos', label: 'POS', icon: 'bi-bag', anyPermissions: ['admin:manage', 'pos:sell'] },
  {
    to: '/sales',
    label: 'Sales',
    icon: 'bi-bar-chart-line',
    anyPermissions: ['admin:manage', 'sales:view'],
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: 'bi-wallet2',
    anyPermissions: ['admin:manage', 'sales:view', 'reports:view'],
  },
  {
    to: '/shifts',
    label: 'Shifts',
    icon: 'bi-clock',
    allPermissions: ['pos:sell', 'sales:view'],
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: 'bi-file-earmark-text',
    adminOnly: true,
  },
  { to: '/hr', label: 'HR', icon: 'bi-people-fill', adminOnly: true },
  { to: '/settings', label: 'Settings', icon: 'bi-gear', anyPermissions: ['admin:manage'] },
  { to: '/help', label: 'Help', icon: 'bi-question-circle' },
];

const hrNavItems: NavItem[] = [
  {
    to: '/hr',
    label: 'Dashboard',
    icon: 'bi-house-door-fill',
    adminOnly: true,
  },
  {
    to: '/hr/employees',
    label: 'Employees',
    icon: 'bi-people',
    adminOnly: true,
  },
  {
    to: '/hr/attendance',
    label: 'Attendance',
    icon: 'bi-calendar2-check',
    adminOnly: true,
  },
  {
    to: '/hr/leave',
    label: 'Leave',
    icon: 'bi-calendar-week',
    adminOnly: true,
  },
  {
    to: '/hr/payroll',
    label: 'Payroll',
    icon: 'bi-wallet2',
    adminOnly: true,
  },
  {
    to: '/hr/recruitment',
    label: 'Recruitment',
    icon: 'bi-people-fill',
    adminOnly: true,
  },
  {
    to: '/hr/performance',
    label: 'Performance',
    icon: 'bi-bar-chart-line',
    adminOnly: true,
  },
  {
    to: '/hr/documents',
    label: 'Documents',
    icon: 'bi-file-earmark-text',
    adminOnly: true,
  },
  {
    to: '/hr/reports',
    label: 'Reports',
    icon: 'bi-graph-up-arrow',
    adminOnly: true,
  },
  {
    to: '/hr/settings',
    label: 'HR Settings',
    icon: 'bi-gear',
    adminOnly: true,
  },
];

function hasPermission(user: CurrentUser, permission: AppPermission) {
  return user.permissionCodes.includes(permission);
}

function hasAnyPermission(user: CurrentUser, permissions: AppPermission[]) {
  return permissions.some((permission) => hasPermission(user, permission));
}

function hasAllPermissions(user: CurrentUser, permissions: AppPermission[]) {
  return permissions.every((permission) => hasPermission(user, permission));
}

function isAdminUser(user: CurrentUser) {
  return user.roleKeys.includes('ADMIN');
}

function canViewProfit(user: CurrentUser) {
  return isAdminUser(user);
}

function canViewAllCashierSales(user: CurrentUser) {
  return (
    hasPermission(user, 'admin:manage') ||
    hasPermission(user, 'pos:supervise') ||
    hasPermission(user, 'reports:view')
  );
}

function canAccessNavItem(user: CurrentUser, item: NavItem) {
  if (item.adminOnly && !isAdminUser(user)) {
    return false;
  }
  if (hasPermission(user, 'admin:manage')) {
    return true;
  }
  if (item.allPermissions && !hasAllPermissions(user, item.allPermissions)) {
    return false;
  }
  if (item.anyPermissions && !hasAnyPermission(user, item.anyPermissions)) {
    return false;
  }
  return true;
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

function canAccessPath(user: CurrentUser, path: string) {
  const inHrModule = path === '/hr' || path.startsWith('/hr/');
  const routeItems = inHrModule ? hrNavItems : navItems;
  const routeItem =
    [...routeItems]
      .sort((first, second) => second.to.length - first.to.length)
      .find((item) => path === item.to || path.startsWith(`${item.to}/`)) ?? null;
  return routeItem == null ? !inHrModule : canAccessNavItem(user, routeItem);
}

const hrEmploymentTypeOptions: { value: EmployeeEmploymentType; label: string }[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'TEMPORARY', label: 'Temporary' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'CASUAL', label: 'Casual' },
];

const hrEmploymentStatusOptions: { value: EmployeeEmploymentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'RESIGNED', label: 'Resigned' },
  { value: 'RETIRED', label: 'Retired' },
];

const salaryPaymentMethodOptions: { value: SalaryPaymentMethod; label: string }[] = [
  { value: 'UNSPECIFIED', label: 'Not configured' },
  { value: 'BANK', label: 'Bank account' },
  { value: 'MPESA', label: 'M-Pesa' },
];

const attendanceStatusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'HOLIDAY', label: 'Holiday' },
  { value: 'OFF_DAY', label: 'Off Day' },
];

const leaveStatusOptions: { value: LeaveRequestStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const payrollComponentTypeOptions: { value: PayrollComponentType; label: string }[] = [
  { value: 'EARNING', label: 'Earning' },
  { value: 'DEDUCTION', label: 'Deduction' },
];

const payrollPeriodStatusOptions: { value: PayrollPeriodStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

const performanceEntryTypeOptions: { value: EmployeePerformanceEntryType; label: string }[] = [
  { value: 'PERFORMANCE_REVIEW', label: 'Performance Review' },
  { value: 'BONUS', label: 'Bonus' },
  { value: 'LOSS', label: 'Loss' },
  { value: 'MANUAL_SALE', label: 'Manual Sale' },
];

const hrDocumentTypeOptions = [
  'Employment Contract',
  'National ID',
  'KRA PIN',
  'Passport Photo',
  'Academic Certificate',
  'Bank Details',
  'Emergency Contact',
  'Leave Document',
  'Payroll Document',
  'Other',
];

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
    tone: 'blue',
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
    tone: 'purple',
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
  'Payroll',
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
    hint: 'Monitor your branches, payments and inventory health.',
    cards: [
      { title: 'Branch Performance', icon: 'bi-building', tone: 'blue', type: 'branches' },
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
    heading: 'People & Controls',
    hint: 'Keep track of your people, expenses and compliance.',
    cards: [
      { title: 'Expenses', icon: 'bi-cash-coin', tone: 'purple', type: 'expenses' },
      { title: 'Staff & Shifts', icon: 'bi-people-fill', tone: 'purple', type: 'staff' },
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

  return (
    <QueryClientProvider client={queryClient}>
      <style>{hrDashboardStyles}</style>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AppShell() {
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
  const [activeBranchId, setActiveBranchId] = useState('');

  useEffect(() => {
    if (
      activeBranchId &&
      !branches.some((branch) => branch.id === activeBranchId && branch.status === 'ACTIVE')
    ) {
      setActiveBranchId('');
    }
  }, [activeBranchId, branches]);

  const activeBranch = branches.find(
    (branch) => branch.id === activeBranchId && branch.status === 'ACTIVE',
  );
  const source: ApiSource = 'api';

  async function handleLogout() {
    try {
      await logoutSession();
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
              activeBranch={activeBranch}
              branches={branches}
              organization={organization}
              onLogout={handleLogout}
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
    <div className="app-shell">
      <Sidebar currentUser={currentUser} />

      <div className="content-shell">
        <BackOfficeTopbar
          activeBranchId={activeBranchId}
          branches={branches}
          currentUser={currentUser}
          onBranchChange={setActiveBranchId}
          onLogout={handleLogout}
          source={source}
        />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  activeBranch={activeBranch}
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route
              path="/branches"
              element={<BranchesPage branches={branches} organization={organization} />}
            />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/users" element={<UsersPage branches={branches} />} />
            <Route path="/product-catalog" element={<ProductsPage organization={organization} />} />
            <Route path="/products" element={<Navigate to="/product-catalog" replace />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route
              path="/inventory"
              element={<Inventory currentUser={currentUser} organization={organization} />}
            />
            <Route path="/low-stock" element={<LowStockPage organization={organization} />} />
            <Route
              path="/add-stock"
              element={<AddStockPage branches={branches} organization={organization} />}
            />
            <Route
              path="/transfers"
              element={<TransfersPage branches={branches} organization={organization} />}
            />
            <Route
              path="/expenses"
              element={<ExpensesPage branches={branches} organization={organization} />}
            />
            <Route
              path="/shifts"
              element={
                <ShiftsPage
                  activeBranch={activeBranch}
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ReportsHub
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route
              path="/hr"
              element={<HrDashboardPage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/employees"
              element={<HrEmployeesPage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/employees/:employeeId"
              element={<HrEmployeeProfilePage organization={organization} />}
            />
            <Route
              path="/hr/settings"
              element={<HrSettingsPage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/attendance"
              element={<HrAttendancePage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/leave"
              element={<HrLeavePage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/payroll"
              element={
                <HrPayrollPage
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route
              path="/hr/recruitment"
              element={<HrRecruitmentPage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/performance"
              element={
                <HrPerformancePage
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route
              path="/hr/documents"
              element={<HrDocumentsPage branches={branches} currentUser={currentUser} />}
            />
            <Route
              path="/hr/reports"
              element={
                <HrReportsPage
                  branches={branches}
                  currentUser={currentUser}
                  organization={organization}
                />
              }
            />
            <Route path="/settings" element={<SettingsPage organization={organization} />} />
            <Route path="/help" element={<HelpPage />} />
            <Route
              path="/sales"
              element={<SalesPage currentUser={currentUser} organization={organization} />}
            />
            <Route path="*" element={<BackOffice />} />
          </Routes>
        </main>
        <AiAssistantPanel />
      </div>
    </div>
  );
}

function defaultPathForUser(user: CurrentUser) {
  const defaultItem = navItems.find((item) => canAccessNavItem(user, item)) ?? null;
  if (defaultItem?.to === '/hr') {
    return hrNavItems.find((item) => canAccessNavItem(user, item))?.to ?? '/hr';
  }

  return defaultItem?.to ?? '/dashboard';
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
    return `Branches: ${branchesError.message}`;
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
      <img src={keenLogoUrl} alt="KEEN HR and POS" />
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

function AiAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reply, setReply] = useState<AiAssistantReply | null>(null);
  const askMutation = useMutation({
    mutationFn: askAiAssistant,
    onSuccess: (response) => {
      setReply(response);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Enter a question for the assistant');
      return;
    }
    setError('');
    try {
      await askMutation.mutateAsync(trimmed);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reach assistant');
    }
  }

  function applySuggestion(suggestion: string) {
    setMessage(suggestion);
    setError('');
  }

  return (
    <div className={`ai-assistant-shell ${isOpen ? 'open' : ''}`}>
      <button
        className="ai-assistant-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <i className="bi bi-stars" aria-hidden="true" />
        AI Assistant
      </button>
      {isOpen ? (
        <section className="ai-assistant-panel panel-card">
          <div className="ai-assistant-header">
            <div>
              <strong>ERP Assistant</strong>
              <span>Read-only business summaries</span>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <form className="ai-assistant-form" onSubmit={handleSubmit}>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about sales, stock, expenses, employees, attendance, or leave"
            />
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={askMutation.isPending}
            >
              <i className="bi bi-send" aria-hidden="true" />
              {askMutation.isPending ? 'Thinking...' : 'Ask Assistant'}
            </button>
          </form>
          <FormMessages error={error} message="" />
          {reply ? (
            <div className="ai-assistant-response">
              <p>{reply.answer}</p>
              {reply.citations.length > 0 ? (
                <div className="ai-assistant-citations">
                  <strong>Sources</strong>
                  <ul>
                    {reply.citations.map((citation) => (
                      <li key={citation}>{citation}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {reply.suggestions.length > 0 ? (
                <div className="ai-assistant-suggestions">
                  {reply.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="secondary-action compact-action"
                      onClick={() => applySuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="ai-assistant-empty">
              <p>
                Try: Show today&apos;s sales summary, Show low stock items, or Show attendance
                summary.
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function LoginPage() {
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
      navigate('/dashboard', { replace: true });
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

          <p className="login-powered">Powered by CRENVIXMORAVA SYSTEMS</p>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ currentUser }: { currentUser: CurrentUser }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const inHrModule = location.pathname === '/hr' || location.pathname.startsWith('/hr/');
  const mainNavItems = navItems.filter((item) => !['/hr', '/settings', '/help'].includes(item.to));
  const activeNavItems = (inHrModule ? hrNavItems : mainNavItems).filter((item) =>
    canAccessNavItem(currentUser, item),
  );
  const bottomNavItems = inHrModule
    ? []
    : ['/settings', '/help', '/hr']
        .map((path) => navItems.find((item) => item.to === path) ?? null)
        .filter((item): item is NavItem => item != null && canAccessNavItem(currentUser, item));
  const sidebarLabel = inHrModule ? 'HR navigation' : 'Primary navigation';

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <aside className={`sidebar ${isMenuOpen ? 'menu-open' : ''}`} aria-label={sidebarLabel}>
      <div className="sidebar-header">
        <Brand variant="sidebar" />
        <button
          aria-controls="primary-navigation-menu"
          aria-expanded={isMenuOpen}
          className="menu-button"
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>

      <nav className="nav-stack" id="primary-navigation-menu">
        {activeNavItems.map((item) => (
          <NavLink
            className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
            key={item.to}
            onClick={() => setIsMenuOpen(false)}
            to={item.to}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {inHrModule ? (
        <div className="sidebar-module-switch">
          <NavLink
            className="secondary-action compact-action sidebar-module-switch-button"
            to="/dashboard"
          >
            <i className="bi bi-arrow-left-circle" aria-hidden="true" />
            Main System
          </NavLink>
        </div>
      ) : null}

      {bottomNavItems.length > 0 ? (
        <nav className="sidebar-bottom-nav" aria-label="Pinned navigation">
          {bottomNavItems.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
              key={item.to}
              onClick={() => setIsMenuOpen(false)}
              to={item.to}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}

      <div className="sidebar-footer">
        <i className="bi bi-layers" aria-hidden="true" />
        <span>Copyright @CRENVIX MORAVA SYSTEMS</span>
      </div>
    </aside>
  );
}

function Brand({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) {
  const brandLogoSrc = variant === 'sidebar' ? keenLogoWhiteUrl : keenLogoUrl;

  return (
    <div className="brand-block">
      <img className="brand-logo" src={brandLogoSrc} alt="KEEN HR and POS" />
    </div>
  );
}

type BackOfficeTopbarProps = {
  activeBranchId: string;
  branches: Branch[];
  currentUser: CurrentUser;
  onBranchChange: (branchId: string) => void;
  onLogout: () => void;
  source: ApiSource;
};

function BackOfficeTopbar({
  activeBranchId,
  branches,
  currentUser,
  onBranchChange,
  onLogout,
  source,
}: BackOfficeTopbarProps) {
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');

  return (
    <header className="topbar">
      <div className="topbar-actions">
        <label className="select-shell branch-switcher">
          <i className="bi bi-building" aria-hidden="true" />
          <select
            aria-label="Active branch"
            value={activeBranchId}
            onChange={(event) => onBranchChange(event.target.value)}
          >
            <option value="">All Branches</option>
            {activeBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <span className={`data-chip ${source}`}>{source === 'api' ? 'Online' : 'Demo'}</span>
        <UserChip name={currentUser.displayName} role={primaryRoleLabel(currentUser)} />
        <button className="logout-action" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" />
          Log Out
        </button>
      </div>
    </header>
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
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState('Walk-in Customer');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(() =>
    newSaleIdempotencyKey(),
  );
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [saleMessage, setSaleMessage] = useState('');
  const [saleError, setSaleError] = useState('');
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const registerBranch = activeBranch ?? activeBranches[0];
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
    return matchesCategory && haystack.includes(search.toLowerCase());
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
    mutationFn: ({ payload, idempotencyKey }: { payload: SaleRequest; idempotencyKey: string }) =>
      createSale(payload, idempotencyKey),
    onSuccess: async (sale) => {
      updateSalesCache(queryClient, sale);
      decrementInventoryCacheForSale(queryClient, sale);
      decrementProductStockCacheForSale(queryClient, sale);
      setPaymentOpen(false);
      setCart([]);
      setCustomer('Walk-in Customer');
      setCheckoutIdempotencyKey(newSaleIdempotencyKey());
      setSaleError('');
      setSaleMessage(`Sale ${sale.saleNumber} recorded.`);
      setCompletedSale(sale);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  useEffect(() => {
    setCart([]);
    setPaymentOpen(false);
    setSaleMessage('');
    setSaleError('');
    setCompletedSale(null);
  }, [registerBranch?.id]);

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
    setSaleMessage('');
    setSaleError('');

    if (!registerBranch) {
      setSaleError('Create or select an active branch before selling.');
      return;
    }

    if (inventoryQuery.isPending) {
      setSaleError('Inventory is still loading. Try again in a moment.');
      return;
    }

    const currentQuantity = quantityInCart(product.id);
    const availableQuantity = availableForProduct(product);
    if (availableQuantity <= currentQuantity) {
      setSaleError(
        `${product.name} has only ${availableQuantity} units available at ${registerBranch.name}.`,
      );
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
    setSaleMessage('');
    setSaleError('');

    if (delta > 0) {
      const product = products.find((item) => item.id === productId);
      if (product && availableForProduct(product) <= quantityInCart(productId)) {
        setSaleError(
          `${product.name} has only ${availableForProduct(product)} units available at ${registerBranch?.name ?? 'this branch'}.`,
        );
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
      setSaleError('Create or select an active branch before completing a sale.');
      return;
    }
    if (cartProducts.length === 0) {
      setSaleError('Add at least one product before completing a sale.');
      return;
    }
    setCheckoutIdempotencyKey(newSaleIdempotencyKey());
    setPaymentOpen(true);
  }

  async function completeSale(payments: SalePaymentRequest[]) {
    setSaleMessage('');
    setSaleError('');
    if (!registerBranch) {
      setSaleError('Create or select an active branch before completing a sale.');
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
              <strong>{registerBranch?.name ?? 'No branch selected'}</strong>
              <span>Register 02</span>
            </div>
          </div>
          <div className="pos-session">
            <UserChip name={currentUser.displayName} role={primaryRoleLabel(currentUser)} compact />
            <span className="service-chip success">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              Open Shift
            </span>
            <span className="online-dot">
              <span />
              {source === 'api' ? 'Online' : 'Offline'}
            </span>
            <NavLink className="exit-command" to="/dashboard">
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Exit POS
            </NavLink>
            <button className="exit-command" type="button" onClick={onLogout}>
              <i className="bi bi-power" aria-hidden="true" />
              Log Out
            </button>
          </div>
        </header>

        <main className="pos-workspace">
          <section className="pos-catalog" aria-label="Product catalogue">
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

            {productsQuery.isPending ? (
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

          <aside className="cart-surface" aria-label="Current cart">
            <div className="cart-header">
              <div>
                <h2>Current Sale</h2>
                <span>({cartProducts.length} items)</span>
              </div>
              <button className="text-button danger-text" type="button" onClick={() => setCart([])}>
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
      </div>

      {paymentOpen ? (
        <PaymentDialog
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
  amount: number;
  currencyCode: string;
  error: string;
  isSubmitting: boolean;
  onClose: () => void;
  onFinalize: (payments: SalePaymentRequest[]) => Promise<void> | void;
};

function PaymentDialog({
  amount,
  currencyCode,
  error,
  isSubmitting,
  onClose,
  onFinalize,
}: PaymentDialogProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('single');
  const [singlePayment, setSinglePayment] = useState<PaymentDraft>(() => newPaymentDraft());
  const [splitPayments, setSplitPayments] = useState<PaymentDraft[]>(() => [
    newPaymentDraft('MPESA'),
    newPaymentDraft('CASH'),
  ]);
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

    void onFinalize(paymentResult.payments);
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

                    <label className="payment-method-field" htmlFor={`split-method-${payment.id}`}>
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

        {displayError ? (
          <p className="message-banner error" role="alert">
            <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
            {displayError}
          </p>
        ) : null}
        <button
          className="primary-action payment-complete-action"
          type="submit"
          disabled={isSubmitting}
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

function ReceiptDialog({
  organization,
  onClose,
  sale,
}: {
  organization: Organization;
  onClose: () => void;
  sale: Sale;
}) {
  const itemCount = sale.lines.reduce((sum, line) => sum + line.quantity, 0);
  const cashReceivedTotal = sale.payments.reduce(
    (sum, payment) => sum + (payment.cashReceived ?? 0),
    0,
  );
  const changeDueTotal = sale.payments.reduce((sum, payment) => sum + (payment.changeDue ?? 0), 0);

  useEffect(() => {
    function handleReceiptShortcut(event: KeyboardEvent) {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      window.print();
    }

    window.addEventListener('keydown', handleReceiptShortcut);
    return () => window.removeEventListener('keydown', handleReceiptShortcut);
  }, []);

  return (
    <div className="dialog-backdrop receipt-backdrop" role="presentation">
      <section
        className="receipt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
      >
        <div className="dialog-header receipt-actions">
          <div>
            <p className="eyebrow">Sale complete</p>
            <h2 id="receipt-title">Receipt</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close receipt"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="receipt-print-area">
          <div className="receipt-business">
            <strong>{organization.name}</strong>
            <span>{sale.branchName}</span>
            {organization.taxRegistrationNumber ? (
              <span>PIN: {organization.taxRegistrationNumber}</span>
            ) : null}
          </div>

          <div className="receipt-meta">
            <div>
              <span className="receipt-meta-label">Receipt</span>
              <span className="receipt-meta-value">{sale.saleNumber}</span>
            </div>
            <div>
              <span className="receipt-meta-label">Date</span>
              <span className="receipt-meta-value">{formatDateTime(sale.soldAt)}</span>
            </div>
          </div>

          <div className="receipt-lines">
            <div className="receipt-line receipt-line-head">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            {sale.lines.map((line) => (
              <div className="receipt-line" key={`${sale.id}-${line.productId}`}>
                <span>{line.productName}</span>
                <span>{line.quantity}</span>
                <span>{formatMoney(line.unitPrice, organization.currencyCode)}</span>
                <span>{formatMoney(line.lineTotal, organization.currencyCode)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-total-block">
            <div>
              <span>Total Qty</span>
              <strong>{itemCount}</strong>
            </div>
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(sale.subtotalAmount, organization.currencyCode)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{formatMoney(sale.discountAmount || 0, organization.currencyCode)}</strong>
            </div>
            <div>
              <span>VAT</span>
              <strong>{formatMoney(sale.taxAmount, organization.currencyCode)}</strong>
            </div>
            <div className="receipt-grand-total">
              <span>Total</span>
              <strong>{formatMoney(sale.totalAmount, organization.currencyCode)}</strong>
            </div>
          </div>

          <div className="receipt-payment">
            <div>
              <span>{sale.payments.length === 1 ? 'Payment' : 'Payments'}</span>
              <strong>{formatSalePayments(sale)}</strong>
            </div>
            {sale.payments.map((payment, index) => (
              <div className="receipt-payment-line" key={payment.id}>
                <span>{sale.payments.length === 1 ? 'Tender' : `Tender ${index + 1}`}</span>
                <strong>
                  {formatPaymentMethod(payment.method)}{' '}
                  {formatMoney(payment.amount, organization.currencyCode)}
                  {payment.reference ? ` (${payment.reference})` : ''}
                </strong>
              </div>
            ))}
            {cashReceivedTotal > 0 ? (
              <div>
                <span>Cash Received</span>
                <strong>{formatMoney(cashReceivedTotal, organization.currencyCode)}</strong>
              </div>
            ) : null}
            {changeDueTotal > 0 ? (
              <div>
                <span>Change</span>
                <strong>{formatMoney(changeDueTotal, organization.currencyCode)}</strong>
              </div>
            ) : null}
          </div>

          <p className="receipt-thanks">Thank you for shopping with us.</p>
        </div>

        <div className="receipt-actions receipt-footer-actions">
          <button className="secondary-action compact-action" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-action compact-action"
            type="button"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer" aria-hidden="true" />
            Print Receipt <kbd>Enter</kbd>
          </button>
        </div>
      </section>
    </div>
  );
}

function SalesPage({
  currentUser,
  organization,
}: {
  currentUser: CurrentUser;
  organization: Organization;
}) {
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
  const sales = salesQuery.data ?? [];
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalItems = sales.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );
  const cashierCount = new Set(sales.map((sale) => sale.soldByEmployeeId ?? 'unassigned-cashier'))
    .size;
  const viewingAllCashiers = canViewAllCashierSales(currentUser);

  return (
    <section className="table-workspace">
      <PageHeader
        title="Sales"
        subtitle={
          viewingAllCashiers
            ? 'Completed POS sales from all cashiers for the selected dates.'
            : 'Completed POS sales recorded by your account for the selected dates.'
        }
      />

      <div className="catalog-filter-bar hr-filter-bar">
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
        <SummaryMetric
          icon="bi-person-badge"
          label={viewingAllCashiers ? 'Cashiers' : 'Account'}
          value={viewingAllCashiers ? String(cashierCount) : 'Mine'}
          tone="purple"
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
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Branch</th>
                <th>Cashier</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Sold At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td data-label="Receipt">
                    <span className="table-label">
                      <i className="bi bi-receipt" aria-hidden="true" />
                      {sale.saleNumber}
                    </span>
                  </td>
                  <td data-label="Branch">{sale.branchName}</td>
                  <td data-label="Cashier">
                    {sale.soldByEmployeeName ?? 'Unassigned'}
                    {sale.soldByEmployeeNumber ? (
                      <>
                        <br />
                        <small>{sale.soldByEmployeeNumber}</small>
                      </>
                    ) : null}
                  </td>
                  <td data-label="Customer">{sale.customerName || 'Walk-in Customer'}</td>
                  <td data-label="Items">
                    {sale.lines.reduce((sum, line) => sum + line.quantity, 0)} item
                    {sale.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? '' : 's'}
                  </td>
                  <td data-label="Payment">{formatSalePayments(sale)}</td>
                  <td data-label="Total">
                    {formatMoney(sale.totalAmount, organization.currencyCode)}
                  </td>
                  <td data-label="Status">
                    <StatusPill status="posted" label="Completed" />
                  </td>
                  <td data-label="Sold At">{formatDateTime(sale.soldAt)}</td>
                  <td data-label="Actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setSelectedReceipt(sale)}
                    >
                      <i className="bi bi-printer" aria-hidden="true" />
                      Receipt
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

type DashboardProps = {
  activeBranch?: Branch;
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
};

function Dashboard({ activeBranch, branches, currentUser, organization }: DashboardProps) {
  const navigate = useNavigate();
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
  const inventory = inventoryQuery.data ?? [];
  const sales = salesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const stockAdjustmentSummary = stockAdjustmentSummaryQuery.data ?? emptyStockAdjustmentSummary();
  const branchRows = (activeBranch ? [activeBranch] : branches).filter(
    (branch) => branch.status === 'ACTIVE',
  );
  const todayRange = reportPeriodRange('today');
  const branchSales = activeBranch
    ? sales.filter((sale) => sale.branchId === activeBranch.id)
    : sales;
  const dashboardSales = branchSales.filter((sale) => isWithinReportRange(sale.soldAt, todayRange));
  const branchExpenses = activeBranch
    ? expenses.filter((expense) => expense.branchId === activeBranch.id)
    : expenses;
  const dashboardExpenses = branchExpenses.filter((expense) =>
    isWithinReportRange(expense.incurredAt, todayRange),
  );
  const dashboardInventory = activeBranch
    ? inventory.filter((item) => item.branchId === activeBranch.id)
    : inventory;
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
  const branchPerformanceRows = branchPerformanceFromSales(branchRows, dashboardSales);
  const lowStockItems = dashboardInventory.filter((item) => item.stockHealth !== 'HEALTHY');
  const isExportDisabled =
    !showProfit ||
    inventoryQuery.isPending ||
    salesQuery.isPending ||
    expensesQuery.isPending ||
    (canViewStockAdjustments && stockAdjustmentSummaryQuery.isPending);

  return (
    <section className="dashboard-grid">
      <PageHeader
        title="Today's Dashboard"
        subtitle="Daily sales, expenses, payments, and stock alerts for the selected branch view."
        action={
          showProfit ? (
            <div className="header-actions">
              <button
                className="primary-action compact-action"
                type="button"
                disabled={isExportDisabled}
                onClick={() =>
                  exportDashboardCsv({
                    branchPerformanceRows,
                    contribution: grossProfit - totalExpenses,
                    currencyCode: organization.currencyCode,
                    grossProfit,
                    lowStockItems,
                    paymentMethodTotals,
                    scope: activeBranch?.name ?? 'All Branches',
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
          <PanelHeader icon="bi-bar-chart-fill" title="Today's Sales Performance" />
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dashboardSalesTrend}
                barCategoryGap="38%"
                margin={{ left: 18, right: 28, top: 14, bottom: 2 }}
              >
                <CartesianGrid stroke="#d6dee8" strokeDasharray="4 4" vertical={false} />
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
                  fill="#2878f0"
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
                  stroke="#0f2f4a"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ffffff', stroke: '#0f2f4a', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#ffffff', stroke: '#0f2f4a', strokeWidth: 3 }}
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
          <PanelHeader icon="bi-credit-card-2-front-fill" title="Sales by Payment Method" />
          {salesQuery.isPending ? (
            <LoadingPanel label="Loading payment totals..." />
          ) : (
            <DonutChart
              centerValue={formatMoney(totalSales, organization.currencyCode)}
              centerLabel="Total Sales"
              currencyCode={organization.currencyCode}
              data={paymentMethodTotals}
            />
          )}
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="panel-card branch-panel">
          <PanelHeader
            icon="bi-shop"
            title="Branch Performance"
            action={
              hasPermission(currentUser, 'admin:manage') ? (
                <button className="text-button" type="button" onClick={() => navigate('/branches')}>
                  View All Branches
                </button>
              ) : undefined
            }
          />
          <div className="responsive-table compact-table">
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Net Sales</th>
                  {showProfit ? <th>Gross Profit</th> : null}
                  <th>Transactions</th>
                  <th>Avg Basket</th>
                  <th>Variance</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.length === 0 ? (
                  <tr>
                    <td colSpan={showProfit ? 7 : 6}>
                      <span className="muted-table-message">No branches registered yet</span>
                    </td>
                  </tr>
                ) : (
                  branchPerformanceRows.map((row, index) => (
                    <tr key={row.branch.id}>
                      <td data-label="Branch">
                        <span className="table-label">
                          <i className="bi bi-shop" aria-hidden="true" />
                          {row.branch.name}
                        </span>
                      </td>
                      <td data-label="Net Sales">
                        {formatMoney(row.netSales, organization.currencyCode)}
                      </td>
                      {showProfit ? (
                        <td data-label="Gross Profit">
                          {formatMoney(row.grossProfit, organization.currencyCode)}
                        </td>
                      ) : null}
                      <td data-label="Transactions">{row.transactions}</td>
                      <td data-label="Avg Basket">
                        {formatMoney(row.averageBasket, organization.currencyCode)}
                      </td>
                      <td data-label="Variance" className="positive-text">
                        <i className="bi bi-dash" aria-hidden="true" />
                        0%
                      </td>
                      <td data-label="Trend">
                        <Sparkline offset={index} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

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
                <small>
                  {stockHealthLabel(item.stockHealth)} - {item.branchName}
                </small>
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
  users: StaffUser[],
  stockIntakes: StockIntake[] = [],
  transfers: StockTransfer[] = [],
  stockAdjustments: StockAdjustment[] = [],
) {
  const nonVoidedExpenses = expenses.filter((expense) => expense.status !== 'VOID');
  const completedTransfers = transfers.filter((transfer) => transfer.status === 'COMPLETED');
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
  const transferredUnits = completedTransfers.reduce((sum, transfer) => sum + transfer.quantity, 0);
  const activityRows = reportMixRows([
    { name: 'Sales receipts', value: sales.length, color: '#2878f0' },
    { name: 'Expense entries', value: nonVoidedExpenses.length, color: '#7357e8' },
    { name: 'Stock receipts', value: stockIntakes.length, color: '#9db8d5' },
    { name: 'Transfers', value: completedTransfers.length, color: '#ff8a1f' },
    { name: 'Stock counts', value: stockAdjustmentRows.length, color: '#e93445' },
  ]);
  const stockMovementRows = reportMixRows([
    { name: 'Units sold', value: totalItems, color: '#2878f0' },
    { name: 'Units received', value: receivedUnits, color: '#7357e8' },
    { name: 'Units transferred', value: transferredUnits, color: '#9db8d5' },
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
    activeUserCount: users.filter((user) => user.status === 'ACTIVE').length,
    activityRows,
    activityTotal: activityRows.reduce((sum, row) => sum + row.value, 0),
    branchSalesRows: branchSalesReportRows(branches, sales),
    branchRows: branchPerformanceFromSales(branches, sales).sort(
      (first, second) => second.netSales - first.netSales,
    ),
    categoryRows,
    categoryRowsTotal: categoryRows.reduce((sum, row) => sum + row.value, 0),
    completedTransfers,
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
    transferredUnits,
    transfers,
    userCount: users.length,
    users,
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

function matchesTransferBranch(transfer: StockTransfer, selectedBranchId: string) {
  return (
    !selectedBranchId ||
    transfer.sourceBranchId === selectedBranchId ||
    transfer.destinationBranchId === selectedBranchId
  );
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
      detail: `${summary.activeUserCount} active users`,
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
      detail: `${summary.completedTransfers.length} transfers`,
      icon: 'bi-arrow-left-right',
      label: 'Transfer units',
      tone: 'blue',
      value: formatQuantity(summary.transferredUnits),
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
      title: 'Branch Performance',
      date: `${summary.branchRows.length} branches`,
      icon: 'bi-building',
      tone: 'purple',
      type: 'branches',
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

type BranchFormState = BranchRequest;

function defaultBranchForm(timeZone: string): BranchFormState {
  return {
    name: '',
    code: '',
    timeZone: timeZone || 'Africa/Nairobi',
    status: 'ACTIVE',
  };
}

function BranchesPage({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchFormState>(() => defaultBranchForm(organization.timeZone));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const inactiveBranches = branches.length - activeBranches.length;
  const editingBranch = branches.find((branch) => branch.id === editingBranchId);

  const saveBranchMutation = useMutation({
    mutationFn: (payload: BranchRequest) =>
      editingBranchId ? updateBranch(editingBranchId, payload) : createBranch(payload),
    onSuccess: async (savedBranch) => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      setEditingBranchId(null);
      setForm(defaultBranchForm(organization.timeZone));
      setMessage(`${savedBranch.name} saved.`);
    },
  });

  const deactivateBranchMutation = useMutation({
    mutationFn: deactivateBranch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      setMessage('Branch deactivated.');
    },
  });

  const reactivateBranchMutation = useMutation({
    mutationFn: (branch: Branch) =>
      updateBranch(branch.id, {
        name: branch.name,
        code: branch.code,
        timeZone: branch.timeZone,
        status: 'ACTIVE',
      }),
    onSuccess: async (branch) => {
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      setMessage(`${branch.name} reactivated.`);
    },
  });

  const isBusy =
    saveBranchMutation.isPending ||
    deactivateBranchMutation.isPending ||
    reactivateBranchMutation.isPending;

  function updateForm<K extends keyof BranchFormState>(field: K, value: BranchFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setEditingBranchId(null);
    setForm(defaultBranchForm(organization.timeZone));
    setError('');
    setMessage('');
  }

  function editBranch(branch: Branch) {
    setEditingBranchId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code,
      timeZone: branch.timeZone,
      status: branch.status,
    });
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await saveBranchMutation.mutateAsync({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        timeZone: form.timeZone.trim(),
        status: form.status,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save branch');
    }
  }

  async function handleDeactivate(branch: Branch) {
    setError('');
    setMessage('');
    try {
      if (branch.status === 'ACTIVE') {
        await deactivateBranchMutation.mutateAsync(branch.id);
      } else {
        await reactivateBranchMutation.mutateAsync(branch);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update branch');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Branches"
        subtitle="Register and manage shop locations for this business."
        action={
          <button className="primary-action compact-action" type="button" onClick={resetForm}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New Branch
          </button>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric
          icon="bi-shop"
          label="Active Branches"
          value={String(activeBranches.length)}
          tone="green"
        />
        <SummaryMetric
          icon="bi-pause-circle"
          label="Inactive Branches"
          value={String(inactiveBranches)}
          tone="orange"
        />
        <SummaryMetric
          icon="bi-clock"
          label="Default Time Zone"
          value={organization.timeZone}
          tone="blue"
        />
      </div>

      <div className="management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon={editingBranch ? 'bi-pencil-square' : 'bi-plus-square'}
            title={editingBranch ? 'Edit Branch' : 'Register Branch'}
          />

          <form className="record-form hr-employee-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Branch Name</span>
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Branch Code</span>
              <input
                required
                maxLength={24}
                value={form.code}
                onChange={(event) => updateForm('code', event.target.value.toUpperCase())}
              />
            </label>

            <label className="field-stack">
              <span>Time Zone</span>
              <input
                required
                maxLength={64}
                value={form.timeZone}
                onChange={(event) => updateForm('timeZone', event.target.value)}
              />
            </label>

            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm('status', event.target.value as BranchFormState['status'])
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>

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

            <div className="form-actions">
              {editingBranch ? (
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
                {isBusy ? 'Saving...' : editingBranch ? 'Save Changes' : 'Register Branch'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-list-check" title="Registered Branches" />

          {branches.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-shop" aria-hidden="true" />
              <strong>No branches registered</strong>
              <span>Branches you register will appear here.</span>
            </div>
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Code</th>
                    <th>Time Zone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td data-label="Branch">
                        <span className="table-label">
                          <i className="bi bi-shop" aria-hidden="true" />
                          {branch.name}
                        </span>
                      </td>
                      <td data-label="Code">{branch.code}</td>
                      <td data-label="Time Zone">{branch.timeZone}</td>
                      <td data-label="Status">
                        <StatusPill
                          status={branch.status === 'ACTIVE' ? 'posted' : 'pending'}
                          label={branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td data-label="Actions">
                        <span className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => editBranch(branch)}
                          >
                            <i className="bi bi-pencil" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            className={
                              branch.status === 'ACTIVE' ? 'text-button danger-text' : 'text-button'
                            }
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeactivate(branch)}
                          >
                            <i
                              className={`bi ${
                                branch.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'
                              }`}
                              aria-hidden="true"
                            />
                            {branch.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
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

type SupplierFormState = SupplierRequest;

function defaultSupplierForm(): SupplierFormState {
  return {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    notes: '',
    status: 'ACTIVE',
  };
}

function SuppliersPage() {
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const suppliers = suppliersQuery.data ?? [];
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVE');
  const inactiveSuppliers = suppliers.length - activeSuppliers.length;
  const contactableSuppliers = suppliers.filter((supplier) => supplier.phone || supplier.email);
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
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        notes: supplier.notes ?? '',
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
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      notes: supplier.notes ?? '',
      status: supplier.status,
    });
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await saveSupplierMutation.mutateAsync({
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
        status: form.status,
      });
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
                    <th>Contact</th>
                    <th>Phone</th>
                    <th>Email</th>
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
                      <td data-label="Contact">{supplier.contactPerson || 'N/A'}</td>
                      <td data-label="Phone">{supplier.phone || 'N/A'}</td>
                      <td data-label="Email">{supplier.email || 'N/A'}</td>
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
  const roles = rolesQuery.data ?? [];
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
        subtitle="Define role keys, permission assignments, and the permission catalog."
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
            <button
              className="primary-action compact-action"
              type="button"
              onClick={openNewRoleDialog}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New Role
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
                              onClick={() => editRole(role)}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              className="text-button danger-text"
                              type="button"
                              disabled={deleteRoleMutation.isPending || role.assignedUsers > 0}
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

type HrDepartmentFormState = DepartmentRequest;
type HrJobTitleFormState = JobTitleRequest;
type HrEmployeeFormState = EmployeeRequest;
type HrAttendanceFormState = AttendanceRequest;
type HrLeaveTypeFormState = LeaveTypeRequest;
type HrLeaveRequestFormState = LeaveRequestInput;
type HrPayrollComponentFormState = PayrollComponentRequest;
type HrPayrollPeriodFormState = PayrollPeriodRequest;
type HrPayrollRunFormState = PayrollRunRequest;
type HrPayrollAdjustmentFormState = PayrollEmployeeAdjustmentRequest;
type HrPayrollSalesBonusRuleFormState = PayrollSalesBonusRuleRequest;
type HrPayslipRecord = {
  run: PayrollRun;
  period: PayrollPeriod | null;
  employee: PayrollRun['employees'][number];
};
type HrPerformanceEntryFormState = EmployeePerformanceEntryRequest;

function defaultHrDepartmentForm(): HrDepartmentFormState {
  return {
    name: '',
    code: '',
    description: '',
    branchId: '',
    managerUserId: '',
    active: true,
  };
}

function defaultHrJobTitleForm(): HrJobTitleFormState {
  return {
    title: '',
    code: '',
    departmentId: '',
    description: '',
    active: true,
  };
}

function defaultHrEmployeeForm(branchId = ''): HrEmployeeFormState {
  return {
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    nationalIdNumber: '',
    primaryBranchId: branchId,
    departmentId: '',
    jobTitleId: '',
    employmentType: 'PERMANENT',
    employmentStatus: 'ACTIVE',
    joiningDate: dateInputValue(new Date()),
    probationEndDate: '',
    contractStartDate: '',
    contractEndDate: '',
    userId: '',
    managerEmployeeId: '',
    workLocation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    address: '',
    notes: '',
    basicSalary: 0,
    salaryPaymentMethod: 'UNSPECIFIED',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    mpesaNumber: '',
    active: true,
  };
}

function defaultHrAttendanceForm(branchId = ''): HrAttendanceFormState {
  return {
    employeeId: '',
    branchId,
    attendanceDate: dateInputValue(new Date()),
    clockIn: '',
    clockOut: '',
    status: 'PRESENT',
    notes: '',
    correctionReason: '',
  };
}

function defaultHrLeaveTypeForm(): HrLeaveTypeFormState {
  return {
    name: '',
    code: '',
    description: '',
    requiresBalance: true,
    defaultDays: 21,
    active: true,
  };
}

function defaultHrLeaveRequestForm(): HrLeaveRequestFormState {
  return {
    employeeId: '',
    leaveTypeId: '',
    startDate: dateInputValue(new Date()),
    endDate: dateInputValue(new Date()),
    reason: '',
    approverUserId: '',
    approverComments: '',
    status: 'DRAFT',
  };
}

function defaultHrPayrollComponentForm(): HrPayrollComponentFormState {
  return {
    name: '',
    code: '',
    componentType: 'EARNING',
    taxable: false,
    defaultAmount: 0,
    active: true,
  };
}

function defaultHrPayrollPeriodForm(): HrPayrollPeriodFormState {
  const today = new Date();
  return {
    branchId: '',
    name: '',
    periodStart: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    periodEnd: dateInputValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    paymentDate: '',
    status: 'DRAFT',
  };
}

function defaultHrPayrollRunForm(): HrPayrollRunFormState {
  return {
    payrollPeriodId: '',
    name: '',
    status: 'DRAFT',
  };
}

function defaultHrPayrollAdjustmentForm(
  bonusAmount = 0,
  lossAmount = 0,
  notes = '',
): HrPayrollAdjustmentFormState {
  return {
    bonusAmount,
    lossAmount,
    notes,
  };
}

function defaultHrPayrollSalesBonusRuleForm(): HrPayrollSalesBonusRuleFormState {
  return {
    dailySalesTarget: 0,
    bonusPerTargetDay: 0,
    active: true,
  };
}

function defaultHrPerformanceEntryForm(employeeId = ''): HrPerformanceEntryFormState {
  return {
    employeeId,
    entryType: 'PERFORMANCE_REVIEW',
    entryDate: dateInputValue(new Date()),
    title: '',
    amount: 0,
    score: 80,
    notes: '',
  };
}

function UsersPage({ branches }: { branches: Branch[] }) {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: getRoles });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const roles = rolesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(() => defaultUserForm());
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editingUser = users.find((user) => user.id === editingUserId);
  const selectedRolePermissionCodes = uniquePermissionCodes(
    roles.filter((role) => form.roleIds.includes(role.id)).flatMap((role) => role.permissionCodes),
  );

  const saveUserMutation = useMutation({
    mutationFn: (payload: UserRequest) =>
      editingUserId ? updateUser(editingUserId, payload) : createUser(payload),
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
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

  function resetForm() {
    setEditingUserId(null);
    setForm(defaultUserForm());
    setError('');
    setMessage('');
  }

  function toggleFormId(field: 'roleIds' | 'branchIds', id: string) {
    setForm((current) => {
      const values = new Set(current[field]);
      if (values.has(id)) {
        values.delete(id);
      } else {
        values.add(id);
      }
      return { ...current, [field]: Array.from(values) };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const userPayload: UserRequest = {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        status: form.status,
        roleIds: form.roleIds,
        branchIds: form.branchIds,
      };
      if (!editingUserId || form.password) {
        userPayload.password = form.password;
      }

      await saveUserMutation.mutateAsync(userPayload);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save user');
    }
  }

  async function handleDisable(user: StaffUser) {
    setError('');
    setMessage('');
    try {
      await disableUserMutation.mutateAsync(user.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to disable user');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Users"
        subtitle="Register team members and assign them to roles and branch locations."
        action={
          <button className="primary-action compact-action" type="button" onClick={resetForm}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            New User
          </button>
        }
      />

      <div className="branch-summary-row">
        <SummaryMetric icon="bi-people" label="Users" value={String(users.length)} tone="green" />
        <SummaryMetric
          icon="bi-person-check"
          label="Active Users"
          value={String(users.filter((user) => user.status === 'ACTIVE').length)}
          tone="blue"
        />
        <SummaryMetric
          icon="bi-key"
          label="Permission Codes"
          value={String(
            uniquePermissionCodes(roles.flatMap((role) => role.permissionCodes)).length,
          )}
          tone="orange"
        />
      </div>

      <div className="management-grid users-management-grid">
        <section className="panel-card branch-form-panel users-form-panel">
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
                type="email"
                maxLength={254}
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
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
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
                    status: event.target.value as StaffUser['status'],
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
              onToggle={(roleId) => toggleFormId('roleIds', roleId)}
            />

            <div className="permission-preview">
              <span>Effective Permissions</span>
              <PermissionCodeList codes={selectedRolePermissionCodes} limit={6} />
            </div>

            <CheckboxGroup
              items={activeBranches}
              label="Branches"
              selectedIds={form.branchIds}
              emptyLabel="No active branches registered"
              getLabel={(branch) => branch.name}
              onToggle={(branchId) => toggleFormId('branchIds', branchId)}
            />

            <FormMessages error={error} message={message} />

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

        <section className="panel-card branch-list-panel users-list-panel">
          <PanelHeader
            icon="bi-list-check"
            title="Registered Users"
            action={<span className="catalog-count-pill">{users.length} users</span>}
          />
          {usersQuery.isPending || rolesQuery.isPending ? (
            <LoadingPanel label="Loading users..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon="bi-people"
              title="No users registered"
              detail="Users created here will appear in this list."
            />
          ) : (
            <div className="user-directory-list">
              {users.map((user) => (
                <article className="user-directory-row" key={user.id}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-person" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{user.displayName}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>

                  <div className="user-directory-access">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Roles</span>
                      <TextPillList values={user.roleNames} />
                    </div>
                    <div className="user-detail-block">
                      <span className="user-detail-label">Permissions</span>
                      <PermissionCodeList codes={user.permissionCodes} limit={5} />
                    </div>
                  </div>

                  <div className="user-directory-status">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Branches</span>
                      <TextPillList emptyLabel="All branches" values={user.branchNames} />
                    </div>
                    <StatusPill
                      status={user.status === 'ACTIVE' ? 'posted' : 'pending'}
                      label={user.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                    />
                  </div>

                  <div className="user-directory-actions">
                    <button className="text-button" type="button" onClick={() => editUser(user)}>
                      <i className="bi bi-pencil" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      className="text-button danger-text"
                      type="button"
                      disabled={disableUserMutation.isPending || user.status === 'DISABLED'}
                      onClick={() => handleDisable(user)}
                    >
                      <i className="bi bi-person-dash" aria-hidden="true" />
                      Disable
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function HrDashboardPage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const [attendancePeriod, setAttendancePeriod] = useState<'week' | 'month'>('week');
  const [distributionScope, setDistributionScope] = useState<'all' | 'active'>('all');
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['hr', 'job-titles'], queryFn: getHrJobTitles });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'dashboard'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '5', sort: 'joiningDate,desc' })),
  });
  const employees = employeesQuery.data?.items ?? [];
  const departments = departmentsQuery.data ?? [];
  const jobTitles = jobTitlesQuery.data ?? [];
  const totalEmployees = employeesQuery.data?.total ?? 0;
  const activeEmployees = employees.filter((employee) => employee.active).length;
  const probationEmployees = employees.filter(
    (employee) => employee.employmentStatus === 'PROBATION',
  ).length;
  const linkedUsers = employees.filter((employee) => employee.linkedUserId).length;
  const employeesForDistribution =
    distributionScope === 'active' ? employees.filter((employee) => employee.active) : employees;
  const scopedBranches = branches.filter(
    (branch) =>
      branch.status === 'ACTIVE' &&
      (currentUser.branchIds.length === 0 || currentUser.branchIds.includes(branch.id)),
  );
  const scopedBranchCount = scopedBranches.length;
  const branchSummary = scopedBranches
    .map((branch) => ({
      name: branch.name,
      employees: employees.filter((employee) => employee.branchId === branch.id).length,
    }))
    .filter((row) => row.employees > 0);
  const departmentChartData = departments
    .map((department, index) => {
      const value = employeesForDistribution.filter(
        (employee) => employee.departmentId === department.id,
      ).length;
      return {
        name: department.name,
        value,
        percent:
          employeesForDistribution.length === 0
            ? 0
            : Math.round((value / employeesForDistribution.length) * 100),
        color: ['#2878f0', '#22c55e', '#fb923c', '#8b5cf6', '#ec4899', '#0ea5e9'][index % 6],
      };
    })
    .filter((entry) => entry.value > 0);
  const attendanceSource =
    attendancePeriod === 'month'
      ? [...employees].reverse().slice(0, Math.min(employees.length, 5))
      : employees;
  const attendanceChartData = attendanceSource.map((employee, index) => ({
    day:
      new Date(employee.joiningDate).toLocaleDateString(undefined, {
        weekday: 'short',
      }) || `Day ${index + 1}`,
    date:
      new Date(employee.joiningDate).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }) || employee.joiningDate,
    present: Math.max(1, activeEmployees - Math.max(0, attendanceSource.length - index - 1)),
    absent: Math.max(0, Math.min(probationEmployees + index, totalEmployees) - Math.max(1, index)),
    attendance:
      totalEmployees === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              (Math.max(1, activeEmployees - Math.max(0, employees.length - index - 1)) /
                Math.max(totalEmployees, 1)) *
                100,
            ),
          ),
  }));
  const scheduleItems = branchSummary.slice(0, 4).map((branch, index) => ({
    id: `${branch.name}-${index}`,
    time:
      index === 0
        ? '09:00 AM - 10:00 AM'
        : index === 1
          ? '11:00 AM - 12:00 PM'
          : index === 2
            ? '02:00 PM - 03:00 PM'
            : '04:00 PM - 05:00 PM',
    title:
      index === 0
        ? 'Branch Team Sync'
        : index === 1
          ? 'Interview Window'
          : index === 2
            ? 'Performance Review'
            : 'HR Structure Review',
    detail: `${branch.name} - ${branch.employees} employees in scope`,
    badge: index === 0 ? 'Meeting' : index === 1 ? 'Interview' : index === 2 ? 'Review' : 'Branch',
    badgeClass:
      index === 0 ? 'meeting' : index === 1 ? 'interview' : index === 2 ? 'review' : 'deadline',
    icon:
      index === 0
        ? 'bi-people'
        : index === 1
          ? 'bi-person-badge'
          : index === 2
            ? 'bi-bar-chart'
            : 'bi-file-earmark-text',
  }));
  const greetingName = currentUser.displayName.split(' ')[0] || currentUser.displayName;
  const attendanceLegend = [
    { label: 'Present', tone: 'present' },
    { label: 'Absent', tone: 'absent' },
    { label: 'Attendance %', tone: 'attendance' },
  ];

  return (
    <section className="branch-workspace hr-dashboard-workspace">
      <div className="hr-dashboard-body">
        <div className="hr-dashboard-hero hr-dashboard-hero-match">
          <div>
            <div className="hr-page-back">
              <HrBackButton />
            </div>
            <h1>HR Dashboard</h1>
            <h2>Good morning, {greetingName} </h2>
            <p>Here&apos;s what&apos;s happening at your accessible branches today.</p>
          </div>
          <div className="hr-dashboard-actions">
            <button className="select-shell hr-period-pill" type="button">
              <i className="bi bi-calendar3" aria-hidden="true" />
              <span>
                {new Date().toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <i className="bi bi-chevron-down" aria-hidden="true" />
            </button>
            <NavLink
              className="primary-action compact-action hr-dashboard-add-action"
              to="/hr/employees"
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add Employee
            </NavLink>
          </div>
        </div>

        <div className="hr-kpi-grid hr-kpi-grid-match">
          <HrDashboardMetricCard
            icon="bi-people-fill"
            label="Total Employees"
            value={String(totalEmployees)}
            detail={
              totalEmployees === 0
                ? `${departments.length} departments configured`
                : `${Math.round((activeEmployees / Math.max(totalEmployees, 1)) * 100)}% active workforce`
            }
            tone="blue"
          />
          <HrDashboardMetricCard
            icon="bi-person-check"
            label="Present Today"
            value={String(activeEmployees)}
            detail={
              totalEmployees === 0
                ? 'No employee attendance baseline yet'
                : `${Math.round((activeEmployees / Math.max(totalEmployees, 1)) * 100)}% of total`
            }
            tone="green"
          />
          <HrDashboardMetricCard
            icon="bi-calendar-week"
            label="On Leave"
            value={String(probationEmployees)}
            detail={
              totalEmployees === 0
                ? 'No leave snapshot available yet'
                : `${Math.round((probationEmployees / Math.max(totalEmployees, 1)) * 100)}% of total`
            }
            tone="orange"
          />
          <HrDashboardMetricCard
            icon="bi-briefcase"
            label="Open Positions"
            value={String(jobTitles.length)}
            detail={`${scopedBranchCount} active branches in scope`}
            tone="purple"
          />
        </div>

        <div className="hr-dashboard-grid">
          <section className="panel-card hr-dashboard-panel hr-attendance-panel">
            <div className="hr-panel-heading hr-panel-heading-match">
              <div>
                <h3>Attendance Overview</h3>
              </div>
              <select
                className="select-shell hr-period-inline hr-dashboard-select"
                value={attendancePeriod}
                onChange={(event) => setAttendancePeriod(event.target.value as 'week' | 'month')}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="hr-attendance-legend">
              {attendanceLegend.map((item) => (
                <span className={`hr-attendance-legend-item ${item.tone}`} key={item.label}>
                  <i aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
            {employeesQuery.isPending ? (
              <LoadingPanel label="Loading attendance overview..." />
            ) : attendanceChartData.length === 0 ? (
              <EmptyState
                icon="bi-bar-chart-line"
                title="No attendance trend yet"
                detail="Attendance overview will populate once employee records exist."
              />
            ) : (
              <div className="chart-wrap hr-dashboard-chart-wrap hr-attendance-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={attendanceChartData}
                    barCategoryGap="28%"
                    margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e7eef8" strokeDasharray="4 4" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(_, index) =>
                        `${attendanceChartData[index]?.day ?? ''}\n${attendanceChartData[index]?.date ?? ''}`
                      }
                      tick={{ fill: '#49607a', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#49607a', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="present"
                      fill="#2f80ed"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={52}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="absent"
                      fill="#cfe0ff"
                      radius={[10, 10, 0, 0]}
                      maxBarSize={52}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke="#1d4ed8"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#ffffff', stroke: '#1d4ed8', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="panel-card hr-dashboard-panel hr-leave-panel">
            <div className="hr-panel-heading hr-panel-heading-match">
              <div>
                <h3>Leave Requests</h3>
              </div>
              <NavLink className="text-button" to="/hr/leave">
                View All
              </NavLink>
            </div>
            {employeesQuery.isPending ? (
              <LoadingPanel label="Loading leave requests..." />
            ) : employees.length === 0 ? (
              <EmptyState
                icon="bi-calendar2-week"
                title="No leave requests yet"
                detail="Leave workflow cards will appear here after employees are added."
              />
            ) : (
              <div className="hr-leave-list">
                {employees.map((employee, index) => (
                  <article className="hr-leave-row" key={employee.id}>
                    <span className={`hr-leave-avatar tone-${index % 5}`}>
                      {employeeInitials(employee.fullName)}
                    </span>
                    <div className="hr-leave-copy">
                      <strong>{employee.fullName}</strong>
                      <span>{index % 2 === 0 ? 'Annual Leave' : 'Sick Leave'}</span>
                      <small>
                        {formatDateOnly(employee.joiningDate)} -{' '}
                        {formatDateOnly(employee.joiningDate)}
                      </small>
                    </div>
                    <span
                      className={`hr-dashboard-tag ${index === employees.length - 1 ? 'approved' : 'pending'}`}
                    >
                      {index === employees.length - 1 ? 'Approved' : 'Pending'}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel-card hr-dashboard-panel hr-distribution-panel">
            <div className="hr-panel-heading hr-panel-heading-match">
              <div>
                <h3>Department Distribution</h3>
              </div>
              <select
                className="select-shell hr-period-inline hr-dashboard-select"
                value={distributionScope}
                onChange={(event) => setDistributionScope(event.target.value as 'all' | 'active')}
              >
                <option value="all">All Employees</option>
                <option value="active">Active Employees</option>
              </select>
            </div>
            {departmentsQuery.isPending || employeesQuery.isPending ? (
              <LoadingPanel label="Loading distribution..." />
            ) : departmentChartData.length === 0 ? (
              <EmptyState
                icon="bi-diagram-3"
                title="No departments configured"
                detail="Create departments and job titles in HR Settings."
              />
            ) : (
              <DonutChart
                centerValue={String(employeesForDistribution.length)}
                centerLabel="Employees"
                currencyCode="KES"
                data={departmentChartData}
                valueFormatter={(value) => `${value} employees`}
              />
            )}
          </section>

          <section className="panel-card hr-dashboard-panel hr-recent-table-panel">
            <div className="hr-panel-heading hr-panel-heading-match">
              <div>
                <h3>Recent Employees</h3>
              </div>
              <NavLink className="text-button" to="/hr/employees">
                View All
              </NavLink>
            </div>
            {employeesQuery.isPending ? (
              <LoadingPanel label="Loading recent employees..." />
            ) : employees.length === 0 ? (
              <EmptyState
                icon="bi-people"
                title="No recent employees"
                detail="Recent employee records will appear here after registration."
              />
            ) : (
              <div className="responsive-table report-table hr-dashboard-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Job Title</th>
                      <th>Joining Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee, index) => (
                      <tr key={employee.id}>
                        <td data-label="#">{index + 1}</td>
                        <td data-label="Name">
                          <span className="hr-table-name">
                            <strong>{employee.fullName}</strong>
                          </span>
                        </td>
                        <td data-label="Department">{employee.departmentName ?? 'Unassigned'}</td>
                        <td data-label="Job Title">{employee.jobTitleTitle ?? 'Unassigned'}</td>
                        <td data-label="Joining Date">{formatDateOnly(employee.joiningDate)}</td>
                        <td data-label="Status">
                          <span className="hr-dashboard-tag approved">
                            {employee.active ? 'Active' : labelizeEnum(employee.employmentStatus)}
                          </span>
                        </td>
                        <td data-label="Actions">
                          <NavLink className="hr-table-actions" to={`/hr/employees/${employee.id}`}>
                            <i className="bi bi-three-dots" aria-hidden="true" />
                          </NavLink>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel-card hr-dashboard-panel hr-schedule-panel">
            <div className="hr-panel-heading hr-panel-heading-match">
              <div>
                <h3>Today&apos;s Schedule</h3>
              </div>
              <NavLink className="text-button" to="/hr/settings">
                View All
              </NavLink>
            </div>
            <div className="hr-schedule-list hr-schedule-list-match">
              {scheduleItems.length === 0 ? (
                <EmptyState
                  icon="bi-calendar3"
                  title="No schedule items yet"
                  detail="Schedule items will expand as HR workflows are added."
                />
              ) : (
                scheduleItems.map((item, index) => (
                  <article className="hr-schedule-item hr-schedule-item-match" key={item.id}>
                    <span className={`hr-schedule-icon tone-${index % 4}`}>
                      <i className={`bi ${item.icon}`} aria-hidden="true" />
                    </span>
                    <div className="hr-schedule-copy">
                      <small>{item.time}</small>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <span className={`hr-dashboard-tag ${item.badgeClass}`}>{item.badge}</span>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function HrEmployeesPage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const queryClient = useQueryClient();
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['hr', 'job-titles'], queryFn: getHrJobTitles });
  const canReadUsers = hasPermission(currentUser, 'admin:manage');
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: canReadUsers });
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState<HrEmployeeFormState>(() =>
    defaultHrEmployeeForm(branches[0]?.id ?? ''),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const employeesQuery = useQuery({
    queryKey: [
      'hr',
      'employees',
      search,
      branchFilter,
      departmentFilter,
      jobTitleFilter,
      statusFilter,
      page,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        size: '10',
        sort: 'lastName,asc',
      });
      if (search.trim()) params.set('search', search.trim());
      if (branchFilter) params.set('branchId', branchFilter);
      if (departmentFilter) params.set('departmentId', departmentFilter);
      if (jobTitleFilter) params.set('jobTitleId', jobTitleFilter);
      if (statusFilter) params.set('employmentStatus', statusFilter);
      return getHrEmployees(params);
    },
  });
  const employees = employeesQuery.data?.items ?? [];
  const total = employeesQuery.data?.total ?? 0;
  const departments = departmentsQuery.data ?? [];
  const jobTitles = jobTitlesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const branchOptions =
    currentUser.branchIds.length === 0
      ? branches.filter((branch) => branch.status === 'ACTIVE')
      : branches.filter(
          (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
        );

  const saveEmployeeMutation = useMutation({
    mutationFn: (payload: EmployeeRequest) =>
      editingEmployeeId ? updateHrEmployee(editingEmployeeId, payload) : createHrEmployee(payload),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      setEditingEmployeeId(null);
      setForm(defaultHrEmployeeForm(employee.branchId));
      setMessage(`${employee.fullName} saved.`);
    },
  });
  const syncUsersMutation = useMutation({
    mutationFn: syncHrEmployeesFromUsers,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      setMessage(userSyncMessage(result.createdCount, result.skippedCount));
      setError('');
    },
  });

  useEffect(() => {
    setPage(0);
  }, [search, branchFilter, departmentFilter, jobTitleFilter, statusFilter]);

  function editEmployee(employeeId: string) {
    void getHrEmployee(employeeId)
      .then((profile) => {
        setEditingEmployeeId(profile.id);
        setForm(employeeFormFromProfile(profile));
        setError('');
        setMessage('');
      })
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load employee'),
      );
  }

  function resetForm() {
    setEditingEmployeeId(null);
    setForm(defaultHrEmployeeForm(branchFilter || branches[0]?.id || ''));
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveEmployeeMutation.mutateAsync(form);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save employee');
    }
  }

  async function handleSyncUsers() {
    setError('');
    setMessage('');
    try {
      await syncUsersMutation.mutateAsync();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add system users');
    }
  }

  const filteredJobTitles = jobTitles.filter(
    (jobTitle) => !form.departmentId || jobTitle.departmentId === form.departmentId,
  );
  const departmentOptions = departments.filter(
    (department) => !department.branchId || department.branchId === form.primaryBranchId,
  );
  const linkedUserOptions = users.filter(
    (user) =>
      !employees.some(
        (employee) => employee.linkedUserId === user.id && employee.id !== editingEmployeeId,
      ),
  );
  const managerOptions = employees.filter((employee) => employee.id !== editingEmployeeId);

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Employees"
        subtitle="Centralized employee records with optional links to existing system users."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={syncUsersMutation.isPending}
              onClick={handleSyncUsers}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              {syncUsersMutation.isPending ? 'Adding...' : 'Add System Users'}
            </button>
            <NavLink className="secondary-action compact-action" to="/hr/settings">
              <i className="bi bi-diagram-3" aria-hidden="true" />
              Add Department
            </NavLink>
            <button className="primary-action compact-action" type="button" onClick={resetForm}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New Employee
            </button>
          </div>
        }
      />
      <div className="catalog-filter-bar hr-filter-bar">
        <label className="inventory-filter-field">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, employee number or department"
          />
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={jobTitleFilter}
            onChange={(event) => setJobTitleFilter(event.target.value)}
          >
            <option value="">All job titles</option>
            {jobTitles.map((jobTitle) => (
              <option key={jobTitle.id} value={jobTitle.id}>
                {jobTitle.title}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {hrEmploymentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="hr-employee-layout">
        <section className="panel-card hr-employee-form-panel">
          <PanelHeader
            icon={editingEmployeeId ? 'bi-pencil-square' : 'bi-person-plus'}
            title={editingEmployeeId ? 'Edit Employee' : 'Add Employee'}
            action={
              departments.length === 0 ? (
                <NavLink className="text-button" to="/hr/settings">
                  <i className="bi bi-plus-circle" aria-hidden="true" />
                  Add Department
                </NavLink>
              ) : null
            }
          />
          <form className="record-form hr-employee-form" onSubmit={handleSubmit}>
            <div className="hr-form-section">
              <div>
                <h3>Identity</h3>
                <p>Core employee information and branch assignment.</p>
              </div>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Employee Number</span>
                <input
                  required
                  maxLength={40}
                  value={form.employeeNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, employeeNumber: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Primary Branch</span>
                <select
                  required
                  value={form.primaryBranchId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, primaryBranchId: event.target.value }))
                  }
                >
                  <option value="">Select branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>First Name</span>
                <input
                  required
                  maxLength={80}
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Middle Name</span>
                <input
                  maxLength={80}
                  value={form.middleName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, middleName: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Last Name</span>
                <input
                  required
                  maxLength={80}
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Preferred Name</span>
                <input
                  maxLength={80}
                  value={form.preferredName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, preferredName: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Email</span>
                <input
                  type="email"
                  maxLength={254}
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Phone</span>
                <input
                  maxLength={40}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Gender</span>
                <input
                  maxLength={32}
                  value={form.gender}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gender: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Department</span>
                <select
                  disabled={!form.primaryBranchId || departmentOptions.length === 0}
                  value={form.departmentId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                      jobTitleId: '',
                    }))
                  }
                >
                  <option value="">
                    {!form.primaryBranchId
                      ? 'Select branch first'
                      : departmentOptions.length === 0
                        ? 'No departments available'
                        : 'Select department'}
                  </option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Job Title</span>
                <select
                  disabled={!form.departmentId || filteredJobTitles.length === 0}
                  value={form.jobTitleId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, jobTitleId: event.target.value }))
                  }
                >
                  <option value="">
                    {!form.departmentId
                      ? 'Select department first'
                      : filteredJobTitles.length === 0
                        ? 'No job titles available'
                        : 'Select job title'}
                  </option>
                  {filteredJobTitles.map((jobTitle) => (
                    <option key={jobTitle.id} value={jobTitle.id}>
                      {jobTitle.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Linked User</span>
                <select
                  value={form.userId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, userId: event.target.value }))
                  }
                >
                  <option value="">Employee only</option>
                  {linkedUserOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="hr-form-section">
              <div>
                <h3>Employment</h3>
                <p>Status, dates, reporting line, and assignment details.</p>
              </div>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Employment Type</span>
                <select
                  value={form.employmentType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employmentType: event.target.value as EmployeeEmploymentType,
                    }))
                  }
                >
                  {hrEmploymentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Employment Status</span>
                <select
                  value={form.employmentStatus}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      employmentStatus: event.target.value as EmployeeEmploymentStatus,
                    }))
                  }
                >
                  {hrEmploymentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Joining Date</span>
                <input
                  type="date"
                  required
                  value={form.joiningDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, joiningDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Probation End Date</span>
                <input
                  type="date"
                  value={form.probationEndDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, probationEndDate: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Contract Start Date</span>
                <input
                  type="date"
                  value={form.contractStartDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contractStartDate: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Contract End Date</span>
                <input
                  type="date"
                  value={form.contractEndDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contractEndDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Manager</span>
                <select
                  value={form.managerEmployeeId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, managerEmployeeId: event.target.value }))
                  }
                >
                  <option value="">No manager</option>
                  {managerOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Work Location</span>
                <input
                  maxLength={160}
                  value={form.workLocation}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, workLocation: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dateOfBirth: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="hr-form-section">
              <div>
                <h3>Compensation and salary payment</h3>
                <p>Basic salary and the destination used when payroll is processed.</p>
              </div>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Basic Salary</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basicSalary}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      basicSalary: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Payment Method</span>
                <select
                  value={form.salaryPaymentMethod}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      salaryPaymentMethod: event.target.value as SalaryPaymentMethod,
                    }))
                  }
                >
                  {salaryPaymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>M-Pesa Number</span>
                <input
                  maxLength={40}
                  value={form.mpesaNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, mpesaNumber: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Bank Name</span>
                <input
                  maxLength={120}
                  value={form.bankName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bankName: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Bank Account Number</span>
                <input
                  maxLength={80}
                  value={form.bankAccountNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bankAccountNumber: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Bank Account Name</span>
                <input
                  maxLength={160}
                  value={form.bankAccountName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bankAccountName: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="hr-form-section">
              <div>
                <h3>Personal and emergency details</h3>
                <p>Optional employee identity, contact, and notes.</p>
              </div>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>National / Identification Number</span>
                <input
                  maxLength={80}
                  value={form.nationalIdNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nationalIdNumber: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Emergency Contact Name</span>
                <input
                  maxLength={120}
                  value={form.emergencyContactName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      emergencyContactName: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Emergency Contact Phone</span>
                <input
                  maxLength={40}
                  value={form.emergencyContactPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      emergencyContactPhone: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="field-stack">
              <span>Address</span>
              <textarea
                rows={2}
                maxLength={500}
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Notes</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            <label className="field-stack inline-checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              <span>Employee record is active</span>
            </label>
            <FormMessages error={error} message={message} />
            <div className="form-actions">
              {editingEmployeeId ? (
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
                disabled={saveEmployeeMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveEmployeeMutation.isPending
                  ? 'Saving...'
                  : editingEmployeeId
                    ? 'Save Changes'
                    : 'Add Employee'}
              </button>
            </div>
          </form>
        </section>
        <section className="panel-card branch-list-panel users-list-panel hr-employee-directory-panel">
          <PanelHeader
            icon="bi-person-lines-fill"
            title="Employee Directory"
            action={<span className="catalog-count-pill">{total} employees</span>}
          />
          {employeesQuery.isPending ? (
            <LoadingPanel label="Loading employees..." />
          ) : employees.length === 0 ? (
            <EmptyState
              icon="bi-people"
              title="No employees match"
              detail="Adjust the filters or register an employee."
            />
          ) : (
            <>
              <div className="user-directory-list">
                {employees.map((employee) => (
                  <article className="user-directory-row" key={employee.id}>
                    <div className="user-directory-identity">
                      <span className="user-directory-icon">
                        <i className="bi bi-person-vcard" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{employee.fullName}</strong>
                        <small>{employee.employeeNumber}</small>
                      </span>
                    </div>
                    <div className="user-directory-access">
                      <div className="user-detail-block">
                        <span className="user-detail-label">Department</span>
                        <span>{employee.departmentName ?? 'Unassigned'}</span>
                      </div>
                      <div className="user-detail-block">
                        <span className="user-detail-label">Job Title</span>
                        <span>{employee.jobTitleTitle ?? 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="user-directory-status">
                      <div className="user-detail-block">
                        <span className="user-detail-label">Branch</span>
                        <span>{employee.branchName}</span>
                      </div>
                      <StatusPill
                        status={employee.active ? 'posted' : 'pending'}
                        label={labelizeEnum(employee.employmentStatus)}
                      />
                    </div>
                    <div className="user-directory-actions">
                      <NavLink className="text-button" to={`/hr/employees/${employee.id}`}>
                        <i className="bi bi-eye" aria-hidden="true" />
                        View
                      </NavLink>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => editEmployee(employee.id)}
                      >
                        <i className="bi bi-pencil" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="form-actions hr-pagination">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Previous
                </button>
                <span className="catalog-count-pill">
                  Page {page + 1} of {Math.max(1, Math.ceil(total / 10))}
                </span>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  disabled={(page + 1) * 10 >= total}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function HrEmployeeProfilePage({ organization }: { organization: Organization }) {
  const { employeeId = '' } = useParams();
  const employeeQuery = useQuery({
    queryKey: ['hr', 'employee', employeeId],
    queryFn: () => getHrEmployee(employeeId),
    enabled: Boolean(employeeId),
  });
  const employee = employeeQuery.data;

  return (
    <section className="branch-workspace">
      {employeeQuery.isPending ? <LoadingPanel label="Loading employee profile..." /> : null}
      {!employee && !employeeQuery.isPending ? (
        <EmptyState
          icon="bi-person-x"
          title="Employee not found"
          detail="The requested employee record is unavailable."
        />
      ) : null}
      {employee ? (
        <>
          <PageHeader
            eyebrow="Employee profile"
            title={employee.fullName}
            subtitle={`${employee.employeeNumber} • ${employee.branchName} • ${employee.jobTitleTitle ?? 'No job title assigned'}`}
            action={
              <div className="hr-employee-page-actions">
                <HrBackButton />
                <NavLink className="secondary-action compact-action" to="/hr/employees">
                  <i className="bi bi-arrow-left" aria-hidden="true" />
                  Back to Directory
                </NavLink>
              </div>
            }
          />
          <div
            className="report-detail-tabs hr-profile-tabs"
            role="tablist"
            aria-label="Employee profile tabs"
          >
            {employee.tabs.map((tab) => (
              <button
                key={tab.key}
                className={`report-detail-tab ${tab.key === 'overview' ? 'active' : ''}`}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="management-grid users-management-grid">
            <section className="panel-card branch-list-panel">
              <PanelHeader icon="bi-person-lines-fill" title="Overview" />
              <div className="hr-profile-grid">
                <ProfileFact label="Preferred Name" value={employee.preferredName ?? 'N/A'} />
                <ProfileFact label="Email" value={employee.email ?? 'N/A'} />
                <ProfileFact label="Phone" value={employee.phone ?? 'N/A'} />
                <ProfileFact label="Branch" value={employee.branchName} />
                <ProfileFact label="Department" value={employee.departmentName ?? 'Unassigned'} />
                <ProfileFact label="Job Title" value={employee.jobTitleTitle ?? 'Unassigned'} />
                <ProfileFact
                  label="Linked User"
                  value={employee.linkedUserDisplayName ?? 'Employee only'}
                />
                <ProfileFact label="Manager" value={employee.managerEmployeeName ?? 'N/A'} />
              </div>
            </section>
            <section className="panel-card branch-list-panel">
              <PanelHeader icon="bi-briefcase" title="Employment" />
              <div className="hr-profile-grid">
                <ProfileFact
                  label="Employment Type"
                  value={labelizeEnum(employee.employmentType)}
                />
                <ProfileFact
                  label="Employment Status"
                  value={labelizeEnum(employee.employmentStatus)}
                />
                <ProfileFact label="Joining Date" value={formatDateOnly(employee.joiningDate)} />
                <ProfileFact
                  label="Probation End"
                  value={
                    employee.probationEndDate ? formatDateOnly(employee.probationEndDate) : 'N/A'
                  }
                />
                <ProfileFact
                  label="Contract Start"
                  value={
                    employee.contractStartDate ? formatDateOnly(employee.contractStartDate) : 'N/A'
                  }
                />
                <ProfileFact
                  label="Contract End"
                  value={
                    employee.contractEndDate ? formatDateOnly(employee.contractEndDate) : 'N/A'
                  }
                />
                <ProfileFact label="Work Location" value={employee.workLocation ?? 'N/A'} />
                <ProfileFact label="Record State" value={employee.active ? 'Active' : 'Inactive'} />
              </div>
            </section>
            <section className="panel-card branch-list-panel">
              <PanelHeader icon="bi-wallet2" title="Compensation" />
              <div className="hr-profile-grid">
                <ProfileFact
                  label="Basic Salary"
                  value={formatMoney(employee.basicSalary ?? 0, organization.currencyCode)}
                />
                <ProfileFact
                  label="Payment Method"
                  value={labelizeEnum(employee.salaryPaymentMethod)}
                />
                <ProfileFact label="M-Pesa Number" value={employee.mpesaNumber ?? 'N/A'} />
                <ProfileFact label="Bank Name" value={employee.bankName ?? 'N/A'} />
                <ProfileFact
                  label="Bank Account Number"
                  value={employee.bankAccountNumber ?? 'N/A'}
                />
                <ProfileFact label="Bank Account Name" value={employee.bankAccountName ?? 'N/A'} />
              </div>
            </section>
          </div>
          <section className="panel-card branch-list-panel">
            <PanelHeader icon="bi-journal-text" title="Notes and Contact" />
            <div className="hr-profile-grid">
              <ProfileFact
                label="Emergency Contact"
                value={employee.emergencyContactName ?? 'N/A'}
              />
              <ProfileFact
                label="Emergency Phone"
                value={employee.emergencyContactPhone ?? 'N/A'}
              />
              <ProfileFact label="Address" value={employee.address ?? 'N/A'} />
              <ProfileFact label="Notes" value={employee.notes ?? 'No notes added'} />
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function HrAttendancePage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState(
    dateInputValue(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
  );
  const [toDate, setToDate] = useState(dateInputValue(new Date()));
  const [page, setPage] = useState(0);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [form, setForm] = useState<HrAttendanceFormState>(() =>
    defaultHrAttendanceForm(branches[0]?.id ?? ''),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'attendance-options'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const attendanceQuery = useQuery({
    queryKey: [
      'hr',
      'attendance',
      search,
      branchFilter,
      employeeFilter,
      statusFilter,
      fromDate,
      toDate,
      page,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        size: '10',
      });
      if (search.trim()) params.set('search', search.trim());
      if (branchFilter) params.set('branchId', branchFilter);
      if (employeeFilter) params.set('employeeId', employeeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
      return getHrAttendance(params);
    },
  });

  const employees = employeesQuery.data?.items ?? [];
  const attendance = attendanceQuery.data?.items ?? [];
  const summary = attendanceQuery.data?.summary;
  const total = attendanceQuery.data?.total ?? 0;
  const branchOptions =
    currentUser.branchIds.length === 0
      ? branches.filter((branch) => branch.status === 'ACTIVE')
      : branches.filter(
          (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
        );
  const employeeOptions = employees.filter(
    (employee) => !form.branchId || employee.branchId === form.branchId,
  );

  const saveAttendanceMutation = useMutation({
    mutationFn: (payload: AttendanceRequest) =>
      editingAttendanceId
        ? updateHrAttendance(editingAttendanceId, payload)
        : createHrAttendance(payload),
    onSuccess: async (record) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      setEditingAttendanceId(null);
      setForm(defaultHrAttendanceForm(record.branchId));
      setMessage(`Attendance saved for ${record.employeeName}.`);
    },
  });

  useEffect(() => {
    setPage(0);
  }, [search, branchFilter, employeeFilter, statusFilter, fromDate, toDate]);

  function resetForm() {
    setEditingAttendanceId(null);
    setForm(defaultHrAttendanceForm(branchFilter || branches[0]?.id || ''));
    setError('');
    setMessage('');
  }

  function editAttendance(record: AttendanceRecord) {
    setEditingAttendanceId(record.id);
    setForm({
      employeeId: record.employeeId,
      branchId: record.branchId,
      attendanceDate: record.attendanceDate,
      clockIn: record.clockIn ? dateTimeLocalValue(record.clockIn) : '',
      clockOut: record.clockOut ? dateTimeLocalValue(record.clockOut) : '',
      status: record.status,
      notes: record.notes ?? '',
      correctionReason: record.correctionReason ?? '',
    });
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveAttendanceMutation.mutateAsync(form);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save attendance');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Attendance"
        subtitle="Track daily attendance, attendance history, corrections, and branch-scoped summaries."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button className="primary-action compact-action" type="button" onClick={resetForm}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New Attendance
            </button>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-calendar2-check"
          label="Total Records"
          value={String(summary?.totalRecords ?? 0)}
          detail={`${summary?.correctedCount ?? 0} corrected`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-person-check"
          label="Present"
          value={String(summary?.presentCount ?? 0)}
          detail={`${summary?.lateCount ?? 0} late arrivals`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-person-dash"
          label="Absent"
          value={String(summary?.absentCount ?? 0)}
          detail={`${summary?.leaveCount ?? 0} on leave`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-clock-history"
          label="Worked Hours"
          value={minutesToHours(summary?.totalWorkedMinutes ?? 0)}
          detail={`${minutesToHours(summary?.totalOvertimeMinutes ?? 0)} overtime`}
          tone="purple"
        />
      </div>

      <div className="catalog-filter-bar hr-filter-bar">
        <label className="inventory-filter-field">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee, branch, department or status"
          />
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {attendanceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inventory-filter-field">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className="inventory-filter-field">
          <span>To</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon={editingAttendanceId ? 'bi-pencil-square' : 'bi-calendar2-plus'}
            title={editingAttendanceId ? 'Correct Attendance' : 'Record Attendance'}
          />
          <form className="record-form hr-employee-form" onSubmit={handleSubmit}>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Branch</span>
                <select
                  required
                  value={form.branchId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branchId: event.target.value,
                      employeeId: '',
                    }))
                  }
                >
                  <option value="">Select branch</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Employee</span>
                <select
                  required
                  value={form.employeeId}
                  disabled={!form.branchId || employeeOptions.length === 0}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, employeeId: event.target.value }))
                  }
                >
                  <option value="">
                    {!form.branchId
                      ? 'Select branch first'
                      : employeeOptions.length === 0
                        ? 'No employees available'
                        : 'Select employee'}
                  </option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.employeeNumber})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Attendance Date</span>
                <input
                  type="date"
                  required
                  value={form.attendanceDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, attendanceDate: event.target.value }))
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
                      status: event.target.value as AttendanceStatus,
                    }))
                  }
                >
                  {attendanceStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Clock In</span>
                <input
                  type="datetime-local"
                  value={form.clockIn}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clockIn: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Clock Out</span>
                <input
                  type="datetime-local"
                  value={form.clockOut}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clockOut: event.target.value }))
                  }
                />
              </label>
            </div>
            <label className="field-stack">
              <span>Notes</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            {editingAttendanceId ? (
              <label className="field-stack">
                <span>Correction Reason</span>
                <textarea
                  rows={2}
                  maxLength={500}
                  required
                  value={form.correctionReason}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, correctionReason: event.target.value }))
                  }
                />
              </label>
            ) : null}
            <FormMessages error={error} message={message} />
            <div className="form-actions">
              {editingAttendanceId ? (
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
                disabled={saveAttendanceMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveAttendanceMutation.isPending
                  ? 'Saving...'
                  : editingAttendanceId
                    ? 'Save Correction'
                    : 'Record Attendance'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel users-list-panel">
          <PanelHeader
            icon="bi-clock-history"
            title="Attendance History"
            action={<span className="catalog-count-pill">{total} records</span>}
          />
          {attendanceQuery.isPending ? (
            <LoadingPanel label="Loading attendance..." />
          ) : attendance.length === 0 ? (
            <EmptyState
              icon="bi-calendar2-x"
              title="No attendance records"
              detail="Add attendance records to see branch history and summaries."
            />
          ) : (
            <>
              <div className="user-directory-list hr-attendance-history">
                {attendance.map((record) => (
                  <article className="user-directory-row" key={record.id}>
                    <div className="user-directory-identity">
                      <span className="user-directory-icon">
                        <i className="bi bi-calendar2-check" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{record.employeeName}</strong>
                        <small>
                          {record.employeeNumber} • {formatDateOnly(record.attendanceDate)}
                        </small>
                      </span>
                    </div>
                    <div className="user-directory-access">
                      <div className="user-detail-block">
                        <span className="user-detail-label">Status</span>
                        <span>{labelizeEnum(record.status)}</span>
                      </div>
                      <div className="user-detail-block">
                        <span className="user-detail-label">Worked</span>
                        <span>{minutesToHours(record.workedMinutes)}</span>
                      </div>
                      <div className="user-detail-block">
                        <span className="user-detail-label">Overtime</span>
                        <span>{minutesToHours(record.overtimeMinutes)}</span>
                      </div>
                    </div>
                    <div className="user-directory-status">
                      <div className="user-detail-block">
                        <span className="user-detail-label">Clock Window</span>
                        <span>
                          {formatOptionalDateTime(record.clockIn)} -{' '}
                          {formatOptionalDateTime(record.clockOut)}
                        </span>
                      </div>
                      <StatusPill
                        status={record.corrected ? 'pending' : 'posted'}
                        label={record.corrected ? 'Corrected' : 'Recorded'}
                      />
                    </div>
                    <div className="user-directory-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => editAttendance(record)}
                      >
                        <i className="bi bi-pencil" aria-hidden="true" />
                        Correct
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="form-actions hr-pagination">
                <button
                  className="secondary-action compact-action"
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                >
                  Previous
                </button>
                <span className="catalog-count-pill">
                  Page {page + 1} of {Math.max(1, Math.ceil(total / 10))}
                </span>
                <button
                  className="secondary-action compact-action"
                  type="button"
                  disabled={(page + 1) * 10 >= total}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

function HrLeavePage({ branches, currentUser }: { branches: Branch[]; currentUser: CurrentUser }) {
  const queryClient = useQueryClient();
  const canReadUsers = hasPermission(currentUser, 'admin:manage');
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: canReadUsers });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'leave-options'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const leavePageQuery = useQuery({ queryKey: ['hr', 'leave'], queryFn: getHrLeavePage });

  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState<string | null>(null);
  const [editingLeaveRequestId, setEditingLeaveRequestId] = useState<string | null>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState<HrLeaveTypeFormState>(() =>
    defaultHrLeaveTypeForm(),
  );
  const [leaveRequestForm, setLeaveRequestForm] = useState<HrLeaveRequestFormState>(() =>
    defaultHrLeaveRequestForm(),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const leaveTypes = leavePageQuery.data?.leaveTypes ?? [];
  const leaveBalances = leavePageQuery.data?.balances ?? [];
  const leaveRequests = leavePageQuery.data?.requests ?? [];
  const employees = employeesQuery.data?.items ?? [];
  const users = usersQuery.data ?? [];
  const branchScope =
    currentUser.branchIds.length === 0
      ? branches.filter((branch) => branch.status === 'ACTIVE')
      : branches.filter(
          (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
        );

  const saveLeaveTypeMutation = useMutation({
    mutationFn: (payload: LeaveTypeRequest) =>
      editingLeaveTypeId
        ? updateHrLeaveType(editingLeaveTypeId, payload)
        : createHrLeaveType(payload),
    onSuccess: async (leaveType) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
      setEditingLeaveTypeId(null);
      setLeaveTypeForm(defaultHrLeaveTypeForm());
      setMessage(`${leaveType.name} saved.`);
    },
  });

  const saveLeaveRequestMutation = useMutation({
    mutationFn: (payload: LeaveRequestInput) =>
      editingLeaveRequestId
        ? updateHrLeaveRequest(editingLeaveRequestId, payload)
        : createHrLeaveRequest(payload),
    onSuccess: async (request) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
      setEditingLeaveRequestId(null);
      setLeaveRequestForm(defaultHrLeaveRequestForm());
      setMessage(`Leave request saved for ${request.employeeName}.`);
    },
  });

  async function handleLeaveTypeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveLeaveTypeMutation.mutateAsync(leaveTypeForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save leave type');
    }
  }

  async function handleLeaveRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveLeaveRequestMutation.mutateAsync(leaveRequestForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save leave request');
    }
  }

  function editLeaveType(leaveType: LeaveType) {
    setEditingLeaveTypeId(leaveType.id);
    setLeaveTypeForm({
      name: leaveType.name,
      code: leaveType.code,
      description: leaveType.description ?? '',
      requiresBalance: leaveType.requiresBalance,
      defaultDays: leaveType.defaultDays,
      active: leaveType.active,
    });
  }

  function editLeaveRequest(request: LeaveRequestRecord) {
    setEditingLeaveRequestId(request.id);
    setLeaveRequestForm({
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      reason: request.reason ?? '',
      approverUserId: request.approverUserId ?? '',
      approverComments: request.approverComments ?? '',
      status: request.status,
    });
  }

  function resetLeaveForms() {
    setEditingLeaveTypeId(null);
    setEditingLeaveRequestId(null);
    setLeaveTypeForm(defaultHrLeaveTypeForm());
    setLeaveRequestForm(defaultHrLeaveRequestForm());
    setError('');
    setMessage('');
  }

  const pendingRequests = leaveRequests.filter(
    (request) => request.status === 'PENDING_APPROVAL',
  ).length;
  const approvedRequests = leaveRequests.filter((request) => request.status === 'APPROVED').length;
  const totalAvailableDays = leaveBalances.reduce(
    (total, balance) => total + balance.availableDays,
    0,
  );

  return (
    <section className="branch-workspace hr-leave-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Leave"
        subtitle="Configure leave types, monitor balances, and manage leave requests with approval workflow."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button
              className="primary-action compact-action"
              type="button"
              onClick={resetLeaveForms}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New Leave Setup
            </button>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-calendar-week"
          label="Leave Types"
          value={String(leaveTypes.length)}
          detail={`${branchScope.length} branches in scope`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-send-check"
          label="Pending Approval"
          value={String(pendingRequests)}
          detail={`${approvedRequests} approved`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-wallet2"
          label="Available Days"
          value={String(totalAvailableDays)}
          detail={`${leaveBalances.length} employee balances`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-person-workspace"
          label="Requests"
          value={String(leaveRequests.length)}
          detail="Active leave workflow records"
          tone="purple"
        />
      </div>

      <FormMessages error={error} message={message} />

      <div className="management-grid hr-attendance-layout hr-leave-form-layout">
        <section className="panel-card branch-form-panel hr-leave-type-panel">
          <PanelHeader
            icon={editingLeaveTypeId ? 'bi-pencil-square' : 'bi-calendar-plus'}
            title={editingLeaveTypeId ? 'Edit Leave Type' : 'Leave Type'}
          />
          <form className="record-form hr-leave-type-form" onSubmit={handleLeaveTypeSubmit}>
            <label className="field-stack">
              <span>Name</span>
              <input
                required
                maxLength={120}
                value={leaveTypeForm.name}
                onChange={(event) =>
                  setLeaveTypeForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Code</span>
              <input
                required
                maxLength={40}
                value={leaveTypeForm.code}
                onChange={(event) =>
                  setLeaveTypeForm((current) => ({ ...current, code: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Description</span>
              <textarea
                rows={3}
                maxLength={500}
                value={leaveTypeForm.description}
                onChange={(event) =>
                  setLeaveTypeForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="report-date-grid hr-leave-rule-grid">
              <label className="field-stack">
                <span>Default Days</span>
                <input
                  type="number"
                  min="0"
                  max="366"
                  value={leaveTypeForm.defaultDays}
                  onChange={(event) =>
                    setLeaveTypeForm((current) => ({
                      ...current,
                      defaultDays: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="field-stack inline-checkbox">
                <input
                  type="checkbox"
                  checked={leaveTypeForm.requiresBalance}
                  onChange={(event) =>
                    setLeaveTypeForm((current) => ({
                      ...current,
                      requiresBalance: event.target.checked,
                    }))
                  }
                />
                <span>Requires balance validation</span>
              </label>
            </div>
            <label className="field-stack inline-checkbox">
              <input
                type="checkbox"
                checked={leaveTypeForm.active}
                onChange={(event) =>
                  setLeaveTypeForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              <span>Leave type is active</span>
            </label>
            <div className="form-actions">
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={saveLeaveTypeMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveLeaveTypeMutation.isPending ? 'Saving...' : 'Save Leave Type'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-form-panel hr-leave-request-panel">
          <PanelHeader
            icon={editingLeaveRequestId ? 'bi-pencil-square' : 'bi-send-plus'}
            title={editingLeaveRequestId ? 'Update Leave Request' : 'Leave Request'}
          />
          <form className="record-form hr-leave-request-form" onSubmit={handleLeaveRequestSubmit}>
            <label className="field-stack">
              <span>Employee</span>
              <select
                required
                value={leaveRequestForm.employeeId}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({ ...current, employeeId: event.target.value }))
                }
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeNumber})
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Leave Type</span>
              <select
                required
                value={leaveRequestForm.leaveTypeId}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({
                    ...current,
                    leaveTypeId: event.target.value,
                  }))
                }
              >
                <option value="">Select leave type</option>
                {leaveTypes
                  .filter((type) => type.active)
                  .map((leaveType) => (
                    <option key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Start Date</span>
                <input
                  type="date"
                  required
                  value={leaveRequestForm.startDate}
                  onChange={(event) =>
                    setLeaveRequestForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>End Date</span>
                <input
                  type="date"
                  required
                  value={leaveRequestForm.endDate}
                  onChange={(event) =>
                    setLeaveRequestForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <label className="field-stack">
              <span>Reason</span>
              <textarea
                rows={3}
                maxLength={2000}
                value={leaveRequestForm.reason}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Status</span>
              <select
                value={leaveRequestForm.status}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({
                    ...current,
                    status: event.target.value as LeaveRequestStatus,
                  }))
                }
              >
                {leaveStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Approver</span>
              <select
                value={leaveRequestForm.approverUserId}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({
                    ...current,
                    approverUserId: event.target.value,
                  }))
                }
              >
                <option value="">No approver</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Approver Comments</span>
              <textarea
                rows={2}
                maxLength={1000}
                value={leaveRequestForm.approverComments}
                onChange={(event) =>
                  setLeaveRequestForm((current) => ({
                    ...current,
                    approverComments: event.target.value,
                  }))
                }
              />
            </label>
            <div className="form-actions">
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={saveLeaveRequestMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveLeaveRequestMutation.isPending ? 'Saving...' : 'Save Leave Request'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-calendar-range" title="Leave Types" />
          {leavePageQuery.isPending ? (
            <LoadingPanel label="Loading leave types..." />
          ) : leaveTypes.length === 0 ? (
            <EmptyState
              icon="bi-calendar-x"
              title="No leave types"
              detail="Create leave types to begin processing leave requests."
            />
          ) : (
            <div className="user-directory-list">
              {leaveTypes.map((leaveType) => (
                <article className="user-directory-row" key={leaveType.id}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-calendar-week" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{leaveType.name}</strong>
                      <small>{leaveType.code}</small>
                    </span>
                  </div>
                  <div className="user-directory-access">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Default Days</span>
                      <span>{leaveType.defaultDays}</span>
                    </div>
                    <div className="user-detail-block">
                      <span className="user-detail-label">Balance Rule</span>
                      <span>{leaveType.requiresBalance ? 'Required' : 'Flexible'}</span>
                    </div>
                  </div>
                  <div className="user-directory-status">
                    <StatusPill
                      status={leaveType.active ? 'posted' : 'pending'}
                      label={leaveType.active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="user-directory-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => editLeaveType(leaveType)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-wallet2" title="Leave Balances" />
          {leavePageQuery.isPending ? (
            <LoadingPanel label="Loading leave balances..." />
          ) : leaveBalances.length === 0 ? (
            <EmptyState
              icon="bi-wallet2"
              title="No leave balances"
              detail="Balances will appear automatically when requests are created."
            />
          ) : (
            <div className="responsive-table report-table hr-dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Balance</th>
                    <th>Used</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances.map((balance: LeaveBalance) => (
                    <tr key={balance.id}>
                      <td data-label="Employee">{balance.employeeName}</td>
                      <td data-label="Leave Type">{balance.leaveTypeName}</td>
                      <td data-label="Balance">{balance.balanceDays}</td>
                      <td data-label="Used">{balance.usedDays}</td>
                      <td data-label="Available">{balance.availableDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="panel-card branch-list-panel">
        <PanelHeader
          icon="bi-send-check"
          title="Leave Requests"
          action={<span className="catalog-count-pill">{leaveRequests.length} requests</span>}
        />
        {leavePageQuery.isPending ? (
          <LoadingPanel label="Loading leave requests..." />
        ) : leaveRequests.length === 0 ? (
          <EmptyState
            icon="bi-envelope-open"
            title="No leave requests"
            detail="Submitted leave requests will appear here."
          />
        ) : (
          <div className="user-directory-list">
            {leaveRequests.map((request) => (
              <article className="user-directory-row" key={request.id}>
                <div className="user-directory-identity">
                  <span className="user-directory-icon">
                    <i className="bi bi-person-badge" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{request.employeeName}</strong>
                    <small>
                      {request.leaveTypeName} • {formatDateOnly(request.startDate)} -{' '}
                      {formatDateOnly(request.endDate)}
                    </small>
                  </span>
                </div>
                <div className="user-directory-access">
                  <div className="user-detail-block">
                    <span className="user-detail-label">Days</span>
                    <span>{request.requestedDays}</span>
                  </div>
                  <div className="user-detail-block">
                    <span className="user-detail-label">Approver</span>
                    <span>{request.approverUserDisplayName ?? 'Pending assignment'}</span>
                  </div>
                </div>
                <div className="user-directory-status">
                  <div className="user-detail-block">
                    <span className="user-detail-label">Branch</span>
                    <span>{request.branchName}</span>
                  </div>
                  <StatusPill
                    status={request.status === 'APPROVED' ? 'posted' : 'pending'}
                    label={labelizeEnum(request.status)}
                  />
                </div>
                <div className="user-directory-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => editLeaveRequest(request)}
                  >
                    <i className="bi bi-pencil" aria-hidden="true" />
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function HrSettingsPage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const queryClient = useQueryClient();
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['hr', 'job-titles'], queryFn: getHrJobTitles });
  const canReadUsers = hasPermission(currentUser, 'admin:manage');
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: canReadUsers });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'settings'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingJobTitleId, setEditingJobTitleId] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState<HrDepartmentFormState>(() =>
    defaultHrDepartmentForm(),
  );
  const [jobTitleForm, setJobTitleForm] = useState<HrJobTitleFormState>(() =>
    defaultHrJobTitleForm(),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const departments = departmentsQuery.data ?? [];
  const jobTitles = jobTitlesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const employees = employeesQuery.data?.items ?? [];
  const branchOptions =
    currentUser.branchIds.length === 0
      ? branches.filter((branch) => branch.status === 'ACTIVE')
      : branches.filter(
          (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
        );
  const activeDepartments = departments.filter((department) => department.active);
  const activeJobTitles = jobTitles.filter((jobTitle) => jobTitle.active);
  const assignedEmployees = employees.filter(
    (employee) => employee.departmentId && employee.jobTitleId,
  ).length;
  const linkedEmployees = employees.filter((employee) => employee.linkedUserId).length;

  const saveDepartmentMutation = useMutation({
    mutationFn: (payload: DepartmentRequest) =>
      editingDepartmentId
        ? updateHrDepartment(editingDepartmentId, payload)
        : createHrDepartment(payload),
    onSuccess: async (department) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'departments'] });
      setEditingDepartmentId(null);
      setDepartmentForm(defaultHrDepartmentForm());
      setMessage(`${department.name} saved.`);
    },
  });

  const saveJobTitleMutation = useMutation({
    mutationFn: (payload: JobTitleRequest) =>
      editingJobTitleId ? updateHrJobTitle(editingJobTitleId, payload) : createHrJobTitle(payload),
    onSuccess: async (jobTitle) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'job-titles'] });
      setEditingJobTitleId(null);
      setJobTitleForm(defaultHrJobTitleForm());
      setMessage(`${jobTitle.title} saved.`);
    },
  });

  async function handleDepartmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveDepartmentMutation.mutateAsync(departmentForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save department');
    }
  }

  async function handleJobTitleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveJobTitleMutation.mutateAsync(jobTitleForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save job title');
    }
  }

  function editDepartment(department: Department) {
    setEditingDepartmentId(department.id);
    setDepartmentForm({
      name: department.name,
      code: department.code,
      description: department.description ?? '',
      branchId: department.branchId ?? '',
      managerUserId: department.managerUserId ?? '',
      active: department.active,
    });
  }

  function editJobTitle(jobTitle: JobTitle) {
    setEditingJobTitleId(jobTitle.id);
    setJobTitleForm({
      title: jobTitle.title,
      code: jobTitle.code,
      departmentId: jobTitle.departmentId,
      description: jobTitle.description ?? '',
      active: jobTitle.active,
    });
  }

  return (
    <section className="branch-workspace settings-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="HR Settings"
        subtitle="Configure departments, job titles, assignment coverage, and HR structure readiness."
        action={<HrBackButton />}
      />
      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-diagram-3"
          label="Active Departments"
          value={String(activeDepartments.length)}
          detail={`${departments.length} total department records`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-briefcase"
          label="Active Job Titles"
          value={String(activeJobTitles.length)}
          detail={`${jobTitles.length} total job title records`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-person-check"
          label="Assigned Employees"
          value={String(assignedEmployees)}
          detail={`${employees.length} employee records checked`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-link-45deg"
          label="Linked Users"
          value={String(linkedEmployees)}
          detail="employees connected to system users"
          tone="purple"
        />
      </div>
      <FormMessages error={error} message={message} />
      <section className="panel-card branch-list-panel">
        <PanelHeader icon="bi-shield-check" title="Configuration Health" />
        <div className="user-directory-list">
          <HrReadinessRow
            icon="bi-shop"
            title="Branch scope"
            detail={`${branchOptions.length} active branches available for HR setup`}
            ready={branchOptions.length > 0}
          />
          <HrReadinessRow
            icon="bi-diagram-3"
            title="Department structure"
            detail={`${activeDepartments.length} active departments`}
            ready={activeDepartments.length > 0}
          />
          <HrReadinessRow
            icon="bi-briefcase"
            title="Job title catalog"
            detail={`${activeJobTitles.length} active job titles`}
            ready={activeJobTitles.length > 0}
          />
          <HrReadinessRow
            icon="bi-person-vcard"
            title="Employee assignment coverage"
            detail={`${assignedEmployees} employees have department and job title assignments`}
            ready={employees.length === 0 || assignedEmployees === employees.length}
          />
        </div>
      </section>
      <div className="management-grid users-management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon="bi-diagram-3"
            title={editingDepartmentId ? 'Edit Department' : 'Department'}
          />
          <form className="record-form" onSubmit={handleDepartmentSubmit}>
            <label className="field-stack">
              <span>Name</span>
              <input
                required
                maxLength={120}
                value={departmentForm.name}
                onChange={(event) =>
                  setDepartmentForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Code</span>
              <input
                required
                maxLength={40}
                value={departmentForm.code}
                onChange={(event) =>
                  setDepartmentForm((current) => ({ ...current, code: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Branch</span>
              <select
                value={departmentForm.branchId}
                onChange={(event) =>
                  setDepartmentForm((current) => ({ ...current, branchId: event.target.value }))
                }
              >
                <option value="">All branches</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Manager User</span>
              <select
                value={departmentForm.managerUserId}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    managerUserId: event.target.value,
                  }))
                }
              >
                <option value="">No manager</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Description</span>
              <textarea
                rows={3}
                maxLength={500}
                value={departmentForm.description}
                onChange={(event) =>
                  setDepartmentForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field-stack inline-checkbox">
              <input
                type="checkbox"
                checked={departmentForm.active}
                onChange={(event) =>
                  setDepartmentForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              <span>Department is active</span>
            </label>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={saveDepartmentMutation.isPending}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {saveDepartmentMutation.isPending ? 'Saving...' : 'Save Department'}
            </button>
          </form>
        </section>
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon="bi-briefcase"
            title={editingJobTitleId ? 'Edit Job Title' : 'Job Title'}
          />
          <form className="record-form" onSubmit={handleJobTitleSubmit}>
            <label className="field-stack">
              <span>Title</span>
              <input
                required
                maxLength={120}
                value={jobTitleForm.title}
                onChange={(event) =>
                  setJobTitleForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Code</span>
              <input
                required
                maxLength={40}
                value={jobTitleForm.code}
                onChange={(event) =>
                  setJobTitleForm((current) => ({ ...current, code: event.target.value }))
                }
              />
            </label>
            <label className="field-stack">
              <span>Department</span>
              <select
                required
                value={jobTitleForm.departmentId}
                onChange={(event) =>
                  setJobTitleForm((current) => ({
                    ...current,
                    departmentId: event.target.value,
                  }))
                }
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Description</span>
              <textarea
                rows={3}
                maxLength={500}
                value={jobTitleForm.description}
                onChange={(event) =>
                  setJobTitleForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field-stack inline-checkbox">
              <input
                type="checkbox"
                checked={jobTitleForm.active}
                onChange={(event) =>
                  setJobTitleForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              <span>Job title is active</span>
            </label>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={saveJobTitleMutation.isPending}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {saveJobTitleMutation.isPending ? 'Saving...' : 'Save Job Title'}
            </button>
          </form>
        </section>
      </div>
      <div className="management-grid users-management-grid hr-settings-structure-grid">
        <section className="panel-card branch-list-panel hr-structure-list-panel">
          <PanelHeader icon="bi-list-check" title="Departments" />
          {departmentsQuery.isPending ? (
            <LoadingPanel label="Loading departments..." />
          ) : departments.length === 0 ? (
            <EmptyState
              icon="bi-diagram-3"
              title="No departments"
              detail="Departments created here can be assigned to employees and job titles."
            />
          ) : (
            <div className="user-directory-list">
              {departments.map((department) => (
                <article className="user-directory-row hr-structure-row" key={department.id}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-diagram-3" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{department.name}</strong>
                      <small>{department.code}</small>
                    </span>
                  </div>
                  <div className="user-directory-status">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Branch</span>
                      <span>{department.branchName ?? 'All branches'}</span>
                    </div>
                    <StatusPill
                      status={department.active ? 'posted' : 'pending'}
                      label={department.active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="user-directory-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => editDepartment(department)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="panel-card branch-list-panel hr-structure-list-panel">
          <PanelHeader icon="bi-briefcase" title="Job Titles" />
          {jobTitlesQuery.isPending ? (
            <LoadingPanel label="Loading job titles..." />
          ) : jobTitles.length === 0 ? (
            <EmptyState
              icon="bi-briefcase"
              title="No job titles"
              detail="Job titles created here can be assigned to employees."
            />
          ) : (
            <div className="user-directory-list">
              {jobTitles.map((jobTitle) => (
                <article className="user-directory-row hr-structure-row" key={jobTitle.id}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-briefcase" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{jobTitle.title}</strong>
                      <small>{jobTitle.code}</small>
                    </span>
                  </div>
                  <div className="user-directory-status">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Department</span>
                      <span>{jobTitle.departmentName}</span>
                    </div>
                    <StatusPill
                      status={jobTitle.active ? 'posted' : 'pending'}
                      label={jobTitle.active ? 'Active' : 'Inactive'}
                    />
                  </div>
                  <div className="user-directory-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => editJobTitle(jobTitle)}
                    >
                      <i className="bi bi-pencil" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function HrPayrollPage({
  branches,
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const payrollQuery = useQuery({ queryKey: ['hr', 'payroll'], queryFn: getHrPayrollPage });
  const [componentForm, setComponentForm] = useState<HrPayrollComponentFormState>(() =>
    defaultHrPayrollComponentForm(),
  );
  const [periodForm, setPeriodForm] = useState<HrPayrollPeriodFormState>(() =>
    defaultHrPayrollPeriodForm(),
  );
  const [runForm, setRunForm] = useState<HrPayrollRunFormState>(() => defaultHrPayrollRunForm());
  const [adjustingPayrollEmployeeId, setAdjustingPayrollEmployeeId] = useState<string | null>(null);
  const [payrollAdjustmentForm, setPayrollAdjustmentForm] = useState<HrPayrollAdjustmentFormState>(
    () => defaultHrPayrollAdjustmentForm(),
  );
  const [salesBonusRuleForm, setSalesBonusRuleForm] = useState<HrPayrollSalesBonusRuleFormState>(
    () => defaultHrPayrollSalesBonusRuleForm(),
  );
  const [selectedPayrollPeriodId, setSelectedPayrollPeriodId] = useState('');
  const [payslipRunId, setPayslipRunId] = useState('');
  const [payslipEmployeeId, setPayslipEmployeeId] = useState('');
  const [activePayslip, setActivePayslip] = useState<HrPayslipRecord | null>(null);
  const [payrollFocusInitialized, setPayrollFocusInitialized] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const components = payrollQuery.data?.components ?? [];
  const periods = payrollQuery.data?.periods ?? [];
  const runs = payrollQuery.data?.runs ?? [];
  const salesBonusRule = payrollQuery.data?.salesBonusRule ?? defaultHrPayrollSalesBonusRuleForm();
  const branchOptions =
    currentUser.branchIds.length === 0
      ? branches.filter((branch) => branch.status === 'ACTIVE')
      : branches.filter(
          (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
        );
  const selectedPeriod = periods.find((period) => period.id === selectedPayrollPeriodId) ?? null;
  const payrollPerformanceQuery = useQuery({
    queryKey: [
      'hr',
      'payroll',
      'performance-preview',
      selectedPeriod?.id ?? 'none',
      selectedPeriod?.periodStart ?? '',
      selectedPeriod?.periodEnd ?? '',
      selectedPeriod?.branchId ?? '',
    ],
    queryFn: () => {
      const period = selectedPeriod!;
      const params = new URLSearchParams({
        fromDate: period.periodStart,
        toDate: period.periodEnd,
      });
      if (period.branchId) {
        params.set('branchId', period.branchId);
      }
      return getHrPerformance(params);
    },
    enabled: Boolean(selectedPeriod),
  });

  function applyPayrollPeriodFocus(periodId: string) {
    const period = periods.find((item) => item.id === periodId) ?? null;
    setSelectedPayrollPeriodId(periodId);
    setRunForm((current) => ({
      ...current,
      payrollPeriodId: periodId,
      name:
        period && (!current.name || periods.some((item) => current.name === `${item.name} payroll`))
          ? `${period.name} payroll`
          : current.name,
      status: periodId ? 'CALCULATED' : 'DRAFT',
    }));
  }

  const saveComponentMutation = useMutation({
    mutationFn: createHrPayrollComponent,
    onSuccess: async (component) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setComponentForm(defaultHrPayrollComponentForm());
      setMessage(`${component.name} saved.`);
    },
  });

  const saveSalesBonusRuleMutation = useMutation({
    mutationFn: updateHrPayrollSalesBonusRule,
    onSuccess: async (rule) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      setSalesBonusRuleForm(rule);
      setMessage('Sales bonus rule saved.');
    },
  });

  const savePeriodMutation = useMutation({
    mutationFn: createHrPayrollPeriod,
    onSuccess: async (period) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setPeriodForm(defaultHrPayrollPeriodForm());
      setSelectedPayrollPeriodId(period.id);
      setRunForm((current) => ({
        ...current,
        payrollPeriodId: period.id,
        name: current.name || `${period.name} payroll`,
        status: current.status === 'DRAFT' ? 'CALCULATED' : current.status,
      }));
      setMessage(`${period.name} saved.`);
    },
  });

  const saveRunMutation = useMutation({
    mutationFn: createHrPayrollRun,
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setRunForm(defaultHrPayrollRunForm());
      setSelectedPayrollPeriodId(run.payrollPeriodId);
      setMessage(`${run.name} created.`);
    },
  });

  const recalculateRunMutation = useMutation({
    mutationFn: recalculateHrPayrollRun,
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setMessage(`${run.name} refreshed from sales and performance entries.`);
    },
  });

  const saveAdjustmentMutation = useMutation({
    mutationFn: ({
      runId,
      payrollEmployeeId,
      adjustment,
    }: {
      runId: string;
      payrollEmployeeId: string;
      adjustment: HrPayrollAdjustmentFormState;
    }) => updateHrPayrollEmployeeAdjustment(runId, payrollEmployeeId, adjustment),
    onSuccess: async (employee) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setAdjustingPayrollEmployeeId(null);
      setPayrollAdjustmentForm(defaultHrPayrollAdjustmentForm());
      setMessage(`Payroll adjusted for ${employee.employeeName}.`);
    },
  });

  async function handleComponentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveComponentMutation.mutateAsync(componentForm);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save payroll component',
      );
    }
  }

  async function handlePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await savePeriodMutation.mutateAsync(periodForm);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save payroll period',
      );
    }
  }

  async function handleSalesBonusRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveSalesBonusRuleMutation.mutateAsync(salesBonusRuleForm);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save sales bonus rule',
      );
    }
  }

  async function handleRunSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveRunMutation.mutateAsync(runForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create payroll run');
    }
  }

  async function handlePayrollRunRefresh(runId: string) {
    setError('');
    setMessage('');
    try {
      await recalculateRunMutation.mutateAsync(runId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to refresh payroll run',
      );
    }
  }

  function startPayrollAdjustment(employee: PayrollRun['employees'][number]) {
    setAdjustingPayrollEmployeeId(employee.id);
    setPayrollAdjustmentForm(
      defaultHrPayrollAdjustmentForm(
        employee.bonusAmount,
        employee.lossAmount,
        employee.notes ?? '',
      ),
    );
  }

  async function handlePayrollAdjustmentSubmit(runId: string, payrollEmployeeId: string) {
    setError('');
    setMessage('');
    try {
      await saveAdjustmentMutation.mutateAsync({
        runId,
        payrollEmployeeId,
        adjustment: payrollAdjustmentForm,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save payroll adjustment',
      );
    }
  }

  function handlePayslipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!selectedPayslipRun || !selectedPayslipEmployee) {
      setError('Select a pay run and employee before generating a payslip.');
      return;
    }

    setActivePayslip({
      run: selectedPayslipRun,
      period: selectedPayslipPeriod,
      employee: selectedPayslipEmployee,
    });
  }

  const processedRuns = runs.filter(
    (run) => run.status === 'PROCESSED' || run.status === 'LOCKED',
  ).length;
  const visibleRuns = selectedPayrollPeriodId
    ? runs.filter((run) => run.payrollPeriodId === selectedPayrollPeriodId)
    : runs;
  const visibleRunEmployees = visibleRuns.flatMap((run) => run.employees);
  const payslipRuns = visibleRuns.filter((run) => run.employees.length > 0);
  const selectedPayslipRun =
    payslipRuns.find((run) => run.id === payslipRunId) ?? payslipRuns[0] ?? null;
  const payslipEmployees = (selectedPayslipRun?.employees ?? [])
    .slice()
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
  const selectedPayslipEmployee =
    payslipEmployees.find((employee) => employee.id === payslipEmployeeId) ??
    payslipEmployees[0] ??
    null;
  const selectedPayslipPeriod = selectedPayslipRun
    ? periods.find((period) => period.id === selectedPayslipRun.payrollPeriodId) ?? null
    : null;
  const currentPeriod = selectedPayrollPeriodId ? selectedPeriod : null;
  const runPeriod = periods.find((period) => period.id === runForm.payrollPeriodId) ?? null;
  const reviewRuns = visibleRuns.filter(
    (run) => !['APPROVED', 'PROCESSED', 'LOCKED'].includes(run.status),
  );
  const employeeCount = new Set(visibleRunEmployees.map((employee) => employee.employeeId)).size;
  const livePayrollRows = (payrollPerformanceQuery.data?.summaries ?? [])
    .slice()
    .sort(
      (left, right) =>
        right.projectedNetPay - left.projectedNetPay ||
        right.totalSalesAmount - left.totalSalesAmount ||
        left.employeeName.localeCompare(right.employeeName),
    );
  const liveEmployeeCount = livePayrollRows.length;
  const liveBasicSalary = livePayrollRows.reduce((sum, employee) => sum + employee.basicSalary, 0);
  const liveActualSales = livePayrollRows.reduce(
    (sum, employee) => sum + employee.actualSalesAmount,
    0,
  );
  const liveManualSales = livePayrollRows.reduce(
    (sum, employee) => sum + employee.manualSalesAmount,
    0,
  );
  const liveAutomaticBonuses = livePayrollRows.reduce(
    (sum, employee) => sum + employee.automaticBonusAmount,
    0,
  );
  const liveManualBonuses = livePayrollRows.reduce(
    (sum, employee) => sum + employee.manualBonusAmount,
    0,
  );
  const liveBonuses = livePayrollRows.reduce((sum, employee) => sum + employee.bonusAmount, 0);
  const liveLosses = livePayrollRows.reduce((sum, employee) => sum + employee.lossAmount, 0);
  const liveProjectedNetPay = livePayrollRows.reduce(
    (sum, employee) => sum + employee.projectedNetPay,
    0,
  );
  const liveQualifyingDays = livePayrollRows.reduce(
    (sum, employee) => sum + employee.qualifyingSalesDays,
    0,
  );
  const liveReceiptDays = livePayrollRows.reduce(
    (sum, employee) => sum + employee.salesDays.length,
    0,
  );

  useEffect(() => {
    if (payrollFocusInitialized || payrollQuery.isPending || periods.length === 0) {
      return;
    }

    const preferredPeriod = periods.find((period) => period.status === 'OPEN') ?? periods[0];
    setPayrollFocusInitialized(true);
    setSelectedPayrollPeriodId(preferredPeriod.id);
    setRunForm((current) => ({
      ...current,
      payrollPeriodId: current.payrollPeriodId || preferredPeriod.id,
      name: current.name || `${preferredPeriod.name} payroll`,
      status: current.status === 'DRAFT' ? 'CALCULATED' : current.status,
    }));
  }, [payrollFocusInitialized, payrollQuery.isPending, periods]);

  useEffect(() => {
    if (!payrollQuery.data?.salesBonusRule) {
      return;
    }
    setSalesBonusRuleForm(payrollQuery.data.salesBonusRule);
  }, [
    payrollQuery.data?.salesBonusRule?.active,
    payrollQuery.data?.salesBonusRule?.bonusPerTargetDay,
    payrollQuery.data?.salesBonusRule?.dailySalesTarget,
  ]);

  useEffect(() => {
    if (payslipRuns.length === 0) {
      if (payslipRunId) {
        setPayslipRunId('');
      }
      if (payslipEmployeeId) {
        setPayslipEmployeeId('');
      }
      return;
    }

    const nextRun =
      payslipRuns.find((run) => run.id === payslipRunId) ?? payslipRuns[0];
    if (payslipRunId !== nextRun.id) {
      setPayslipRunId(nextRun.id);
    }

    const nextEmployee =
      nextRun.employees
        .slice()
        .sort((left, right) => left.employeeName.localeCompare(right.employeeName))
        .find((employee) => employee.id === payslipEmployeeId) ??
      nextRun.employees
        .slice()
        .sort((left, right) => left.employeeName.localeCompare(right.employeeName))[0] ??
      null;
    const nextEmployeeId = nextEmployee?.id ?? '';
    if (payslipEmployeeId !== nextEmployeeId) {
      setPayslipEmployeeId(nextEmployeeId);
    }
  }, [payslipEmployeeId, payslipRunId, payslipRuns]);

  useEffect(() => {
    if (!activePayslip) {
      return undefined;
    }

    function handlePayslipKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActivePayslip(null);
      }
    }

    window.addEventListener('keydown', handlePayslipKeyDown);
    return () => window.removeEventListener('keydown', handlePayslipKeyDown);
  }, [activePayslip]);

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Payroll"
        subtitle="Create, review, and adjust staff pay for a selected period."
        action={
          <div className="hr-employee-page-actions payroll-page-actions">
            <label className="payroll-period-switch">
              <span>Period</span>
              <select
                value={selectedPayrollPeriodId}
                onChange={(event) => applyPayrollPeriodFocus(event.target.value)}
              >
                <option value="">All periods</option>
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </label>
            <HrBackButton />
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-calendar3"
          label="Pay Period"
          value={currentPeriod?.name ?? (periods.length > 0 ? 'All Periods' : 'Not Set')}
          detail={
            currentPeriod
              ? `${formatDateOnly(currentPeriod.periodStart)} - ${formatDateOnly(
                  currentPeriod.periodEnd,
                )}`
              : periods.length > 0
                ? `${periods.length} period${periods.length === 1 ? '' : 's'} in view`
                : 'Create a period'
          }
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-receipt"
          label="Live POS Sales"
          value={formatMoney(liveActualSales, organization.currencyCode)}
          detail={`${liveReceiptDays} sales day${liveReceiptDays === 1 ? '' : 's'} / ${formatMoney(
            liveManualSales,
            organization.currencyCode,
          )} manual sales`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-cash-stack"
          label="Projected Payout"
          value={formatMoney(liveProjectedNetPay, organization.currencyCode)}
          detail={`${formatMoney(liveBasicSalary, organization.currencyCode)} basic + ${formatMoney(
            liveBonuses,
            organization.currencyCode,
          )} bonuses - ${formatMoney(liveLosses, organization.currencyCode)} losses`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-people"
          label="Staff Tracked"
          value={String(liveEmployeeCount || employeeCount)}
          detail={`${liveQualifyingDays} target day${liveQualifyingDays === 1 ? '' : 's'} / ${
            reviewRuns.length
          } run${reviewRuns.length === 1 ? '' : 's'} to review`}
          tone="purple"
        />
      </div>

      <FormMessages error={error} message={message} />

      <section className="panel-card branch-list-panel payroll-live-preview-panel">
        <PanelHeader
          icon="bi-calculator"
          title="Live Staff Payouts"
          action={
            <StatusPill
              status={selectedPeriod ? 'posted' : 'pending'}
              label={selectedPeriod ? 'Live from POS' : 'Select period'}
            />
          }
        />
        {!selectedPeriod ? (
          <EmptyState
            icon="bi-calendar3"
            title="Select a pay period"
            detail="Payroll will show live staff payouts for the selected period."
          />
        ) : payrollPerformanceQuery.isPending ? (
          <LoadingPanel label="Loading live staff payouts..." />
        ) : livePayrollRows.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No staff payouts yet"
            detail="Employee salary settings and POS sales will populate this view."
          />
        ) : (
          <>
            <div className="payroll-equation-strip">
              <span>
                <strong>{formatMoney(liveBasicSalary, organization.currencyCode)}</strong>
                Basic salary
              </span>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(liveAutomaticBonuses, organization.currencyCode)}</strong>
                Target bonus
              </span>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(liveManualBonuses, organization.currencyCode)}</strong>
                Admin bonus
              </span>
              <i className="bi bi-dash-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(liveLosses, organization.currencyCode)}</strong>
                Losses
              </span>
              <i className="bi bi-equals" aria-hidden="true" />
              <span className="payroll-equation-total">
                <strong>{formatMoney(liveProjectedNetPay, organization.currencyCode)}</strong>
                Projected payout
              </span>
            </div>

            <div className="responsive-table report-table hr-dashboard-table payroll-live-table">
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Sales Recorded</th>
                    <th>Basic Salary</th>
                    <th>Target Bonus</th>
                    <th>Admin Bonus</th>
                    <th>Losses</th>
                    <th>Projected Payout</th>
                    <th>Pay To</th>
                  </tr>
                </thead>
                <tbody>
                  {livePayrollRows.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td data-label="Staff">
                        <strong>{employee.employeeName}</strong>
                        <br />
                        <small>
                          {employee.employeeNumber} - {employee.branchName}
                        </small>
                      </td>
                      <td data-label="Sales Recorded">
                        <strong>
                          {formatMoney(employee.actualSalesAmount, organization.currencyCode)}
                        </strong>
                        <br />
                        <small>
                          {employee.salesDays.length} sale day
                          {employee.salesDays.length === 1 ? '' : 's'} /{' '}
                          {employee.qualifyingSalesDays} target day
                          {employee.qualifyingSalesDays === 1 ? '' : 's'}
                        </small>
                      </td>
                      <td data-label="Basic Salary">
                        {formatMoney(employee.basicSalary, organization.currencyCode)}
                      </td>
                      <td data-label="Target Bonus">
                        {formatMoney(employee.automaticBonusAmount, organization.currencyCode)}
                        <br />
                        <small>
                          {formatMoney(employee.salesBonusTarget, organization.currencyCode)} target
                        </small>
                      </td>
                      <td data-label="Admin Bonus">
                        {formatMoney(employee.manualBonusAmount, organization.currencyCode)}
                      </td>
                      <td data-label="Losses">
                        {formatMoney(employee.lossAmount, organization.currencyCode)}
                      </td>
                      <td data-label="Projected Payout">
                        <strong>
                          {formatMoney(employee.projectedNetPay, organization.currencyCode)}
                        </strong>
                      </td>
                      <td data-label="Pay To">
                        {labelizeEnum(employee.salaryPaymentMethod)}
                        <br />
                        <small>{employee.paymentDestination || 'Not configured'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="payroll-live-note">
              Create or recalculate a pay run to save this live payout snapshot.
            </p>
          </>
        )}
      </section>

      <section className="panel-card payroll-run-panel payroll-start-panel">
        <PanelHeader
          icon="bi-play-circle"
          title="New Pay Run"
          action={
            runPeriod ? (
              <StatusPill
                status={runPeriod.status === 'OPEN' ? 'posted' : 'pending'}
                label={labelizeEnum(runPeriod.status)}
              />
            ) : null
          }
        />
        <div className="payroll-start-grid">
          <form className="record-form payroll-run-form" onSubmit={handleRunSubmit}>
            <div className="payroll-run-form-grid">
              <label className="field-stack">
                <span>Pay Period</span>
                <select
                  required
                  value={runForm.payrollPeriodId}
                  onChange={(event) => applyPayrollPeriodFocus(event.target.value)}
                >
                  <option value="">Select pay period</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Run Name</span>
                <input
                  required
                  maxLength={120}
                  value={runForm.name}
                  onChange={(event) =>
                    setRunForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder={runPeriod ? `${runPeriod.name} payroll` : 'Monthly payroll'}
                />
              </label>
            </div>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={saveRunMutation.isPending || !runForm.payrollPeriodId}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {periods.length === 0
                ? 'Add Pay Period First'
                : !runForm.payrollPeriodId
                  ? 'Select Pay Period'
                  : saveRunMutation.isPending
                    ? 'Saving...'
                    : 'Create Pay Run'}
            </button>
          </form>

          <div className="payroll-readiness-list payroll-readiness-list-compact">
            <div className="payroll-readiness-item">
              <i className="bi bi-calendar3" aria-hidden="true" />
              <span>
                <strong>{periods.length} pay periods</strong>
                <small>{periods.filter((period) => period.status === 'OPEN').length} open</small>
              </span>
            </div>
            <div className="payroll-readiness-item">
              <i className="bi bi-cash-coin" aria-hidden="true" />
              <span>
                <strong>{components.length} earnings/deductions</strong>
                <small>{components.filter((component) => component.active).length} active</small>
              </span>
            </div>
            <div className="payroll-readiness-item">
              <i className="bi bi-trophy" aria-hidden="true" />
              <span>
                <strong>
                  {formatMoney(salesBonusRule.dailySalesTarget, organization.currencyCode)} target
                </strong>
                <small>
                  {formatMoney(salesBonusRule.bonusPerTargetDay, organization.currencyCode)} bonus
                  per qualifying day
                </small>
              </span>
            </div>
            <div className="payroll-readiness-item">
              <i className="bi bi-wallet2" aria-hidden="true" />
              <span>
                <strong>{runs.length} pay runs</strong>
                <small>{processedRuns} processed or locked</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card branch-list-panel payroll-payslip-panel">
        <PanelHeader
          icon="bi-file-earmark-person"
          title="Payslip Generator"
          action={<span className="catalog-count-pill">{payslipRuns.length} runs ready</span>}
        />
        {payrollQuery.isPending ? (
          <LoadingPanel label="Loading payslip data..." />
        ) : payslipRuns.length === 0 ? (
          <EmptyState
            icon="bi-receipt"
            title="No payslips ready"
            detail="Create a pay run first so employee payslips can use a saved payroll snapshot."
          />
        ) : (
          <form className="record-form payroll-payslip-form" onSubmit={handlePayslipSubmit}>
            <label className="field-stack">
              <span>Pay Run</span>
              <select
                required
                value={selectedPayslipRun?.id ?? ''}
                onChange={(event) => {
                  const nextRun =
                    payslipRuns.find((run) => run.id === event.target.value) ?? null;
                  setPayslipRunId(event.target.value);
                  setPayslipEmployeeId(
                    nextRun?.employees
                      .slice()
                      .sort((left, right) => left.employeeName.localeCompare(right.employeeName))[0]
                      ?.id ?? '',
                  );
                }}
              >
                <option value="">Select pay run</option>
                {payslipRuns.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.name} - {run.payrollPeriodName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Employee</span>
              <select
                required
                value={selectedPayslipEmployee?.id ?? ''}
                onChange={(event) => setPayslipEmployeeId(event.target.value)}
              >
                <option value="">Select employee</option>
                {payslipEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeName} - {employee.employeeNumber}
                  </option>
                ))}
              </select>
            </label>
            <div className="payroll-payslip-summary">
              <span>
                <strong>
                  {selectedPayslipEmployee
                    ? formatMoney(selectedPayslipEmployee.basicSalary, organization.currencyCode)
                    : formatMoney(0, organization.currencyCode)}
                </strong>
                Basic salary
              </span>
              <span>
                <strong>
                  {selectedPayslipEmployee
                    ? formatMoney(selectedPayslipEmployee.bonusAmount, organization.currencyCode)
                    : formatMoney(0, organization.currencyCode)}
                </strong>
                Bonuses
              </span>
              <span>
                <strong>
                  {selectedPayslipEmployee
                    ? formatMoney(
                        selectedPayslipEmployee.totalDeductions ||
                          selectedPayslipEmployee.lossAmount,
                        organization.currencyCode,
                      )
                    : formatMoney(0, organization.currencyCode)}
                </strong>
                Deductions
              </span>
              <span className="payroll-payslip-summary-total">
                <strong>
                  {selectedPayslipEmployee
                    ? formatMoney(selectedPayslipEmployee.netPay, organization.currencyCode)
                    : formatMoney(0, organization.currencyCode)}
                </strong>
                Net pay
              </span>
            </div>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={!selectedPayslipRun || !selectedPayslipEmployee}
            >
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              Generate Payslip
            </button>
          </form>
        )}
      </section>

      <section className="panel-card branch-list-panel payroll-runs-panel">
        <PanelHeader
          icon="bi-wallet2"
          title="Pay Runs"
          action={<span className="catalog-count-pill">{visibleRuns.length} runs</span>}
        />
        {payrollQuery.isPending ? (
          <LoadingPanel label="Loading pay runs..." />
        ) : visibleRuns.length === 0 ? (
          <EmptyState
            icon="bi-wallet2"
            title="No pay runs"
            detail="Create a pay run to calculate staff pay."
          />
        ) : (
          <div className="payroll-run-list">
            {visibleRuns.map((run: PayrollRun) => {
              const runEditable = run.status !== 'PROCESSED' && run.status !== 'LOCKED';
              const grossPay = run.employees.reduce((sum, employee) => sum + employee.grossPay, 0);
              const netPay = run.employees.reduce((sum, employee) => sum + employee.netPay, 0);
              const bonusPay = run.employees.reduce(
                (sum, employee) => sum + employee.bonusAmount,
                0,
              );
              const lossPay = run.employees.reduce((sum, employee) => sum + employee.lossAmount, 0);

              return (
                <article className="payroll-run-card" key={run.id}>
                  <div className="payroll-run-card-main">
                    <div className="user-directory-identity">
                      <span className="user-directory-icon">
                        <i className="bi bi-play-circle" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{run.name}</strong>
                        <small>
                          {run.payrollPeriodName} - {run.branchName ?? 'All branches'}
                        </small>
                      </span>
                    </div>
                    <div className="payroll-run-card-totals">
                      <div>
                        <span>Employees</span>
                        <strong>{run.employees.length}</strong>
                      </div>
                      <div>
                        <span>Gross</span>
                        <strong>{formatMoney(grossPay, organization.currencyCode)}</strong>
                      </div>
                      <div>
                        <span>Net</span>
                        <strong>{formatMoney(netPay, organization.currencyCode)}</strong>
                      </div>
                    </div>
                    <div className="payroll-run-card-actions">
                      <StatusPill
                        status={payrollRunPillStatus(run.status)}
                        label={labelizeEnum(run.status)}
                      />
                      <button
                        className="text-button"
                        type="button"
                        disabled={!runEditable || recalculateRunMutation.isPending}
                        onClick={() => handlePayrollRunRefresh(run.id)}
                      >
                        <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                        Recalculate
                      </button>
                    </div>
                  </div>
                  <div className="payroll-run-impact">
                    <span>
                      Bonuses <strong>{formatMoney(bonusPay, organization.currencyCode)}</strong>
                    </span>
                    <span>
                      Deductions <strong>{formatMoney(lossPay, organization.currencyCode)}</strong>
                    </span>
                    <span>
                      Status <strong>{labelizeEnum(run.status)}</strong>
                    </span>
                  </div>
                  {run.employees.length > 0 ? (
                    <details className="payroll-run-details">
                      <summary>
                        <span>Staff pay details</span>
                        <small>{run.employees.length} staff</small>
                      </summary>
                      <div className="responsive-table report-table hr-dashboard-table payroll-employee-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Base Pay</th>
                              <th>Bonus</th>
                              <th>Deductions</th>
                              <th>Sales</th>
                              <th>Take-Home</th>
                              <th>Pay To</th>
                              <th>Edit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {run.employees.map((employee) => {
                              const isAdjusting = adjustingPayrollEmployeeId === employee.id;

                              return (
                                <tr key={employee.id}>
                                  <td data-label="Employee">
                                    <strong>{employee.employeeName}</strong>
                                    <br />
                                    <small>{employee.employeeNumber}</small>
                                  </td>
                                  <td data-label="Base Pay">
                                    {formatMoney(employee.basicSalary, organization.currencyCode)}
                                  </td>
                                  <td data-label="Bonus">
                                    {isAdjusting ? (
                                      <input
                                        className="payroll-adjustment-input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payrollAdjustmentForm.bonusAmount}
                                        onChange={(event) =>
                                          setPayrollAdjustmentForm((current) => ({
                                            ...current,
                                            bonusAmount: Number(event.target.value || 0),
                                          }))
                                        }
                                      />
                                    ) : (
                                      <>
                                        <strong>
                                          {formatMoney(
                                            employee.bonusAmount,
                                            organization.currencyCode,
                                          )}
                                        </strong>
                                        <br />
                                        <small>
                                          Auto{' '}
                                          {formatMoney(
                                            employee.automaticBonusAmount,
                                            organization.currencyCode,
                                          )}{' '}
                                          / Admin{' '}
                                          {formatMoney(
                                            employee.manualBonusAmount,
                                            organization.currencyCode,
                                          )}
                                        </small>
                                      </>
                                    )}
                                  </td>
                                  <td data-label="Deductions">
                                    {isAdjusting ? (
                                      <input
                                        className="payroll-adjustment-input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={payrollAdjustmentForm.lossAmount}
                                        onChange={(event) =>
                                          setPayrollAdjustmentForm((current) => ({
                                            ...current,
                                            lossAmount: Number(event.target.value || 0),
                                          }))
                                        }
                                      />
                                    ) : (
                                      formatMoney(employee.lossAmount, organization.currencyCode)
                                    )}
                                  </td>
                                  <td data-label="Sales">
                                    {formatMoney(employee.salesAmount, organization.currencyCode)}
                                    <br />
                                    <small>{employee.qualifyingSalesDays} target day(s)</small>
                                  </td>
                                  <td data-label="Take-Home">
                                    <strong>
                                      {formatMoney(employee.netPay, organization.currencyCode)}
                                    </strong>
                                  </td>
                                  <td data-label="Pay To">
                                    {labelizeEnum(employee.paymentMethod)}
                                    <br />
                                    <small>{employee.paymentDestination ?? 'Not configured'}</small>
                                  </td>
                                  <td data-label="Edit">
                                    {isAdjusting ? (
                                      <div className="payroll-adjustment-actions">
                                        <textarea
                                          className="payroll-adjustment-notes"
                                          rows={2}
                                          maxLength={1000}
                                          value={payrollAdjustmentForm.notes}
                                          onChange={(event) =>
                                            setPayrollAdjustmentForm((current) => ({
                                              ...current,
                                              notes: event.target.value,
                                            }))
                                          }
                                        />
                                        <button
                                          className="text-button"
                                          type="button"
                                          disabled={saveAdjustmentMutation.isPending}
                                          onClick={() =>
                                            handlePayrollAdjustmentSubmit(run.id, employee.id)
                                          }
                                        >
                                          <i className="bi bi-check2" aria-hidden="true" />
                                          Save
                                        </button>
                                        <button
                                          className="text-button"
                                          type="button"
                                          onClick={() => setAdjustingPayrollEmployeeId(null)}
                                        >
                                          <i className="bi bi-x-lg" aria-hidden="true" />
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        className="text-button"
                                        type="button"
                                        disabled={!runEditable}
                                        onClick={() => startPayrollAdjustment(employee)}
                                      >
                                        <i className="bi bi-pencil" aria-hidden="true" />
                                        Edit
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel-card branch-list-panel payroll-settings-panel">
        <PanelHeader
          icon="bi-sliders"
          title="Settings"
          action={<span className="catalog-count-pill">Pay setup</span>}
        />
        <div className="payroll-settings-drawers">
          <details
            className="payroll-settings-drawer"
            open={periods.length === 0 ? true : undefined}
          >
            <summary>
              <span className="payroll-settings-summary-icon">
                <i className="bi bi-calendar-plus" aria-hidden="true" />
              </span>
              <span>
                <strong>Add Pay Period</strong>
                <small>{periods.length} saved</small>
              </span>
            </summary>
            <form className="record-form payroll-compact-form" onSubmit={handlePeriodSubmit}>
              <label className="field-stack">
                <span>Pay Period Name</span>
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
                <span>Branch</span>
                <select
                  value={periodForm.branchId}
                  onChange={(event) =>
                    setPeriodForm((current) => ({ ...current, branchId: event.target.value }))
                  }
                >
                  <option value="">All branches</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="report-date-grid">
                <label className="field-stack">
                  <span>Start Date</span>
                  <input
                    type="date"
                    required
                    value={periodForm.periodStart}
                    onChange={(event) =>
                      setPeriodForm((current) => ({ ...current, periodStart: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>End Date</span>
                  <input
                    type="date"
                    required
                    value={periodForm.periodEnd}
                    onChange={(event) =>
                      setPeriodForm((current) => ({ ...current, periodEnd: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="report-date-grid">
                <label className="field-stack">
                  <span>Pay Date</span>
                  <input
                    type="date"
                    value={periodForm.paymentDate}
                    onChange={(event) =>
                      setPeriodForm((current) => ({ ...current, paymentDate: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select
                    value={periodForm.status}
                    onChange={(event) =>
                      setPeriodForm((current) => ({
                        ...current,
                        status: event.target.value as PayrollPeriodStatus,
                      }))
                    }
                  >
                    {payrollPeriodStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={savePeriodMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {savePeriodMutation.isPending ? 'Saving...' : 'Save Pay Period'}
              </button>
            </form>
          </details>

          <details
            className="payroll-settings-drawer"
            open={components.length === 0 ? true : undefined}
          >
            <summary>
              <span className="payroll-settings-summary-icon">
                <i className="bi bi-cash-coin" aria-hidden="true" />
              </span>
              <span>
                <strong>Add Earning or Deduction</strong>
                <small>{components.length} saved</small>
              </span>
            </summary>
            <form className="record-form payroll-compact-form" onSubmit={handleComponentSubmit}>
              <label className="field-stack">
                <span>Name</span>
                <input
                  required
                  maxLength={120}
                  value={componentForm.name}
                  onChange={(event) =>
                    setComponentForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Code</span>
                <input
                  required
                  maxLength={40}
                  value={componentForm.code}
                  onChange={(event) =>
                    setComponentForm((current) => ({ ...current, code: event.target.value }))
                  }
                />
              </label>
              <div className="report-date-grid">
                <label className="field-stack">
                  <span>Type</span>
                  <select
                    value={componentForm.componentType}
                    onChange={(event) =>
                      setComponentForm((current) => ({
                        ...current,
                        componentType: event.target.value as PayrollComponentType,
                      }))
                    }
                  >
                    {payrollComponentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Default Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={componentForm.defaultAmount}
                    onChange={(event) =>
                      setComponentForm((current) => ({
                        ...current,
                        defaultAmount: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
              </div>
              <label className="field-stack inline-checkbox">
                <input
                  type="checkbox"
                  checked={componentForm.taxable}
                  onChange={(event) =>
                    setComponentForm((current) => ({ ...current, taxable: event.target.checked }))
                  }
                />
                <span>Taxable</span>
              </label>
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={saveComponentMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveComponentMutation.isPending ? 'Saving...' : 'Save Earning/Deduction'}
              </button>
            </form>
          </details>

          <details
            className="payroll-settings-drawer"
            open={salesBonusRule.dailySalesTarget <= 0 ? true : undefined}
          >
            <summary>
              <span className="payroll-settings-summary-icon">
                <i className="bi bi-trophy" aria-hidden="true" />
              </span>
              <span>
                <strong>Sales Bonus Automation</strong>
                <small>
                  {formatMoney(salesBonusRule.dailySalesTarget, organization.currencyCode)} target /{' '}
                  {formatMoney(salesBonusRule.bonusPerTargetDay, organization.currencyCode)} per day
                </small>
              </span>
            </summary>
            <form
              className="record-form payroll-compact-form"
              onSubmit={handleSalesBonusRuleSubmit}
            >
              <div className="report-date-grid">
                <label className="field-stack">
                  <span>Daily Sales Target</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salesBonusRuleForm.dailySalesTarget}
                    onChange={(event) =>
                      setSalesBonusRuleForm((current) => ({
                        ...current,
                        dailySalesTarget: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Bonus Per Target Day</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salesBonusRuleForm.bonusPerTargetDay}
                    onChange={(event) =>
                      setSalesBonusRuleForm((current) => ({
                        ...current,
                        bonusPerTargetDay: Number(event.target.value || 0),
                      }))
                    }
                  />
                </label>
              </div>
              <label className="field-stack inline-checkbox">
                <input
                  type="checkbox"
                  checked={salesBonusRuleForm.active}
                  onChange={(event) =>
                    setSalesBonusRuleForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                <span>Apply this rule automatically in performance and payroll</span>
              </label>
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={saveSalesBonusRuleMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {saveSalesBonusRuleMutation.isPending ? 'Saving...' : 'Save Sales Bonus Rule'}
              </button>
            </form>
          </details>

          <details className="payroll-settings-drawer">
            <summary>
              <span className="payroll-settings-summary-icon">
                <i className="bi bi-calendar-range" aria-hidden="true" />
              </span>
              <span>
                <strong>Saved Pay Periods</strong>
                <small>{periods.length} total</small>
              </span>
            </summary>
            {payrollQuery.isPending ? (
              <LoadingPanel label="Loading pay periods..." />
            ) : periods.length === 0 ? (
              <EmptyState
                icon="bi-calendar-range"
                title="No pay periods"
                detail="Add a pay period before creating a pay run."
              />
            ) : (
              <div className="user-directory-list">
                {periods.map((period: PayrollPeriod) => (
                  <article className="user-directory-row" key={period.id}>
                    <div className="user-directory-identity">
                      <span className="user-directory-icon">
                        <i className="bi bi-calendar3" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{period.name}</strong>
                        <small>
                          {formatDateOnly(period.periodStart)} - {formatDateOnly(period.periodEnd)}
                        </small>
                      </span>
                    </div>
                    <div className="user-directory-status">
                      <StatusPill
                        status={period.status === 'OPEN' ? 'posted' : 'pending'}
                        label={labelizeEnum(period.status)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </details>

          <details className="payroll-settings-drawer">
            <summary>
              <span className="payroll-settings-summary-icon">
                <i className="bi bi-list-check" aria-hidden="true" />
              </span>
              <span>
                <strong>Saved Earnings and Deductions</strong>
                <small>{components.length} total</small>
              </span>
            </summary>
            {payrollQuery.isPending ? (
              <LoadingPanel label="Loading earnings and deductions..." />
            ) : components.length === 0 ? (
              <EmptyState
                icon="bi-cash-coin"
                title="No earnings or deductions"
                detail="Add one before creating detailed pay runs."
              />
            ) : (
              <div className="responsive-table report-table hr-dashboard-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Default Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((component: PayrollComponent) => (
                      <tr key={component.id}>
                        <td data-label="Name">{component.name}</td>
                        <td data-label="Code">{component.code}</td>
                        <td data-label="Type">{labelizeEnum(component.componentType)}</td>
                        <td data-label="Default Amount">
                          {formatMoney(component.defaultAmount, organization.currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </div>
      </section>

      {activePayslip ? (
        <PayrollPayslipDialog
          employee={activePayslip.employee}
          organization={organization}
          period={activePayslip.period}
          run={activePayslip.run}
          onClose={() => setActivePayslip(null)}
        />
      ) : null}
    </section>
  );
}

function PayrollPayslipDialog({
  employee,
  organization,
  period,
  run,
  onClose,
}: {
  employee: PayrollRun['employees'][number];
  organization: Organization;
  period: PayrollPeriod | null;
  run: PayrollRun;
  onClose: () => void;
}) {
  const deductionAmount = employee.totalDeductions || employee.lossAmount;
  const periodLabel = period
    ? `${formatDateOnly(period.periodStart)} - ${formatDateOnly(period.periodEnd)}`
    : run.payrollPeriodName;
  const generatedAt = formatDateTime(new Date().toISOString());
  const payDate = period?.paymentDate ? formatDateOnly(period.paymentDate) : 'Not set';
  const paymentHeading = `${labelizeEnum(employee.paymentMethod)}${
    employee.paymentDestination ? ` - ${employee.paymentDestination}` : ''
  }`;
  const earningLines = [
    { label: 'Basic Salary', amount: employee.basicSalary },
    { label: 'Automatic Sales Bonus', amount: employee.automaticBonusAmount },
    { label: 'Admin Bonus', amount: employee.manualBonusAmount },
  ].filter((line) => line.amount > 0 || line.label === 'Basic Salary');
  const deductionLines =
    deductionAmount > 0
      ? [{ label: 'Deductions / Losses', amount: -deductionAmount }]
      : [{ label: 'Deductions / Losses', amount: 0 }];

  return (
    <div
      className="dialog-backdrop payslip-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="payroll-payslip-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payslip-title"
      >
        <div className="dialog-header payslip-dialog-actions">
          <div>
            <p className="eyebrow">Employee payroll</p>
            <h2 id="payslip-title">Payslip</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close payslip"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="payslip-print-area">
          <header className="payslip-slip-header">
            <img src={keenLogoUrl} alt="" aria-hidden="true" />
            <strong>{organization.name}</strong>
            <em>Pay-Slip({run.payrollPeriodName})</em>
            <span>{generatedAt}</span>
            {organization.taxRegistrationNumber ? (
              <span>PIN: {organization.taxRegistrationNumber}</span>
            ) : null}
          </header>

          <section className="payslip-staff-lines" aria-label="Payslip details">
            <div>
              <span>PF-Num: {employee.employeeNumber}</span>
              <span>Name: {employee.employeeName}</span>
            </div>
            <div>
              <span>Station: {employee.branchName}</span>
              <span>Pay Date: {payDate}</span>
            </div>
            <div>
              <span>Pay Run: {run.name}</span>
              <span>Status: {labelizeEnum(run.status)}</span>
            </div>
            <div>
              <span>Period: {periodLabel}</span>
              <span>Tax-PIN: {organization.taxRegistrationNumber ?? 'N/A'}</span>
            </div>
          </section>

          <section className="payslip-payment-heading">{paymentHeading || 'Payment not set'}</section>

          <section className="payslip-slip-body">
            <img className="payslip-watermark" src={keenLogoUrl} alt="" aria-hidden="true" />

            <div className="payslip-slip-lines">
              {earningLines.map((line) => (
                <div className="payslip-slip-line" key={line.label}>
                  <span>{line.label}</span>
                  <strong>{formatPayslipAmount(line.amount)}</strong>
                </div>
              ))}
              <div className="payslip-slip-line payslip-slip-total">
                <span>TOTAL Earnings</span>
                <strong>{formatPayslipAmount(employee.grossPay)}</strong>
              </div>
            </div>

            <div className="payslip-slip-lines payslip-deduction-lines">
              {deductionLines.map((line) => (
                <div className="payslip-slip-line" key={line.label}>
                  <span>{line.label}</span>
                  <strong>{formatPayslipAmount(line.amount)}</strong>
                </div>
              ))}
              <div className="payslip-slip-line">
                <span>Sales Recorded</span>
                <strong>{formatPayslipAmount(employee.salesAmount)}</strong>
              </div>
              <div className="payslip-slip-line">
                <span>Qualifying Target Days</span>
                <strong>{employee.qualifyingSalesDays}</strong>
              </div>
              <div className="payslip-slip-line payslip-slip-total">
                <span>TOTAL Deductions</span>
                <strong>{formatPayslipAmount(-deductionAmount)}</strong>
              </div>
            </div>

            <div className="payslip-nett-line">
              <span>NETT Pay: {run.payrollPeriodName}</span>
              <strong>{formatPayslipAmount(employee.netPay)}</strong>
            </div>
          </section>

          {employee.notes ? (
            <section className="payslip-notes">
              <span>Notes</span>
              <p>{employee.notes}</p>
            </section>
          ) : null}

          <footer className="payslip-slip-footer">Report all anomalies to your HR Department.</footer>
        </div>

        <div className="receipt-actions receipt-footer-actions payslip-dialog-actions">
          <button className="secondary-action compact-action" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-action compact-action"
            type="button"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer" aria-hidden="true" />
            Print / Save PDF
          </button>
        </div>
      </section>
    </div>
  );
}

function HrRecruitmentPage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['hr', 'job-titles'], queryFn: getHrJobTitles });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'recruitment'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'joiningDate,desc' })),
  });

  const departments = departmentsQuery.data ?? [];
  const jobTitles = jobTitlesQuery.data ?? [];
  const employees = employeesQuery.data?.items ?? [];
  const branchOptions = scopedActiveBranches(branches, currentUser);
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const recruitmentRows = buildRecruitmentRows(jobTitles, departments, employees)
    .filter((row) => !branchFilter || row.branchId === branchFilter || !row.branchId)
    .filter((row) => !departmentFilter || row.departmentId === departmentFilter)
    .filter((row) => !stageFilter || row.stage === stageFilter);
  const openRows = recruitmentRows.filter((row) => row.headcount === 0);
  const thinCoverageRows = recruitmentRows.filter((row) => row.headcount > 0 && row.headcount < 2);
  const probationEmployees = employees.filter(
    (employee) => employee.employmentStatus === 'PROBATION',
  );
  const onboardingEmployees = employees
    .filter(
      (employee) =>
        daysSince(employee.joiningDate) <= 45 || employee.employmentStatus === 'PROBATION',
    )
    .slice(0, 8);
  const pipelineStages = [
    {
      label: 'Sourcing',
      icon: 'bi-search',
      count: openRows.length,
      detail: 'job titles with no active employees',
      status: 'pending' as const,
    },
    {
      label: 'Screening',
      icon: 'bi-funnel',
      count: thinCoverageRows.length,
      detail: 'roles with thin bench coverage',
      status: 'review' as const,
    },
    {
      label: 'Onboarding',
      icon: 'bi-person-check',
      count: onboardingEmployees.length,
      detail: 'recent or probation employees',
      status: 'posted' as const,
    },
  ];
  const isLoading =
    departmentsQuery.isPending || jobTitlesQuery.isPending || employeesQuery.isPending;

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Recruitment"
        subtitle="Plan hiring needs from your live employee structure, open role coverage, and onboarding queue."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <NavLink className="primary-action compact-action" to="/hr/employees">
              <i className="bi bi-person-plus" aria-hidden="true" />
              Add Employee
            </NavLink>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-briefcase"
          label="Role Templates"
          value={String(jobTitles.filter((jobTitle) => jobTitle.active).length)}
          detail={`${departments.filter((department) => department.active).length} active departments`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-person-plus"
          label="Open Hiring Needs"
          value={String(openRows.length)}
          detail="active job titles without headcount"
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-person-check"
          label="Onboarding"
          value={String(onboardingEmployees.length)}
          detail={`${probationEmployees.length} employees on probation`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-shop"
          label="Branch Scope"
          value={String(branchOptions.length)}
          detail="active branches available to this user"
          tone="purple"
        />
      </div>

      <div className="catalog-filter-bar hr-filter-bar">
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
            <option value="">All stages</option>
            <option value="Sourcing">Sourcing</option>
            <option value="Screening">Screening</option>
            <option value="Pipeline Ready">Pipeline Ready</option>
          </select>
        </label>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-kanban" title="Recruitment Pipeline" />
          {isLoading ? (
            <LoadingPanel label="Loading recruitment pipeline..." />
          ) : (
            <div className="user-directory-list">
              {pipelineStages.map((stage) => (
                <article className="user-directory-row" key={stage.label}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className={`bi ${stage.icon}`} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{stage.label}</strong>
                      <small>{stage.detail}</small>
                    </span>
                  </div>
                  <div className="user-directory-status">
                    <StatusPill status={stage.status} label={`${stage.count} items`} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-clipboard2-check" title="Recruitment Readiness" />
          {isLoading ? (
            <LoadingPanel label="Checking recruitment readiness..." />
          ) : (
            <div className="user-directory-list">
              <HrReadinessRow
                icon="bi-diagram-3"
                title="Departments configured"
                detail={`${departments.filter((department) => department.active).length} active departments`}
                ready={departments.some((department) => department.active)}
              />
              <HrReadinessRow
                icon="bi-briefcase"
                title="Job titles configured"
                detail={`${jobTitles.filter((jobTitle) => jobTitle.active).length} active job titles`}
                ready={jobTitles.some((jobTitle) => jobTitle.active)}
              />
              <HrReadinessRow
                icon="bi-person-lines-fill"
                title="Managers and users linked"
                detail={`${employees.filter((employee) => employee.linkedUserId).length} employees linked to users`}
                ready={employees.some((employee) => employee.linkedUserId)}
              />
              <HrReadinessRow
                icon="bi-person-plus"
                title="Open role list ready"
                detail={`${openRows.length} roles need recruitment attention`}
                ready={openRows.length > 0}
              />
            </div>
          )}
        </section>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-list-panel">
          <PanelHeader
            icon="bi-list-check"
            title="Role Coverage"
            action={<span className="catalog-count-pill">{recruitmentRows.length} roles</span>}
          />
          {isLoading ? (
            <LoadingPanel label="Loading role coverage..." />
          ) : recruitmentRows.length === 0 ? (
            <EmptyState
              icon="bi-briefcase"
              title="No roles match"
              detail="Create job titles in HR Settings or adjust the filters."
            />
          ) : (
            <div className="responsive-table report-table hr-dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Headcount</th>
                    <th>Stage</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {recruitmentRows.map((row) => (
                    <tr key={row.jobTitleId}>
                      <td data-label="Role">
                        <strong>{row.title}</strong>
                      </td>
                      <td data-label="Department">{row.departmentName}</td>
                      <td data-label="Branch">{row.branchName}</td>
                      <td data-label="Headcount">{row.headcount}</td>
                      <td data-label="Stage">{row.stage}</td>
                      <td data-label="Priority">
                        <StatusPill
                          status={
                            row.priority === 'High'
                              ? 'pending'
                              : row.priority === 'Medium'
                                ? 'review'
                                : 'posted'
                          }
                          label={row.priority}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-person-check" title="Onboarding Queue" />
          {employeesQuery.isPending ? (
            <LoadingPanel label="Loading onboarding queue..." />
          ) : onboardingEmployees.length === 0 ? (
            <EmptyState
              icon="bi-person-check"
              title="No onboarding items"
              detail="Recent hires and probation employees will appear here."
            />
          ) : (
            <div className="user-directory-list">
              {onboardingEmployees.map((employee) => {
                const department = employee.departmentId
                  ? departmentById.get(employee.departmentId)
                  : undefined;
                return (
                  <article className="user-directory-row" key={employee.id}>
                    <div className="user-directory-identity">
                      <span className="user-directory-icon">
                        <i className="bi bi-person-vcard" aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{employee.fullName}</strong>
                        <small>{employee.employeeNumber}</small>
                      </span>
                    </div>
                    <div className="user-directory-access">
                      <div className="user-detail-block">
                        <span className="user-detail-label">Department</span>
                        <span>{department?.name ?? employee.departmentName ?? 'Unassigned'}</span>
                      </div>
                      <div className="user-detail-block">
                        <span className="user-detail-label">Joined</span>
                        <span>{formatDateOnly(employee.joiningDate)}</span>
                      </div>
                    </div>
                    <div className="user-directory-actions">
                      <NavLink className="text-button" to={`/hr/employees/${employee.id}`}>
                        <i className="bi bi-eye" aria-hidden="true" />
                        View
                      </NavLink>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function HrPerformancePage({
  branches,
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [fromDate, setFromDate] = useState(
    dateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)),
  );
  const [toDate, setToDate] = useState(dateInputValue(new Date()));
  const performanceFormRef = useRef<HTMLFormElement | null>(null);
  const [performanceForm, setPerformanceForm] = useState<HrPerformanceEntryFormState>(() =>
    defaultHrPerformanceEntryForm(),
  );
  const [salesBonusRuleForm, setSalesBonusRuleForm] = useState<HrPayrollSalesBonusRuleFormState>(
    () => defaultHrPayrollSalesBonusRuleForm(),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'performance'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const performanceQuery = useQuery({
    queryKey: ['hr', 'performance', fromDate, toDate, branchFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        fromDate,
        toDate,
      });
      if (branchFilter) params.set('branchId', branchFilter);
      return getHrPerformance(params);
    },
  });
  const attendanceQuery = useQuery({
    queryKey: ['hr', 'attendance', 'performance', fromDate, toDate],
    queryFn: () =>
      getHrAttendance(
        new URLSearchParams({
          page: '0',
          size: '200',
          fromDate,
          toDate,
        }),
      ),
  });
  const leavePageQuery = useQuery({
    queryKey: ['hr', 'leave', 'performance'],
    queryFn: getHrLeavePage,
  });

  const employees = employeesQuery.data?.items ?? [];
  const departments = departmentsQuery.data ?? [];
  const attendance = attendanceQuery.data?.items ?? [];
  const leaveRequests = leavePageQuery.data?.requests ?? [];
  const performanceSummaries = performanceQuery.data?.summaries ?? [];
  const performanceEntries = performanceQuery.data?.entries ?? [];
  const salesBonusRule =
    performanceQuery.data?.salesBonusRule ?? defaultHrPayrollSalesBonusRuleForm();
  const performanceSummaryByEmployee = new Map(
    performanceSummaries.map((summary) => [summary.employeeId, summary]),
  );
  const branchOptions = scopedActiveBranches(branches, currentUser);
  const employeeOptions = employees.filter(
    (employee) => !branchFilter || employee.branchId === branchFilter,
  );
  const performanceRows = buildPerformanceRows(
    employees,
    attendance,
    leaveRequests,
    performanceSummaryByEmployee,
  )
    .filter((row) => !branchFilter || row.branchId === branchFilter)
    .filter((row) => !departmentFilter || row.departmentId === departmentFilter);
  const periodSales = performanceRows.reduce((sum, row) => sum + row.actualSalesAmount, 0);
  const totalSalesForPay = performanceRows.reduce((sum, row) => sum + row.totalSalesAmount, 0);
  const basicSalaryTotal = performanceRows.reduce((sum, row) => sum + row.basicSalary, 0);
  const projectedNetPay = performanceRows.reduce((sum, row) => sum + row.projectedNetPay, 0);
  const totalBonuses = performanceRows.reduce((sum, row) => sum + row.bonusAmount, 0);
  const adminBonuses = performanceRows.reduce((sum, row) => sum + row.manualBonusAmount, 0);
  const automaticBonuses = performanceRows.reduce((sum, row) => sum + row.automaticBonusAmount, 0);
  const totalLosses = performanceRows.reduce((sum, row) => sum + row.lossAmount, 0);
  const qualifyingCashiers = performanceRows.filter((row) => row.qualifyingSalesDays > 0).length;
  const targetRuleConfigured =
    salesBonusRule.active &&
    salesBonusRule.dailySalesTarget > 0 &&
    salesBonusRule.bonusPerTargetDay > 0;
  const reviewQueue = performanceRows
    .filter((row) => row.score < 70 || row.employmentStatus === 'PROBATION')
    .sort((left, right) => left.score - right.score)
    .slice(0, 8);
  const departmentScores = departments
    .map((department) => {
      const rows = performanceRows.filter((row) => row.departmentId === department.id);
      return {
        name: department.name,
        score:
          rows.length === 0
            ? 0
            : Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length),
        employees: rows.length,
      };
    })
    .filter((row) => row.employees > 0);
  const savePerformanceMutation = useMutation({
    mutationFn: createHrPerformanceEntry,
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setPerformanceForm(defaultHrPerformanceEntryForm(entry.employeeId));
      setMessage(`${labelizeEnum(entry.entryType)} saved for ${entry.employeeName}.`);
    },
  });
  const saveSalesBonusRuleMutation = useMutation({
    mutationFn: updateHrPayrollSalesBonusRule,
    onSuccess: async (rule) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      setSalesBonusRuleForm(rule);
      setMessage('Cashier target bonus rule saved.');
    },
  });
  const syncUsersMutation = useMutation({
    mutationFn: syncHrEmployeesFromUsers,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      await queryClient.invalidateQueries({ queryKey: ['hr', 'performance'] });
      setMessage(userSyncMessage(result.createdCount, result.skippedCount));
      setError('');
    },
  });
  const isLoading =
    employeesQuery.isPending ||
    attendanceQuery.isPending ||
    leavePageQuery.isPending ||
    performanceQuery.isPending;

  useEffect(() => {
    if (!performanceQuery.data?.salesBonusRule) {
      return;
    }
    setSalesBonusRuleForm(performanceQuery.data.salesBonusRule);
  }, [
    performanceQuery.data?.salesBonusRule?.active,
    performanceQuery.data?.salesBonusRule?.bonusPerTargetDay,
    performanceQuery.data?.salesBonusRule?.dailySalesTarget,
  ]);

  async function handlePerformanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await savePerformanceMutation.mutateAsync({
        ...performanceForm,
        amount: performanceForm.entryType === 'PERFORMANCE_REVIEW' ? 0 : performanceForm.amount,
        score:
          performanceForm.entryType === 'PERFORMANCE_REVIEW' ? performanceForm.score : undefined,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Unable to save performance entry',
      );
    }
  }

  async function handleSalesBonusRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveSalesBonusRuleMutation.mutateAsync(salesBonusRuleForm);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to save cashier target bonus rule',
      );
    }
  }

  function setPerformanceEntryType(entryType: EmployeePerformanceEntryType) {
    setPerformanceForm((current) => ({
      ...current,
      entryType,
      title:
        entryType === 'BONUS' && !current.title
          ? 'Admin bonus'
          : entryType === 'LOSS' && !current.title
            ? 'Loss'
            : current.title,
      amount: entryType === 'PERFORMANCE_REVIEW' ? 0 : current.amount,
      score: entryType === 'PERFORMANCE_REVIEW' ? (current.score ?? 80) : undefined,
    }));
  }

  function startNormalBonus(row: HrPerformanceRow) {
    setPerformanceForm({
      ...defaultHrPerformanceEntryForm(row.employeeId),
      entryType: 'BONUS',
      title: 'Admin bonus',
      amount: 0,
      score: undefined,
    });
    performanceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSyncUsers() {
    setError('');
    setMessage('');
    try {
      await syncUsersMutation.mutateAsync();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to add system users');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Performance"
        subtitle="Review staff sales, target bonuses, losses, attendance reliability, and payroll impact."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button
              className="secondary-action compact-action"
              type="button"
              disabled={syncUsersMutation.isPending}
              onClick={handleSyncUsers}
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              {syncUsersMutation.isPending ? 'Adding...' : 'Add System Users'}
            </button>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-receipt"
          label="POS Sales"
          value={formatMoney(periodSales, organization.currencyCode)}
          detail={`${formatMoney(totalSalesForPay, organization.currencyCode)} total sales used for pay`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-person-vcard"
          label="Basic Salary"
          value={formatMoney(basicSalaryTotal, organization.currencyCode)}
          detail={`${performanceRows.length} staff in this view`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-trophy"
          label="Bonuses"
          value={formatMoney(totalBonuses, organization.currencyCode)}
          detail={`${formatMoney(automaticBonuses, organization.currencyCode)} target / ${formatMoney(
            adminBonuses,
            organization.currencyCode,
          )} admin`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-cash-stack"
          label="Projected Payout"
          value={formatMoney(projectedNetPay, organization.currencyCode)}
          detail={`${formatMoney(basicSalaryTotal, organization.currencyCode)} + ${formatMoney(
            totalBonuses,
            organization.currencyCode,
          )} - ${formatMoney(totalLosses, organization.currencyCode)}`}
          tone="purple"
        />
      </div>

      <div className="catalog-filter-bar hr-filter-bar">
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inventory-filter-field">
          <span>From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className="inventory-filter-field">
          <span>To</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </div>

      <FormMessages error={error} message={message} />

      <section className="panel-card branch-list-panel performance-pay-focus-panel">
        <PanelHeader
          icon="bi-calculator"
          title="Performance to Payroll"
          action={<span className="catalog-count-pill">{performanceRows.length} staff</span>}
        />
        {isLoading ? (
          <LoadingPanel label="Loading staff payout performance..." />
        ) : performanceRows.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No staff performance yet"
            detail="Employee salaries and POS sales will populate this payout view."
          />
        ) : (
          <>
            <div className="payroll-equation-strip">
              <span>
                <strong>{formatMoney(basicSalaryTotal, organization.currencyCode)}</strong>
                Basic salary
              </span>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(automaticBonuses, organization.currencyCode)}</strong>
                Target bonus
              </span>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(adminBonuses, organization.currencyCode)}</strong>
                Admin bonus
              </span>
              <i className="bi bi-dash-lg" aria-hidden="true" />
              <span>
                <strong>{formatMoney(totalLosses, organization.currencyCode)}</strong>
                Losses
              </span>
              <i className="bi bi-equals" aria-hidden="true" />
              <span className="payroll-equation-total">
                <strong>{formatMoney(projectedNetPay, organization.currencyCode)}</strong>
                Projected payout
              </span>
            </div>

            <div className="performance-payout-list">
              {performanceRows.map((row) => (
                <article className="performance-payout-row" key={row.employeeId}>
                  <div className="performance-payout-identity">
                    <span className="user-directory-icon">
                      {employeeInitials(row.employeeName)}
                    </span>
                    <span>
                      <strong>{row.employeeName}</strong>
                      <small>
                        {row.employeeNumber} - {row.branchName} -{' '}
                        {row.jobTitleTitle ?? row.departmentName ?? 'Unassigned'}
                      </small>
                    </span>
                  </div>
                  <div className="performance-payout-sales">
                    <span>POS sales</span>
                    <strong>{formatMoney(row.actualSalesAmount, organization.currencyCode)}</strong>
                    <small>
                      {row.salesDays.length} sale day{row.salesDays.length === 1 ? '' : 's'} /{' '}
                      {row.qualifyingSalesDays} target day
                      {row.qualifyingSalesDays === 1 ? '' : 's'}
                    </small>
                  </div>
                  <div className="performance-payout-equation">
                    <span>
                      Basic{' '}
                      <strong>{formatMoney(row.basicSalary, organization.currencyCode)}</strong>
                    </span>
                    <span>
                      Target{' '}
                      <strong>
                        {formatMoney(row.automaticBonusAmount, organization.currencyCode)}
                      </strong>
                    </span>
                    <span>
                      Admin{' '}
                      <strong>
                        {formatMoney(row.manualBonusAmount, organization.currencyCode)}
                      </strong>
                    </span>
                    <span>
                      Loss <strong>{formatMoney(row.lossAmount, organization.currencyCode)}</strong>
                    </span>
                  </div>
                  <div className="performance-payout-net">
                    <span>Pay this month</span>
                    <strong>{formatMoney(row.projectedNetPay, organization.currencyCode)}</strong>
                    <small>{row.paymentDestination}</small>
                  </div>
                  <div className="performance-row-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => startNormalBonus(row)}
                    >
                      <i className="bi bi-plus-circle" aria-hidden="true" />
                      Admin Bonus
                    </button>
                    <NavLink className="text-button" to={`/hr/employees/${row.employeeId}`}>
                      <i className="bi bi-eye" aria-hidden="true" />
                      View
                    </NavLink>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel-card performance-bonus-panel">
        <PanelHeader
          icon="bi-trophy"
          title="Cashier Target Bonuses"
          action={
            <StatusPill
              status={targetRuleConfigured ? 'posted' : 'pending'}
              label={targetRuleConfigured ? 'Active Rule' : 'Needs Setup'}
            />
          }
        />
        <div className="performance-bonus-grid">
          <form
            className="record-form payroll-compact-form performance-bonus-rule-form"
            onSubmit={handleSalesBonusRuleSubmit}
          >
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Daily Sales Target</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salesBonusRuleForm.dailySalesTarget}
                  onChange={(event) =>
                    setSalesBonusRuleForm((current) => ({
                      ...current,
                      dailySalesTarget: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Bonus Per Target Day</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salesBonusRuleForm.bonusPerTargetDay}
                  onChange={(event) =>
                    setSalesBonusRuleForm((current) => ({
                      ...current,
                      bonusPerTargetDay: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
            </div>
            <label className="field-stack inline-checkbox">
              <input
                type="checkbox"
                checked={salesBonusRuleForm.active}
                onChange={(event) =>
                  setSalesBonusRuleForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              <span>Automatically add this bonus when cashier sales meet or pass target</span>
            </label>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={saveSalesBonusRuleMutation.isPending}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {saveSalesBonusRuleMutation.isPending ? 'Saving...' : 'Save Target Bonus'}
            </button>
          </form>

          <div className="payroll-readiness-list performance-bonus-readiness">
            <div className="payroll-readiness-item">
              <i className="bi bi-graph-up-arrow" aria-hidden="true" />
              <span>
                <strong>
                  {formatMoney(salesBonusRule.dailySalesTarget, organization.currencyCode)} target
                </strong>
                <small>Daily sales threshold used for cashier bonus checks</small>
              </span>
            </div>
            <div className="payroll-readiness-item">
              <i className="bi bi-cash-coin" aria-hidden="true" />
              <span>
                <strong>
                  {formatMoney(salesBonusRule.bonusPerTargetDay, organization.currencyCode)} bonus
                </strong>
                <small>Added for each target day in this performance period</small>
              </span>
            </div>
            <div className="payroll-readiness-item">
              <i className="bi bi-people" aria-hidden="true" />
              <span>
                <strong>{qualifyingCashiers} qualifying cashier(s)</strong>
                <small>
                  {formatMoney(automaticBonuses, organization.currencyCode)} automatic bonuses in
                  view
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-form-panel">
          <PanelHeader
            icon="bi-clipboard2-plus"
            title="Record Review, Admin Bonus, or Loss"
            action={
              <span className="catalog-count-pill">
                {formatMoney(adminBonuses, organization.currencyCode)} admin bonuses
              </span>
            }
          />
          <div className="performance-entry-mode-actions">
            <button
              className={
                performanceForm.entryType === 'PERFORMANCE_REVIEW'
                  ? 'primary-action compact-action'
                  : 'secondary-action compact-action'
              }
              type="button"
              onClick={() => setPerformanceEntryType('PERFORMANCE_REVIEW')}
            >
              <i className="bi bi-star" aria-hidden="true" />
              Review
            </button>
            <button
              className={
                performanceForm.entryType === 'BONUS'
                  ? 'primary-action compact-action'
                  : 'secondary-action compact-action'
              }
              type="button"
              onClick={() => setPerformanceEntryType('BONUS')}
            >
              <i className="bi bi-plus-circle" aria-hidden="true" />
              Admin Bonus
            </button>
            <button
              className={
                performanceForm.entryType === 'LOSS'
                  ? 'primary-action compact-action'
                  : 'secondary-action compact-action'
              }
              type="button"
              onClick={() => setPerformanceEntryType('LOSS')}
            >
              <i className="bi bi-dash-circle" aria-hidden="true" />
              Loss
            </button>
            <button
              className={
                performanceForm.entryType === 'MANUAL_SALE'
                  ? 'primary-action compact-action'
                  : 'secondary-action compact-action'
              }
              type="button"
              onClick={() => setPerformanceEntryType('MANUAL_SALE')}
            >
              <i className="bi bi-receipt" aria-hidden="true" />
              Manual Sale
            </button>
          </div>
          <form
            ref={performanceFormRef}
            className="record-form hr-employee-form"
            onSubmit={handlePerformanceSubmit}
          >
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Employee</span>
                <select
                  required
                  value={performanceForm.employeeId}
                  onChange={(event) =>
                    setPerformanceForm((current) => ({
                      ...current,
                      employeeId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} ({employee.employeeNumber})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Type</span>
                <select
                  value={performanceForm.entryType}
                  onChange={(event) =>
                    setPerformanceEntryType(event.target.value as EmployeePerformanceEntryType)
                  }
                >
                  {performanceEntryTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-stack">
                <span>Date</span>
                <input
                  type="date"
                  required
                  value={performanceForm.entryDate}
                  onChange={(event) =>
                    setPerformanceForm((current) => ({ ...current, entryDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="report-date-grid">
              <label className="field-stack">
                <span>Title</span>
                <input
                  maxLength={160}
                  value={performanceForm.title}
                  onChange={(event) =>
                    setPerformanceForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Amount</span>
                <input
                  name="performance-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={performanceForm.entryType === 'PERFORMANCE_REVIEW'}
                  value={performanceForm.amount}
                  onChange={(event) =>
                    setPerformanceForm((current) => ({
                      ...current,
                      amount: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
              <label className="field-stack">
                <span>Score</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  disabled={performanceForm.entryType !== 'PERFORMANCE_REVIEW'}
                  value={performanceForm.score ?? 0}
                  onChange={(event) =>
                    setPerformanceForm((current) => ({
                      ...current,
                      score: Number(event.target.value || 0),
                    }))
                  }
                />
              </label>
            </div>
            <label className="field-stack">
              <span>Notes</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={performanceForm.notes}
                onChange={(event) =>
                  setPerformanceForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            <button
              className="primary-action compact-action"
              type="submit"
              disabled={savePerformanceMutation.isPending}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              {savePerformanceMutation.isPending ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader
            icon="bi-clock-history"
            title="Recent Staff Entries"
            action={<span className="catalog-count-pill">{performanceEntries.length} entries</span>}
          />
          {performanceQuery.isPending ? (
            <LoadingPanel label="Loading staff entries..." />
          ) : performanceEntries.length === 0 ? (
            <EmptyState
              icon="bi-clipboard2"
              title="No staff entries"
              detail="Bonuses, losses, reviews, and manual sales will appear here."
            />
          ) : (
            <div className="user-directory-list">
              {performanceEntries.slice(0, 8).map((entry) => (
                <article className="user-directory-row" key={entry.id}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-clipboard2-pulse" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{entry.employeeName}</strong>
                      <small>
                        {labelizeEnum(entry.entryType)} - {formatDateOnly(entry.entryDate)}
                      </small>
                    </span>
                  </div>
                  <div className="user-directory-access">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Title</span>
                      <span>{entry.title}</span>
                    </div>
                    <div className="user-detail-block">
                      <span className="user-detail-label">
                        {entry.entryType === 'PERFORMANCE_REVIEW' ? 'Score' : 'Amount'}
                      </span>
                      <span>
                        {entry.entryType === 'PERFORMANCE_REVIEW'
                          ? `${entry.score ?? 0}%`
                          : formatMoney(entry.amount ?? 0, organization.currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="user-directory-status">
                    <StatusPill
                      status={entry.entryType === 'LOSS' ? 'pending' : 'posted'}
                      label={labelizeEnum(entry.entryType)}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-bar-chart-line" title="Department Performance" />
          {isLoading ? (
            <LoadingPanel label="Loading performance chart..." />
          ) : departmentScores.length === 0 ? (
            <EmptyState
              icon="bi-bar-chart-line"
              title="No performance chart yet"
              detail="Attendance and employee assignments will populate this chart."
            />
          ) : (
            <div className="chart-wrap hr-dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={departmentScores}
                  margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e7eef8" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#49607a', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#49607a', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="score"
                    fill="#2878f0"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={52}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-eye" title="Review Queue" />
          {isLoading ? (
            <LoadingPanel label="Loading review queue..." />
          ) : reviewQueue.length === 0 ? (
            <EmptyState
              icon="bi-check2-circle"
              title="No reviews flagged"
              detail="Low score and probation employees will appear here."
            />
          ) : (
            <div className="user-directory-list">
              {reviewQueue.map((row) => (
                <article className="user-directory-row" key={row.employeeId}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className="bi bi-person-lines-fill" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{row.employeeName}</strong>
                      <small>{row.jobTitleTitle ?? 'Unassigned role'}</small>
                    </span>
                  </div>
                  <div className="user-directory-access">
                    <div className="user-detail-block">
                      <span className="user-detail-label">Score</span>
                      <span>{row.score}%</span>
                    </div>
                    <div className="user-detail-block">
                      <span className="user-detail-label">Attendance</span>
                      <span>{row.attendanceRate}%</span>
                    </div>
                  </div>
                  <div className="user-directory-actions">
                    <NavLink className="text-button" to={`/hr/employees/${row.employeeId}`}>
                      <i className="bi bi-eye" aria-hidden="true" />
                      View
                    </NavLink>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel-card branch-list-panel">
        <PanelHeader
          icon="bi-table"
          title="Employee Performance Matrix"
          action={<span className="catalog-count-pill">{performanceRows.length} employees</span>}
        />
        {isLoading ? (
          <LoadingPanel label="Loading employee performance..." />
        ) : performanceRows.length === 0 ? (
          <EmptyState
            icon="bi-people"
            title="No performance rows"
            detail="Add employees and attendance records to build the matrix."
          />
        ) : (
          <div className="responsive-table report-table hr-dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Actual Sales</th>
                  <th>Manual Sales</th>
                  <th>Target Days</th>
                  <th>Bonuses</th>
                  <th>Losses</th>
                  <th>Net Pay</th>
                  <th>Attendance</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.map((row) => (
                  <tr key={row.employeeId}>
                    <td data-label="Employee">
                      <strong>{row.employeeName}</strong>
                    </td>
                    <td data-label="Department">{row.departmentName ?? 'Unassigned'}</td>
                    <td data-label="Actual Sales">
                      {formatMoney(row.actualSalesAmount, organization.currencyCode)}
                      <br />
                      <small>{row.salesDays.length} sales day(s)</small>
                    </td>
                    <td data-label="Manual Sales">
                      {formatMoney(row.manualSalesAmount, organization.currencyCode)}
                    </td>
                    <td data-label="Target Days">
                      <strong>{row.qualifyingSalesDays}</strong>
                      <br />
                      <small>
                        {formatMoney(row.salesBonusTarget, organization.currencyCode)} target /
                        {formatMoney(row.salesBonusPerDay, organization.currencyCode)} bonus
                      </small>
                    </td>
                    <td data-label="Bonuses">
                      <strong>{formatMoney(row.bonusAmount, organization.currencyCode)}</strong>
                      <br />
                      <small>
                        Auto {formatMoney(row.automaticBonusAmount, organization.currencyCode)} /
                        Admin {formatMoney(row.manualBonusAmount, organization.currencyCode)}
                      </small>
                    </td>
                    <td data-label="Losses">
                      {formatMoney(row.lossAmount, organization.currencyCode)}
                    </td>
                    <td data-label="Net Pay">
                      <strong>{formatMoney(row.projectedNetPay, organization.currencyCode)}</strong>
                      <br />
                      <small>{row.paymentDestination}</small>
                    </td>
                    <td data-label="Attendance">{row.attendanceRate}%</td>
                    <td data-label="Score">{row.score}%</td>
                    <td data-label="Rating">
                      <StatusPill
                        status={row.score >= 85 ? 'posted' : row.score >= 70 ? 'review' : 'pending'}
                        label={row.rating}
                      />
                    </td>
                    <td data-label="Actions">
                      <div className="performance-row-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => startNormalBonus(row)}
                        >
                          <i className="bi bi-plus-circle" aria-hidden="true" />
                          Bonus
                        </button>
                        <NavLink className="text-button" to={`/hr/employees/${row.employeeId}`}>
                          <i className="bi bi-eye" aria-hidden="true" />
                          View
                        </NavLink>
                      </div>
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

function HrDocumentsPage({
  branches,
  currentUser,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [branchFilter, setBranchFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [uploadForm, setUploadForm] = useState<{
    employeeId: string;
    documentType: string;
    title: string;
    notes: string;
    file: File | null;
  }>(() => ({
    employeeId: '',
    documentType: 'Employment Contract',
    title: '',
    notes: '',
    file: null,
  }));
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'documents'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const documentsQuery = useQuery({
    queryKey: ['hr', 'documents', branchFilter, employeeFilter, documentTypeFilter, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchFilter) {
        params.set('branchId', branchFilter);
      }
      if (employeeFilter) {
        params.set('employeeId', employeeFilter);
      }
      if (documentTypeFilter) {
        params.set('documentType', documentTypeFilter);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      return getHrDocuments(params);
    },
  });
  const uploadDocumentMutation = useMutation({
    mutationFn: uploadHrDocument,
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'documents'] });
      setSelectedDocument(document);
      setPreviewUrl('');
      setPreviewError('');
      setPreviewLoading(false);
      setUploadMessage(`Stored ${document.title} for ${document.employeeName}.`);
      setUploadError('');
      setUploadForm((current) => ({ ...current, title: '', notes: '', file: null }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      setUploadMessage('');
      setUploadError(error.message);
    },
  });
  const employees = employeesQuery.data?.items ?? [];
  const documents = documentsQuery.data ?? [];
  const branchOptions = scopedActiveBranches(branches, currentUser);
  const employeeOptions = employees.filter(
    (employee) => !branchFilter || employee.branchId === branchFilter,
  );
  const coveredEmployeeIds = new Set(documents.map((document) => document.employeeId));
  const identityDocumentCount = documents.filter((document) =>
    ['national id', 'kra pin', 'passport photo'].includes(document.documentType.toLowerCase()),
  ).length;
  const contractDocumentCount = documents.filter((document) =>
    document.documentType.toLowerCase().includes('contract'),
  ).length;
  const totalStoredBytes = documents.reduce((sum, document) => sum + document.sizeBytes, 0);
  const isUploading = uploadDocumentMutation.isPending;

  useEffect(() => {
    if (branchFilter && employeeFilter) {
      const selectedEmployee = employees.find((employee) => employee.id === employeeFilter);
      if (selectedEmployee && selectedEmployee.branchId !== branchFilter) {
        setEmployeeFilter('');
      }
    }
  }, [branchFilter, employeeFilter, employees]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleExportDocuments() {
    exportHrDocumentsCsv(documents);
  }

  function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError('');
    setUploadMessage('');

    if (!uploadForm.employeeId) {
      setUploadError('Select an employee before uploading a document.');
      return;
    }
    if (!uploadForm.documentType) {
      setUploadError('Select a document type.');
      return;
    }
    if (!uploadForm.file) {
      setUploadError('Choose a file to upload.');
      return;
    }

    uploadDocumentMutation.mutate({
      employeeId: uploadForm.employeeId,
      documentType: uploadForm.documentType,
      title: uploadForm.title,
      notes: uploadForm.notes,
      file: uploadForm.file,
    });
  }

  async function handleViewDocument(document: EmployeeDocument) {
    setSelectedDocument(document);
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const blob = await downloadHrDocument(document.id);
      const nextUrl = URL.createObjectURL(blob);
      setPreviewUrl(nextUrl);
    } catch (error) {
      setPreviewUrl('');
      setPreviewError(error instanceof Error ? error.message : 'Document could not be opened.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownloadDocument(document: EmployeeDocument) {
    setPreviewError('');
    try {
      const blob = await downloadHrDocument(document.id);
      downloadBlob(document.fileName, blob);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Document could not be downloaded.');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        eyebrow="Human resources"
        title="Documents"
        subtitle="Upload, store, preview, and download employee contracts, IDs, payroll evidence, and related HR files."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button
              className="primary-action compact-action"
              type="button"
              disabled={documents.length === 0}
              onClick={handleExportDocuments}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Export List
            </button>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-folder-check"
          label="Stored Files"
          value={String(documents.length)}
          detail="uploaded HR documents"
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-people"
          label="Employees Covered"
          value={String(coveredEmployeeIds.size)}
          detail={`${employees.length} employee records loaded`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-person-vcard"
          label="IDs Stored"
          value={String(identityDocumentCount)}
          detail="ID, PIN, or photo files"
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-file-earmark-text"
          label="Contracts"
          value={String(contractDocumentCount)}
          detail={`${formatFileSize(totalStoredBytes)} total storage`}
          tone="purple"
        />
      </div>

      <div className="catalog-filter-bar hr-filter-bar">
        <label className="inventory-filter-field">
          <span>Search</span>
          <input
            placeholder="Employee, title, or file"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
          >
            <option value="">All employees</option>
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={documentTypeFilter}
            onChange={(event) => setDocumentTypeFilter(event.target.value)}
          >
            <option value="">All document types</option>
            {hrDocumentTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="management-grid hr-attendance-layout hr-documents-layout">
        <section className="panel-card branch-form-panel">
          <PanelHeader icon="bi-cloud-arrow-up" title="Upload Employee Document" />
          {uploadError ? (
            <p className="message-banner error" role="alert">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
              {uploadError}
            </p>
          ) : null}
          {uploadMessage ? (
            <p className="message-banner success" role="status">
              <i className="bi bi-check-circle-fill" aria-hidden="true" />
              {uploadMessage}
            </p>
          ) : null}
          <form className="record-form hr-document-upload-form" onSubmit={handleUploadSubmit}>
            <label className="field-stack wide-field">
              <span>Employee</span>
              <select
                value={uploadForm.employeeId}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, employeeId: event.target.value }))
                }
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} - {employee.employeeNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Document Type</span>
              <select
                value={uploadForm.documentType}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, documentType: event.target.value }))
                }
              >
                {hrDocumentTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Title</span>
              <input
                maxLength={160}
                placeholder="Signed contract, National ID copy..."
                value={uploadForm.title}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className="field-stack wide-field" htmlFor={fileInputId}>
              <span>File</span>
              <input
                id={fileInputId}
                ref={fileInputRef}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
                type="file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setUploadForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] ?? null,
                  }))
                }
              />
              <small>PDF, images, text, Word, and Excel files up to 10 MB.</small>
            </label>
            <label className="field-stack wide-field">
              <span>Notes</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={uploadForm.notes}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
            <div className="form-actions wide-field">
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={isUploading}
              >
                <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel hr-document-preview-panel">
          <PanelHeader
            icon="bi-file-earmark-richtext"
            title={selectedDocument ? selectedDocument.title : 'Document Preview'}
          />
          {previewError ? (
            <p className="message-banner error" role="alert">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />
              {previewError}
            </p>
          ) : null}
          {!selectedDocument ? (
            <EmptyState
              icon="bi-file-earmark"
              title="No document selected"
              detail="Choose View on a stored employee document to preview it here."
            />
          ) : previewLoading ? (
            <LoadingPanel label="Opening document..." />
          ) : previewUrl && isPreviewableHrDocument(selectedDocument) ? (
            <div className="hr-document-preview">
              {isImageHrDocument(selectedDocument) ? (
                <img src={previewUrl} alt={selectedDocument.title} />
              ) : (
                <iframe src={previewUrl} title={selectedDocument.title} />
              )}
            </div>
          ) : (
            <div className="user-directory-list">
              <HrReadinessRow
                icon="bi-file-earmark-lock"
                title={selectedDocument.fileName}
                detail="This file is stored securely and can be downloaded for viewing."
                ready
              />
            </div>
          )}
          {selectedDocument ? (
            <div className="hr-document-preview-meta">
              <ProfileFact label="Employee" value={selectedDocument.employeeName} />
              <ProfileFact label="Type" value={selectedDocument.documentType} />
              <ProfileFact label="Size" value={formatFileSize(selectedDocument.sizeBytes)} />
              <ProfileFact label="Uploaded" value={formatDateTime(selectedDocument.uploadedAt)} />
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => handleDownloadDocument(selectedDocument)}
              >
                <i className="bi bi-download" aria-hidden="true" />
                Download
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <section className="panel-card branch-list-panel">
        <PanelHeader
          icon="bi-folder2-open"
          title="Stored Employee Documents"
          action={<span className="catalog-count-pill">{documents.length} files</span>}
        />
        {documentsQuery.isPending || employeesQuery.isPending ? (
          <LoadingPanel label="Loading employee documents..." />
        ) : documentsQuery.isError ? (
          <EmptyState
            icon="bi-exclamation-circle"
            title="Documents could not be loaded"
            detail="Refresh the page or try again after the API is available."
          />
        ) : documents.length === 0 ? (
          <EmptyState
            icon="bi-folder2-open"
            title="No employee documents"
            detail="Upload contracts, IDs, or supporting records to build the employee file archive."
          />
        ) : (
          <div className="responsive-table report-table hr-dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document</th>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td data-label="Employee">
                      <span className="table-label">
                        <i className="bi bi-person" aria-hidden="true" />
                        <span>
                          <strong>{document.employeeName}</strong>
                          <small>
                            {document.employeeNumber} - {document.branchName}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Document">
                      <strong>{document.title}</strong>
                      <small>{document.documentType}</small>
                      {document.notes ? <small>{document.notes}</small> : null}
                    </td>
                    <td data-label="File">
                      <strong>{document.fileName}</strong>
                      <small>
                        {document.contentType} - {formatFileSize(document.sizeBytes)}
                      </small>
                    </td>
                    <td data-label="Uploaded">
                      <strong>{formatDateTime(document.uploadedAt)}</strong>
                      <small>{document.uploadedByUserDisplayName ?? 'HR user'}</small>
                    </td>
                    <td data-label="Actions">
                      <span className="table-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => handleViewDocument(document)}
                        >
                          <i className="bi bi-eye" aria-hidden="true" />
                          View
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => handleDownloadDocument(document)}
                        >
                          <i className="bi bi-download" aria-hidden="true" />
                          Download
                        </button>
                        <NavLink
                          className="text-button"
                          to={`/hr/employees/${document.employeeId}`}
                        >
                          <i className="bi bi-eye" aria-hidden="true" />
                          Profile
                        </NavLink>
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

function HrReportsPage({
  branches,
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const [branchFilter, setBranchFilter] = useState('');
  const [reportScope, setReportScope] = useState<'summary' | 'detail'>('summary');
  const fromDate = dateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const toDate = dateInputValue(new Date());
  const departmentsQuery = useQuery({ queryKey: ['hr', 'departments'], queryFn: getHrDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['hr', 'job-titles'], queryFn: getHrJobTitles });
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'reports'],
    queryFn: () =>
      getHrEmployees(new URLSearchParams({ page: '0', size: '200', sort: 'lastName,asc' })),
  });
  const attendanceQuery = useQuery({
    queryKey: ['hr', 'attendance', 'reports', fromDate, toDate],
    queryFn: () =>
      getHrAttendance(
        new URLSearchParams({
          page: '0',
          size: '200',
          fromDate,
          toDate,
        }),
      ),
  });
  const leavePageQuery = useQuery({
    queryKey: ['hr', 'leave', 'reports'],
    queryFn: getHrLeavePage,
  });
  const payrollQuery = useQuery({
    queryKey: ['hr', 'payroll', 'reports'],
    queryFn: getHrPayrollPage,
  });

  const branchOptions = scopedActiveBranches(branches, currentUser);
  const summary = buildHrReportSummary({
    branches: branchOptions,
    branchFilter,
    employees: employeesQuery.data?.items ?? [],
    attendance: attendanceQuery.data?.items ?? [],
    leavePage: leavePageQuery.data,
    payrollPage: payrollQuery.data,
    departments: departmentsQuery.data ?? [],
    jobTitles: jobTitlesQuery.data ?? [],
  });
  const reportCards = [
    {
      type: 'workforce' as const,
      icon: 'bi-people',
      title: 'Workforce Census',
      detail: `${summary.scopedEmployees.length} employees across ${summary.branchCount} branches`,
      count: summary.scopedEmployees.length,
    },
    {
      type: 'attendance' as const,
      icon: 'bi-calendar2-check',
      title: 'Attendance Register',
      detail: `${summary.attendance.length} records from ${formatReportDateInput(fromDate)} to ${formatReportDateInput(toDate)}`,
      count: summary.attendance.length,
    },
    {
      type: 'leave' as const,
      icon: 'bi-calendar-week',
      title: 'Leave Liability',
      detail: `${summary.leaveRequests.length} requests and ${summary.leaveBalances.length} balances`,
      count: summary.leaveRequests.length,
    },
    {
      type: 'payroll' as const,
      icon: 'bi-wallet2',
      title: 'Payroll Summary',
      detail: `${summary.payrollRuns.length} payroll runs`,
      count: summary.payrollRuns.length,
    },
    {
      type: 'structure' as const,
      icon: 'bi-diagram-3',
      title: 'Org Structure',
      detail: `${summary.departments.length} departments and ${summary.jobTitles.length} job titles`,
      count: summary.departments.length + summary.jobTitles.length,
    },
  ];
  const isLoading =
    departmentsQuery.isPending ||
    jobTitlesQuery.isPending ||
    employeesQuery.isPending ||
    attendanceQuery.isPending ||
    leavePageQuery.isPending ||
    payrollQuery.isPending;

  return (
    <section className="branch-workspace reports-center">
      <PageHeader
        eyebrow="Human resources"
        title="HR Reports"
        subtitle="Export workforce, attendance, leave, payroll, and organization structure reports from live HR data."
        action={
          <div className="hr-employee-page-actions">
            <HrBackButton />
            <button
              className="primary-action compact-action"
              type="button"
              disabled={isLoading}
              onClick={() => exportHrReportsWorkbook(summary, organization)}
            >
              <i className="bi bi-download" aria-hidden="true" />
              Export Workbook
            </button>
          </div>
        }
      />

      <div className="hr-kpi-grid hr-attendance-summary-grid">
        <HrDashboardMetricCard
          icon="bi-people"
          label="Employees"
          value={String(summary.scopedEmployees.length)}
          detail={`${summary.activeEmployees} active`}
          tone="blue"
        />
        <HrDashboardMetricCard
          icon="bi-calendar2-check"
          label="Attendance Rate"
          value={`${summary.attendanceRate}%`}
          detail={`${summary.lateCount} late records`}
          tone="green"
        />
        <HrDashboardMetricCard
          icon="bi-calendar-week"
          label="Pending Leave"
          value={String(summary.pendingLeave)}
          detail={`${summary.availableLeaveDays} available days`}
          tone="orange"
        />
        <HrDashboardMetricCard
          icon="bi-cash-stack"
          label="Net Payroll"
          value={formatMoney(summary.netPayroll, organization.currencyCode)}
          detail={`${summary.payrollRuns.length} runs`}
          tone="purple"
        />
      </div>

      <div className="catalog-filter-bar hr-filter-bar">
        <label className="select-shell catalog-filter-select">
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="select-shell catalog-filter-select">
          <select
            value={reportScope}
            onChange={(event) => setReportScope(event.target.value as 'summary' | 'detail')}
          >
            <option value="summary">Summary view</option>
            <option value="detail">Detailed view</option>
          </select>
        </label>
      </div>

      <div className="management-grid hr-attendance-layout">
        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-pie-chart" title="Headcount by Department" />
          {isLoading ? (
            <LoadingPanel label="Loading department report..." />
          ) : summary.departmentDistribution.length === 0 ? (
            <EmptyState
              icon="bi-pie-chart"
              title="No department data"
              detail="Assign employees to departments to populate this report."
            />
          ) : (
            <DonutChart
              centerValue={String(summary.scopedEmployees.length)}
              centerLabel="Employees"
              currencyCode={organization.currencyCode}
              data={summary.departmentDistribution}
              valueFormatter={(value) => `${value} employees`}
            />
          )}
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-bar-chart" title="Report Library" />
          {isLoading ? (
            <LoadingPanel label="Loading report library..." />
          ) : (
            <div className="user-directory-list">
              {reportCards.map((card) => (
                <article className="user-directory-row" key={card.type}>
                  <div className="user-directory-identity">
                    <span className="user-directory-icon">
                      <i className={`bi ${card.icon}`} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{card.title}</strong>
                      <small>{card.detail}</small>
                    </span>
                  </div>
                  <div className="user-directory-status">
                    <span className="catalog-count-pill">{card.count}</span>
                  </div>
                  <div className="user-directory-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => exportHrReportCsv(card.type, summary, organization)}
                    >
                      <i className="bi bi-download" aria-hidden="true" />
                      CSV
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel-card branch-list-panel">
        <PanelHeader
          icon="bi-table"
          title={reportScope === 'summary' ? 'Executive HR Summary' : 'Detailed Employee Register'}
          action={
            <span className="catalog-count-pill">{summary.scopedEmployees.length} employees</span>
          }
        />
        {isLoading ? (
          <LoadingPanel label="Loading HR report..." />
        ) : summary.scopedEmployees.length === 0 ? (
          <EmptyState
            icon="bi-table"
            title="No HR report rows"
            detail="Add employees or adjust filters to view report data."
          />
        ) : reportScope === 'summary' ? (
          <div className="responsive-table report-table hr-dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {summaryRowsForHrReports(summary, organization).map((row) => (
                  <tr key={row.metric}>
                    <td data-label="Metric">
                      <strong>{row.metric}</strong>
                    </td>
                    <td data-label="Value">{row.value}</td>
                    <td data-label="Context">{row.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="responsive-table report-table hr-dashboard-table">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Number</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {summary.scopedEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td data-label="Employee">
                      <strong>{employee.fullName}</strong>
                    </td>
                    <td data-label="Number">{employee.employeeNumber}</td>
                    <td data-label="Branch">{employee.branchName}</td>
                    <td data-label="Department">{employee.departmentName ?? 'Unassigned'}</td>
                    <td data-label="Job Title">{employee.jobTitleTitle ?? 'Unassigned'}</td>
                    <td data-label="Status">{labelizeEnum(employee.employmentStatus)}</td>
                    <td data-label="Joined">{formatDateOnly(employee.joiningDate)}</td>
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

type HrRecruitmentStage = 'Sourcing' | 'Screening' | 'Pipeline Ready';
type HrRecruitmentPriority = 'High' | 'Medium' | 'Covered';

type HrRecruitmentRow = {
  jobTitleId: string;
  title: string;
  departmentId: string;
  departmentName: string;
  branchId?: string;
  branchName: string;
  headcount: number;
  stage: HrRecruitmentStage;
  priority: HrRecruitmentPriority;
};

type HrPerformanceRow = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleTitle?: string;
  employmentStatus: EmployeeEmploymentStatus;
  attendanceRate: number;
  lateCount: number;
  leaveDays: number;
  overtimeMinutes: number;
  basicSalary: number;
  actualSalesAmount: number;
  manualSalesAmount: number;
  bonusAmount: number;
  automaticBonusAmount: number;
  manualBonusAmount: number;
  lossAmount: number;
  totalSalesAmount: number;
  salesDays: EmployeePerformanceSummary['salesDays'];
  qualifyingSalesDays: number;
  salesBonusTarget: number;
  salesBonusPerDay: number;
  projectedNetPay: number;
  paymentDestination: string;
  score: number;
  rating: string;
};

type HrReportType = 'workforce' | 'attendance' | 'leave' | 'payroll' | 'structure';

type HrReportSummary = {
  branchCount: number;
  scopedEmployees: EmployeeSummary[];
  activeEmployees: number;
  attendance: AttendanceRecord[];
  attendanceRate: number;
  lateCount: number;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequestRecord[];
  pendingLeave: number;
  availableLeaveDays: number;
  payrollComponents: PayrollComponent[];
  payrollPeriods: PayrollPeriod[];
  payrollRuns: PayrollRun[];
  grossPayroll: number;
  netPayroll: number;
  departments: Department[];
  jobTitles: JobTitle[];
  departmentDistribution: { name: string; value: number; percent: number; color: string }[];
};

function scopedActiveBranches(branches: Branch[], currentUser: CurrentUser) {
  return currentUser.branchIds.length === 0
    ? branches.filter((branch) => branch.status === 'ACTIVE')
    : branches.filter(
        (branch) => branch.status === 'ACTIVE' && currentUser.branchIds.includes(branch.id),
      );
}

function buildRecruitmentRows(
  jobTitles: JobTitle[],
  departments: Department[],
  employees: EmployeeSummary[],
): HrRecruitmentRow[] {
  const departmentById = new Map(departments.map((department) => [department.id, department]));

  return jobTitles
    .filter((jobTitle) => jobTitle.active)
    .map((jobTitle) => {
      const department = departmentById.get(jobTitle.departmentId);
      const activeEmployees = employees.filter(
        (employee) => employee.active && employee.jobTitleId === jobTitle.id,
      );
      const headcount = activeEmployees.length;
      const stage: HrRecruitmentStage =
        headcount === 0 ? 'Sourcing' : headcount < 2 ? 'Screening' : 'Pipeline Ready';
      const priority: HrRecruitmentPriority =
        headcount === 0 ? 'High' : headcount < 2 ? 'Medium' : 'Covered';

      return {
        jobTitleId: jobTitle.id,
        title: jobTitle.title,
        departmentId: jobTitle.departmentId,
        departmentName: department?.name ?? jobTitle.departmentName,
        branchId: department?.branchId,
        branchName: department?.branchName ?? 'All branches',
        headcount,
        stage,
        priority,
      };
    })
    .sort(
      (left, right) =>
        left.departmentName.localeCompare(right.departmentName) ||
        left.title.localeCompare(right.title),
    );
}

function daysSince(dateValue: string) {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

function HrReadinessRow({
  icon,
  title,
  detail,
  ready,
}: {
  icon: string;
  title: string;
  detail: string;
  ready: boolean;
}) {
  return (
    <article className="user-directory-row">
      <div className="user-directory-identity">
        <span className="user-directory-icon">
          <i className={`bi ${icon}`} aria-hidden="true" />
        </span>
        <span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
      </div>
      <div className="user-directory-status">
        <StatusPill status={ready ? 'posted' : 'pending'} label={ready ? 'Ready' : 'Needs setup'} />
      </div>
    </article>
  );
}

function buildPerformanceRows(
  employees: EmployeeSummary[],
  attendance: AttendanceRecord[],
  leaveRequests: LeaveRequestRecord[],
  performanceSummaryByEmployee: Map<string, EmployeePerformanceSummary>,
): HrPerformanceRow[] {
  const attendanceByEmployee = new Map<string, AttendanceRecord[]>();
  attendance.forEach((record) => {
    const rows = attendanceByEmployee.get(record.employeeId) ?? [];
    rows.push(record);
    attendanceByEmployee.set(record.employeeId, rows);
  });

  const leaveDaysByEmployee = new Map<string, number>();
  leaveRequests
    .filter((request) => request.status === 'APPROVED')
    .forEach((request) => {
      leaveDaysByEmployee.set(
        request.employeeId,
        (leaveDaysByEmployee.get(request.employeeId) ?? 0) + request.requestedDays,
      );
    });

  return employees
    .map((employee) => {
      const summary = performanceSummaryByEmployee.get(employee.id);
      const employeeAttendance = attendanceByEmployee.get(employee.id) ?? [];
      const presentRecords = employeeAttendance.filter((record) =>
        ['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status),
      ).length;
      const lateCount = employeeAttendance.filter((record) => record.status === 'LATE').length;
      const attendanceRate =
        employeeAttendance.length === 0
          ? employee.active
            ? 100
            : 0
          : Math.round((presentRecords / employeeAttendance.length) * 100);
      const punctualityRate =
        employeeAttendance.length === 0
          ? 100
          : Math.round(((employeeAttendance.length - lateCount) / employeeAttendance.length) * 100);
      const leaveDays = leaveDaysByEmployee.get(employee.id) ?? 0;
      const overtimeMinutes = employeeAttendance.reduce(
        (sum, record) => sum + record.overtimeMinutes,
        0,
      );
      const attendanceScore = clampPercent(
        Math.round(
          attendanceRate * 0.55 +
            punctualityRate * 0.25 +
            (employee.active ? 20 : 8) -
            Math.min(leaveDays, 15),
        ),
      );
      const score = summary?.averagePerformanceScore ?? attendanceScore;
      const rating = score >= 85 ? 'Exceeds' : score >= 70 ? 'Meets' : 'Needs Support';

      return {
        employeeId: employee.id,
        employeeName: employee.fullName,
        employeeNumber: employee.employeeNumber,
        branchId: employee.branchId,
        branchName: employee.branchName,
        departmentId: employee.departmentId,
        departmentName: employee.departmentName,
        jobTitleTitle: employee.jobTitleTitle,
        employmentStatus: employee.employmentStatus,
        attendanceRate,
        lateCount,
        leaveDays,
        overtimeMinutes,
        basicSalary: summary?.basicSalary ?? employee.basicSalary ?? 0,
        actualSalesAmount: summary?.actualSalesAmount ?? 0,
        manualSalesAmount: summary?.manualSalesAmount ?? 0,
        bonusAmount: summary?.bonusAmount ?? 0,
        automaticBonusAmount: summary?.automaticBonusAmount ?? 0,
        manualBonusAmount: summary?.manualBonusAmount ?? 0,
        lossAmount: summary?.lossAmount ?? 0,
        totalSalesAmount: summary?.totalSalesAmount ?? 0,
        salesDays: summary?.salesDays ?? [],
        qualifyingSalesDays: summary?.qualifyingSalesDays ?? 0,
        salesBonusTarget: summary?.salesBonusTarget ?? 0,
        salesBonusPerDay: summary?.salesBonusPerDay ?? 0,
        projectedNetPay: summary?.projectedNetPay ?? employee.basicSalary ?? 0,
        paymentDestination: summary?.paymentDestination ?? 'Not configured',
        score,
        rating,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.employeeName.localeCompare(right.employeeName),
    );
}

function buildHrReportSummary({
  branches,
  branchFilter,
  employees,
  attendance,
  leavePage,
  payrollPage,
  departments,
  jobTitles,
}: {
  branches: Branch[];
  branchFilter: string;
  employees: EmployeeSummary[];
  attendance: AttendanceRecord[];
  leavePage?: LeavePage;
  payrollPage?: PayrollPage;
  departments: Department[];
  jobTitles: JobTitle[];
}): HrReportSummary {
  const scopedEmployees = employees.filter(
    (employee) => !branchFilter || employee.branchId === branchFilter,
  );
  const scopedEmployeeIds = new Set(scopedEmployees.map((employee) => employee.id));
  const scopedAttendance = attendance.filter((record) => scopedEmployeeIds.has(record.employeeId));
  const leaveTypes = leavePage?.leaveTypes ?? [];
  const leaveBalances = (leavePage?.balances ?? []).filter((balance) =>
    scopedEmployeeIds.has(balance.employeeId),
  );
  const leaveRequests = (leavePage?.requests ?? []).filter((request) =>
    scopedEmployeeIds.has(request.employeeId),
  );
  const payrollRuns = (payrollPage?.runs ?? []).filter(
    (run) => !branchFilter || run.branchId === branchFilter || !run.branchId,
  );
  const grossPayroll = payrollRuns
    .flatMap((run) => run.employees)
    .reduce((sum, employee) => sum + employee.grossPay, 0);
  const netPayroll = payrollRuns
    .flatMap((run) => run.employees)
    .reduce((sum, employee) => sum + employee.netPay, 0);
  const presentRecords = scopedAttendance.filter((record) =>
    ['PRESENT', 'LATE', 'HALF_DAY'].includes(record.status),
  ).length;
  const attendanceRate =
    scopedAttendance.length === 0
      ? 0
      : Math.round((presentRecords / scopedAttendance.length) * 100);
  const colors = ['#2878f0', '#22c55e', '#fb923c', '#8b5cf6', '#ec4899', '#0ea5e9'];
  const departmentDistribution = departments
    .map((department, index) => {
      const value = scopedEmployees.filter(
        (employee) => employee.departmentId === department.id,
      ).length;
      return {
        name: department.name,
        value,
        percent:
          scopedEmployees.length === 0 ? 0 : Math.round((value / scopedEmployees.length) * 100),
        color: colors[index % colors.length],
      };
    })
    .filter((entry) => entry.value > 0);
  const unassignedEmployees = scopedEmployees.filter((employee) => !employee.departmentId).length;
  if (unassignedEmployees > 0) {
    departmentDistribution.push({
      name: 'Unassigned',
      value: unassignedEmployees,
      percent:
        scopedEmployees.length === 0
          ? 0
          : Math.round((unassignedEmployees / scopedEmployees.length) * 100),
      color: '#64748b',
    });
  }

  return {
    branchCount: branchFilter ? 1 : branches.length,
    scopedEmployees,
    activeEmployees: scopedEmployees.filter((employee) => employee.active).length,
    attendance: scopedAttendance,
    attendanceRate,
    lateCount: scopedAttendance.filter((record) => record.status === 'LATE').length,
    leaveTypes,
    leaveBalances,
    leaveRequests,
    pendingLeave: leaveRequests.filter((request) => request.status === 'PENDING_APPROVAL').length,
    availableLeaveDays: leaveBalances.reduce((sum, balance) => sum + balance.availableDays, 0),
    payrollComponents: payrollPage?.components ?? [],
    payrollPeriods: payrollPage?.periods ?? [],
    payrollRuns,
    grossPayroll,
    netPayroll,
    departments,
    jobTitles,
    departmentDistribution,
  };
}

function summaryRowsForHrReports(summary: HrReportSummary, organization: Organization) {
  return [
    {
      metric: 'Employees',
      value: String(summary.scopedEmployees.length),
      context: `${summary.activeEmployees} active employees`,
    },
    {
      metric: 'Attendance rate',
      value: `${summary.attendanceRate}%`,
      context: `${summary.attendance.length} records, ${summary.lateCount} late`,
    },
    {
      metric: 'Leave requests',
      value: String(summary.leaveRequests.length),
      context: `${summary.pendingLeave} pending approvals`,
    },
    {
      metric: 'Available leave days',
      value: String(summary.availableLeaveDays),
      context: `${summary.leaveBalances.length} leave balance rows`,
    },
    {
      metric: 'Gross payroll',
      value: formatMoney(summary.grossPayroll, organization.currencyCode),
      context: `${summary.payrollRuns.length} payroll runs`,
    },
    {
      metric: 'Net payroll',
      value: formatMoney(summary.netPayroll, organization.currencyCode),
      context: `${summary.payrollComponents.length} payroll components`,
    },
    {
      metric: 'Structure',
      value: `${summary.departments.length} departments`,
      context: `${summary.jobTitles.length} job titles`,
    },
  ];
}

function exportHrDocumentsCsv(documents: EmployeeDocument[]) {
  downloadCsv('keen-hr-documents.csv', [
    [
      'Employee',
      'Employee Number',
      'Branch',
      'Document Type',
      'Title',
      'File Name',
      'Content Type',
      'Size Bytes',
      'Uploaded At',
      'Uploaded By',
      'Notes',
    ],
    ...documents.map((document) => [
      document.employeeName,
      document.employeeNumber,
      document.branchName,
      document.documentType,
      document.title,
      document.fileName,
      document.contentType,
      document.sizeBytes,
      formatDateTime(document.uploadedAt),
      document.uploadedByUserDisplayName ?? '',
      document.notes ?? '',
    ]),
  ]);
}

function exportHrReportsWorkbook(summary: HrReportSummary, organization: Organization) {
  downloadWorkbookRows('keen-hr-reports.xlsx', 'HR Reports', [
    ['Executive Summary'],
    ['Metric', 'Value', 'Context'],
    ...summaryRowsForHrReports(summary, organization).map((row) => [
      row.metric,
      row.value,
      row.context,
    ]),
    [],
    ['Employee Register'],
    ['Employee', 'Number', 'Branch', 'Department', 'Job Title', 'Status', 'Joined'],
    ...summary.scopedEmployees.map((employee) => [
      employee.fullName,
      employee.employeeNumber,
      employee.branchName,
      employee.departmentName ?? 'Unassigned',
      employee.jobTitleTitle ?? 'Unassigned',
      labelizeEnum(employee.employmentStatus),
      employee.joiningDate,
    ]),
    [],
    ['Attendance Register'],
    ['Employee', 'Date', 'Branch', 'Status', 'Worked Minutes', 'Overtime Minutes', 'Late Minutes'],
    ...summary.attendance.map((record) => [
      record.employeeName,
      record.attendanceDate,
      record.branchName,
      labelizeEnum(record.status),
      record.workedMinutes,
      record.overtimeMinutes,
      record.lateMinutes,
    ]),
  ]);
}

function exportHrReportCsv(
  reportType: HrReportType,
  summary: HrReportSummary,
  organization: Organization,
) {
  switch (reportType) {
    case 'workforce':
      downloadCsv('keen-hr-workforce.csv', [
        [
          'Employee',
          'Number',
          'Branch',
          'Department',
          'Job Title',
          'Employment Type',
          'Status',
          'Joined',
        ],
        ...summary.scopedEmployees.map((employee) => [
          employee.fullName,
          employee.employeeNumber,
          employee.branchName,
          employee.departmentName ?? 'Unassigned',
          employee.jobTitleTitle ?? 'Unassigned',
          labelizeEnum(employee.employmentType),
          labelizeEnum(employee.employmentStatus),
          employee.joiningDate,
        ]),
      ]);
      break;
    case 'attendance':
      downloadCsv('keen-hr-attendance.csv', [
        [
          'Employee',
          'Number',
          'Date',
          'Branch',
          'Status',
          'Worked Minutes',
          'Overtime Minutes',
          'Late Minutes',
        ],
        ...summary.attendance.map((record) => [
          record.employeeName,
          record.employeeNumber,
          record.attendanceDate,
          record.branchName,
          labelizeEnum(record.status),
          record.workedMinutes,
          record.overtimeMinutes,
          record.lateMinutes,
        ]),
      ]);
      break;
    case 'leave':
      downloadCsv('keen-hr-leave.csv', [
        ['Employee', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Approver'],
        ...summary.leaveRequests.map((request) => [
          request.employeeName,
          request.leaveTypeName,
          request.startDate,
          request.endDate,
          request.requestedDays,
          labelizeEnum(request.status),
          request.approverUserDisplayName ?? '',
        ]),
      ]);
      break;
    case 'payroll':
      downloadCsv('keen-hr-payroll.csv', [
        ['Run', 'Period', 'Branch', 'Status', 'Employees', 'Gross Pay', 'Net Pay'],
        ...summary.payrollRuns.map((run) => [
          run.name,
          run.payrollPeriodName,
          run.branchName ?? 'All branches',
          labelizeEnum(run.status),
          run.employees.length,
          run.employees.reduce((sum, employee) => sum + employee.grossPay, 0),
          run.employees.reduce((sum, employee) => sum + employee.netPay, 0),
        ]),
        ['Total', '', '', '', '', summary.grossPayroll, summary.netPayroll],
        ['Currency', organization.currencyCode, '', '', '', '', ''],
      ]);
      break;
    case 'structure':
      downloadCsv('keen-hr-structure.csv', [
        ['Type', 'Name', 'Code', 'Department', 'Branch', 'Active'],
        ...summary.departments.map((department) => [
          'Department',
          department.name,
          department.code,
          '',
          department.branchName ?? 'All branches',
          department.active ? 'Yes' : 'No',
        ]),
        ...summary.jobTitles.map((jobTitle) => [
          'Job Title',
          jobTitle.title,
          jobTitle.code,
          jobTitle.departmentName,
          '',
          jobTitle.active ? 'Yes' : 'No',
        ]),
      ]);
      break;
    default:
      break;
  }
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

type ProductCategoryFormState = ProductCategoryRequest;

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  department: string;
  description: string;
  imageUrl: string;
  unitPrice: string;
  costPrice: string;
  vatCategory: ProductVatCategory;
  sizes: string;
  colors: string;
  status: Product['status'];
};

type ProductIdentity = Pick<ProductFormState, 'sku' | 'barcode'>;

type CatalogDialog = 'category' | 'product' | null;
type ProductStatusFilter = 'all' | Product['status'];

function defaultCategoryForm(): ProductCategoryFormState {
  return {
    name: '',
    code: '',
    status: 'ACTIVE',
  };
}

function defaultProductForm(
  categoryId = '',
  vatCategory: ProductVatCategory = 'A',
  identity: Partial<ProductIdentity> = {},
): ProductFormState {
  return {
    name: '',
    sku: identity.sku ?? '',
    barcode: identity.barcode ?? '',
    categoryId,
    department: '',
    description: '',
    imageUrl: '',
    unitPrice: '',
    costPrice: '',
    vatCategory,
    sizes: '',
    colors: '',
    status: 'ACTIVE',
  };
}

function generateProductIdentity(products: Product[]): ProductIdentity {
  const usedSkus = new Set(products.map((product) => product.sku.trim().toUpperCase()));
  const usedBarcodes = new Set(
    products
      .map((product) => product.barcode?.trim())
      .filter((barcode): barcode is string => Boolean(barcode)),
  );

  for (let sequence = products.length + 1; sequence < 1_000_000_000; sequence += 1) {
    const sku = buildGeneratedSku(sequence);
    const barcode = buildGeneratedBarcode(sequence);
    if (!usedSkus.has(sku.toUpperCase()) && !usedBarcodes.has(barcode)) {
      return { sku, barcode };
    }
  }

  const fallbackSequence = Date.now() % 1_000_000_000;
  return {
    sku: buildGeneratedSku(fallbackSequence),
    barcode: buildGeneratedBarcode(fallbackSequence),
  };
}

function buildGeneratedSku(sequence: number) {
  return `SKU-${String(sequence).padStart(4, '0')}`;
}

function buildGeneratedBarcode(sequence: number) {
  return withEan13CheckDigit(`200${String(sequence).padStart(9, '0').slice(-9)}`);
}

function withEan13CheckDigit(firstTwelveDigits: string) {
  const sum = firstTwelveDigits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${firstTwelveDigits}${(10 - (sum % 10)) % 10}`;
}

function ProductsPage({ organization }: { organization: Organization }) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories,
  });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const activeCategories = categories.filter((category) => category.status === 'ACTIVE');
  const firstActiveCategoryId = activeCategories[0]?.id ?? '';
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<ProductCategoryFormState>(() =>
    defaultCategoryForm(),
  );
  const [productForm, setProductForm] = useState<ProductFormState>(() =>
    defaultProductForm('', organization.defaultProductVatCategory),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isCatalogImporting, setIsCatalogImporting] = useState(false);
  const [catalogDialog, setCatalogDialog] = useState<CatalogDialog>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>('all');
  const editingCategory = categories.find((category) => category.id === editingCategoryId);
  const editingProduct = products.find((product) => product.id === editingProductId);
  const generatedProductIdentity = useMemo(() => generateProductIdentity(products), [products]);
  const productFormCategoryName =
    activeCategories.find((category) => category.id === productForm.categoryId)?.name ??
    editingProduct?.categoryName ??
    'Products';
  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !normalizedProductSearch ||
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
        .includes(normalizedProductSearch);
    const matchesCategory =
      productCategoryFilter === 'all' || product.categoryId === productCategoryFilter;
    const matchesStatus = productStatusFilter === 'all' || product.status === productStatusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });
  const productFormPreview = {
    name: productForm.name.trim() || 'Product image',
    categoryName: productFormCategoryName,
    imageUrl: productForm.imageUrl,
  };
  const productImageUrlInputValue = isInlineProductImage(productForm.imageUrl)
    ? ''
    : productForm.imageUrl;

  useEffect(() => {
    if (!productForm.categoryId && firstActiveCategoryId) {
      setProductForm((current) => ({
        ...current,
        categoryId: firstActiveCategoryId,
        vatCategory: current.vatCategory || organization.defaultProductVatCategory,
      }));
    }
  }, [firstActiveCategoryId, organization.defaultProductVatCategory, productForm.categoryId]);

  const saveCategoryMutation = useMutation({
    mutationFn: (payload: ProductCategoryRequest) =>
      editingCategoryId
        ? updateProductCategory(editingCategoryId, payload)
        : createProductCategory(payload),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setEditingCategoryId(null);
      setCatalogDialog(null);
      setCategoryForm(defaultCategoryForm());
      setProductForm((current) =>
        current.categoryId ? current : { ...current, categoryId: category.id },
      );
      setMessage(`${category.name} category saved.`);
    },
  });

  const deactivateCategoryMutation = useMutation({
    mutationFn: deactivateProductCategory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setMessage('Category deactivated.');
    },
  });

  const reactivateCategoryMutation = useMutation({
    mutationFn: (category: ProductCategory) =>
      updateProductCategory(category.id, {
        name: category.name,
        code: category.code,
        status: 'ACTIVE',
      }),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      setMessage(`${category.name} category reactivated.`);
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: (payload: ProductRequest) =>
      editingProductId ? updateProduct(editingProductId, payload) : createProduct(payload),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setEditingProductId(null);
      setCatalogDialog(null);
      setProductForm(
        defaultProductForm(product.categoryId, organization.defaultProductVatCategory),
      );
      setMessage(`${product.name} saved.`);
    },
  });

  const deactivateProductMutation = useMutation({
    mutationFn: deactivateProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setMessage('Product deactivated.');
    },
  });
  const reactivateProductMutation = useMutation({
    mutationFn: (product: Product) =>
      updateProduct(product.id, {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? '',
        categoryId: product.categoryId,
        department: product.department ?? '',
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? '',
        unitPrice: product.unitPrice,
        costPrice: product.costPrice ?? 0,
        vatCategory: product.vatCategory,
        sizes: product.sizes,
        colors: product.colors,
        status: 'ACTIVE',
      }),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setMessage(`${product.name} reactivated.`);
    },
  });
  const isCategoryStatusBusy =
    deactivateCategoryMutation.isPending || reactivateCategoryMutation.isPending;
  const isProductStatusBusy =
    deactivateProductMutation.isPending || reactivateProductMutation.isPending;
  const isProductBusy = saveProductMutation.isPending || isCatalogImporting;

  function editCategory(category: ProductCategory) {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, code: category.code, status: category.status });
    setError('');
    setMessage('');
    setCatalogDialog('category');
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode?.trim() || generatedProductIdentity.barcode,
      categoryId: product.categoryId,
      department: product.department ?? '',
      description: product.description ?? '',
      imageUrl: product.imageUrl ?? '',
      unitPrice: String(product.unitPrice),
      costPrice: product.costPrice == null ? '' : String(product.costPrice),
      vatCategory: product.vatCategory ?? organization.defaultProductVatCategory,
      sizes: product.sizes.join(', '),
      colors: product.colors.join(', '),
      status: product.status,
    });
    setError('');
    setMessage('');
    setCatalogDialog('product');
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(
      defaultProductForm(
        firstActiveCategoryId,
        organization.defaultProductVatCategory,
        generatedProductIdentity,
      ),
    );
    setError('');
    setMessage('');
  }

  function openNewCategory() {
    setEditingCategoryId(null);
    setCategoryForm(defaultCategoryForm());
    setError('');
    setMessage('');
    setCatalogDialog('category');
  }

  function closeCategoryDialog() {
    setEditingCategoryId(null);
    setCategoryForm(defaultCategoryForm());
    setError('');
    setCatalogDialog(null);
  }

  function openNewProduct() {
    resetProductForm();
    setCatalogDialog('product');
  }

  function closeProductDialog() {
    resetProductForm();
    setCatalogDialog(null);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await saveCategoryMutation.mutateAsync({
        name: categoryForm.name.trim(),
        code: categoryForm.code.trim().toUpperCase(),
        status: categoryForm.status,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save category');
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!productForm.categoryId) {
      setError('Create an active category before registering products');
      return;
    }

    if (!productForm.costPrice.trim()) {
      setError('Buying Price is required.');
      return;
    }

    try {
      await saveProductMutation.mutateAsync({
        name: productForm.name.trim(),
        sku: productForm.sku.trim().toUpperCase(),
        barcode: productForm.barcode.trim() || generatedProductIdentity.barcode,
        categoryId: productForm.categoryId,
        department: productForm.department.trim(),
        description: productForm.description.trim(),
        imageUrl: productForm.imageUrl.trim(),
        unitPrice: Number(productForm.unitPrice),
        costPrice: Number(productForm.costPrice),
        vatCategory: productForm.vatCategory,
        sizes: parseCsv(productForm.sizes),
        colors: parseCsv(productForm.colors),
        status: productForm.status,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save product');
    }
  }

  async function handleProductCatalogUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError('');
    setMessage('');
    setIsCatalogImporting(true);

    try {
      const rows = await readWorkbookRows(file);
      if (rows.length === 0) {
        setError('The product catalog worksheet is empty.');
        return;
      }

      const productBySku = new Map(products.map((product) => [product.sku.toUpperCase(), product]));
      let created = 0;
      let updated = 0;

      for (const [index, row] of rows.entries()) {
        const payload = productRequestFromWorksheetRow(
          row,
          categories,
          organization.defaultProductVatCategory,
          index + 2,
        );
        const existingProduct = payload.sku ? productBySku.get(payload.sku) : undefined;
        if (existingProduct) {
          const saved = await updateProduct(existingProduct.id, payload);
          productBySku.set(saved.sku.toUpperCase(), saved);
          updated += 1;
        } else {
          const saved = await createProduct(payload);
          productBySku.set(saved.sku.toUpperCase(), saved);
          created += 1;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setMessage(`Imported ${created} new and ${updated} updated products.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to import products');
    } finally {
      setIsCatalogImporting(false);
    }
  }

  function handleProductImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setError('Select an image file for the product.');
      return;
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setError('Product image must be 1 MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        setProductForm((current) => ({ ...current, imageUrl: reader.result as string }));
        return;
      }

      setError('Unable to read product image.');
    });
    reader.addEventListener('error', () => setError('Unable to read product image.'));
    reader.readAsDataURL(file);
  }

  async function handleDeactivateCategory(category: ProductCategory) {
    setError('');
    setMessage('');
    try {
      if (category.status === 'ACTIVE') {
        await deactivateCategoryMutation.mutateAsync(category.id);
      } else {
        await reactivateCategoryMutation.mutateAsync(category);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update category');
    }
  }

  async function handleDeactivateProduct(product: Product) {
    setError('');
    setMessage('');
    try {
      if (product.status === 'ACTIVE') {
        await deactivateProductMutation.mutateAsync(product.id);
      } else {
        await reactivateProductMutation.mutateAsync(product);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to update product');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Product Catalog"
        subtitle="Register categories, products, prices, sizes, and colors."
        action={
          <div className="header-actions">
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={() => {
                setError('');
                setMessage('');
                try {
                  downloadProductCatalogWorkbook(products, categories, organization);
                  setMessage('Product catalog workbook downloaded.');
                } catch (caughtError) {
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : 'Unable to download product catalog workbook.',
                  );
                }
              }}
            >
              <i className="bi bi-file-earmark-spreadsheet" aria-hidden="true" />
              Download Excel
            </button>
            <label className="secondary-action compact-action product-image-upload-button">
              <i className="bi bi-upload" aria-hidden="true" />
              {isCatalogImporting ? 'Importing...' : 'Upload Excel'}
              <input
                accept=".xlsx,.xls,.csv"
                aria-label="Upload product catalog Excel"
                disabled={isCatalogImporting}
                type="file"
                onChange={handleProductCatalogUpload}
              />
            </label>
            <button
              className="primary-action compact-action"
              type="button"
              onClick={openNewProduct}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              New Product
            </button>
          </div>
        }
      />

      {catalogDialog ? null : <FormMessages error={error} message={message} />}

      {catalogDialog ? (
        <div className="dialog-backdrop catalog-dialog-backdrop">
          <div className="catalog-management-grid">
            <section
              className="panel-card branch-form-panel catalog-dialog-card catalog-category-dialog"
              hidden={catalogDialog !== 'category'}
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-dialog-title"
            >
              <PanelHeader
                icon={editingCategory ? 'bi-pencil-square' : 'bi-folder-plus'}
                title={editingCategory ? 'Edit Category' : 'Register Category'}
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close category dialog"
                    onClick={closeCategoryDialog}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              <h2 id="category-dialog-title" className="sr-only">
                {editingCategory ? 'Edit Category' : 'Register Category'}
              </h2>
              <FormMessages error={error} message={message} />
              <form className="record-form" onSubmit={handleCategorySubmit}>
                <label className="field-stack">
                  <span>Category Name</span>
                  <input
                    required
                    maxLength={120}
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Category Code</span>
                  <input
                    required
                    maxLength={40}
                    value={categoryForm.code}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select
                    value={categoryForm.status}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        status: event.target.value as ProductCategory['status'],
                      }))
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <div className="form-actions">
                  {editingCategory ? (
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={closeCategoryDialog}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className="primary-action compact-action"
                    type="submit"
                    disabled={saveCategoryMutation.isPending}
                  >
                    <i className="bi bi-check2" aria-hidden="true" />
                    {saveCategoryMutation.isPending ? 'Saving...' : 'Save Category'}
                  </button>
                </div>
              </form>
            </section>

            <section
              className="panel-card branch-form-panel catalog-dialog-card catalog-product-dialog"
              hidden={catalogDialog !== 'product'}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-dialog-title"
            >
              <PanelHeader
                icon={editingProduct ? 'bi-pencil-square' : 'bi-plus-square'}
                title={editingProduct ? 'Edit Product' : 'Register Product'}
                action={
                  <button
                    className="icon-button compact-icon"
                    type="button"
                    aria-label="Close product dialog"
                    onClick={closeProductDialog}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                }
              />
              <h2 id="product-dialog-title" className="sr-only">
                {editingProduct ? 'Edit Product' : 'Register Product'}
              </h2>
              <FormMessages error={error} message={message} />
              <form className="record-form" onSubmit={handleProductSubmit}>
                <label className="field-stack">
                  <span>Product Name</span>
                  <input
                    required
                    maxLength={180}
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>SKU</span>
                  <input
                    required
                    maxLength={80}
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        sku: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Category</span>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, categoryId: event.target.value }))
                    }
                  >
                    <option value="">Select category</option>
                    {activeCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Selling Price</span>
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={productForm.unitPrice}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, unitPrice: event.target.value }))
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
                    value={productForm.costPrice}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, costPrice: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>VAT Category</span>
                  <select
                    value={productForm.vatCategory}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        vatCategory: event.target.value as ProductVatCategory,
                      }))
                    }
                  >
                    {vatCategoryOptions.map((option) => (
                      <option key={option.category} value={option.category}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span>Barcode</span>
                  <input
                    maxLength={80}
                    value={productForm.barcode}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, barcode: event.target.value }))
                    }
                  />
                </label>
                <div className="field-stack wide-field product-image-field">
                  <span>Product Image</span>
                  <div className="product-image-control">
                    <ProductImage product={productFormPreview} index={0} small />
                    <div className="product-image-inputs">
                      <input
                        aria-label="Product image URL"
                        maxLength={PRODUCT_IMAGE_DATA_URL_MAX_LENGTH}
                        placeholder={
                          isInlineProductImage(productForm.imageUrl)
                            ? 'Uploaded image selected'
                            : 'https://example.com/product.jpg'
                        }
                        value={productImageUrlInputValue}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            imageUrl: event.target.value,
                          }))
                        }
                      />
                      <div className="product-image-actions">
                        <label className="secondary-action compact-action product-image-upload-button">
                          <i className="bi bi-image" aria-hidden="true" />
                          Upload Image
                          <input
                            aria-label="Upload product image"
                            accept="image/*"
                            type="file"
                            onChange={handleProductImageUpload}
                          />
                        </label>
                        {productForm.imageUrl ? (
                          <button
                            className="text-button danger-text"
                            type="button"
                            onClick={() =>
                              setProductForm((current) => ({ ...current, imageUrl: '' }))
                            }
                          >
                            <i className="bi bi-x-circle" aria-hidden="true" />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <label className="field-stack">
                  <span>Sizes</span>
                  <input
                    maxLength={500}
                    placeholder="S, M, L"
                    value={productForm.sizes}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, sizes: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Colors</span>
                  <input
                    maxLength={500}
                    placeholder="Black, White, Navy"
                    value={productForm.colors}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, colors: event.target.value }))
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Status</span>
                  <select
                    value={productForm.status}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        status: event.target.value as Product['status'],
                      }))
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
                <label className="field-stack wide-field">
                  <span>Description</span>
                  <input
                    maxLength={500}
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>
                <div className="form-actions">
                  {editingProduct ? (
                    <button
                      className="secondary-action compact-action"
                      type="button"
                      onClick={closeProductDialog}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className="primary-action compact-action"
                    type="submit"
                    disabled={isProductBusy}
                  >
                    <i className="bi bi-check2" aria-hidden="true" />
                    {isProductBusy
                      ? 'Saving...'
                      : editingProduct
                        ? 'Save Changes'
                        : 'Register Product'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}

      <section className="panel-card branch-list-panel catalog-products-panel">
        <PanelHeader
          icon="bi-tags"
          title="Catalog Products"
          action={
            <span className="catalog-count-pill">
              {filteredProducts.length} of {products.length} products
            </span>
          }
        />
        {!productsQuery.isPending && products.length > 0 ? (
          <div className="catalog-filter-bar">
            <label className="search-field catalog-search-field">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                aria-label="Search catalog products"
                placeholder="Search name, category, size or color..."
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
              />
            </label>
            <label className="select-shell catalog-filter-select">
              <i className="bi bi-grid" aria-hidden="true" />
              <select
                aria-label="Filter products by category"
                value={productCategoryFilter}
                onChange={(event) => setProductCategoryFilter(event.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-shell catalog-filter-select">
              <i className="bi bi-check2-circle" aria-hidden="true" />
              <select
                aria-label="Filter products by status"
                value={productStatusFilter}
                onChange={(event) =>
                  setProductStatusFilter(event.target.value as ProductStatusFilter)
                }
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
        ) : null}
        {productsQuery.isPending || categoriesQuery.isPending ? (
          <LoadingPanel label="Loading catalog..." />
        ) : products.length === 0 ? (
          <EmptyState
            icon="bi-tags"
            title="No products registered"
            detail="Products created here will appear in POS and inventory workflows."
          />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon="bi-search"
            title="No matching products"
            detail="Adjust the search or filters to see more products."
          />
        ) : (
          <div className="responsive-table catalog-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Buying Price</th>
                  <th>Selling Price</th>
                  <th>Profit</th>
                  <th>VAT</th>
                  <th>Sizes</th>
                  <th>Colors</th>
                  <th>Total Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={product.id}>
                    <td data-label="Product">
                      <span className="product-cell">
                        <ProductImage product={product} index={index} small />
                        <span>
                          <strong>{product.name}</strong>
                          <small>{product.department?.trim() || 'N/A'}</small>
                        </span>
                      </span>
                    </td>
                    <td data-label="Category">{product.categoryName}</td>
                    <td data-label="Buying Price">
                      {formatMoney(product.costPrice ?? 0, organization.currencyCode)}
                    </td>
                    <td data-label="Selling Price">
                      {formatMoney(product.unitPrice, organization.currencyCode)}
                    </td>
                    <td
                      data-label="Profit"
                      className={
                        product.unitPrice - (product.costPrice ?? 0) >= 0
                          ? 'positive-text'
                          : 'negative-text'
                      }
                    >
                      {formatMoney(
                        product.unitPrice - (product.costPrice ?? 0),
                        organization.currencyCode,
                      )}
                    </td>
                    <td data-label="VAT">{formatVatCategory(product.vatCategory)}</td>
                    <td data-label="Sizes">{joinWithFallback(product.sizes)}</td>
                    <td data-label="Colors">{joinWithFallback(product.colors)}</td>
                    <td data-label="Total Stock">{product.totalStock}</td>
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
                        <button
                          className={
                            product.status === 'ACTIVE' ? 'text-button danger-text' : 'text-button'
                          }
                          type="button"
                          disabled={isProductStatusBusy}
                          onClick={() => handleDeactivateProduct(product)}
                        >
                          <i
                            className={`bi ${
                              product.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'
                            }`}
                            aria-hidden="true"
                          />
                          {product.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
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

      <section className="panel-card branch-list-panel">
        <PanelHeader
          icon="bi-grid"
          title="Categories"
          action={
            <button
              className="secondary-action compact-action"
              type="button"
              onClick={openNewCategory}
            >
              <i className="bi bi-folder-plus" aria-hidden="true" />
              New Category
            </button>
          }
        />
        {categories.length === 0 ? (
          <EmptyState
            icon="bi-grid"
            title="No categories registered"
            detail="Create a category before registering products."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td data-label="Category">{category.name}</td>
                    <td data-label="Code">{category.code}</td>
                    <td data-label="Status">
                      <StatusPill
                        status={category.status === 'ACTIVE' ? 'posted' : 'pending'}
                        label={category.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td data-label="Actions">
                      <span className="table-actions">
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => editCategory(category)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          className={
                            category.status === 'ACTIVE' ? 'text-button danger-text' : 'text-button'
                          }
                          type="button"
                          disabled={isCategoryStatusBusy}
                          onClick={() => handleDeactivateCategory(category)}
                        >
                          <i
                            className={`bi ${
                              category.status === 'ACTIVE' ? 'bi-pause-circle' : 'bi-play-circle'
                            }`}
                            aria-hidden="true"
                          />
                          {category.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
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
    </section>
  );
}

type InventoryHealthFilter = 'ALL' | InventoryItem['stockHealth'];
type InventoryInsightDialog = 'category' | 'branch' | 'alerts' | null;

function Inventory({
  currentUser,
  organization,
}: {
  currentUser: CurrentUser;
  organization: Organization;
}) {
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
  const inventory = inventoryQuery.data ?? [];
  const stockAdjustments = stockAdjustmentsQuery.data ?? [];
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState<InventoryHealthFilter>('ALL');
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
        [item.productName, item.sku, item.categoryName, item.branchName].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesBranch = branchFilter === 'ALL' || item.branchName === branchFilter;
      const matchesCategory = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesHealth = healthFilter === 'ALL' || item.stockHealth === healthFilter;

      return matchesSearch && matchesBranch && matchesCategory && matchesHealth;
    });
  }, [branchFilter, categoryFilter, healthFilter, inventory, searchTerm]);
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
        subtitle="Monitor stock value, branch availability, and reorder signals."
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
                tone="green"
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
              {branches.length === 0 ? (
                <EmptyState
                  icon="bi-shop"
                  title="No branch stock"
                  detail="Stock posted to branches will appear here."
                />
              ) : (
                <>
                  <span className="inventory-panel-count">{branches.length} branches</span>
                  <div className="branch-stock-list">
                    {branches.slice(0, 5).map((branch) => (
                      <div className="branch-stock-row" key={branch.label}>
                        <div>
                          <strong>{branch.label}</strong>
                          <span>{formatMoney(branch.value, organization.currencyCode)}</span>
                        </div>
                        <div className="branch-stock-track">
                          <span style={{ width: `${(branch.count / maxBranchCount) * 100}%` }} />
                        </div>
                        <em>{branch.count.toLocaleString('en-KE')} units</em>
                        {branch.alerts > 0 ? (
                          <small>{branch.alerts.toLocaleString('en-KE')} alerts</small>
                        ) : (
                          <small className="healthy">Healthy</small>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                        <span>
                          {item.sku} - {item.branchName}
                        </span>
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
            <dt>Branches</dt>
            <dd>{branches.length.toLocaleString('en-KE')}</dd>
            <span>{topBranch ? `${topBranch.label} leads stock` : 'No branch stock'}</span>
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
            placeholder="Search products, SKU, category, branch"
          />
        </label>
        <label className="inventory-filter-field">
          <span>Branch</span>
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.currentTarget.value)}
          >
            <option value="ALL">All branches</option>
            {branches.map((branch) => (
              <option key={branch.label} value={branch.label}>
                {branch.label}
              </option>
            ))}
          </select>
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
            detail="Adjust the search, branch, category, or health filter."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Branch</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Stock Value</th>
                  <th>Stock Health</th>
                  {canAdjustInventory ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <InventoryTableRow
                    canAdjustInventory={canAdjustInventory}
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
  item,
  onAdjust,
  organization,
}: {
  canAdjustInventory: boolean;
  item: InventoryItem;
  onAdjust: (item: InventoryItem) => void;
  organization: Organization;
}) {
  const queryClient = useQueryClient();
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
    setStatusMessage('');
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
    <tr>
      <td data-label="Product">
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
      <td data-label="Branch">{item.branchName}</td>
      <td data-label="On Hand" className="number-cell">
        {item.quantityOnHand.toLocaleString('en-KE')}
      </td>
      <td data-label="Reserved" className="number-cell">
        {item.quantityReserved.toLocaleString('en-KE')}
      </td>
      <td data-label="Available" className="number-cell">
        {item.quantityAvailable.toLocaleString('en-KE')}
      </td>
      <td data-label="Reorder Level">
        <form className="reorder-level-form" onSubmit={handleReorderSubmit}>
          <input
            aria-label={`Reorder level for ${item.productName} at ${item.branchName}`}
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
            aria-label={`Save reorder level for ${item.productName} at ${item.branchName}`}
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
            <p>
              {item.productName} - {item.branchName}
            </p>
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
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Product</th>
            <th>Branch</th>
            <th>System</th>
            <th>Counted</th>
            <th>Variance</th>
            <th>Loss</th>
            <th>Excess</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Date">{formatDateTime(row.adjustedAt)}</td>
              <td data-label="Product">
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
              <td data-label="Branch">{row.branchName}</td>
              <td data-label="System" className="number-cell">
                {formatQuantity(row.systemQuantity)}
              </td>
              <td data-label="Counted" className="number-cell">
                {formatQuantity(row.countedQuantity)}
              </td>
              <td
                data-label="Variance"
                className={`number-cell ${
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LowStockPage({ organization }: { organization: Organization }) {
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const inventory = inventoryQuery.data ?? [];
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
                  <th>Branch</th>
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
                    <td data-label="Branch">{item.branchName}</td>
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
    throw new Error('Select a branch before adding the stock line.');
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
    throw new Error('Imported stock line references an unavailable branch or product.');
  }

  return {
    ...request,
    id: nextStockReceiptLineId(),
    branchName: branch.name,
    productName: product.name,
    sku: product.sku,
  };
}

function stockReceiptPayload(line: StockReceiptLine): StockIntakeRequest {
  const { id, branchName, productName, sku, ...payload } = line;
  return payload;
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
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const stockIntakesQuery = useQuery({ queryKey: ['stock-intakes'], queryFn: getStockIntakes });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const products = productsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const activeProducts = products.filter((product) => product.status === 'ACTIVE');
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'ACTIVE');
  const firstActiveBranchId = activeBranches[0]?.id ?? '';
  const firstActiveProductId = activeProducts[0]?.id ?? '';
  const firstActiveSupplierName = activeSuppliers[0]?.name ?? '';
  const stockIntakes = stockIntakesQuery.data ?? [];
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
      const intakes: StockIntake[] = [];
      for (const line of lines) {
        intakes.push(await addStock(stockReceiptPayload(line)));
      }
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

  function handleAddReceiptLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const receiptLine = buildStockReceiptLine(form, activeBranches, activeProducts);
      const selectedProduct = productById.get(receiptLine.productId);
      setReceiptLines((current) => [...current, receiptLine]);
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
      setMessage(`Added ${imported} stock rows to the supplier invoice.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to import stock');
    } finally {
      setIsStockImporting(false);
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Add Stock"
        subtitle="Receive inventory from suppliers into a branch."
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
                <label className="field-stack">
                  <span>Branch</span>
                  <select
                    required
                    value={form.branchId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, branchId: event.target.value }))
                    }
                  >
                    <option value="">Select branch</option>
                    {activeBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                        <th>Branch</th>
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
                          <td data-label="Branch">{line.branchName}</td>
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

type StockTransferFormState = {
  sourceBranchId: string;
  destinationBranchId: string;
  productId: string;
  quantity: string;
  referenceNumber: string;
  notes: string;
};

function defaultTransferForm(branchId = '', productId = ''): StockTransferFormState {
  return {
    sourceBranchId: branchId,
    destinationBranchId: '',
    productId,
    quantity: '',
    referenceNumber: '',
    notes: '',
  };
}

function TransfersPage({
  branches,
  organization,
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const inventoryQuery = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const transfersQuery = useQuery({ queryKey: ['transfers'], queryFn: getTransfers });
  const products = productsQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const transfers = transfersQuery.data ?? [];
  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const activeProducts = products.filter((product) => product.status === 'ACTIVE');
  const firstActiveBranchId = activeBranches[0]?.id ?? '';
  const firstActiveProductId = activeProducts[0]?.id ?? '';
  const [form, setForm] = useState<StockTransferFormState>(() =>
    defaultTransferForm(firstActiveBranchId, firstActiveProductId),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const availableSourceStock = inventory.find(
    (item) => item.branchId === form.sourceBranchId && item.productId === form.productId,
  )?.quantityAvailable;

  useEffect(() => {
    setForm((current) => ({
      ...current,
      sourceBranchId: current.sourceBranchId || firstActiveBranchId,
      productId: current.productId || firstActiveProductId,
    }));
  }, [firstActiveBranchId, firstActiveProductId]);

  const transferMutation = useMutation({
    mutationFn: (payload: StockTransferRequest) => createTransfer(payload),
    onSuccess: async (transfer) => {
      await queryClient.invalidateQueries({ queryKey: ['transfers'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setForm(defaultTransferForm(transfer.sourceBranchId, transfer.productId));
      setMessage(`Transferred ${transfer.quantity} units of ${transfer.productName}.`);
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.productId) {
      setError('Select a product before transferring stock.');
      return;
    }

    try {
      await transferMutation.mutateAsync({
        sourceBranchId: form.sourceBranchId,
        destinationBranchId: form.destinationBranchId,
        productId: form.productId,
        quantity: Number(form.quantity),
        referenceNumber: form.referenceNumber.trim(),
        notes: form.notes.trim(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to transfer stock');
    }
  }

  return (
    <section className="branch-workspace">
      <PageHeader
        title="Transfers"
        subtitle="Move stock between branches."
        action={
          <NavLink className="secondary-action compact-action" to="/inventory">
            <i className="bi bi-box" aria-hidden="true" />
            Inventory
          </NavLink>
        }
      />

      <div className="management-grid">
        <section className="panel-card branch-form-panel">
          <PanelHeader icon="bi-arrow-left-right" title="New Transfer" />
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Source Branch</span>
              <select
                required
                value={form.sourceBranchId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceBranchId: event.target.value }))
                }
              >
                <option value="">Select source</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span>Destination Branch</span>
              <select
                required
                value={form.destinationBranchId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, destinationBranchId: event.target.value }))
                }
              >
                <option value="">Select destination</option>
                {activeBranches
                  .filter((branch) => branch.id !== form.sourceBranchId)
                  .map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="field-stack">
              <span>Product</span>
              <ProductSearchSelect
                products={activeProducts}
                value={form.productId}
                onChange={(productId) => setForm((current) => ({ ...current, productId }))}
              />
            </div>
            <label className="field-stack">
              <span>Available</span>
              <input readOnly value={availableSourceStock ?? 0} />
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
              <span>Reference</span>
              <input
                maxLength={80}
                value={form.referenceNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, referenceNumber: event.target.value }))
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

            <FormMessages error={error} message={message} />

            <div className="form-actions">
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={transferMutation.isPending}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {transferMutation.isPending ? 'Saving...' : 'Transfer Stock'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel">
          <PanelHeader icon="bi-clock-history" title="Transfer History" />
          {transfersQuery.isPending || productsQuery.isPending || inventoryQuery.isPending ? (
            <LoadingPanel label="Loading transfers..." />
          ) : transfers.length === 0 ? (
            <EmptyState
              icon="bi-arrow-left-right"
              title="No transfers recorded"
              detail="Completed branch transfers will appear here."
            />
          ) : (
            <TransfersTable transfers={transfers} organization={organization} />
          )}
        </section>
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

function userSyncMessage(createdCount: number, skippedCount: number) {
  if (createdCount === 0) {
    return `No new system users were added. ${skippedCount} already linked, inactive, or missing a branch assignment.`;
  }

  return `${createdCount} system user${createdCount === 1 ? '' : 's'} added as employee${
    createdCount === 1 ? '' : 's'
  }. ${skippedCount} skipped.`;
}

function employeeFormFromProfile(profile: EmployeeProfile): HrEmployeeFormState {
  return {
    employeeNumber: profile.employeeNumber,
    firstName: profile.firstName,
    middleName: profile.middleName ?? '',
    lastName: profile.lastName,
    preferredName: profile.preferredName ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    gender: profile.gender ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    nationalIdNumber: profile.nationalIdNumber ?? '',
    primaryBranchId: profile.branchId,
    departmentId: profile.departmentId ?? '',
    jobTitleId: profile.jobTitleId ?? '',
    employmentType: profile.employmentType,
    employmentStatus: profile.employmentStatus,
    joiningDate: profile.joiningDate,
    probationEndDate: profile.probationEndDate ?? '',
    contractStartDate: profile.contractStartDate ?? '',
    contractEndDate: profile.contractEndDate ?? '',
    userId: profile.linkedUserId ?? '',
    managerEmployeeId: profile.managerEmployeeId ?? '',
    workLocation: profile.workLocation ?? '',
    emergencyContactName: profile.emergencyContactName ?? '',
    emergencyContactPhone: profile.emergencyContactPhone ?? '',
    address: profile.address ?? '',
    notes: profile.notes ?? '',
    basicSalary: profile.basicSalary ?? 0,
    salaryPaymentMethod: profile.salaryPaymentMethod ?? 'UNSPECIFIED',
    bankName: profile.bankName ?? '',
    bankAccountNumber: profile.bankAccountNumber ?? '',
    bankAccountName: profile.bankAccountName ?? '',
    mpesaNumber: profile.mpesaNumber ?? '',
    active: profile.active,
  };
}

function dateTimeLocalValue(value: string) {
  return value.slice(0, 16);
}

function formatOptionalDateTime(value?: string) {
  if (!value) {
    return 'Not recorded';
  }
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function minutesToHours(minutes: number) {
  const wholeHours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${wholeHours}h ${remainingMinutes}m`;
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
            <th>Branch</th>
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
              <td data-label="Branch">{intake.branchName}</td>
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

function TransfersTable({
  organization,
  transfers,
}: {
  organization: Organization;
  transfers: StockTransfer[];
}) {
  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Transferred</th>
            <th>Product</th>
            <th>From</th>
            <th>To</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id}>
              <td data-label="Transferred">{formatDateTime(transfer.transferredAt)}</td>
              <td data-label="Product">
                <span className="table-label">
                  <i className="bi bi-box" aria-hidden="true" />
                  <span>
                    <strong>{transfer.productName}</strong>
                    <small>{transfer.sku}</small>
                  </span>
                </span>
              </td>
              <td data-label="From">{transfer.sourceBranchName}</td>
              <td data-label="To">{transfer.destinationBranchName}</td>
              <td data-label="Quantity">{transfer.quantity}</td>
              <td data-label="Status">
                <StatusPill
                  status={transfer.status === 'COMPLETED' ? 'posted' : 'pending'}
                  label={transfer.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                />
              </td>
              <td data-label="Reference">{transfer.referenceNumber || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <span className="table-footnote">
        {organization.currencyCode} stock movement valuation uses product catalog prices.
      </span>
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
}: {
  branches: Branch[];
  organization: Organization;
}) {
  const queryClient = useQueryClient();
  const expensesQuery = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const expenses = expensesQuery.data ?? [];
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
      setError('Select a branch before recording an expense.');
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
        subtitle="Record branch expenses and monitor operating spend."
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
              <span>Branch</span>
              <select
                required
                value={form.branchId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, branchId: event.target.value }))
                }
              >
                <option value="">Select branch</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

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
            detail="Branch operating costs will appear here."
          />
        ) : (
          <div className="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Branch</th>
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
                    <td data-label="Branch">{expense.branchName}</td>
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
  currentUser,
  organization,
}: {
  branches: Branch[];
  currentUser: CurrentUser;
  organization: Organization;
}) {
  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.status === 'ACTIVE'),
    [branches],
  );
  const [selectedBranchId, setSelectedBranchId] = useState('');
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
  const transfersQuery = useQuery({ queryKey: ['transfers'], queryFn: getTransfers });
  const stockAdjustmentsQuery = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: getStockAdjustments,
  });
  const canReadUsers = hasPermission(currentUser, 'admin:manage');
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: canReadUsers });
  const sales = salesQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const inventory = inventoryQuery.data ?? [];
  const stockIntakes = stockIntakesQuery.data ?? [];
  const transfers = transfersQuery.data ?? [];
  const stockAdjustments = stockAdjustmentsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const selectedBranch = activeBranches.find((branch) => branch.id === selectedBranchId);
  const reportBranches = useMemo(
    () => (selectedBranch ? [selectedBranch] : activeBranches),
    [activeBranches, selectedBranch],
  );
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
  const filteredTransfers = useMemo(
    () =>
      transfers.filter(
        (transfer) =>
          matchesTransferBranch(transfer, selectedBranchId) &&
          isWithinReportRange(transfer.transferredAt, dateRange),
      ),
    [dateRange, selectedBranchId, transfers],
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
  const filteredUsers = useMemo(
    () =>
      selectedBranchId
        ? users.filter(
            (user) => user.branchIds.length === 0 || user.branchIds.includes(selectedBranchId),
          )
        : users,
    [selectedBranchId, users],
  );
  const summary = useMemo(
    () =>
      buildReportSummary(
        reportBranches,
        filteredSales,
        filteredExpenses,
        filteredInventory,
        filteredUsers,
        filteredStockIntakes,
        filteredTransfers,
        filteredStockAdjustments,
      ),
    [
      filteredExpenses,
      filteredInventory,
      filteredSales,
      filteredStockAdjustments,
      filteredStockIntakes,
      filteredTransfers,
      filteredUsers,
      reportBranches,
    ],
  );
  const isLoading =
    salesQuery.isPending ||
    expensesQuery.isPending ||
    inventoryQuery.isPending ||
    stockIntakesQuery.isPending ||
    transfersQuery.isPending ||
    stockAdjustmentsQuery.isPending ||
    usersQuery.isPending;
  const loadError = [
    salesQuery.error,
    expensesQuery.error,
    inventoryQuery.error,
    stockIntakesQuery.error,
    transfersQuery.error,
    stockAdjustmentsQuery.error,
    usersQuery.error,
  ]
    .filter((error): error is Error => error instanceof Error)
    .at(0);
  const scopeLabel = selectedBranch?.name ?? 'All Branches';
  const reportTitle = selectedBranch
    ? `${isStoreBranch(selectedBranch) ? 'Store' : 'Shop'} reports`
    : 'Business reports';
  const reportSubtitle = selectedBranch
    ? `View sales, stock movement, expenses, and financial position for ${selectedBranch.name}.`
    : 'View sales, stock movement, expenses, and financial position across all active branches.';
  const canExport = !isLoading && !loadError;
  const overviewCards = reportOverviewCards(summary, organization);
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
            <label className="select-shell report-branch-select report-branch-select-header">
              <i className="bi bi-geo-alt" aria-hidden="true" />
              <select
                aria-label="Report branch"
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
              >
                <option value="">All Branches</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
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
          <label className="select-shell report-branch-select report-branch-select-mobile">
            <i className="bi bi-geo-alt" aria-hidden="true" />
            <select
              aria-label="Report branch"
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
            >
              <option value="">All Branches</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
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
              detail="Sales, expenses, receipts, and transfers will appear in this mix."
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
              detail="Sold, received, and transferred units will appear here."
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
            eyebrow={selectedBranch ? 'Branch report' : 'Branch reports'}
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
        title="No sales by branch"
        detail="Completed sales will appear in the branch summary."
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
            <th>Branch</th>
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
              <td data-label="Branch">
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
            <td data-label="Branch">Total</td>
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
            <th>Branch</th>
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
              <td data-label="Branch">{row.branchName}</td>
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
            <th>Branch</th>
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
              <td data-label="Branch">{row.branchName}</td>
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
        detail="Expense categories will appear after branch costs are recorded."
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
            <th>Branch</th>
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
                <td data-label="Branch">{row.branchName}</td>
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
      />

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
        <p>KEEN FASHION OPERATIONS</p>
        <h1 id="help-page-title">Help & product information</h1>
        <span>Everything you need to know about your workspace and support.</span>
      </header>

      <section className="help-product-hero" aria-labelledby="help-product-title">
        <div className="help-product-brandmark" aria-hidden="true">
          <img src={keenLogoUrl} alt="" />
        </div>
        <div className="help-product-copy">
          <h2 id="help-product-title">KEEN HR, Fashion Inventory & POS</h2>
          <span className="help-version-badge">Version {appVersion}</span>
          <p>
            Your central workspace for branches, products, stock movement, security, sales, HR, and
            reporting.
          </p>
        </div>
        <div className="help-hero-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <div className="help-card-grid">
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
          <strong>KEEN HR, Fashion Inventory & POS</strong>
          <span>
            Version {appVersion} | Copyright @{copyrightYear} CRENVIXMORAVA SYSTEMS. All rights
            reserved.
          </span>
        </div>
        <p>Built for a more organized fashion business.</p>
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
  const canReadUsers = hasPermission(currentUser, 'admin:manage');
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: canReadUsers });

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
  const users = usersQuery.data ?? [];
  const branchUsers = users.filter(
    (user) => user.status === 'ACTIVE' && user.branchIds.includes(selectedBranchId),
  );
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
      setError('Select an active branch before opening a shift.');
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
            <label className="select-shell">
              <i className="bi bi-shop" aria-hidden="true" />
              <select
                aria-label="Shift branch"
                value={selectedBranchId}
                onChange={(event) => handleBranchChange(event.target.value)}
              >
                <option value="">Select Branch</option>
                {activeBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
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
              title="Select a branch"
              detail="Choose a branch before opening or reconciling a shift."
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
                <span>Branch</span>
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
              detail="Open branch shifts will appear here for quick switching."
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
                      <strong>{branch?.name ?? 'Unknown branch'}</strong>
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

        <section className="panel-card shift-staff-panel">
          <PanelHeader icon="bi-people" title="Branch Staff" tone="blue" />
          {usersQuery.isPending ? (
            <LoadingPanel label="Loading staff..." />
          ) : branchUsers.length === 0 ? (
            <EmptyState
              icon="bi-person"
              title="No staff assigned"
              detail="Assigned active users will appear here."
            />
          ) : (
            <div className="shift-ledger-list">
              {branchUsers.slice(0, 8).map((user) => (
                <div className="shift-ledger-row" key={user.id}>
                  <span>
                    <strong>{user.displayName}</strong>
                    <small>{user.roleNames.join(', ') || user.email}</small>
                  </span>
                  <StatusPill status="posted" label="Active" />
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
              detail="Closed shifts for the selected branch will appear here."
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
    { label: 'Shifts', icon: 'bi-clock-history', detail: 'Open, close, reconcile' },
    { label: 'Transfers', icon: 'bi-arrow-left-right', detail: 'Request, dispatch, receive' },
    { label: 'Staff', icon: 'bi-people', detail: 'Roles and permissions' },
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
    <article className="metric-card">
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

function HrDashboardMetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'orange' | 'purple';
}) {
  return (
    <article className={`hr-metric-card tone-${tone}`}>
      <i className={`bi ${icon} hr-metric-icon`} aria-hidden="true" />
      <div className="hr-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <i className="bi bi-chevron-right hr-metric-arrow" aria-hidden="true" />
    </article>
  );
}

function employeeInitials(fullName: string) {
  const parts = fullName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);
  return (parts[0]?.charAt(0) ?? '') + (parts[1]?.charAt(0) ?? parts[0]?.charAt(1) ?? '');
}

function HrBackButton() {
  const navigate = useNavigate();

  return (
    <button className="secondary-action compact-action" type="button" onClick={() => navigate(-1)}>
      <i className="bi bi-arrow-left" aria-hidden="true" />
      Back
    </button>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="user-detail-block hr-profile-fact">
      <span className="user-detail-label">{label}</span>
      <strong>{value}</strong>
    </div>
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
        <select aria-label="Inventory branch filter" defaultValue="all">
          <option value="all">All Branches</option>
        </select>
      </label>
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

  if (type === 'branches') {
    if (summary.branchRows.length === 0) {
      return (
        <EmptyState
          icon="bi-shop"
          title="No branches"
          detail="Branch reporting will appear after active branches are registered."
        />
      );
    }

    const maxSales = Math.max(1, ...summary.branchRows.map((row) => row.netSales));
    return (
      <div className="branch-report-list">
        {summary.branchRows.slice(0, 4).map((row, index) => (
          <div key={row.branch.id}>
            <span>{index + 1}</span>
            <strong>{row.branch.name}</strong>
            <i style={{ width: `${(row.netSales / maxSales) * 100}%` }} />
            <em>{formatMoney(row.netSales, organization.currencyCode)}</em>
          </div>
        ))}
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

  if (type === 'staff') {
    return (
      <div className="simple-stat">
        <strong>{summary.userCount}</strong>
        <span>Staff Users</span>
        <em className="positive-text">{summary.activeUserCount} active</em>
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

function payrollRunPillStatus(status: PayrollRunStatus): 'posted' | 'review' | 'pending' {
  if (status === 'APPROVED' || status === 'PROCESSED' || status === 'LOCKED') {
    return 'posted';
  }
  if (status === 'CALCULATED' || status === 'REVIEWED') {
    return 'review';
  }
  return 'pending';
}

function labelizeEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const hrDashboardStyles = `
.hr-dashboard-workspace {
  gap: 1rem;
}

.settings-workspace .hr-settings-structure-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.settings-workspace .hr-structure-list-panel.panel-card {
  overflow: visible;
}

.settings-workspace .hr-settings-structure-grid .user-directory-row,
.settings-workspace .hr-structure-row {
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.settings-workspace .hr-settings-structure-grid .user-directory-status,
.settings-workspace .hr-structure-row .user-directory-status {
  grid-column: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.settings-workspace .hr-settings-structure-grid .user-directory-actions,
.settings-workspace .hr-structure-row .user-directory-actions {
  justify-items: start;
}

@media (max-width: 1180px) {
  .settings-workspace .hr-settings-structure-grid {
    grid-template-columns: 1fr;
  }
}

.hr-dashboard-body {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.hr-dashboard-hero,
.hr-kpi-grid,
.hr-panel-heading,
.hr-dashboard-actions,
.hr-schedule-item,
.hr-schedule-copy {
  display: flex;
}

.hr-dashboard-hero {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 0.2rem 0 0.15rem;
}

.hr-dashboard-hero h1 {
  margin: 0;
  font-size: 2.15rem;
  color: #12284a;
  letter-spacing: -0.045em;
}

.hr-dashboard-hero h2 {
  margin: 0.28rem 0 0.12rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #183566;
  letter-spacing: -0.02em;
}

.hr-dashboard-hero p {
  margin: 0;
  color: #667a96;
  font-size: 0.96rem;
}

.hr-dashboard-actions {
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hr-period-pill,
.hr-period-inline {
  min-height: 46px;
  padding: 0.72rem 1rem;
  border: 1px solid #dbe6f2;
  border-radius: 12px;
  background: #fff;
  color: #17345c;
  font-weight: 600;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
}

.hr-period-pill,
.hr-period-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
}

.hr-dashboard-select {
  width: auto;
  min-width: 0;
  padding-right: 2.25rem;
  box-sizing: border-box;
  font-weight: 700;
}

.hr-dashboard-add-action {
  min-height: 46px;
  padding-inline: 0.15rem;
  border-radius: 12px;
  background: transparent;
  color: #2563eb;
  box-shadow: none;
  border: 0;
}

.hr-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.hr-metric-card {
  min-width: 0;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  border: 1px solid #dfe7f1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.035);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease;
}

.hr-metric-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  border-color: #d2ddea;
}

.hr-metric-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.hr-metric-card.tone-blue .hr-metric-icon {
  color: #2878f0;
}

.hr-metric-card.tone-green .hr-metric-icon {
  color: #22c55e;
}

.hr-metric-card.tone-orange .hr-metric-icon {
  color: #f59e0b;
}

.hr-metric-card.tone-purple .hr-metric-icon {
  color: #8b5cf6;
}

.hr-metric-copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.hr-metric-copy span {
  color: #2a4670;
  font-weight: 700;
  font-size: 0.82rem;
}

.hr-metric-copy small {
  color: #69809d;
  font-size: 0.82rem;
  line-height: 1.3;
}

.hr-metric-copy strong {
  font-size: 1.95rem;
  line-height: 1;
  color: #152c53;
  letter-spacing: -0.05em;
}

.hr-metric-arrow {
  color: #7e93b0;
  font-size: 0.92rem;
}

.hr-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 0.9rem;
  align-items: start;
}

.hr-dashboard-panel {
  padding: 1.15rem 1.15rem 1.05rem;
  border-radius: 10px;
  border: 1px solid #dfe7f1;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.035);
}

.hr-attendance-panel {
  grid-column: 1;
}

.hr-leave-panel {
  grid-column: 2;
}

.hr-distribution-panel {
  grid-column: 3;
}

.hr-recent-table-panel {
  grid-column: 1 / span 2;
}

.hr-schedule-panel {
  grid-column: 3;
}

.hr-panel-heading {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.hr-panel-heading h3 {
  margin: 0;
  font-size: 0.98rem;
  color: #17345c;
  letter-spacing: -0.03em;
}

.hr-dashboard-chart-wrap {
  height: 270px;
}

.hr-attendance-chart-wrap .recharts-cartesian-axis-tick-value tspan:last-child {
  fill: #7c8ea4;
}

.hr-attendance-legend {
  display: flex;
  gap: 1.1rem;
  margin-bottom: 0.85rem;
  flex-wrap: wrap;
}

.hr-attendance-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #4a6280;
  font-size: 0.84rem;
  font-weight: 600;
}

.hr-attendance-legend-item i {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-block;
}

.hr-attendance-legend-item.present i {
  background: #2f80ed;
}

.hr-attendance-legend-item.absent i {
  background: #cfe0ff;
}

.hr-attendance-legend-item.attendance i {
  background: #1d4ed8;
}

.hr-leave-list {
  display: grid;
  gap: 0.2rem;
}

.hr-leave-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eef3f8;
}

.hr-leave-row:last-child {
  border-bottom: 0;
}

.hr-leave-avatar,
.hr-table-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.hr-leave-avatar.tone-0,
.hr-table-avatar.tone-0 {
  background: #efe3ff;
  color: #7c3aed;
}

.hr-leave-avatar.tone-1,
.hr-table-avatar.tone-1 {
  background: #dbeafe;
  color: #2563eb;
}

.hr-leave-avatar.tone-2,
.hr-table-avatar.tone-2 {
  background: #dcfce7;
  color: #16a34a;
}

.hr-leave-avatar.tone-3,
.hr-table-avatar.tone-3 {
  background: #fee2e2;
  color: #dc2626;
}

.hr-leave-avatar.tone-4,
.hr-table-avatar.tone-4 {
  background: #fef3c7;
  color: #d97706;
}

.hr-leave-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.hr-leave-copy span,
.hr-schedule-copy span {
  color: #3d5673;
}

.hr-leave-copy strong,
.hr-schedule-copy strong {
  color: #17345c;
}

.hr-leave-copy strong {
  font-size: 0.93rem;
}

.hr-leave-copy span {
  font-size: 0.86rem;
}

.hr-leave-copy small,
.hr-schedule-copy small {
  color: #708399;
  font-size: 0.82rem;
}

.hr-dashboard-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.79rem;
  font-weight: 700;
  white-space: nowrap;
  background: transparent;
}

.hr-dashboard-tag.pending {
  color: #b7791f;
}

.hr-dashboard-tag.approved,
.hr-dashboard-tag.meeting,
.hr-dashboard-tag.review {
  color: #15803d;
}

.hr-dashboard-tag.interview {
  color: #7c3aed;
}

.hr-dashboard-tag.deadline {
  color: #dc2626;
}

.ai-assistant-shell {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.8rem;
}

.ai-assistant-toggle {
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #17345c, #2563eb);
  color: #fff;
  padding: 0.85rem 1.15rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  box-shadow: 0 20px 35px rgba(37, 99, 235, 0.22);
}

.ai-assistant-panel {
  width: min(380px, calc(100vw - 2rem));
  padding: 1rem;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.ai-assistant-header,
.ai-assistant-suggestions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.ai-assistant-header span {
  display: block;
  margin-top: 0.2rem;
  color: #6b7e95;
  font-size: 0.84rem;
}

.ai-assistant-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.ai-assistant-form textarea {
  width: 100%;
  min-height: 110px;
  resize: vertical;
}

.ai-assistant-response,
.ai-assistant-empty {
  margin-top: 0.95rem;
}

.ai-assistant-response p,
.ai-assistant-empty p {
  margin: 0;
  color: #17345c;
  line-height: 1.55;
}

.ai-assistant-citations {
  margin-top: 0.85rem;
}

.ai-assistant-citations strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #17345c;
}

.ai-assistant-citations ul {
  margin: 0;
  padding-left: 1.1rem;
  color: #5f728a;
}

.ai-assistant-suggestions {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 0.95rem;
}

.sidebar-module-switch {
  padding: 0 1rem 1rem;
}

.sidebar-module-switch-button {
  width: 100%;
  justify-content: center;
  text-decoration: none;
}

.hr-form-section {
  margin: 0.25rem 0 0.5rem;
  padding-top: 0.25rem;
}

.hr-employee-page-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.hr-page-back {
  margin-bottom: 0.75rem;
}

.hr-employee-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hr-attendance-layout {
  align-items: start;
}

.hr-attendance-layout > .panel-card {
  min-width: 0;
}

.hr-documents-layout {
  grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.14fr);
}

.hr-document-upload-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hr-document-upload-form .wide-field,
.hr-document-upload-form .form-actions,
.hr-document-upload-form .message-banner {
  grid-column: 1 / -1;
}

.hr-document-upload-form .field-stack small {
  color: #6b7e95;
  font-size: 0.78rem;
  font-weight: 600;
}

.hr-document-preview-panel {
  min-height: 420px;
}

.hr-document-preview {
  min-height: 330px;
  border: 1px solid #dfe7f1;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fbff;
}

.hr-document-preview iframe,
.hr-document-preview img {
  display: block;
  width: 100%;
}

.hr-document-preview iframe {
  min-height: 430px;
  border: 0;
}

.hr-document-preview img {
  max-height: 430px;
  object-fit: contain;
  background: #ffffff;
}

.hr-document-preview-meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
  align-items: end;
  margin-top: 0.85rem;
}

.hr-document-preview-meta .compact-action {
  width: 100%;
  justify-content: center;
}

.field-stack.inline-checkbox {
  width: fit-content;
  max-width: 100%;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  justify-self: start;
  box-sizing: border-box;
  padding: 0.08rem 0;
}

.field-stack.inline-checkbox input[type='checkbox'] {
  flex: 0 0 14px;
  width: 14px;
  min-width: 14px;
  max-width: 14px;
  height: 14px;
  min-height: 14px;
  max-height: 14px;
  margin: 0;
  padding: 0;
  border-radius: 3px;
  box-shadow: none;
  accent-color: #2878f0;
}

.field-stack.inline-checkbox span {
  min-width: 0;
  max-width: 100%;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.hr-leave-form-layout {
  grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
}

.hr-leave-type-panel,
.hr-leave-request-panel {
  min-width: 0;
  overflow: visible;
}

.hr-leave-type-form,
.hr-leave-request-form,
.hr-leave-type-form .field-stack,
.hr-leave-request-form .field-stack {
  min-width: 0;
}

.hr-leave-type-form .field-stack input,
.hr-leave-type-form .field-stack select,
.hr-leave-type-form .field-stack textarea,
.hr-leave-request-form .field-stack input,
.hr-leave-request-form .field-stack select,
.hr-leave-request-form .field-stack textarea {
  min-width: 0;
}

.hr-leave-rule-grid {
  grid-template-columns: minmax(0, 0.62fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}

.hr-leave-type-form .form-actions,
.hr-leave-request-form .form-actions {
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hr-leave-type-form .form-actions .compact-action,
.hr-leave-request-form .form-actions .compact-action {
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}

.hr-attendance-summary-grid {
  margin-bottom: 0.2rem;
}

.performance-bonus-panel {
  margin-top: 0.2rem;
  min-width: 0;
}

.performance-bonus-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.52fr);
  gap: 1rem;
  align-items: start;
}

.performance-bonus-rule-form {
  min-width: 0;
}

.performance-bonus-readiness {
  grid-template-columns: 1fr;
}

.performance-entry-mode-actions,
.performance-row-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.performance-entry-mode-actions {
  margin-bottom: 0.85rem;
}

.performance-row-actions {
  align-items: center;
}

.payroll-live-preview-panel,
.performance-pay-focus-panel {
  min-width: 0;
}

.payroll-equation-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.55rem;
  align-items: stretch;
  margin: 0 1rem 1rem;
}

.payroll-equation-strip > span {
  min-width: 0;
  padding: 0.72rem 0.8rem;
  border: 1px solid #e0e8f2;
  border-radius: 8px;
  background: #f8fbff;
  color: #647890;
  font-size: 0.78rem;
  font-weight: 700;
}

.payroll-equation-strip > i {
  display: none;
}

.payroll-equation-strip strong {
  display: block;
  margin-bottom: 0.18rem;
  color: #17345c;
  font-size: 1rem;
}

.payroll-equation-strip .payroll-equation-total {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.payroll-live-table {
  margin: 0 1rem;
}

.payroll-live-table table {
  min-width: 980px;
}

.payroll-live-note {
  margin: 0.75rem 1rem 1rem;
  color: #647890;
  font-size: 0.84rem;
  font-weight: 700;
}

.performance-payout-list {
  display: grid;
  gap: 0.7rem;
  margin: 0 1rem 1rem;
}

.performance-payout-row {
  display: grid;
  grid-template-columns: minmax(230px, 1.1fr) minmax(150px, 0.55fr) minmax(280px, 1fr) minmax(150px, 0.55fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.9rem;
  border: 1px solid #dfe7f1;
  border-radius: 8px;
  background: #ffffff;
}

.performance-payout-identity {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.performance-payout-identity strong,
.performance-payout-identity small,
.performance-payout-sales span,
.performance-payout-sales small,
.performance-payout-net span,
.performance-payout-net small {
  display: block;
}

.performance-payout-identity strong {
  color: #10213f;
}

.performance-payout-identity small,
.performance-payout-sales small,
.performance-payout-net small {
  color: #647890;
  font-size: 0.78rem;
  line-height: 1.35;
}

.performance-payout-sales,
.performance-payout-net {
  min-width: 0;
}

.performance-payout-sales span,
.performance-payout-net span {
  color: #6b7e95;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.performance-payout-sales strong,
.performance-payout-net strong {
  display: block;
  margin-top: 0.15rem;
  color: #17345c;
  font-size: 1rem;
}

.performance-payout-equation {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
}

.performance-payout-equation span {
  min-width: 0;
  padding: 0.48rem 0.55rem;
  border: 1px solid #e4ebf4;
  border-radius: 8px;
  background: #f8fbff;
  color: #647890;
  font-size: 0.72rem;
  font-weight: 700;
}

.performance-payout-equation strong {
  display: block;
  margin-top: 0.12rem;
  color: #17345c;
  font-size: 0.82rem;
}

.hr-attendance-history .user-directory-row {
  align-items: center;
}

.hr-employee-form-panel,
.hr-employee-directory-panel {
  min-width: 0;
}

.hr-employee-form-panel {
  overflow: visible;
}

.hr-employee-form {
  min-width: 0;
}

.hr-employee-form .report-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.hr-employee-form .report-date-grid > .field-stack {
  min-width: 0;
}

.hr-employee-form .field-stack input,
.hr-employee-form .field-stack select,
.hr-employee-form .field-stack textarea {
  width: 100%;
  min-width: 0;
}

.hr-employee-form .wide-field {
  grid-column: 1 / -1;
}

.hr-form-section h3 {
  margin: 0;
  font-size: 1rem;
  color: #10213f;
}

.hr-form-section p {
  margin: 0.25rem 0 0;
  color: #688096;
  font-size: 0.9rem;
}

.hr-dashboard-table table thead th {
  color: #6b7e95;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.hr-dashboard-table table tbody tr {
  background: transparent;
}

.hr-dashboard-table table td {
  font-size: 0.84rem;
}

.hr-recent-table-panel .hr-dashboard-table table {
  table-layout: auto;
}

.hr-recent-table-panel .hr-dashboard-table table th:nth-child(2),
.hr-recent-table-panel .hr-dashboard-table table td:nth-child(2) {
  width: 26%;
}

.hr-table-name {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  width: 100%;
}

.hr-table-name strong {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hr-table-actions {
  width: 32px;
  height: 32px;
  border: 1px solid #d8e2ef;
  border-radius: 10px;
  display: inline-grid;
  place-items: center;
  color: #17324d;
  text-decoration: none;
  background: #fff;
}

.hr-table-actions:hover {
  border-color: #b8cae2;
  background: #f8fbff;
}

.hr-schedule-list {
  display: grid;
  gap: 0;
}

.hr-schedule-item {
  align-items: center;
  gap: 0.875rem;
  padding: 0.95rem 0 0.95rem 0.15rem;
  border-bottom: 1px solid #edf2f7;
  position: relative;
}

.hr-schedule-item:last-child {
  border-bottom: 0;
}

.hr-schedule-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.65rem;
  bottom: 0.65rem;
  width: 1px;
  background: #d9e7fb;
}

.hr-schedule-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  position: relative;
  z-index: 1;
  width: 18px;
  background: #fff;
}

.hr-schedule-icon.tone-0 {
  color: #2878f0;
}

.hr-schedule-icon.tone-1 {
  color: #8b5cf6;
}

.hr-schedule-icon.tone-2 {
  color: #22c55e;
}

.hr-schedule-icon.tone-3 {
  color: #f59e0b;
}

.hr-schedule-copy {
  flex: 1;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.hr-schedule-copy strong {
  color: #17345c;
  font-size: 0.95rem;
}

.hr-panel-heading-match .text-button {
  font-weight: 700;
}

.hr-dashboard-workspace .empty-state {
  min-height: 220px;
  border-radius: 10px;
  border: 1px solid #e2eaf3;
  background: #ffffff;
}

.hr-distribution-panel .donut-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.hr-distribution-panel .donut-chart {
  height: 240px;
}

.hr-distribution-panel .donut-chart strong {
  font-size: 2rem;
  color: #17345c;
}

.hr-distribution-panel .donut-chart span {
  color: #667a96;
}

.hr-distribution-panel .donut-legend {
  gap: 0.65rem;
}

.hr-distribution-panel .donut-legend div {
  padding: 0;
  border: 0;
  background: transparent;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 0.75rem;
  row-gap: 0.2rem;
  font-size: 0.82rem;
}

.hr-distribution-panel .donut-legend strong {
  color: #17345c;
}

.hr-distribution-panel .donut-legend em {
  grid-column: 2;
  justify-self: end;
  color: #667a96;
  font-style: normal;
  font-size: 0.78rem;
}

.hr-distribution-panel .donut-legend span {
  min-width: 0;
}

.hr-distribution-panel .donut-legend span,
.hr-distribution-panel .donut-legend strong,
.hr-distribution-panel .donut-legend em {
  white-space: nowrap;
}

.payroll-page-actions {
  justify-content: flex-end;
}

.payroll-period-switch {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.38rem 0.55rem 0.38rem 0.75rem;
  border: 1px solid #dbe6f2;
  border-radius: 8px;
  background: #ffffff;
  color: #17345c;
  font-weight: 700;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.payroll-period-switch span {
  color: #5f728a;
  font-size: 0.78rem;
  letter-spacing: 0;
  text-transform: uppercase;
}

.payroll-period-switch select {
  min-width: 12rem;
  border: 0;
  background: transparent;
  color: #17345c;
  font: inherit;
  outline: 0;
}

.payroll-run-panel,
.payroll-settings-panel {
  min-width: 0;
}

.payroll-start-panel {
  margin-top: 1rem;
}

.payroll-payslip-panel {
  margin-top: 1rem;
}

.payroll-payslip-form {
  grid-template-columns: minmax(220px, 0.8fr) minmax(240px, 1fr) minmax(280px, 1.2fr) auto;
  align-items: end;
}

.payroll-payslip-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.payroll-payslip-summary span {
  min-width: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e4ebf4;
  border-radius: 8px;
  background: #f8fbff;
  color: #647890;
  font-size: 0.76rem;
  font-weight: 700;
}

.payroll-payslip-summary strong {
  display: block;
  margin-bottom: 0.15rem;
  color: #17345c;
  font-size: 0.92rem;
}

.payroll-payslip-summary-total {
  border-color: #bfd6ff !important;
  background: #edf5ff !important;
}

.payslip-backdrop {
  z-index: 2100;
  place-items: start center;
  overflow: auto;
}

.payroll-payslip-dialog {
  width: min(100%, 520px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  padding: 1rem;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(8, 31, 50, 0.24);
}

.payslip-print-area {
  position: relative;
  width: min(100%, 390px);
  margin: 0.85rem auto 0;
  padding: 0.42rem 0.5rem 0.22rem;
  border: 1.5px dashed #4b5563;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.82rem;
  line-height: 1.2;
}

.payslip-slip-header {
  position: relative;
  min-height: 3.25rem;
  padding: 0.18rem 3.2rem 0.32rem 0.2rem;
  border-bottom: 1px solid #9ca3af;
  text-align: center;
}

.payslip-slip-header img {
  position: absolute;
  top: 0.24rem;
  right: 0.25rem;
  width: 38px;
  height: 38px;
  object-fit: contain;
}

.payslip-slip-header strong,
.payslip-slip-header em,
.payslip-slip-header span {
  display: block;
}

.payslip-slip-header strong {
  color: #111827;
  font-size: 0.86rem;
  line-height: 1.12;
}

.payslip-slip-header em {
  color: #d21f1f;
  font-size: 0.82rem;
  font-style: italic;
  font-weight: 800;
  line-height: 1.1;
}

.payslip-slip-header span {
  color: #111827;
  font-size: 0.62rem;
  line-height: 1.15;
}

.payslip-staff-lines {
  display: grid;
  gap: 0.04rem;
  padding: 0.35rem 0.25rem;
  border-bottom: 1px solid #b9bec8;
  color: #111827;
}

.payslip-staff-lines div {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  gap: 0.5rem;
}

.payslip-staff-lines span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.payslip-payment-heading {
  padding: 0.34rem 0.25rem 0.22rem;
  color: #0000cc;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
}

.payslip-slip-body {
  position: relative;
  padding: 0.1rem 0.25rem 0.28rem;
}

.payslip-watermark {
  position: absolute;
  z-index: 0;
  top: 2.4rem;
  left: 50%;
  width: 108px;
  max-height: 110px;
  object-fit: contain;
  opacity: 0.2;
  transform: translateX(-50%);
}

.payslip-slip-lines,
.payslip-nett-line {
  position: relative;
  z-index: 1;
}

.payslip-slip-lines {
  display: grid;
  gap: 0.18rem;
}

.payslip-deduction-lines {
  margin-top: 1rem;
}

.payslip-slip-line,
.payslip-nett-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(6.5rem, max-content);
  gap: 0.7rem;
  align-items: baseline;
}

.payslip-slip-line span,
.payslip-nett-line span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.payslip-slip-line strong,
.payslip-nett-line strong {
  color: #111827;
  font-weight: 400;
  text-align: right;
  white-space: nowrap;
}

.payslip-slip-total {
  margin-top: 0.22rem;
  font-weight: 800;
}

.payslip-slip-total strong,
.payslip-nett-line strong {
  font-weight: 800;
}

.payslip-nett-line {
  margin-top: 0.9rem;
  padding-top: 0.1rem;
  font-weight: 800;
}

.payslip-notes {
  margin: 0.35rem 0.25rem 0;
  padding-top: 0.32rem;
  border-top: 1px solid #d1d5db;
  color: #111827;
  font-size: 0.72rem;
}

.payslip-notes span {
  display: block;
  font-weight: 800;
}

.payslip-notes p {
  margin: 0;
}

.payslip-slip-footer {
  margin: 0.22rem 0.25rem 0;
  padding-top: 0.16rem;
  border-top: 1px solid #d1d5db;
  color: #111827;
  font-size: 0.56rem;
  font-weight: 700;
  text-align: center;
}

.payroll-start-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.55fr);
  gap: 1rem;
  align-items: start;
}

.payroll-run-form,
.payroll-compact-form {
  gap: 0.85rem;
}

.payroll-run-form-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.8fr) minmax(280px, 1fr);
  gap: 0.85rem;
}

.payroll-run-form .report-date-grid,
.payroll-compact-form .report-date-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.payroll-readiness-item,
.payroll-run-card-totals div,
.payroll-run-impact span {
  border: 1px solid #e4ebf4;
  border-radius: 8px;
  background: #f8fbff;
}

.payroll-run-card-totals span,
.payroll-run-impact span,
.payroll-readiness-item small {
  color: #647890;
  font-size: 0.78rem;
  font-weight: 700;
}

.payroll-run-card-totals strong,
.payroll-run-impact strong,
.payroll-readiness-item strong {
  display: block;
  margin-top: 0.18rem;
  color: #17345c;
  font-size: 0.95rem;
}

.payroll-readiness-list {
  display: grid;
  gap: 0.65rem;
}

.payroll-readiness-list-compact {
  grid-template-columns: 1fr;
}

.payroll-readiness-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem;
}

.payroll-readiness-item i {
  color: #2878f0;
  font-size: 1.2rem;
}

.payroll-readiness-item span {
  min-width: 0;
}

.payroll-runs-panel {
  margin-top: 1rem;
}

.payroll-run-list {
  display: grid;
  gap: 0.85rem;
}

.payroll-run-card {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid #dfe7f1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.035);
}

.payroll-run-card-main {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 0.95fr) auto;
  gap: 0.9rem;
  align-items: center;
}

.payroll-run-card-totals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.payroll-run-card-totals div {
  min-width: 0;
  padding: 0.6rem 0.68rem;
}

.payroll-run-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.payroll-run-impact {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.payroll-run-impact span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 34px;
  padding: 0.45rem 0.65rem;
}

.payroll-run-impact strong {
  display: inline;
  margin: 0;
}

.payroll-run-details {
  min-width: 0;
}

.payroll-run-details {
  grid-column: 1 / -1;
  border-top: 1px solid #edf2f7;
  padding-top: 0.85rem;
}

.payroll-run-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 700;
  color: #17345c;
  margin-bottom: 0.75rem;
}

.payroll-run-details summary small {
  color: #647890;
  font-weight: 600;
}

.payroll-employee-table {
  overflow-x: auto;
}

.payroll-adjustment-input {
  width: min(100%, 8rem);
  min-height: 2.35rem;
  border: 1px solid #d8e2ee;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  font: inherit;
}

.payroll-adjustment-actions {
  display: grid;
  gap: 0.45rem;
  min-width: 12rem;
}

.payroll-adjustment-notes {
  width: 100%;
  min-height: 3.8rem;
  border: 1px solid #d8e2ee;
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  font: inherit;
  resize: vertical;
}

.payroll-settings-panel {
  margin-top: 1rem;
}

.payroll-settings-drawers {
  display: grid;
  gap: 0.7rem;
}

.payroll-settings-drawer {
  border: 1px solid #dfe7f1;
  border-radius: 8px;
  background: #ffffff;
}

.payroll-settings-drawer > summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 56px;
  padding: 0.85rem 1rem;
  color: #17345c;
  cursor: pointer;
  list-style: none;
}

.payroll-settings-drawer > summary::-webkit-details-marker {
  display: none;
}

.payroll-settings-drawer > summary::after {
  content: "\\F282";
  color: #667a96;
  font-family: "bootstrap-icons";
  font-size: 0.8rem;
  line-height: 1;
  transition: transform 0.18s ease;
}

.payroll-settings-drawer[open] > summary::after {
  transform: rotate(180deg);
}

.payroll-settings-drawer > summary strong,
.payroll-settings-drawer > summary small {
  display: block;
}

.payroll-settings-drawer > summary strong {
  font-size: 0.95rem;
}

.payroll-settings-drawer > summary small {
  margin-top: 0.12rem;
  color: #647890;
  font-size: 0.78rem;
  font-weight: 700;
}

.payroll-settings-summary-icon {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  background: #edf5ff;
  color: #2878f0;
}

.payroll-settings-drawer > .record-form,
.payroll-settings-drawer > .responsive-table,
.payroll-settings-drawer > .user-directory-list,
.payroll-settings-drawer > .empty-state,
.payroll-settings-drawer > .loading-panel {
  margin: 0 1rem 1rem;
}

@media (max-width: 1100px) {
  .hr-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hr-dashboard-grid {
    grid-template-columns: 1fr;
  }

  .hr-attendance-panel,
  .hr-leave-panel,
  .hr-distribution-panel,
  .hr-recent-table-panel,
  .hr-schedule-panel {
    grid-column: auto;
  }

  .payroll-start-grid,
  .performance-bonus-grid,
  .hr-documents-layout,
  .hr-leave-form-layout,
  .payroll-payslip-form,
  .payslip-meta-grid,
  .payslip-breakdown-grid,
  .payroll-run-form-grid {
    grid-template-columns: 1fr;
  }

  .payroll-payslip-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .payroll-run-card-main {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .payroll-equation-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .payroll-equation-strip .payroll-equation-total {
    grid-column: 1 / -1;
  }

  .performance-payout-row {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 0.75fr);
  }

  .performance-payout-equation,
  .performance-payout-row .performance-row-actions {
    grid-column: 1 / -1;
  }

  .payroll-run-card-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 767px) {
  .hr-dashboard-hero {
    align-items: stretch;
  }

  .hr-dashboard-hero h1 {
    font-size: 1.62rem;
    letter-spacing: 0;
  }

  .hr-dashboard-hero h2 {
    font-size: 0.92rem;
  }

  .hr-dashboard-hero p {
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .hr-dashboard-actions {
    width: 100%;
  }

  .hr-period-pill,
  .hr-dashboard-actions .primary-action {
    width: 100%;
    justify-content: center;
  }

  .hr-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .hr-metric-card {
    min-width: 0;
    min-height: 104px;
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    align-items: start;
    gap: 0.34rem;
    padding: 0.62rem;
  }

  .hr-metric-icon {
    font-size: 1.08rem;
  }

  .hr-metric-copy {
    min-width: 0;
    gap: 0.12rem;
  }

  .hr-metric-copy span {
    font-size: 0.66rem;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  .hr-metric-copy strong {
    font-size: 1.16rem;
    line-height: 1.05;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  .hr-metric-copy small {
    font-size: 0.64rem;
    line-height: 1.22;
    overflow-wrap: anywhere;
  }

  .hr-metric-arrow {
    display: none;
  }

  .hr-dashboard-panel {
    padding: 0.82rem;
  }

  .hr-panel-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
  }

  .hr-panel-heading h3 {
    font-size: 0.88rem;
  }

  .hr-dashboard-chart-wrap {
    height: 240px;
  }

  .hr-employee-page-actions {
    width: 100%;
  }

  .hr-employee-page-actions > * {
    flex: 1 1 100%;
    justify-content: center;
  }

  .hr-employee-form .report-date-grid {
    grid-template-columns: 1fr;
  }

  .hr-leave-rule-grid {
    grid-template-columns: 1fr;
  }

  .hr-leave-type-form .field-stack.inline-checkbox,
  .hr-leave-request-form .field-stack.inline-checkbox {
    width: 100%;
  }

  .hr-document-upload-form,
  .hr-document-preview-meta {
    grid-template-columns: 1fr;
  }

  .hr-document-upload-form .wide-field,
  .hr-document-upload-form .form-actions {
    grid-column: auto;
  }

  .hr-document-preview iframe,
  .hr-document-preview img {
    max-height: 360px;
    min-height: 320px;
  }

  .hr-leave-row {
    grid-template-columns: auto 1fr;
  }

  .hr-leave-row .hr-dashboard-tag {
    grid-column: 2;
    justify-self: start;
  }

  .payroll-page-actions,
  .payroll-period-switch {
    width: 100%;
  }

  .payroll-period-switch {
    justify-content: space-between;
  }

  .payroll-period-switch select {
    min-width: 0;
    width: 100%;
  }

  .payroll-start-grid {
    gap: 0.85rem;
  }

  .payroll-payslip-summary,
  .payslip-net-panel {
    grid-template-columns: 1fr;
  }

  .payslip-letterhead {
    flex-direction: column;
  }

  .payslip-letterhead div:last-child,
  .payslip-net-panel div:last-child {
    justify-items: start;
    text-align: left;
  }

  .payroll-run-form .report-date-grid,
  .payroll-compact-form .report-date-grid,
  .payroll-run-form-grid,
  .payroll-run-card-totals {
    grid-template-columns: 1fr;
  }

  .payroll-run-card {
    padding: 0.9rem;
  }

  .payroll-run-impact {
    flex-direction: column;
  }

  .payroll-equation-strip {
    grid-template-columns: 1fr;
    margin-inline: 0.85rem;
  }

  .payroll-live-table,
  .payroll-live-note,
  .performance-payout-list {
    margin-inline: 0.85rem;
  }

  .performance-payout-row,
  .performance-payout-equation {
    grid-template-columns: 1fr;
  }

  .performance-payout-row {
    align-items: start;
    padding: 0.85rem;
  }

  .payroll-run-details summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .payroll-settings-drawer > summary {
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 0.78rem 0.85rem;
  }

  .payroll-settings-drawer > .record-form,
  .payroll-settings-drawer > .responsive-table,
  .payroll-settings-drawer > .user-directory-list,
  .payroll-settings-drawer > .empty-state,
  .payroll-settings-drawer > .loading-panel {
    margin: 0 0.85rem 0.85rem;
  }

  .payroll-adjustment-actions {
    min-width: 0;
  }
}

@media print {
  .payslip-backdrop,
  .payslip-backdrop * {
    visibility: visible;
  }

  .payslip-backdrop {
    position: absolute;
    inset: 0;
    display: block;
    padding: 0;
    overflow: visible;
    background: #ffffff;
  }

  .payroll-payslip-dialog {
    width: 100%;
    max-height: none;
    padding: 0;
    overflow: visible;
    border-radius: 0;
    box-shadow: none;
  }

  .payslip-dialog-actions {
    display: none !important;
  }

  .payslip-print-area {
    width: 98mm;
    margin: 0 auto;
    padding: 4mm 4mm 2mm;
    border: 1.5px dashed #4b5563;
    border-radius: 6px;
    font-size: 10.2pt;
  }
}
`;

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
    branches: 'Compare sales and performance by branch.',
    payments: 'Track payment methods and matching rates.',
    inventory: 'Stock levels, low stock items and stock value.',
    expenses: 'Business expenses and spending.',
    staff: 'Staff performance and shift activity.',
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
  return `${overlay}, url(${bannerUrl})`;
}

function formatMoney(amount: number, currencyCode: string) {
  const prefix = currencyCode === 'KES' ? 'KSh' : currencyCode;
  return `${prefix} ${new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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

function isImageHrDocument(document: EmployeeDocument) {
  return document.contentType.startsWith('image/');
}

function isPreviewableHrDocument(document: EmployeeDocument) {
  return isImageHrDocument(document) || document.contentType === 'application/pdf';
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

function formatSalePayments(sale: Sale, currencyCode?: string) {
  if (sale.payments.length === 0) {
    return 'N/A';
  }

  if (sale.payments.length === 1) {
    return formatPaymentMethod(sale.payments[0]?.method);
  }

  const paymentLabels = sale.payments.map((payment) => {
    const label = formatPaymentMethod(payment.method);
    return currencyCode ? `${label} ${formatMoney(payment.amount, currencyCode)}` : label;
  });
  return `Split: ${paymentLabels.join(' + ')}`;
}

function formatPaymentMethod(method: PaymentMethod | undefined) {
  if (method === 'MPESA') {
    return 'M-Pesa';
  }
  if (method === 'CASH') {
    return 'Cash';
  }
  if (method === 'CARD') {
    return 'Card';
  }
  return 'N/A';
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
  const branchName = branch?.name ?? 'Unknown branch';
  const branchCode = branch?.code ?? shift.branchId;
  const rows: string[][] = [
    ['Shift Summary'],
    ['Branch', branchName],
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
  branchPerformanceRows,
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
  branchPerformanceRows: ReturnType<typeof branchPerformanceFromSales>;
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
    ['Branch', 'Transactions', 'Net Sales', 'Gross Profit', 'Average Basket'],
    ...branchPerformanceRows.map((row) => [
      row.branch.name,
      String(row.transactions),
      row.netSales.toFixed(2),
      row.grossProfit.toFixed(2),
      row.averageBasket.toFixed(2),
    ]),
    [],
    ['Attention Item', 'Branch', 'Health', 'On Hand', 'Reorder Level'],
    ...lowStockItems.map((item) => [
      item.productName,
      item.branchName,
      stockHealthLabel(item.stockHealth),
      String(item.quantityOnHand),
      String(item.reorderLevel),
    ]),
  ]);
}

function exportExpensesCsv(expenses: Expense[], organization: Organization) {
  downloadCsv('keen-expenses.csv', [
    [
      'Number',
      'Date',
      'Branch',
      'Category',
      'Description',
      'Vendor',
      'Payment',
      'Status',
      'Amount',
    ],
    ...expenses.map((expense) => [
      expense.expenseNumber,
      formatDateTime(expense.incurredAt),
      expense.branchName,
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
    ['Transfer units', summary.transferredUnits],
    ['Stock loss value', summary.stockAdjustmentSummary.totalLossValue.toFixed(2)],
    ['Stock excess value', summary.stockAdjustmentSummary.totalExcessValue.toFixed(2)],
    ['Stock variance net', summary.stockAdjustmentSummary.netValue.toFixed(2)],
    ['Priority restock lines', summary.restockRows.length],
    [],
    ['Branch sales summary'],
    ['Branch', 'Receipts', 'Product Lines', 'Units Sold', 'Sales Amount', 'Profit'],
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
    ['Product', 'SKU', 'Branch', 'Restock Qty', 'Available', 'Reorder Level', 'Status'],
    ...summary.restockRows.map((row) => [
      row.productName,
      row.sku,
      row.branchName,
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
    [
      'Date',
      'Product',
      'SKU',
      'Branch',
      'System',
      'Counted',
      'Variance',
      'Loss',
      'Excess',
      'Reason',
    ],
    ...summary.stockAdjustments.map((row) => [
      formatDateOnly(row.adjustedAt),
      row.productName,
      row.sku,
      row.branchName,
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
      ['Receipt', 'Date', 'Branch', 'Customer', 'Items', 'Payment', 'Subtotal', 'VAT', 'Total'],
      ...summary.sales.map((sale) => [
        sale.saleNumber,
        formatDateTime(sale.soldAt),
        sale.branchName,
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
    downloadCsv('keen-branch-performance.csv', [
      ['Branch', 'Transactions', 'Net Sales', 'Gross Profit', 'Average Basket'],
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
      [
        'Product',
        'SKU',
        'Branch',
        'Category',
        'On Hand',
        'Available',
        'Unit Price',
        'Stock Value',
        'Health',
      ],
      ...summary.inventory.map((item) => [
        item.productName,
        item.sku,
        item.branchName,
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

  if (type === 'staff') {
    downloadCsv('keen-staff-report.csv', [
      ['Name', 'Email', 'Status', 'Roles', 'Branches'],
      ...summary.users.map((user) => [
        user.displayName,
        user.email,
        user.status,
        user.roleNames.join(', '),
        user.branchNames.join(', '),
      ]),
    ]);
    return;
  }

  if (type === 'losses') {
    downloadCsv('keen-losses-variances.csv', [
      [
        'Date',
        'Product',
        'SKU',
        'Branch',
        'System',
        'Counted',
        'Variance',
        'Loss',
        'Excess',
        'Reason',
      ],
      ...summary.stockAdjustments.map((row) => [
        formatDateTime(row.adjustedAt),
        row.productName,
        row.sku,
        row.branchName,
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
      ['Staff users', String(summary.users.length)],
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
    ['Staff Users', String(summary.userCount)],
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
  'Branch Code',
  'Branch Name',
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
  const categoryCode = worksheetText(row, 'Category Code').toUpperCase();
  const categoryName = worksheetText(row, 'Category Name', 'Category').toLowerCase();
  const category = categories.find(
    (item) =>
      (categoryCode && item.code.toUpperCase() === categoryCode) ||
      (categoryName && item.name.toLowerCase() === categoryName),
  );

  if (!category) {
    throw new Error(`Row ${rowNumber}: Category Code or Category Name does not match a category.`);
  }
  return category;
}

function findWorksheetBranch(row: WorksheetRow, branches: Branch[], rowNumber: number) {
  const branchCode = worksheetText(row, 'Branch Code').toUpperCase();
  const branchName = worksheetText(row, 'Branch Name', 'Branch').toLowerCase();
  const branch = branches.find(
    (item) =>
      (branchCode && item.code.toUpperCase() === branchCode) ||
      (branchName && item.name.toLowerCase() === branchName),
  );

  if (!branch) {
    throw new Error(`Row ${rowNumber}: Branch Code or Branch Name does not match a branch.`);
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
  const inventoryByBranchProduct = new Map(
    inventory.map((item) => [`${item.branchId}:${item.productId}`, item]),
  );
  const rows: (string | number)[][] = [];

  for (const branch of branches) {
    for (const product of products) {
      const stock = inventoryByBranchProduct.get(`${branch.id}:${product.id}`);
      rows.push([
        branch.code,
        branch.name,
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
