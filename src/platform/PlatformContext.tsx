import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { Branch, CurrentUser } from '../data/types';
import { useStockNavigationGuard } from '../hooks/StockNavigationGuard';
import {
  appForPath,
  canAccessPath,
  visibleApps,
  isCashierUser,
  isHotelSalesManagerUser,
} from './appRegistry';

export type RecentApp = { appId: string; path: string; visitedAt: string };
type Preferences = { branchId: string; favorites: string[]; recent: RecentApp[] };
type PlatformState = Preferences & {
  branches: Branch[];
  selectedBranch?: Branch;
  storageAvailable: boolean;
  changeBranch: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
};
const PlatformContext = createContext<PlatformState>({
  branchId: '',
  favorites: [],
  recent: [],
  branches: [],
  storageAvailable: true,
  changeBranch: async () => {},
  toggleFavorite: () => {},
});
export const usePlatform = () => useContext(PlatformContext);
export function inBranch<T extends { branchId?: string }>(items: T[], branchId: string) {
  return branchId ? items.filter((item) => !item.branchId || item.branchId === branchId) : items;
}
function load(key: string): Preferences {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? '{}');
    return {
      branchId: typeof data.branchId === 'string' ? data.branchId : '',
      favorites: Array.isArray(data.favorites)
        ? data.favorites.filter((id: unknown): id is string => typeof id === 'string')
        : [],
      recent: Array.isArray(data.recent)
        ? data.recent
            .filter(
              (item: Partial<RecentApp>) =>
                typeof item?.appId === 'string' &&
                typeof item.path === 'string' &&
                item.path.startsWith('/') &&
                typeof item.visitedAt === 'string',
            )
            .slice(0, 8)
        : [],
    };
  } catch {
    return { branchId: '', favorites: [], recent: [] };
  }
}
export function PlatformProvider({
  user,
  branches,
  children,
}: {
  user: CurrentUser;
  branches: Branch[];
  children: ReactNode;
}) {
  const key = `keen:platform:${user.organizationId}:${user.userId}`;
  const [preferences, setPreferences] = useState(() => load(key));
  const [storageAvailable, setStorageAvailable] = useState(true);
  const location = useLocation();
  const leaveGuard = useStockNavigationGuard();
  const authorizedBranches = useMemo(
    () =>
      branches.filter(
        (b) =>
          b.status === 'ACTIVE' &&
          ((!isCashierUser(user) && !isHotelSalesManagerUser(user) && !user.branchIds.length) ||
            user.branchIds.includes(b.id)),
      ),
    [branches, user],
  );
  const branchId = authorizedBranches.some((b) => b.id === preferences.branchId)
    ? preferences.branchId
    : authorizedBranches.length === 1
      ? authorizedBranches[0].id
      : '';
  const allowedApps = visibleApps(user);
  const allowedIds = new Set(allowedApps.map((app) => app.id));
  const favorites = preferences.favorites.filter((id) => allowedIds.has(id));
  const recent = preferences.recent.filter(
    (item) =>
      allowedIds.has(item.appId) &&
      appForPath(item.path)?.id === item.appId &&
      canAccessPath(user, item.path),
  );
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(preferences));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [key, preferences]);
  useEffect(() => {
    const app = appForPath(location.pathname);
    if (!app || !canAccessPath(user, location.pathname)) return;
    const path = location.pathname + location.search;
    setPreferences((previous) => {
      if (previous.recent[0]?.appId === app.id && previous.recent[0]?.path === path)
        return previous;
      return {
        ...previous,
        recent: [
          { appId: app.id, path, visitedAt: new Date().toISOString() },
          ...previous.recent.filter((item) => item.appId !== app.id),
        ].slice(0, 8),
      };
    });
  }, [location.pathname, location.search, user]);
  const changeBranch = useCallback(
    async (id: string) => {
      if (id && !authorizedBranches.some((b) => b.id === id)) return;
      if (id === branchId || !(await leaveGuard.confirmLeave())) return;
      setPreferences((previous) => ({ ...previous, branchId: id }));
    },
    [authorizedBranches, branchId, leaveGuard],
  );
  const toggleFavorite = useCallback((id: string) => {
    setPreferences((previous) => ({
      ...previous,
      favorites: previous.favorites.includes(id)
        ? previous.favorites.filter((item) => item !== id)
        : [...previous.favorites, id],
    }));
  }, []);
  return (
    <PlatformContext.Provider
      value={{
        branchId,
        favorites,
        recent,
        branches: authorizedBranches,
        selectedBranch: authorizedBranches.find((b) => b.id === branchId),
        storageAvailable,
        changeBranch,
        toggleFavorite,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}
