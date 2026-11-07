import type { Page } from '@playwright/test';
import { mockApi } from './mockApi';
import {
  hotelReport,
  hotelWorkspace,
  hotelWaiters,
  hotelReceiptSettings,
} from '../../src/test/hotelFixtures';
import { testUser } from '../../src/test/fixtures';
import type { HotelOrder, HotelPayment } from '../../src/hotel/types';

export async function mockHotel(page: Page, data = structuredClone(hotelWorkspace)) {
  await mockApi(page);
  await page.addInitScript(() => {
    const state = window as unknown as { hotelPrintCount: number };
    state.hotelPrintCount = 0;
    window.print = () => {
      state.hotelPrintCount++;
    };
  });
  const directory = structuredClone(hotelWaiters),
    receiptSettings = structuredClone(hotelReceiptSettings);
  const commands = new Map<string, unknown>();
  await page.route('**/api/v1/hotel/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path.endsWith('/workspace')) {
      await route.fulfill({ json: data });
      return;
    }
    if (path.endsWith('/checkout')) {
      await route.fulfill({
        json: {
          businessDate: data.businessDate,
          menuItems: data.menuItems,
          products: data.items.filter((i) => i.sellable),
          guests: data.bookings
            .filter((b) => b.status === 'CHECKED_IN')
            .map((b) => ({ id: b.id, roomNumber: b.roomNumber, guestName: b.guestName })),
          orders: data.orders,
          waiters: directory.filter((w) => w.active),
          receiptSettings,
        },
      });
      return;
    }
    if (path.endsWith('/waiters')) {
      if (request.method() === 'POST') {
        const waiter = { ...request.postDataJSON(), id: crypto.randomUUID() };
        directory.push(waiter);
        await route.fulfill({ status: 201, json: waiter });
      } else await route.fulfill({ json: directory });
      return;
    }
    if (/waiters\/[^/]+$/.test(path) && request.method() === 'PUT') {
      const waiter = directory.find((w) => w.id === path.split('/').at(-1))!;
      Object.assign(waiter, request.postDataJSON());
      await route.fulfill({ json: waiter });
      return;
    }
    if (path.endsWith('/receipt-settings')) {
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        Object.assign(receiptSettings, {
          hotelName: body.hotelName,
          tillNumber: body.tillNumber,
          contactPhone: body.contactPhone,
        });
      }
      await route.fulfill({ json: receiptSettings });
      return;
    }
    if (path.endsWith('/reports')) {
      const roomRevenue = data.bookings
        .filter((b) => b.status === 'CHECKED_OUT')
        .reduce((sum, b) => sum + b.roomTotal, 0);
      const lines = data.orders.filter((o) => o.status !== 'CANCELLED').flatMap((o) => o.lines);
      const foodRevenue = lines
        .filter((l) => l.itemType === 'FOOD')
        .reduce((sum, l) => sum + l.total, 0);
      const productRevenue = lines
        .filter((l) => l.itemType === 'PRODUCT')
        .reduce((sum, l) => sum + l.total, 0);
      const completed = data.bookings.filter((b) => b.status === 'CHECKED_OUT');
      const soldNights = completed.reduce((sum, b) => sum + b.nights, 0);
      const outstandingBalance =
        data.bookings
          .filter((b) => ['RESERVED', 'CHECKED_IN'].includes(b.status))
          .reduce((sum, b) => sum + b.balance, 0) +
        data.orders
          .filter((o) => o.method === 'UNPAID' && o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.total, 0);
      const paymentsReceived =
        data.bookings
          .flatMap((b) => b.payments)
          .reduce((sum, p) => sum + (p.kind === 'REFUND' ? -p.amount : p.amount), 0) +
        data.orders
          .filter((o) => !['UNPAID', 'ROOM'].includes(o.method) && o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.total, 0);
      const url = new URL(request.url()),
        from = url.searchParams.get('from')!,
        to = url.searchParams.get('to')!;
      const end = new Date(`${to}T12:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      const toExclusive = end.toISOString().slice(0, 10);
      const days = (Date.parse(toExclusive) - Date.parse(from)) / 86400000;
      const bookedRoomNights = data.bookings
        .filter((b) => b.status !== 'CANCELLED')
        .reduce(
          (sum, b) =>
            sum +
            Math.max(
              0,
              (Date.parse(b.departure < toExclusive ? b.departure : toExclusive) -
                Date.parse(b.arrival > from ? b.arrival : from)) /
                86400000,
            ),
          0,
        );
      await route.fulfill({
        json: {
          ...hotelReport,
          roomRevenue,
          foodRevenue,
          productRevenue,
          paymentsReceived,
          outstandingBalance,
          completedStays: completed.length,
          soldNights,
          availableRoomNights: data.rooms.length * days,
          bookedRoomNights,
          bookedOccupancyRate:
            Math.round((bookedRoomNights / (data.rooms.length * days)) * 10000) / 100,
          averageDailyRate: soldNights ? roomRevenue / soldNights : 0,
          rooms: data.rooms.map((room) => {
            const bookings = completed.filter((b) => b.roomId === room.id);
            return {
              roomNumber: room.number,
              completedStays: bookings.length,
              soldNights: bookings.reduce((sum, b) => sum + b.nights, 0),
              revenue: bookings.reduce((sum, b) => sum + b.roomTotal, 0),
            };
          }),
          totalRevenue: roomRevenue + foodRevenue + productRevenue,
          daily: [
            {
              date: data.businessDate,
              accommodation: roomRevenue,
              food: foodRevenue,
              products: productRevenue,
              payments: paymentsReceived,
            },
          ],
        },
      });
      return;
    }
    if (request.method() === 'GET' && /bookings\/[^/]+\/orders$/.test(path)) {
      await route.fulfill({
        json: data.orders.filter((o) => o.bookingId === path.split('/').at(-2)),
      });
      return;
    }
    if (
      request.method() === 'POST' &&
      /bookings\/[^/]+\/(payments|check-in|check-out|cancel)$/.test(path)
    ) {
      const booking = data.bookings.find((b) => b.id === path.split('/').at(-2))!,
        action = path.split('/').at(-1);
      if (action === 'payments') {
        const body = request.postDataJSON();
        if (!commands.has(body.requestId)) {
          const payment: HotelPayment = {
            ...body,
            id: crypto.randomUUID(),
            bookingId: booking.id,
            createdAt: '2026-11-06T12:00:00Z',
          };
          booking.payments.push(payment);
          booking.paid += body.kind === 'REFUND' ? -body.amount : body.amount;
          booking.balance = booking.total - booking.paid;
          commands.set(body.requestId, payment);
        }
      } else if (action === 'check-in') booking.status = 'CHECKED_IN';
      else if (action === 'check-out') {
        booking.status = 'CHECKED_OUT';
        booking.checkedOutAt = '2026-11-06T12:00:00Z';
        data.rooms.find((r) => r.id === booking.roomId)!.status = 'CLEANING';
      } else booking.status = 'CANCELLED';
      await route.fulfill({ json: booking });
      return;
    }
    if (path.endsWith('/orders') && request.method() === 'POST') {
      const body = request.postDataJSON();
      if (commands.has(body.requestId)) {
        await route.fulfill({ json: commands.get(body.requestId) });
        return;
      }
      const lines = body.lines.map(
        (line: { itemId: string; itemType: 'FOOD' | 'PRODUCT'; quantity: number }) => {
          const item =
            line.itemType === 'FOOD'
              ? data.menuItems.find((i) => i.id === line.itemId)!
              : data.items.find((i) => i.id === line.itemId)!;
          if (line.itemType === 'PRODUCT')
            data.items.find((i) => i.id === line.itemId)!.stock -= line.quantity;
          return {
            ...line,
            itemName: item.name,
            unitPrice: item.price,
            total: item.price * line.quantity,
          };
        },
      );
      const booking = data.bookings.find((b) => b.id === body.bookingId);
      const order: HotelOrder = {
        id: crypto.randomUUID(),
        branchId: body.branchId,
        bookingId: body.bookingId,
        roomNumber: booking?.roomNumber,
        customerName: booking?.guestName ?? body.customerName ?? 'Walk-in',
        reference: `FOOD-${data.orders.length + 1}`,
        total: lines.reduce((sum: number, line: { total: number }) => sum + line.total, 0),
        method: body.method,
        paymentReference: body.paymentReference,
        operatorId: testUser.userId,
        waiterId: body.waiterId,
        servedByName: directory.find((w) => w.id === body.waiterId)!.name,
        tableNumber: body.tableNumber,
        serviceType: body.serviceType,
        notes: body.notes,
        status: body.method === 'UNPAID' ? 'OPEN' : 'CLOSED',
        ...receiptSettings,
        createdAt: '2026-11-06T12:00:00Z',
        lines,
      };
      if (booking) {
        booking.foodTotal += order.total;
        booking.total += order.total;
        booking.balance += order.total;
      }
      data.orders.unshift(order);
      commands.set(body.requestId, order);
      await route.fulfill({ status: 201, json: order });
      return;
    }
    if (request.method() === 'POST' && /orders\/[^/]+\/cancel$/.test(path)) {
      const order = data.orders.find((o) => o.id === path.split('/').at(-2))!;
      if (order.status !== 'CANCELLED')
        for (const line of order.lines)
          if (line.itemType === 'PRODUCT')
            data.items.find((i) => i.id === line.itemId)!.stock += line.quantity;
      order.status = 'CANCELLED';
      await route.fulfill({ json: order });
      return;
    }
    if (request.method() === 'POST' && /orders\/[^/]+\/payment$/.test(path)) {
      const order = data.orders.find((o) => o.id === path.split('/').at(-2))!,
        body = request.postDataJSON();
      order.method = body.method;
      order.status = 'CLOSED';
      order.paymentReference = body.reference;
      order.paidAt = '2026-11-06T12:00:00Z';
      await route.fulfill({ json: order });
      return;
    }
    await route.fulfill({ status: 501, json: { detail: `Unexpected hotel endpoint: ${path}` } });
  });
  return data;
}
