import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
const hotelBranch: Branch = {
  ...testBranches[0],
  id: 'hotel-location',
  name: 'Keen Hotel',
  code: 'HOTEL',
  branchType: 'HOTEL',
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
function api(
  user: CurrentUser = testUser,
  branches = testBranches,
  organization = testOrganization,
  omitAvailabilityCollections = false,
  additionalRecords: Record<string, unknown> = {},
) {
  const records: Record<string, unknown> = {
    '/api/v1/me': user,
    '/api/v1/organization/current': organization,
    '/api/v1/branches': branches,
    '/api/v1/inventory': inventory,
    '/api/v1/catalog/products': testProducts,
    '/api/v1/catalog/categories': testProductCategories,
    '/api/v1/stock-intakes': [],
    '/api/v1/stock-adjustments': [],
    '/api/v1/sales': [],
    '/api/v1/sales/hotel-summary': { totalAmount: 1250, transactions: 2, itemsSold: 4 },
    '/api/v1/hotel/sales-history': [],
    '/api/v1/expenses': [],
    '/api/v1/suppliers': testSuppliers,
    '/api/v1/customers': [],
    '/api/v1/stock-operations': [],
    '/api/v1/hr/employees': [
      {
        id: 'employee-one',
        userId: 'employee-account',
        employeeNumber: 'EMP-000001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        employmentType: 'PERMANENT',
        employmentStatus: 'ACTIVE',
        joiningDate: '2025-01-01',
        basicSalary: 45000,
        active: true,
      },
    ],
    '/api/v1/users': [
      {
        id: 'employee-account',
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
        status: 'ACTIVE',
        roleIds: ['cashier-role'],
        roleNames: ['Cashier'],
        permissionCodes: ['pos:sell'],
        branchIds: [testBranches[0].id],
        branchNames: [testBranches[0].name],
      },
      {
        id: 'available-account',
        email: 'bob@example.com',
        displayName: 'Bob Smith',
        status: 'ACTIVE',
        roleIds: ['manager-role'],
        roleNames: ['Shop Manager'],
        permissionCodes: ['pos:supervise'],
        branchIds: [testBranches[0].id],
        branchNames: [testBranches[0].name],
      },
      {
        id: 'unassigned-account',
        email: 'carol@example.com',
        displayName: 'Carol Jones',
        status: 'ACTIVE',
        roleIds: [],
        roleNames: [],
        permissionCodes: [],
        branchIds: [],
        branchNames: [],
      },
      {
        id: 'waiter-account',
        email: 'waiter@example.com',
        displayName: 'Hotel Waiter',
        status: 'ACTIVE',
        roleIds: ['waiter-role'],
        roleNames: ['Waiter'],
        permissionCodes: [],
        branchIds: [hotelBranch.id],
        branchNames: [hotelBranch.name],
      },
    ],
    '/api/v1/hr/attendance': [],
    '/api/v1/hr/admin/summary': {
      month: '2026-11',
      staff: [
        {
          employeeId: 'employee-one',
          userId: 'employee-account',
          employeeNumber: 'EMP-000001',
          employeeName: 'Ada Lovelace',
          jobTitle: 'Cashier',
          branchId: testBranches[0].id,
          branchName: testBranches[0].name,
          workedMinutes: 480,
          workingDays: 1,
          absentDays: 0,
          offDays: 0,
          sickDays: 0,
          annualLeaveDays: 0,
          pendingRequests: 0,
          sales: 1200,
          transactions: 2,
        },
      ],
      attendance: [],
    },
    '/api/v1/hr/leave-types': [],
    '/api/v1/hr/leave-requests': [],
    '/api/v1/hr/payroll/preview': [],
    '/api/v1/hr/me/availability': {
      month: '2026-11',
      employee: {
        id: 'employee-one',
        employeeNumber: 'EMP-000001',
        employeeName: 'Ada Lovelace',
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
      },
      todayAttendance: null,
      leaveTypes: [
        { id: 'leave-day-off', name: 'Day off', code: 'OFF', requiresBalance: false },
        { id: 'leave-sick', name: 'Sick leave', code: 'SICK', requiresBalance: false },
      ],
      leaveRequests: [],
      calendarRecords: [
        {
          id: 'my-upcoming-shift',
          kind: 'WORK',
          status: 'APPROVED',
          startsAt: '2026-11-07T06:00:00Z',
          endsAt: '2026-11-07T14:00:00Z',
          note: 'Opening shift',
          locationName: branches[0].name,
        },
      ],
      attendanceHistory: [],
      clockedInStaff: [
        {
          employeeId: 'employee-two',
          employeeName: 'Grace Hopper',
          clockIn: '2026-11-06T08:00:00+03:00',
        },
      ],
      upcomingShifts: [
        {
          id: 'my-upcoming-shift',
          branchId: branches[0].id,
          branchName: branches[0].name,
          startsAt: '2026-11-07T06:00:00Z',
          endsAt: '2026-11-07T14:00:00Z',
          breakMinutes: 30,
          note: 'Opening shift',
        },
      ],
    },
    '/api/v1/hr/workforce': [],
    '/api/v1/hr/operating-hours': Array.from({ length: 7 }, (_, index) => ({
      dayOfWeek: index + 1,
      opensAt: null,
      closesAt: null,
      closed: true,
    })),
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
  Object.assign(records, additionalRecords);
  if (omitAvailabilityCollections) {
    const availability = records['/api/v1/hr/me/availability'] as Record<string, unknown>;
    delete availability.leaveRequests;
    delete availability.attendanceHistory;
  }
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    if (path === '/api/v1/hr/workforce' && init?.method === 'POST') {
      const request = JSON.parse(String(init.body));
      const employee = (records['/api/v1/hr/employees'] as Array<Record<string, unknown>>).find(
        (record) => record.userId === request.userId,
      );
      const branch = branches.find((record) => record.id === request.branchId);
      const shift = {
        ...request,
        id: 'shift-created',
        employeeId: employee?.id,
        employeeNumber: employee?.employeeNumber,
        employeeName: `${employee?.firstName} ${employee?.lastName}`,
        branchName: branch?.name,
        kind: 'WORK',
        status: 'APPROVED',
        source: 'ADMIN',
      };
      (records['/api/v1/hr/workforce'] as Array<Record<string, unknown>>).push(shift);
      return Promise.resolve(
        new Response(JSON.stringify(shift), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path.startsWith('/api/v1/hr/workforce/') && ['PUT', 'PATCH'].includes(init?.method ?? '')) {
      const shiftId =
        path.split('/').at(-1) === 'cancel' ? path.split('/').at(-2) : path.split('/').at(-1);
      const shift = (records['/api/v1/hr/workforce'] as Array<Record<string, unknown>>).find(
        (record) => record.id === shiftId,
      );
      if (!shift) return Promise.reject(new Error(`Unknown shift: ${shiftId}`));
      Object.assign(shift, JSON.parse(String(init?.body)));
      if (path.endsWith('/cancel')) shift.status = 'CANCELLED';
      return Promise.resolve(
        new Response(JSON.stringify(shift), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path === '/api/v1/hr/operating-hours' && init?.method === 'PUT') {
      const request = JSON.parse(String(init.body));
      records[path] = request.days;
      return Promise.resolve(
        new Response(JSON.stringify(request.days), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path === '/api/v1/hr/employees' && init?.method === 'POST') {
      const request = JSON.parse(String(init.body));
      const employee = {
        ...request,
        id: 'employee-created',
        employeeNumber: 'EMP-000002',
        branchName: testBranches[0].name,
        employmentStatus: 'ACTIVE',
        active: true,
      };
      (records['/api/v1/hr/employees'] as Array<Record<string, unknown>>).push(employee);
      return Promise.resolve(
        new Response(JSON.stringify(employee), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path.startsWith('/api/v1/hr/employees/') && ['PUT', 'PATCH'].includes(init?.method ?? '')) {
      const parts = path.split('/');
      const employeeId = parts.at(-1) === 'active' ? parts.at(-2) : parts.at(-1);
      const employee = (records['/api/v1/hr/employees'] as Array<Record<string, unknown>>).find(
        (record) => record.id === employeeId,
      );
      if (!employee) return Promise.reject(new Error(`Unknown employee: ${employeeId}`));
      Object.assign(employee, JSON.parse(String(init?.body)));
      return Promise.resolve(
        new Response(JSON.stringify(employee), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path === '/api/v1/organization/current/hotel-reports-settings' && init?.method === 'PUT') {
      Object.assign(organization, JSON.parse(String(init.body)));
      return Promise.resolve(
        new Response(JSON.stringify(organization), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path === '/api/v1/payroll/setup') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            employees: [
              {
                id: 'payroll-employee',
                employeeNumber: 'EMP-PAYROLL',
                fullName: 'Ada Lovelace',
                userId: 'employee-account',
                userEmail: 'ada@example.com',
                roleName: 'Cashier',
                locationId: branches[0].id,
                locationName: branches[0].name,
                locationType: 'SHOP',
                baseSalary: 50000,
                active: true,
              },
            ],
            locations: branches.map((branch) => ({
              id: branch.id,
              name: branch.name,
              type: 'SHOP',
              active: true,
            })),
            rules: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    if (path === '/api/v1/payroll/workspace') {
      const month = new URL(String(input), 'http://localhost').searchParams.get('month');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            month,
            preview: {
              token: 'preview-token',
              lines: [],
              totalBaseSalary: 0,
              totalBonuses: 0,
              totalDeductions: 0,
              totalNetPay: 0,
              warnings: [],
            },
            adjustments: [],
            losses: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    }
    if (path === '/api/v1/payroll/funding' && init?.method === 'POST') {
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'salary-plan' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (path === '/api/v1/payroll/funding') {
      return Promise.resolve(
        new Response(JSON.stringify({ month: '2026-11', plans: [], employees: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    if (
      [
        '/api/v1/hr/me/clock-in',
        '/api/v1/hr/me/clock-out',
        '/api/v1/hr/me/leave-requests',
      ].includes(path) &&
      init?.method === 'POST'
    ) {
      return Promise.resolve(
        new Response(JSON.stringify({ id: 'saved-record' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
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

  it('lands at Apps Home and exposes the Human Resources and Payroll workspaces', async () => {
    open('/');
    await ready();
    expect(window.location.pathname).toBe('/apps');
    expect(screen.getByRole('link', { name: 'Open Point of Sale' })).toHaveAttribute(
      'href',
      '/apps/pos',
    );
    expect(screen.queryByText('Planned · Not yet available')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Human Resources' })).toHaveAttribute(
      'href',
      '/apps/hr',
    );
    expect(screen.getByRole('link', { name: 'Open Payroll' })).toHaveAttribute(
      'href',
      '/apps/payroll',
    );
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
  it('includes completed Hotel restaurant orders in the Sales app overview', async () => {
    const fetch = api();
    open('/apps/sales');
    expect(await screen.findByRole('heading', { name: 'Sales Overview' })).toBeInTheDocument();
    const revenue = screen.getByText('Recorded sales').parentElement;
    await waitFor(() => expect(revenue).toHaveTextContent('1,250'));
    const transactions = screen.getByText('Transactions').parentElement;
    expect(transactions).toHaveTextContent('2');
    const items = screen.getByText('Items sold').parentElement;
    expect(items).toHaveTextContent('4');
    expect(
      fetch.mock.calls.some(([input]) => {
        const url = new URL(String(input), 'http://localhost');
        return (
          url.pathname === '/api/v1/sales/hotel-summary' &&
          url.searchParams.get('branchId') === testBranches[0].id
        );
      }),
    ).toBe(true);
  });
  it('shows Hotel food and products sold in Sales history', async () => {
    api(testUser, testBranches, testOrganization, false, {
      '/api/v1/hotel/sales-history': [
        {
          id: 'hotel-order-1',
          branchId: testBranches[0].id,
          branchName: testBranches[0].name,
          reference: 'HOTEL-20261107-001',
          customerName: 'Walk-in Customer',
          total: 1850,
          method: 'CASH',
          status: 'CLOSED',
          createdAt: new Date().toISOString(),
          lines: [
            {
              itemId: 'food-1',
              itemType: 'FOOD',
              itemName: 'Grilled Tilapia',
              quantity: 1,
              unitPrice: 1500,
              total: 1500,
            },
            {
              itemId: 'product-1',
              itemType: 'PRODUCT',
              itemName: 'Bottled Water',
              quantity: 2,
              unitPrice: 175,
              total: 350,
            },
          ],
        },
      ],
    });
    open('/sales');
    expect(await screen.findByRole('heading', { name: 'Hotel restaurant orders' })).toBeVisible();
    expect(await screen.findByText('Grilled Tilapia × 1')).toBeVisible();
    expect(await screen.findByText('Bottled Water × 2')).toBeVisible();
    expect(screen.getByText('HOTEL-20261107-001')).toBeVisible();
    const hotelTable = screen.getByRole('table', { name: 'Hotel restaurant sales history' });
    expect(within(hotelTable).getByText(/1,850/)).toBeVisible();
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
    expect(canAccessPath(cashier, '/my-availability')).toBe(true);
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
  it('opens the HR employee workspace from its direct route', async () => {
    open('/hr/employees');
    expect(await screen.findByRole('heading', { name: 'Staff records' })).toBeInTheDocument();
    expect(await screen.findByText('EMP-000001')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add employee' })).toBeInTheDocument();
    expect(await screen.findByText('Cashier')).toBeInTheDocument();
  });
  it('opens the HR overview and switches between staff, hours, and productivity', async () => {
    const user = userEvent.setup();
    open('/hr');
    expect(await screen.findByRole('heading', { name: 'Staff directory' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Working hours' }));
    expect(
      await screen.findByRole('heading', { name: 'Working hours & attendance' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No attendance records for this month.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Productivity' }));
    expect(
      await screen.findByRole('heading', { name: 'Productivity by staff' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Staff sales bar chart' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Compare productivity by'), 'transactions');
    expect(
      screen.getByRole('region', { name: 'Staff transactions bar chart' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2', { selector: 'td' })).toBeInTheDocument();
  });
  it('edits employee details and deactivates or reactivates the staff profile', async () => {
    const fetch = api();
    const user = userEvent.setup();
    open('/hr/employees');
    await screen.findByRole('heading', { name: 'Add employee' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit employee' })).toBeInTheDocument();
    const salaryInput = screen.getByLabelText('Monthly base salary');
    await user.clear(salaryInput);
    await user.type(salaryInput, '52000');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname ===
              '/api/v1/hr/employees/employee-one' &&
            init?.method === 'PUT' &&
            JSON.parse(String(init.body)).basicSalary === 52000 &&
            !('userId' in JSON.parse(String(init.body))),
        ),
      ).toBe(true),
    );
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(await screen.findByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
  it('schedules shifts for active linked staff at an assigned location', async () => {
    const fetch = api();
    const user = userEvent.setup();
    open('/hr/workforce');
    await screen.findByRole('heading', { name: 'Staff schedule' });
    const staffSelect = await screen.findByLabelText('Staff account');
    await screen.findByRole('option', { name: /Ada Lovelace · EMP-000001/ });
    await user.selectOptions(staffSelect, 'employee-account');
    expect(staffSelect).toHaveValue('employee-account');
    expect(screen.getByLabelText('Shift starts')).not.toHaveValue('');
    expect(screen.getByLabelText('Shift ends')).not.toHaveValue('');
    const form = screen.getByRole('button', { name: 'Schedule shift' }).closest('form');
    expect(form?.checkValidity()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Schedule shift' }));
    await waitFor(() => {
      const calls = fetch.mock.calls.map(([input, init]) => ({
        path: new URL(String(input), 'http://localhost').pathname,
        method: init?.method,
      }));
      expect(calls).toContainEqual({ path: '/api/v1/hr/workforce', method: 'POST' });
      const call = fetch.mock.calls.find(
        ([input, init]) =>
          new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/workforce' &&
          init?.method === 'POST',
      );
      expect(call).toBeDefined();
      const request = JSON.parse(String(call?.[1]?.body));
      expect(request.userId).toBe('employee-account');
      expect(request.branchId).toBe(testBranches[0].id);
    });
    expect(await screen.findByText('EMP-000001')).toBeInTheDocument();
  });
  it('saves weekly opening hours for a shop location', async () => {
    const fetch = api();
    const user = userEvent.setup();
    open('/hr/hours');
    await screen.findByRole('heading', { name: 'Weekly opening hours' });
    await screen.findByLabelText('Monday opens');
    await user.click(screen.getByLabelText('Closed Monday'));
    await user.click(screen.getByRole('button', { name: 'Save weekly hours' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/operating-hours' &&
            init?.method === 'PUT' &&
            JSON.parse(String(init.body)).days.length === 7 &&
            JSON.parse(String(init.body)).days[0].closed === false &&
            JSON.parse(String(init.body)).days[0].opensAt === '09:00',
        ),
      ).toBe(true),
    );
  });
  it('links an employee to an existing account and uses its assigned role and location', async () => {
    const fetch = api();
    const user = userEvent.setup();
    open('/hr/employees');
    await screen.findByRole('heading', { name: 'Add employee' });
    const accountSelect = await screen.findByRole('combobox', { name: 'System account' });
    await screen.findByRole('option', { name: /Bob Smith · Shop Manager/ });
    await user.selectOptions(accountSelect, 'available-account');
    expect(screen.getByLabelText('First name')).toHaveValue('Bob');
    expect(screen.getByLabelText('First name')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Last name')).toHaveValue('Smith');
    expect(screen.getByLabelText('Email')).toHaveValue('bob@example.com');
    expect(
      screen.getByText('Roles come from the account’s assignments in Users.'),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('Monthly base salary'), '52000');
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/employees' &&
            init?.method === 'POST' &&
            JSON.parse(String(init.body)).userId === 'available-account' &&
            JSON.parse(String(init.body)).branchId === testBranches[0].id,
        ),
      ).toBe(true),
    );
  });
  it('lets HR choose any active account in the organization, including accounts without branch assignments', async () => {
    const fetch = api();
    const user = userEvent.setup();
    open('/hr/employees');
    await screen.findByRole('heading', { name: 'Add employee' });
    const accountSelect = await screen.findByRole('combobox', { name: 'System account' });
    await screen.findByRole('option', { name: /Carol Jones/ });
    await user.selectOptions(accountSelect, 'unassigned-account');

    expect(screen.getByLabelText('First name')).toHaveValue('Carol');
    expect(screen.getByLabelText('Last name')).toHaveValue('Jones');
    expect(screen.getByLabelText('Location')).toHaveValue(testBranches[0].id);
    await user.type(screen.getByLabelText('Monthly base salary'), '32000');
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/employees' &&
            init?.method === 'POST' &&
            JSON.parse(String(init.body)).userId === 'unassigned-account',
        ),
      ).toBe(true),
    );
  });
  it('lets HR link a hotel waiter to an employee profile at a hotel location', async () => {
    const fetch = api(testUser, [...testBranches, hotelBranch]);
    const user = userEvent.setup();
    open('/hr/employees');
    await screen.findByRole('heading', { name: 'Add employee' });
    const accountSelect = await screen.findByRole('combobox', { name: 'System account' });
    await screen.findByRole('option', { name: /Hotel Waiter/ });
    await user.selectOptions(accountSelect, 'waiter-account');
    await user.selectOptions(screen.getByLabelText('Location'), hotelBranch.id);
    await user.type(screen.getByLabelText('Monthly base salary'), '32000');
    await user.click(screen.getByRole('button', { name: 'Add employee' }));

    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/employees' &&
            init?.method === 'POST' &&
            JSON.parse(String(init.body)).userId === 'waiter-account' &&
            JSON.parse(String(init.body)).branchId === hotelBranch.id,
        ),
      ).toBe(true),
    );
  });
  it('opens the payroll workspace from its direct route', async () => {
    open('/payroll');
    expect(await screen.findByRole('heading', { name: 'Payroll' })).toBeInTheDocument();
    expect(screen.getByLabelText('Payroll month')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Salary funding' })).toBeInTheDocument();
  });
  it('redirects the legacy payroll route to the payroll workspace', async () => {
    open('/payroll/processing');
    expect(await screen.findByRole('heading', { name: 'Payroll' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/payroll');
  });
  it('saves a salary split across multiple locations', async () => {
    const fetch = api(testUser, [testBranches[0], secondBranch]);
    const user = userEvent.setup();
    open('/payroll');
    await screen.findByRole('heading', { name: 'Payroll' });
    await user.click(await screen.findByRole('button', { name: 'Salary funding' }));
    const employeeSelect = await screen.findByLabelText('Employee');
    await waitFor(() => expect(employeeSelect).toBeEnabled());
    await user.selectOptions(employeeSelect, 'payroll-employee');
    const homeShare = await screen.findByLabelText(`${testBranches[0].name} funding percentage`);
    expect(homeShare).toHaveValue(100);
    await user.click(screen.getByRole('checkbox', { name: secondBranch.name }));
    const secondShare = screen.getByLabelText(`${secondBranch.name} funding percentage`);
    await user.type(secondShare, '40');
    await user.clear(homeShare);
    await user.type(homeShare, '60');
    await user.type(screen.getByLabelText('Reason'), 'Shared payroll funding');
    await user.click(screen.getByRole('button', { name: 'Save salary funding' }));
    await waitFor(() => {
      const request = fetch.mock.calls.find(
        ([input, init]) =>
          new URL(String(input), 'http://localhost').pathname === '/api/v1/payroll/funding' &&
          init?.method === 'POST',
      );
      expect(request).toBeDefined();
      expect(JSON.parse(String(request?.[1]?.body)).shares).toEqual([
        { locationId: testBranches[0].id, percentage: 60 },
        { locationId: secondBranch.id, percentage: 40 },
      ]);
    });
  });
  it('lets staff clock in and submit a time-off request from My Availability', async () => {
    const cashier = {
      ...testUser,
      roleKeys: ['CASHIER'],
      roleNames: ['Cashier'],
      permissionCodes: ['pos:sell'],
    };
    const fetch = api(cashier);
    const user = userEvent.setup();
    open('/my-availability');
    expect(await screen.findByRole('heading', { name: 'My Availability' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'A clear view of your time' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Opening shift')).toBeInTheDocument();
    expect(screen.getByText('Opening shift')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clock in' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname === '/api/v1/hr/me/clock-in' &&
            init?.method === 'POST',
        ),
      ).toBe(true),
    );
    await user.selectOptions(screen.getByLabelText('Request type'), 'leave-day-off');
    await user.type(screen.getByLabelText(/Reason \(optional\)/), 'Family commitment');
    await user.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() =>
      expect(
        fetch.mock.calls.some(
          ([input, init]) =>
            new URL(String(input), 'http://localhost').pathname ===
              '/api/v1/hr/me/leave-requests' &&
            init?.method === 'POST' &&
            JSON.parse(String(init.body)).leaveTypeId === 'leave-day-off',
        ),
      ).toBe(true),
    );
  });
  it('renders My Availability when optional report collections are omitted', async () => {
    api(testUser, testBranches, testOrganization, true);
    open('/my-availability');
    expect(
      await screen.findByText('No leave or time-off requests in this month.'),
    ).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /Working time/ }));
    expect(screen.getByText('No working sessions in this month.')).toBeInTheDocument();
    expect(screen.getByText('Working days').parentElement).toHaveTextContent('0');
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
  it('keeps shop reports admin-only while allowing hotel report users into Reports', () => {
    const restricted = {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['reports:view', 'sales:view'],
    };
    const reports = appRegistry.find((app) => app.id === 'reports')!;
    expect(appModules(reports, restricted).map((module) => module.to)).toEqual(['/dashboard']);
    expect(canAccessPath(restricted, '/reports')).toBe(false);
    const hotelReporter = {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['hotel:reports'],
    };
    expect(canAccessPath(hotelReporter, '/reports')).toBe(true);
    expect(visibleApps(restricted, true).some((app) => app.planned)).toBe(false);
    expect(searchApps(testUser, 'barcode').map((app) => app.id)).toEqual(['products']);
  });
  it('shows hotel reports in Reports without loading shop report data for hotel-only users', async () => {
    const hotelReporter = {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['hotel:reports'],
      branchIds: [testBranches[0].id],
    };
    const fetch = api(hotelReporter);
    open('/reports');
    expect(await screen.findByRole('heading', { name: 'Hotel reports' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Business reports' })).not.toBeInTheDocument();
    expect(document.querySelector('.hotel-reports-embedded .hotel-report-filters')).toBeVisible();
    expect(
      fetch.mock.calls.some(
        ([input]) => new URL(String(input), 'http://localhost').pathname === '/api/v1/sales',
      ),
    ).toBe(false);
  });
  it('saves the organization setting to show or hide hotel reports', async () => {
    const user = userEvent.setup();
    const fetch = api();
    open('/settings');
    const toggle = await screen.findByRole('checkbox', {
      name: 'Show hotel reports in Reports',
    });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Save Report Settings' }));
    expect(await screen.findByText('Report visibility settings saved.')).toBeInTheDocument();
    const request = fetch.mock.calls.find(
      ([input]) =>
        new URL(String(input), 'http://localhost').pathname ===
        '/api/v1/organization/current/hotel-reports-settings',
    );
    expect(request?.[1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ showHotelReports: false }),
    });
  });
  it('hides hotel reports and their shortcut when disabled for a shop organization', async () => {
    api(testUser, testBranches, { ...testOrganization, showHotelReports: false });
    open('/reports');
    expect(await screen.findByRole('heading', { name: 'Business reports' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Hotel reports' })).not.toBeInTheDocument();
    expect(document.querySelector('#hotel-report-section')).not.toBeInTheDocument();
  });
  it('respects disabled hotel report visibility for users with hotel-only report access', async () => {
    const hotelReporter = {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['hotel:reports'],
      branchIds: [testBranches[0].id],
    };
    const fetch = api(hotelReporter, testBranches, {
      ...testOrganization,
      showHotelReports: false,
    });
    open('/reports');
    expect(
      await screen.findByRole('heading', {
        name: 'Hotel reports are hidden on the main Reports page',
      }),
    ).toBeInTheDocument();
    expect(document.querySelector('.hotel-report-filters')).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.some(
        ([input]) =>
          new URL(String(input), 'http://localhost').pathname === '/api/v1/hotel/reports',
      ),
    ).toBe(false);
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
