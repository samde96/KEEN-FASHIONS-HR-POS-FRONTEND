import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Branch, BranchRequest, CurrentUser } from '../data/types';
import { testBranches, testOrganization, testUser } from './fixtures';

function locationApi(initial: Branch[] = [], user: CurrentUser = testUser) {
  let locations = initial.map((location) => ({ ...location }));
  let failure = '';
  const writes: { path: string; method: string; body?: BranchRequest }[] = [];
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    const method = init?.method ?? 'GET';
    if (path === '/api/v1/me') return json(user);
    if (path === '/api/v1/organization/current') return json(testOrganization);
    if (path === '/api/v1/auth/csrf')
      return json({ headerName: 'X-XSRF-TOKEN', token: 'test-csrf' });
    if (path === '/api/v1/branches' && method === 'GET') return json(locations);
    if (path.startsWith('/api/v1/branches') && method !== 'GET') {
      const body = init?.body ? (JSON.parse(String(init.body)) as BranchRequest) : undefined;
      writes.push({ path, method, body });
      if (failure) return json({ detail: failure }, 400);
      if (method === 'POST' && body) {
        const baseCode = body.code ?? body.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
        let code = baseCode;
        let suffix = 2;
        while (locations.some((location) => location.code === code)) {
          code = `${baseCode.slice(0, 24 - String(suffix).length - 1)}-${suffix++}`;
        }
        const created = { id: `location-${locations.length + 1}`, ...body, code };
        locations.push(created);
        return json(created, 201);
      }
      const existing = locations.find((location) => path === `/api/v1/branches/${location.id}`);
      if (!existing) return json({ detail: 'Location not found' }, 404);
      if (method === 'PUT' && body) {
        Object.assign(existing, body);
        return json(existing);
      }
      if (method === 'DELETE') {
        existing.status = 'INACTIVE';
        return Promise.resolve(new Response(null, { status: 204 }));
      }
    }
    return Promise.reject(new Error(`Unexpected request: ${method} ${path}`));
  });
  vi.stubGlobal('fetch', fetch);
  return {
    writes,
    fail: (detail: string) => {
      failure = detail;
    },
  };
}

function open(path = '/branches') {
  window.history.pushState({}, '', path);
  return render(<App />);
}

async function ready() {
  await screen.findByRole('heading', { name: 'Shops & warehouses' });
}

function row(name: string) {
  return within(screen.getByRole('table', { name: 'Registered locations' })).getByRole('row', {
    name: new RegExp(name),
  });
}

