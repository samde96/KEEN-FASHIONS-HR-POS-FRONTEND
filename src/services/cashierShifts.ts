import { requestJson } from './api';

export type CashierShift = {
  id: string;
  branchId: string;
  branchName: string;
  cashierId: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openingFloat: number;
  openingNote?: string;
  openedAt: string;
  closedAt?: string;
  closingCash?: number;
  closingNote?: string;
  cashSales: number;
  cashExpenses: number;
  totalSales: number;
  transactionCount: number;
  expectedCash: number;
  variance?: number;
};

export const getCashierShifts = () => requestJson<CashierShift[]>('/api/v1/shifts');
export const openCashierShift = (body: {
  branchId: string;
  openingFloat: number;
  openingNote: string;
}) =>
  requestJson<CashierShift>('/api/v1/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
export const closeCashierShift = (id: string, body: { closingCash: number; closingNote: string }) =>
  requestJson<CashierShift>(`/api/v1/shifts/${id}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
