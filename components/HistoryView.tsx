
import React from 'react';
import { Expense } from '../types';
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, ChevronLeft, ArrowRight, History as HistoryIcon, Download } from 'lucide-react';

interface HistoryViewProps {
  expenses: Expense[];
  onClose: () => void;
  currency: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ expenses, onClose, currency }) => {
  // Raggruppa le spese per mese, escludendo il mese corrente
  const monthlyData = React.useMemo(() => {
    const currentMonth = startOfMonth(new Date());
    const groups: Record<string, { month: Date, total: number, count: number }> = {};

    expenses.forEach(e => {
      const date = parseISO(e.date);
      const monthStart = startOfMonth(date);
      
      // Escludi il mese in corso dallo storico
      if (isSameMonth(monthStart, currentMonth)) return;

      const key = format(monthStart, 'yyyy-MM');
      if (!groups[key]) {
        groups[key] = { month: monthStart, total: 0, count: 0 };
      }
      groups[key].total += e.amount;
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => b.month.getTime() - a.month.getTime());
  }, [expenses]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[80] overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-full text-emerald-600 transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <div className="text-center flex flex-col items-center">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl mb-2">
              <HistoryIcon className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Storico Mensile</h1>
            <p className="text-gray-500 text-sm">Archivio delle tue spese passate</p>
          </div>
          <div className="w-10"></div> {/* Spacer per centrare */}
        </header>

        {monthlyData.length > 0 ? (
          <div className="space-y-4">
            {monthlyData.map((data) => (
              <div 
                key={data.month.toISOString()}
                className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl text-gray-400 group-hover:text-emerald-500 transition-colors">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white capitalize">
                      {format(data.month, 'MMMM yyyy', { locale: it })}
                    </h3>
                    <p className="text-sm text-gray-500">{data.count} transazioni registrate</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {currency}{data.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Chiuso <ArrowRight size={10} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-full text-emerald-200">
              <HistoryIcon size={64} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Nessun dato storico</h2>
            <p className="text-gray-500 max-w-xs">Lo storico si popolerà automaticamente al termine del mese in corso.</p>
          </div>
        )}

        <div className="mt-12 p-8 bg-emerald-500 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
          <h3 className="text-xl font-bold mb-2">Esporta Archivio</h3>
          <p className="text-emerald-50 text-sm mb-6 leading-relaxed">
            Vuoi una copia di tutte le tue transazioni passate? Puoi scaricare un file CSV compatibile con Excel o Google Sheets.
          </p>
          <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all">
            <Download size={20} /> Scarica Tutto lo Storico
          </button>
        </div>
      </div>
    </div>
  );
};
