import type { SaleRequest } from '../data/types';
import { requestJson } from './api';

export type MpesaPayment = {
  id: string;
  status:
    | 'QUEUED'
    | 'SENDING'
    | 'PENDING'
    | 'UNKNOWN'
    | 'PAID_UNCONFIRMED'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'REVIEW';
  amount: number;
  phoneMask: string;
  receiptNumber?: string;
  message: string;
  saleId?: string;
  createdAt: string;
};

export type MpesaRecovery = { key: string; sale: SaleRequest; transactionId?: string };

export const getMpesaConfig = () => requestJson<{ enabled: boolean }>('/api/v1/mpesa/config');
export const getMpesaPayment = (id: string) =>
  requestJson<MpesaPayment>(`/api/v1/mpesa/transactions/${encodeURIComponent(id)}`);
export const getMpesaPaymentByKey = (key: string) =>
  requestJson<MpesaPayment>(`/api/v1/mpesa/transactions/by-key/${encodeURIComponent(key)}`);
export const startMpesaPayment = (key: string, phoneNumber: string, sale: SaleRequest) =>
  requestJson<MpesaPayment>('/api/v1/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ phoneNumber, sale }),
  });

export function readMpesaRecovery(storageKey: string): MpesaRecovery | null {
  try {
    const saved: MpesaRecovery = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return saved &&
      typeof saved.key === 'string' &&
      Array.isArray(saved.sale?.lines) &&
      Array.isArray(saved.sale?.payments)
      ? saved
      : null;
  } catch {
    return null;
  }
}

export function saveMpesaRecovery(storageKey: string, saved: MpesaRecovery) {
  // The phone number and all Daraja credentials stay out of browser storage.
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

export function clearMpesaRecovery(storageKey: string) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* A completed server payment remains durable. */
  }
}
