
import React, { useState, useEffect } from 'react';
import { Category, Expense, PaymentMethod, WalletConfig } from '../types';
import { SmartCategorizer } from './SmartCategorizer';
import { Wallet, CreditCard, Banknote, Fuel, Loader2, Save, Repeat, Building } from 'lucide-react';

interface ExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id'>) => Promise<void> | void;
  onCancel: () => void;
  initialData?: Partial<Expense>;
  currency?: string;
  wallets: WalletConfig[];
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, onCancel, initialData, currency = '€', wallets }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.Altro);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Contanti);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubscription, setIsSubscription] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.description !== undefined) setDescription(initialData.description);
      if (initialData.amount !== undefined) setAmount(initialData.amount.toString());
      if (initialData.category !== undefined) setCategory(initialData.category);
      if (initialData.paymentMethod !== undefined) setPaymentMethod(initialData.paymentMethod);
      if (initialData.date !== undefined) setDate(initialData.date);
      if (initialData.isSubscription !== undefined) setIsSubscription(initialData.isSubscription);
    }
  }, [initialData]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) return;

    const cleanDesc = description.trim();
    if (!cleanDesc) {
      alert("La descrizione è obbligatoria.");
      return;
    }
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Inserisci un importo valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        description: cleanDesc,
        amount: parsedAmount,
        category,
        paymentMethod,
        date,
        isSubscription
      });
    } catch (err) {
      console.error("Errore salvataggio:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodLabel = (method: PaymentMethod) => {
    const wallet = wallets.find(w => w.method === method);
    return wallet ? wallet.name : method;
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    const wallet = wallets.find(w => w.method === method);
    if (wallet) {
      switch (wallet.icon) {
        case 'zap': return <Zap size={16} />;
        case 'fuel': return <Fuel size={16} />;
        case 'credit-card': return <CreditCard size={16} />;
        default: return <Wallet size={16} />;
      }
    }
    switch (method) {
      case PaymentMethod.Contanti: return <Banknote size={16} />;
      case PaymentMethod.Bancomat: return <Building size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  const Zap = ({size}: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;

  // Determiniamo quali metodi mostrare: Contanti, Bancomat + Portafogli Utente
  const visibleMethods = [
    PaymentMethod.Contanti,
    PaymentMethod.Bancomat,
    ...wallets.map(w => w.method)
  ];

  return (
    <div className="space-y-5">
      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Cosa hai comprato?</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="es. Netflix o Spesa"
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-medium"
            autoFocus
          />
          <SmartCategorizer description={description} onSuggest={setCategory} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Quanto ({currency})</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-emerald-400 transition-all outline-none font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Quando</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Opzioni Extra</label>
          <button
            type="button"
            onClick={() => setIsSubscription(!isSubscription)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
              isSubscription 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <Repeat size={18} />
              Contrassegna come Abbonamento
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isSubscription ? 'bg-emerald-500' : 'bg-gray-300'}`}>
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSubscription ? 'left-5' : 'left-1'}`}></div>
            </div>
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Metodo di Pagamento</label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {visibleMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex items-center justify-start gap-2 px-3 py-3 rounded-xl text-[10px] font-bold transition-all border-2 ${
                  paymentMethod === method 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-emerald-50 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-900'
                }`}
              >
                {getPaymentIcon(method)}
                <span className="truncate">{getMethodLabel(method)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Categoria</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
            {Object.values(Category).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  category === cat 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-emerald-50 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-emerald-200 dark:hover:border-emerald-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={onCancel} disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50">Annulla</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 dark:shadow-none disabled:opacity-70 flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salva</button>
        </div>
      </form>
    </div>
  );
};
