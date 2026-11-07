import { requestJson } from '../services/api';
import type {
  HotelWorkspace,
  HotelRoom,
  HotelRoomRequest,
  HotelBooking,
  HotelBookingRequest,
  HotelItem,
  HotelItemRequest,
  HotelOrder,
  HotelOrderRequest,
  HotelPaymentMethod,
  HotelReport,
  HotelCheckout,
  HotelMenuItem,
  HotelMenuItemRequest,
  HotelWaiter,
  HotelWaiterRequest,
  HotelReceiptSettings,
  HotelExpense,
  HotelExpenseRequest,
  HotelAsset,
  HotelAssetRequest,
} from './types';

const base = '/api/v1/hotel';
export const getHotelCheckout = (branchId: string) =>
  requestJson<HotelCheckout>(`${base}/checkout?${new URLSearchParams({ branchId })}`, undefined, {
    onlineOnly: true,
  });
export const getHotelWaiters = (branchId: string) =>
  requestJson<HotelWaiter[]>(`${base}/waiters?${new URLSearchParams({ branchId })}`, undefined, {
    onlineOnly: true,
  });
export const saveHotelWaiter = (body: HotelWaiterRequest, id?: string) =>
  send<HotelWaiter>(id ? `/waiters/${id}` : '/waiters', body, id ? 'PUT' : 'POST');
export const deleteHotelWaiter = (id: string) => send<void>(`/waiters/${id}`, undefined, 'DELETE');
export const getHotelReceiptSettings = (branchId: string) =>
  requestJson<HotelReceiptSettings>(
    `${base}/receipt-settings?${new URLSearchParams({ branchId })}`,
    undefined,
    { onlineOnly: true },
  );
export const saveHotelReceiptSettings = (body: HotelReceiptSettings & { branchId: string }) =>
  send<HotelReceiptSettings>('/receipt-settings', body, 'PUT');
export const saveHotelMenuItem = (body: HotelMenuItemRequest, id?: string) =>
  send<HotelMenuItem>(id ? `/menu-items/${id}` : '/menu-items', body, id ? 'PUT' : 'POST');
export const getHotelExpenses = (branchId: string) =>
  requestJson<HotelExpense[]>(`${base}/expenses?${new URLSearchParams({ branchId })}`, undefined, {
    onlineOnly: true,
  });
export const saveHotelExpense = (body: HotelExpenseRequest, id?: string) =>
  send<HotelExpense>(id ? `/expenses/${id}` : '/expenses', body, id ? 'PUT' : 'POST');
export const getHotelAssets = (branchId: string) =>
  requestJson<HotelAsset[]>(`${base}/assets?${new URLSearchParams({ branchId })}`, undefined, {
    onlineOnly: true,
  });
export const saveHotelAsset = (body: HotelAssetRequest, id?: string) =>
  send<HotelAsset>(id ? `/assets/${id}` : '/assets', body, id ? 'PUT' : 'POST');
export const cancelHotelOrder = (id: string) => send<HotelOrder>(`/orders/${id}/cancel`);
export const settleHotelOrder = (
  id: string,
  body: {
    requestId: string;
    method: HotelPaymentMethod | 'ROOM';
    bookingId?: string;
    reference: string;
  },
) => send<HotelOrder>(`/orders/${id}/payment`, body);
// Availability, payments and stock must be confirmed online; hotel writes are never queued offline.
function send<T>(path: string, body?: unknown, method = 'POST') {
  return requestJson<T>(
    `${base}${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    { onlineOnly: true },
  );
}
export const getHotelWorkspace = (branchId: string) =>
  requestJson<HotelWorkspace>(`${base}/workspace?${new URLSearchParams({ branchId })}`, undefined, {
    onlineOnly: true,
  });
export const saveHotelRoom = (body: HotelRoomRequest, id?: string) =>
  send<HotelRoom>(id ? `/rooms/${id}` : '/rooms', body, id ? 'PUT' : 'POST');
export const saveHotelBooking = (body: HotelBookingRequest, id?: string) =>
  send<HotelBooking>(id ? `/bookings/${id}` : '/bookings', body, id ? 'PUT' : 'POST');
export const hotelBookingAction = (id: string, action: 'check-in' | 'check-out' | 'cancel') =>
  send<HotelBooking>(`/bookings/${id}/${action}`);
export const payHotelBooking = (
  id: string,
  body: {
    requestId: string;
    amount: number;
    kind: 'PAYMENT' | 'REFUND';
    method: HotelPaymentMethod;
    reference: string;
  },
) => send<HotelBooking>(`/bookings/${id}/payments`, body);
export const saveHotelItem = (body: HotelItemRequest, id?: string) =>
  send<HotelItem>(id ? `/items/${id}` : '/items', body, id ? 'PUT' : 'POST');
export const changeHotelStock = (
  id: string,
  body: {
    requestId: string;
    quantity: number;
    kind: 'RECEIPT' | 'USAGE';
    note: string;
  },
) => send<HotelItem>(`/items/${id}/stock`, body);
export const sellHotelFood = (body: HotelOrderRequest) => send<HotelOrder>('/orders', body);
export const getHotelBookingOrders = (id: string) =>
  requestJson<HotelOrder[]>(`${base}/bookings/${id}/orders`, undefined, { onlineOnly: true });
export const getHotelReport = (branchId: string, from: string, to: string) =>
  requestJson<HotelReport>(
    `${base}/reports?${new URLSearchParams({ branchId, from, to })}`,
    undefined,
    { onlineOnly: true },
  );
