import React, { useMemo } from 'react';
import { Expense } from '../types';
import { Repeat, Plus, Trash2, Calendar, CreditCard, ChevronRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

interface SubscriptionsViewProps {
  expenses: Expense[];
  onAddSub: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  currency: string;
  onSyncAll?: () => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ expenses, onAddSub, onEdit, onDelete, currency, onSyncAll }) => {
  const [itemToDelete, setItemToDelete] = React.useState<Expense | null>(null);
  const subscriptions = useMemo(() => {
    // Mostra solo gli abbonamenti che sono attivi (isSubscription: true O categoria Abbonamenti)
    // E che sono del mese corrente o futuri
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    return expenses.filter(e => {
      const isSub = e.isSubscription || e.category === 'Abbonamenti';
      if (!isSub) return false;
      
      const [y, m] = e.date.split('-').map(Number);
      const expenseMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      
      // Includi se è del mese corrente o futuro
      return expenseMonthStr >= currentMonthStr;
    });
  }, [expenses]);

  const hasPastSubscriptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    // Cerca tra TUTTE le spese (non solo quelle filtrate)
    // Cerchiamo abbonamenti dei mesi passati che non sono ancora stati portati al mese corrente
    const allSubs = expenses.filter(e => e.isSubscription || e.category === 'Abbonamenti');
    
    // Abbonamenti già presenti nel mese corrente
    const currentMonthSubsDescriptions = new Set(
      allSubs
        .filter(e => {
          const [y, m] = e.date.split('-').map(Number);
          return `${y}-${String(m).padStart(2, '0')}` === currentMonthStr;
        })
        .map(e => e.description.toLowerCase().trim())
    );

    // Controlla se c'è almeno un abbonamento passato che manca nel mese corrente
    return allSubs.some(s => {
      const [y, m] = s.date.split('-').map(Number);
      const expenseMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      
      // Se è del mese corrente o futuro, non ci interessa per questo check
      if (expenseMonthStr >= currentMonthStr) return false;

      // Se è passato, controlliamo se esiste già nel mese corrente
      return !currentMonthSubsDescriptions.has(s.description.toLowerCase().trim());
    });
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
          className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 mb-3"
        >
          <Plus size={20} /> Registra Nuovo Abbonamento
        </button>

        {hasPastSubscriptions && onSyncAll && (
          <button 
            onClick={onSyncAll}
            className="w-full bg-emerald-400/20 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400/30 transition-all active:scale-95 border border-white/20"
          >
            <Repeat size={18} /> Aggiorna al mese corrente
          </button>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-4">I tuoi abbonamenti attivi</h3>
        
        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-emerald-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white leading-tight">{sub.description}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <CreditCard size={10} /> {sub.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right mr-2">
                      <p className="font-black text-gray-800 dark:text-white text-lg leading-none">{currency}{sub.amount.toFixed(2)}</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Al mese</p>
                    </div>
                    <button 
                      onClick={() => onEdit(sub)}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-all active:bg-emerald-100"
                      title="Modifica abbonamento"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => setItemToDelete(sub)}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:bg-red-100"
                      title="Elimina abbonamento"
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

      {/* MODALE DI CONFERMA ELIMINAZIONE */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-emerald-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-red-500">
            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Elimina Abbonamento
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">
              Sei sicuro di voler eliminare l'abbonamento "{itemToDelete.description}"? L'azione è irreversibile.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  onDelete(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-red-600 transition-colors"
              >
                <Trash2 size={18} />
                Elimina
              </button>
              <button 
                onClick={() => setItemToDelete(null)}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};