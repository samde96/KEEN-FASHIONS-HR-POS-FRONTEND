import type { CurrentUser } from '../data/types';
import {
  accountKey,
  deviceDatabase,
  deviceTransaction,
  requestDurableStorage,
} from './deviceStore';
import { markOffline, unlockOfflineAccess } from './offline';

type Enrollment = {
  key: string;
  user: CurrentUser;
  salt: string;
  verifier: string;
  enrolledAt: number;
  failures: number;
  lockedUntil: number;
  iterations?: number;
};
// OWASP PBKDF2-HMAC-SHA256 work factor; retain the value with each enrollment.
const iterations = 600_000;
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
async function digest(password: string, salt: Uint8Array, rounds = iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as Uint8Array<ArrayBuffer>, iterations: rounds, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}
export async function enrollOfflineLogin(
  username: string,
  password: string,
  user: CurrentUser,
  enabled: boolean,
) {
  const key = accountKey(username);
  if (!enabled) {
    await deviceTransaction('accounts', (store, done) => {
      store.delete(key);
      done(undefined);
    });
    return;
  }
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const record: Enrollment = {
    key,
    user,
    salt: toBase64(salt),
    verifier: await digest(password, salt),
    enrolledAt: Date.now(),
    failures: 0,
    lockedUntil: 0,
    iterations,
  };
  await deviceTransaction('accounts', (store, done) => {
    store.put(record);
    done(undefined);
  });
  // The browser decides whether persistence is granted; backup/export remains available.
  await requestDurableStorage().catch(() => false);
}
export async function offlineLogin(username: string, password: string): Promise<CurrentUser> {
  const db = await deviceDatabase();
  const record = await new Promise<Enrollment | undefined>((resolve, reject) => {
    const req = db.transaction('accounts').objectStore('accounts').get(accountKey(username));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!record || Date.now() - record.enrolledAt > 30 * 86400_000)
    throw new Error(
      'Sign in online with Remember this device enabled first. Offline access lasts 30 days after an online sign-in.',
    );
  if (record.lockedUntil > Date.now())
    throw new Error('Too many incorrect offline passwords. Wait five minutes or sign in online.');
  const rounds = record.iterations ?? 210_000;
  if (![210_000, 600_000].includes(rounds))
    throw new Error('Sign in online to refresh this device’s saved credentials.');
  const candidate = await digest(password, fromBase64(record.salt), rounds);
  let mismatch = candidate.length ^ record.verifier.length;
  for (let i = 0; i < candidate.length; i++)
    mismatch |= candidate.charCodeAt(i) ^ (record.verifier.charCodeAt(i) || 0);
  const accepted = await deviceTransaction<boolean>('accounts', (store, done) => {
    const get = store.get(record.key);
    get.onsuccess = () => {
      const current = get.result as Enrollment | undefined;
      if (!current || current.verifier !== record.verifier || current.lockedUntil > Date.now()) {
        done(false);
        return;
      }
      const valid = mismatch === 0;
      current.failures = valid ? 0 : current.failures + 1;
      current.lockedUntil = current.failures >= 5 ? Date.now() + 5 * 60_000 : 0;
      if (current.failures >= 5) current.failures = 0;
      store.put(current);
      done(valid);
    };
  });
  if (!accepted) throw new Error('Offline sign-in failed. Check your email and password.');
  await unlockOfflineAccess(record.user, record.enrolledAt + 30 * 86400_000);
  markOffline();
  return record.user;
}
