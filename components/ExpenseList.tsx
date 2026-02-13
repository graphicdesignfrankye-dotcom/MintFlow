
import React, { useState } from 'react';
import { Expense, PaymentMethod, WalletConfig, CategoryConfig } from '../types';
import { 
  Trash2, Search, Filter, Edit2, AlertCircle, 
  Cigarette, Fuel, Car, Zap, Gamepad2, Heart, Repeat, ShoppingBag, Utensils,
  CreditCard
} from 'lucide-react';
import { format, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  currency?: string;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit, currency = '€', wallets, categories }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [filterMethod, setFilterMethod] = useState<string>('Tutti');

  const filteredExpenses = expenses
    .filter(e => {
      // FILTRO 1: Nascondi gli aggiustamenti tecnici
      const isAdjustment = e.description.toLowerCase().includes('aggiustamento');
      if (isAdjustment) return false;

      // FILTRO 2: Ricerca testuale
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // FILTRO 3: Categoria
      const matchesCategory = filterCategory === 'Tutti' || e.category === filterCategory;

      // FILTRO 4: Metodo di Pagamento
      const matchesMethod = filterMethod === 'Tutti' || e.paymentMethod === filterMethod;
      
      return matchesSearch && matchesCategory && matchesMethod;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Funzione per ottenere l'icona in base alla categoria
  const getCategoryIcon = (categoryName: string) => {
    const lower = categoryName.toLowerCase();
    
    if (lower.includes('sigarett') || lower.includes('tabacco') || lower.includes('iqos')) return <Cigarette size={20} />;
    if (lower.includes('benzina') || lower.includes('diesel') || lower.includes('carburante')) return <Fuel size={20} />;
    if (lower.includes('autostrada') || lower.includes('auto') || lower.includes('parcheggio') || lower.includes('telepass')) return <Car size={20} />;
    if (lower.includes('ricarica') || lower.includes('luce') || lower.includes('energia')) return <Zap size={20} />;
    if (lower.includes('svago') || lower.includes('cinema') || lower.includes('gioc') || lower.includes('bar')) return <Gamepad2 size={20} />;
    if (lower.includes('salute') || lower.includes('farmacia') || lower.includes('medic') || lower.includes('dott')) return <Heart size={20} />;
    if (lower.includes('abbonament') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('sub')) return <Repeat size={20} />;
    if (lower.includes('cibo') || lower.includes('ristorant') || lower.includes('pranzo') || lower.includes('cena') || lower.includes('spesa')) return <Utensils size={20} />;
    
    return <ShoppingBag size={20} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cerca tra le spese..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {/* Filtro Metodo Pagamento */}
            <div className="relative min-w-[160px]">
              <select 
                value={filterMethod} 
                onChange={(e) => setFilterMethod(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none bg-white appearance-none cursor-pointer pr-10 truncate text-sm font-medium"
              >
                <option value="Tutti">Metodo: Tutti</option>
                <option value="Bancomat">Bancomat</option>
                {wallets.map(w => <option key={w.id} value={w.method}>{w.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <CreditCard size={14} />
              </div>
            </div>

            {/* Filtro Categoria */}
            <div className="relative min-w-[160px]">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none bg-white appearance-none cursor-pointer pr-10 truncate text-sm font-medium"
              >
                <option value="Tutti">Cat: Tutte</option>
                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Filter size={14} />
              </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-emerald-100 dark:border-gray-700 overflow-hidden shadow-sm">
        {filteredExpenses.length > 0 ? (
          <div className="divide-y divide-emerald-50 dark:divide-gray-700">
            {filteredExpenses.map((expense) => {
              const expenseDate = new Date(expense.date);
              const isDateInFuture = isFuture(expenseDate);

              return (
                <div 
                  key={expense.id} 
                  className={`p-4 flex items-center justify-between hover:bg-emerald-50/30 dark:hover:bg-gray-700/30 transition-colors ${isDateInFuture ? 'bg-red-50/20' : ''}`}
                >
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1 min-w-0">
                    <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                      isDateInFuture 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {getCategoryIcon(expense.category)}
                    </div>
                    
                    <div className="overflow-hidden min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-white truncate text-sm md:text-base pr-2">
                        {expense.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-medium text-gray-400">
                        {isDateInFuture && <AlertCircle size={10} className="text-red-500" />}
                        <span className={`whitespace-nowrap ${isDateInFuture ? "text-red-500" : ""}`}>{format(expenseDate, 'dd MMM yyyy', { locale: it })}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 truncate">{expense.category}</span>
                        <span>•</span>
                        <span className="truncate">{expense.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className={`font-bold text-base md:text-lg whitespace-nowrap ${isDateInFuture ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                      {currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-full p-1 border border-gray-100 dark:border-gray-600">
                      <button 
                        type="button"
                        onClick={() => onEdit(expense)} 
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all"
                        title="Modifica"
                      >
                        <Edit2 size={14} className="md:w-4 md:h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(expense.id);
                        }} 
                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"
                        title="Elimina"
                      >
                        <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="bg-gray-50 dark:bg-gray-700/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Search size={32} />
            </div>
            <p className="text-gray-400 font-medium">Nessuna spesa trovata.</p>
          </div>
        )}
      </div>
    </div>
  );
};
