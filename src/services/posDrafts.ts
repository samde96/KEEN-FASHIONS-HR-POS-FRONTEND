import type { CartLine } from '../data/types';
import { markOfflineStorageUnavailable } from './offline';

export type PosDraft = {
  cart: CartLine[];
  customer: string;
  checkoutKey: string;
  savedAt: number;
};

export function readPosDraft(key: string): PosDraft | undefined {
  if (!key) return undefined;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const draft = JSON.parse(raw) as PosDraft;
    if (
      !Array.isArray(draft.cart) ||
      !draft.cart.length ||
      !draft.cart.every(
        (line) =>
          typeof line.productId === 'string' &&
          Number.isSafeInteger(line.quantity) &&
          line.quantity > 0,
      ) ||
      typeof draft.customer !== 'string' ||
      typeof draft.checkoutKey !== 'string'
    )
      return undefined;
    return draft;
  } catch {
    markOfflineStorageUnavailable();
    return undefined;
  }
}

export function savePosDraft(key: string, draft: Omit<PosDraft, 'savedAt'>) {
  if (!key) return;
  try {
    if (draft.cart.length)
      localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
    else localStorage.removeItem(key);
  } catch {
    markOfflineStorageUnavailable();
  }
}
