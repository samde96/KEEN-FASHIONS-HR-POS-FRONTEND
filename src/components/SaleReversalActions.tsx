import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../services/api';
import { getSaleReversals, reverseSale } from '../services/posOperations';
import type { Sale } from '../data/types';

export default function SaleReversalActions({ sale }: { sale: Sale }) {
  const client = useQueryClient();
  const user = useQuery({ queryKey: ['me'], queryFn: getCurrentUser });
  const admin = user.data?.roleKeys.includes('ADMIN');
  const reversals = useQuery({
    queryKey: ['sale-reversals'],
    queryFn: getSaleReversals,
    enabled: Boolean(admin),
    retry: false,
  });
  const [kind, setKind] = useState<'REFUND' | 'CANCELLATION'>();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => reverseSale(sale.id, kind!, reason),
    onSuccess: async () => {
      setKind(undefined);
      setReason('');
      await Promise.all(
        ['sale-reversals', 'inventory', 'products', 'sales'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
  if (!admin) return null;
  if (sale.syncStatus === 'pending')
    return <span className="table-subtext">Sync before refunding</span>;
  const reversal = reversals.data?.find((r) => r.sale_id === sale.id);
  if (reversal)
    return (
      <span className="table-subtext">
        {reversal.kind === 'REFUND' ? 'Refunded' : 'Cancelled'} — {reversal.reason}
      </span>
    );
  return (
    <>
      <button
        className="text-button"
        type="button"
        disabled={!reversals.isSuccess}
        onClick={() => setKind('REFUND')}
      >
        Refund
      </button>
      <button
        className="text-button danger-text"
        type="button"
        disabled={!reversals.isSuccess}
        onClick={() => setKind('CANCELLATION')}
      >
        Cancel sale
      </button>
      {kind && (
        <div className="dialog-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Confirm sale reversal"
            className="panel-card operations-panel"
          >
            <h2>
              {kind === 'REFUND' ? 'Refund' : 'Cancel'} {sale.saleNumber}
            </h2>
            <p>
              This reverses the full sale of {sale.totalAmount} and returns all sold quantities to
              their original shop and variants. Confirm the payment return before recording the
              reversal.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <label className="field-stack">
                <span>Reason</span>
                <textarea
                  required
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {mutation.error && <p role="alert">{mutation.error.message}</p>}
              <div className="operations-controls">
                <button
                  className="primary-action compact-action"
                  disabled={mutation.isPending || !reason.trim()}
                  type="submit"
                >
                  Confirm reversal
                </button>
                <button
                  className="secondary-action compact-action"
                  disabled={mutation.isPending}
                  type="button"
                  onClick={() => setKind(undefined)}
                >
                  Keep sale
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
