import { useState } from 'react';
import type {
  HotelCheckout,
  HotelOrder,
  HotelOrderRequest,
  HotelPaymentMethod,
  HotelServiceType,
} from './types';
import { cancelHotelOrder, sellHotelFood, settleHotelOrder } from './api';
import { money, statusLabel } from './utils';
import { Empty, Field, HotelForm, Modal, Status, useCommandId } from './HotelUI';

type CartLine = {
  itemId: string;
  itemType: 'FOOD' | 'PRODUCT';
  name: string;
  price: number;
  quantity: number;
  max?: number;
};
export default function HotelRegister({
  data,
  branchId,
  currency,
  waiterUserId,
  waiterName,
  canSell,
  saved,
  receipt,
  hasDraft,
  showOrders = false,
}: {
  data: HotelCheckout;
  branchId: string;
  currency: string;
  waiterUserId?: string;
  waiterName?: string;
  canSell: boolean;
  saved: () => Promise<void>;
  receipt: (order: HotelOrder, autoPrint?: boolean) => void;
  hasDraft?: (value: boolean) => void;
  showOrders?: boolean;
}) {
  const [category, setCategory] = useState('All'),
    [search, setSearch] = useState('');
  const [pickerSource, setPickerSource] = useState<'ALL' | 'FOOD' | 'PRODUCT'>('ALL');
  const [itemPicker, setItemPicker] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]),
    [serviceType, setServiceType] = useState<HotelServiceType>('DINE_IN');
  const waiters = data.waiters.filter((waiter) => waiter.active);
  const signedInWaiter =
    (waiterUserId ? waiters.find((waiter) => waiter.userId === waiterUserId) : undefined) ??
    waiters.find(
      (waiter) =>
        waiter.name.trim().toLocaleLowerCase() === waiterName?.trim().toLocaleLowerCase(),
    );
  const [waiterId, setWaiterId] = useState(signedInWaiter?.id ?? '');
  const receiptSettingsReady = !!(
    data.receiptSettings.tillNumber &&
    data.receiptSettings.contactPhone
  );
  const [tableNumber, setTableNumber] = useState(''),
    [tablePicker, setTablePicker] = useState(false),
    [notes, setNotes] = useState(''),
    [customerName, setCustomerName] = useState('');
  const [method, setMethod] = useState<HotelOrder['method']>('UNPAID'),
    [bookingId, setBookingId] = useState(''),
    [paymentReference, setPaymentReference] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [mobileCart, setMobileCart] = useState(false);
  const commandId = useCommandId();
  const categories = ['All', ...Array.from(new Set(data.menuItems.map((i) => i.category)))];
  const menu = data.menuItems.filter(
    (i) =>
      (pickerSource === 'ALL' ||
        pickerSource === 'PRODUCT' ||
        category === 'All' ||
        i.category === category) &&
      i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const products = data.products.filter(
    (i) => i.active && i.sellable && i.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const visibleMenu = pickerSource === 'PRODUCT' ? [] : menu;
  const visibleProducts = pickerSource === 'FOOD' ? [] : products;
  const total = cart.reduce(
    (sum, line) => sum + Math.round(line.price * line.quantity * 100) / 100,
    0,
  );
  const printsChefCopy = cart.some((line) => line.itemType === 'FOOD');
  function openItemPicker(source: 'ALL' | 'FOOD' | 'PRODUCT' = 'ALL') {
    setPickerSource(source);
    setSearch('');
    setItemPicker(true);
  }
  function setLines(lines: CartLine[]) {
    setCart(lines);
    hasDraft?.(lines.length > 0);
  }
  function add(line: Omit<CartLine, 'quantity'>) {
    const previous = cart.find((i) => i.itemId === line.itemId && i.itemType === line.itemType);
    if (previous) quantity(previous, previous.quantity + 1);
    else setLines([...cart, { ...line, quantity: Math.min(1, line.max ?? 1) }]);
  }
  function quantity(line: CartLine, value: number) {
    if (!Number.isFinite(value)) return;
    const valid = Math.min(value, line.max ?? 99999999);
    setLines(
      cart.map((i) => (i === line ? { ...i, quantity: valid } : i)).filter((i) => i.quantity > 0),
    );
  }
  async function sendOrder() {
    if (busy || !cart.length || !waiters.some((w) => w.id === waiterId)) return;
    setBusy(true);
    setError('');
    const body: Omit<HotelOrderRequest, 'requestId'> = {
      branchId,
      waiterId,
      customerName,
      serviceType,
      tableNumber: serviceType === 'DINE_IN' ? tableNumber : '',
      notes,
      method,
      paymentReference,
      ...(method === 'ROOM' ? { bookingId } : {}),
      lines: cart.map((line) => ({
        itemId: line.itemId,
        itemType: line.itemType,
        quantity: line.quantity,
      })),
    };
    try {
      const order = await sellHotelFood({ ...body, requestId: commandId(body) });
      setLines([]);
      setNotes('');
      setCustomerName('');
      setPaymentReference('');
      setBookingId('');
      setTableNumber('');
      setWaiterId('');
      setMobileCart(false);
      await saved();
      receipt(order, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send this order.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div hidden={showOrders} className="hotel-register">
        <aside className="hotel-pos-categories" aria-label="Menu categories">
          <button
            type="button"
            className={pickerSource === 'FOOD' ? 'active' : ''}
            onClick={() => {
              setCategory('All');
              openItemPicker('FOOD');
            }}
          >
            <i className="bi bi-egg-fried" aria-hidden="true" />
            Food menu
          </button>
          <button
            type="button"
            className={pickerSource === 'PRODUCT' ? 'active' : ''}
            onClick={() => openItemPicker('PRODUCT')}
          >
            <i className="bi bi-cup-straw" aria-hidden="true" />
            Products
          </button>
          {categories.map((name, index) => (
            <button
              type="button"
              className={`hotel-category ${pickerSource === 'FOOD' && category === name ? 'selected' : ''}`}
              key={name}
              onClick={() => {
                setCategory(name);
                openItemPicker('FOOD');
              }}
            >
              <span className="hotel-category-icon">
                {index === 0 ? (
                  <i className="bi bi-grid" aria-hidden="true" />
                ) : (
                  name.slice(0, 1).toUpperCase()
                )}
              </span>
              {name}
            </button>
          ))}
        </aside>
        <section className="hotel-pos-menu">
          <div
            className="hotel-pos-search-area"
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof Node) || !event.currentTarget.contains(next))
                setItemPicker(false);
            }}
          >
            <div className="hotel-pos-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                aria-label="Search food or products"
                placeholder="Search food or products…"
                value={search}
                onFocus={() => setItemPicker(true)}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setItemPicker(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setItemPicker(false);
                }}
              />
            </div>
            {itemPicker && (
              <div className="hotel-inline-item-results" role="list" aria-label="Item results">
                {visibleMenu.map((dish) => {
                  const quantityInCart =
                    cart.find((line) => line.itemType === 'FOOD' && line.itemId === dish.id)
                      ?.quantity ?? 0;
                  return (
                    <div className="hotel-product-result" role="listitem" key={`FOOD-${dish.id}`}>
                      <div>
                        <strong>{dish.name}</strong>
                        <small>
                          Food · {dish.category}
                          {quantityInCart > 0 ? ` · ${quantityInCart} in order` : ''}
                          {!dish.available ? ' · Unavailable today' : ''}
                        </small>
                      </div>
                      <strong>{money(dish.price, currency)}</strong>
                      <button
                        type="button"
                        aria-label={
                          dish.available ? `Add ${dish.name}` : `${dish.name} unavailable`
                        }
                        disabled={!canSell || busy || !dish.available}
                        onClick={() =>
                          add({
                            itemId: dish.id,
                            itemType: 'FOOD',
                            name: dish.name,
                            price: dish.price,
                          })
                        }
                      >
                        {dish.available ? 'Add' : 'Unavailable'}
                      </button>
                    </div>
                  );
                })}
                {visibleProducts.map((item) => {
                  const quantityInCart =
                    cart.find((line) => line.itemType === 'PRODUCT' && line.itemId === item.id)
                      ?.quantity ?? 0;
                  const outOfStock = item.stock <= 0;
                  const maxedOut = quantityInCart >= item.stock;
                  return (
                    <div
                      className="hotel-product-result"
                      role="listitem"
                      key={`PRODUCT-${item.id}`}
                    >
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          Product · {item.stock - quantityInCart} {item.unit} available
                          {quantityInCart > 0 ? ` · ${quantityInCart} in order` : ''}
                        </small>
                      </div>
                      <strong>{money(item.price, currency)}</strong>
                      <button
                        type="button"
                        aria-label={
                          outOfStock
                            ? `${item.name} out of stock`
                            : maxedOut
                              ? `${item.name} stock limit`
                              : `Add ${item.name}`
                        }
                        disabled={!canSell || busy || outOfStock || maxedOut}
                        onClick={() =>
                          add({
                            itemId: item.id,
                            itemType: 'PRODUCT',
                            name: item.name,
                            price: item.price,
                            max: item.stock,
                          })
                        }
                      >
                        {outOfStock ? 'Out of stock' : maxedOut ? 'Stock limit' : 'Add'}
                      </button>
                    </div>
                  );
                })}
                {!visibleMenu.length && !visibleProducts.length && (
                  <Empty>
                    {pickerSource === 'PRODUCT' &&
                    !data.products.some((item) => item.active && item.sellable)
                      ? 'No products here yet. Add sellable products and receive their stock in Hotel Inventory.'
                      : 'No food or products match your search.'}
                  </Empty>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="hotel-mobile-cart-button"
            onClick={() => setMobileCart(true)}
          >
            View order · {cart.reduce((sum, i) => sum + i.quantity, 0)} items{' '}
            <strong>{money(total, currency)}</strong>
          </button>
        </section>
        {canSell && (
          <section
            className={`hotel-pos-cart${mobileCart ? ' hotel-pos-cart-open' : ''}`}
            aria-label="Current order"
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendOrder();
              }}
            >
              <fieldset disabled={busy}>
                <div className="hotel-pos-cart-header">
                  <div>
                    <h2>Current order</h2>
                    <p>Select the waiter serving this order.</p>
                    {!receiptSettingsReady && (
                      <p className="hotel-checkout-receipt-warning" role="status">
                        Ask an administrator to add the hotel's Till number and contact phone for
                        receipts.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="hotel-mobile-cart-close"
                    onClick={() => setMobileCart(false)}
                    aria-label="Back to menu"
                  >
                    ×
                  </button>
                </div>
                <Field label="Served by">
                  <select required value={waiterId} onChange={(e) => setWaiterId(e.target.value)}>
                    <option value="">Choose waiter name</option>
                    {waiters.map((waiter) => (
                      <option key={waiter.id} value={waiter.id}>
                        {waiter.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {error && (
                  <p className="hotel-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="hotel-service-types" aria-label="Order type">
                  {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      className={serviceType === type ? 'active' : ''}
                      onClick={() => setServiceType(type)}
                    >
                      {statusLabel(type)}
                    </button>
                  ))}
                </div>
                {serviceType === 'DINE_IN' && (
                  <div className="hotel-table-picker">
                    <button type="button" onClick={() => setTablePicker(true)}>
                      <i className="bi bi-grid-3x3" aria-hidden="true" />
                      {tableNumber ? `Table ${tableNumber}` : 'Choose table (optional)'}
                      <span aria-hidden="true">⌄</span>
                    </button>
                    <input
                      aria-label="Table number (optional)"
                      maxLength={30}
                      placeholder="Table no. (optional)"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                )}
                <div className="hotel-pos-cart-lines">
                  {!cart.length ? (
                    <div className="hotel-cart-empty">
                      <i className="bi bi-basket3" aria-hidden="true" />
                      <strong>Your order starts here</strong>
                      <p>Tap a meal or product to add it.</p>
                    </div>
                  ) : (
                    cart.map((line) => (
                      <div
                        className="hotel-touch-cart-line"
                        key={`${line.itemType}-${line.itemId}`}
                      >
                        <div>
                          <strong>{line.name}</strong>
                          <small>
                            {money(line.price, currency)} ·{' '}
                            {line.itemType === 'FOOD' ? 'Food' : 'Product'}
                          </small>
                        </div>
                        <strong>
                          {money(Math.round(line.price * line.quantity * 100) / 100, currency)}
                        </strong>
                        <div className="hotel-quantity-control">
                          <button
                            type="button"
                            aria-label={`Decrease ${line.name}`}
                            onClick={() => quantity(line, line.quantity - 1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            aria-label={`Quantity for ${line.name}`}
                            required
                            min="0.001"
                            max={line.max ?? 99999999}
                            step="0.001"
                            value={line.quantity}
                            onChange={(e) => quantity(line, Number(e.target.value))}
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${line.name}`}
                            disabled={line.max !== undefined && line.quantity >= line.max}
                            onClick={() => quantity(line, line.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="hotel-remove-line"
                          aria-label={`Remove ${line.name}`}
                          onClick={() => quantity(line, 0)}
                        >
                          <i className="bi bi-trash3" aria-hidden="true" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="hotel-pos-cart-details">
                  <Field label="Customer (optional)">
                    <input
                      maxLength={160}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </Field>
                  <Field label="Kitchen / delivery notes">
                    <textarea
                      maxLength={1000}
                      placeholder="No chilli, extra sauce, delivery details…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Field>
                  <Field label="Payment / room charge">
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as typeof method)}
                    >
                      <option value="UNPAID">Pay after service</option>
                      <option value="CASH">Cash · paid</option>
                      <option value="MPESA">M-Pesa · paid</option>
                      <option value="CARD">Card · paid</option>
                      <option value="BANK">Bank · paid</option>
                      <option value="ROOM">Charge to room</option>
                    </select>
                  </Field>
                  {method === 'ROOM' && (
                    <Field label="Checked-in guest">
                      <select
                        required
                        value={bookingId}
                        onChange={(e) => setBookingId(e.target.value)}
                      >
                        <option value="">Choose guest</option>
                        {data.guests.map((guest) => (
                          <option value={guest.id} key={guest.id}>
                            Room {guest.roomNumber} · {guest.guestName}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {!['UNPAID', 'CASH', 'ROOM'].includes(method) && (
                    <Field label="Payment transaction reference">
                      <input
                        required
                        maxLength={100}
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </Field>
                  )}
                </div>
                <div className="hotel-pos-cart-footer">
                  <div>
                    <span>Total</span>
                    <strong>{money(total, currency)}</strong>
                  </div>
                  <button
                    type="submit"
                    className="hotel-primary"
                    disabled={
                      !cart.length ||
                      total <= 0 ||
                      !waiters.some((w) => w.id === waiterId)
                    }
                  >
                    {busy ? 'Saving…' : 'Create Order'}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </fieldset>
            </form>
          </section>
        )}
      </div>
      {showOrders && (
        <HotelOrders
          data={data}
          canSell={canSell}
          currency={currency}
          saved={saved}
          receipt={receipt}
        />
      )}
      {tablePicker && (
        <Modal title="Choose a table" onClose={() => setTablePicker(false)}>
          <div className="hotel-table-grid">
            {Array.from({ length: 20 }, (_, i) => String(i + 1)).map((number) => (
              <button
                type="button"
                key={number}
                className={tableNumber === number ? 'hotel-primary' : ''}
                onClick={() => {
                  setTableNumber(number);
                  setTablePicker(false);
                }}
              >
                Table {number}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function HotelOrders({
  data,
  canSell,
  currency,
  saved,
  receipt,
}: {
  data: HotelCheckout;
  canSell: boolean;
  currency: string;
  saved: () => Promise<void>;
  receipt: (order: HotelOrder, autoPrint?: boolean) => void;
}) {
  const [payment, setPayment] = useState<HotelOrder>(),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [filter, setFilter] = useState('ALL');
  const orders = data.orders.filter(
    (o) =>
      filter === 'ALL' ||
      (filter === 'UNPAID'
        ? o.method === 'UNPAID' && o.status !== 'CANCELLED'
        : o.status === 'OPEN'),
  );
  async function cancel(order: HotelOrder) {
    if (busy) return;
    setBusy(order.id);
    setError('');
    try {
      await cancelHotelOrder(order.id);
      await saved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the order.');
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="hotel-pos-orders">
      <div className="hotel-toolbar">
        <h1>Orders & tables</h1>
        <select
          aria-label="Order filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ACTIVE">Open orders</option>
          <option value="UNPAID">Awaiting payment</option>
          <option value="ALL">All recent orders</option>
        </select>
      </div>
      {error && (
        <p className="hotel-error" role="alert">
          {error}
        </p>
      )}
      {!orders.length ? (
        <Empty>No orders in this view.</Empty>
      ) : (
        <div className="hotel-order-grid">
          {orders.map((order) => (
            <article className="hotel-order-card" key={order.id}>
              <div className="hotel-toolbar">
                <h2>
                  {order.serviceType === 'DINE_IN'
                    ? `Table ${order.tableNumber}`
                    : statusLabel(order.serviceType)}
                </h2>
                <Status value={order.status} />
              </div>
              <small className="hotel-reference">{order.reference}</small>
              <p>
                Served by <strong>{order.servedByName}</strong>
              </p>
              <p>{order.lines.map((l) => `${l.quantity} × ${l.itemName}`).join(', ')}</p>
              <div className="hotel-toolbar">
                <strong>{money(order.total, currency)}</strong>
                <Status value={order.method} />
              </div>
              {order.notes && <p className="hotel-note">{order.notes}</p>}
              <div className="hotel-actions">
                <button type="button" onClick={() => receipt(order)}>
                  Receipts · 2 copies
                </button>
                {canSell && order.method === 'UNPAID' && order.status !== 'CANCELLED' && (
                  <button type="button" className="hotel-primary" onClick={() => setPayment(order)}>
                    Take payment
                  </button>
                )}
                {canSell && order.method === 'UNPAID' && order.status === 'OPEN' && (
                  <button type="button" disabled={!!busy} onClick={() => void cancel(order)}>
                    Cancel order
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {payment && (
        <OrderPayment
          order={payment}
          data={data}
          saved={saved}
          close={() => setPayment(undefined)}
          receipt={receipt}
        />
      )}
    </section>
  );
}
function OrderPayment({
  order,
  data,
  saved,
  close,
  receipt,
}: {
  order: HotelOrder;
  data: HotelCheckout;
  saved: () => Promise<void>;
  close: () => void;
  receipt: (order: HotelOrder) => void;
}) {
  const [method, setMethod] = useState<HotelPaymentMethod | 'ROOM'>('CASH'),
    [reference, setReference] = useState(''),
    [bookingId, setBookingId] = useState('');
  const commandId = useCommandId();
  return (
    <Modal
      title={`Take payment · ${order.tableNumber ? `Table ${order.tableNumber}` : order.customerName}`}
      onClose={close}
    >
      <HotelForm
        label="Confirm payment"
        save={async () => {
          const body = { method, reference, ...(method === 'ROOM' ? { bookingId } : {}) };
          const updated = await settleHotelOrder(order.id, { ...body, requestId: commandId(body) });
          await saved();
          close();
          receipt(updated);
        }}
      >
        <Field label="Payment method">
          <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
            <option value="ROOM">Charge to room</option>
          </select>
        </Field>
        {method === 'ROOM' ? (
          <Field label="Checked-in guest">
            <select required value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
              <option value="">Choose guest</option>
              {data.guests.map((g) => (
                <option key={g.id} value={g.id}>
                  Room {g.roomNumber} · {g.guestName}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Transaction reference">
            <input
              required={method !== 'CASH'}
              maxLength={100}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        )}
        <p className="hotel-hint">Confirm after receiving the payment.</p>
      </HotelForm>
    </Modal>
  );
}
