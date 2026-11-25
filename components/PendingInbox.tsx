import React, { useMemo, useState } from 'react';
import { Inbox, Check, Pencil, X, Loader2, AlertTriangle } from 'lucide-react';
import { Expense, PendingExpense, UserSettings } from '../types';
import { isForeignCurrency, suggestFor, PendingSuggestion } from '../utils/pendingSuggestions';

interface PendingInboxProps {
  items: PendingExpense[];
  expenses: Expense[];
  settings: UserSettings;
  onConfirm: (p: PendingExpense, s: PendingSuggestion) => Promise<void>;
  onEdit: (p: PendingExpense, s: PendingSuggestion) => void;
  onDismiss: (p: PendingExpense) => Promise<void>;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const PendingInbox: React.FC<PendingInboxProps> = ({ items, expenses, settings, onConfirm, onEdit, onDismiss }) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(
    () => items.map(p => ({ p, s: suggestFor(p, expenses, settings) })),
    [items, expenses, settings]
  );

  if (rows.length === 0) return null;

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try { await fn(); } finally { setBusyId(null); }
  };

  return (
    <section
      id="pending-inbox"
      className="scroll-mt-28 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-[2rem] p-5 md:p-6 space-y-4"
    >
      <h3 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <Inbox size={20} /> Da confermare
        <span className="bg-amber-500 text-white text-[11px] font-black rounded-full px-2 py-0.5">{rows.length}</span>
      </h3>

      <div className="space-y-3">
        {rows.map(({ p, s }) => {
          const refund = p.amount < 0;
          const foreign = isForeignCurrency(p, settings);
          const ready = !refund && !foreign && !!s.category && !!s.paymentMethod;
          const busy = busyId === p.id;
          return (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 dark:text-white truncate">{p.merchant}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatWhen(p.occurred_at)}{p.card ? ` · ${p.card}` : ''}
                  </p>
                </div>
                <p className={`shrink-0 font-black text-lg ${refund ? 'text-emerald-600' : 'text-gray-800 dark:text-white'}`}>
                  {refund ? '+' : ''}{Math.abs(p.amount).toFixed(2).replace('.', ',')} {foreign ? p.currency : settings.currency}
                </p>
              </div>

              {(refund || foreign) ? (
                <p className="mt-3 text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-px" />
                  {refund
                    ? 'È un rimborso: non lo registro come spesa. Scartalo e, se serve, aggiungilo a mano.'
                    : `Importo in ${p.currency}: controlla il cambio e inseriscilo a mano con "Modifica".`}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className={`px-2.5 py-1 rounded-lg ${s.category ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                    {s.category || 'Categoria da scegliere'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg ${s.walletName ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700'}`}>
                    {s.walletName || 'Portafoglio da scegliere'}
                  </span>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!refund && !foreign && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => ready ? run(p.id, () => onConfirm(p, s)) : onEdit(p, s)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {ready ? 'Conferma' : 'Completa'}
                  </button>
                )}
                {ready && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onEdit(p, s)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Pencil size={14} /> Modifica
                  </button>
                )}
                {foreign && !refund && (
                  <button
                    type="button"
                    onClick={() => onEdit(p, s)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <Pencil size={14} /> Modifica
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(p.id, () => onDismiss(p))}
                  className={`${refund ? 'flex-1' : ''} flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/10 text-xs font-bold hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50`}
                >
                  <X size={14} /> Scarta
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
