import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import {
  testBranches,
  testExpenses,
  testInventory,
  testOrganization,
  testProductCategories,
  testPermissions,
  testProducts,
  testRoles,
  testSuppliers,
  testUser,
} from './fixtures';

describe('App', () => {
  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-csrf-token; path=/';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('API unavailable in frontend test')),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.history.pushState({}, '', '/');
  });

  it('renders the login page with powered-by branding', async () => {
    window.history.pushState({}, '', '/login');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'User Login' })).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByText('Powered by CRENVIXMORAVA SYSTEMS')).toBeInTheDocument();
  });

  it('renders the dashboard shell with API data', async () => {
    window.history.pushState({}, '', '/dashboard');
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/api/v1/me')) {
          return jsonResponse(testUser);
        }

        if (url.endsWith('/api/v1/organization/current')) {
          return jsonResponse(testOrganization);
        }

        if (url.endsWith('/api/v1/branches')) {
          return jsonResponse(testBranches);
        }

        if (url.endsWith('/api/v1/inventory')) {
          return jsonResponse(testInventory);
        }

        if (url.endsWith('/api/v1/sales')) {
          return jsonResponse([]);
        }

        if (url.endsWith('/api/v1/expenses')) {
          return jsonResponse([]);
        }

        if (url.endsWith('/api/v1/auth/logout')) {
          expect(init?.method).toBe('POST');
          return Promise.resolve(new Response(null, { status: 204 }));
        }

        return Promise.reject(new Error('API unavailable in frontend test'));
      }),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: "Today's Dashboard" })).toBeInTheDocument();
    expect(screen.getByAltText('KEEN HR and POS')).toBeInTheDocument();
    expect(screen.getByText('Copyright @CRENVIX MORAVA SYSTEMS')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByLabelText(/active branch/i)).toBeInTheDocument();
    expect(screen.getByText("Today's Sales Performance")).toBeInTheDocument();
    expect(screen.queryByLabelText(/sales chart interval/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/search anything/i)).not.toBeInTheDocument();
  });

  it('shows products at or below reorder level on the low stock page', async () => {
    window.history.pushState({}, '', '/low-stock');
    const inventory = [
      {
        id: 'inventory-low',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        productId: testProducts[0].id,
        productName: testProducts[0].name,
        sku: testProducts[0].sku,
        categoryName: testProducts[0].categoryName,
        unitPrice: testProducts[0].unitPrice,
        quantityOnHand: 2,
        quantityReserved: 0,
        quantityAvailable: 2,
        reorderLevel: 5,
        stockHealth: 'LOW_STOCK' as const,
      },
      {
        id: 'inventory-healthy',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        productId: 'product-healthy',
        productName: 'Denim Jacket',
        sku: 'DEN-001',
        categoryName: 'Jackets',
        unitPrice: 4500,
        quantityOnHand: 12,
        quantityReserved: 0,
        quantityAvailable: 12,
        reorderLevel: 5,
        stockHealth: 'HEALTHY' as const,
      },
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/v1/me')) {
          return jsonResponse(testUser);
        }

        if (url.endsWith('/api/v1/organization/current')) {
          return jsonResponse(testOrganization);
        }

        if (url.endsWith('/api/v1/branches')) {
          return jsonResponse(testBranches);
        }

        if (url.endsWith('/api/v1/inventory')) {
          return jsonResponse(inventory);
        }

        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Low Stock' })).toBeInTheDocument();
    expect(await screen.findByText('Oxford Shirt')).toBeInTheDocument();
    expect(screen.getByText('Products At or Below Reorder Level')).toBeInTheDocument();
    expect(screen.queryByText('Denim Jacket')).not.toBeInTheDocument();
  });

  it('updates inventory reorder levels through the API', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/inventory');
    const inventoryItem = {
      id: 'inventory-001',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      productId: testProducts[0].id,
      productName: testProducts[0].name,
      sku: testProducts[0].sku,
      categoryName: testProducts[0].categoryName,
      unitPrice: testProducts[0].unitPrice,
      quantityOnHand: 2,
      quantityReserved: 0,
      quantityAvailable: 2,
      reorderLevel: 3,
      stockHealth: 'LOW_STOCK' as const,
    };
    const updatedInventoryItem = {
      ...inventoryItem,
      reorderLevel: 10,
    };
    let reorderRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/inventory') && method === 'GET') {
        return jsonResponse([inventoryItem]);
      }

      if (url.endsWith(`/api/v1/inventory/${inventoryItem.id}/reorder-level`)) {
        expect(method).toBe('PUT');
        reorderRequest = JSON.parse(String(init?.body));
        return jsonResponse(updatedInventoryItem);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const reorderInput = await screen.findByRole('spinbutton', {
      name: /reorder level for Oxford Shirt at Flagship Branch/i,
    });
    await user.clear(reorderInput);
    await user.type(reorderInput, '10');
    await user.click(
      screen.getByRole('button', {
        name: /save reorder level for Oxford Shirt at Flagship Branch/i,
      }),
    );

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(reorderRequest).toEqual({ reorderLevel: 10 });
  });

  it('restricts shop manager and cashier navigation and profit dashboard content', async () => {
    window.history.pushState({}, '', '/dashboard');
    const restrictedUser = {
      ...testUser,
      displayName: 'Samuel Kamau',
      roleKeys: ['SHOP_MANAGER', 'CASHIER'],
      roleNames: ['Shop Manager', 'Cashier'],
      permissionCodes: ['pos:sell', 'pos:supervise', 'profit:view', 'reports:view', 'sales:view'],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/v1/me')) {
          return jsonResponse(restrictedUser);
        }

        if (url.endsWith('/api/v1/organization/current')) {
          return jsonResponse(testOrganization);
        }

        if (url.endsWith('/api/v1/branches')) {
          return jsonResponse(testBranches);
        }

        if (url.endsWith('/api/v1/inventory')) {
          return jsonResponse(testInventory);
        }

        if (url.endsWith('/api/v1/sales')) {
          return jsonResponse([]);
        }

        if (url.endsWith('/api/v1/expenses')) {
          return jsonResponse(testExpenses);
        }

        if (url.endsWith('/api/v1/stock-adjustments/summary')) {
          return jsonResponse({
            lossItems: 0,
            excessItems: 0,
            totalLossQuantity: 0,
            totalExcessQuantity: 0,
            totalLossValue: 0,
            totalExcessValue: 0,
            netValue: 0,
          });
        }

        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: "Today's Dashboard" })).toBeInTheDocument();
    expect(screen.getByText('Shop Manager / Cashier')).toBeInTheDocument();
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Branches' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Product Catalog' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Suppliers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add Stock' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Transfers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'HR' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Gross Profit')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated Contribution')).not.toBeInTheDocument();
    expect(screen.getAllByText('Expenses').length).toBeGreaterThan(0);
  });

  it('redirects non-admin users with HR permissions away from HR', async () => {
    window.history.pushState({}, '', '/hr');
    const hrPermissionUser = {
      ...testUser,
      displayName: 'Grace Wanjiru',
      roleKeys: ['SHOP_MANAGER'],
      roleNames: ['Shop Manager'],
      permissionCodes: ['hr:dashboard:view', 'hr:employee:view', 'reports:view', 'sales:view'],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/v1/me')) {
          return jsonResponse(hrPermissionUser);
        }

        if (url.endsWith('/api/v1/organization/current')) {
          return jsonResponse(testOrganization);
        }

        if (url.endsWith('/api/v1/branches')) {
          return jsonResponse(testBranches);
        }

        if (url.endsWith('/api/v1/inventory')) {
          return jsonResponse(testInventory);
        }

        if (url.endsWith('/api/v1/sales')) {
          return jsonResponse([]);
        }

        if (url.endsWith('/api/v1/expenses')) {
          return jsonResponse(testExpenses);
        }

        if (url.endsWith('/api/v1/stock-adjustments/summary')) {
          return jsonResponse({
            lossItems: 0,
            excessItems: 0,
            totalLossQuantity: 0,
            totalExcessQuantity: 0,
            totalLossValue: 0,
            totalExcessValue: 0,
            netValue: 0,
          });
        }

        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }),
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: "Today's Dashboard" })).toBeInTheDocument();
    expect(screen.getByText('Shop Manager')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'HR' })).not.toBeInTheDocument();
  });

  it('shows dashboard sales and payment totals from recorded sales', async () => {
    window.history.pushState({}, '', '/dashboard');
    const sale = {
      id: 'sale-001',
      saleNumber: 'SALE-001',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      customerName: null,
      subtotalAmount: 2800,
      discountAmount: 0,
      taxAmount: 448,
      totalAmount: 3248,
      status: 'COMPLETED',
      soldAt: new Date().toISOString(),
      lines: [
        {
          productId: testProducts[0].id,
          productName: testProducts[0].name,
          sku: testProducts[0].sku,
          categoryName: testProducts[0].categoryName,
          quantity: 1,
          unitPrice: testProducts[0].unitPrice,
          costPrice: testProducts[0].costPrice,
          lineTotal: testProducts[0].unitPrice,
        },
      ],
      payments: [
        {
          id: 'payment-001',
          method: 'MPESA',
          amount: 3248,
          status: 'SETTLED',
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/v1/me')) {
          return jsonResponse(testUser);
        }

        if (url.endsWith('/api/v1/organization/current')) {
          return jsonResponse(testOrganization);
        }

        if (url.endsWith('/api/v1/branches')) {
          return jsonResponse(testBranches);
        }

        if (url.endsWith('/api/v1/inventory')) {
          return jsonResponse(testInventory);
        }

        if (url.endsWith('/api/v1/sales')) {
          return jsonResponse([sale]);
        }

        if (url.endsWith('/api/v1/expenses')) {
          return jsonResponse([]);
        }

        return Promise.reject(new Error(`Unexpected request: ${url}`));
      }),
    );

    render(<App />);

    expect(await screen.findByText('Sales by Payment Method')).toBeInTheDocument();
    expect((await screen.findAllByText('KSh 3,248')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('KSh 1,600')).length).toBeGreaterThan(0);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Oxford Shirt')).toBeInTheDocument();
    expect(screen.queryByText('KSh 1,248,500')).not.toBeInTheDocument();
  });

  it('retries dashboard API calls against the local backend when the dev proxy returns HTML', async () => {
    window.history.pushState({}, '', '/dashboard');
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url === 'http://localhost:8080/api/v1/organization/current') {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return Promise.resolve(
          new Response('<!doctype html><html><body></body></html>', {
            status: 200,
            headers: {
              'Content-Type': 'text/html',
            },
          }),
        );
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/inventory')) {
        return jsonResponse(testInventory);
      }

      if (url.endsWith('/api/v1/sales')) {
        return jsonResponse([]);
      }

      if (url.endsWith('/api/v1/expenses')) {
        return jsonResponse([]);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByRole('heading', { name: "Today's Dashboard" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/organization/current',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('posts login credentials and logs out through the API', async () => {
    const user = userEvent.setup();
    const testEmail = 'admin@example.com';
    const testPassword = 'test-admin-password';
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/v1/auth/login')) {
        expect(init?.method).toBe('POST');
        expect((init?.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('test-csrf-token');
        expect(init?.body).toBe(
          JSON.stringify({
            username: testEmail,
            password: testPassword,
            rememberDevice: true,
          }),
        );
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/inventory')) {
        return jsonResponse(testInventory);
      }

      if (url.endsWith('/api/v1/sales')) {
        return jsonResponse([]);
      }

      if (url.endsWith('/api/v1/expenses')) {
        return jsonResponse([]);
      }

      if (url.endsWith('/api/v1/auth/logout')) {
        expect(init?.method).toBe('POST');
        expect((init?.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('test-csrf-token');
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/login');

    render(<App />);

    await user.type(
      await screen.findByLabelText(/email or username/i, { selector: 'input' }),
      testEmail,
    );
    await user.type(
      await screen.findByLabelText(/^password$/i, { selector: 'input' }),
      testPassword,
    );
    await user.click(await screen.findByRole('button', { name: /login/i }));

    expect(await screen.findByRole('heading', { name: "Today's Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /log out/i }));

    expect(await screen.findByRole('heading', { name: 'User Login' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/logout'),
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('registers a branch through the API', async () => {
    const user = userEvent.setup();
    const branch = {
      id: 'branch-001',
      name: 'Nakuru Store',
      code: 'NAK',
      timeZone: 'Africa/Nairobi',
      status: 'ACTIVE' as const,
    };
    let branches: typeof testBranches = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches') && method === 'GET') {
        return jsonResponse(branches);
      }

      if (url.endsWith('/api/v1/branches') && method === 'POST') {
        expect(init?.body).toBe(
          JSON.stringify({
            name: 'Nakuru Store',
            code: 'NAK',
            timeZone: 'Africa/Nairobi',
            status: 'ACTIVE',
          }),
        );
        branches = [branch];
        return jsonResponse(branch, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/branches');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Branches' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/branch name/i), 'Nakuru Store');
    await user.type(screen.getByLabelText(/branch code/i), 'NAK');
    await user.clear(screen.getByLabelText(/time zone/i));
    await user.type(screen.getByLabelText(/time zone/i), 'Africa/Nairobi');
    await user.click(screen.getByRole('button', { name: /^Register Branch$/i }));

    expect((await screen.findAllByText('Nakuru Store')).length).toBeGreaterThan(0);
  });

  it('registers a supplier through the API', async () => {
    const user = userEvent.setup();
    let suppliers: typeof testSuppliers = [];
    let createdRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/suppliers') && method === 'GET') {
        return jsonResponse(suppliers);
      }

      if (url.endsWith('/api/v1/suppliers') && method === 'POST') {
        createdRequest = JSON.parse(String(init?.body));
        const savedSupplier = {
          id: '00000000-0000-4000-8000-000000000902',
          ...(createdRequest as Record<string, unknown>),
        };
        suppliers = [savedSupplier as (typeof suppliers)[number]];
        return jsonResponse(savedSupplier, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/suppliers');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Suppliers' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Supplier Name$/i), 'Keen Supplier');
    await user.type(screen.getByLabelText(/^Contact Person$/i), 'Jane Supplier');
    await user.type(screen.getByLabelText(/^Phone$/i), '+254700000001');
    await user.type(screen.getByLabelText(/^Email$/i), 'supplier@example.com');
    await user.type(screen.getByLabelText(/^Notes$/i), 'Main stock supplier');
    await user.click(screen.getByRole('button', { name: /^Register Supplier$/i }));

    expect(await screen.findByText('Keen Supplier saved.')).toBeInTheDocument();
    expect(createdRequest).toEqual({
      name: 'Keen Supplier',
      contactPerson: 'Jane Supplier',
      phone: '+254700000001',
      email: 'supplier@example.com',
      notes: 'Main stock supplier',
      status: 'ACTIVE',
    });
  });

  it('registers roles with editable keys and assigned permissions', async () => {
    const user = userEvent.setup();
    let roles = [...testRoles];
    let createdRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/permissions')) {
        return jsonResponse(testPermissions);
      }

      if (url.endsWith('/api/v1/roles') && method === 'GET') {
        return jsonResponse(roles);
      }

      if (url.endsWith('/api/v1/roles') && method === 'POST') {
        createdRequest = JSON.parse(String(init?.body));
        const savedRole = {
          id: '00000000-0000-4000-8000-000000000408',
          name: 'Shop Supervisor',
          key: 'SHOP_SUPERVISOR',
          description: 'Front of house supervision',
          assignedUsers: 0,
          permissionIds: [testPermissions[1].id, testPermissions[2].id],
          permissionCodes: [testPermissions[1].code, testPermissions[2].code],
        };
        roles = [...roles, savedRole];
        return jsonResponse(savedRole, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/roles');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Role Name$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^New Role$/i }));
    expect(await screen.findByRole('dialog', { name: /^Register Role$/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Role Name$/i), 'Shop Supervisor');
    expect(screen.getByLabelText(/^Role Key$/i)).toHaveValue('SHOP_SUPERVISOR');
    await user.type(screen.getAllByLabelText(/^Description$/i)[0], 'Front of house supervision');
    await user.click(screen.getByLabelText(/pos:sell/i));
    await user.click(screen.getByLabelText(/reports:view/i));
    await user.click(screen.getByRole('button', { name: /^Register Role$/i }));

    expect(await screen.findByText('Shop Supervisor saved.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /^Register Role$/i })).not.toBeInTheDocument();
    expect(createdRequest).toMatchObject({
      name: 'Shop Supervisor',
      key: 'SHOP_SUPERVISOR',
      description: 'Front of house supervision',
      permissionIds: [testPermissions[1].id, testPermissions[2].id],
    });
  });

  it('shows effective user permissions from assigned roles', async () => {
    const user = userEvent.setup();
    const staffUsers = [
      {
        id: '00000000-0000-4000-8000-000000000302',
        email: 'cashier@example.com',
        displayName: 'Jane Cashier',
        status: 'ACTIVE',
        roleIds: [testRoles[0].id],
        roleNames: [testRoles[0].name],
        permissionCodes: testRoles[0].permissionCodes,
        branchIds: [],
        branchNames: [],
      },
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/roles')) {
        return jsonResponse(testRoles);
      }

      if (url.endsWith('/api/v1/users')) {
        return jsonResponse(staffUsers);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/users');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(await screen.findByText('Jane Cashier')).toBeInTheDocument();
    expect(screen.getByText('sales:view')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Cashier (CASHIER)'));

    expect((await screen.findAllByText('pos:sell')).length).toBeGreaterThan(1);
  });

  it('registers a user with a password through the API', async () => {
    const user = userEvent.setup();
    let createdRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/roles')) {
        return jsonResponse(testRoles);
      }

      if (url.endsWith('/api/v1/users') && method === 'POST') {
        createdRequest = JSON.parse(String(init?.body));
        return jsonResponse(
          {
            id: '00000000-0000-4000-8000-000000000309',
            email: 'new-user@example.com',
            displayName: 'New User',
            status: 'ACTIVE',
            roleIds: [testRoles[0].id],
            roleNames: [testRoles[0].name],
            permissionCodes: testRoles[0].permissionCodes,
            branchIds: [],
            branchNames: [],
          },
          201,
        );
      }

      if (url.endsWith('/api/v1/users')) {
        return jsonResponse([]);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/users');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Display Name$/i), 'New User');
    await user.type(screen.getByLabelText(/^Email$/i), 'new-user@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'new-user-password');
    await user.click(screen.getByLabelText('Cashier (CASHIER)'));
    await user.click(screen.getByRole('button', { name: /^Register User$/i }));

    expect(await screen.findByText('New User saved.')).toBeInTheDocument();
    expect(createdRequest).toMatchObject({
      email: 'new-user@example.com',
      password: 'new-user-password',
      displayName: 'New User',
      status: 'ACTIVE',
      roleIds: [testRoles[0].id],
      branchIds: [],
    });
  });

  it('sends a replacement password when editing a user', async () => {
    const user = userEvent.setup();
    const staffUser = {
      id: '00000000-0000-4000-8000-000000000302',
      email: 'cashier@example.com',
      displayName: 'Jane Cashier',
      status: 'ACTIVE',
      roleIds: [testRoles[0].id],
      roleNames: [testRoles[0].name],
      permissionCodes: testRoles[0].permissionCodes,
      branchIds: [],
      branchNames: [],
    };
    let updatedRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/roles')) {
        return jsonResponse(testRoles);
      }

      if (url.endsWith(`/api/v1/users/${staffUser.id}`) && method === 'PUT') {
        updatedRequest = JSON.parse(String(init?.body));
        return jsonResponse({ ...staffUser, displayName: 'Jane Cashier' });
      }

      if (url.endsWith('/api/v1/users')) {
        return jsonResponse([staffUser]);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/users');

    render(<App />);

    expect(await screen.findByText('Jane Cashier')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Edit$/i }));

    const passwordInput = screen.getByLabelText(/^Password$/i);
    expect(passwordInput).toHaveValue('');
    await user.type(passwordInput, 'replacement-password');
    await user.click(screen.getByRole('button', { name: /^Save Changes$/i }));

    expect(await screen.findByText('Jane Cashier saved.')).toBeInTheDocument();
    expect(updatedRequest).toMatchObject({
      email: 'cashier@example.com',
      password: 'replacement-password',
      displayName: 'Jane Cashier',
      status: 'ACTIVE',
      roleIds: [testRoles[0].id],
      branchIds: [],
    });
  });

  it('prefills editable SKU and barcode values when registering a product', async () => {
    const user = userEvent.setup();
    let products = [...testProducts];
    let createdRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/catalog/categories')) {
        return jsonResponse(testProductCategories);
      }

      if (url.endsWith('/api/v1/catalog/products') && method === 'GET') {
        return jsonResponse(products);
      }

      if (url.endsWith('/api/v1/catalog/products') && method === 'POST') {
        createdRequest = JSON.parse(String(init?.body));
        const savedProduct = {
          id: '00000000-0000-4000-8000-000000000802',
          ...(createdRequest as Record<string, unknown>),
          categoryName: testProductCategories[0].name,
          totalStock: 0,
        };
        products = [...products, savedProduct as (typeof products)[number]];
        return jsonResponse(savedProduct, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/product-catalog');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
    expect(await screen.findByText('Oxford Shirt')).toBeInTheDocument();
    expect(await screen.findByText('Menswear')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const editBarcodeInput = screen.getByLabelText(/^Barcode$/i) as HTMLInputElement;
    expect(editBarcodeInput.value).toMatch(/^200\d{10}$/);
    await user.click(screen.getByRole('button', { name: /close product dialog/i }));

    await user.click(screen.getByRole('button', { name: /new product/i }));

    const skuInput = screen.getByLabelText(/^SKU$/i) as HTMLInputElement;
    const barcodeInput = screen.getByLabelText(/^Barcode$/i) as HTMLInputElement;
    expect(skuInput.value).toBe('SKU-0002');
    expect(barcodeInput.value).toMatch(/^200\d{10}$/);

    await user.type(screen.getByLabelText(/^Product Name$/i), 'Linen Jacket');
    await user.type(screen.getByLabelText(/^Selling Price$/i), '3500');
    await user.type(screen.getByLabelText(/^Buying Price$/i), '1800');
    await user.clear(skuInput);
    await user.type(skuInput, 'manual-42');
    await user.clear(barcodeInput);
    await user.type(barcodeInput, '9912345678901');
    await user.click(screen.getByRole('button', { name: /^Register Product$/i }));

    expect(await screen.findByText('Linen Jacket saved.')).toBeInTheDocument();
    expect(createdRequest).toMatchObject({
      name: 'Linen Jacket',
      sku: 'MANUAL-42',
      barcode: '9912345678901',
      unitPrice: 3500,
      costPrice: 1800,
    });
  });

  it('reactivates inactive catalog categories and products', async () => {
    const user = userEvent.setup();
    let categories = testProductCategories.map((category) => ({
      ...category,
      status: 'INACTIVE' as const,
    }));
    let products = testProducts.map((product) => ({
      ...product,
      status: 'INACTIVE' as const,
    }));
    let categoryUpdateRequest: unknown;
    let productUpdateRequest: unknown;
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/catalog/categories') && method === 'GET') {
        return jsonResponse(categories);
      }

      if (url.endsWith(`/api/v1/catalog/categories/${categories[0].id}`) && method === 'PUT') {
        categoryUpdateRequest = JSON.parse(String(init?.body));
        categories = [
          {
            ...categories[0],
            ...(categoryUpdateRequest as Record<string, unknown>),
          },
        ];
        return jsonResponse(categories[0]);
      }

      if (url.endsWith('/api/v1/catalog/products') && method === 'GET') {
        return jsonResponse(products);
      }

      if (url.endsWith(`/api/v1/catalog/products/${products[0].id}`) && method === 'PUT') {
        productUpdateRequest = JSON.parse(String(init?.body));
        products = [
          {
            ...products[0],
            ...(productUpdateRequest as Record<string, unknown>),
            categoryName: categories[0].name,
            totalStock: products[0].totalStock,
          },
        ];
        return jsonResponse(products[0]);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/product-catalog');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /^Reactivate$/i })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /^Reactivate$/i })[0]);

    expect(await screen.findByText('Oxford Shirt reactivated.')).toBeInTheDocument();
    expect(productUpdateRequest).toMatchObject({
      name: 'Oxford Shirt',
      sku: 'OXF-001',
      categoryId: testProductCategories[0].id,
      status: 'ACTIVE',
    });

    await user.click(screen.getByRole('button', { name: /^Reactivate$/i }));

    expect(await screen.findByText('Shirts category reactivated.')).toBeInTheDocument();
    expect(categoryUpdateRequest).toEqual({
      name: 'Shirts',
      code: 'SHIRTS',
      status: 'ACTIVE',
    });
  });

  it('stages add-stock lines and posts the supplier receipt after invoice review', async () => {
    const user = userEvent.setup();
    const alternateProduct = {
      ...testProducts[0],
      id: '00000000-0000-4000-8000-000000000802',
      name: 'Denim Jacket',
      sku: 'DNM-002',
      costPrice: 900,
      unitPrice: 3200,
      colors: ['Black'],
    };
    const products = [testProducts[0], alternateProduct];
    let stockIntakes: unknown[] = [];
    const postedRequests: unknown[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/catalog/products')) {
        return jsonResponse(products);
      }

      if (url.endsWith('/api/v1/suppliers')) {
        return jsonResponse(testSuppliers);
      }

      if (url.endsWith('/api/v1/inventory')) {
        return jsonResponse(testInventory);
      }

      if (url.endsWith('/api/v1/stock-intakes') && method === 'GET') {
        return jsonResponse(stockIntakes);
      }

      if (url.endsWith('/api/v1/stock-intakes') && method === 'POST') {
        const postedRequest = JSON.parse(String(init?.body));
        postedRequests.push(postedRequest);
        const savedIntake = {
          id: `stock-intake-${postedRequests.length}`,
          branchId: testBranches[0].id,
          branchName: testBranches[0].name,
          productId: postedRequest.productId,
          productName:
            products.find((product) => product.id === postedRequest.productId)?.name ??
            testProducts[0].name,
          sku:
            products.find((product) => product.id === postedRequest.productId)?.sku ??
            testProducts[0].sku,
          supplierName: postedRequest.supplierName,
          referenceNumber: postedRequest.referenceNumber,
          quantity: postedRequest.quantity,
          unitCost: postedRequest.unitCost,
          notes: postedRequest.notes,
          receivedAt: '2026-09-10T09:00:00Z',
        };
        stockIntakes = [savedIntake, ...stockIntakes];
        return jsonResponse(savedIntake, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/add-stock');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Add Stock' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('1200')).toBeInTheDocument();

    const productInput = screen.getByLabelText(/^Product$/i);
    await user.clear(productInput);
    await user.type(productInput, 'denim');
    await user.click(await screen.findByRole('option', { name: /Denim Jacket/i }));
    expect(await screen.findByDisplayValue('900')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^Supplier$/i), 'Keen Supplier');
    await user.type(screen.getByLabelText(/^Reference$/i), 'INV-220');
    await user.type(screen.getByLabelText(/^Quantity$/i), '3');
    await user.click(screen.getByRole('button', { name: /^Add Line$/i }));

    expect(postedRequests).toHaveLength(0);
    expect(await screen.findByText('Total Invoice Amount')).toBeInTheDocument();
    expect((await screen.findAllByText('KSh 2,700')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /^Post Receipt$/i }));

    expect(await screen.findByText(/Posted 1 stock line/)).toBeInTheDocument();
    expect(postedRequests).toEqual([
      {
        branchId: testBranches[0].id,
        productId: alternateProduct.id,
        supplierName: 'Keen Supplier',
        referenceNumber: 'INV-220',
        quantity: 3,
        unitCost: 900,
        notes: '',
      },
    ]);
  });

  it('completes and records a POS sale through the API', async () => {
    const user = userEvent.setup();
    const products = testProducts.map((product) => ({ ...product, totalStock: 2 }));
    const inventory = [
      {
        id: 'inventory-001',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        productId: products[0].id,
        productName: products[0].name,
        sku: products[0].sku,
        categoryName: products[0].categoryName,
        unitPrice: products[0].unitPrice,
        quantityOnHand: 2,
        quantityReserved: 0,
        quantityAvailable: 2,
        reorderLevel: 0,
        stockHealth: 'HEALTHY' as const,
      },
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/catalog/products')) {
        return jsonResponse(products);
      }

      if (url.endsWith('/api/v1/inventory')) {
        return jsonResponse(inventory);
      }

      if (url.endsWith('/api/v1/sales') && method === 'GET') {
        return jsonResponse([]);
      }

      if (url.endsWith('/api/v1/sales') && method === 'POST') {
        expect((init?.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^pos-/);
        expect((init?.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('test-csrf-token');
        expect(init?.body).toBe(
          JSON.stringify({
            branchId: testBranches[0].id,
            customerName: '',
            discountAmount: 0,
            payments: [
              {
                method: 'CASH',
                amount: 3248,
                paymentReference: '',
                cashReceived: 4000,
              },
            ],
            lines: [
              {
                productId: products[0].id,
                quantity: 1,
              },
            ],
          }),
        );
        return jsonResponse(
          {
            id: 'sale-001',
            saleNumber: 'SALE-001',
            branchId: testBranches[0].id,
            branchName: testBranches[0].name,
            customerName: null,
            subtotalAmount: 2800,
            discountAmount: 0,
            taxAmount: 448,
            totalAmount: 3248,
            status: 'COMPLETED',
            soldAt: '2026-09-08T10:00:00Z',
            lines: [
              {
                productId: products[0].id,
                productName: products[0].name,
                sku: products[0].sku,
                categoryName: products[0].categoryName,
                quantity: 1,
                unitPrice: products[0].unitPrice,
                costPrice: products[0].costPrice,
                lineTotal: products[0].unitPrice,
              },
            ],
            payments: [
              {
                id: 'payment-001',
                method: 'CASH',
                amount: 3248,
                status: 'SETTLED',
                cashReceived: 4000,
                changeDue: 752,
              },
            ],
          },
          201,
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/pos');

    render(<App />);

    const productSearchInput = await screen.findByLabelText(
      /search product by name, sku, category, size, or color/i,
    );
    await user.keyboard('{F3}');
    expect(productSearchInput).toHaveFocus();

    await user.click(await screen.findByRole('button', { name: /Oxford Shirt/i }));
    await user.click(screen.getByRole('button', { name: /Pay KSh 3,248/i }));
    await user.selectOptions(screen.getByLabelText(/payment method/i), 'CASH');
    await user.type(await screen.findByLabelText(/cash received/i), '4000');
    await user.click(await screen.findByRole('button', { name: /Complete Sale/i }));

    expect(await screen.findByText('Sale SALE-001 recorded.')).toBeInTheDocument();
    const receiptDialog = await screen.findByRole('dialog', { name: /receipt/i });
    const receiptMeta = receiptDialog.querySelector('.receipt-meta') as HTMLElement;
    expect(receiptDialog).toBeInTheDocument();
    expect(receiptMeta.querySelector('strong')).toBeNull();
    expect(within(receiptMeta).getByText('SALE-001')).toHaveClass('receipt-meta-value');
    expect(within(receiptDialog).queryByText('Customer')).not.toBeInTheDocument();
    expect(within(receiptDialog).queryByText('Walk-in Customer')).not.toBeInTheDocument();
    expect(within(receiptDialog).queryByText(products[0].sku)).not.toBeInTheDocument();
    expect(within(receiptDialog).queryByText(/VAT KSh/i)).not.toBeInTheDocument();
    expect(within(receiptDialog).queryByText('- KSh 0')).not.toBeInTheDocument();
    expect(within(receiptDialog).getByText('KSh 0')).toBeInTheDocument();
    expect(within(receiptDialog).getByText(products[0].name).tagName.toLowerCase()).toBe('span');
    expect(screen.getByText('KSh 4,000')).toBeInTheDocument();
    expect(screen.getByText('KSh 752')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print receipt/i })).toBeInTheDocument();
  });

  it('records a POS sale with split payments', async () => {
    const user = userEvent.setup();
    const products = testProducts.map((product) => ({ ...product, totalStock: 2 }));
    const inventory = [
      {
        id: 'inventory-001',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        productId: products[0].id,
        productName: products[0].name,
        sku: products[0].sku,
        categoryName: products[0].categoryName,
        unitPrice: products[0].unitPrice,
        quantityOnHand: 2,
        quantityReserved: 0,
        quantityAvailable: 2,
        reorderLevel: 0,
        stockHealth: 'HEALTHY' as const,
      },
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/catalog/products')) {
        return jsonResponse(products);
      }

      if (url.endsWith('/api/v1/inventory')) {
        return jsonResponse(inventory);
      }

      if (url.endsWith('/api/v1/sales') && method === 'GET') {
        return jsonResponse([]);
      }

      if (url.endsWith('/api/v1/sales') && method === 'POST') {
        expect(init?.body).toBe(
          JSON.stringify({
            branchId: testBranches[0].id,
            customerName: '',
            discountAmount: 0,
            payments: [
              {
                method: 'MPESA',
                amount: 1248,
                paymentReference: 'MPE-123',
              },
              {
                method: 'CASH',
                amount: 2000,
                paymentReference: '',
                cashReceived: 2000,
              },
            ],
            lines: [
              {
                productId: products[0].id,
                quantity: 1,
              },
            ],
          }),
        );
        return jsonResponse(
          {
            id: 'sale-002',
            saleNumber: 'SALE-002',
            branchId: testBranches[0].id,
            branchName: testBranches[0].name,
            customerName: null,
            subtotalAmount: 2800,
            discountAmount: 0,
            taxAmount: 448,
            totalAmount: 3248,
            status: 'COMPLETED',
            soldAt: '2026-09-08T10:00:00Z',
            lines: [
              {
                productId: products[0].id,
                productName: products[0].name,
                sku: products[0].sku,
                categoryName: products[0].categoryName,
                quantity: 1,
                unitPrice: products[0].unitPrice,
                costPrice: products[0].costPrice,
                lineTotal: products[0].unitPrice,
              },
            ],
            payments: [
              {
                id: 'payment-001',
                method: 'MPESA',
                amount: 1248,
                status: 'SETTLED',
                reference: 'MPE-123',
              },
              {
                id: 'payment-002',
                method: 'CASH',
                amount: 2000,
                status: 'SETTLED',
                cashReceived: 2000,
                changeDue: 0,
              },
            ],
          },
          201,
        );
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/pos');

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Oxford Shirt/i }));
    await user.click(screen.getByRole('button', { name: /Pay KSh 3,248/i }));
    await user.click(await screen.findByRole('button', { name: /Split Payment/i }));
    await user.type(screen.getByLabelText(/payment 1 amount/i), '1248');
    await user.type(screen.getByLabelText(/payment 1 reference/i), 'MPE-123');
    expect(screen.getByLabelText(/payment 2 amount/i)).toHaveValue(2000);
    expect(screen.queryByLabelText(/payment 2 cash received/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Complete Sale/i }));

    expect(await screen.findByText('Sale SALE-002 recorded.')).toBeInTheDocument();
    expect(await screen.findByText(/Split: M-Pesa \+ Cash/i)).toBeInTheDocument();
    expect(screen.getByText('KSh 2,000')).toBeInTheDocument();
  });

  it('records and lists branch expenses through the API', async () => {
    const user = userEvent.setup();
    let expenses = [...testExpenses];
    const newExpense = {
      id: 'expense-002',
      expenseNumber: 'EXP-002',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      category: 'Utilities',
      description: 'Electricity bill',
      vendorName: 'Kenya Power',
      amount: 1800,
      paymentMethod: 'MPESA' as const,
      paymentReference: 'MPE-002',
      status: 'PAID' as const,
      notes: 'Monthly bill',
      incurredAt: '2026-09-08T11:00:00Z',
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';

      if (url.endsWith('/api/v1/me')) {
        return jsonResponse(testUser);
      }

      if (url.endsWith('/api/v1/organization/current')) {
        return jsonResponse(testOrganization);
      }

      if (url.endsWith('/api/v1/branches')) {
        return jsonResponse(testBranches);
      }

      if (url.endsWith('/api/v1/expenses') && method === 'GET') {
        return jsonResponse(expenses);
      }

      if (url.endsWith('/api/v1/expenses') && method === 'POST') {
        expect(init?.body).toBe(
          JSON.stringify({
            branchId: testBranches[0].id,
            category: 'Utilities',
            description: 'Electricity bill',
            vendorName: 'Kenya Power',
            amount: 1800,
            paymentMethod: 'MPESA',
            paymentReference: 'MPE-002',
            status: 'PAID',
            notes: 'Monthly bill',
          }),
        );
        expenses = [newExpense, ...expenses];
        return jsonResponse(newExpense, 201);
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    vi.stubGlobal('fetch', fetchMock);
    window.history.pushState({}, '', '/expenses');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
    expect(screen.queryByText(/Spend by Category/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^category$/i), 'Utilities');
    await user.type(screen.getByLabelText(/^description$/i), 'Electricity bill');
    await user.type(screen.getByLabelText(/^vendor$/i), 'Kenya Power');
    await user.type(screen.getByLabelText(/^amount$/i), '1800');
    await user.type(screen.getByLabelText(/^reference$/i), 'MPE-002');
    await user.type(screen.getByLabelText(/^notes$/i), 'Monthly bill');
    await user.click(screen.getByRole('button', { name: /^Record Expense$/i }));

    expect(await screen.findByText('EXP-002 recorded.')).toBeInTheDocument();
    expect((await screen.findAllByText('Electricity bill')).length).toBeGreaterThan(0);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}
