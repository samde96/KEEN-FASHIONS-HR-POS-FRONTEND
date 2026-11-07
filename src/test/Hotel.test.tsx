import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import * as XLSX from 'xlsx';
import HotelPage from '../hotel/HotelPage';
import HotelRegister from '../hotel/HotelRegister';
import HotelOrderReceipt from '../hotel/HotelOrderReceipt';
import * as api from '../hotel/api';
import { appModules, appRegistry, canAccessPath } from '../platform/appRegistry';
import { addDays, businessDate, nightsBetween, roomIsBookable } from '../hotel/utils';
import {
  hotelBooking,
  hotelBranchId,
  hotelReport,
  hotelWorkspace,
  hotelCheckout,
  hotelWaiters,
  hotelReceiptSettings,
} from './hotelFixtures';
import { testBranches, testOrganization, testUser } from './fixtures';
import type { CurrentUser } from '../data/types';
import * as staffApi from '../services/api';

vi.mock('../hotel/api', () => ({
  getHotelWorkspace: vi.fn(),
  saveHotelRoom: vi.fn(),
  saveHotelBooking: vi.fn(),
  hotelBookingAction: vi.fn(),
  payHotelBooking: vi.fn(),
  saveHotelItem: vi.fn(),
  changeHotelStock: vi.fn(),
  sellHotelFood: vi.fn(),
  getHotelBookingOrders: vi.fn(),
  getHotelReport: vi.fn(),
  getHotelCheckout: vi.fn(),
  getHotelWaiters: vi.fn(),
  saveHotelWaiter: vi.fn(),
  deleteHotelWaiter: vi.fn(),
  getHotelReceiptSettings: vi.fn(),
  saveHotelReceiptSettings: vi.fn(),
  saveHotelMenuItem: vi.fn(),
  getHotelExpenses: vi.fn(),
  saveHotelExpense: vi.fn(),
  getHotelAssets: vi.fn(),
  saveHotelAsset: vi.fn(),
  cancelHotelOrder: vi.fn(),
  settleHotelOrder: vi.fn(),
}));
vi.mock('../platform/PlatformContext', () => ({
  usePlatform: () => ({
    branchId: '00000000-0000-4000-8000-000000000101',
    branches: testBranches,
    selectedBranch: testBranches[0],
    changeBranch: vi.fn(),
  }),
}));
function renderPage(path: string, user: CurrentUser = testUser) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <HotelPage user={user} organization={testOrganization} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
function excelFile(name: string, rows: (string | number)[][]) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File([bytes], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
beforeEach(() => {
  vi.mocked(api.getHotelWorkspace).mockResolvedValue(structuredClone(hotelWorkspace));
  vi.mocked(api.getHotelBookingOrders).mockResolvedValue([]);
  vi.mocked(api.getHotelReport).mockResolvedValue(hotelReport);
  vi.mocked(api.getHotelWaiters).mockResolvedValue(structuredClone(hotelWaiters));
  vi.mocked(api.getHotelReceiptSettings).mockResolvedValue(hotelReceiptSettings);
  vi.mocked(api.getHotelExpenses).mockResolvedValue([]);
  vi.mocked(api.getHotelAssets).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('Hotel Management', () => {
  it('records hotel operating expenses with date, category and payment details', async () => {
    const user = userEvent.setup();
    renderPage('/hotel/expenses');

    await user.click(await screen.findByRole('button', { name: '+ Record expense' }));
    await user.selectOptions(screen.getByLabelText('Category'), 'UTILITIES');
    await user.type(screen.getByLabelText('Description'), 'Electricity bill');
    await user.type(screen.getByLabelText('Amount'), '1800');
    await user.click(screen.getByRole('button', { name: 'Record expense' }));

    expect(api.saveHotelExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: hotelBranchId,
        expenseDate: hotelWorkspace.businessDate,
        category: 'UTILITIES',
        description: 'Electricity bill',
        amount: 1800,
        paymentMethod: 'CASH',
      }),
      undefined,
    );
  });

  it('registers durable hotel assets separately from operating expenses', async () => {
    const user = userEvent.setup();
    renderPage('/hotel/assets');

    await user.click(await screen.findByRole('button', { name: '+ Register asset' }));
    await user.type(screen.getByLabelText('Asset name'), 'Kitchen fridge');
    await user.clear(screen.getByLabelText(/Total purchase cost/));
    await user.type(screen.getByLabelText(/Total purchase cost/), '45000');
    await user.click(screen.getByRole('button', { name: 'Register asset' }));

    expect(api.saveHotelAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: hotelBranchId,
        name: 'Kitchen fridge',
        category: 'EQUIPMENT',
        quantity: 1,
        purchaseCost: 45000,
        status: 'ACTIVE',
      }),
      undefined,
    );
  });

  it('shows operating expenses and profit/loss in hotel reports', async () => {
    renderPage('/hotel/reports');

    expect(await screen.findByText('Operating expenses')).toBeInTheDocument();
    expect(screen.getByText('Net profit')).toBeInTheDocument();
    expect(screen.getByText('Utilities')).toBeInTheDocument();
  });

  it('imports prepared dishes from an Excel worksheet', async () => {
    const user = userEvent.setup();
    renderPage('/hotel/menu');
    const file = excelFile('menu.xlsx', [
      ['Dish Name', 'Category', 'Description', 'Selling Price', 'Available'],
      ['Breakfast plate', 'Breakfast', 'Eggs and toast', 320, 'Yes'],
    ]);

    await user.upload(await screen.findByLabelText('Upload food menu Excel'), file);

    expect(await screen.findByText('Imported 1 dish.')).toBeInTheDocument();
    expect(api.saveHotelMenuItem).toHaveBeenCalledWith({
      branchId: hotelBranchId,
      name: 'Breakfast plate',
      category: 'Breakfast',
      description: 'Eggs and toast',
      price: 320,
      available: true,
    });
  });

  it('rejects duplicate Excel menu rows before creating any dishes', async () => {
    const user = userEvent.setup();
    renderPage('/hotel/menu');
    const file = excelFile('duplicate-menu.xlsx', [
      ['Dish Name', 'Category', 'Description', 'Selling Price', 'Available'],
      ['Lunch', 'Main meals', '', 280, 'Yes'],
    ]);

    await user.upload(await screen.findByLabelText('Upload food menu Excel'), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"Lunch" already exists or appears more than once',
    );
    expect(api.saveHotelMenuItem).not.toHaveBeenCalled();
  });

  it('imports inventory and records positive opening stock as a stock receipt', async () => {
    const user = userEvent.setup();
    vi.mocked(api.saveHotelItem).mockResolvedValue({
      ...hotelWorkspace.items[0],
      id: 'imported-item',
      name: 'Imported juice',
    });
    renderPage('/hotel/inventory');
    const file = excelFile('inventory.xlsx', [
      [
        'Item Name',
        'Category',
        'Stock Unit',
        'Selling Price',
        'Opening Stock',
        'Low Stock Level',
        'Sellable',
        'Active',
      ],
      ['Imported juice', 'PRODUCT', 'bottle', 80, 5, 2, 'Yes', 'Yes'],
    ]);

    await user.upload(await screen.findByLabelText('Upload hotel inventory Excel'), file);

    expect(await screen.findByText('Imported 1 inventory item.')).toBeInTheDocument();
    expect(api.saveHotelItem).toHaveBeenCalledWith({
      branchId: hotelBranchId,
      name: 'Imported juice',
      category: 'PRODUCT',
      unit: 'bottle',
      sellable: true,
      price: 80,
      reorderLevel: 2,
      active: true,
    });
    expect(api.changeHotelStock).toHaveBeenCalledWith('imported-item', {
      requestId: expect.any(String),
      quantity: 5,
      kind: 'RECEIPT',
      note: 'Opening stock imported from Excel',
    });
  });

  it('requires a selected waiter for every new order', async () => {
    const user = userEvent.setup();
    render(
      <HotelRegister
        data={structuredClone(hotelCheckout)}
        branchId={hotelBranchId}
        currency="KES"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('searchbox', { name: 'Search food or products' }));
    const foodPicker = screen.getByRole('list', { name: 'Item results' });
    expect(foodPicker.querySelector('.hotel-food-card')).toBeNull();
    await user.click(within(foodPicker).getByRole('button', { name: 'Add Lunch' }));
    expect(screen.queryByRole('dialog', { name: 'Add items to order' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Served by'), hotelWaiters[1].id);
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
  });
  it('lets a waiter create orders before receipt details are configured', async () => {
    const checkout = structuredClone(hotelCheckout);
    checkout.receiptSettings.tillNumber = '';
    checkout.receiptSettings.contactPhone = '';
    const user = userEvent.setup();
    render(
      <HotelRegister
        data={checkout}
        branchId={hotelBranchId}
        currency="KES"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('searchbox', { name: 'Search food or products' }));
    const addButton = within(screen.getByRole('list', { name: 'Item results' })).getByRole(
      'button',
      { name: 'Add Lunch' },
    );
    expect(addButton).toBeEnabled();

    await user.click(addButton);
    await user.selectOptions(screen.getByLabelText('Served by'), hotelWaiters[0].id);
    expect(screen.getByRole('region', { name: 'Current order' })).toHaveTextContent('Lunch');
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(api.sellHotelFood).toHaveBeenCalledWith(
      expect.objectContaining({ waiterId: hotelWaiters[0].id }),
    );
  });
  it('defaults Served by to the signed-in waiter account', () => {
    const checkout = structuredClone(hotelCheckout);
    checkout.waiters.push({
      id: '00000000-0000-4000-8000-000000000777',
      branchId: hotelBranchId,
      name: 'Current Waiter',
      active: true,
      userId: 'signed-in-waiter',
    });
    render(
      <HotelRegister
        data={checkout}
        branchId={hotelBranchId}
        currency="KES"
        waiterUserId="signed-in-waiter"
        waiterName="Different display name"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Served by')).toHaveValue('00000000-0000-4000-8000-000000000777');
    expect(screen.getByRole('option', { name: 'Current Waiter' })).toBeInTheDocument();
  });
  it('defaults Served by to the signed-in waiter name when the waiter record is not linked', async () => {
    const checkout = structuredClone(hotelCheckout);
    checkout.waiters = [checkout.waiters[0]];
    checkout.waiters[0].name = 'Current Waiter';
    const user = userEvent.setup();
    render(
      <HotelRegister
        data={checkout}
        branchId={hotelBranchId}
        currency="KES"
        waiterUserId="signed-in-waiter"
        waiterName="Current Waiter"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('searchbox', { name: 'Search food or products' }));
    await user.click(
      within(screen.getByRole('list', { name: 'Item results' })).getByRole('button', {
        name: 'Add Lunch',
      }),
    );

    expect(screen.getByLabelText('Served by')).toHaveValue(checkout.waiters[0].id);
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
  });
  it('allows a dine-in order without a table number', async () => {
    const user = userEvent.setup();
    render(
      <HotelRegister
        data={structuredClone(hotelCheckout)}
        branchId={hotelBranchId}
        currency="KES"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('searchbox', { name: 'Search food or products' }));
    await user.click(
      within(screen.getByRole('list', { name: 'Item results' })).getByRole('button', {
        name: 'Add Lunch',
      }),
    );
    await user.selectOptions(screen.getByLabelText('Served by'), hotelWaiters[0].id);
    expect(screen.getByLabelText('Table number (optional)')).not.toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    await screen.findByText('Your order starts here');
    expect(api.sellHotelFood).toHaveBeenCalledWith(
      expect.objectContaining({ serviceType: 'DINE_IN', tableNumber: '' }),
    );
  });
  it('shows a single-receipt action when the cart contains only stocked products', async () => {
    const user = userEvent.setup();
    const checkout = structuredClone(hotelCheckout);
    checkout.products.push({
      ...checkout.products[0],
      id: 'soda',
      name: 'Ginger beer',
      stock: 4,
    });
    render(
      <HotelRegister
        data={checkout}
        branchId={hotelBranchId}
        currency="KES"
        canSell
        saved={async () => {}}
        receipt={vi.fn()}
      />,
    );
    await user.click(
      within(screen.getByRole('complementary', { name: 'Menu categories' })).getByRole('button', {
        name: 'Products',
      }),
    );
    const search = screen.getByRole('searchbox', { name: 'Search food or products' });
    await user.type(search, 'water');
    const picker = screen.getByRole('list', { name: 'Item results' });
    expect(within(picker).getByText('Bottled water')).toBeInTheDocument();
    expect(within(picker).queryByText('Ginger beer')).not.toBeInTheDocument();
    expect(picker.querySelector('.hotel-food-card')).toBeNull();
    await user.click(within(picker).getByRole('button', { name: 'Add Bottled water' }));
    const pickerCart = screen.getByRole('region', { name: 'Current order' });
    expect(within(pickerCart).getByText('Bottled water')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Add items to order' })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Served by'), hotelWaiters[0].id);
    expect(screen.getByRole('button', { name: 'Create Order' })).toBeEnabled();
  });
  it('prints a kitchen ticket and a customer receipt without exposing the table on the sale receipt', async () => {
    const order = {
      id: 'sale',
      branchId: hotelBranchId,
      reference: 'FOOD-001',
      operatorId: testUser.userId,
      waiterId: hotelWaiters[0].id,
      servedByName: hotelWaiters[0].name,
      customerName: 'Guest',
      tableNumber: '2',
      serviceType: 'DINE_IN' as const,
      notes: 'No chilli',
      status: 'OPEN' as const,
      method: 'UNPAID' as const,
      paymentReference: '',
      total: 250,
      createdAt: '2026-11-06T12:00:00Z',
      lines: [
        {
          itemId: 'meal',
          itemType: 'FOOD' as const,
          itemName: 'Rice and stew',
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
      ],
      ...hotelReceiptSettings,
    };
    vi.useFakeTimers();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <HotelOrderReceipt
        order={order}
        organization={testOrganization}
        branchName="Hotel"
        close={vi.fn()}
        autoPrint
      />,
    );
    const kitchen = screen.getByRole('article', { name: 'Kitchen copy' });
    expect(kitchen).toHaveTextContent('KITCHEN ORDER');
    expect(kitchen).toHaveTextContent('ORDER #: FOOD-001');
    expect(kitchen).toHaveTextContent('TABLE: 2');
    expect(kitchen).toHaveTextContent('1 × Rice and stew');
    expect(kitchen).not.toHaveTextContent('250.00');

    const customer = screen.getByRole('article', { name: 'Customer copy' });
    expect(customer).toHaveTextContent('FOOD SALE RECEIPT');
    expect(customer).toHaveTextContent('Receipt No: FOOD-001');
    expect(customer).toHaveTextContent('Unit Price');
    expect(customer).toHaveTextContent('Amount');
    expect(customer).toHaveTextContent('250.00');
    expect(customer).toHaveTextContent('Alice Waiter');
    expect(customer).toHaveTextContent('1234567');
    expect(customer).toHaveTextContent('+254700000111');
    expect(customer).not.toHaveTextContent('Table 2');
    expect(customer).not.toHaveTextContent(testUser.displayName);
    await act(async () => vi.advanceTimersByTime(300));
    expect(print).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(print).toHaveBeenCalledTimes(1);
  });
  it('prints one customer copy for products and limits a mixed order kitchen copy to food', () => {
    const order = {
      id: 'sale',
      branchId: hotelBranchId,
      reference: 'PRODUCT-001',
      operatorId: testUser.userId,
      waiterId: hotelWaiters[0].id,
      servedByName: hotelWaiters[0].name,
      customerName: 'Guest',
      tableNumber: '',
      serviceType: 'TAKEAWAY' as const,
      notes: '',
      status: 'CLOSED' as const,
      method: 'CASH' as const,
      paymentReference: '',
      total: 250,
      createdAt: '2026-11-06T12:00:00Z',
      lines: [
        {
          itemId: 'water',
          itemType: 'PRODUCT' as const,
          itemName: 'Bottled water',
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
      ],
      ...hotelReceiptSettings,
    };
    const { rerender } = render(
      <HotelOrderReceipt
        order={order}
        organization={testOrganization}
        branchName="Hotel"
        close={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Customer copy' })).toHaveTextContent(
      'Bottled water',
    );
    expect(screen.getByRole('button', { name: 'Print receipt' })).toBeInTheDocument();

    const mixedOrder = {
      ...order,
      total: 500,
      lines: [
        ...order.lines,
        {
          itemId: 'meal',
          itemType: 'FOOD' as const,
          itemName: 'Pilau',
          quantity: 1,
          unitPrice: 250,
          total: 250,
        },
      ],
    };
    rerender(
      <HotelOrderReceipt
        order={mixedOrder}
        organization={testOrganization}
        branchName="Hotel"
        close={vi.fn()}
      />,
    );
    const kitchenCopy = screen.getByRole('article', { name: 'Kitchen copy' });
    expect(kitchenCopy).toHaveTextContent('Pilau');
    expect(kitchenCopy).not.toHaveTextContent('Bottled water');
    expect(screen.getByRole('article', { name: 'Customer copy' })).toHaveTextContent(
      'Bottled water',
    );
  });
  it('lets an admin assign any active user as a waiter and edit receipt details', async () => {
    const user = userEvent.setup();
    vi.spyOn(staffApi, 'getUsers').mockResolvedValue([
      {
        id: 'existing-user-account',
        email: 'user@example.test',
        displayName: 'Carol User',
        status: 'ACTIVE',
        roleIds: ['shop-manager-role'],
        roleNames: ['Shop Manager'],
        permissionCodes: ['hotel:view'],
        branchIds: [],
        branchNames: [],
      },
    ]);
    renderPage('/hotel/service-settings');
    await screen.findByRole('option', { name: 'Carol User · user@example.test' });
    await user.selectOptions(screen.getByLabelText('User account'), 'existing-user-account');
    await user.click(screen.getByRole('button', { name: 'Add waiter' }));
    expect(api.saveHotelWaiter).toHaveBeenCalledWith({
      branchId: hotelBranchId,
      userId: 'existing-user-account',
      active: true,
    });
    const till = screen.getByLabelText('Till number');
    await user.clear(till);
    await user.type(till, '772211');
    const phone = screen.getByLabelText('Phone for complaints and orders');
    await user.clear(phone);
    await user.type(phone, '+254700000222');
    await user.click(screen.getByRole('button', { name: 'Save receipt details' }));
    expect(api.saveHotelReceiptSettings).toHaveBeenCalledWith({
      ...hotelReceiptSettings,
      branchId: hotelBranchId,
      tillNumber: '772211',
      contactPhone: '+254700000222',
    });
  });
  it('removes a waiter assignment without deleting the user account', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.deleteHotelWaiter).mockResolvedValue(undefined);
    renderPage('/hotel/service-settings');

    const waiterRow = await screen.findByRole('row', { name: /Alice Waiter/i });
    await user.click(within(waiterRow).getByRole('button', { name: 'Remove' }));

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining("Remove Alice Waiter from this hotel's waiter list"),
    );
    expect(api.deleteHotelWaiter).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000006');
    expect(await screen.findByText('Waiter account removed.')).toBeInTheDocument();
  });
  it('enforces hotel route permissions including report access and cashier restrictions', () => {
    const viewer = { ...testUser, roleKeys: ['SHOP_MANAGER'], permissionCodes: ['hotel:view'] };
    expect(canAccessPath(viewer, '/hotel/calendar')).toBe(true);
    expect(canAccessPath(viewer, '/hotel/reports')).toBe(false);
    const modules = appModules(
      appRegistry.find((app) => app.id === 'hotel')!,
      viewer,
    );
    expect(modules).toHaveLength(7);
    const waiter = {
      ...viewer,
      roleKeys: ['HOTEL_SALES_MANAGER'],
      permissionCodes: ['hotel:sell'],
    };
    expect(
      appModules(
        appRegistry.find((app) => app.id === 'hotel')!,
        waiter,
      ).map((item) => item.to),
    ).toEqual(['/hotel/restaurant']);
    expect(canAccessPath(waiter, '/hotel/service-settings')).toBe(false);
    expect(canAccessPath(waiter, '/inventory')).toBe(false);
    expect(canAccessPath({ ...viewer, permissionCodes: [] }, '/hotel')).toBe(false);
    expect(
      canAccessPath(
        { ...viewer, roleKeys: ['CASHIER'], permissionCodes: ['hotel:manage'] },
        '/hotel',
      ),
    ).toBe(false);
  });
  it('handles exclusive departure dates and local business dates at midnight', () => {
    const room = hotelWorkspace.rooms[0];
    expect(roomIsBookable(room, [hotelBooking], '2026-11-07', '2026-11-09', 1)).toBe(false);
    expect(roomIsBookable(room, [hotelBooking], '2026-11-08', '2026-11-09', 2)).toBe(true);
    expect(roomIsBookable(room, [], '2026-11-08', '2026-11-09', 3)).toBe(false);
    expect(
      roomIsBookable({ ...room, status: 'MAINTENANCE' }, [], '2026-11-08', '2026-11-09', 1),
    ).toBe(false);
    expect(nightsBetween('2026-12-31', addDays('2026-12-31', 2))).toBe(2);
    expect(businessDate('Africa/Nairobi', '2026-11-06T22:30:00Z')).toBe('2026-11-07');
  });
  it('saves a room with its individual rate and housekeeping status', async () => {
    const user = userEvent.setup();
    renderPage('/hotel/rooms');
    await user.click(await screen.findByRole('button', { name: '+ Add room' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Room number'), '201');
    await user.clear(within(dialog).getByLabelText('Room type'));
    await user.type(within(dialog).getByLabelText('Room type'), 'Suite');
    await user.type(within(dialog).getByLabelText('Price per night'), '7500');
    await user.selectOptions(within(dialog).getByLabelText('Housekeeping status'), 'CLEANING');
    await user.click(within(dialog).getByRole('button', { name: 'Add room' }));
    expect(api.saveHotelRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: hotelBranchId,
        number: '201',
        nightlyRate: 7500,
        status: 'CLEANING',
      }),
      undefined,
    );
  });
  it('disables check-out until the bill is settled and records a guest payment', async () => {
    const stay = { ...hotelBooking, status: 'CHECKED_IN' as const };
    vi.mocked(api.getHotelWorkspace).mockResolvedValue({
      ...structuredClone(hotelWorkspace),
      bookings: [stay],
    });
    const user = userEvent.setup();
    renderPage('/hotel/reservations');
    await user.click(await screen.findByRole('button', { name: 'Guest bill' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Check out guest' })).toBeDisabled();
    await user.clear(within(dialog).getByLabelText('Amount'));
    await user.type(within(dialog).getByLabelText('Amount'), '1000');
    await user.click(within(dialog).getByRole('button', { name: 'Record payment' }));
    expect(api.payHotelBooking).toHaveBeenCalledWith(
      stay.id,
      expect.objectContaining({ amount: 1000, method: 'CASH', requestId: expect.any(String) }),
    );
  });
  it('keeps a failed food order for retry with the same request identifier', async () => {
    const user = userEvent.setup();
    vi.mocked(api.sellHotelFood)
      .mockRejectedValueOnce(new Error('Connection lost; retry this order.'))
      .mockResolvedValueOnce({
        id: 'order',
        branchId: hotelBranchId,
        reference: 'FOOD-001',
        customerName: 'Jane Guest',
        total: 250,
        method: 'ROOM',
        bookingId: hotelBooking.id,
        createdAt: '2026-11-06T12:00:00Z',
        paymentReference: '',
        operatorId: testUser.userId,
        waiterId: hotelWaiters[0].id,
        servedByName: hotelWaiters[0].name,
        tableNumber: '3',
        serviceType: 'DINE_IN',
        notes: '',
        status: 'CLOSED',
        ...hotelReceiptSettings,
        lines: [],
      });
    const receipt = vi.fn(),
      saved = vi.fn().mockResolvedValue(undefined);
    render(
      <HotelRegister
        data={structuredClone(hotelCheckout)}
        branchId={hotelBranchId}
        currency="KES"
        canSell
        saved={saved}
        receipt={receipt}
      />,
    );
    await user.click(screen.getByRole('searchbox', { name: 'Search food or products' }));
    const foodPicker = screen.getByRole('list', { name: 'Item results' });
    await user.click(within(foodPicker).getByRole('button', { name: 'Add Lunch' }));
    await user.selectOptions(screen.getByLabelText('Served by'), hotelWaiters[0].id);
    await user.type(screen.getByLabelText('Table number (optional)'), '3');
    await user.selectOptions(screen.getByLabelText('Payment / room charge'), 'ROOM');
    await user.selectOptions(screen.getByLabelText('Checked-in guest'), hotelBooking.id);
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
    await user.click(screen.getByRole('button', { name: 'Create Order' }));
    expect(api.sellHotelFood).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.sellHotelFood).mock.calls[0][0].requestId).toBe(
      vi.mocked(api.sellHotelFood).mock.calls[1][0].requestId,
    );
    expect(receipt).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Your order starts here')).toBeInTheDocument();
  });
  it('opens reports without requesting guest or inventory data', async () => {
    renderPage('/hotel/reports', {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['hotel:reports'],
    });
    expect(await screen.findByText('Total revenue')).toBeInTheDocument();
    expect(api.getHotelWorkspace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });
  it('hides mutation controls for a hotel viewer', async () => {
    renderPage('/hotel/rooms', {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['hotel:view'],
    });
    expect(await screen.findByText('Rooms & nightly prices')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add room' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New reservation/ })).not.toBeInTheDocument();
  });
});
