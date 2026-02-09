
import React, { useState, useEffect } from 'react';
import { Category, Expense } from '../types';
import { SmartCategorizer } from './SmartCategorizer';

interface ExpenseFormProps {
  onSubmit: (expense: Omit<Expense, 'id'>) => void;
  onCancel: () => void;
  initialData?: Partial<Expense>;
  currency?: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, onCancel, initialData, currency = '€' }) => {
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState<Category>(initialData?.category || Category.Altro);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (initialData) {
      if (initialData.description) setDescription(initialData.description);
      if (initialData.amount) setAmount(initialData.amount.toString());
      if (initialData.category) setCategory(initialData.category);
      if (initialData.date) setDate(initialData.date);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    onSubmit({
      description,
      amount: parseFloat(amount),
      category,
      date
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Cosa hai comprato?</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="es. Spesa Settimanale"
          className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-medium"
          required
        />
        <SmartCategorizer description={description} onSuggest={setCategory} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Quanto ({currency})</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-emerald-400 transition-all outline-none font-bold"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Quando</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-medium"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Categoria</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
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

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          Cancella
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 dark:shadow-none"
        >
          Salva
        </button>
      </div>
    </form>
  );
};
