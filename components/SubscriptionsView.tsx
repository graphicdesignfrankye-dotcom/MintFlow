
import React, { useMemo } from 'react';
import { Expense } from '../types';
import { Repeat, Plus, Trash2, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SubscriptionsViewProps {
  expenses: Expense[];
  onAddSub: () => void;
  onDelete: (id: string) => void;
  currency: string;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ expenses, onAddSub, onDelete, currency }) => {
  const subscriptions = useMemo(() => {
    return expenses.filter(e => e.isSubscription || e.category === 'Abbonamenti');
  }, [expenses]);

  const monthlyTotal = subscriptions.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-emerald-50 text-xs font-bold uppercase tracking-widest mb-1">Costo Mensile Fisso</p>
            <h2 className="text-4xl font-black">{currency}{monthlyTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h2>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <Repeat size={32} />
          </div>
        </div>
        <button 
          onClick={onAddSub}
          className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
        >
          <Plus size={20} /> Registra Nuovo Abbonamento
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-4">I tuoi abbonamenti attivi</h3>
        
        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-emerald-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white leading-tight">{sub.description}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <CreditCard size={10} /> {sub.paymentMethod}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Ricorrente</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-black text-gray-800 dark:text-white text-lg">{currency}{sub.amount.toFixed(2)}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Al mese</p>
                  </div>
                  <button 
                    onClick={() => onDelete(sub.id)}
                    className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400 font-medium">Nessun abbonamento registrato.</p>
          </div>
        )}
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50">
        <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
          <ChevronRight size={16} /> Lo sapevi?
        </h4>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 leading-relaxed">
          Gli abbonamenti vengono sommati automaticamente al tuo totale mensile. MintFlow ti avviserà se il costo degli abbonamenti supera il 20% del tuo budget mensile.
        </p>
      </div>
    </div>
  );
};
