import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { CurrentUser, Organization } from '../data/types';
import { usePlatform } from '../platform/PlatformContext';
import { canAccessPath } from '../platform/appRegistry';
import { getHotelWorkspace } from './api';
import type { HotelBooking, HotelItem, HotelOrder, HotelRoom, HotelWorkspace } from './types';
import { addDays, businessDate, displayDate, money, roomIsBookable } from './utils';
import { Empty, Metric, Status } from './HotelUI';
import { BookingEditor, ItemEditor, RoomEditor, StockEditor } from './HotelForms';
import { GuestBill, HotelReceipt } from './HotelGuestBill';
import HotelCalendar from './HotelCalendar';
import HotelMenu from './HotelMenu';
import HotelExcelImport from './HotelExcelImport';
import HotelServiceSettings from './HotelServiceSettings';
import HotelReports from './HotelReports';
import HotelExpenses from './HotelExpenses';
import HotelAssets from './HotelAssets';
import './hotel.css';

const pages = [
  ['', 'Hotel dashboard', 'bi-buildings'],
  ['rooms', 'Rooms & rates', 'bi-door-open'],
  ['reservations', 'Reservations & guests', 'bi-person-check'],
  ['calendar', 'Booking calendar', 'bi-calendar3'],
  ['restaurant', 'Hotel checkout', 'bi-egg-fried'],
  ['service-settings', 'Waiters & receipts', 'bi-receipt'],
  ['menu', 'Food menu', 'bi-journal-richtext'],
  ['inventory', 'Hotel inventory', 'bi-box-seam'],
  ['expenses', 'Expenses', 'bi-wallet2'],
  ['assets', 'Asset register', 'bi-pc-display'],
  ['reports', 'Hotel reports', 'bi-bar-chart'],
] as const;
type Editor =
  | { type: 'room'; room?: HotelRoom }
  | { type: 'booking'; booking?: HotelBooking; room?: HotelRoom; date?: string }
  | { type: 'item'; item?: HotelItem }
  | { type: 'stock'; item: HotelItem; kind: 'RECEIPT' | 'USAGE' }
  | { type: 'bill'; id: string }
  | { type: 'receipt'; order?: HotelOrder; booking?: HotelBooking; orders?: HotelOrder[] };

export default function HotelPage({
  user,
  organization,
}: {
  user: CurrentUser;
  organization: Organization;
}) {
  const { branchId, branches, selectedBranch, changeBranch } = usePlatform();
  const location = useLocation();
  const view = location.pathname.split('/')[2] ?? '';
  return (
    <div className="hotel-app">
      {!branchId ? (
        <section className="hotel-panel hotel-location">
          <i className="bi bi-buildings" aria-hidden="true" />
          <h1>Hotel Management</h1>
          <p>Choose the hotel location you want to manage.</p>
          {branches.length ? (
            <label className="hotel-field">
              <span>Hotel location</span>
              <select value="" onChange={(e) => void changeBranch(e.target.value)}>
                <option value="">Choose a location</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>
              No active locations are available.{' '}
              {user.permissionCodes.includes('admin:manage') && (
                <Link to="/branches">Register a location</Link>
              )}
            </p>
          )}
        </section>
      ) : (
        <HotelBranch
          key={`${branchId}:${view}`}
          branchId={branchId}
          view={view}
          branchName={selectedBranch?.name ?? ''}
          timeZone={selectedBranch?.timeZone ?? organization.timeZone}
          user={user}
          organization={organization}
        />
      )}
    </div>
  );
}

