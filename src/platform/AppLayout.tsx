import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { CurrentUser } from '../data/types';
import whiteLogo from '../assets/keen-logo-white.png';
import { appName } from '../appBrand';
import { appForPath, appModules, appPath, canAccessPath, visibleApps } from './appRegistry';
import { usePlatform } from './PlatformContext';

function WorkspaceBackLink() {
  const { pathname } = useLocation();
  if (['/', '/home', '/apps'].includes(pathname)) return null;

  const app = appForPath(pathname);
  const isModule = app && pathname !== appPath(app);
  const destination = isModule ? appPath(app) : '/apps';
  const label = isModule ? `Back to ${app.title}` : 'Back to Apps';

  return (
    <Link
      className="platform-icon-button platform-back-link"
      to={destination}
      aria-label={label}
      title={label}
    >
      <i className="bi bi-arrow-left" aria-hidden="true" />
    </Link>
  );
}

export function BranchSelector({
  disabled = false,
  required = false,
}: {
  disabled?: boolean;
  required?: boolean;
}) {
  const { branchId, branches, changeBranch } = usePlatform();
  return (
    <label className="platform-branch">
      <i className="bi bi-shop" aria-hidden="true" />
      <span>
        <small>Business scope</small>
        <select
          aria-label="Business branch"
          value={branchId}
          disabled={disabled || !branches.length}
          onChange={(e) => void changeBranch(e.target.value)}
        >
          {!required && branches.length > 1 && <option value="">All authorized branches</option>}
          {!branches.length && <option value="">No active branches</option>}
          {required && !branchId && (
            <option value="" disabled>
              Select a branch
            </option>
          )}
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </span>
      <i className="bi bi-chevron-down" aria-hidden="true" />
    </label>
  );
}

