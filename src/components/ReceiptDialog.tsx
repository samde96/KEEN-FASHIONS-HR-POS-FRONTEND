import { useEffect, useState, useSyncExternalStore } from 'react';
import { deviceStore, readDevice } from '../services/deviceStore';
import type { Organization, Sale } from '../data/types';
import {
  formatMoney,
  formatDateTime,
  formatSalePayments,
  formatPaymentMethod,
} from '../services/receiptFormatting';

export default function ReceiptDialog({
  organization,
  onClose,
  sale: sourceSale,
  onSynchronized,
}: {
  organization: Organization;
  onClose: () => void;
  sale: Sale;
  onSynchronized?: (sale: Sale) => void;
}) {
  const [confirmed, setConfirmed] = useState<Sale>();
  const revision = useSyncExternalStore(deviceStore.subscribe, deviceStore.getSnapshot);
  useEffect(() => {
    setConfirmed(undefined);
  }, [sourceSale.id]);
  useEffect(() => {
    if (!sourceSale.deviceOperationId) return;
    let active = true;
    void readDevice()
      .then((data) => {
        const record = data.operations.find((op) => op.id === sourceSale.deviceOperationId);
        if (active && record?.result && record.status === 'applied') {
          const sale = record.result as Sale;
          setConfirmed(sale);
          onSynchronized?.(sale);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [sourceSale.deviceOperationId, revision, onSynchronized]);
  const sale = confirmed ?? sourceSale;
  const itemCount = sale.lines.reduce((sum, line) => sum + line.quantity, 0);
  const cashReceivedTotal = sale.payments.reduce(
    (sum, payment) => sum + (payment.cashReceived ?? 0),
    0,
  );
  const changeDueTotal = sale.payments.reduce((sum, payment) => sum + (payment.changeDue ?? 0), 0);

  useEffect(() => {
    function handleReceiptShortcut(event: KeyboardEvent) {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      window.print();
    }

    window.addEventListener('keydown', handleReceiptShortcut);
    return () => window.removeEventListener('keydown', handleReceiptShortcut);
  }, []);

  return (
    <div className="dialog-backdrop receipt-backdrop" role="presentation">
      <section
        className="receipt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
      >
        <div className="dialog-header receipt-actions">
          <div>
            <p className="eyebrow">Sale complete</p>
            <h2 id="receipt-title">Receipt</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close receipt"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="receipt-print-area">
          {sale.syncStatus === 'pending' && (
            <p className="message-banner">
              Completed on this device · Pending backend synchronization · {sale.deviceOperationId}
            </p>
          )}
          <div className="receipt-business">
            <strong>{organization.name}</strong>
            <span>{sale.branchName}</span>
            {organization.taxRegistrationNumber ? (
              <span>PIN: {organization.taxRegistrationNumber}</span>
            ) : null}
          </div>

          <div className="receipt-meta">
            <div>
              <span className="receipt-meta-label">Receipt</span>
              <span className="receipt-meta-value">{sale.saleNumber}</span>
            </div>
            <div>
              <span className="receipt-meta-label">Date</span>
              <span className="receipt-meta-value">{formatDateTime(sale.soldAt)}</span>
            </div>
          </div>

          <div className="receipt-lines">
            <div className="receipt-line receipt-line-head">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Total</span>
            </div>
            {sale.lines.map((line) => (
              <div className="receipt-line" key={`${sale.id}-${line.productId}`}>
                <span>{line.productName}</span>
                <span>{line.quantity}</span>
                <span>{formatMoney(line.unitPrice, organization.currencyCode)}</span>
                <span>{formatMoney(line.lineTotal, organization.currencyCode)}</span>
              </div>
            ))}
          </div>

          <div className="receipt-total-block">
            <div>
              <span>Total Qty</span>
              <strong>{itemCount}</strong>
            </div>
            <div>
              <span>Subtotal</span>
              <strong>{formatMoney(sale.subtotalAmount, organization.currencyCode)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{formatMoney(sale.discountAmount || 0, organization.currencyCode)}</strong>
            </div>
            <div>
              <span>VAT</span>
              <strong>{formatMoney(sale.taxAmount, organization.currencyCode)}</strong>
            </div>
            <div className="receipt-grand-total">
              <span>Total</span>
              <strong>{formatMoney(sale.totalAmount, organization.currencyCode)}</strong>
            </div>
          </div>

          <div className="receipt-payment">
            <div>
              <span>{sale.payments.length === 1 ? 'Payment' : 'Payments'}</span>
              <strong>{formatSalePayments(sale)}</strong>
            </div>
            {sale.payments.map((payment, index) => (
              <div className="receipt-payment-line" key={payment.id}>
                <span>{sale.payments.length === 1 ? 'Tender' : `Tender ${index + 1}`}</span>
                <strong>
                  {formatPaymentMethod(payment.method)}{' '}
                  {formatMoney(payment.amount, organization.currencyCode)}
                  {payment.reference ? ` (${payment.reference})` : ''}
                </strong>
              </div>
            ))}
            {cashReceivedTotal > 0 ? (
              <div>
                <span>Cash Received</span>
                <strong>{formatMoney(cashReceivedTotal, organization.currencyCode)}</strong>
              </div>
            ) : null}
            {changeDueTotal > 0 ? (
              <div>
                <span>Change</span>
                <strong>{formatMoney(changeDueTotal, organization.currencyCode)}</strong>
              </div>
            ) : null}
          </div>

          <p className="receipt-thanks">Thank you for shopping with us.</p>
        </div>

        <div className="receipt-actions receipt-footer-actions">
          <button className="secondary-action compact-action" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-action compact-action"
            type="button"
            onClick={() => window.print()}
          >
            <i className="bi bi-printer" aria-hidden="true" />
            Print Receipt <kbd>Enter</kbd>
          </button>
        </div>
      </section>
    </div>
  );
}
