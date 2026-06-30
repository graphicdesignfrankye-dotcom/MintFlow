import React, { useState } from 'react';
import { Expense, UserSettings, PaymentMethod } from '../types';
import { format, isSameMonth, isFuture } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Calendar, ChevronLeft, ArrowRight, History as HistoryIcon, Download, Layers, Cigarette, Fuel, Car, Zap, Gamepad2, Heart, Repeat, ShoppingBag, Utensils, TrendingDown, TrendingUp, Filter, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface HistoryViewProps {
  expenses: Expense[];
  onClose: () => void;
  currency: string;
  settings: UserSettings;
  onDeleteExpense?: (id: string) => Promise<void>;
  onDeleteMultipleExpenses?: (ids: string[]) => Promise<void>;
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

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  expenses, onClose, currency, settings, onDeleteExpense, onDeleteMultipleExpenses 
}) => {
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');
  const [hideBancomat, setHideBancomat] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteIndividualConfirm, setShowDeleteIndividualConfirm] = useState(false);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState<string | null>(null);

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
      
      // Filtra per categoria
      if (filterCategory !== 'Tutti' && e.category !== filterCategory) return;

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
  }, [expenses, filterCategory]);

  const getMonthBudget = (monthDate: Date) => {
    const key = format(monthDate, 'yyyy-MM');
    const history = settings.budgetHistory?.[key];
    // Se non c'è nello storico, usiamo il budget attuale come fallback per i mesi passati
    return history?.personal || settings.monthlyBudget;
  };

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

  const monthExpenses = React.useMemo(() => {
    if (!selectedMonth) return [];
    return expenses
      .filter(e => isSameMonth(parseDate(e.date), selectedMonth))
      .filter(e => {
        const desc = e.description.toLowerCase();
        
        let isRefill = desc.includes('ricarica');
        if (isRefill && e.paymentMethod === PaymentMethod.Revolut && e.category === 'Benzina') isRefill = false;
        
        const isAdjustment = desc.includes('aggiustamento') || desc.includes('modifica saldo') || (desc.includes('modifica') && desc.includes('contanti'));
        
        const isBenzinaAppQ8 = e.category === 'Benzina' && 
          (e.paymentMethod === PaymentMethod.AppQ8 || e.paymentMethod === 'App Club Q8' as any);
          
        return !isRefill && !isAdjustment && !isBenzinaAppQ8;
      })
      .filter(e => filterCategory === 'Tutti' || e.category === filterCategory)
      .filter(e => !hideBancomat || e.paymentMethod !== 'Bancomat')
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [expenses, selectedMonth, filterCategory, hideBancomat]);

  const exportToCSV = () => {
    const filteredExpenses = filterCategory === 'Tutti' 
      ? expenses 
      : expenses.filter(e => e.category === filterCategory);

    if (!filteredExpenses || filteredExpenses.length === 0) return;
    
    const headers = ['Data', 'Descrizione', 'Categoria', 'Metodo di Pagamento', 'Importo'];
    const csvContent = [
      headers.join(','),
      ...filteredExpenses.map(e => {
        const date = format(parseDate(e.date), 'dd/MM/yyyy');
        const desc = `"${e.description.replace(/"/g, '""')}"`;
        const category = `"${e.category}"`;
        const method = `"${e.paymentMethod}"`;
        const amount = e.amount.toString().replace('.', ',');
        return [date, desc, category, method, amount].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_spese_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (selectedMonth) {
    const handleDeleteAllConfirm = async () => {
      if (!selectedMonth || !onDeleteMultipleExpenses) return;
      const ids = monthExpenses.map(e => e.id);
      if (ids.length === 0) return;
      try {
        await onDeleteMultipleExpenses(ids);
        setSelectedMonth(null);
      } catch (err) {
        console.error(err);
      } finally {
        setShowDeleteAllConfirm(false);
      }
    };

    const handleDeleteIndividualConfirm = async () => {
      if (!expenseIdToDelete || !onDeleteExpense) return;
      try {
        await onDeleteExpense(expenseIdToDelete);
        if (monthExpenses.length <= 1) {
          setSelectedMonth(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setExpenseIdToDelete(null);
        setShowDeleteIndividualConfirm(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[80] overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
          <header className="flex items-center justify-between mb-8">
            <button 
              onClick={() => { setSelectedMonth(null); setFilterCategory('Tutti'); }}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-full text-emerald-600 transition-colors"
            >
              <ChevronLeft size={28} />
            </button>
            <div className="text-center flex flex-col items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {format(selectedMonth, 'MMMM yyyy', { locale: it })}
              </h1>
              <p className="text-gray-500 text-sm font-medium">{monthExpenses.length} transazioni</p>
            </div>
            {monthExpenses.length > 0 && onDeleteMultipleExpenses ? (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500 transition-colors"
                title="Elimina tutte le spese di questo mese"
              >
                <Trash2 size={24} />
              </button>
            ) : (
              <div className="w-10"></div>
            )}
          </header>

          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              onClick={() => setHideBancomat(!hideBancomat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                hideBancomat 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {hideBancomat ? 'Mostra Bancomat' : 'Nascondi Bancomat'}
            </button>

            <div className="relative min-w-[160px]">
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none bg-white appearance-none cursor-pointer pr-10 truncate text-sm font-medium"
              >
                <option value="Tutti">Cat: Tutte</option>
                {settings.categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Filter size={14} />
              </div>
            </div>
          </div>

          {(hideBancomat || filterCategory !== 'Tutti') && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-center">
              <p className="text-emerald-800 dark:text-emerald-200 text-sm font-bold">
                Totale speso {hideBancomat ? '(escluso Bancomat)' : ''} {filterCategory !== 'Tutti' ? `(Categoria: ${filterCategory})` : ''}: {currency}
                {monthExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-emerald-100 dark:border-gray-700 overflow-hidden shadow-sm">
            {monthExpenses.length > 0 ? (
              <div className="divide-y divide-emerald-50 dark:divide-gray-700">
                {monthExpenses.map((expense) => {
                  const expenseDate = parseDate(expense.date);
                  const isDateInFuture = isFuture(expenseDate);
                  return (
                    <div key={expense.id} className={`p-4 flex items-center justify-between hover:bg-emerald-50/30 dark:hover:bg-gray-700/30 transition-colors ${isDateInFuture ? 'bg-red-50/40 dark:bg-red-900/10' : ''}`}>
                      <div className="flex items-center gap-3 md:gap-4 overflow-hidden flex-1 min-w-0">
                        <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                          isDateInFuture 
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <h4 className={`font-semibold truncate text-sm md:text-base pr-2 ${isDateInFuture ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-white'}`}>
                            {expense.description}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-medium text-gray-400">
                            <span className={`whitespace-nowrap ${isDateInFuture ? 'text-red-500' : ''}`}>{format(expenseDate, 'dd MMM yyyy', { locale: it })}</span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 truncate">{expense.category}</span>
                            <span>•</span>
                            <span className="truncate">{expense.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-base md:text-lg whitespace-nowrap ${isDateInFuture ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                            {currency}{expense.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                          {isDateInFuture && (
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">In programma</span>
                          )}
                        </div>
                        {onDeleteExpense && (
                          <button
                            onClick={() => {
                              setExpenseIdToDelete(expense.id);
                              setShowDeleteIndividualConfirm(true);
                            }}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center shrink-0"
                            title="Elimina spesa"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-400 font-medium">Nessuna spesa trovata per questo mese.</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modals */}
        <ConfirmModal
          isOpen={showDeleteAllConfirm}
          title="Elimina tutte le spese?"
          message={`Sei sicuro di voler eliminare DEFINITIVAMENTE tutte le ${monthExpenses.length} spese registrate in questo mese? Questa azione non può essere annullata.`}
          confirmText="Elimina Tutto"
          type="danger"
          onConfirm={handleDeleteAllConfirm}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />

        <ConfirmModal
          isOpen={showDeleteIndividualConfirm}
          title="Elimina questa spesa?"
          message="Sei sicuro di voler eliminare definitivamente questa singola transazione dall'archivio?"
          confirmText="Elimina"
          type="danger"
          onConfirm={handleDeleteIndividualConfirm}
          onCancel={() => {
            setExpenseIdToDelete(null);
            setShowDeleteIndividualConfirm(false);
          }}
        />
      </div>
    );
  }

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
          <div className="relative min-w-[140px]">
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)} 
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none bg-white appearance-none cursor-pointer pr-8 truncate text-xs font-bold"
            >
              <option value="Tutti">Tutte le Cat.</option>
              {settings.categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <Filter size={12} />
            </div>
          </div>
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
                    <button 
                      key={data.month.toISOString()}
                      onClick={() => setSelectedMonth(data.month)}
                      className="w-full text-left bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm flex flex-col gap-4 group hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between w-full">
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
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-emerald-500 transition-colors">
                            Vedi Dettagli <ArrowRight size={10} />
                          </div>
                        </div>
                      </div>

                      {/* Budget Info Row */}
                      <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-400">
                            <TrendingUp size={14} />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Budget Impostato</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{currency}{getMonthBudget(data.month).toLocaleString('it-IT')}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Risparmio / Avanzo</p>
                            <p className={`text-xs font-bold ${getMonthBudget(data.month) - data.total >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {currency}{(getMonthBudget(data.month) - data.total).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className={`p-1.5 rounded-lg ${getMonthBudget(data.month) - data.total >= 0 ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20' : 'bg-red-50 text-red-500 dark:bg-red-900/20'}`}>
                            {getMonthBudget(data.month) - data.total >= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                          </div>
                        </div>
                      </div>
                    </button>
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
          <button 
            onClick={exportToCSV}
            className="w-full py-4 bg-white text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"
          >
            Genera CSV Completo
          </button>
        </div>
      </div>
    </div>
  );
};