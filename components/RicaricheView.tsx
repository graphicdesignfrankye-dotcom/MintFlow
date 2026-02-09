
import React, { useMemo } from 'react';
import { Zap, Wallet, Fuel, Plus, Clock, Info, CreditCard } from 'lucide-react';
import { Expense, PaymentMethod, WalletConfig } from '../types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RicaricheViewProps {
  onRefill: (wallet: WalletConfig) => void;
  expenses: Expense[];
  currency?: string;
  wallets: WalletConfig[];
}

export const RicaricheView: React.FC<RicaricheViewProps> = ({ onRefill, expenses, currency = '€', wallets }) => {
  const balances = useMemo(() => {
    return wallets.map(w => {
      const totalRecharged = expenses
        .filter(e => e.description.toLowerCase().includes(`ricarica ${w.name.toLowerCase()}`))
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalSpent = expenses
        .filter(e => e.paymentMethod === w.method && !e.description.toLowerCase().includes('ricarica'))
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        ...w,
        balance: Math.max(0, totalRecharged - totalSpent)
      };
    });
  }, [expenses, wallets]);

  const refillExpenses = useMemo(() => {
    return expenses.filter(e => 
      e.description.toLowerCase().includes('ricarica') || e.description.toLowerCase().includes('deposito')
    ).slice(0, 10);
  }, [expenses]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">I tuoi Portafogli</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Monitora i saldi e registra le ricariche.</p>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 uppercase tracking-widest">
          <Info size={12} /> Live Sync
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((w) => (
          <WalletCard 
            key={w.id}
            name={w.name} 
            balance={w.balance} 
            icon={w.icon === 'zap' ? <Zap size={20} /> : w.icon === 'fuel' ? <Fuel size={20} /> : w.icon === 'credit-card' ? <CreditCard size={20} /> : <Wallet size={20} />} 
            onRefill={() => onRefill(w)} 
            color={w.icon === 'zap' ? 'emerald' : w.icon === 'fuel' ? 'orange' : w.icon === 'credit-card' ? 'purple' : 'blue'} 
            currency={currency} 
          />
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Movimenti Portafogli</h3>
        </div>
        <div className="space-y-3">
          {refillExpenses.length > 0 ? (
            refillExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-500 shadow-sm"><Plus size={18} /></div>
                   <div>
                     <p className="font-bold text-gray-800 dark:text-white text-sm">{expense.description}</p>
                     <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-tight">
                       {format(new Date(expense.date), 'dd MMMM yyyy', { locale: it })} • {expense.paymentMethod}
                     </p>
                   </div>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
              </div>
            ))
          ) : (
            <div className="text-center py-10"><p className="text-gray-400 dark:text-gray-500 text-sm">Nessuna ricarica registrata.</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

const WalletCard = ({ name, balance, icon, onRefill, color, currency }: any) => {
  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-50 dark:border-gray-700 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[100px]">{name}</p>
          <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{currency}{balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <button onClick={onRefill} className="mt-auto w-full flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-bold transition-all shadow-md">
        <Plus size={14} /> RICARICA
      </button>
    </div>
  );
};
