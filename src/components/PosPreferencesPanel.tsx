import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers } from '../services/api';
import {
  getNotificationEmailStatus,
  getPosPreferences,
  savePosPreferences,
} from '../services/posOperations';
import type { PosPreferences } from '../services/posOperations';
import {
  maxStockInactivityMinutes,
  stockInactivityUnit,
  stockInactivityUnits,
  type StockInactivityUnit,
} from '../services/stockReminderInterval';

export default function PosPreferencesPanel() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['pos-preferences'], queryFn: getPosPreferences });
  const users = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const emailStatus = useQuery({
    queryKey: ['notification-email-status'],
    queryFn: getNotificationEmailStatus,
  });
  const [form, setForm] = useState<PosPreferences>();
  const [inactivityUnit, setInactivityUnit] = useState<StockInactivityUnit>('days');
  useEffect(() => {
    if (query.data) {
      setForm({ ...query.data, notificationEmail: query.data.notificationEmail ?? '' });
      setInactivityUnit(stockInactivityUnit(query.data.inactivityMinutes));
    }
  }, [query.data]);
  const save = useMutation({
    mutationFn: savePosPreferences,
    onSuccess: async (value) => {
      client.setQueryData(['pos-preferences'], value);
      await client.invalidateQueries({ queryKey: ['organization'] });
    },
  });
  if (query.isPending) return <p>Loading reminder settings…</p>;
  if (!form) return <p role="alert">Reminder settings could not be loaded.</p>;
  return (
    <section className="panel-card operations-panel">
      <h2>Notifications, sales summaries & stock reminders</h2>
      <form
        className="record-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        <label className="field-stack">
          <span>Business timezone</span>
          <input
            required
            value={form.timeZone}
            onChange={(e) => setForm({ ...form, timeZone: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.dailySummaryEnabled}
            onChange={(e) => setForm({ ...form, dailySummaryEnabled: e.target.checked })}
          />{' '}
          Automatic daily summary at 9:00 PM
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.inAppEnabled || form.emailEnabled}
            disabled={form.emailEnabled}
            onChange={(e) => setForm({ ...form, inAppEnabled: e.target.checked })}
          />{' '}
          In-system daily summary
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.emailEnabled}
            onChange={(e) =>
              setForm({
                ...form,
                emailEnabled: e.target.checked,
                inAppEnabled: e.target.checked || form.inAppEnabled,
              })
            }
          />{' '}
          Email a copy of system notifications
        </label>
        <label className="field-stack wide-field">
          <span>Notification recipient email</span>
          <input
            type="email"
            name="notificationEmail"
            autoComplete="email"
            maxLength={254}
            placeholder="notifications@yourcompany.com"
            aria-describedby="notification-recipient-guidance"
            value={form.notificationEmail ?? ''}
            onChange={(event) => setForm({ ...form, notificationEmail: event.target.value })}
          />
        </label>
        <p className="wide-field" id="notification-recipient-guidance">
          Send notification emails and daily summaries to this inbox. Leave blank to use each
          recipient’s account email. A shared inbox receives one copy of each alert or daily
          summary.
        </p>
        <div className="wide-field notification-delivery-status" role="status">
          <p>
            Email copies contain the same title and message as the system inbox. Enabling email also
            keeps daily summaries in the inbox. Alerts follow the recipients’ shop access. Existing
            alerts are not emailed when you enable email or change the recipient address.
          </p>
          {emailStatus.isPending ? (
            <p>Checking email configuration…</p>
          ) : emailStatus.isError ? (
            <p>Email configuration could not be checked. Refresh Settings to try again.</p>
          ) : emailStatus.data?.configured ? (
            <p>
              Resend is configured. Sender: <strong>{emailStatus.data.fromEmail}</strong>.
            </p>
          ) : (
            <p>
              Email is awaiting server configuration. Add the Resend API key and verified sender
              address to the backend environment, then restart the backend. System notifications
              remain available.
            </p>
          )}
        </div>
        <fieldset className="wide-field">
          <legend>Summary recipients</legend>
          <p>
            Leave all unchecked to send to administrators. Selected users receive daily summaries
            for their authorized shops in the system inbox. Email copies go to the notification
            recipient email above, or to each selected user’s account email when that field is
            blank.
          </p>
          {users.isError && (
            <p role="alert">Recipients could not be loaded. Existing selections are preserved.</p>
          )}
          {(users.data ?? [])
            .filter(
              (u) =>
                u.status === 'ACTIVE' &&
                u.permissionCodes.some((p) => ['admin:manage', 'reports:view'].includes(p)),
            )
            .map((u) => (
              <label className="recipient-option" key={u.id}>
                <input
                  type="checkbox"
                  checked={form.recipientIds.includes(u.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      recipientIds: e.target.checked
                        ? [...form.recipientIds, u.id]
                        : form.recipientIds.filter((id) => id !== u.id),
                    })
                  }
                />{' '}
                {u.displayName} ({u.email})
              </label>
            ))}
        </fieldset>
        <label className="field-stack">
          <span>Stock inactivity reminder after</span>
          <input
            type="number"
            required
            min="1"
            step="1"
            max={Math.floor(
              maxStockInactivityMinutes / stockInactivityUnits[inactivityUnit].minutes,
            )}
            aria-describedby="stock-inactivity-guidance"
            value={form.inactivityMinutes / stockInactivityUnits[inactivityUnit].minutes}
            onChange={(e) =>
              setForm({
                ...form,
                inactivityMinutes:
                  Number(e.target.value) * stockInactivityUnits[inactivityUnit].minutes,
              })
            }
          />
        </label>
        <label className="field-stack">
          <span>Stock inactivity reminder unit</span>
          <select
            value={inactivityUnit}
            onChange={(e) => {
              const next = e.target.value as StockInactivityUnit;
              const amount = form.inactivityMinutes / stockInactivityUnits[inactivityUnit].minutes;
              setInactivityUnit(next);
              setForm({ ...form, inactivityMinutes: amount * stockInactivityUnits[next].minutes });
            }}
          >
            {Object.entries(stockInactivityUnits).map(([unit, value]) => (
              <option key={unit} value={unit}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <p className="wide-field" id="stock-inactivity-guidance">
          For unfinished stock entries, choose 2–7 days or set your own interval, up to 365 days.
          New settings default to 2 days. Nothing is submitted or discarded automatically.
        </p>
        <label className="field-stack">
          <span>Long active stock-entry reminder (minutes)</span>
          <input
            type="number"
            required
            min="1"
            max="480"
            value={form.longEntryMinutes}
            onChange={(e) => setForm({ ...form, longEntryMinutes: Number(e.target.value) })}
          />
        </label>
        <p className="wide-field">
          This separate warning helps while you are actively entering stock. It does not change the
          inactivity interval above.
        </p>
        {save.error && (
          <p className="message-banner error wide-field" role="alert">
            {save.error.message}
          </p>
        )}
        {save.isSuccess && (
          <p className="wide-field" role="status">
            Reminder settings saved.
          </p>
        )}
        <button className="primary-action compact-action" disabled={save.isPending} type="submit">
          {save.isPending ? 'Saving…' : 'Save reminder settings'}
        </button>
      </form>
    </section>
  );
}
