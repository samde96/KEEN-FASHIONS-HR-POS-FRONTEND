import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { testBranches, testOrganization, testUser } from './fixtures';
import { testCrmRecords, testCrmStorageKey } from './crmFixtures';

function mockApi(currentUser = testUser) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.endsWith('/api/v1/me')
        ? currentUser
        : url.endsWith('/api/v1/organization/current')
          ? testOrganization
          : url.endsWith('/api/v1/branches')
            ? testBranches
            : null;
      return data
        ? Promise.resolve(
            new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }),
          )
        : Promise.reject(new Error('Unexpected API request'));
    }),
  );
}

function metric(label: string) {
  return within(screen.getByText(label).closest('article')!);
}

describe('CRM workspace', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/crm');
    mockApi();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('captures a contact, converts once, moves a deal, and restores saved records', async () => {
    const user = userEvent.setup();
    const app = render(<App />);
    await screen.findByRole('heading', { name: 'CRM' });
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));
    await user.type(screen.getByLabelText('Name', { exact: true }), 'Amina Kimani');
    await user.type(screen.getByLabelText('Company', { exact: true }), 'Amina Studio');
    await user.type(screen.getByLabelText('Email', { exact: true }), 'amina@example.com');
    await user.type(screen.getByLabelText('Source', { exact: true }), 'Instagram');
    await user.clear(screen.getByLabelText('Estimated Value'));
    await user.type(screen.getByLabelText('Estimated Value'), '12500');
    await user.click(screen.getByRole('button', { name: 'Save Lead' }));
    const contactRow = screen.getByRole('row', { name: /Amina Kimani/ });
    await user.click(within(contactRow).getByRole('button', { name: 'Convert' }));
    expect(metric('Open pipeline').getByText(/12,500/)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
    await user.click(
      within(screen.getByRole('row', { name: /Amina Kimani/ })).getByRole('button', {
        name: 'Convert',
      }),
    );
    expect(screen.getByText(/already linked/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(testCrmStorageKey)!).opportunities).toHaveLength(1);
    await user.click(screen.getByRole('tab', { name: 'Opportunities' }));
    await user.selectOptions(screen.getByLabelText('Stage for Amina Studio opportunity'), 'WON');
    expect(metric('Won deal value').getByText(/12,500/)).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(testCrmStorageKey)!);
    expect(saved.opportunities[0]).toMatchObject({ stage: 'WON', probabilityPercent: '100' });
    app.unmount();
    render(<App />);
    await screen.findByRole('heading', { name: 'CRM' });
    expect(metric('Total contacts').getByText('1', { exact: true })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '100% win rate, 1 won and 0 lost' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amina Kimani/ })).toBeInTheDocument();
  });

  it('schedules and completes a follow-up from the overview', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'CRM' });
    await user.click(screen.getByRole('button', { name: 'Schedule an activity' }));
    await user.type(screen.getByLabelText('Subject'), 'Call Amina');
    await user.selectOptions(screen.getByLabelText('Type', { exact: true }), 'FOLLOW_UP');
    fireEvent.change(screen.getByLabelText('Due At'), { target: { value: '2020-01-01T09:00' } });
    await user.click(screen.getByRole('button', { name: 'Save Activity' }));
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(metric('Follow-ups due').getByText('1', { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Complete Call Amina' }));
    expect(screen.getByText('A clear calendar. A fresh start.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(testCrmStorageKey)!).activities[0].status).toBe('DONE');
  });

  it('filters by source and branch, then clears all filters', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      testCrmStorageKey,
      JSON.stringify({
        ...testCrmRecords,
        leads: testCrmRecords.leads.map((lead, index) =>
          index === 1 ? { ...lead, branchId: 'other-branch' } : lead,
        ),
      }),
    );
    render(<App />);
    await screen.findByRole('heading', { name: 'CRM' });
    await user.click(screen.getByRole('tab', { name: 'Contacts' }));
    await user.type(screen.getByLabelText('Search CRM'), 'Instagram');
    expect(metric('Total contacts').getByText('2', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Brian Otieno')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.selectOptions(screen.getByLabelText('Branch', { exact: true }), testBranches[0].id);
    expect(metric('Total contacts').getByText('5', { exact: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(metric('Total contacts').getByText('6', { exact: true })).toBeInTheDocument();
  });

  it('keeps another account’s records separate', async () => {
    localStorage.setItem(`${testCrmStorageKey}-another-account`, JSON.stringify(testCrmRecords));
    render(<App />);
    await screen.findByRole('heading', { name: 'CRM' });
    expect(metric('Total contacts').getByText('0', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('Amina Kimani')).not.toBeInTheDocument();
  });

  it('shows a clear export warning when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Export your records before leaving',
    );
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });

  it('requires CRM permission for direct routes and navigation', async () => {
    mockApi({
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      roleNames: ['Shop Manager'],
      permissionCodes: ['sales:view'],
    });
    render(<App />);
    await screen.findByRole('heading', { name: /All your business on one platform/ });
    expect(screen.queryByRole('heading', { name: 'CRM' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'CRM' })).not.toBeInTheDocument();
  });
});
