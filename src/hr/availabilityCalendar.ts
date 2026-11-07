import type { AvailabilityCalendarRecord } from '../services/hr';

const DAY_MS = 86_400_000;

export const addCalendarDays = (day: string, count: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS) + 1;

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T12:00:00Z`));

export const dayLabel = (day: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('en-KE', { ...options, timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00Z`),
  );

export const monthGrid = (month: string) => {
  const firstDay = `${month}-01`;
  const offset = (new Date(`${firstDay}T12:00:00Z`).getUTCDay() + 6) % 7;
  const nextMonth = new Date(`${firstDay}T12:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const count = daysBetween(firstDay, nextMonth.toISOString().slice(0, 10)) - 1;
  const total = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: total }, (_, index) =>
    index < offset || index >= offset + count ? null : addCalendarDays(firstDay, index - offset),
  );
};

export const shiftCalendarMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
};

export const calendarRecordDays = (record: AvailabilityCalendarRecord) => {
  if (record.startDate) {
    return { from: record.startDate.slice(0, 10), to: (record.endDate ?? record.startDate).slice(0, 10) };
  }
  const from = record.startsAt
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(record.startsAt))
    : '';
  const endInstant = record.endsAt ? Date.parse(record.endsAt) - 1 : Date.now();
  const to = record.endsAt
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(endInstant))
    : from;
  return { from, to };
};

export const recordCoversDay = (record: AvailabilityCalendarRecord, day: string) => {
  const range = calendarRecordDays(record);
  return range.from <= day && range.to >= day;
};

export const leaveTypeKind = (code: string, name: string): AvailabilityCalendarRecord['kind'] => {
  const value = `${code} ${name}`.toLowerCase();
  if (value.includes('sick')) return 'SICK_LEAVE';
  if (value.includes('annual')) return 'ANNUAL_LEAVE';
  return 'OFF_DAY';
};
