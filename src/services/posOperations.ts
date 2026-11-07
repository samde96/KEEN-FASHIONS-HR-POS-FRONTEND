import { requestJson } from './api';
import type { StockIntakeRequest } from '../data/types';

export type PosPreferences = {
  dailySummaryEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  recipientIds: string[];
  inactivityMinutes: number;
  longEntryMinutes: number;
  timeZone: string;
  notificationEmail?: string;
};
export type DailyReportRow = {
  id: string | null;
  name: string;
  quantity?: number;
  revenue: number;
  transactions?: number;
  sku?: string;
};
export type DailySalesReport = {
  id: string;
  branchId: string;
  branchName: string;
  businessDate: string;
  timeZone: string;
  fromInclusive: string;
  toExclusive: string;
  currencyCode: string;
  transactions: number;
  grossSales: number;
  discounts: number;
  tax: number;
  refunds: number;
  refundTransactions: number;
  cancellations: number;
  cancelledTransactions: number;
  netSales: number;
  totalRevenue: number;
  payments: Record<string, number>;
  itemsSold: number;
  topVariants: DailyReportRow[];
  parentProducts: DailyReportRow[];
  cashiers: DailyReportRow[];
};
export type StockDraft<TForm, TLine = StockIntakeRequest> = {
  id: string;
  branchId: string;
  status: 'DRAFT' | 'COMPLETED' | 'DISCARDED';
  payload: { form: TForm; lines: TLine[]; displayLines?: TLine[] };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  version: number;
};
const body = (value: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(value),
});
export const getPosPreferences = () => requestJson<PosPreferences>('/api/v1/pos-preferences');
export const savePosPreferences = (value: PosPreferences) =>
  requestJson<PosPreferences>('/api/v1/pos-preferences', body(value, 'PUT'));
export const getDailyReports = (branchId: string) =>
  requestJson<DailySalesReport[]>(
    `/api/v1/daily-sales-reports?branchId=${encodeURIComponent(branchId)}`,
  );
export const generateDailyReport = (branchId: string, date: string) =>
  requestJson<DailySalesReport>(
    `/api/v1/daily-sales-reports/generate?branchId=${encodeURIComponent(branchId)}&date=${encodeURIComponent(date)}`,
    { method: 'POST' },
  );
export const resendDailyReport = (id: string, key: string) =>
  requestJson<void>(`/api/v1/daily-sales-reports/${id}/resend`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
  });
export const getStockDrafts = <TForm, TLine>() =>
  requestJson<StockDraft<TForm, TLine>[]>('/api/v1/stock-operations');
export const saveStockDraft = <TForm, TLine>(
  id: string,
  branchId: string,
  form: TForm,
  lines: TLine[],
  version: number,
) =>
  requestJson<StockDraft<TForm, TLine>>(
    `/api/v1/stock-operations/${id}`,
    body({ branchId, form, lines, displayLines: lines, version }, 'PUT'),
  );
export const completeStockDraft = (id: string) =>
  requestJson<StockDraft<unknown>>(`/api/v1/stock-operations/${id}/complete`, { method: 'POST' });
export const discardStockDraft = (id: string) =>
  requestJson<void>(`/api/v1/stock-operations/${id}`, { method: 'DELETE' });
export type SaleReversal = {
  id: string;
  sale_id: string;
  kind: 'REFUND' | 'CANCELLATION';
  amount: number;
  reason: string;
  created_at: string;
};
export const getSaleReversals = () => requestJson<SaleReversal[]>('/api/v1/sale-reversals');
export const reverseSale = (id: string, kind: SaleReversal['kind'], reason: string) =>
  requestJson<SaleReversal>(`/api/v1/sales/${id}/reversal`, body({ kind, reason }));
