import { useLegacyOperationFixtures } from './legacyOperationFixtures';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from '../App';
import { testBranches, testInventory, testOrganization, testProducts, testUser } from './fixtures';
import type { MpesaPayment } from '../services/mpesa';
import type { SaleRequest } from '../data/types';

let transaction: MpesaPayment | undefined;
let pushes: { key: string; phoneNumber: string; sale: SaleRequest }[];
let completed: { key: string; sale: SaleRequest }[];
let configFails: boolean;
const storageKey = `keen:mpesa:${testOrganization.id}:${testUser.userId}:${testBranches[0].id}`;
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function open() {
  window.history.pushState({}, '', '/pos');
  render(<App />);
}
beforeEach(() => {
  useLegacyOperationFixtures();
  transaction = undefined;
  pushes = [];
  completed = [];
  configFails = false;
  localStorage.clear();
  document.cookie = 'XSRF-TOKEN=test-token; path=/';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input), 'http://localhost').pathname;
      const records: Record<string, unknown> = {
        '/api/v1/me': testUser,
        '/api/v1/organization/current': testOrganization,
        '/api/v1/branches': testBranches,
        '/api/v1/catalog/products': testProducts,
        '/api/v1/inventory': testInventory.length
          ? testInventory
          : [
              {
                id: 'stock',
                branchId: testBranches[0].id,
                productId: testProducts[0].id,
                quantityOnHand: 10,
                quantityAvailable: 10,
              },
            ],
        '/api/v1/sales': [],
        '/api/v1/sale-reversals': [],
      };
      if (path === '/api/v1/mpesa/config')
        return configFails ? reply({ detail: 'Unavailable' }, 503) : reply({ enabled: true });
      if (path.startsWith('/api/v1/mpesa/transactions/by-key/'))
        return transaction ? reply(transaction) : reply({ detail: 'Payment not found' }, 404);
      if (path === '/api/v1/mpesa/stkpush') {
        pushes.push({
          key: new Headers(init?.headers).get('Idempotency-Key') ?? '',
          ...JSON.parse(String(init?.body)),
        });
        transaction = {
          id: 'transaction-1',
          status: 'PENDING',
          phoneMask: '254***5678',
          amount: 3248,
          message: 'Enter your M-Pesa PIN on your phone',
          createdAt: new Date().toISOString(),
        };
        return reply(transaction, 202);
      }
      if (path === '/api/v1/sales' && init?.method === 'POST') {
        const sale: SaleRequest = JSON.parse(String(init.body));
        completed.push({ key: new Headers(init.headers).get('Idempotency-Key') ?? '', sale });
        return reply(
          {
            id: 'sale-mpesa',
            saleNumber: 'MPESA-001',
            branchId: testBranches[0].id,
            branchName: testBranches[0].name,
            customerName: '',
            subtotalAmount: 2800,
            discountAmount: 0,
            taxAmount: 448,
            totalAmount: 3248,
            status: 'COMPLETED',
            soldAt: new Date().toISOString(),
            lines: [
              {
                ...testProducts[0],
                productId: testProducts[0].id,
                productName: testProducts[0].name,
                quantity: 1,
                lineTotal: 2800,
              },
            ],
            payments: sale.payments?.map((p, i) => ({
              ...p,
              id: 'payment-' + i,
              status: 'SETTLED',
              reference: p.paymentReference,
            })),
          },
          201,
        );
      }
      if (path in records) return reply(records[path]);
      throw new Error('Unexpected API request ' + path);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

async function checkout(split = false) {
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole('button', { name: /Oxford Shirt/i }));
  await user.click(screen.getByRole('button', { name: /Pay KSh 3,248/i }));
  if (split) {
    await user.click(screen.getByRole('button', { name: 'Split Payment' }));
    await user.type(screen.getByLabelText('Payment 1 amount'), '1248');
  } else await user.selectOptions(screen.getByLabelText('Payment method'), 'MPESA');
  await user.type(await screen.findByLabelText('Customer M-Pesa phone number'), '0712345678');
  return user;
}
function succeed() {
  transaction = {
    ...transaction!,
    status: 'SUCCEEDED',
    receiptNumber: 'TESTMPESA01',
    message: 'Payment confirmed',
  };
}

it('sends one STK request, waits for verification, and binds the verified receipt to the sale', async () => {
  const user = await checkout();
  expect(screen.getByRole('button', { name: /Complete Sale/ })).toBeDisabled();
  await user.dblClick(screen.getByRole('button', { name: 'Send STK Push' }));
  await screen.findByText('Enter your M-Pesa PIN on your phone');
  expect(pushes).toHaveLength(1);
  expect(completed).toHaveLength(0);
  expect(screen.getByLabelText('Payment method')).toBeDisabled();
  expect(localStorage.getItem(storageKey)).not.toContain('0712345678');
  succeed();
  await screen.findByText('Receipt: TESTMPESA01', {}, { timeout: 4000 });
  await user.click(screen.getByRole('button', { name: /Complete Sale/ }));
  await screen.findByText('Sale MPESA-001 recorded.');
  expect(completed[0].key).toBe(pushes[0].key);
  expect(completed[0].sale.payments?.[0].paymentReference).toBe('TESTMPESA01');
  expect(localStorage.getItem(storageKey)).toBeNull();
});

it('restores an unresolved checkout after remounting without sending another prompt', async () => {
  const user = await checkout();
  await user.click(screen.getByRole('button', { name: 'Send STK Push' }));
  await screen.findByText('Enter your M-Pesa PIN on your phone');
  const key = pushes[0].key;
  cleanup();
  open();
  await screen.findByText('Enter your M-Pesa PIN on your phone');
  expect(pushes).toHaveLength(1);
  expect(screen.getByLabelText('Payment method')).toHaveValue('MPESA');
  succeed();
  await screen.findByText('Receipt: TESTMPESA01', {}, { timeout: 4000 });
  await user.click(screen.getByRole('button', { name: /Complete Sale/ }));
  await waitFor(() => expect(completed[0]?.key).toBe(key));
});

it('uses the complete split tender plan when requesting and confirming M-Pesa', async () => {
  const user = await checkout(true);
  await user.click(screen.getByRole('button', { name: 'Send STK Push' }));
  await screen.findByText('Enter your M-Pesa PIN on your phone');
  expect(pushes[0].sale.payments?.map((p) => [p.method, p.amount])).toEqual([
    ['MPESA', 1248],
    ['CASH', 2000],
  ]);
  succeed();
  await screen.findByText('Receipt: TESTMPESA01', {}, { timeout: 4000 });
  await user.click(screen.getByRole('button', { name: /Complete Sale/ }));
  await waitFor(() => expect(completed).toHaveLength(1));
  expect(completed[0].sale.payments?.[1].amount).toBe(2000);
});

it('blocks completion when M-Pesa availability cannot be checked', async () => {
  configFails = true;
  const user = userEvent.setup();
  open();
  await user.click(await screen.findByRole('button', { name: /Oxford Shirt/i }));
  await user.click(screen.getByRole('button', { name: /Pay KSh 3,248/i }));
  await user.selectOptions(screen.getByLabelText('Payment method'), 'MPESA');
  const dialog = screen.getByRole('dialog', { name: 'Payment' });
  await within(dialog).findByText(/STK push requires internet/);
  expect(within(dialog).getByRole('button', { name: /Complete Sale/ })).toBeDisabled();
  expect(pushes).toHaveLength(0);
  expect(completed).toHaveLength(0);
});
