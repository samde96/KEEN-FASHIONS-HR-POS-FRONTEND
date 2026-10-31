export const stockInactivityUnits = {
  days: { label: 'Days', minutes: 1440 },
  hours: { label: 'Hours', minutes: 60 },
  minutes: { label: 'Minutes', minutes: 1 },
};
export type StockInactivityUnit = keyof typeof stockInactivityUnits;
export const defaultStockInactivityMinutes = 2 * 1440;
export const maxStockInactivityMinutes = 365 * 1440;

export function stockInactivityUnit(minutes: number): StockInactivityUnit {
  if (minutes % 1440 === 0) return 'days';
  if (minutes % 60 === 0) return 'hours';
  return 'minutes';
}

export function formatStockInactivity(minutes: number) {
  const unit = stockInactivityUnit(minutes);
  const amount = minutes / stockInactivityUnits[unit].minutes;
  return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
}
