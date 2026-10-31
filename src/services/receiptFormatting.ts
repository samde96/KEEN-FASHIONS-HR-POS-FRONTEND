import type { Sale, PaymentMethod } from '../data/types';

export function formatMoney(amount: number, currencyCode: string) {
  const prefix = currencyCode === 'KES' ? 'KSh' : currencyCode;
  return `${prefix} ${new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatSalePayments(sale: Sale, currencyCode?: string) {
  if (sale.payments.length === 0) {
    return 'N/A';
  }

  if (sale.payments.length === 1) {
    return formatPaymentMethod(sale.payments[0]?.method);
  }

  const paymentLabels = sale.payments.map((payment) => {
    const label = formatPaymentMethod(payment.method);
    return currencyCode ? `${label} ${formatMoney(payment.amount, currencyCode)}` : label;
  });
  return `Split: ${paymentLabels.join(' + ')}`;
}

export function formatPaymentMethod(method: PaymentMethod | undefined) {
  if (method === 'MPESA') {
    return 'M-Pesa';
  }
  if (method === 'CASH') {
    return 'Cash';
  }
  if (method === 'CARD') {
    return 'Card';
  }
  if (method === 'BANK_TRANSFER') {
    return 'Bank Transfer';
  }
  return 'N/A';
}
