
import React, { useMemo } from 'react';
import { Zap, Wallet, Fuel, Plus, Clock, ArrowRight, Info } from 'lucide-react';
import { Expense, PaymentMethod } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RicaricheViewProps {
  onRefill: (type: 'flash' | 'revolut' | 'q8') => void;
  expenses: Expense[];
  currency?: string;
}

export const RicaricheView: React.FC<RicaricheViewProps> = ({ onRefill, expenses, currency = '€' }) => {
  // Calcolo dei saldi per ogni opzione
  const balances = useMemo(() => {
    const calculateBalance = (rechargeDesc: string, method: PaymentMethod) => {
      // Somma ricariche (entrate nel "portafoglio" specifico)
      const totalRecharged = expenses
        .filter(e => e.description.toLowerCase().includes(rechargeDesc.toLowerCase()))
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Somma spese (uscite dal "portafoglio" specifico)
      // Nota: escludiamo la ricarica stessa per non contare l'uscita due volte 
      // se la ricarica fosse marcata con lo stesso metodo (solitamente è pagata con contanti o banca)
      const totalSpent = expenses
        .filter(e => e.paymentMethod === method && !e.description.toLowerCase().includes('ricarica'))
        .reduce((sum, e) => sum + e.amount, 0);
      
      return Math.max(0, totalRecharged - totalSpent);
    };

    return {
      flash: calculateBalance('Ricarica Prepagata Flash', PaymentMethod.Flash),
      revolut: calculateBalance('Ricarica Prepagata Revolut', PaymentMethod.Revolut),
      q8: calculateBalance('Ricarica App Q8', PaymentMethod.AppQ8)
    };
  }, [expenses]);

  const refillExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes('ricarica')
    ).slice(0, 5);
  }, [expenses]);

  const formatBal = (val: number) => val.toLocaleString('it-IT', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">I tuoi Portafogli</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Monitora il saldo residuo e registra nuove ricariche.</p>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
          <Info size={12} />
          CALCOLO AUTOMATICO ATTIVO
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Prepagata Flash */}
        <div className="group bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-2 border-emerald-50 dark:border-gray-700 shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Zap size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Flash</p>
                <p className={`text-xl font-black ${balances.flash > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                  {currency}{formatBal(balances.flash)}
                </p>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Prepagata Flash</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Carta Intesa Sanpaolo</p>
          </div>
          <button 
            onClick={() => onRefill('flash')}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95"
          >
            <Plus size={16} />
            Ricarica
          </button>
        </div>

        {/* Card Revolut */}
        <div className="group bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-2 border-emerald-50 dark:border-gray-700 shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Wallet size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Revolut</p>
                <p className={`text-xl font-black ${balances.revolut > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                  {currency}{formatBal(balances.revolut)}
                </p>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-1">Revolut</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Conto Prepagato Estero</p>
          </div>
          <button 
            onClick={() => onRefill('revolut')}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95"
          >
            <Plus size={16} />
            Ricarica
          </button>
        </div>

        {/* Card App Q8 */}
        <div className="group bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border-2 border-emerald-50 dark:border-gray-700 shadow-sm transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Fuel size={24} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credito Q8</p>
                <p className={`text-xl font-black ${balances.q8 > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                  {currency}{formatBal(balances.q8)}
                </p>
              </div>
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-1">App Q8</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">Credito Carburante</p>
          </div>
          <button 
            onClick={() => onRefill('q8')}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95"
          >
            <Plus size={16} />
            Ricarica
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Ultime Ricariche</h3>
        </div>

        <div className="space-y-3">
          {refillExpenses.length > 0 ? (
            refillExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-500 shadow-sm">
                      <Plus size={18} />
                   </div>
                   <div>
                     <p className="font-bold text-gray-800 dark:text-white text-sm">{expense.description}</p>
                     <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tight">
                       {format(new Date(expense.date), 'dd MMMM yyyy', { locale: it })} • {expense.paymentMethod}
                     </p>
                   </div>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-400 dark:text-gray-500 text-sm">Nessuna ricarica registrata recentemente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
