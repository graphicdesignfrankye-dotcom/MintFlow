import React, { useState } from 'react';
import { Expense, PaymentMethod, WalletConfig } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trash2, Plus, X, Check, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

interface ExtraViewProps {
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, 'id'>) => Promise<void>;
  onDelete: (id: string) => void;
  currency: string;
  wallets: WalletConfig[];
  currentProfile: string;
}

export const ExtraView: React.FC<ExtraViewProps> = ({ expenses, onAdd, onDelete, currency, wallets, currentProfile }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [transactionType, setTransactionType] = useState<'given' | 'received'>('given');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Contanti);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);

  // Calcolo saldo Extra
  const totalGiven = expenses.filter(e => e.extraType === 'given').reduce((acc, curr) => acc + curr.amount, 0);
  const totalReceived = expenses.filter(e => e.extraType === 'received').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalReceived - totalGiven;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        description: description,
        amount: parseFloat(amount.replace(',', '.')),
        category: 'Extra',
        paymentMethod,
        date: new Date().toISOString().split('T')[0],
        isExtra: true,
        extraType: transactionType,
        profile: currentProfile as any
      });
      setIsAdding(false);
      setDescription('');
      setAmount('');
      setPaymentMethod(PaymentMethod.Contanti);
    } catch (err) {
      alert("Errore nel salvataggio");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Balance Card - Updated to match Dashboard style (Emerald) */}
      <div className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200/50 dark:shadow-none relative overflow-hidden">
        <div className="flex justify-between items-start z-10 relative">
          <div>
            <p className="text-emerald-50 text-xs font-bold uppercase tracking-widest mb-1">Saldo Extra</p>
            <h2 className="text-4xl font-black">{balance >= 0 ? '+' : ''}{currency}{balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h2>
            <div className="flex gap-4 mt-4 text-xs font-medium opacity-80">
              <span className="bg-white/20 px-2 py-1 rounded-lg">Dati: {currency}{totalGiven.toFixed(2)}</span>
              <span className="bg-white/20 px-2 py-1 rounded-lg">Ricevuti: {currency}{totalReceived.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => { setTransactionType('given'); setIsAdding(true); }}
          className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:border-red-200 transition-all active:scale-95"
        >
          <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm"><ArrowUpRight size={20} /></div>
          <span className="text-sm">Ho Dato</span>
        </button>
        <button 
          onClick={() => { setTransactionType('received'); setIsAdding(true); }}
          className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 border-2 border-transparent hover:border-emerald-200 transition-all active:scale-95"
        >
          <div className="bg-white dark:bg-gray-800 p-2 rounded-full shadow-sm"><ArrowDownLeft size={20} /></div>
          <span className="text-sm">Ho Ricevuto</span>
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-4">Movimenti Extra</h3>
        {expenses.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {expenses.map((expense) => (
              <div key={expense.id} className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    expense.extraType === 'given' 
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30' 
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'
                  }`}>
                    {expense.extraType === 'given' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">{expense.description}</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">{format(new Date(expense.date), 'dd MMM yyyy', { locale: it })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${expense.extraType === 'given' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {expense.extraType === 'given' ? '-' : '+'}{currency}{expense.amount.toFixed(2)}
                  </span>
                  <button onClick={() => setItemToDelete(expense)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Info className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-400 font-medium text-sm">Nessun movimento extra.</p>
          </div>
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            
            <h3 className={`text-xl font-bold mb-6 ${transactionType === 'given' ? 'text-red-500' : 'text-emerald-500'}`}>
              {transactionType === 'given' ? 'A chi hai dato soldi?' : 'Da chi hai ricevuto soldi?'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrizione</label>
                <input 
                  autoFocus
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={transactionType === 'given' ? "Prestito a Marco..." : "Regalo nonna..."}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white font-medium"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Importo</label>
                <input 
                  type="number" 
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white font-black text-2xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Metodo di Pagamento</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                  {[PaymentMethod.Bancomat, ...wallets.map(w => w.method)].map((m) => (
                    <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${paymentMethod === m ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 border-indigo-50 dark:border-gray-700 text-gray-500'}`}>
                      <span className="truncate">{wallets.find(w => w.method === m)?.name || m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all mt-4 ${
                   transactionType === 'given' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} Salva
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DI CONFERMA ELIMINAZIONE */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-emerald-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-red-500">
            <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Elimina Movimento
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">
              Sei sicuro di voler eliminare questo movimento "{itemToDelete.description}"? L'azione è irreversibile.
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