describe('Shop and warehouse administration', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'XSRF-TOKEN=location-test-token; path=/';
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('adds the first location through Administration and refreshes the branch selector', async () => {
    const api = locationApi();
    const user = userEvent.setup();
    open('/apps');
    await user.click(await screen.findByRole('link', { name: 'Open Administration' }));
    const navigation = screen.getByRole('navigation', { name: 'Administration navigation' });
    await user.click(within(navigation).getByRole('link', { name: 'Shops & warehouses' }));
    await ready();
    expect(screen.getByText('No shops or warehouses yet')).toBeInTheDocument();
    expect(screen.getByLabelText('Timezone')).toHaveValue('Africa/Nairobi');
    await user.selectOptions(screen.getByLabelText('Location type'), 'WAREHOUSE');
    await user.type(screen.getByLabelText('Location name'), 'Main Warehouse');
    await user.click(screen.getByRole('button', { name: 'Save location' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Main Warehouse added successfully.',
    );
    expect(row('Main Warehouse')).toHaveTextContent('MAIN-WAREHOUSE');
    expect(screen.getByLabelText('Business branch')).toHaveValue('location-1');
    expect(api.writes).toEqual([
      {
        path: '/api/v1/branches',
        method: 'POST',
        body: {
          name: 'Main Warehouse',
          timeZone: 'Africa/Nairobi',
          branchType: 'WAREHOUSE',
          status: 'ACTIVE',
        },
      },
    ]);
    cleanup();
    open();
    await ready();
    expect(row('Main Warehouse')).toBeInTheDocument();
  });

  it('creates a hotel and restaurant location type', async () => {
    const api = locationApi();
    const user = userEvent.setup();
    open();
    await ready();
    await user.selectOptions(screen.getByLabelText('Location type'), 'HOTEL');
    await user.type(screen.getByLabelText('Location name'), 'Main Restaurant');
    await user.click(screen.getByRole('button', { name: 'Save location' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Main Restaurant added successfully.',
    );
    expect(row('Main Restaurant')).toHaveTextContent('Hotel / Restaurant');
    expect(api.writes[0].body?.branchType).toBe('HOTEL');
    expect(api.writes[0].body).not.toHaveProperty('code');
  });

  it('lists locations outside the selected branch, edits details, and filters inactive locations', async () => {
    const api = locationApi([
      ...testBranches,
      {
        ...testBranches[0],
        id: 'warehouse',
        code: 'WH',
        name: 'Central Warehouse',
        status: 'INACTIVE',
      },
    ]);
    localStorage.setItem(
      `keen:platform:${testUser.organizationId}:${testUser.userId}`,
      JSON.stringify({
        branchId: testBranches[0].id,
        favorites: [],
        recent: [],
      }),
    );
    const user = userEvent.setup();
    open();
    await ready();
    expect(row('Central Warehouse')).toHaveTextContent('Inactive');
    await user.click(screen.getByRole('button', { name: 'Edit Flagship Branch' }));
    await user.clear(screen.getByLabelText('Location name'));
    await user.type(screen.getByLabelText('Location name'), 'Nairobi Shop');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nairobi Shop updated successfully.',
    );
    expect(
      within(screen.getByRole('table', { name: 'Registered locations' })).getByText(
        'Nairobi Shop',
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Business branch')).getByRole('option', {
        name: 'Nairobi Shop',
      }),
    ).toBeInTheDocument();
    expect(api.writes[0].method).toBe('PUT');
    expect(api.writes[0].body).not.toHaveProperty('code');
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'INACTIVE');
    expect(row('Central Warehouse')).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Registered locations' })).queryByText(
        'Nairobi Shop',
      ),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Search locations'), 'missing');
    expect(screen.getByText('No matching locations')).toBeInTheDocument();
  });

  it('confirms deactivation, removes the location from active choices, and supports reactivation', async () => {
    const api = locationApi(testBranches);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    open();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Deactivate Flagship Branch' }));
    expect(api.writes).toHaveLength(0);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Deactivate Flagship Branch' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Flagship Branch deactivated.');
    expect(row('Flagship Branch')).toHaveTextContent('Inactive');
    expect(screen.getByLabelText('Business branch')).toBeDisabled();
    expect(api.writes[0].method).toBe('DELETE');
    await user.click(screen.getByRole('button', { name: 'Reactivate Flagship Branch' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Flagship Branch reactivated.'),
    );
    expect(screen.getByLabelText('Business branch')).toBeEnabled();
    expect(api.writes[1].body?.status).toBe('ACTIVE');
  });

  it('keeps entered details when the API rejects a save', async () => {
    const api = locationApi();
    api.fail('Location could not be saved');
    const user = userEvent.setup();
    open();
    await ready();
    await user.type(screen.getByLabelText('Location name'), 'New Shop');
    await user.click(screen.getByRole('button', { name: 'Save location' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Location could not be saved');
    expect(screen.getByLabelText('Location name')).toHaveValue('New Shop');
    expect(screen.getByRole('button', { name: 'Save location' })).toBeEnabled();
  });

  it('checks timezone validity before sending a request', async () => {
    const api = locationApi(testBranches);
    const user = userEvent.setup();
    open();
    await ready();
    await user.type(screen.getByLabelText('Location name'), 'New Shop');
    await user.clear(screen.getByLabelText('Timezone'));
    await user.type(screen.getByLabelText('Timezone'), 'Invalid/Zone');
    await user.click(screen.getByRole('button', { name: 'Save location' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid timezone');
    expect(api.writes).toHaveLength(0);
  });

  it('blocks direct access for users without administration permission', async () => {
    const api = locationApi(testBranches, {
      ...testUser,
      roleKeys: ['SHOP_MANAGER'],
      permissionCodes: ['pos:sell'],
    });
    open();
    await screen.findByRole('heading', { name: /All your business on one platform/ });
    expect(window.location.pathname).toBe('/apps');
    expect(screen.queryByRole('button', { name: 'Save location' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Administration' })).not.toBeInTheDocument();
    expect(api.writes).toHaveLength(0);
  });
});
