import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { CurrentUser, Organization } from '../data/types';
import { AppLauncher, BranchSelector } from '../platform/AppLayout';
import { usePlatform } from '../platform/PlatformContext';
import { appModules, appRegistry } from '../platform/appRegistry';
import { getHotelCheckout } from './api';
import type { HotelOrder } from './types';
import HotelRegister from './HotelRegister';
import HotelOrderReceipt from './HotelOrderReceipt';
import './hotel.css';

const workspaceShortcuts = [
  { path: '/hotel/reservations', label: 'Reservations', key: 'F1', icon: 'bi-person-check' },
  { path: '/hotel/calendar', label: 'Calendar', key: 'F2', icon: 'bi-calendar3' },
  { path: '/hotel/inventory', label: 'Inventory', key: 'F3', icon: 'bi-box-seam' },
];

export default function HotelCheckoutPage({
  user,
  organization,
  onLogout,
}: {
  user: CurrentUser;
  organization: Organization;
  onLogout: () => void;
}) {
  const { branchId, branches, selectedBranch, changeBranch } = usePlatform();
  const navigate = useNavigate();
  const [launcher, setLauncher] = useState(false),
    [navigation, setNavigation] = useState(false),
    [orders, setOrders] = useState(false),
    [dirty, setDirty] = useState(false);
  const [receipt, setReceipt] = useState<{ order: HotelOrder; autoPrint?: boolean }>(),
    [fullScreen, setFullScreen] = useState(!!document.fullscreenElement),
    [error, setError] = useState('');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['hotel', 'checkout', branchId],
    queryFn: () => getHotelCheckout(branchId),
    enabled: !!branchId,
    staleTime: 0,
    refetchInterval: 10000,
  });
  const close = useCallback(() => setReceipt(undefined), []);
  const refresh = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ['hotel'] });
  }, [client]);
  const canSell =
    user.permissionCodes.some((p) => ['admin:manage', 'hotel:manage', 'hotel:sell'].includes(p)) &&
    !query.isError;
  const hotelModules = appModules(
    appRegistry.find((a) => a.id === 'hotel')!,
    user,
  );
  const activeOrders = query.data?.orders.filter((o) => o.status === 'OPEN') ?? [];
  useEffect(() => {
    const listener = () => setFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);
  useEffect(() => {
    function handleNavigationShortcuts(event: KeyboardEvent) {
      const destinations: Record<string, string> = {
        F1: '/hotel/reservations',
        F2: '/hotel/calendar',
        F3: '/hotel/inventory',
        F9: '/home',
      };
      const destination = destinations[event.key];
      if (!destination) return;
      event.preventDefault();
      if (
        !dirty &&
        !receipt &&
        !launcher &&
        (destination === '/home' || hotelModules.some((module) => module.to === destination))
      )
        navigate(destination);
    }
    window.addEventListener('keydown', handleNavigationShortcuts);
    return () => window.removeEventListener('keydown', handleNavigationShortcuts);
  }, [dirty, hotelModules, launcher, navigate, receipt]);
  async function maximize() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError('Full-screen mode is unavailable in this browser.');
    }
  }
  return (
    <main className="hotel-app hotel-pos-shell">
      <header className="hotel-pos-topbar">
        <div className="hotel-pos-brand">
          <button
            type="button"
            className="hotel-pos-launcher"
            disabled={dirty}
            onClick={() => setLauncher(true)}
            aria-label="Open app launcher"
          >
            <i className="bi bi-grid-3x3-gap-fill" aria-hidden="true" />
          </button>
          <div>
            <strong>{organization.name}</strong>
            <small>Hotel point of sale</small>
          </div>
        </div>
        <div className="hotel-pos-topbar-center">
          <button
            type="button"
            className={!orders ? 'active' : ''}
            onClick={() => setOrders(false)}
          >
            <i className="bi bi-grid" aria-hidden="true" />
            New order
          </button>
          <button type="button" className={orders ? 'active' : ''} onClick={() => setOrders(true)}>
            <i className="bi bi-receipt" aria-hidden="true" />
            Orders <span>{activeOrders.length}</span>
          </button>
        </div>
        <nav className="hotel-pos-quicklinks" aria-label="Hotel shortcuts">
          {workspaceShortcuts
            .filter(({ path }) => hotelModules.some((module) => module.to === path))
            .map(({ path, label, key, icon }) => (
              <button
                type="button"
                key={path}
                aria-keyshortcuts={key}
                title={`${label} (${key})`}
                disabled={dirty}
                onClick={() => navigate(path)}
              >
                <i className={`bi ${icon}`} aria-hidden="true" />
                <span>{label}</span>
                <kbd>{key}</kbd>
              </button>
            ))}
        </nav>
        <div className="hotel-pos-tools">
          <button
            type="button"
            className="hotel-pos-home"
            aria-keyshortcuts="F9"
            title={dirty ? 'Finish or clear the current order before leaving' : 'Go to Home (F9)'}
            disabled={dirty}
            onClick={() => navigate('/home')}
          >
            <i className="bi bi-house-door" aria-hidden="true" />
            <span>Home</span>
            <kbd>F9</kbd>
          </button>
          <BranchSelector required disabled={dirty} />
          <button
            type="button"
            disabled={dirty}
            aria-label="Hotel workspaces"
            onClick={() => setNavigation((v) => !v)}
          >
            <i className="bi bi-list" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={fullScreen ? 'Exit full screen' : 'Maximize checkout'}
            onClick={() => void maximize()}
          >
            <i
              className={`bi ${fullScreen ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}`}
              aria-hidden="true"
            />
          </button>
          <button type="button" aria-label="Sign out" disabled={dirty} onClick={onLogout}>
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </header>
      {navigation && (
        <nav className="hotel-pos-workspace-menu" aria-label="Hotel workspaces">
          {hotelModules.map((module) => (
            <Link key={module.to} to={module.to} onClick={() => setNavigation(false)}>
              <i className={`bi ${module.icon}`} aria-hidden="true" />
              <span>{module.label}</span>
            </Link>
          ))}
          <Link to="/apps">All apps</Link>
        </nav>
      )}
      {launcher && <AppLauncher user={user} onClose={() => setLauncher(false)} />}
      {query.data &&
        (!query.data.waiters.some((w) => w.active) ||
          !query.data.receiptSettings.tillNumber ||
          !query.data.receiptSettings.contactPhone) && (
          <p role="status" className="hotel-note hotel-checkout-setup">
            {!query.data.waiters.some((w) => w.active)
              ? 'Ask the admin to assign waiter accounts or add waiter names before making orders. '
              : 'Orders can be created now. Ask the admin to add the hotel Till number and contact phone for receipts. '}
            {user.permissionCodes.includes('admin:manage') && (
              <Link to="/hotel/service-settings">Set up waiters & receipts</Link>
            )}
          </p>
        )}
      {(error || query.isError) && (
        <p className="hotel-error" role="alert">
          {error || query.error?.message}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {!branchId ? (
        <section className="hotel-panel hotel-location">
          <h1>Choose your hotel location</h1>
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
          {!branches.length && <p>Register an active location in Administration to start.</p>}
        </section>
      ) : query.isPending ? (
        <p role="status" className="hotel-pos-loading">
          Loading your hotel checkout…
        </p>
      ) : (
        query.data && (
          <HotelRegister
            key={branchId}
            data={query.data}
            branchId={branchId}
            currency={organization.currencyCode}
            waiterUserId={user.userId}
            waiterName={user.displayName}
            canSell={canSell}
            saved={refresh}
            showOrders={orders}
            hasDraft={setDirty}
            receipt={(order, autoPrint) => setReceipt({ order, autoPrint })}
          />
        )
      )}
      {receipt && (
        <HotelOrderReceipt
          order={receipt.order}
          autoPrint={receipt.autoPrint}
          organization={organization}
          branchName={selectedBranch?.name ?? ''}
          close={close}
        />
      )}
    </main>
  );
}
