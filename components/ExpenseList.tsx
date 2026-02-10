
import React, { useState } from 'react';
import { Expense, PaymentMethod, WalletConfig, CategoryConfig } from '../types';
import { Trash2, Search, Filter, CreditCard, Banknote, Fuel, Edit2, Building, AlertCircle } from 'lucide-react';
import { format, isFuture, startOfMonth } from 'date-fns';
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

  const filteredExpenses = expenses
    .filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'Tutti' || e.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
        <div className="relative">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)} 
            className="w-full md:w-auto px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none bg-white appearance-none cursor-pointer pr-10"
          >
            <option value="Tutti">Tutte le Categorie</option>
            {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <Filter size={14} />
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
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1">
                    <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold ${isDateInFuture ? 'bg-red-100 text-red-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                      {isDateInFuture ? <AlertCircle size={20} /> : expense.category.charAt(0)}
                    </div>
                    
                    <div className="overflow-hidden">
                      <h4 className="font-semibold text-gray-800 dark:text-white truncate text-sm md:text-base">
                        {expense.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-medium text-gray-400">
                        <span>{format(expenseDate, 'dd MMM yyyy', { locale: it })}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{expense.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="font-bold text-gray-800 dark:text-white text-base md:text-lg">
                      {currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                    
                    <div className="flex items-center bg-gray-50 dark:bg-gray-700/50 rounded-full p-1 border border-gray-100 dark:border-gray-600">
                      <button 
                        type="button"
                        onClick={() => onEdit(expense)} 
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all"
                        title="Modifica"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(expense.id);
                        }} 
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all active:scale-90"
                        title="Elimina"
                      >
                        <Trash2 size={18} />
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
