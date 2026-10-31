import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../services/api';
import {
  discardStockDraft,
  getPosPreferences,
  getStockDrafts,
  saveStockDraft,
} from '../services/posOperations';
import type { StockDraft } from '../services/posOperations';
import type { StockIntakeRequest } from '../data/types';
import { queueStockReceipt } from '../services/offlineOperations';
import { useStockNavigationGuard } from './StockNavigationGuard';
import {
  isOfflineError,
  markOfflineStorageUnavailable,
  offlineOwnerKey,
} from '../services/offline';
import {
  defaultStockInactivityMinutes,
  formatStockInactivity,
} from '../services/stockReminderInterval';

export type StockSession = {
  startedAt: number;
  lastActivityAt: number;
  inactivityShown: boolean;
  longShown: boolean;
};
export function nextStockReminder(
  session: StockSession,
  now: number,
  idleMinutes: number,
  longMinutes: number,
  busy: boolean,
) {
  if (busy) return null;
  const inactiveFor = now - session.lastActivityAt;
  if (!session.inactivityShown && inactiveFor >= idleMinutes * 60_000) return 'idle';
  if (
    !session.longShown &&
    inactiveFor <= 60_000 &&
    now - session.startedAt >= longMinutes * 60_000
  )
    return 'long';
  return null;
}

export default function useStockEntry<
  TForm extends { branchId: string },
  TLine extends StockIntakeRequest,
