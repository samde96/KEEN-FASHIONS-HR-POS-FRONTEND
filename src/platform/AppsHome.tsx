import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CurrentUser, Organization } from '../data/types';
import { appName } from '../appBrand';
import {
  appModules,
  appPath,
  appRegistry,
  canAccessPath,
  searchApps,
  visibleApps,
} from './appRegistry';
import type { BusinessApp } from './appRegistry';
import { usePlatform } from './PlatformContext';

export default function AppsHome({
  user,
  organization,
  view = 'apps',
}: {
  user: CurrentUser;
  organization: Organization;
  view?: 'apps' | 'favorites' | 'recent';
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All apps');
  const { favorites, recent, toggleFavorite, storageAvailable, selectedBranch } = usePlatform();
  const available = visibleApps(user);
  const categories = ['All apps', ...new Set(visibleApps(user, true).map((app) => app.category))];
  const apps = useMemo(
    () =>
      searchApps(user, query, view === 'apps')
        .filter(
          (app) =>
            (category === 'All apps' || category === app.category) &&
            (view !== 'favorites' || favorites.includes(app.id)) &&
            (view !== 'recent' || recent.some((item) => item.appId === app.id)),
        )
        .sort((a, b) =>
          view === 'recent'
            ? recent.findIndex((item) => item.appId === a.id) -
              recent.findIndex((item) => item.appId === b.id)
            : 0,
        ),
    [user, query, view, category, favorites, recent],
  );
  const heading =
    view === 'favorites'
      ? 'Your favorite apps'
      : view === 'recent'
        ? 'Recently used apps'
        : 'Your apps';
  const quickActions = [
    { to: '/pos', title: 'Create sale', icon: 'bi-cart3' },
    { to: '/add-stock', title: 'Receive stock', icon: 'bi-box-arrow-in-down' },
    { to: '/commercial', title: 'Create invoice', icon: 'bi-receipt' },
    { to: '/customers', title: 'Add customer', icon: 'bi-person-plus' },
  ].filter((action) => canAccessPath(user, action.to));
  return (
    <section className="apps-home">
      <div className="apps-home-hero">
        <div className="apps-hero-copy">
          <p className="apps-eyebrow">WELCOME TO {appName}</p>
          <h1>
            All your business on <span>one platform.</span>
          </h1>
          <p className="apps-hero-tagline">
            Less switching. <span>More doing.</span>
          </p>
          <p className="apps-hero-description">
            Your people, products and everyday work. Connected, organized, and ready to go.
          </p>
          <div className="apps-hero-actions">
            <a className="apps-hero-primary" href="#apps-catalog">
              Explore your apps
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
            {canAccessPath(user, '/dashboard') && (
              <Link className="apps-hero-secondary" to="/dashboard">
                Open business overview
              </Link>
            )}
            <aside className="apps-hero-note" aria-hidden="true">
              <svg viewBox="0 0 84 65" fill="none">
                <path d="M8 5C35 8 54 26 64 48M51 44l14 7 3-16" />
              </svg>
              <span>
                Your whole team.
                <br />
                One workspace.
              </span>
            </aside>
          </div>
        </div>
        <div className="apps-hero-search">
          <label className="apps-search">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search apps"
              placeholder="Search apps, tools, or workflows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="apps-search-hint" aria-hidden="true">
              Find your next move
            </span>
          </label>
          <div className="apps-hero-meta">
            <span>
              <i aria-hidden="true" className="bi bi-shield-check" />
              {available.length} apps for your role
            </span>
            <span>
              <i aria-hidden="true" className="bi bi-shop" />
              {selectedBranch?.name ?? 'All authorized branches'}
            </span>
          </div>
        </div>
      </div>
      <div className="apps-section-heading" id="apps-catalog" tabIndex={-1}>
        <div>
          <h2>{heading}</h2>
          <p>
            {view === 'apps'
              ? 'Choose an app. Get straight to work.'
              : view === 'favorites'
                ? 'The applications you have pinned for quick access.'
                : 'Pick up where you left off.'}
          </p>
        </div>
        {canAccessPath(user, '/dashboard') && (
          <Link className="apps-overview-link" to="/dashboard">
            Business Overview
            <i aria-hidden="true" className="bi bi-arrow-up-right" />
          </Link>
        )}
      </div>
      <div className="apps-category-filters" aria-label="Application categories">
        {categories.map((item) => (
          <button
            className={category === item ? 'active' : ''}
            aria-pressed={category === item}
            type="button"
            key={item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {!storageAvailable && (
        <p className="apps-storage-note" role="status">
          Browser storage is unavailable. Favorites and recent apps will last for this session.
        </p>
      )}
      <div className="apps-catalog-grid" aria-label={heading}>
        {apps.map((app) => (
          <AppCard
            app={app}
            key={app.id}
            user={user}
            favorite={favorites.includes(app.id)}
            onFavorite={() => toggleFavorite(app.id)}
            recentPath={
              view === 'recent' ? recent.find((item) => item.appId === app.id)?.path : undefined
            }
          />
        ))}
      </div>
      {!apps.length && (
        <div className="apps-empty">
          <i
            aria-hidden="true"
            className={`bi ${view === 'favorites' ? 'bi-star' : view === 'recent' ? 'bi-clock-history' : 'bi-search'}`}
          />
          <h3>
            {query
              ? 'No matching apps'
              : view === 'favorites'
                ? 'Keep your everyday apps close'
                : 'Your next workspace is a click away'}
          </h3>
          <p>
            {query
              ? 'Try a different app name or workflow.'
              : view === 'favorites'
                ? 'Select the star on any available app to pin it here.'
                : 'Open an application and it will appear here.'}
          </p>
          <Link to="/apps">
            Explore applications <i aria-hidden="true" className="bi bi-arrow-right" />
          </Link>
        </div>
      )}
      <div className="apps-home-bottom">
        <section className="apps-recent-section">
          <h3>
            <i aria-hidden="true" className="bi bi-clock-history" />
            Recently used
          </h3>
          <div className="apps-recent-list">
            {recent.length ? (
              recent.slice(0, 5).map((item) => {
                const app = appRegistry.find((app) => app.id === item.appId)!;
                return (
                  <Link key={app.id} to={item.path}>
                    <span className={`platform-app-icon tone-${app.tone}`}>
                      <i aria-hidden="true" className={`bi ${app.icon}`} />
                    </span>
                    <span>{app.title}</span>
                  </Link>
                );
              })
            ) : (
              <p className="apps-quiet">Your recently opened apps will appear here.</p>
            )}
          </div>
        </section>
        <section className="apps-actions-section">
          <h3>
            <i aria-hidden="true" className="bi bi-lightning-charge-fill" />
            Quick actions
          </h3>
          <div>
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <i aria-hidden="true" className={`bi ${action.icon}`} />
                {action.title}
              </Link>
            ))}
          </div>
          {!quickActions.length && <p className="apps-quiet">Open an app to access its tools.</p>}
        </section>
        <section className="apps-business-note">
          <span>
            <i aria-hidden="true" className="bi bi-stars" />
            Made for your next move.
          </span>
          <p>
            Less switching. More doing.
            <br />
            Everything your team needs, in one place.
          </p>
          <div className="apps-growth-art" aria-hidden="true">
            <i aria-hidden="true" className="bi bi-arrow-up-right" />
            <i aria-hidden="true" className="bi bi-arrow-up-right" />
            <i aria-hidden="true" className="bi bi-arrow-up-right" />
          </div>
        </section>
      </div>
      <footer className="apps-home-footer">
        <span>
          {organization.name} · {appName}
        </span>
        <span>Built around your business.</span>
      </footer>
    </section>
  );
}

function AppCard({
  app,
  user,
  favorite,
  onFavorite,
  recentPath,
}: {
  app: BusinessApp;
  user: CurrentUser;
  favorite: boolean;
  onFavorite: () => void;
  recentPath?: string;
}) {
  return (
    <article className={`apps-card tone-${app.tone} ${app.planned ? 'apps-card-planned' : ''}`}>
      {app.planned ? (
        <div className="apps-card-link" aria-label={`${app.title} — planned`}>
          <span className={`platform-app-icon tone-${app.tone}`}>
            <i aria-hidden="true" className={`bi ${app.icon}`} />
          </span>
          <span className="apps-card-copy">
            <strong>{app.title}</strong>
            <span>{app.description}</span>
            <small>Planned · Not yet available</small>
          </span>
        </div>
      ) : (
        <>
          <Link
            className="apps-card-link"
            to={recentPath ?? appPath(app)}
            aria-label={`Open ${app.title}`}
          >
            <span className={`platform-app-icon tone-${app.tone}`}>
              <i className={`bi ${app.icon}`} aria-hidden="true" />
            </span>
            <span className="apps-card-copy">
              <strong>{app.title}</strong>
              <span>{app.description}</span>
              <small>
                {appModules(app, user).length}{' '}
                {appModules(app, user).length === 1 ? 'workspace' : 'workspaces'}
              </small>
            </span>
            <i className="bi bi-chevron-right apps-card-arrow" aria-hidden="true" />
          </Link>
          <button
            className={`apps-favorite ${favorite ? 'is-favorite' : ''}`}
            aria-label={`${favorite ? 'Unpin' : 'Pin'} ${app.title}`}
            aria-pressed={favorite}
            type="button"
            onClick={onFavorite}
          >
            <i aria-hidden="true" className={`bi ${favorite ? 'bi-star-fill' : 'bi-star'}`} />
          </button>
        </>
      )}
    </article>
  );
}
