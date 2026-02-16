import React from 'react';
import { Expense } from '../types';
import { format, isSameMonth } from 'date-fns';
import it from 'date-fns/locale/it';
import { Calendar, ChevronLeft, ArrowRight, History as HistoryIcon, Download, Layers } from 'lucide-react';

interface HistoryViewProps {
  expenses: Expense[];
  onClose: () => void;
  currency: string;
}

interface MonthData {
  month: Date;
  total: number;
  count: number;
}

interface YearGroup {
  year: string;
  months: MonthData[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ expenses, onClose, currency }) => {
  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Raggruppa le spese per Anno e poi per Mese
  const yearlyData = React.useMemo(() => {
    // Replaced startOfMonth with native date
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthGroups: Record<string, MonthData> = {};

    expenses.forEach(e => {
      // Replaced parseISO with custom parseDate
      const date = parseDate(e.date);
      // Replaced startOfMonth with native date
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      
      // Escludi il mese in corso dallo storico
      if (isSameMonth(monthStart, currentMonth)) return;

      const key = format(monthStart, 'yyyy-MM');
      if (!monthGroups[key]) {
        monthGroups[key] = { month: monthStart, total: 0, count: 0 };
      }
      monthGroups[key].total += e.amount;
      monthGroups[key].count += 1;
    });

    const sortedMonths = Object.values(monthGroups).sort((a, b) => b.month.getTime() - a.month.getTime());
    
    const groups: YearGroup[] = [];
    sortedMonths.forEach(m => {
      const year = format(m.month, 'yyyy');
      let group = groups.find(g => g.year === year);
      if (!group) {
        group = { year, months: [] };
        groups.push(group);
      }
      group.months.push(m);
    });

    return groups;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archivio Storico</h1>
            <p className="text-gray-500 text-sm font-medium">I tuoi dati organizzati per anno</p>
          </div>
          <div className="w-10"></div>
        </header>

        {yearlyData.length > 0 ? (
          <div className="space-y-10">
            {yearlyData.map((group) => (
              <div key={group.year} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <h2 className="text-3xl font-black text-gray-800 dark:text-white">{group.year}</h2>
                  <div className="h-[2px] flex-1 bg-emerald-50 dark:bg-gray-800"></div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                    {group.months.length} {group.months.length === 1 ? 'Mese' : 'Mesi'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {group.months.map((data) => (
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
                            {format(data.month, 'MMMM', { locale: it })}
                          </h3>
                          <p className="text-sm text-gray-500">{data.count} transazioni</p>
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
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-full text-emerald-200">
              <Layers size={64} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Nessun dato archiviato</h2>
            <p className="text-gray-500 max-w-xs">I mesi conclusi appariranno qui automaticamente.</p>
          </div>
        )}

        <div className="mt-12 p-8 bg-emerald-500 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 dark:shadow-none">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold">Esporta Tutto</h3>
            <Download size={24} className="opacity-50" />
          </div>
          <p className="text-emerald-50 text-sm mb-6 leading-relaxed">
            Vuoi un backup completo? Scarica l'intero database delle tue transazioni in formato CSV.
          </p>
          <button className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all">
            Genera CSV Completo
          </button>
        </div>
      </div>
    </div>
  );
};