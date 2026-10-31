import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SaleRequest } from '../data/types';
import {
  getMpesaPaymentByKey,
  readMpesaRecovery,
  saveMpesaRecovery,
  startMpesaPayment,
  type MpesaPayment,
} from '../services/mpesa';
import '../styles/mpesa.css';

export default function MpesaPaymentPanel({
  checkoutKey,
  storageKey,
  sale,
  onLock,
  onVerified,
  onRetry,
}: {
  checkoutKey: string;
  storageKey: string;
  sale: SaleRequest | null;
  onLock: () => void;
  onVerified: (receipt: string) => void;
  onRetry: () => void;
}) {
  const client = useQueryClient();
  const [phone, setPhone] = useState('');
  const [started, setStarted] = useState(() => readMpesaRecovery(storageKey)?.key === checkoutKey);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const queryKey = ['mpesa-payment', storageKey, checkoutKey];
  const payment = useQuery({
    queryKey,
    queryFn: () => getMpesaPaymentByKey(checkoutKey),
    enabled: started,
    retry: false,
    refetchInterval: (query) => {
      const tx = query.state.data as MpesaPayment | undefined;
      return tx && ['SUCCEEDED', 'FAILED', 'REVIEW'].includes(tx.status) ? false : 1500;
    },
    refetchIntervalInBackground: false,
  });
  const tx = payment.data;
  const submit = useMutation({
    mutationFn: async () => {
      if (!sale) throw new Error('Complete the payment amounts before sending the prompt.');
      if (!/^(?:0|254|\+254)[17]\d{8}$/.test(phone.trim()))
        throw new Error('Enter a Kenyan mobile number such as 0712345678.');
      saveMpesaRecovery(storageKey, { key: checkoutKey, sale });
      setStarted(true);
      onLock();
      return startMpesaPayment(checkoutKey, phone.trim(), sale);
    },
    onSuccess: (result) => {
      client.setQueryData(queryKey, result);
      if (sale) saveMpesaRecovery(storageKey, { key: checkoutKey, sale, transactionId: result.id });
    },
    onError: (caught) =>
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to send payment request. Check the existing payment before retrying.',
      ),
    onSettled: () => {
      sending.current = false;
    },
  });
  const verified = useRef(onVerified);
  verified.current = onVerified;
  useEffect(() => {
    if (tx?.status === 'SUCCEEDED' && tx.receiptNumber) verified.current(tx.receiptNumber);
  }, [tx?.status, tx?.receiptNumber]);

  return (
    <section className="mpesa-payment-panel" aria-label="M-Pesa STK Push">
      <div className="mpesa-payment-heading">
        <i className="bi bi-phone" aria-hidden="true" />
        <strong>M-Pesa STK Push</strong>
      </div>
      {!tx && (
        <label className="payment-input-field">
          <span>Customer M-Pesa phone number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={16}
            placeholder="0712345678"
            value={phone}
            disabled={submit.isPending}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
      )}
      {tx ? (
        <div
          role="status"
          aria-live="polite"
          className={`mpesa-payment-status status-${tx.status.toLowerCase()}`}
        >
          <strong>
            {tx.status === 'SUCCEEDED'
              ? 'Payment confirmed'
              : tx.status === 'FAILED'
                ? 'Payment not completed'
                : 'Payment in progress'}
          </strong>
          <span>{tx.message}</span>
          <small>
            {tx.phoneMask} · KES {tx.amount.toLocaleString('en-KE')}
          </small>
          {tx.receiptNumber && <strong>Receipt: {tx.receiptNumber}</strong>}
          {['UNKNOWN', 'REVIEW', 'PAID_UNCONFIRMED'].includes(tx.status) && (
            <span>
              Keep this checkout open. Do not request a second payment while this one is being
              checked.
            </span>
          )}
        </div>
      ) : (
        started && (
          <p role="status">
            Checking the saved payment request. This checkout keeps the same payment key.
          </p>
        )
      )}
      {error && (
        <p className="message-banner error" role="alert">
          {error}
        </p>
      )}
      {!tx && (
        <button
          className="primary-action compact-action"
          type="button"
          disabled={submit.isPending || !sale || !phone.trim()}
          onClick={() => {
            if (sending.current) return;
            sending.current = true;
            setError('');
            submit.mutate();
          }}
        >
          {submit.isPending
            ? 'Sending request…'
            : started
              ? 'Retry same payment request'
              : 'Send STK Push'}
        </button>
      )}
      {tx?.status === 'FAILED' && (
        <button className="secondary-action compact-action" type="button" onClick={onRetry}>
          Start a new payment
        </button>
      )}
      {payment.isError && started && (
        <p>
          We could not refresh the payment status. Check your connection; payment progress is saved.
        </p>
      )}
      <small>
        Ask the customer to enter their M-Pesa PIN on their phone. This app never asks for the PIN.
      </small>
    </section>
  );
}
