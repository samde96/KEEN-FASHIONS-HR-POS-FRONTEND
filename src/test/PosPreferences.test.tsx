import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PosPreferencesPanel from '../components/PosPreferencesPanel';
import { getUsers } from '../services/api';
import {
  getPosPreferences,
  savePosPreferences,
  type PosPreferences,
} from '../services/posOperations';

vi.mock('../services/api', () => ({ getUsers: vi.fn() }));
vi.mock('../services/posOperations', () => ({
  getPosPreferences: vi.fn(),
  savePosPreferences: vi.fn(),
}));
let stored: PosPreferences;
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PosPreferencesPanel />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  stored = {
    dailySummaryEnabled: true,
    inAppEnabled: true,
    emailEnabled: false,
    recipientIds: [],
    inactivityMinutes: 2880,
    longEntryMinutes: 10,
    timeZone: 'Africa/Nairobi',
    notificationEmail: '',
  };
  vi.mocked(getUsers).mockResolvedValue([]);
  vi.mocked(getPosPreferences).mockImplementation(async () => stored);
  vi.mocked(savePosPreferences).mockImplementation(async (value) => (stored = value));
});

it('saves email copies with system summaries without showing provider setup details', async () => {
  stored.inAppEnabled = false;
  const user = userEvent.setup();
  mount();
  await screen.findByLabelText('Email a copy of system notifications');
  expect(screen.queryByText(/Resend/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/server configuration/i)).not.toBeInTheDocument();
  await user.click(screen.getByLabelText('Email a copy of system notifications'));
  expect(screen.getByLabelText('In-system daily summary')).toBeChecked();
  expect(screen.getByLabelText('In-system daily summary')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  await screen.findByText('Reminder settings saved.');
  expect(stored.emailEnabled).toBe(true);
  expect(stored.inAppEnabled).toBe(true);
});

it('saves the notification recipient email and restores it after reloading settings', async () => {
  const user = userEvent.setup();
  mount();
  const email = await screen.findByLabelText('Notification recipient email');
  await user.type(email, 'reports@example.com');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  await screen.findByText('Reminder settings saved.');
  expect(stored.notificationEmail).toBe('reports@example.com');
  cleanup();
  mount();
  expect(await screen.findByLabelText('Notification recipient email')).toHaveValue(
    'reports@example.com',
  );
  await user.clear(screen.getByLabelText('Notification recipient email'));
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  await screen.findByText('Reminder settings saved.');
  expect(stored.notificationEmail).toBe('');
});

it('rejects an invalid notification recipient email before saving', async () => {
  const user = userEvent.setup();
  mount();
  const email = await screen.findByLabelText('Notification recipient email');
  await user.type(email, 'invalid-address');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  expect(email).toBeInvalid();
  expect(savePosPreferences).not.toHaveBeenCalled();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('saves day-based intervals and retains a custom interval beyond seven days on reload', async () => {
  const user = userEvent.setup();
  mount();
  const interval = await screen.findByLabelText('Stock inactivity reminder after');
  expect(interval).toHaveValue(2);
  expect(screen.getByLabelText('Stock inactivity reminder unit')).toHaveValue('days');
  await user.clear(interval);
  await user.type(interval, '7');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  await screen.findByText('Reminder settings saved.');
  expect(stored.inactivityMinutes).toBe(7 * 1440);
  await user.clear(interval);
  await user.type(interval, '21');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  expect(stored.inactivityMinutes).toBe(21 * 1440);
  cleanup();
  mount();
  expect(await screen.findByLabelText('Stock inactivity reminder after')).toHaveValue(21);
  expect(screen.getByLabelText('Stock inactivity reminder unit')).toHaveValue('days');
});

it('preserves legacy custom durations and allows administrators to choose their own unit', async () => {
  stored.inactivityMinutes = 90;
  const user = userEvent.setup();
  mount();
  expect(await screen.findByLabelText('Stock inactivity reminder after')).toHaveValue(90);
  expect(screen.getByLabelText('Stock inactivity reminder unit')).toHaveValue('minutes');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  await screen.findByText('Reminder settings saved.');
  expect(stored.inactivityMinutes).toBe(90);
  const interval = screen.getByLabelText('Stock inactivity reminder after');
  await user.clear(interval);
  await user.type(interval, '3');
  await user.selectOptions(screen.getByLabelText('Stock inactivity reminder unit'), 'days');
  await user.click(screen.getByRole('button', { name: 'Save reminder settings' }));
  expect(stored.inactivityMinutes).toBe(3 * 1440);
  expect(stored.longEntryMinutes).toBe(10);
});
