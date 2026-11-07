import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Branch, BranchRequest } from '../data/types';
import { createBranch, deactivateBranch, getBranches, updateBranch } from '../services/api';
import '../styles/locations.css';

function emptyLocation(timeZone: string): BranchRequest {
  return { name: '', timeZone, branchType: 'SHOP', status: 'ACTIVE' };
}

function locationTypeLabel(type: Branch['branchType']) {
  switch (type) {
    case 'STORE':
      return 'Store';
    case 'SHOP':
      return 'Shop';
    case 'WAREHOUSE':
      return 'Warehouse';
    case 'HOTEL':
      return 'Hotel / Restaurant';
  }
}

export default function LocationsPage({ timeZone }: { timeZone: string }) {
  const client = useQueryClient();
  // Administration must include inactive locations and all authorized locations,
  // independently of the currently selected business branch.
  const query = useQuery({ queryKey: ['branches'], queryFn: getBranches });
  const locations = query.data ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => emptyLocation(timeZone));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | Branch['status']>('ALL');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const nameInput = useRef<HTMLInputElement>(null);

  function resetForm() {
    setEditingId(null);
    setForm(emptyLocation(timeZone));
  }

  function refreshLocation(saved: Branch) {
    client.setQueryData<Branch[]>(['branches'], (current = []) =>
      current.some((location) => location.id === saved.id)
        ? current.map((location) => (location.id === saved.id ? saved : location))
        : [...current, saved],
    );
    void client.invalidateQueries({ queryKey: ['branches'] });
    void client.invalidateQueries({ queryKey: ['users'] });
  }

  const save = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: BranchRequest }) =>
      id ? updateBranch(id, values) : createBranch(values),
    onSuccess: (saved, request) => {
      refreshLocation(saved);
      resetForm();
      setSearch('');
      setStatus('ALL');
      setError('');
      setMessage(`${saved.name} ${request.id ? 'updated' : 'added'} successfully.`);
    },
    onError: (caughtError) => setError(caughtError.message),
  });

  const changeStatus = useMutation({
    mutationFn: async (location: Branch): Promise<Branch> => {
      if (location.status === 'ACTIVE') {
        await deactivateBranch(location.id);
        return { ...location, status: 'INACTIVE' };
      }
      return updateBranch(location.id, {
        name: location.name,
        timeZone: location.timeZone,
        branchType: location.branchType,
        status: 'ACTIVE',
      });
    },
    onSuccess: (saved) => {
      refreshLocation(saved);
      if (editingId === saved.id) resetForm();
      setError('');
      setMessage(`${saved.name} ${saved.status === 'ACTIVE' ? 'reactivated' : 'deactivated'}.`);
    },
    onError: (caughtError) => setError(caughtError.message),
  });

  const busy = save.isPending || changeStatus.isPending;
  const unavailable = busy || query.isPending || query.isError;
  const searchTerm = search.trim().toLowerCase();
  const filtered = locations.filter(
    (location) =>
      (status === 'ALL' || location.status === status) &&
      `${location.name} ${location.code} ${location.timeZone} ${locationTypeLabel(location.branchType)}`
        .toLowerCase()
        .includes(searchTerm),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable) return;
    setError('');
    setMessage('');
    const values: BranchRequest = {
      ...form,
      name: form.name.trim(),
      timeZone: form.timeZone.trim(),
    };
    if (!values.name) {
      setError('Enter a location name.');
      return;
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone: values.timeZone }).format();
    } catch {
      setError('Enter a valid timezone, such as Africa/Nairobi.');
      return;
    }
    save.mutate({ id: editingId, values });
  }

  function edit(location: Branch) {
    setEditingId(location.id);
    setForm({
      name: location.name,
      timeZone: location.timeZone,
      branchType: location.branchType,
      status: location.status,
    });
    setError('');
    setMessage('');
    nameInput.current?.focus();
    nameInput.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  function toggleStatus(location: Branch) {
    if (busy) return;
    if (
      location.status === 'ACTIVE' &&
      !window.confirm(
        `Deactivate ${location.name}? It will no longer be available for new sales or stock receipts. Existing records will be kept.`,
      )
    ) {
      return;
    }
    setError('');
    setMessage('');
    changeStatus.mutate(location);
  }

  return (
    <section className="branch-workspace locations-workspace">
      <div className="page-header">
        <div>
          <h1>Shops &amp; warehouses</h1>
          <p>Register and manage the locations where you sell or hold stock.</p>
        </div>
        <button
          className="primary-action compact-action"
          type="button"
          disabled={unavailable}
          onClick={() => {
            resetForm();
            setError('');
            setMessage('');
            nameInput.current?.focus();
            nameInput.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          }}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add location
        </button>
      </div>

      {error && (
        <p className="message-banner error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="message-banner success" role="status">
          {message}
        </p>
      )}

      <div className="management-grid locations-management-grid">
        <section className="panel-card branch-form-panel" aria-labelledby="location-form-title">
          <div className="panel-title-row">
            <div>
              <span className="panel-icon green">
                <i className="bi bi-shop" aria-hidden="true" />
              </span>
              <h2 id="location-form-title">{editingId ? 'Edit location' : 'New location'}</h2>
            </div>
          </div>
          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field-stack">
              <span>Location name</span>
              <input
                ref={nameInput}
                required
                maxLength={160}
                placeholder="e.g. Main Shop or Central Warehouse"
                value={form.name}
                disabled={unavailable}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="field-stack">
              <span>Timezone</span>
              <input
                required
                maxLength={64}
                list="location-timezones"
                value={form.timeZone}
                disabled={unavailable}
                onChange={(event) => setForm({ ...form, timeZone: event.target.value })}
              />
              <datalist id="location-timezones">
                {[
                  ...new Set([
                    timeZone,
                    'Africa/Nairobi',
                    'Africa/Kampala',
                    'Africa/Dar_es_Salaam',
                    'UTC',
                  ]),
                ].map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
            <label className="field-stack">
              <span>Location type</span>
              <select
                value={form.branchType}
                disabled={unavailable}
                onChange={(event) =>
                  setForm({
                    ...form,
                    branchType: event.target.value as Branch['branchType'],
                  })
                }
              >
                <option value="SHOP">Shop</option>
                <option value="STORE">Store</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="HOTEL">Hotel / Restaurant</option>
              </select>
            </label>
            <label className="field-stack">
              <span>Status</span>
              <select
                value={form.status}
                disabled={unavailable}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as Branch['status'] })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <div className="form-actions">
              {editingId && (
                <button
                  className="secondary-action compact-action"
                  type="button"
                  disabled={busy}
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
              <button
                className="primary-action compact-action"
                type="submit"
                disabled={unavailable}
              >
                <i className="bi bi-check2" aria-hidden="true" />
                {save.isPending ? 'Saving...' : editingId ? 'Save changes' : 'Save location'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel-card branch-list-panel" aria-labelledby="locations-list-title">
          <div className="panel-title-row">
            <div>
              <h2 id="locations-list-title">Registered locations</h2>
            </div>
            <span className="catalog-count-pill">
              {filtered.length} of {locations.length}
            </span>
          </div>
          <div className="locations-filters">
            <label className="field-stack">
              <span>Search locations</span>
              <input
                type="search"
                placeholder="Name or code"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="field-stack">
              <span>Filter by status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
          {query.isPending ? (
            <p role="status">Loading locations...</p>
          ) : query.isError ? (
            <div role="alert">
              <p>Locations could not be loaded.</p>
              <button
                className="secondary-action compact-action"
                type="button"
                onClick={() => void query.refetch()}
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-shop" aria-hidden="true" />
              <strong>
                {locations.length ? 'No matching locations' : 'No shops or warehouses yet'}
              </strong>
              <span>
                {locations.length
                  ? 'Try another search or status.'
                  : 'Add your first location to start selling or receiving stock.'}
              </span>
            </div>
          ) : (
            <div className="responsive-table">
              <table aria-label="Registered locations">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Code</th>
                    <th>Timezone</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((location) => (
                    <tr
                      key={location.id}
                      className={editingId === location.id ? 'selected-row' : undefined}
                    >
                      <td data-label="Location">
                        <strong>{location.name}</strong>
                      </td>
                      <td data-label="Code">{location.code}</td>
                      <td data-label="Timezone">{location.timeZone}</td>
                      <td data-label="Type">{locationTypeLabel(location.branchType)}</td>
                      <td data-label="Status">
                        <span
                          className={`locations-status ${location.status === 'ACTIVE' ? 'is-active' : ''}`}
                        >
                          {location.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Actions">
                        <div className="table-actions">
                          <button
                            className="text-button"
                            type="button"
                            aria-label={`Edit ${location.name}`}
                            disabled={busy}
                            onClick={() => edit(location)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button"
                            type="button"
                            aria-label={`${location.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'} ${location.name}`}
                            disabled={busy}
                            onClick={() => toggleStatus(location)}
                          >
                            {location.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="locations-guidance">
            Active locations appear in the business branch selector. Assign staff to their locations
            from Users.
          </p>
        </section>
      </div>
    </section>
  );
}
