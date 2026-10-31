import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

type LeaveGuard = () => Promise<boolean>;
const StockNavigationContext = createContext({
  register: (_guard: LeaveGuard | null) => {},
  confirmLeave: async () => true,
});

export function StockNavigationProvider({ children }: { children: ReactNode }) {
  const guard = useRef<LeaveGuard | null>(null);
  const value = useMemo(
    () => ({
      register: (next: LeaveGuard | null) => {
        guard.current = next;
      },
      confirmLeave: () => (guard.current ? guard.current() : Promise.resolve(true)),
    }),
    [],
  );
  return (
    <StockNavigationContext.Provider value={value}>{children}</StockNavigationContext.Provider>
  );
}
export const useStockNavigationGuard = () => useContext(StockNavigationContext);
