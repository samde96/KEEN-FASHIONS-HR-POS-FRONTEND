import { useEffect, useRef } from 'react';
import type { Organization } from '../data/types';
import type { HotelOrder } from './types';
import { money, statusLabel } from './utils';
import { Modal } from './HotelUI';

export default function HotelOrderReceipt({
  order,
  organization,
  branchName,
  close,
  autoPrint = false,
}: {
  order: HotelOrder;
  organization: Organization;
  branchName: string;
  close: () => void;
  autoPrint?: boolean;
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (!autoPrint || printed.current) return;
    const timer = window.setTimeout(() => {
      printed.current = true;
      window.print();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoPrint, order.id]);
  const hasFood = order.lines.some((line) => line.itemType === 'FOOD');
  const receiptTitle = order.hotelName.trim() || branchName.trim() || organization.name;
  const customerName = order.customerName.trim();
  const waiterFirstName = order.servedByName.trim().split(/\s+/)[0] ?? '';
  const showCustomerName = customerName !== '' && !/^walk[- ]in customer$/i.test(customerName);
  const copies = hasFood
    ? [
        { name: 'Kitchen copy', kitchen: true },
        { name: 'Customer copy', kitchen: false },
      ]
    : [{ name: 'Customer copy', kitchen: false }];
  return (
    <Modal title="Order receipts" onClose={close}>
      <p className="hotel-hint hotel-receipt-screen-note">
        {hasFood
          ? 'Print the kitchen ticket for food preparation and give the sales receipt to the guest.'
          : 'One customer receipt for stocked products.'}
      </p>
      <div
        className={`hotel-receipt-print ${hasFood ? 'hotel-double-receipts' : 'hotel-single-receipt'}`}
      >
        {copies.map((copy) => {
          const lines = copy.kitchen
            ? order.lines.filter((line) => line.itemType === 'FOOD')
            : order.lines;
          const date = new Date(order.createdAt);
          const dateLabel = date.toLocaleDateString('en-GB', {
            timeZone: organization.timeZone,
          });
          const timeLabel = date.toLocaleTimeString('en-GB', {
            timeZone: organization.timeZone,
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <article
              className={`hotel-receipt-copy ${copy.kitchen ? 'hotel-kitchen-ticket' : 'hotel-customer-receipt'}`}
              aria-label={copy.name}
              key={copy.name}
            >
              {copy.kitchen ? (
                <>
                  <header className="hotel-ticket-brand">
                    <h2>{receiptTitle}</h2>
                    <p>KITCHEN ORDER</p>
                  </header>
                  <div className="hotel-ticket-meta">
                    <div className="hotel-ticket-order-number">
                      <span>ORDER #:</span>
                      <strong>{order.receiptNumber}</strong>
                    </div>
                    <div>
                      <strong>
                        {order.serviceType === 'DINE_IN' && order.tableNumber
                          ? `TABLE: ${order.tableNumber}`
                          : statusLabel(order.serviceType).toUpperCase()}
                      </strong>
                      <strong>TIME: {timeLabel}</strong>
                    </div>
                  </div>
                  <ul className="hotel-ticket-items">
                    {lines.map((line) => (
                      <li key={`${line.itemType}-${line.itemId}`}>
                        <strong>{line.quantity} ×</strong> <span>{line.itemName}</span>
                      </li>
                    ))}
                  </ul>
                  {order.notes && <p className="hotel-kitchen-note">Notes: {order.notes}</p>}
                </>
              ) : (
                <>
                  <header className="hotel-receipt-brand">
                    <h2>{receiptTitle}</h2>
                    {order.contactPhone && <p>Tel: {order.contactPhone}</p>}
                    <h3>FOOD SALE RECEIPT</h3>
                  </header>
                  <div className="hotel-sale-meta">
                    <span>
                      Receipt No: <strong>{order.receiptNumber}</strong>
                    </span>
                    <span>Date: {dateLabel}</span>
                    {showCustomerName && <span>Customer: {customerName}</span>}
                    <span>Served by: {waiterFirstName}</span>
                    {order.roomNumber && <span>Room: {order.roomNumber}</span>}
                    <span>Time: {timeLabel}</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th className="hotel-numeric">Qty</th>
                        <th className="hotel-numeric">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <tr key={`${line.itemType}-${line.itemId}`}>
                          <td>{index + 1}</td>
                          <td className="hotel-receipt-item-name">{line.itemName}</td>
                          <td className="hotel-numeric">{line.quantity}</td>
                          <td className="hotel-numeric">
                            {line.unitPrice.toLocaleString('en-KE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <dl className="hotel-totals hotel-receipt-totals">
                    <div className="hotel-total">
                      <dt>TOTAL</dt>
                      <dd>{money(order.total, organization.currencyCode)}</dd>
                    </div>
                  </dl>
                  {order.paymentNumber && (
                    <div className="hotel-receipt-payment-details">
                      <strong>
                        {order.paymentType === 'PAYBILL'
                          ? `PAYBILL: ${order.paymentNumber}`
                          : `TILL NUMBER: ${order.paymentNumber}`}
                      </strong>
                      {order.paymentType === 'PAYBILL' && order.accountNumber && (
                        <strong>ACC: {order.accountNumber}</strong>
                      )}
                    </div>
                  )}
                  <div className="hotel-sale-payment">
                    {order.method !== 'UNPAID' && (
                      <span>
                        Payment Method:{' '}
                        {order.method === 'ROOM' ? 'Room charge' : statusLabel(order.method)}
                      </span>
                    )}
                    {order.paymentReference && <span>Reference: {order.paymentReference}</span>}
                  </div>
                  {order.notes && <p className="hotel-sale-notes">Notes: {order.notes}</p>}
                  <footer className="hotel-sale-thanks">
                    <strong>Thank you for dining with us!</strong>
                  </footer>
                  {(order.paymentNumber || order.complaintsPhone) && (
                    <footer className="hotel-receipt-details-footer">
                      <span>THIS IS NOT A FISCAL RECEIPT</span>
                      {order.complaintsPhone && (
                        <>
                          <span>FOR COMPLAINTS AND FEEDBACK CALL:</span>
                          <span>{order.complaintsPhone}</span>
                        </>
                      )}
                    </footer>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
      <div className="hotel-form-actions">
        <button type="button" className="hotel-primary" onClick={() => window.print()}>
          {hasFood ? 'Print both copies' : 'Print receipt'}
        </button>
        <button type="button" onClick={close}>
          Close
        </button>
      </div>
    </Modal>
  );
}
