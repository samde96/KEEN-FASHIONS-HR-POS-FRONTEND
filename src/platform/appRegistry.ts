import type { CurrentUser } from '../data/types';

export type AppPermission =
  | 'admin:manage'
  | 'accounting:manage'
  | 'accounting:view'
  | 'audit:view'
  | 'commercial:manage'
  | 'crm:manage'
  | 'inventory:adjust'
  | 'inventory:receive'
  | 'notifications:view'
  | 'pos:sell'
  | 'pos:supervise'
  | 'procurement:manage'
  | 'profit:view'
  | 'reports:view'
  | 'sales:view'
  | 'expenses:create'
  | 'shifts:manage';
export type NavItem = {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  anyPermissions?: AppPermission[];
  allPermissions?: AppPermission[];
};

// Existing route access remains the authority for every app and shortcut.
export const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Business Overview',
    icon: 'bi-speedometer2',
    anyPermissions: ['admin:manage', 'reports:view', 'sales:view'],
  },
  {
    to: '/roles',
    label: 'Roles & permissions',
    icon: 'bi-person-badge',
    anyPermissions: ['admin:manage'],
  },
  { to: '/users', label: 'Users', icon: 'bi-people', anyPermissions: ['admin:manage'] },
  {
    to: '/branches',
    label: 'Shops & warehouses',
    icon: 'bi-shop',
    anyPermissions: ['admin:manage'],
  },
  {
    to: '/product-catalog',
    label: 'Product Catalog',
    icon: 'bi-tags',
    adminOnly: true,
    anyPermissions: ['admin:manage'],
  },
  {
    to: '/product-categories',
    label: 'Product Categories',
    icon: 'bi-tags',
    adminOnly: true,
    anyPermissions: ['admin:manage'],
  },
  { to: '/suppliers', label: 'Suppliers', icon: 'bi-truck', anyPermissions: ['admin:manage'] },
  {
    to: '/customers',
    label: 'Customers',
    icon: 'bi-person-lines-fill',
    anyPermissions: ['admin:manage', 'commercial:manage', 'crm:manage', 'sales:view'],
  },
  {
    to: '/crm',
    label: 'CRM',
    icon: 'bi-person-heart',
    anyPermissions: ['admin:manage', 'crm:manage'],
  },
  {
    to: '/procurement',
    label: 'Procurement',
    icon: 'bi-clipboard-check',
    anyPermissions: ['admin:manage', 'procurement:manage', 'reports:view'],
  },
  {
    to: '/inventory',
    label: 'Stock balances',
    icon: 'bi-box',
    anyPermissions: [
      'admin:manage',
      'inventory:adjust',
      'inventory:receive',
      'pos:sell',
      'reports:view',
      'sales:view',
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
    ],
  },
  {
    to: '/add-stock',
    label: 'Receive stock',
    icon: 'bi-box-arrow-in-down',
    anyPermissions: ['admin:manage', 'inventory:receive'],
  },
  { to: '/pos', label: 'Checkout', icon: 'bi-bag', anyPermissions: ['admin:manage', 'pos:sell'] },
  {
    to: '/stock-transfers',
    label: 'Stock transfers',
    icon: 'bi-arrow-left-right',
    anyPermissions: ['admin:manage', 'inventory:adjust'],
  },
  {
    to: '/shifts',
    label: 'My Shifts',
    icon: 'bi-clock-history',
    anyPermissions: ['admin:manage', 'shifts:manage'],
  },
  {
    to: '/sales',
    label: 'Sales history',
    icon: 'bi-bar-chart-line',
    anyPermissions: ['admin:manage', 'sales:view'],
  },
  {
    to: '/commercial',
    label: 'Quotations & invoices',
    icon: 'bi-receipt-cutoff',
    anyPermissions: ['admin:manage', 'commercial:manage', 'sales:view', 'reports:view'],
  },
  {
    to: '/expenses',
    label: 'Expenses',
    icon: 'bi-wallet2',
    anyPermissions: ['admin:manage', 'sales:view', 'reports:view', 'expenses:create'],
  },
  { to: '/reports', label: 'Reports center', icon: 'bi-file-earmark-text', adminOnly: true },
  {
    to: '/accounting',
    label: 'Accounting',
    icon: 'bi-bank',
    anyPermissions: ['admin:manage', 'accounting:view', 'accounting:manage', 'reports:view'],
  },
  {
    to: '/notifications',
    label: 'Notifications',
    icon: 'bi-bell',
    anyPermissions: ['admin:manage', 'notifications:view'],
  },
  {
    to: '/audit',
    label: 'Audit Logs',
    icon: 'bi-journal-text',
    anyPermissions: ['admin:manage', 'audit:view'],
  },
  { to: '/settings', label: 'Settings', icon: 'bi-gear', anyPermissions: ['admin:manage'] },
  { to: '/help', label: 'Help', icon: 'bi-question-circle' },
  {
    to: '/apps/inventory/activity',
    label: 'Stock movements',
    icon: 'bi-arrow-left-right',
    anyPermissions: [
      'admin:manage',
      'inventory:receive',
      'inventory:adjust',
      'reports:view',
      'sales:view',
    ],
  },
  {
    to: '/apps/inventory/adjustments',
    label: 'Adjustments & discrepancies',
    icon: 'bi-clipboard2-check',
    anyPermissions: ['admin:manage', 'inventory:adjust', 'reports:view'],
  },
  {
    to: '/apps/warehouse/receipts',
    label: 'Goods received',
    icon: 'bi-box-arrow-in-down',
    anyPermissions: ['admin:manage', 'inventory:receive', 'reports:view'],
  },
];
export const hasPermission = (user: CurrentUser, permission: AppPermission) =>
  user.permissionCodes.includes(permission);
