import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  calendarRecordDays,
  dayLabel,
  daysBetween,
  leaveTypeKind,
  monthGrid,
  monthLabel,
  recordCoversDay,
  shiftCalendarMonth,
} from './availabilityCalendar';
import {
  clockIn,
  clockOut,
  getMyAvailability,
  requestMyLeave,
} from '../services/hr';
import type { AvailabilityCalendarRecord, MyLeaveRequestInput } from '../services/hr';
import './myAvailability.css';
import './availabilityMobile.css';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Nairobi' });
const displayTime = (value: string) =>
  new Intl.DateTimeFormat('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(new Date(value));
const statusLabel = (status: string) =>
  ({
    PENDING: 'Awaiting approval',
    PENDING_APPROVAL: 'Awaiting approval',
    SUBMITTED: 'Awaiting approval',
    APPROVED: 'Approved',
    REJECTED: 'Declined',
    CANCELLED: 'Cancelled',
  })[status] ?? status.replaceAll('_', ' ');
const normalizedStatus = (status: string) =>
  ['PENDING', 'PENDING_APPROVAL', 'SUBMITTED'].includes(status) ? 'PENDING' : status;
const kindDetails = {
  OFF_DAY: { label: 'Day off', short: 'Day off', icon: 'bi-cup-hot', tone: 'teal' },
  SICK_LEAVE: { label: 'Sick leave', short: 'Sick leave', icon: 'bi-heart-pulse', tone: 'orange' },
  ANNUAL_LEAVE: { label: 'Annual leave', short: 'Annual leave', icon: 'bi-sun', tone: 'purple' },
  WORK: { label: 'Working hours', short: 'Working hours', icon: 'bi-clock', tone: 'blue' },
};

function Status({ status }: { status: string }) {
  const normalized = normalizedStatus(status).toLowerCase();
  return (
    <span className={`av-status av-status-${normalized}`}>
      <span />
      {statusLabel(status)}
    </span>
  );
}

function AvailabilityRecord({
  record,
  onCancel,
}: {
  record: AvailabilityCalendarRecord;
  onCancel?: (record: AvailabilityCalendarRecord) => void;
}) {
  const type = kindDetails[record.kind];
  const { from, to } = calendarRecordDays(record);
  return (
    <article className={`av-record av-tone-${type.tone}`}>
      <span className="av-record-icon">
        <i className={`bi ${type.icon}`} aria-hidden="true" />
      </span>
      <div className="av-record-copy">
        <div className="av-record-title">
          <h3>{record.leaveTypeName || type.label}</h3>
          <Status status={record.status} />
        </div>
        <p>
          {dayLabel(from, { day: 'numeric', month: 'short', year: 'numeric' })}
          {to !== from && ` – ${dayLabel(to, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          {record.locationName ? ` · ${record.locationName}` : ''}
        </p>
        {record.note && <p className="av-record-note">{record.note}</p>}
        {record.reviewNote && <p className="av-review-note">{record.reviewNote}</p>}
      </div>
      {record.status === 'PENDING' && onCancel && (
        <button type="button" className="av-text-button av-cancel-button" onClick={() => onCancel(record)}>
          Cancel request
        </button>
      )}
    </article>
  );
}

export default function MyAvailabilityPage() {
  const queryClient = useQueryClient();
  const currentDay = today();
  const [month, setMonth] = useState(currentDay.slice(0, 7));
  const [draft, setDraft] = useState({ leaveTypeId: '', from: currentDay, to: currentDay, reason: '' });
  const [pickingEnd, setPickingEnd] = useState(false);
  const [tab, setTab] = useState<'calendar' | 'requests'>('calendar');
  const [reportTab, setReportTab] = useState<'leave' | 'work'>('leave');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const bookingPanel = useRef<HTMLElement>(null);
  const bookingType = useRef<HTMLSelectElement>(null);

  const availability = useQuery({
    queryKey: ['hr-my-availability', month],
    queryFn: () => getMyAvailability(month),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const data = availability.data;
  const leaveTypes = data?.leaveTypes ?? [];
  const leaveRequests = data?.leaveRequests ?? [];
  const attendanceHistory = data?.attendanceHistory ?? [];
  const selectedLeaveType =
    leaveTypes.find((leaveType) => leaveType.id === draft.leaveTypeId) ?? leaveTypes[0];
  const kind = selectedLeaveType
    ? leaveTypeKind(selectedLeaveType.code, selectedLeaveType.name)
    : 'OFF_DAY';
  const type = kindDetails[kind];
  const attendance = data?.todayAttendance;
  const isClockedIn = Boolean(attendance?.clockIn && !attendance.clockOut);
  const records = data?.calendarRecords ?? [];
  const shiftRecords: AvailabilityCalendarRecord[] = (data?.upcomingShifts ?? [])
    .filter((shift) => !records.some((record) => record.id === shift.id))
    .map((shift) => ({
      id: shift.id,
      kind: 'WORK',
      status: shift.status ?? 'APPROVED',
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      note: shift.note,
      locationId: shift.branchId,
      locationName: shift.branchName,
    }));
  const attendanceRecords: AvailabilityCalendarRecord[] = attendanceHistory.map(
    (record) => ({
      id: `attendance-${record.id}`,
      kind: 'WORK',
      status: 'APPROVED',
      startDate: record.attendanceDate.slice(0, 10),
      endDate: record.attendanceDate.slice(0, 10),
      startsAt: record.clockIn,
      endsAt: record.clockOut,
      note: record.notes,
      locationId: record.locationId,
      locationName: record.locationName,
    }),
  );
  const calendarRecords = [...records, ...shiftRecords, ...attendanceRecords];
  const cells = useMemo(() => monthGrid(month), [month]);
  const pendingRequests = leaveRequests.filter((request) =>
    ['PENDING_APPROVAL', 'SUBMITTED', 'PENDING'].includes(request.status),
  );
  const dayCount =
    draft.from && draft.to && draft.to >= draft.from ? daysBetween(draft.from, draft.to) : 0;
  const selectedRecords = calendarRecords
    .filter((record) => {
      const range = calendarRecordDays(record);
      return range.from <= draft.to && range.to >= draft.from;
    })
    .sort((left, right) => (left.startDate ?? left.startsAt ?? '').localeCompare(right.startDate ?? right.startsAt ?? ''));
  const approvedRequests = leaveRequests.filter(
    (request) => request.status === 'APPROVED',
  );
  const sumDays = (kindFilter: 'off' | 'sick') =>
    approvedRequests
      .filter((request) => {
        const requestKind = leaveTypeKind(request.leaveTypeCode ?? '', request.leaveTypeName);
        return kindFilter === 'sick' ? requestKind === 'SICK_LEAVE' : requestKind !== 'SICK_LEAVE';
      })
      .reduce((total, request) => total + Number(request.requestedDays || 0), 0);
  const workedHours =
    attendanceHistory.reduce(
      (total, record) => total + Number(record.workedMinutes || 0),
      0,
    ) / 60;
  const activeCalendarRecords = calendarRecords.filter((record) =>
    ['APPROVED', 'PENDING', 'PENDING_APPROVAL', 'SUBMITTED'].includes(record.status),
  );

  const clockMutation = useMutation({
    mutationFn: () => (isClockedIn ? clockOut() : clockIn()),
    onSuccess: async () => {
      setMessage(isClockedIn ? 'You are clocked out.' : 'You are clocked in.');
      await queryClient.invalidateQueries({ queryKey: ['hr-my-availability'] });
    },
  });
  const leaveMutation = useMutation({
    mutationFn: (request: MyLeaveRequestInput) => requestMyLeave(request),
    onSuccess: async () => {
      setDraft((current) => ({ ...current, reason: '' }));
      setMessage('Your request was sent to HR for approval.');
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['hr-my-availability'] });
    },
  });

  const changeDraft = (name: 'leaveTypeId' | 'from' | 'to' | 'reason', value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setFormError('');
  };
  const chooseDay = (day: string) => {
    if (pickingEnd) {
      setDraft((current) => ({
        ...current,
        from: day < current.from ? day : current.from,
        to: day < current.from ? current.from : day,
      }));
      setPickingEnd(false);
      return;
    }
    setDraft((current) => ({ ...current, from: day, to: day }));
    setPickingEnd(true);
  };
  const startBooking = () => {
    bookingPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    bookingType.current?.focus({ preventScroll: true });
  };
  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeaveType) {
      setFormError('HR needs to configure a leave type before you can submit a request.');
      return;
    }
    if (!draft.from || !draft.to || draft.to < draft.from) {
      setFormError('Choose a valid first and last day.');
      return;
    }
    if (draft.from < currentDay) {
      setFormError('Time-off requests cannot start in the past.');
      return;
    }
    if (dayCount > 366) {
      setFormError('A request can cover up to 366 calendar days.');
      return;
    }
    leaveMutation.mutate({
      leaveTypeId: selectedLeaveType.id,
      startDate: draft.from,
      endDate: draft.to,
      reason: draft.reason.trim(),
    });
  };
  const changeMonth = (nextMonth: string) => {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(nextMonth) && nextMonth >= '2000-01' && nextMonth <= '2100-12') {
      setMonth(nextMonth);
    }
  };

  return (
    <div className="availability-page">
      <header className="av-hero page-header">
        <div className="av-hero-copy">
          <span className="av-eyebrow">
            <span /> YOUR TIME, WELL PLANNED
          </span>
          <h1>My Availability</h1>
          <p>Leave, attendance and working time.</p>
          <div className="av-hero-actions">
            <button
              type="button"
              className="av-button av-button-light"
              disabled={!data || !leaveTypes.length}
              onClick={startBooking}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Book time off
            </button>
            <button
              type="button"
              className="av-button av-hero-report"
              onClick={() =>
                document
                  .getElementById('av-report-heading')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              <i className="bi bi-bar-chart" aria-hidden="true" />
              My report
            </button>
          </div>
        </div>
        <div className="av-hero-art" aria-hidden="true">
          <div className="av-art-orbit" />
          <div className="av-art-calendar">
            <div className="av-art-calendar-top">
              <span />
              <span />
            </div>
            <strong>
              Make time
              <br />
              for you.
            </strong>
            <div className="av-art-days">
              {Array.from({ length: 14 }, (_, index) => (
                <span className={[4, 5, 11, 12].includes(index) ? 'marked' : ''} key={index}>
                  {index + 10}
                </span>
              ))}
            </div>
          </div>
          <span className="av-art-check">
            <i className="bi bi-check-lg" />
          </span>
          <span className="av-art-caption">
            <i className="bi bi-sun" /> A well deserved break
          </span>
        </div>
      </header>

      {message && (
        <div className="av-notice av-notice-success" role="status">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          <span>{message}</span>
          <button type="button" aria-label="Dismiss confirmation" onClick={() => setMessage('')}>
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      )}
      {availability.isError && (
        <div className="av-notice av-notice-error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{availability.error.message || 'Your availability could not be loaded.'}</span>
          <button type="button" onClick={() => void availability.refetch()}>
            Try again
          </button>
        </div>
      )}

      <section className="av-overview" aria-label={`Your summary for ${monthLabel(month)}`}>
        {[
          ['bi-cup-hot', 'teal', 'Days off & annual leave', sumDays('off'), 'Approved this month'],
          ['bi-heart-pulse', 'orange', 'Sick leave', sumDays('sick'), 'Approved this month'],
          ['bi-hourglass-split', 'purple', 'Awaiting approval', pendingRequests.length, 'Requests this month'],
          ['bi-clock-history', 'blue', 'Working hours', workedHours.toFixed(1), 'Confirmed this month'],
        ].map(([icon, tone, label, value, caption]) => (
          <article className={`av-stat av-tone-${tone}`} key={label}>
            <span className="av-stat-icon">
              <i className={`bi ${icon}`} aria-hidden="true" />
            </span>
            <div>
              <span>{label}</span>
              <strong>{availability.isPending ? '—' : value}</strong>
              <small>{caption}</small>
            </div>
          </article>
        ))}
      </section>

      <div className="av-workspace">
        <div className="av-main-column">
          {data && (
            <section className="av-panel av-clock" aria-label="Your working day">
              <div className="av-clock-copy">
                <span className={`av-clock-icon${isClockedIn ? ' av-clock-active' : ''}`}>
                  <i className="bi bi-fingerprint" aria-hidden="true" />
                </span>
                <div>
                  <span className="av-section-kicker">YOUR WORKING DAY</span>
                  <h2>{isClockedIn ? 'You are clocked in' : 'Ready to start your working session?'}</h2>
                  <span className={`av-clock-state${isClockedIn ? ' av-clock-state-active' : ''}`}>
                    {isClockedIn ? 'Clocked in' : 'Not clocked in'}
                  </span>
                  <p>
                    {data.employee.employeeName} · {data.employee.branchName}
                  </p>
                  <p>Planned availability is separate from clocked hours.</p>
                  {attendance?.clockIn && (
                    <p>
                      Today · {displayTime(attendance.clockIn)}
                      {attendance.clockOut ? ` – ${displayTime(attendance.clockOut)}` : ' · In progress'}
                    </p>
                  )}
                </div>
              </div>
              <div className="av-clock-controls">
                <button
                  type="button"
                  className="av-button"
                  disabled={
                    clockMutation.isPending ||
                    Boolean(attendance?.clockOut) ||
                    availability.isPending
                  }
                  onClick={() => clockMutation.mutate()}
                >
                  <i
                    className={`bi ${isClockedIn ? 'bi-box-arrow-right' : 'bi-box-arrow-in-right'}`}
                    aria-hidden="true"
                  />
                  {clockMutation.isPending
                    ? 'Saving…'
                    : attendance?.clockOut
                      ? 'Session complete today'
                      : isClockedIn
                        ? 'Clock out'
                        : 'Clock in'}
                </button>
              </div>
              {clockMutation.isError && (
                <p className="av-form-error av-clock-warning" role="alert">
                  {clockMutation.error.message}
                </p>
              )}
              <div className="av-clock-sessions">
                <h3>
                  Today’s shop sessions
                  <span> · {((Number(attendance?.workedMinutes) || 0) / 60).toFixed(1)} completed hours</span>
                </h3>
                {!attendance?.clockIn ? (
                  <p>No shop sessions today.</p>
                ) : (
                  <div className="av-clock-session">
                    <strong>{data.employee.branchName}</strong>
                    <span>
                      {displayTime(attendance.clockIn)} –{' '}
                      {attendance.clockOut ? displayTime(attendance.clockOut) : 'In progress'}
                    </span>
                    <span>
                      {attendance.clockOut
                        ? `${((Number(attendance.workedMinutes) || 0) / 60).toFixed(1)} h`
                        : 'Clocked in'}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="av-panel av-schedule" aria-labelledby="av-schedule-heading">
            <div className="av-panel-heading">
              <div>
                <span className="av-section-kicker">YOUR PERSONAL PLANNER</span>
                <h2 id="av-schedule-heading">A clear view of your time</h2>
              </div>
              <button
                type="button"
                className="av-icon-button"
                aria-label="Refresh schedule"
                disabled={availability.isFetching}
                onClick={() => void availability.refetch()}
              >
                <i className="bi bi-arrow-clockwise" aria-hidden="true" />
              </button>
            </div>
            <div className="av-calendar-toolbar">
              <div className="av-month-nav">
                <button
                  type="button"
                  className="av-icon-button"
                  aria-label="Previous month"
                  onClick={() => changeMonth(shiftCalendarMonth(month, -1))}
                >
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                <h3>{monthLabel(month)}</h3>
                <button
                  type="button"
                  className="av-icon-button"
                  aria-label="Next month"
                  onClick={() => changeMonth(shiftCalendarMonth(month, 1))}
                >
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              </div>
              <div className="av-calendar-tools">
                <button
                  type="button"
                  className="av-small-button"
                  onClick={() => {
                    changeMonth(currentDay.slice(0, 7));
                    setDraft((current) => ({ ...current, from: currentDay, to: currentDay }));
                    setPickingEnd(false);
                  }}
                >
                  Today
                </button>
                <label className="av-month-picker">
                  <span className="visually-hidden">Jump to month</span>
                  <input
                    type="month"
                    min="2000-01"
                    max="2100-12"
                    value={month}
                    onChange={(event) => changeMonth(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <div className="av-view-toolbar">
              <div className="av-view-switch" role="group" aria-label="Schedule view">
                <button
                  type="button"
                  aria-pressed={tab === 'calendar'}
                  className={tab === 'calendar' ? 'active' : ''}
                  onClick={() => setTab('calendar')}
                >
                  <i className="bi bi-calendar3" aria-hidden="true" />
                  Calendar
                </button>
                <button
                  type="button"
                  aria-pressed={tab === 'requests'}
                  className={tab === 'requests' ? 'active' : ''}
                  onClick={() => setTab('requests')}
                >
                  <i className="bi bi-list-ul" aria-hidden="true" />
                  My requests
                  <span className="av-count">{pendingRequests.length}</span>
                </button>
              </div>
              <span className="av-timezone">
                <i className="bi bi-globe2" aria-hidden="true" /> Nairobi · GMT+3
              </span>
            </div>
            {availability.isPending ? (
              <div className="av-loading" role="status">
                <span />
                Loading your schedule…
              </div>
            ) : data ? (
              tab === 'calendar' ? (
                <>
                  <div className="av-calendar-legend" aria-label="Calendar booking types">
                    {Object.entries(kindDetails).map(([key, item]) => (
                      <span className={`av-tone-${item.tone}`} key={key}>
                        <span />
                        {item.short}
                      </span>
                    ))}
                    <span className="av-pending-key">
                      <span />
                      Pending
                    </span>
                  </div>
                  <p className="av-calendar-hint" id="av-calendar-hint">
                    <i className="bi bi-cursor" aria-hidden="true" />
                    {pickingEnd ? 'Choose the last day.' : 'Select the first and last day.'}
                  </p>
                  <div
                    className="av-calendar"
                    role="group"
                    aria-label={`${monthLabel(month)} booking calendar`}
                    aria-describedby="av-calendar-hint"
                  >
                    <div className="av-weekdays" aria-hidden="true">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                    <div className="av-calendar-days">
                      {cells.map((day, index) => {
                        if (!day) {
                          return (
                            <div
                              className="av-day av-day-blank"
                              key={`blank-${index}`}
                              aria-hidden="true"
                            />
                          );
                        }
                        const dayRecords = activeCalendarRecords.filter((record) =>
                          recordCoversDay(record, day),
                        );
                        const selected = day >= draft.from && day <= draft.to;
                        return (
                          <button
                            type="button"
                            key={day}
                            data-date={day}
                            aria-label={`${dayLabel(day, {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}${dayRecords.length ? `, ${dayRecords.length} booking${dayRecords.length === 1 ? '' : 's'}` : ', no bookings'}`}
                            aria-pressed={selected}
                            aria-current={day === currentDay ? 'date' : undefined}
                            className={`av-day${selected ? ' av-day-selected' : ''}${day === draft.from ? ' av-day-first' : ''}${day === draft.to ? ' av-day-last' : ''}${index % 7 >= 5 ? ' av-day-weekend' : ''}`}
                            onClick={() => chooseDay(day)}
                          >
                            <span className="av-day-number">{Number(day.slice(-2))}</span>
                            <span className="av-day-events">
                              {dayRecords.slice(0, 2).map((record) => {
                                const recordType = kindDetails[record.kind];
                                return (
                                  <span
                                    key={record.id}
                                    className={`av-event av-tone-${recordType.tone}${normalizedStatus(record.status) === 'PENDING' ? ' av-event-pending' : ''}`}
                                  >
                                    <span />
                                    <span>{recordType.short}</span>
                                  </span>
                                );
                              })}
                              {dayRecords.length > 2 && (
                                <span className="av-more-events">+{dayRecords.length - 2} more</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="av-selection-bar">
                    <span>
                      <i className="bi bi-calendar2-range" aria-hidden="true" />
                      <strong>
                        {dayLabel(draft.from)}
                        {draft.from !== draft.to && ` – ${dayLabel(draft.to)}`}
                      </strong>{' '}
                      selected
                    </span>
                    <span>
                      {dayCount} {dayCount === 1 ? 'calendar day' : 'calendar days'}
                    </span>
                    <button type="button" className="av-text-button" onClick={startBooking}>
                      Continue booking <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="av-day-agenda">
                    <h3>
                      Bookings for your selected dates <span>{selectedRecords.length}</span>
                    </h3>
                    {selectedRecords.length ? (
                      selectedRecords.map((record) => (
                        <AvailabilityRecord key={record.id} record={record} />
                      ))
                    ) : (
                      <div className="av-agenda-empty">
                        <i className="bi bi-calendar2-heart" aria-hidden="true" />
                        <div>
                          <strong>A little space in your schedule</strong>
                          <p>No bookings recorded for these dates. Start a request using the booking panel.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="av-requests">
                  <p className="av-list-caption">
                    Your requests for {monthLabel(month)}. Approved, pending and declined requests appear here.
                  </p>
                  {leaveRequests.length ? (
                    leaveRequests.map((request) => (
                      <AvailabilityRecord
                        key={request.id}
                        record={{
                          id: request.id,
                          kind: leaveTypeKind(request.leaveTypeCode ?? '', request.leaveTypeName),
                          status: request.status,
                          startDate: request.startDate,
                          endDate: request.endDate,
                          note: request.reason,
                          reviewNote: request.approverComments,
                          leaveTypeName: request.leaveTypeName,
                          locationName: request.branchName,
                        }}
                      />
                    ))
                  ) : (
                    <div className="av-empty">
                      <i className="bi bi-inbox" aria-hidden="true" />
                      <h3>No requests in {monthLabel(month)}</h3>
                      <p>Choose dates on your calendar to book a day off or leave.</p>
                      <button type="button" className="av-button" onClick={startBooking}>
                        Make a booking <i className="bi bi-arrow-right" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="av-empty">
                <i className="bi bi-calendar2-x" aria-hidden="true" />
                <h3>Your schedule is unavailable</h3>
                <p>Try again to reconnect and load your bookings.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="av-booking-column">
          <section
            className={`av-panel av-booking av-tone-${type.tone}`}
            ref={bookingPanel}
            aria-labelledby="av-booking-heading"
          >
            <div className="av-booking-heading">
              <span className="av-booking-icon">
                <i className="bi bi-calendar2-plus" aria-hidden="true" />
              </span>
              <div>
                <span className="av-section-kicker">PLAN YOUR NEXT BREAK</span>
                <h2 id="av-booking-heading">Make a booking</h2>
              </div>
            </div>
            <form onSubmit={submitBooking}>
              <fieldset disabled={leaveMutation.isPending || !data}>
                <legend className="visually-hidden">Booking details</legend>
                <label className="av-label">
                  What would you like to book?
                  <select
                    aria-label="Request type"
                    ref={bookingType}
                    value={selectedLeaveType?.id ?? ''}
                    onChange={(event) => changeDraft('leaveTypeId', event.target.value)}
                  >
                    {leaveTypes.map((leaveType) => (
                      <option key={leaveType.id} value={leaveType.id}>
                        {leaveType.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="av-booking-types" role="group" aria-label="Quick booking types">
                  {leaveTypes.map((leaveType) => {
                    const optionKind = leaveTypeKind(leaveType.code, leaveType.name);
                    const optionType = kindDetails[optionKind];
                    return (
                      <button
                        type="button"
                        key={leaveType.id}
                        className={`av-type av-tone-${optionType.tone}${selectedLeaveType?.id === leaveType.id ? ' active' : ''}`}
                        aria-pressed={selectedLeaveType?.id === leaveType.id}
                        onClick={() => changeDraft('leaveTypeId', leaveType.id)}
                      >
                        <i className={`bi ${optionType.icon}`} aria-hidden="true" />
                        <span>{leaveType.name}</span>
                        {selectedLeaveType?.id === leaveType.id && (
                          <i className="bi bi-check-circle-fill" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {!leaveTypes.length && (
                  <p className="av-form-warning">
                    HR needs to configure leave types before you can submit a request.
                  </p>
                )}
                <div className="av-date-fields">
                  <label className="av-label">
                    First day
                    <input
                      type="date"
                      min={currentDay}
                      required
                      value={draft.from}
                      onChange={(event) => {
                        const from = event.target.value;
                        changeDraft('from', from);
                        if (from > draft.to) changeDraft('to', from);
                        setPickingEnd(false);
                      }}
                    />
                  </label>
                  <label className="av-label">
                    Last day (inclusive)
                    <input
                      type="date"
                      min={draft.from || currentDay}
                      required
                      value={draft.to}
                      onChange={(event) => {
                        changeDraft('to', event.target.value);
                        setPickingEnd(false);
                      }}
                    />
                  </label>
                </div>
                <label className="av-label" htmlFor="availability-reason">
                  Reason (optional)
                  <textarea
                    id="availability-reason"
                    maxLength={500}
                    rows={3}
                    value={draft.reason}
                    placeholder="e.g. A personal day or time with family"
                    onChange={(event) => changeDraft('reason', event.target.value)}
                  />
                  <span className="av-note-help">
                    <span />
                    <span>{draft.reason.length}/500</span>
                  </span>
                </label>
                <div className="av-booking-summary">
                  <span>
                    <i className={`bi ${type.icon}`} aria-hidden="true" />
                    {selectedLeaveType?.name ?? type.label}
                  </span>
                  <strong>
                    {dayCount} {dayCount === 1 ? 'calendar day' : 'calendar days'}
                  </strong>
                  <small>
                    {draft.from && draft.to
                      ? `${dayLabel(draft.from)}${draft.from !== draft.to ? ` – ${dayLabel(draft.to)}` : ''}`
                      : 'Choose your dates'}{' '}
                    · Full days
                  </small>
                </div>
                {formError && (
                  <p className="av-form-error" role="alert">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    {formError}
                  </p>
                )}
                {leaveMutation.isError && (
                  <p className="av-form-error" role="alert">
                    {leaveMutation.error.message || 'We could not submit your request. Please try again.'}
                  </p>
                )}
                <button
                  type="submit"
                  className="av-button av-submit"
                  disabled={!data || !selectedLeaveType || leaveMutation.isPending}
                >
                  <i
                    className={`bi ${leaveMutation.isPending ? 'bi-hourglass-split' : 'bi-send'}`}
                    aria-hidden="true"
                  />
                  {leaveMutation.isPending ? 'Submitting…' : 'Submit request'}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
              </fieldset>
            </form>
            <p className="av-approval-note">
              <i className="bi bi-shield-check" aria-hidden="true" />
              Your booking is confirmed after Admin approval.
            </p>
          </section>
        </aside>
      </div>

      <section className="av-panel av-personal-report" aria-labelledby="av-report-heading">
        <div className="av-panel-heading av-report-heading">
          <div>
            <span className="av-section-kicker">YOUR LEAVE & WORKING TIME</span>
            <h2 id="av-report-heading">My leave & productivity</h2>
          </div>
          <div className="av-report-heading-actions">
            <button
              type="button"
              className="av-small-button"
              disabled={availability.isFetching}
              onClick={() => void availability.refetch()}
            >
              <i className={`bi ${availability.isFetching ? 'bi-arrow-repeat av-spinning' : 'bi-arrow-clockwise'}`} aria-hidden="true" />
              {availability.isFetching ? 'Refreshing…' : 'Refresh my report'}
            </button>
          </div>
        </div>
        <div className="av-report-filters">
          <div className="av-report-period">
            <span className="av-report-filter-icon">
              <i className="bi bi-calendar3" aria-hidden="true" />
            </span>
            <span><small>REPORTING PERIOD</small><strong>Monthly</strong></span>
          </div>
          <label className="av-label">
            Month
            <input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} />
          </label>
          <label className="av-label" htmlFor="av-report-location">
            Location
            <select id="av-report-location" value={data?.employee.branchId ?? ''} disabled>
              <option value={data?.employee.branchId ?? ''}>
                {data?.employee.branchName ?? 'My work location'}
              </option>
            </select>
          </label>
        </div>
        <dl className="av-report-metrics">
          {[
            ['bi-sun', 'teal', 'Off days', sumDays('off')],
            ['bi-heart-pulse', 'orange', 'Sick leave days', sumDays('sick')],
            ['bi-clock-history', 'blue', 'Confirmed hours', workedHours.toFixed(1)],
            ['bi-briefcase', 'purple', 'Working days', attendanceHistory.length],
            ['bi-hourglass-split', 'amber', 'Pending requests', pendingRequests.length],
          ].map(([icon, tone, label, value]) => (
            <div className={`av-report-metric av-report-tone-${tone}`} key={label}>
              <span className="av-report-metric-icon">
                <i className={`bi ${icon}`} aria-hidden="true" />
              </span>
              <div>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="av-report-caption">
          <i className="bi bi-info-circle" aria-hidden="true" />
          {monthLabel(month)} <span>·</span> Nairobi time <span>·</span> Last day included
        </p>
        <p className="av-report-note">
          <i className="bi bi-shield-check" aria-hidden="true" />
          Leave covers your work location. Hours include recorded sessions.
        </p>
        <div className="av-report-toolbar">
          <div className="av-report-tabs" role="group" aria-label="Personal report view">
            <button
              type="button"
              className={reportTab === 'leave' ? 'active' : ''}
              aria-pressed={reportTab === 'leave'}
              onClick={() => setReportTab('leave')}
            >
              <i className="bi bi-calendar2-check" aria-hidden="true" />
              Leave history
              <span>{leaveRequests.length}</span>
            </button>
            <button
              type="button"
              className={reportTab === 'work' ? 'active' : ''}
              aria-pressed={reportTab === 'work'}
              onClick={() => setReportTab('work')}
            >
              <i className="bi bi-clock" aria-hidden="true" />
              Working time
              <span>{attendanceHistory.length}</span>
            </button>
          </div>
          <span className="av-report-table-period">{monthLabel(month)}</span>
        </div>
        {reportTab === 'leave' ? (
          leaveRequests.length ? (
            <div className="av-report-table" role="region" aria-label="Your leave history">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Review note</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((request) => (
                    <tr key={request.id}>
                      <th scope="row">{request.leaveTypeName}</th>
                      <td data-label="Dates">
                        {dayLabel(request.startDate)}
                        {request.startDate !== request.endDate && ` – ${dayLabel(request.endDate)}`}
                      </td>
                      <td data-label="Days">{request.requestedDays}</td>
                      <td data-label="Status">{statusLabel(request.status)}</td>
                      <td data-label="Review note">{request.approverComments || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="av-report-empty" role="status">
              No leave or time-off requests in this month.
            </p>
          )
        ) : attendanceHistory.length ? (
          <div className="av-report-table" role="region" aria-label="Your working time">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Clock-in</th>
                  <th>Clock-out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record) => (
                  <tr key={record.id}>
                    <th scope="row">{record.locationName}</th>
                    <td data-label="Date">{dayLabel(record.attendanceDate)}</td>
                    <td data-label="Clock-in">
                      {record.clockIn ? displayTime(record.clockIn) : '—'}
                    </td>
                    <td data-label="Clock-out">
                      {record.clockOut ? displayTime(record.clockOut) : 'In progress'}
                    </td>
                    <td data-label="Hours">{(Number(record.workedMinutes || 0) / 60).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="av-report-empty" role="status">
            No working sessions in this month.
          </p>
        )}
      </section>
    </div>
  );
}