>({
  form,
  lines,
  busy,
  restore,
  clear,
  draftBranchId,
}: {
  form: TForm;
  lines: TLine[];
  busy: boolean;
  restore: (form: TForm, lines: TLine[]) => void;
  clear: () => void;
  draftBranchId?: string;
}) {
  const client = useQueryClient();
  const user = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });
  const preferences = useQuery({
    queryKey: ['pos-preferences'],
    queryFn: getPosPreferences,
    retry: false,
  });
  const drafts = useQuery({
    queryKey: ['stock-drafts'],
    queryFn: () => getStockDrafts<TForm, TLine>(),
    retry: false,
  });
  const [id, setId] = useState<string>(() => crypto.randomUUID());
  const idRef = useRef(id);
  const version = useRef(0);
  const saved = useRef(false);
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSaves = useRef(0);
  const session = useRef<StockSession | null>({
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    inactivityShown: false,
    longShown: false,
  });
  const [dirty, setDirty] = useState(false);
  const [reminder, setReminder] = useState<'idle' | 'long' | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState<StockDraft<TForm, TLine>>();
  const visibleDrafts = (drafts.data ?? []).filter(
    (draft) => !draftBranchId || draft.branchId === draftBranchId,
  );
  const canRecover = recovery && (!draftBranchId || recovery.branchId === draftBranchId);
  const inactivityMinutes = preferences.data?.inactivityMinutes ?? defaultStockInactivityMinutes;
  const overdueDrafts = visibleDrafts.filter(
    (draft) =>
      !(dirty && draft.id === id) &&
      Date.now() - new Date(draft.updatedAt).getTime() >= inactivityMinutes * 60_000,
  );
  const latest = useRef({ form, lines, dirty, busy });
  latest.current = { form, lines, dirty, busy };
  const localKey = user.data
    ? `keen-stock-draft:${offlineOwnerKey(user.data)}:${draftBranchId || form.branchId || 'unassigned'}`
    : '';
  const legacyLocalKey = user.data
    ? `keen-stock-draft:${user.data.organizationId}:${user.data.userId}`
    : '';
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  const navigation = useStockNavigationGuard();
  const pendingExit = useRef<((value: boolean) => void) | null>(null);
  const [externalExit, setExternalExit] = useState(false);
  useEffect(() => {
    navigation.register(() => {
      if (!latest.current.dirty) return Promise.resolve(true);
      if (latest.current.busy) {
        setError('Wait for the stock operation to finish before signing out.');
        return Promise.resolve(false);
      }
      setExternalExit(true);
      return new Promise<boolean>((resolve) => {
        pendingExit.current = resolve;
      });
    });
    return () => {
      navigation.register(null);
      pendingExit.current?.(false);
    };
  }, [navigation]);
  function proceedExit(leave: boolean) {
    if (externalExit) {
      if (leave) {
        setDirty(false);
        session.current = null;
      }
      pendingExit.current?.(leave);
      pendingExit.current = null;
      setExternalExit(false);
    } else if (blocker.state === 'blocked') {
      if (leave) blocker.proceed();
      else blocker.reset();
    }
  }

  useEffect(() => {
    if (!localKey) return;
    try {
      let value = localStorage.getItem(localKey);
      if (!value && legacyLocalKey) {
        const legacy = localStorage.getItem(legacyLocalKey);
        const draft = legacy ? (JSON.parse(legacy) as StockDraft<TForm, TLine>) : undefined;
        if (draft && draft.branchId === (draftBranchId || form.branchId)) {
          localStorage.setItem(localKey, legacy!);
          localStorage.removeItem(legacyLocalKey);
          value = legacy;
        }
      }
      setRecovery(value ? JSON.parse(value) : undefined);
    } catch {
      setError('Local recovery could not be read. Server drafts are still available.');
    }
  }, [localKey, legacyLocalKey, draftBranchId, form.branchId]);

  function interact(changed = false) {
    if (latest.current.busy) return;
    const now = Date.now();
    if (!session.current)
      session.current = {
        startedAt: now,
        lastActivityAt: now,
        inactivityShown: false,
        longShown: false,
      };
    else session.current.lastActivityAt = now;
    if (changed) setDirty(true);
  }

  function save() {
    const data = latest.current;
    const operationId = idRef.current;
    const task = saving.current
      .catch(() => undefined)
      .then(async () => {
        pendingSaves.current += 1;
        try {
          const result = await saveStockDraft(
            operationId,
            data.form.branchId,
            data.form,
            data.lines,
            version.current,
          );
          if (idRef.current === operationId) {
            version.current = result.version;
            saved.current = true;
            setStatus('Draft saved. Stock has not been received.');
            setError('');
          }
          void client.invalidateQueries({ queryKey: ['stock-drafts'] });
          return result;
        } catch (caughtError) {
          if (!isOfflineError(caughtError) || !localKey) throw caughtError;
          const local: StockDraft<TForm, TLine> = {
            id: operationId,
            branchId: data.form.branchId,
            status: 'DRAFT',
            payload: { form: data.form, lines: data.lines },
            version: version.current,
            createdAt: new Date(session.current?.startedAt ?? Date.now()).toISOString(),
            updatedAt: new Date().toISOString(),
          };
          // Keep the last server version: an offline save is not a server update.
          try {
            localStorage.setItem(localKey, JSON.stringify(local));
          } catch {
            markOfflineStorageUnavailable();
            throw new Error(
              'This draft could not be saved on the device. Keep the page open until you can save online.',
            );
          }
          if (idRef.current === operationId) {
            setStatus(
              'Draft saved on this device. You can receive stock offline; it will synchronize when connected.',
            );
            setError('');
          }
          return local;
        } finally {
          pendingSaves.current -= 1;
        }
      });
    saving.current = task;
    return task;
  }
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!dirty || !localKey || !form.branchId) return;
    const local = {
      id,
      branchId: form.branchId,
      status: 'DRAFT',
      payload: { form, lines },
      version: version.current,
      createdAt: new Date(session.current?.startedAt ?? Date.now()).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(localKey, JSON.stringify(local));
    } catch {
      markOfflineStorageUnavailable();
      setError('Local storage is unavailable. Save a server draft before leaving.');
    }
    if (busy) return;
    const timeout = window.setTimeout(() => {
      void saveRef
        .current()
        .catch((e) =>
          setError(
            `Autosave failed: ${e instanceof Error ? e.message : 'connection unavailable'}. Your entries are still on this device.`,
          ),
        );
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [dirty, localKey, id, form, lines, busy]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!session.current) return;
      if (latest.current.busy || pendingSaves.current > 0) {
        session.current.lastActivityAt = Date.now();
        return;
      }
      const next = nextStockReminder(
        session.current,
        Date.now(),
        preferences.data?.inactivityMinutes ?? defaultStockInactivityMinutes,
        preferences.data?.longEntryMinutes ?? 10,
        false,
      );
      if (next === 'idle') session.current.inactivityShown = true;
      if (next === 'long') session.current.longShown = true;
      if (next) setReminder(next);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [preferences.data?.inactivityMinutes, preferences.data?.longEntryMinutes]);

  function reset() {
    session.current = null;
    setDirty(false);
    setReminder(null);
    setRecovery(undefined);
    setStatus('');
    if (localKey) {
      try {
        localStorage.removeItem(localKey);
      } catch {
        /* server draft remains available */
      }
    }
    const next = crypto.randomUUID();
    idRef.current = next;
    setId(next);
    version.current = 0;
    saved.current = false;
  }
  async function complete() {
    // Preserve the operation ID across retries, including a lost completion response.
    await saving.current.catch(() => undefined);
    const data = latest.current;
    const result = await queueStockReceipt(
      idRef.current,
      data.form.branchId,
      data.form,
      data.lines,
      version.current,
    );
    reset();
    void client.invalidateQueries({ queryKey: ['stock-drafts'] });
    return result;
  }
  async function discard() {
    await saving.current.catch(() => undefined);
    if (!saved.current && latest.current.form.branchId) await save();
    if (saved.current) await discardStockDraft(idRef.current);
    reset();
    void client.invalidateQueries({ queryKey: ['stock-drafts'] });
  }
  function resume(draft: StockDraft<TForm, TLine>) {
    if (dirty) {
      setError('Save or discard the current entry before resuming another draft.');
      return;
    }
    idRef.current = draft.id;
    setId(draft.id);
    version.current = draft.version;
    saved.current = Boolean(drafts.data?.some((d) => d.id === draft.id));
    restore(draft.payload.form, draft.payload.displayLines ?? draft.payload.lines);
    session.current = {
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      inactivityShown: false,
      longShown: false,
    };
    setDirty(true);
    setRecovery(undefined);
    setError('');
    setStatus('Draft resumed. Review entries before posting.');
  }
  const perform = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update draft');
    }
  };
  const controls = (
    <div className="stock-entry-monitor">
      {overdueDrafts.length > 0 && (
        <p className="message-banner" role="status">
          {overdueDrafts.length} unfinished stock{' '}
          {overdueDrafts.length === 1 ? 'draft has' : 'drafts have'} had no updates for at least{' '}
          {formatStockInactivity(inactivityMinutes)}. Resume the saved entries below when ready.
        </p>
      )}
      {reminder && (
        <div className="message-banner" role="status">
          <span>
            {reminder === 'idle'
              ? `You have been inactive during stock entry for ${formatStockInactivity(preferences.data?.inactivityMinutes ?? defaultStockInactivityMinutes)}. Would you like to continue?`
              : 'Stock entry is taking longer than expected. Please review your entries and save when ready.'}
          </span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setReminder(null);
              interact();
            }}
          >
            Continue entering stock
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setReminder(null);
              document
                .querySelector('.supplier-invoice-panel')
                ?.scrollIntoView?.({ behavior: 'smooth' });
            }}
          >
            Review entries
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="message-banner error">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      <div className="operations-controls">
        <button
          className="secondary-action compact-action"
          type="button"
          disabled={!dirty || busy}
          onClick={() => void perform(save)}
        >
          Save stock draft
        </button>
        <button
          className="text-button danger-text"
          type="button"
          disabled={!dirty || busy}
          onClick={() => {
            if (window.confirm('Discard this stock operation and all entered lines?'))
              void perform(async () => {
                await discard();
                clear();
              });
          }}
        >
          Discard operation
        </button>
      </div>
      {(canRecover || visibleDrafts.length > 0) && (
        <details>
          <summary>Resume a saved stock draft</summary>
          {canRecover && recovery && (
            <button
              className="text-button"
              type="button"
              disabled={dirty || busy}
              onClick={() => {
                const server = drafts.data?.find((d) => d.id === recovery.id);
                resume(
                  server && new Date(server.updatedAt) > new Date(recovery.updatedAt)
                    ? server
                    : { ...recovery, version: server?.version ?? recovery.version },
                );
              }}
            >
              Recover entries from this device
            </button>
          )}
          {visibleDrafts.map((draft) => (
            <div key={draft.id}>
              <button
                className="text-button"
                type="button"
                disabled={dirty || busy}
                onClick={() => resume(draft)}
              >
                Resume {new Date(draft.updatedAt).toLocaleString()} — {draft.payload.lines.length}{' '}
                lines
                {overdueDrafts.some((entry) => entry.id === draft.id) ? ' — Needs attention' : ''}
              </button>
              <button
                className="text-button danger-text"
                type="button"
                disabled={busy || draft.id === id}
                onClick={() => {
                  if (window.confirm('Discard this saved draft?'))
                    void perform(async () => {
                      await discardStockDraft(draft.id);
                      await client.invalidateQueries({ queryKey: ['stock-drafts'] });
                    });
                }}
              >
                Discard draft
              </button>
            </div>
          ))}
        </details>
      )}
      {(blocker.state === 'blocked' || externalExit) && (
        <div className="dialog-backdrop">
          <section
            className="panel-card operations-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Unsaved stock changes"
          >
            <h2>You have unsaved stock changes</h2>
            <p>Save as a draft or discard them before leaving.</p>
            <div className="operations-controls">
              <button
                className="primary-action compact-action"
                disabled={busy}
                type="button"
                onClick={() =>
                  void perform(async () => {
                    await save();
                    proceedExit(true);
                  })
                }
              >
                Save draft and leave
              </button>
              <button
                className="secondary-action compact-action"
                disabled={busy}
                type="button"
                onClick={() => {
                  if (window.confirm('Discard these stock changes?'))
                    void perform(async () => {
                      await discard();
                      proceedExit(true);
                    });
                }}
              >
                Discard and leave
              </button>
              <button className="text-button" type="button" onClick={() => proceedExit(false)}>
                Continue entering stock
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
  return {
    controls,
    interact,
    complete,
    dirty,
    markChanged: () => {
      interact(true);
    },
  };
}
