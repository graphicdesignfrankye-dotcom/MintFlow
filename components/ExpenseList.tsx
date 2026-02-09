
import React, { useState } from 'react';
import { Expense, Category, PaymentMethod } from '../types';
import { Trash2, Search, Filter, Wallet, CreditCard, Banknote, Fuel } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  currency?: string;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, currency = '€' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'Tutti'>('Tutti');

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Tutti' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getPaymentIcon = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.Contanti: return <Banknote size={12} />;
      case PaymentMethod.Flash: return <CreditCard size={12} />;
      case PaymentMethod.Revolut: return <Wallet size={12} />;
      case PaymentMethod.AppQ8: return <Fuel size={12} />;
      default: return <CreditCard size={12} />;
    }
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
        <div className="relative min-w-[160px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white appearance-none"
          >
            <option value="Tutti">Tutte le Categorie</option>
            {Object.values(Category).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-emerald-100 dark:border-gray-700 overflow-hidden shadow-sm">
        {filteredExpenses.length > 0 ? (
          <div className="divide-y divide-emerald-50 dark:divide-gray-700">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="group p-4 flex items-center justify-between hover:bg-emerald-50/50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                    {expense.category.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white leading-tight">{expense.description}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-600 uppercase tracking-tight">
                        {expense.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded uppercase tracking-tight">
                        {getPaymentIcon(expense.paymentMethod)}
                        {expense.paymentMethod}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {format(new Date(expense.date), 'dd MMM yyyy', { locale: it })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-800 dark:text-white text-lg">
                    {currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <button 
                    onClick={() => onDelete(expense.id)}
                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-full text-emerald-200 dark:text-emerald-800">
              <Search size={48} />
            </div>
            <p className="text-gray-500 dark:text-gray-400">Nessuna spesa trovata. Prova a cambiare i filtri.</p>
          </div>
        )}
      </div>
    </div>
  );
};