function HotelBranch({
  branchId,
  branchName,
  view,
  timeZone,
  user,
  organization,
}: {
  branchId: string;
  branchName: string;
  view: string;
  timeZone: string;
  user: CurrentUser;
  organization: Organization;
}) {
  const client = useQueryClient(),
    currency = organization.currencyCode;
  const [editor, setEditor] = useState<Editor>();
  const close = useCallback(() => setEditor(undefined), []);
  const refresh = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ['hotel'] });
  }, [client]);
  const query = useQuery({
    queryKey: ['hotel', 'workspace', branchId],
    queryFn: () => getHotelWorkspace(branchId),
    enabled: !['reports', 'service-settings', 'expenses', 'assets'].includes(view),
    refetchInterval: 30_000,
    staleTime: 0,
  });
  const data = query.data;
  const manage =
    user.permissionCodes.some((p) => ['admin:manage', 'hotel:manage'].includes(p)) &&
    !query.isError;
  const canReport = user.permissionCodes.some((p) => ['admin:manage', 'hotel:reports'].includes(p));
  const date = data?.businessDate ?? businessDate(timeZone);
  const reserve = (room?: HotelRoom, date?: string) => setEditor({ type: 'booking', room, date });
  const bill = (booking: HotelBooking) => setEditor({ type: 'bill', id: booking.id });
  const selectedBooking =
    editor?.type === 'bill' ? data?.bookings.find((b) => b.id === editor.id) : undefined;
  return (
    <>
      <header className="hotel-heading">
        <div>
          <p className="hotel-eyebrow">
            <i className="bi bi-buildings" aria-hidden="true" /> Hotel Management · {branchName}
          </p>
          <h1>{pages.find(([id]) => id === view)?.[1] ?? 'Hotel dashboard'}</h1>
          <p>Look after your guests, rooms and restaurant in one place.</p>
        </div>
        <div className="hotel-heading-actions">
          <span>{displayDate(date)}</span>
          {['reservations', 'calendar', 'inventory', 'expenses', 'assets'].includes(view) && (
            <Link className="hotel-back-to-pos" to="/hotel/restaurant">
              <i className="bi bi-arrow-left" aria-hidden="true" />
              Back to POS
            </Link>
          )}
          {manage && data && ['', 'rooms', 'reservations', 'calendar'].includes(view) && (
            <button className="hotel-primary" type="button" onClick={() => reserve()}>
              + New reservation
            </button>
          )}
        </div>
      </header>
      <nav className="hotel-tabs" aria-label="Hotel workspaces">
        {pages
          .filter(
            ([id]) =>
              (id !== 'reports' || canReport) && canAccessPath(user, `/hotel${id ? `/${id}` : ''}`),
          )
          .map(([id, label, icon]) => (
            <NavLink end to={`/hotel${id ? `/${id}` : ''}`} key={id}>
              <i className={`bi ${icon}`} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
      </nav>
      {view === 'service-settings' ? (
        <HotelServiceSettings branchId={branchId} />
      ) : view === 'reports' ? (
        <HotelReports branchId={branchId} currency={currency} date={date} />
      ) : (
        <>
          {query.isPending && !['expenses', 'assets'].includes(view) && (
            <section className="hotel-panel" role="status">
              Loading hotel rooms and guests…
            </section>
          )}
          {query.isError && (
            <p className="hotel-error" role="alert">
              {query.error.message}{' '}
              <button type="button" onClick={() => void query.refetch()}>
                Retry
              </button>
            </p>
          )}
          {data && (
            <>
              {view === '' && (
                <HotelDashboard
                  data={data}
                  currency={currency}
                  canManage={manage}
                  reserve={reserve}
                  bill={bill}
                  addRoom={() => setEditor({ type: 'room' })}
                />
              )}
              {view === 'rooms' && (
                <HotelRooms
                  data={data}
                  currency={currency}
                  canManage={manage}
                  reserve={reserve}
                  bill={bill}
                  edit={(room) => setEditor({ type: 'room', room })}
                />
              )}
              {view === 'reservations' && (
                <ReservationList data={data} currency={currency} bill={bill} />
              )}
              {view === 'calendar' && (
                <HotelCalendar
                  data={data}
                  canManage={manage}
                  timeZone={timeZone}
                  reserve={reserve}
                  bill={bill}
                />
              )}
              {view === 'menu' && (
                <HotelMenu
                  items={data.menuItems}
                  ingredients={data.items.filter(
                    (item) => item.category === 'INGREDIENT' && item.active,
                  )}
                  branchId={branchId}
                  currency={currency}
                  canManage={manage}
                  saved={refresh}
                />
              )}
              {view === 'inventory' && (
                <HotelInventory
                  data={data}
                  branchId={branchId}
                  currency={currency}
                  canManage={manage}
                  saved={refresh}
                  edit={(item) => setEditor({ type: 'item', item })}
                  stock={(item, kind) => setEditor({ type: 'stock', item, kind })}
                />
              )}
            </>
          )}
          {view === 'expenses' && (
            <HotelExpenses
              branchId={branchId}
              date={date}
              currency={currency}
              canManage={manage}
              saved={refresh}
            />
          )}
          {view === 'assets' && (
            <HotelAssets
              branchId={branchId}
              date={date}
              currency={currency}
              canManage={manage}
              saved={refresh}
            />
          )}
        </>
      )}
      {editor?.type === 'room' && (
        <RoomEditor branchId={branchId} room={editor.room} saved={refresh} close={close} />
      )}
      {editor?.type === 'booking' && data && (
        <BookingEditor
          branchId={branchId}
          booking={editor.booking}
          initialRoom={editor.room}
          initialDate={editor.date}
          data={data}
          currency={currency}
          saved={refresh}
          close={close}
        />
      )}
      {editor?.type === 'item' && (
        <ItemEditor branchId={branchId} item={editor.item} saved={refresh} close={close} />
      )}
      {editor?.type === 'stock' && (
        <StockEditor item={editor.item} kind={editor.kind} saved={refresh} close={close} />
      )}
      {selectedBooking && (
        <GuestBill
          booking={selectedBooking}
          canManage={manage}
          currency={currency}
          date={date}
          saved={refresh}
          close={close}
          edit={() => setEditor({ type: 'booking', booking: selectedBooking })}
          receipt={(booking, orders) => setEditor({ type: 'receipt', booking, orders })}
        />
      )}
      {editor?.type === 'receipt' && (
        <HotelReceipt
          organization={organization}
          branchName={branchName}
          order={editor.order}
          booking={editor.booking}
          orders={editor.orders}
          close={close}
        />
      )}
    </>
  );
}

function HotelDashboard({
  data,
  currency,
  canManage,
  reserve,
  bill,
  addRoom,
}: {
  data: HotelWorkspace;
  currency: string;
  canManage: boolean;
  reserve: () => void;
  bill: (booking: HotelBooking) => void;
  addRoom: () => void;
}) {
  const occupied = data.bookings.filter((b) => b.status === 'CHECKED_IN');
  const arrivals = data.bookings.filter(
    (b) => b.status === 'RESERVED' && b.arrival === data.businessDate,
  );
  const departures = occupied.filter((b) => b.departure <= data.businessDate);
  const ready = data.rooms.filter(
    (r) =>
      r.status === 'READY' &&
      !occupied.some((b) => b.roomId === r.id) &&
      roomIsBookable(r, data.bookings, data.businessDate, addDays(data.businessDate, 1), 1),
  );
  const low = data.items.filter((i) => i.active && i.stock <= i.reorderLevel);
  return (
    <>
      <div className="hotel-metrics">
        <Metric
          label="Guests in house"
          value={occupied.reduce((sum, b) => sum + b.guests, 0)}
          detail={`${occupied.length} of ${data.rooms.length} rooms occupied`}
        />
        <Metric
          label="Ready & free tonight"
          value={ready.length}
          detail="Clean rooms without a reservation tonight"
        />
        <Metric
          label="Arrivals today"
          value={arrivals.length}
          detail="Reservations awaiting check-in"
        />
        <Metric
          label="Check-outs due"
          value={departures.length}
          detail="Includes overdue departures"
        />
      </div>
      {!data.rooms.length && (
        <section className="hotel-panel hotel-welcome">
          <h2>Welcome to your hotel workspace</h2>
          <p>
            Start by adding your rooms and their nightly rates. Then take a reservation or check in
            your first walk-in guest.
          </p>
          {canManage && (
            <button type="button" className="hotel-primary" onClick={addRoom}>
              Add your first room
            </button>
          )}
        </section>
      )}
      <div className="hotel-dashboard-grid">
        <section className="hotel-panel">
          <div className="hotel-toolbar">
            <h2>Today's arrivals</h2>
            {canManage && (
              <button type="button" onClick={reserve}>
                New reservation
              </button>
            )}
          </div>
          <GuestRows bookings={arrivals} bill={bill} empty="No arrivals expected today." />
        </section>
        <section className="hotel-panel">
          <h2>Departures & overdue stays</h2>
          <GuestRows bookings={departures} bill={bill} empty="No guests are due to leave today." />
        </section>
      </div>
      <section className="hotel-panel">
        <div className="hotel-toolbar">
          <h2>In-house guests</h2>
          <Link to="/hotel/calendar">Open booking calendar →</Link>
        </div>
        <GuestRows bookings={occupied} bill={bill} empty="No guests are currently checked in." />
      </section>
      <div className="hotel-metrics">
        <Metric
          label="Rooms needing cleaning"
          value={data.rooms.filter((r) => r.status === 'CLEANING').length}
        />
        <Metric
          label="Rooms in maintenance"
          value={data.rooms.filter((r) => r.status === 'MAINTENANCE').length}
        />
        <Metric
          label="Low-stock items"
          value={low.length}
          detail="Food, drinks and hotel supplies"
        />
      </div>
      {!!low.length && (
        <section className="hotel-panel">
          <div className="hotel-toolbar">
            <h2>Stock to replenish</h2>
            <Link to="/hotel/inventory">Hotel inventory →</Link>
          </div>
          <div className="hotel-stock-alerts">
            {low.map((item) => (
              <span key={item.id}>
                {item.name}{' '}
                <strong>
                  {item.stock} {item.unit}
                </strong>
              </span>
            ))}
          </div>
        </section>
      )}
      <p className="hotel-hint">
        Room rates use {currency}. Open a guest bill to record a deposit, take payment, check in or
        check out.
      </p>
    </>
  );
}

function GuestRows({
  bookings,
  bill,
  empty,
}: {
  bookings: HotelBooking[];
  bill: (booking: HotelBooking) => void;
  empty: string;
}) {
  return !bookings.length ? (
    <Empty>{empty}</Empty>
  ) : (
    <div className="hotel-guest-list">
      {bookings.map((b) => (
        <button type="button" key={b.id} onClick={() => bill(b)}>
          <span className="hotel-room-token">{b.roomNumber}</span>
          <span>
            <strong>{b.guestName}</strong>
            <small>
              {displayDate(b.arrival)} → {displayDate(b.departure)}
            </small>
          </span>
          <Status value={b.status} />
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function HotelRooms({
  data,
  currency,
  canManage,
  reserve,
  bill,
  edit,
}: {
  data: HotelWorkspace;
  currency: string;
  canManage: boolean;
  reserve: (room: HotelRoom) => void;
  bill: (booking: HotelBooking) => void;
  edit: (room?: HotelRoom) => void;
}) {
  return (
    <section className="hotel-panel">
      <div className="hotel-toolbar">
        <h2>Rooms & nightly prices</h2>
        {canManage && (
          <button type="button" className="hotel-primary" onClick={() => edit()}>
            + Add room
          </button>
        )}
      </div>
      {!data.rooms.length ? (
        <Empty>
          No rooms yet. Add standard rooms, deluxe rooms or suites, each with its own rate.
        </Empty>
      ) : (
        <div className="hotel-room-grid">
          {data.rooms.map((room) => {
            const guest = data.bookings.find(
              (b) => b.roomId === room.id && b.status === 'CHECKED_IN',
            );
            const next = data.bookings
              .filter(
                (b) =>
                  b.roomId === room.id &&
                  b.status === 'RESERVED' &&
                  b.departure > data.businessDate,
              )
              .sort((a, b) => a.arrival.localeCompare(b.arrival))[0];
            return (
              <article className="hotel-room-card" key={room.id}>
                <div className="hotel-toolbar">
                  <span className="hotel-room-token">{room.number}</span>
                  <Status value={guest ? 'CHECKED_IN' : room.status} />
                </div>
                <h3>{room.roomType}</h3>
                <p>Up to {room.capacity} guests</p>
                <strong className="hotel-room-price">
                  {money(room.nightlyRate, currency)} <small>/ night</small>
                </strong>
                {guest ? (
                  <button type="button" className="hotel-room-guest" onClick={() => bill(guest)}>
                    {guest.guestName} · Open guest bill →
                  </button>
                ) : (
                  <p className="hotel-hint">
                    {next
                      ? `Next arrival: ${displayDate(next.arrival)} · ${next.guestName}`
                      : 'No upcoming reservation'}
                  </p>
                )}
                {canManage && (
                  <div className="hotel-actions">
                    <button type="button" onClick={() => edit(room)}>
                      Edit / housekeeping
                    </button>
                    <button
                      type="button"
                      disabled={room.status === 'MAINTENANCE'}
                      onClick={() => reserve(room)}
                    >
                      Reserve
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReservationList({
  data,
  currency,
  bill,
}: {
  data: HotelWorkspace;
  currency: string;
  bill: (booking: HotelBooking) => void;
}) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('ACTIVE');
  const shown = data.bookings.filter(
    (b) =>
      (status === 'ALL' ||
        (status === 'ACTIVE'
          ? ['RESERVED', 'CHECKED_IN'].includes(b.status)
          : b.status === status)) &&
      `${b.guestName} ${b.roomNumber} ${b.reference} ${b.guestPhone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="hotel-panel">
      <div className="hotel-toolbar">
        <h2>Guest reservations</h2>
        <input
          type="search"
          aria-label="Search reservations"
          placeholder="Guest, room, phone or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Reservation status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ACTIVE">Active stays</option>
          <option value="ALL">All reservations</option>
          <option value="RESERVED">Reserved</option>
          <option value="CHECKED_IN">Checked in</option>
          <option value="CHECKED_OUT">Checked out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      {!shown.length ? (
        <Empty>No reservations match this view.</Empty>
      ) : (
        <div className="hotel-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Guest / reference</th>
                <th>Room</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Status</th>
                <th className="hotel-numeric">Total</th>
                <th className="hotel-numeric">Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.guestName}</strong>
                    <small className="hotel-reference">{b.reference}</small>
                  </td>
                  <td>{b.roomNumber}</td>
                  <td>{displayDate(b.arrival)}</td>
                  <td>{displayDate(b.departure)}</td>
                  <td>
                    <Status value={b.status} />
                  </td>
                  <td className="hotel-numeric">
                    {b.status === 'CANCELLED' ? '—' : money(b.total, currency)}
                  </td>
                  <td className="hotel-numeric">{money(b.balance, currency)}</td>
                  <td>
                    <button type="button" onClick={() => bill(b)}>
                      Guest bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HotelInventory({
  data,
  branchId,
  currency,
  canManage,
  saved,
  edit,
  stock,
}: {
  data: HotelWorkspace;
  branchId: string;
  currency: string;
  canManage: boolean;
  saved: () => Promise<void>;
  edit: (item?: HotelItem) => void;
  stock: (item: HotelItem, kind: 'RECEIPT' | 'USAGE') => void;
}) {
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('ALL');
  const items = data.items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'ALL' ||
        (filter === 'LOW' ? i.active && i.stock <= i.reorderLevel : i.category === filter)),
  );
  const hasIngredients = items.some((item) => item.category === 'INGREDIENT');
  return (
    <>
      <section className="hotel-panel">
        <div className="hotel-toolbar">
          <h2>Stocked products, ingredients & supplies</h2>
          {canManage && (
            <>
              <HotelExcelImport
                kind="inventory"
                branchId={branchId}
                existingNames={data.items.map((item) => item.name)}
                saved={saved}
              />
              <button type="button" className="hotel-primary" onClick={() => edit()}>
                + Add item
              </button>
            </>
          )}
        </div>
        <div className="hotel-toolbar">
          <input
            type="search"
            aria-label="Search hotel inventory"
            placeholder="Search inventory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Inventory filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All items</option>
            <option value="LOW">Low stock</option>
            <option value="PRODUCT">Stocked products</option>
            <option value="INGREDIENT">Kitchen ingredients</option>
            <option value="SUPPLY">Hotel supplies</option>
          </select>
        </div>
        {!items.length ? (
          <Empty>
            No inventory items match this view. Add stocked products, ingredients or hotel supplies.
          </Empty>
        ) : (
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>On hand</th>
                  <th>Low stock level</th>
                  {canManage && hasIngredients && (
                    <th className="hotel-numeric">Avg. ingredient cost</th>
                  )}
                  <th className="hotel-numeric">Selling price</th>
                  <th>For sale</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {!item.active && <small>Inactive</small>}
                    </td>
                    <td>{item.category}</td>
                    <td>
                      <span
                        className={
                          item.stock <= item.reorderLevel && item.active ? 'hotel-low-stock' : ''
                        }
                      >
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td>
                      {item.reorderLevel} {item.unit}
                    </td>
                    {canManage && hasIngredients ? (
                      <td className="hotel-numeric">
                        {item.category !== 'INGREDIENT'
                          ? '—'
                          : item.unitCost === null
                            ? 'Not valued'
                            : `${money(item.unitCost, currency)} / ${item.unit}${item.unitCostEstimated ? ' (estimated)' : ''}`}
                      </td>
                    ) : null}
                    <td className="hotel-numeric">{money(item.price, currency)}</td>
                    <td>{item.sellable && item.active ? 'Yes' : 'No'}</td>
                    {canManage && (
                      <td>
                        <div className="hotel-actions">
                          <button type="button" onClick={() => edit(item)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!item.active}
                            onClick={() => stock(item, 'RECEIPT')}
                          >
                            Receive
                          </button>
                          <button
                            type="button"
                            disabled={!item.active || item.stock <= 0}
                            onClick={() => stock(item, 'USAGE')}
                          >
                            Record usage
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="hotel-panel">
        <h2>Recent stock movements</h2>
        <p className="hotel-hint">
          Latest 100 stock receipts, product sales, returns and usage entries.
        </p>
        {!data.movements.length ? (
          <Empty>No hotel stock movements yet.</Empty>
        ) : (
          <div className="hotel-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Balance</th>
                  {canManage && <th className="hotel-numeric">Unit cost</th>}
                  {canManage && <th className="hotel-numeric">Movement cost</th>}
                  <th>Reference / reason</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleString()}</td>
                    <td>{m.itemName}</td>
                    <td>{m.kind}</td>
                    <td>
                      {m.quantity > 0 ? '+' : ''}
                      {m.quantity}
                    </td>
                    <td>{m.balance}</td>
                    {canManage ? (
                      <td className="hotel-numeric">
                        {m.unitCost === null ? 'N/A' : money(m.unitCost, currency)}
                      </td>
                    ) : null}
                    {canManage ? (
                      <td className="hotel-numeric">
                        {m.costValue === null ? 'N/A' : money(m.costValue, currency)}
                      </td>
                    ) : null}
                    <td className="hotel-reference">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
