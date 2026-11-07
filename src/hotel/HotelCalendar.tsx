import { useState } from 'react';
import type { HotelBooking, HotelRoom, HotelWorkspace } from './types';
import { addDays, businessDate, displayDate } from './utils';
import { Empty, Status } from './HotelUI';

export default function HotelCalendar({
  data,
  canManage,
  reserve,
  bill,
  timeZone,
}: {
  data: HotelWorkspace;
  canManage: boolean;
  timeZone: string;
  reserve: (room: HotelRoom, date: string) => void;
  bill: (booking: HotelBooking) => void;
}) {
  const [start, setStart] = useState(data.businessDate);
  const dates = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  return (
    <section className="hotel-panel">
      <div className="hotel-toolbar">
        <h2>Room availability</h2>
        <div className="hotel-actions">
          <button
            type="button"
            onClick={() => setStart(addDays(start, -14))}
            aria-label="Previous 14 days"
          >
            ←
          </button>
          <button type="button" onClick={() => setStart(data.businessDate)}>
            Today
          </button>
          <input
            type="date"
            aria-label="Calendar start date"
            value={start}
            onChange={(e) => {
              if (e.target.value) setStart(e.target.value);
            }}
          />
          <button
            type="button"
            onClick={() => setStart(addDays(start, 14))}
            aria-label="Next 14 days"
          >
            →
          </button>
        </div>
      </div>
      <div className="hotel-calendar-legend">
        <span className="hotel-status hotel-status-ready">Free</span>
        <Status value="RESERVED" />
        <Status value="CHECKED_IN" />
        <Status value="CHECKED_OUT" />
        <Status value="CLEANING" />
        <Status value="MAINTENANCE" />
      </div>
      <p className="hotel-hint">
        Select a reservation to open its guest bill, or a free date to reserve a room. Departure
        dates are available for new arrivals. Cleaning is shown for today.
      </p>
      {!data.rooms.length ? (
        <Empty>Add rooms to see their booking calendar.</Empty>
      ) : (
        <div className="hotel-table-wrap hotel-calendar-scroll">
          <table className="hotel-calendar">
            <thead>
              <tr>
                <th>Room</th>
                {dates.map((date) => (
                  <th className={date === data.businessDate ? 'hotel-today' : ''} key={date}>
                    <span>
                      {new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        timeZone: 'UTC',
                      })}
                    </span>
                    {displayDate(date).replace(/ \d{4}$/, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rooms.map((room) => (
                <tr key={room.id}>
                  <th>
                    <strong>{room.number}</strong>
                    <small>{room.roomType}</small>
                    {data.bookings.some(
                      (b) =>
                        b.roomId === room.id &&
                        b.status === 'CHECKED_IN' &&
                        b.departure <= data.businessDate,
                    ) && <small className="hotel-overdue">Check-out due</small>}
                  </th>
                  {dates.map((date) => {
                    const matches = data.bookings.filter(
                      (b) =>
                        b.roomId === room.id &&
                        b.status !== 'CANCELLED' &&
                        ((b.arrival <= date &&
                          b.departure > date &&
                          (b.status !== 'CHECKED_OUT' ||
                            date <
                              (b.checkedOutAt
                                ? businessDate(timeZone, b.checkedOutAt)
                                : b.departure))) ||
                          (b.status === 'CHECKED_IN' &&
                            date === data.businessDate &&
                            b.departure <= date)),
                    );
                    const housekeeping =
                      room.status === 'MAINTENANCE'
                        ? 'MAINTENANCE'
                        : room.status === 'CLEANING' && date === data.businessDate
                          ? 'CLEANING'
                          : 'READY';
                    return (
                      <td key={date} className={date === data.businessDate ? 'hotel-today' : ''}>
                        {matches.length ? (
                          matches.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              className={`hotel-calendar-booking hotel-calendar-${b.status.toLowerCase()}`}
                              title={`${b.guestName} · ${displayDate(b.arrival)} to ${displayDate(b.departure)}`}
                              onClick={() => bill(b)}
                            >
                              <strong>{b.guestName}</strong>
                              <small>
                                {b.status === 'CHECKED_IN'
                                  ? b.departure <= date
                                    ? 'Overdue check-out'
                                    : 'In house'
                                  : b.status === 'CHECKED_OUT'
                                    ? 'Stayed'
                                    : 'Reserved'}
                              </small>
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            className={`hotel-calendar-free hotel-calendar-${housekeeping.toLowerCase()}`}
                            disabled={
                              !canManage ||
                              date < data.businessDate ||
                              housekeeping === 'MAINTENANCE'
                            }
                            onClick={() => reserve(room, date)}
                            aria-label={`${housekeeping === 'READY' ? 'Reserve' : housekeeping} room ${room.number} on ${date}`}
                          >
                            {housekeeping === 'READY'
                              ? 'Free'
                              : housekeeping === 'CLEANING'
                                ? 'Cleaning'
                                : 'Maintenance'}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
