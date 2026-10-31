import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import {
  appRegistry,
  appModules,
  canAccessPath,
  searchApps,
  visibleApps,
} from '../platform/appRegistry';
import {
  testBranches,
  testInventory,
  testOrganization,
  testProductCategories,
  testProducts,
  testSuppliers,
  testUser,
} from './fixtures';
import type { Branch, CurrentUser } from '../data/types';

const secondBranch: Branch = {
  ...testBranches[0],
  id: 'second-shop',
  name: 'Westlands Branch',
  code: 'WEST',
};
const inventory = [
  ...testInventory,
  {
    ...testInventory[0],
    id: 'second-stock',
    branchId: secondBranch.id,
    branchName: secondBranch.name,
    productName: 'Westlands Shirt',
    quantityOnHand: 7,
    quantityAvailable: 7,
  },
];
const storageKey = `keen:platform:${testUser.organizationId}:${testUser.userId}`;
function api(user: CurrentUser = testUser, branches = testBranches) {
  const records: Record<string, unknown> = {
    '/api/v1/me': user,
    '/api/v1/organization/current': testOrganization,
    '/api/v1/branches': branches,
    '/api/v1/inventory': inventory,
    '/api/v1/catalog/products': testProducts,
    '/api/v1/catalog/categories': testProductCategories,
    '/api/v1/stock-intakes': [],
    '/api/v1/stock-adjustments': [],
    '/api/v1/sales': [],
    '/api/v1/expenses': [],
    '/api/v1/suppliers': testSuppliers,
    '/api/v1/customers': [],
    '/api/v1/stock-operations': [],
    '/api/v1/pos-preferences': {
      dailySummaryEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      recipientIds: [],
      inactivityMinutes: 5,
      longEntryMinutes: 10,
      timeZone: 'Africa/Nairobi',
    },
  };
  const fetch = vi.fn((input: RequestInfo | URL) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    return path in records
      ? Promise.resolve(
          new Response(JSON.stringify(records[path]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      : Promise.reject(new Error(`Unmocked API: ${path}`));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
function open(path = '/apps') {
  window.history.pushState({}, '', path);
  return render(<App />);
}
async function ready() {
  return screen.findByRole('heading', { name: /All your business on one platform/ });
}

describe('KEEN application platform', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token; path=/';
    api();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('lands at Apps Home and keeps future apps clearly unavailable', async () => {
    open('/');
    await ready();
    expect(window.location.pathname).toBe('/apps');
    expect(screen.getByRole('link', { name: 'Open Point of Sale' })).toHaveAttribute(
      'href',
      '/apps/pos',
    );
    expect(screen.getAllByText('Planned · Not yet available')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Open Payroll' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Business Overview' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    const navigation = screen.getByRole('navigation', { name: 'Platform navigation' });
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Apps', 'Favorites', 'Recently Used']);
  });
  it('searches module names and filters applications by category', async () => {
    const user = userEvent.setup();
    open();
    await ready();
    await user.type(screen.getByRole('searchbox', { name: 'Search apps' }), 'barcodes');
    expect(screen.getByRole('link', { name: 'Open Products' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Finance' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox', { name: 'Search apps' }));
    await user.click(screen.getByRole('button', { name: 'Operations' }));
    expect(screen.getByRole('link', { name: 'Open Inventory' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Sales' })).not.toBeInTheDocument();
  });
  it('shows cashier apps only when their existing permissions allow them', async () => {
    const cashier = {
      ...testUser,
      roleKeys: ['CASHIER'],
      roleNames: ['Cashier'],
      permissionCodes: ['pos:sell', 'expenses:create', 'shifts:manage'],
      branchIds: [testBranches[0].id],
    };
    api(cashier);
    open();
    await ready();
    expect(screen.getByRole('link', { name: 'Open Point of Sale' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Inventory' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Finance' })).toBeInTheDocument();
    expect(canAccessPath(cashier, '/shifts')).toBe(true);
    expect(canAccessPath(cashier, '/expenses')).toBe(true);
    expect(canAccessPath(cashier, '/sales')).toBe(false);
    expect(screen.queryByRole('link', { name: 'Open Products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Administration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByText('Payroll')).not.toBeInTheDocument();
    expect(canAccessPath(cashier, '/apps/inventory/adjustments')).toBe(false);
    expect(canAccessPath(cashier, '/apps/products')).toBe(false);
    expect(canAccessPath(cashier, '/product-categories')).toBe(false);
  });
  it('persists favorites and scopes them to the signed-in account', async () => {
    const user = userEvent.setup();
    open();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Pin Products' }));
    await user.click(screen.getByRole('link', { name: /^Favorites/ }));
    expect(await screen.findByRole('heading', { name: 'Your favorite apps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Products' })).toBeInTheDocument();
    cleanup();
    open('/favorites');
    expect(await screen.findByRole('heading', { name: 'Your favorite apps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Products' })).toBeInTheDocument();
    cleanup();
    api({ ...testUser, userId: 'another-user' });
    open('/favorites');
    expect(await screen.findByText('Keep your everyday apps close')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey)!).favorites).toEqual(['products']);
  });
  it('opens app-specific menus and tracks real recent use', async () => {
    const user = userEvent.setup();
    open();
    await ready();
    await user.click(screen.getByRole('link', { name: 'Open Inventory' }));
    expect(await screen.findByRole('heading', { name: 'Inventory Overview' })).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: 'Inventory navigation' });
    expect(within(menu).getByRole('link', { name: 'Stock balances' })).toHaveAttribute(
      'href',
      '/inventory',
    );
    expect(within(menu).queryByRole('link', { name: 'Suppliers' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open app launcher' }));
    const launcher = screen.getByRole('dialog', { name: 'Switch application' });
    await user.click(within(launcher).getByRole('link', { name: 'Products' }));
    expect(await screen.findByRole('heading', { name: 'Products Overview' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Recently Used' }));
    expect(await screen.findByRole('heading', { name: 'Recently used apps' })).toBeInTheDocument();
    const cards = screen.getByLabelText('Recently used apps');
    expect(
      within(cards)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/apps/products', '/apps/inventory']);
  });
  it('keeps a selected branch consistent between Inventory and checkout', async () => {
    api(testUser, [...testBranches, secondBranch]);
    const user = userEvent.setup();
    open();
    await ready();
    await user.selectOptions(screen.getByLabelText('Business branch'), secondBranch.id);
    await user.click(screen.getByRole('link', { name: 'Open Inventory' }));
    expect(await screen.findByRole('heading', { name: 'Inventory Overview' })).toBeInTheDocument();
    expect(screen.getByLabelText('Business branch')).toHaveValue(secondBranch.id);
    expect((await screen.findAllByText('7')).length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole('heading', { name: 'Branch balances' }).parentElement!).queryByText(
        testBranches[0].name,
      ),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open app launcher' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Switch application' })).getByRole('link', {
        name: 'Point of Sale',
      }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Point of Sale Overview' }),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('navigation', { name: 'Point of Sale workspaces' })).getByRole(
        'link',
        { name: 'Checkout' },
      ),
    );
    expect(await screen.findByAltText('KEEN ERP')).toBeInTheDocument();
    expect(screen.getByLabelText('Business branch')).toHaveValue(secondBranch.id);
    expect(JSON.parse(localStorage.getItem(storageKey)!).branchId).toBe(secondBranch.id);
  });
  it('offers only assigned active branches', async () => {
    api({ ...testUser, branchIds: [secondBranch.id] }, [
      ...testBranches,
      secondBranch,
      { ...testBranches[0], id: 'inactive', status: 'INACTIVE' },
    ]);
    open();
    await ready();
    const options = within(screen.getByLabelText('Business branch')).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveValue(secondBranch.id);
  });
  it('redirects unauthorized app deep links to Apps Home', async () => {
    api({ ...testUser, roleKeys: ['CASHIER'], permissionCodes: ['pos:sell'] });
    open('/apps/administration');
    await ready();
    expect(window.location.pathname).toBe('/apps');
  });
  it('does not grant access to admin-only Reports when grouping apps', () => {
    const restricted = {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['reports:view', 'sales:view'],
    };
    const reports = appRegistry.find((app) => app.id === 'reports')!;
    expect(appModules(reports, restricted).map((module) => module.to)).toEqual(['/dashboard']);
    expect(canAccessPath(restricted, '/reports')).toBe(false);
    expect(visibleApps(restricted, true).some((app) => app.planned)).toBe(false);
    expect(searchApps(testUser, 'barcode').map((app) => app.id)).toEqual(['products']);
  });
  it('protects unfinished stock entry when switching branches or applications', async () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ branchId: testBranches[0].id, favorites: [], recent: [] }),
    );
    api(testUser, [...testBranches, secondBranch]);
    const user = userEvent.setup();
    open('/add-stock');
    await screen.findByRole('dialog', { name: 'Supplier Receipt' });
    await screen.findByDisplayValue('1200');
    await user.type(screen.getByLabelText('Quantity'), '4');
    await user.click(screen.getByRole('button', { name: 'Close supplier receipt' }));
    await user.selectOptions(screen.getByLabelText('Business branch'), secondBranch.id);
    expect(screen.getByRole('dialog', { name: 'Unsaved stock changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue entering stock' }));
    expect(screen.getByLabelText('Business branch')).toHaveValue(testBranches[0].id);
    await user.click(
      within(screen.getByRole('navigation', { name: 'Platform navigation' })).getByRole('link', {
        name: 'Apps',
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Unsaved stock changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue entering stock' }));
    expect(window.location.pathname).toBe('/add-stock');
    await user.click(screen.getByRole('button', { name: 'Supplier Receipt' }));
    expect(screen.getByLabelText('Quantity')).toHaveValue(4);
  });
});
