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
  const receiptTitle = branchName.trim() || order.hotelName.trim() || organization.name;
  const customerName = order.customerName.trim();
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
                    <strong>ORDER #: {order.reference}</strong>
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
                    <p>{branchName}</p>
                    {order.contactPhone && <p>Tel: {order.contactPhone}</p>}
                    <h3>FOOD SALE RECEIPT</h3>
                  </header>
                  <div className="hotel-sale-meta">
                    <span>
                      Receipt No: <strong>{order.reference}</strong>
                    </span>
                    <span>Date: {dateLabel}</span>
                    {showCustomerName && <span>Customer: {customerName}</span>}
                    <span>Cashier: {order.servedByName}</span>
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
                        <th className="hotel-numeric">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => (
                        <tr key={`${line.itemType}-${line.itemId}`}>
                          <td>{index + 1}</td>
                          <td>{line.itemName}</td>
                          <td className="hotel-numeric">{line.quantity}</td>
                          <td className="hotel-numeric">
                            {money(line.unitPrice, organization.currencyCode)}
                          </td>
                          <td className="hotel-numeric">
                            {money(line.total, organization.currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <dl className="hotel-totals hotel-receipt-totals">
                    <div>
                      <dt>Subtotal</dt>
                      <dd>{money(order.total, organization.currencyCode)}</dd>
                    </div>
                    <div className="hotel-total">
                      <dt>TOTAL</dt>
                      <dd>{money(order.total, organization.currencyCode)}</dd>
                    </div>
                  </dl>
                  <div className="hotel-sale-payment">
                    <span>
                      Payment Method:{' '}
                      {order.method === 'ROOM'
                        ? 'Room charge'
                        : order.method === 'UNPAID'
                          ? 'Unpaid'
                          : statusLabel(order.method)}
                    </span>
                    {order.tillNumber && <span>M-Pesa Till: {order.tillNumber}</span>}
                    {order.paymentReference && <span>Reference: {order.paymentReference}</span>}
                  </div>
                  {order.notes && <p className="hotel-sale-notes">Notes: {order.notes}</p>}
                  <footer className="hotel-sale-thanks">
                    <strong>Thank you for dining with us!</strong>
                    <span>We look forward to serving you again.</span>
                  </footer>
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