export const hasAnyPermission = (user: CurrentUser, permissions: AppPermission[]) =>
  permissions.some((p) => hasPermission(user, p));
export const hasAllPermissions = (user: CurrentUser, permissions: AppPermission[]) =>
  permissions.every((p) => hasPermission(user, p));
export const isAdminUser = (user: CurrentUser) => user.roleKeys.includes('ADMIN');
export const isCashierUser = (user: CurrentUser) =>
  user.roleKeys.includes('CASHIER') && !isAdminUser(user);
export function canAccessNavItem(user: CurrentUser, item: NavItem) {
  if (isCashierUser(user) && !['/pos', '/shifts', '/expenses', '/help'].includes(item.to))
    return false;
  if (item.adminOnly && !isAdminUser(user)) return false;
  if (hasPermission(user, 'admin:manage')) return true;
  if (item.allPermissions && !hasAllPermissions(user, item.allPermissions)) return false;
  if (item.anyPermissions && !hasAnyPermission(user, item.anyPermissions)) return false;
  return true;
}

export type BusinessApp = {
  id: string;
  title: string;
  icon: string;
  tone: string;
  category: string;
  description: string;
  routes: string[];
  keywords?: string[];
  planned?: boolean;
  upcoming?: string[];
};
export const appRegistry: BusinessApp[] = [
  {
    id: 'pos',
    title: 'Point of Sale',
    icon: 'bi-cart3',
    tone: 'violet',
    category: 'Commerce',
    description: 'Fast checkout, exact variants and flexible payments.',
    routes: ['/pos', '/shifts'],
    keywords: ['cashier', 'cash', 'mpesa'],
    upcoming: ['Reconciliation'],
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: 'bi-bar-chart-fill',
    tone: 'blue',
    category: 'Commerce',
    description: 'Sales history, quotations and customer invoices.',
    routes: ['/sales', '/commercial'],
    upcoming: ['Sales orders'],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'bi-box-seam',
    tone: 'amber',
    category: 'Operations',
    description: 'Stock balances, movements and low-stock alerts.',
    routes: ['/inventory', '/apps/inventory/adjustments', '/apps/inventory/activity', '/low-stock'],
    keywords: ['stock', 'discrepancies', 'adjustments', 'variants'],
  },
  {
    id: 'products',
    title: 'Products',
    icon: 'bi-box',
    tone: 'rose',
    category: 'Operations',
    description: 'Your catalog, variants, pricing and barcodes.',
    routes: ['/product-catalog', '/product-categories'],
    keywords: ['categories', 'sku', 'packaging'],
  },
  {
    id: 'warehouse',
    title: 'Warehouse',
    icon: 'bi-building',
    tone: 'teal',
    category: 'Operations',
    description: 'Receive stock and review goods received.',
    routes: ['/add-stock', '/apps/warehouse/receipts', '/stock-transfers'],
    upcoming: ['Stock requests', 'Dispatching'],
  },
  {
    id: 'purchases',
    title: 'Purchases',
    icon: 'bi-bag-check',
    tone: 'emerald',
    category: 'Operations',
    description: 'Suppliers, procurement and purchase orders.',
    routes: ['/suppliers', '/procurement'],
    keywords: ['buying', 'vendor'],
  },
  {
    id: 'crm',
    title: 'CRM',
    icon: 'bi-people',
    tone: 'violet',
    category: 'Customers',
    description: 'Customers, contacts and closer relationships.',
    routes: ['/crm', '/customers'],
    keywords: ['lead', 'pipeline', 'contact', 'opportunity'],
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: 'bi-journal-text',
    tone: 'cyan',
    category: 'Finance',
    description: 'Expenses, accounting and financial statements.',
    routes: ['/expenses', '/accounting'],
    keywords: ['payments', 'ledger', 'cash flow', 'balance sheet'],
  },
  {
    id: 'hr',
    title: 'Human Resources',
    icon: 'bi-person-workspace',
    tone: 'rose',
    category: 'People',
    description: 'Employees, attendance, leave and staff records.',
    routes: [],
    planned: true,
  },
  {
    id: 'payroll',
    title: 'Payroll',
    icon: 'bi-cash-stack',
    tone: 'emerald',
    category: 'People',
    description: 'Salary structures, payslips and payroll processing.',
    routes: [],
    planned: true,
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'bi-pie-chart-fill',
    tone: 'violet',
    category: 'Insights',
    description: 'Sales, stock, branches and business performance.',
    routes: ['/reports', '/dashboard'],
    keywords: ['daily summary', 'profitability', 'analytics', 'cashiers'],
  },
  {
    id: 'administration',
    title: 'Administration',
    icon: 'bi-gear',
    tone: 'slate',
    category: 'Administration',
    description: 'Shops, warehouses, users, roles and business settings.',
    routes: ['/branches', '/users', '/roles', '/settings', '/notifications', '/audit'],
    keywords: [
      'branches',
      'locations',
      'shops',
      'warehouses',
      'timezone',
      'recipients',
      'reminders',
    ],
  },
];
export const appPath = (app: BusinessApp) => `/apps/${app.id}`;
export function appModules(app: BusinessApp, user: CurrentUser) {
  return app.routes
    .map((to) => navItems.find((item) => item.to === to))
    .filter((item): item is NavItem => Boolean(item) && canAccessNavItem(user, item!));
}
export function visibleApps(user: CurrentUser, includePlanned = false) {
  return appRegistry.filter((app) =>
    app.planned ? includePlanned && isAdminUser(user) : appModules(app, user).length > 0,
  );
}
export function appForPath(path: string) {
  const pathname = path.split('?')[0].replace(/\/$/, '');
  if (pathname === '/dashboard' || pathname === '/help') return undefined;
  return appRegistry.find(
    (app) =>
      pathname === appPath(app) ||
      app.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)),
  );
}
export function canAccessPath(user: CurrentUser, path: string) {
  const pathname = path.split('?')[0];
  const item = [...navItems]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  if (item) return canAccessNavItem(user, item);
  if (pathname.startsWith('/apps/')) {
    const app = appRegistry.find((app) => pathname === appPath(app));
    return Boolean(app && !app.planned && appModules(app, user).length);
  }
  return true;
}
export function searchApps(user: CurrentUser, query: string, includePlanned = false) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return visibleApps(user, includePlanned).filter((app) => {
    const text = [
      app.title,
      app.description,
      app.category,
      ...(app.keywords ?? []),
      ...appModules(app, user).map((module) => module.label),
    ]
      .join(' ')
      .toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
