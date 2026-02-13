import React, { useMemo, useState } from 'react';
import { Zap, Wallet, Fuel, Plus, Clock, Info, CreditCard, Edit2, X, Check, Loader2, Banknote } from 'lucide-react';
import { Expense, PaymentMethod, WalletConfig } from '../types';
import { format, isBefore, startOfToday, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface RicaricheViewProps {
  onRefill: (wallet: WalletConfig) => void;
  onSaveExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  expenses: Expense[];
  currency?: string;
  wallets: WalletConfig[];
}

export const RicaricheView: React.FC<RicaricheViewProps> = ({ onRefill, onSaveExpense, expenses, currency = '€', wallets }) => {
  const [editingWallet, setEditingWallet] = useState<WalletConfig | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const balances = useMemo(() => {
    const today = startOfToday();
    
    return wallets.map(w => {
      // Ricariche (entrate) + Aggiustamenti Positivi
      const totalRecharged = expenses
        .filter(e => {
          const desc = e.description.toLowerCase();
          const name = w.name.toLowerCase();
          const isInflow = desc.includes(`ricarica ${name}`) || desc.includes(`aggiustamento ${name}`);
          return isInflow && e.paymentMethod !== w.method;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Spese (uscite) - Vengono scalate SOLO se la data è OGGI o FUTURA
      const totalSpent = expenses
        .filter(e => {
          const isWalletMethod = e.paymentMethod === w.method;
          const isNotRefill = !e.description.toLowerCase().includes('ricarica');
          const expenseDate = parseISO(e.date);
          // Se la data è prima di oggi, non scaliamo il saldo (richiesta utente)
          const isNotPast = !isBefore(expenseDate, today);
          
          return isWalletMethod && isNotRefill && isNotPast;
        })
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

  const handleEditClick = (wallet: WalletConfig) => {
    const current = balances.find(b => b.id === wallet.id)?.balance || 0;
    setNewBalance(current.toFixed(2));
    setEditingWallet(wallet);
  };

  const handleBalanceUpdate = async () => {
    if (!editingWallet) return;
    const target = parseFloat(newBalance.replace(',', '.'));
    if (isNaN(target) || target < 0) {
      alert("Inserisci un importo valido");
      return;
    }

    const current = balances.find(b => b.id === editingWallet.id)?.balance || 0;
    const diff = target - current;

    if (Math.abs(diff) < 0.01) {
      setEditingWallet(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const isPositive = diff > 0;
      
      // Logica intelligente per la fonte dell'aggiustamento:
      // Se sto aggiungendo soldi ai contanti, la fonte è "Bancomat" (prelievo)
      // Se sto aggiungendo a un wallet elettronico, la fonte è "Contanti" (versamento)
      let sourceMethod = editingWallet.method === PaymentMethod.Contanti ? PaymentMethod.Bancomat : PaymentMethod.Contanti;
      
      await onSaveExpense({
        description: `Aggiustamento ${editingWallet.name}`,
        amount: Math.abs(diff),
        category: 'Altro',
        paymentMethod: isPositive ? sourceMethod : editingWallet.method,
        date: format(new Date(), 'yyyy-MM-dd'),
        isSubscription: false
      });
      setEditingWallet(null);
    } catch (err: any) {
      alert("Errore aggiornamento: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWalletIcon = (w: WalletConfig) => {
    if (w.method === PaymentMethod.Contanti) return <Banknote size={20} />;
    if (w.icon === 'zap') return <Zap size={20} />;
    if (w.icon === 'fuel') return <Fuel size={20} />;
    if (w.icon === 'credit-card') return <CreditCard size={20} />;
    return <Wallet size={20} />;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">I tuoi Portafogli</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Le spese passate non influenzano il saldo residuo.</p>
        </div>
        <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 uppercase tracking-widest">
          <Info size={12} /> Smart Balance
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((w) => (
          <WalletCard 
            key={w.id}
            name={w.name} 
            balance={w.balance} 
            icon={getWalletIcon(w)} 
            onRefill={() => onRefill(w)} 
            onEdit={() => handleEditClick(w)}
            color={w.method === PaymentMethod.Contanti ? 'emerald' : w.icon === 'zap' ? 'emerald' : w.icon === 'fuel' ? 'orange' : w.icon === 'credit-card' ? 'purple' : 'blue'} 
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

      {editingWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">Modifica Saldo</h3>
              <button onClick={() => setEditingWallet(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl mb-6 flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-xl text-emerald-500 shadow-sm">
                {getWalletIcon(editingWallet)}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Portafoglio</p>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{editingWallet.name}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nuovo Saldo Attuale</label>
              <input 
                autoFocus
                type="number" 
                inputMode="decimal"
                value={newBalance} 
                onChange={(e) => setNewBalance(e.target.value)} 
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-black text-2xl" 
              />
              <p className="text-[10px] text-gray-400 mt-2 ml-1">*Verrà creata una transazione di aggiustamento</p>
            </div>

            <button 
              onClick={handleBalanceUpdate}
              disabled={isSubmitting}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-emerald-600 transition-colors"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />} Salva Saldo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const WalletCard = ({ name, balance, icon, onRefill, onEdit, color, currency }: any) => {
  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
  };
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-50 dark:border-gray-700 shadow-sm flex flex-col h-full relative group">
      <button 
        onClick={onEdit} 
        className="absolute top-4 right-4 p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        title="Modifica saldo manualmente"
      >
        <Edit2 size={16} />
      </button>

      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color as keyof typeof colorClasses]}`}>{icon}</div>
        <div className="text-right pr-2">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[100px]">{name}</p>
          <p className="text-lg font-black text-gray-800 dark:text-white leading-none">{currency}{balance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
      <button onClick={onRefill} className="mt-auto w-full flex items-center justify-center gap-1.5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-bold transition-all shadow-md active:scale-95">
        <Plus size={14} /> {name.toUpperCase() === 'CONTANTI' ? 'PRELIEVO' : 'RICARICA'}
      </button>
    </div>
  );
};
