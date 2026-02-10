
import React, { useState, useEffect } from 'react';
import { CategoryConfig, Expense, PaymentMethod, WalletConfig } from '../types';
import { SmartCategorizer } from './SmartCategorizer';
import { Loader2, Save, Repeat, Building, CreditCard, Banknote, Fuel, AlertTriangle, Check, Zap, Copy } from 'lucide-react';
import { isSameMonth, isAfter, startOfMonth, parseISO, startOfToday } from 'date-fns';

interface ExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id'>) => Promise<void> | void;
  onCancel: () => void;
  initialData?: Partial<Expense>;
  currency?: string;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  expenses?: Expense[];
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData, 
  currency = '€', 
  wallets, 
  categories,
  expenses
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Contanti);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubscription, setIsSubscription] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Stato per il modale di conferma personalizzato
  const [showConfirmModal, setShowConfirmModal] = useState<{show: boolean, type: 'future' | 'past' | 'duplicate' | null}>({
    show: false,
    type: null
  });

  useEffect(() => {
    if (initialData) {
      if (initialData.description !== undefined) setDescription(initialData.description);
      if (initialData.amount !== undefined) setAmount(initialData.amount.toString());
      if (initialData.category !== undefined) setCategory(initialData.category);
      if (initialData.paymentMethod !== undefined) setPaymentMethod(initialData.paymentMethod);
      if (initialData.date !== undefined) setDate(initialData.date);
      if (initialData.isSubscription !== undefined) setIsSubscription(initialData.isSubscription || false);
    } else {
      setCategory(categories[categories.length - 1]?.name || 'Altro');
    }
  }, [initialData, categories]);

  const validateAndProcess = () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Inserisci un importo valido");
      return;
    }

    const selectedDate = parseISO(date);
    const today = startOfToday();

    // Controllo Duplicati
    if (expenses) {
      const isDuplicate = expenses.some(e => 
        e.id !== initialData?.id && // Ignora se stessi in caso di modifica
        e.amount === parsedAmount && 
        e.date === date && 
        e.description.toLowerCase().trim() === description.toLowerCase().trim()
      );

      if (isDuplicate) {
        setShowConfirmModal({ show: true, type: 'duplicate' });
        return;
      }
    }

    // Controllo data futura: Qualsiasi data strettamente successiva ad oggi
    if (isAfter(selectedDate, today)) {
      setShowConfirmModal({ show: true, type: 'future' });
      return;
    }

    // Controllo data passata (mesi precedenti)
    const startOfThisMonth = startOfMonth(today);
    if (!isSameMonth(selectedDate, today) && selectedDate < startOfThisMonth) {
      setShowConfirmModal({ show: true, type: 'past' });
      return;
    }

    executeSubmit();
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    try {
      await onSubmit({
        description: description.trim() || 'Spesa senza nome',
        amount: parsedAmount,
        category: category || 'Altro',
        paymentMethod,
        date,
        isSubscription
      });
    } catch (err: any) {
      console.error("Errore salvataggio:", err);
      alert("Errore: " + err.message);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal({ show: false, type: null });
    }
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    const wallet = wallets.find(w => w.method === method);
    if (wallet) return wallet.icon === 'zap' ? <Zap size={16} /> : wallet.icon === 'fuel' ? <Fuel size={16} /> : <CreditCard size={16} />;
    return method === PaymentMethod.Contanti ? <Banknote size={16} /> : <Building size={16} />;
  };

  return (
    <div className="relative">
      <form onSubmit={(e) => { e.preventDefault(); validateAndProcess(); }} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrizione</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Cosa hai acquistato?" 
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-white outline-none font-medium" 
            required 
          />
          <SmartCategorizer description={description} onSuggest={setCategory} categories={categories} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Importo</label>
            <input 
              type="text" 
              inputMode="decimal" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              placeholder={`0.00 ${currency}`} 
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-bold text-xl" 
              required 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Data</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-white outline-none font-medium" 
              required 
            />
          </div>
        </div>

        <button type="button" onClick={() => setIsSubscription(!isSubscription)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSubscription ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-gray-50 border-transparent text-gray-400'}`}>
          <div className="flex items-center gap-2 font-bold text-sm"><Repeat size={18} /> Abbonamento Ricorrente</div>
          <div className={`w-10 h-6 rounded-full relative transition-colors ${isSubscription ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSubscription ? 'left-5' : 'left-1'}`}></div></div>
        </button>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Metodo di Pagamento</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
            {[PaymentMethod.Contanti, PaymentMethod.Bancomat, ...wallets.map(w => w.method)].map((m) => (
              <button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${paymentMethod === m ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 border-emerald-50 dark:border-gray-700 text-gray-500'}`}>
                {getPaymentIcon(m)} <span className="truncate">{wallets.find(w => w.method === m)?.name || m}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.name)} className={`px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all ${category === cat.name ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' : 'bg-white dark:bg-gray-800 border-emerald-50 dark:border-gray-700 text-gray-500'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 font-bold hover:bg-gray-50 transition-colors">Annulla</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-100 dark:shadow-none disabled:opacity-70 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Salva
          </button>
        </div>
      </form>

      {/* MODALE DI CONFERMA PERSONALIZZATO */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-emerald-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-emerald-500">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              {showConfirmModal.type === 'duplicate' ? <Copy size={32} /> : <AlertTriangle size={32} />}
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {showConfirmModal.type === 'future' ? 'Data Futura' : showConfirmModal.type === 'duplicate' ? 'Possibile Duplicato' : 'Data Passata'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">
              {showConfirmModal.type === 'future' 
                ? 'Questa è una data futura, sei sicuro di voler aggiungere?' 
                : showConfirmModal.type === 'duplicate'
                ? 'Sembra che tu abbia già inserito una spesa identica in questa data. Vuoi procedere comunque?'
                : 'Questa è una data passata, verrà aggiunta allo storico'}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-emerald-600 transition-colors"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {showConfirmModal.type === 'future' ? 'Si' : showConfirmModal.type === 'duplicate' ? 'Salva comunque' : 'Va bene!'}
              </button>
              <button 
                onClick={() => setShowConfirmModal({ show: false, type: null })}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showConfirmModal.type === 'future' ? 'No' : 'Annulla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
