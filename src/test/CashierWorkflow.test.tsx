import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import {
  testBranches,
  testExpenses,
  testOrganization,
  testPermissions,
  testRoles,
  testUser,
} from './fixtures';
import type { CurrentUser } from '../data/types';
import type { CashierShift } from '../services/cashierShifts';

const cashier: CurrentUser = {
  ...testUser,
  userId: 'cashier-user',
  displayName: 'Shop Cashier',
  roleKeys: ['CASHIER'],
  roleNames: ['Cashier'],
  permissionCodes: ['pos:sell', 'expenses:create', 'shifts:manage'],
  branchIds: [testBranches[0].id],
};
let shifts: CashierShift[];
let savedUser: Record<string, unknown> | undefined;
function api(user = cashier) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), 'http://localhost').pathname;
      const data: Record<string, unknown> = {
        '/api/v1/me': user,
        '/api/v1/organization/current': testOrganization,
        '/api/v1/branches': testBranches,
        '/api/v1/roles': testRoles,
        '/api/v1/permissions': testPermissions,
        '/api/v1/users': [],
        '/api/v1/expenses': testExpenses,
      };
      if (path === '/api/v1/users' && init?.method === 'POST') {
        savedUser = JSON.parse(String(init.body));
        return reply({
          ...savedUser,
          id: 'created-user',
          roleNames: ['Cashier'],
          permissionCodes: cashier.permissionCodes,
          branchNames: [testBranches[0].name],
        });
      }
      if (path === '/api/v1/shifts') {
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          shifts = [
            {
              ...body,
              id: 'shift-1',
              branchName: testBranches[0].name,
              cashierId: cashier.userId,
              cashierName: cashier.displayName,
              status: 'OPEN',
              openedAt: new Date().toISOString(),
              cashSales: 0,
              cashExpenses: 0,
              totalSales: 0,
              transactionCount: 0,
              expectedCash: body.openingFloat,
            },
          ];
        }
        return reply(init?.method === 'POST' ? shifts[0] : shifts);
      }
      if (path === '/api/v1/shifts/shift-1/close') {
        const body = JSON.parse(String(init?.body));
        shifts = [
          {
            ...shifts[0],
            ...body,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
            variance: body.closingCash - shifts[0].expectedCash,
          },
        ];
        return reply(shifts[0]);
      }
      if (path in data) return reply(data[path]);
      throw new Error('Unexpected API request ' + path);
    }),
  );
}
const reply = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
function open(path: string) {
  window.history.pushState({}, '', path);
  render(<App />);
}
beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=test-token; path=/';
  shifts = [];
  savedUser = undefined;
  api();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');
});

it('assigns Cashier alone and requires a shop before saving a user', async () => {
  api(testUser);
  const user = userEvent.setup();
  open('/users');
  await screen.findByLabelText('Cashier (CASHIER)');
  await user.type(screen.getByLabelText('Display Name'), 'New Cashier');
  await user.type(screen.getByLabelText('Email'), 'cashier@example.test');
  await user.type(screen.getByLabelText('Password'), 'cashier-password');
  await user.click(screen.getByLabelText('Admin (ADMIN)'));
  await user.click(screen.getByLabelText('Cashier (CASHIER)'));
  expect(screen.getByLabelText('Admin (ADMIN)')).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Register User' }));
  expect(await screen.findByText('Select at least one shop for the cashier.')).toBeInTheDocument();
  expect(savedUser).toBeUndefined();
  await user.click(screen.getByLabelText(testBranches[0].name));
  await user.click(screen.getByRole('button', { name: 'Register User' }));
  await screen.findByText('New Cashier saved.');
  expect(savedUser).toMatchObject({ roleIds: [testRoles[2].id], branchIds: [testBranches[0].id] });
});
it('allows expense registration without report access or expense management controls', async () => {
  open('/expenses');
  await screen.findByText('Shop rent');
  expect(screen.getByRole('heading', { name: 'Expenses', level: 1 })).toBeInTheDocument();
  expect(screen.getByLabelText('Description')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Mark Paid' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  const nav = screen.getByRole('navigation', { name: 'Platform navigation' });
  expect(within(nav).queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
});
it('resumes its server shift after remount and closes with a persisted cash count', async () => {
  const user = userEvent.setup();
  open('/shifts');
  await screen.findByRole('button', { name: 'Open My Shift' });
  await user.clear(screen.getByLabelText('Opening float'));
  await user.type(screen.getByLabelText('Opening float'), '500');
  await user.click(screen.getByRole('button', { name: 'Open My Shift' }));
  await screen.findByRole('button', { name: 'Close My Shift' });
  cleanup();
  open('/shifts');
  await screen.findByRole('button', { name: 'Close My Shift' });
  await user.type(screen.getByLabelText('Counted closing cash'), '480');
  await user.type(screen.getByLabelText('Closing note'), 'Cash counted');
  await user.click(screen.getByRole('button', { name: 'Close My Shift' }));
  await screen.findByText('Your shift is closed.');
  expect(shifts[0]).toMatchObject({
    status: 'CLOSED',
    closingCash: 480,
    variance: -20,
    openingFloat: 500,
  });
});
it('does not treat a cashier with no assigned shops as having all-shop access', async () => {
  api({ ...cashier, branchIds: [] });
  open('/shifts');
  await screen.findByText(/Ask an administrator to assign you an active shop/);
  expect(screen.queryByRole('button', { name: 'Open My Shift' })).not.toBeInTheDocument();
});
