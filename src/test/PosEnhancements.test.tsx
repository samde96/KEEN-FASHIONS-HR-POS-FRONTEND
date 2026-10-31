import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStockEntry, { nextStockReminder } from '../hooks/useStockEntry';
import { isSellableProduct } from '../components/VariantProductFields';
import { getCurrentUser } from '../services/api';
import {
  completeStockDraft,
  discardStockDraft,
  getPosPreferences,
  getStockDrafts,
  saveStockDraft,
} from '../services/posOperations';
import { testProducts, testUser } from './fixtures';
import { StockNavigationProvider, useStockNavigationGuard } from '../hooks/StockNavigationGuard';

vi.mock('../services/api', () => ({ getCurrentUser: vi.fn() }));
vi.mock('../services/posOperations', () => ({
  getPosPreferences: vi.fn(),
  getStockDrafts: vi.fn(),
  saveStockDraft: vi.fn(),
  completeStockDraft: vi.fn(),
  discardStockDraft: vi.fn(),
}));

function Harness({ busy = false }: { busy?: boolean }) {
  const navigation = useStockNavigationGuard();
  const [signedOut, setSignedOut] = useState(false);
  const [form, setForm] = useState({ branchId: 'shop', quantity: '' });
  const [lines, setLines] = useState<never[]>([]);
  const monitor = useStockEntry({
    form,
    lines,
    busy,
    restore: (next, savedLines) => {
      setForm(next);
      setLines(savedLines);
    },
    clear: () => {
      setForm({ branchId: 'shop', quantity: '' });
      setLines([]);
    },
  });
  return (
    <>
      <input
        aria-label="Stock quantity"
        value={form.quantity}
        onChange={(e) => {
          setForm({ ...form, quantity: e.target.value });
          monitor.interact(true);
        }}
      />
      <button onClick={() => monitor.interact()}>Activity</button>
      <button
        onClick={async () => {
          if (await navigation.confirmLeave()) setSignedOut(true);
        }}
      >
        Sign out
      </button>
      {signedOut && <p>Signed out</p>}
      <Link to="/other">Leave stock entry</Link>
      {monitor.controls}
    </>
  );
}
function mount(busy = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([
    { path: '/', element: <Harness busy={busy} /> },
    { path: '/other', element: <p>Other screen</p> },
  ]);
  render(
    <QueryClientProvider client={client}>
      <StockNavigationProvider>
        <RouterProvider router={router} />
      </StockNavigationProvider>
    </QueryClientProvider>,
  );
  return router;
}
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1);
  });
}

