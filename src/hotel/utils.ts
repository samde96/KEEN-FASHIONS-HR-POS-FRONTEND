import type { HotelBooking, HotelRoom } from './types';

export function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
export function nightsBetween(arrival: string, departure: string) {
  return Math.round(
    (Date.parse(`${departure}T00:00:00Z`) - Date.parse(`${arrival}T00:00:00Z`)) / 86400000,
  );
}
export function roomIsBookable(
  room: HotelRoom,
  bookings: HotelBooking[],
  arrival: string,
  departure: string,
  guests: number,
  excluding?: string,
) {
  return (
    room.status !== 'MAINTENANCE' &&
    room.capacity >= guests &&
    departure > arrival &&
    !bookings.some(
      (b) =>
        b.id !== excluding &&
        b.roomId === room.id &&
        ['RESERVED', 'CHECKED_IN'].includes(b.status) &&
        b.arrival < departure &&
        b.departure > arrival,
    )
  );
}
export function businessDate(timeZone: string, instant?: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant ? new Date(instant) : new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}
export function displayDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export const statusLabel = (status: string) =>
  status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (s) => s.toUpperCase());
export const money = (value: number, currency: string) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency }).format(value);