export function AppLauncher({ user, onClose }: { user: CurrentUser; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const targets = root.current?.querySelectorAll<HTMLElement>('input,button,a[href]');
      if (!targets?.length) return;
      if (event.shiftKey && document.activeElement === targets[0]) {
        event.preventDefault();
        targets[targets.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === targets[targets.length - 1]) {
        event.preventDefault();
        targets[0].focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [onClose]);
  const apps = visibleApps(user).filter((app) =>
    `${app.title} ${app.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="platform-launcher-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="platform-launcher"
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label="Switch application"
      >
        <header>
          <strong>Your applications</strong>
          <button
            className="platform-icon-button"
            type="button"
            aria-label="Close app launcher"
            onClick={onClose}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </button>
        </header>
        <label className="platform-launcher-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            aria-label="Find an application"
            placeholder="Find an application…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="platform-launcher-grid">
          {apps.map((app) => (
            <Link to={appPath(app)} key={app.id} onClick={onClose}>
              <span className={`platform-app-icon tone-${app.tone}`}>
                <i className={`bi ${app.icon}`} aria-hidden="true" />
              </span>
              {app.title}
            </Link>
          ))}
        </div>
        {!apps.length && <p>No matching applications.</p>}
        <Link className="platform-launcher-all" to="/apps" onClick={onClose}>
          View all applications <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

export default function AppLayout({
  user,
  onLogout,
  children,
}: {
  user: CurrentUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const app = appForPath(location.pathname);
  const modules = app ? appModules(app, user) : [];
  const currentModule = modules.find((module) => module.to === location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLElement>(null);
  const launcherButton = useRef<HTMLButtonElement>(null);
  const { favorites } = usePlatform();
  const closeLauncher = () => {
    setLauncherOpen(false);
    launcherButton.current?.focus();
  };
  useEffect(() => {
    setMenuOpen(false);
    setLauncherOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      [
        ...(menuPanel.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ??
          []),
      ].filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      if (event.shiftKey && document.activeElement === targets[0]) {
        event.preventDefault();
        targets[targets.length - 1]?.focus();
      } else if (!event.shiftKey && document.activeElement === targets[targets.length - 1]) {
        event.preventDefault();
        targets[0]?.focus();
      }
    };
    const resize = () => {
      if (window.innerWidth > 1024) setMenuOpen(false);
    };
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', resize);
      menuButton.current?.focus();
    };
  }, [menuOpen]);
  const initials = user.displayName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
  return (
    <div className="app-shell platform-shell">
      <a className="platform-skip" href="#platform-main">
        Skip to workspace
      </a>
      <aside
        id="platform-navigation"
        ref={menuPanel}
        className={`sidebar platform-rail ${menuOpen ? 'menu-open' : ''}`}
        aria-label="Primary navigation"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a[href]'))
            setMenuOpen(false);
        }}
      >
        <div className="platform-rail-brand">
          <Link to="/apps" aria-label={`${appName} Home`}>
            <img src={whiteLogo} alt={appName} />
            <span>{appName}</span>
          </Link>
          <button
            className="platform-mobile-close platform-icon-button"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <i aria-hidden="true" className="bi bi-x-lg" />
          </button>
        </div>
        <nav className="platform-global-nav" aria-label="Platform navigation">
          <NavLink to="/home">
            <i className="bi bi-house-door" aria-hidden="true" />
            Home
          </NavLink>
          <NavLink to="/apps" end>
            <i className="bi bi-grid" aria-hidden="true" />
            Apps
          </NavLink>
          <NavLink to="/favorites">
            <i className="bi bi-star" aria-hidden="true" />
            Favorites{favorites.length > 0 && <small>{favorites.length}</small>}
          </NavLink>
          <NavLink to="/recent">
            <i className="bi bi-clock-history" aria-hidden="true" />
            Recently Used
          </NavLink>
        </nav>
        {app && (
          <nav className="platform-app-nav" aria-label={`${app.title} navigation`}>
            <p>
              <span className={`platform-rail-app-dot tone-${app.tone}`} />
              <span>{app.title}</span>
            </p>
            <NavLink to={appPath(app)} end>
              <i className="bi bi-layout-text-window-reverse" aria-hidden="true" />
              Overview
            </NavLink>
            {modules.map((module) => (
              <NavLink to={module.to} key={module.to}>
                <i className={`bi ${module.icon}`} aria-hidden="true" />
                {module.label}
              </NavLink>
            ))}
          </nav>
        )}
        {!app && favorites.length > 0 && (
          <nav className="platform-app-nav" aria-label="Favorite applications">
            <p>PINNED APPS</p>
            {visibleApps(user)
              .filter((app) => favorites.includes(app.id))
              .map((app) => (
                <NavLink to={appPath(app)} key={app.id}>
                  <i className={`bi ${app.icon}`} aria-hidden="true" />
                  {app.title}
                </NavLink>
              ))}
          </nav>
        )}
        <div className="platform-rail-bottom">
          {canAccessPath(user, '/settings') && (
            <NavLink to="/settings">
              <i className="bi bi-gear" aria-hidden="true" />
              Settings
            </NavLink>
          )}
          <NavLink to="/help">
            <i className="bi bi-question-circle" aria-hidden="true" />
            Help & support
          </NavLink>
          <small>Copyright @CRENVIX MORAVA SYSTEMS</small>
        </div>
      </aside>
      <div className="content-shell platform-content">
        <header className="topbar platform-topbar">
          <div className="platform-topbar-start">
            <WorkspaceBackLink />
            <button
              ref={menuButton}
              className="platform-menu-toggle platform-icon-button"
              type="button"
              aria-label="Open menu"
              aria-controls="platform-navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i aria-hidden="true" className="bi bi-list" />
            </button>
            <button
              ref={launcherButton}
              className="platform-launcher-trigger"
              type="button"
              aria-label="Open app launcher"
              aria-haspopup="dialog"
              aria-expanded={launcherOpen}
              onClick={() => setLauncherOpen(!launcherOpen)}
            >
              <i aria-hidden="true" className="bi bi-grid-3x3-gap-fill" />
              <span>{app?.title ?? appName}</span>
              <i aria-hidden="true" className="bi bi-chevron-down" />
            </button>
          </div>
          <div className="topbar-actions platform-topbar-actions">
            <BranchSelector />
            <span className="platform-online">
              <i aria-hidden="true" />
              Online
            </span>
            {canAccessPath(user, '/notifications') && (
              <Link
                className="platform-icon-button platform-notifications"
                to="/notifications"
                aria-label="Notifications"
              >
                <i aria-hidden="true" className="bi bi-bell" />
              </Link>
            )}
            <span
              className="platform-user"
              aria-label={`Signed in as ${user.displayName}`}
              title={user.displayName}
            >
              <b>{initials}</b>
              <span>
                <small>{user.roleNames.join(' / ') || 'User'}</small>
                <strong>{user.displayName}</strong>
              </span>
            </span>
            <button
              className="platform-logout"
              type="button"
              aria-label="Log out"
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              <span>Log Out</span>
            </button>
          </div>
        </header>
        <main className="main-content platform-main" id="platform-main">
          {(app || location.pathname === '/dashboard') && (
            <nav className="platform-breadcrumb" aria-label="Breadcrumb">
              <Link to="/apps">Apps</Link>
              <i className="bi bi-chevron-right" aria-hidden="true" />
              {app ? (
                <>
                  <Link to={appPath(app)}>{app.title}</Link>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                  <span>{currentModule?.label ?? 'Overview'}</span>
                </>
              ) : (
                <span>Business Overview</span>
              )}
            </nav>
          )}
          {children}
        </main>
      </div>
      {launcherOpen && <AppLauncher user={user} onClose={closeLauncher} />}
    </div>
  );
}

export function PosAppNavigation({
  user,
  disabled = false,
}: {
  user: CurrentUser;
  disabled?: boolean;
}) {
  const { branchId, branches, changeBranch } = usePlatform();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!branchId && branches[0]) void changeBranch(branches[0].id);
  }, [branchId, branches, changeBranch]);
  return (
    <div className="platform-pos-navigation">
      <div>
        <WorkspaceBackLink />
        <button
          className="platform-launcher-trigger"
          type="button"
          aria-label="Open app launcher"
          onClick={() => setOpen(true)}
        >
          <i aria-hidden="true" className="bi bi-grid-3x3-gap-fill" />
          <span>Apps</span>
        </button>
        <span>
          Point of Sale <i aria-hidden="true" className="bi bi-chevron-right" /> Checkout
        </span>
        <BranchSelector required disabled={disabled} />
      </div>
      <nav aria-label="Point of Sale navigation">
        <Link to="/apps/pos">Overview</Link>
        {canAccessPath(user, '/shifts') && <Link to="/shifts">My Shifts</Link>}
        {canAccessPath(user, '/expenses') && <Link to="/expenses">Expenses</Link>}
        {canAccessPath(user, '/sales') && <Link to="/sales">Sales & returns</Link>}
        <Link to="/apps">All apps</Link>
      </nav>
      {open && <AppLauncher user={user} onClose={() => setOpen(false)} />}
    </div>
  );
}