describe('POS variants and stock entry protection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getCurrentUser).mockResolvedValue(testUser);
    vi.mocked(getPosPreferences).mockResolvedValue({
      dailySummaryEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      recipientIds: [],
      inactivityMinutes: 5,
      longEntryMinutes: 10,
      timeZone: 'Africa/Nairobi',
    });
    vi.mocked(getStockDrafts).mockResolvedValue([]);
    vi.mocked(saveStockDraft).mockImplementation(async (id, branchId, form, lines, version) => ({
      id,
      branchId,
      payload: { form, lines },
      version: version + 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    vi.mocked(discardStockDraft).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('hides parents and inactive variants while preserving existing simple products', () => {
    expect(isSellableProduct(testProducts[0])).toBe(true);
    expect(isSellableProduct({ ...testProducts[0], productType: 'VARIABLE' })).toBe(false);
    expect(isSellableProduct({ ...testProducts[0], sellable: false })).toBe(false);
  });
  it('distinguishes inactivity from a long active entry and pauses during requests', () => {
    const state = {
      startedAt: 0,
      lastActivityAt: 299000,
      inactivityShown: false,
      longShown: false,
    };
    expect(nextStockReminder(state, 300000, 5, 10, false)).toBe(null);
    expect(nextStockReminder({ ...state, lastActivityAt: 0 }, 300000, 5, 10, false)).toBe('idle');
    expect(nextStockReminder(state, 600000, 5, 10, true)).toBe(null);
    expect(nextStockReminder({ ...state, lastActivityAt: 599000 }, 600000, 5, 10, false)).toBe(
      'long',
    );
    expect(
      nextStockReminder({ ...state, inactivityShown: true, longShown: true }, 900000, 5, 10, false),
    ).toBe(null);
  });
  it('shows one inactivity reminder without losing the entered quantity', async () => {
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '7' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299000);
    });
    expect(screen.queryByText(/You have been inactive/)).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByText(/You have been inactive/)).toBeInTheDocument();
    expect(screen.getByLabelText('Stock quantity')).toHaveValue('7');
    fireEvent.click(screen.getByRole('button', { name: 'Continue entering stock' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300000);
    });
    expect(screen.queryByText(/You have been inactive/)).not.toBeInTheDocument();
  });
  it('waits for the configured day boundary and does not show the active-entry warning during inactivity', () => {
    const day = 86_400_000;
    const state = { startedAt: 0, lastActivityAt: 0, inactivityShown: false, longShown: false };
    expect(nextStockReminder(state, 10 * 60_000, 2 * 1440, 10, false)).toBe(null);
    expect(nextStockReminder(state, 2 * day - 1, 2 * 1440, 10, false)).toBe(null);
    expect(nextStockReminder(state, 2 * day, 2 * 1440, 10, false)).toBe('idle');
    expect(nextStockReminder(state, 7 * day - 1, 7 * 1440, 10, false)).toBe(null);
    expect(nextStockReminder(state, 7 * day, 7 * 1440, 10, false)).toBe('idle');
    expect(nextStockReminder(state, 7 * day, 7 * 1440, 10, true)).toBe(null);
  });
  it('flags saved stock drafts that remain unfinished across days without losing their entries', async () => {
    vi.mocked(getPosPreferences).mockResolvedValue({
      dailySummaryEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      recipientIds: [],
      inactivityMinutes: 2 * 1440,
      longEntryMinutes: 10,
      timeZone: 'Africa/Nairobi',
    });
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    vi.mocked(getStockDrafts).mockResolvedValue([
      {
        id: 'older-draft',
        branchId: 'shop',
        status: 'DRAFT',
        payload: { form: { branchId: 'shop', quantity: '12' }, lines: [] },
        version: 1,
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      },
    ]);
    mount();
    await flush();
    expect(
      screen.getByText(/1 unfinished stock draft has had no updates for at least 2 days/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Resume a saved stock draft'));
    fireEvent.click(screen.getByRole('button', { name: /Resume .*Needs attention/ }));
    expect(screen.getByLabelText('Stock quantity')).toHaveValue('12');
    expect(screen.queryByText(/unfinished stock draft has had no updates/)).not.toBeInTheDocument();
    expect(completeStockDraft).not.toHaveBeenCalled();
    expect(discardStockDraft).not.toHaveBeenCalled();
  });
  it('shows the long-entry reminder while the user keeps interacting', async () => {
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '7' } });
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60000);
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText(/Stock entry is taking longer/)).toBeInTheDocument();
    expect(screen.queryByText(/You have been inactive/)).not.toBeInTheDocument();
  });
  it('blocks navigation and saves the draft before leaving', async () => {
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('link', { name: 'Leave stock entry' }));
    expect(screen.getByRole('dialog', { name: 'Unsaved stock changes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft and leave' }));
    await flush();
    expect(saveStockDraft).toHaveBeenCalledWith(
      expect.any(String),
      'shop',
      { branchId: 'shop', quantity: '9' },
      [],
      0,
    );
    expect(screen.getByText('Other screen')).toBeInTheDocument();
    expect(completeStockDraft).not.toHaveBeenCalled();
  });
  it('resumes a server draft including an incomplete quantity', async () => {
    vi.mocked(getStockDrafts).mockResolvedValue([
      {
        id: 'saved-id',
        branchId: 'shop',
        status: 'DRAFT',
        payload: { form: { branchId: 'shop', quantity: '13' }, lines: [] },
        version: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    mount();
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /^Resume / }));
    expect(screen.getByLabelText('Stock quantity')).toHaveValue('13');
    fireEvent.click(screen.getByRole('button', { name: 'Save stock draft' }));
    await flush();
    expect(saveStockDraft).toHaveBeenCalledWith(
      'saved-id',
      'shop',
      { branchId: 'shop', quantity: '13' },
      [],
      4,
    );
  });
  it('keeps data on autosave failure and never posts automatically', async () => {
    vi.mocked(saveStockDraft).mockRejectedValue(new Error('Network unavailable'));
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '12' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Autosave failed');
    expect(screen.getByLabelText('Stock quantity')).toHaveValue('12');
    expect(completeStockDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Leave stock entry' }));
    expect(screen.getByRole('dialog', { name: 'Unsaved stock changes' })).toBeInTheDocument();
  });
  it('stops reminders after discard and records the discarded server draft', async () => {
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save stock draft' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Discard operation' }));
    await flush();
    expect(discardStockDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Stock quantity')).toHaveValue('');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900000);
    });
    expect(
      screen.queryByText(/You have been inactive|Stock entry is taking longer/),
    ).not.toBeInTheDocument();
  });
  it('protects the draft before signing out invalidates the session', async () => {
    mount();
    await flush();
    fireEvent.change(screen.getByLabelText('Stock quantity'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.queryByText('Signed out')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Unsaved stock changes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft and leave' }));
    await flush();
    expect(saveStockDraft).toHaveBeenCalled();
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });
});
