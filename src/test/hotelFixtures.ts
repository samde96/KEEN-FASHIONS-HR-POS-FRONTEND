import type { HotelBooking, HotelReport, HotelWorkspace, HotelCheckout } from '../hotel/types';
import { testBranches } from './fixtures';

export const hotelBranchId = testBranches[0].id;
export const hotelWaiters = [
  {
    id: '10000000-0000-4000-8000-000000000006',
    branchId: hotelBranchId,
    name: 'Alice Waiter',
    active: true,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    branchId: hotelBranchId,
    name: 'Brian Waiter',
    active: true,
  },
];
export const hotelReceiptSettings = {
  hotelName: 'Test Hotel',
  tillNumber: '1234567',
  contactPhone: '+254700000111',
};
export const hotelBooking: HotelBooking = {
  id: '10000000-0000-4000-8000-000000000001',
  branchId: hotelBranchId,
  roomId: '10000000-0000-4000-8000-000000000002',
  roomNumber: '101',
  reference: 'STAY-TEST-001',
  guestName: 'Jane Guest',
  guestPhone: '0700123456',
  guestEmail: '',
  guests: 2,
  arrival: '2026-11-06',
  departure: '2026-11-08',
  nights: 2,
  nightlyRate: 3000,
  roomTotal: 6000,
  foodTotal: 0,
  total: 6000,
  paid: 0,
  balance: 6000,
  status: 'RESERVED',
  notes: '',
  payments: [],
};
export const hotelWorkspace: HotelWorkspace = {
  businessDate: '2026-11-06',
  rooms: [
    {
      id: hotelBooking.roomId,
      branchId: hotelBranchId,
      number: '101',
      roomType: 'Deluxe',
      capacity: 2,
      nightlyRate: 3000,
      status: 'READY',
    },
    {
      id: '10000000-0000-4000-8000-000000000003',
      branchId: hotelBranchId,
      number: '102',
      roomType: 'Standard',
      capacity: 1,
      nightlyRate: 2000,
      status: 'READY',
    },
  ],
  bookings: [hotelBooking],
  items: [
    {
      id: '10000000-0000-4000-8000-000000000004',
      branchId: hotelBranchId,
      name: 'Bottled water',
      category: 'PRODUCT',
      unit: 'bottle',
      sellable: true,
      price: 250,
      stock: 10,
      reorderLevel: 3,
      active: true,
    },
  ],
  menuItems: [
    {
      id: '10000000-0000-4000-8000-000000000005',
      branchId: hotelBranchId,
      name: 'Lunch',
      category: 'Main meals',
      description: 'Rice and stew',
      price: 250,
      available: true,
    },
  ],
  orders: [],
  movements: [],
};
export const hotelCheckout: HotelCheckout = {
  waiters: hotelWaiters,
  receiptSettings: hotelReceiptSettings,
  businessDate: hotelWorkspace.businessDate,
  menuItems: hotelWorkspace.menuItems,
  products: hotelWorkspace.items,
  guests: [{ id: hotelBooking.id, roomNumber: '101', guestName: hotelBooking.guestName }],
  orders: [],
};
export const hotelReport: HotelReport = {
  from: '2026-11-01',
  to: '2026-11-06',
  roomRevenue: 6000,
  foodRevenue: 500,
  productRevenue: 0,
  totalRevenue: 6500,
  totalExpenses: 500,
  profitLoss: 6000,
  paymentsReceived: 6500,
  outstandingBalance: 0,
  completedStays: 1,
  soldNights: 2,
  bookedRoomNights: 2,
  availableRoomNights: 12,
  bookedOccupancyRate: 16.67,
  averageDailyRate: 3000,
  daily: [
    {
      date: '2026-11-06',
      accommodation: 6000,
      food: 500,
      products: 0,
      payments: 6500,
      expenses: 500,
    },
  ],
  rooms: [{ roomNumber: '101', completedStays: 1, soldNights: 2, revenue: 6000 }],
  expensesByCategory: [{ category: 'UTILITIES', amount: 500 }],
};
