
import React, { useMemo } from 'react';
import { Expense, PaymentMethod, WalletConfig, CategoryConfig } from '../types';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Wallet, Calendar, Target, Zap, Fuel, CreditCard, Clock, ChevronRight, TrendingUp, TrendingDown, SlidersHorizontal } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, isAfter, startOfToday, isBefore, parseISO, isSameMonth } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { translations } from '../utils/i18n';

interface DashboardProps {
  expenses: Expense[];
  budget: number;
  userName?: string;
  currency?: string;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  lang?: 'it' | 'en';
  onAdjustment?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, 
  budget, 
  userName = 'Utente', 
  currency = '€', 
  wallets, 
  categories, 
  lang = 'it',
  onAdjustment
}) => {
  const t = translations[lang].dashboard;
  const today = startOfToday();
  const currentMonthDate = new Date();

  // Filtro spese del mese corrente
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expenseDate = parseISO(e.date);
      return isSameMonth(expenseDate, currentMonthDate);
    });
  }, [expenses, currentMonthDate]);

  // CALCOLO TOTALE "CASH FLOW" (Uscite dal conto principale)
  const totalCurrentMonth = useMemo(() => {
    return currentMonthExpenses
      .filter(e => 
        e.paymentMethod === PaymentMethod.Bancomat && 
        !e.description.toLowerCase().includes('aggiustamento tecnico')
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  // Totale mese scorso con la stessa logica
  const totalLastMonth = useMemo(() => {
    const lastMonthDate = subMonths(currentMonthDate, 1);
    const lastMonthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), lastMonthDate));
    return lastMonthExpenses
      .filter(e => 
        e.paymentMethod === PaymentMethod.Bancomat && 
        !e.description.toLowerCase().includes('aggiustamento tecnico')
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonthDate]);

  const diff = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100 : 0;
  const budgetProgress = Math.min((totalCurrentMonth / budget) * 100, 100);

  // LOGICA SALDI WALLET
  const balances = useMemo(() => {
    return wallets.map(w => {
      const totalIn = expenses
        .filter(e => {
          const desc = e.description.toLowerCase();
          const name = w.name.toLowerCase();
          return (desc.includes(`ricarica ${name}`) || desc.includes(`aggiustamento ${name}`)) && e.paymentMethod !== w.method;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalOut = expenses
        .filter(e => {
          const isWalletMethod = e.paymentMethod === w.method;
          const isNotRefill = !e.description.toLowerCase().includes('ricarica');
          const expenseDate = parseISO(e.date);
          const isNotPast = !isBefore(expenseDate, today);
          return isWalletMethod && isNotRefill && isNotPast;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        ...w,
        value: Math.max(0, totalIn - totalOut),
        icon: w.icon === 'zap' ? <Zap size={14} /> : w.icon === 'fuel' ? <Fuel size={14} /> : <CreditCard size={14} />,
        color: w.icon === 'zap' ? 'text-emerald-500' : 'text-blue-500'
      };
    });
  }, [expenses, wallets, today]);

  // DATI GRAFICO CATEGORIE
  const categoryData = useMemo(() => {
    const realSpending = currentMonthExpenses.filter(e => 
      !e.description.toLowerCase().includes('aggiustamento')
    );
    
    const data: Record<string, number> = {};
    realSpending.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  const getCategoryColor = (catName: string) => categories.find(c => c.name === catName)?.color || '#9ca3af';
  const formatValue = (val: number) => `${currency}${val.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
  const dateLocale = lang === 'en' ? enUS : it;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.hello}, {userName}! 👋</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-emerald-500 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="text-emerald-50 text-xs font-bold uppercase tracking-wider mb-1">{t.spentThisMonth}</p>
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black">{formatValue(totalCurrentMonth)}</h2>
                <button 
                  onClick={onAdjustment}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-xl backdrop-blur-sm transition-colors group flex items-center gap-2"
                  title="Aggiungi aggiustamento"
                >
                  <SlidersHorizontal size={18} className="text-white" />
                  <span className="text-[10px] font-bold uppercase hidden sm:inline">Aggiustamenti</span>
                </button>
              </div>
              <p className="text-emerald-100 text-[10px] mt-1 font-medium">(Uscite Bancomat & Ricariche)</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0"><CreditCard size={24} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-emerald-50">
              <span>{t.target}: {currency}{budget.toLocaleString('it-IT')}</span>
              <span>{Math.round(budgetProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-1000" style={{ width: `${budgetProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-2xl ${diff <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {diff <= 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-widest">{t.vsLastMonth}</p>
              <p className={`font-black text-lg ${diff <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl"><Calendar size={20} /></div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-widest">{t.month}</p>
              <p className="font-black text-lg dark:text-white capitalize">{format(currentMonthDate, "MMMM", { locale: dateLocale })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm overflow-x-auto">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Saldi Attuali Portafogli</h3>
        <div className="flex gap-4 px-2">
          {balances.map((wallet) => (
            <div key={wallet.name} className="flex-shrink-0 w-40 p-4 rounded-2xl bg-emerald-50/50 dark:bg-gray-700/50 border border-emerald-100/50 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <div className={wallet.color}>{wallet.icon}</div>
                <span className="text-[8px] font-bold text-gray-400 uppercase">{wallet.name}</span>
              </div>
              <p className="font-bold dark:text-white">{currency}{wallet.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold dark:text-white">Analisi Categorie</h3>
             <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">Consumo Reale</span>
          </div>
          <div className="w-full h-[250px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${currency}${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 'Importo']} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">Nessuna spesa rilevante</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-6">Top Spese</h3>
          <div className="space-y-4">
            {categoryData.slice(0, 5).map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCategoryColor(entry.name) }}></div>
                  <span className="text-sm dark:text-gray-300">{entry.name}</span>
                </div>
                <span className="text-sm font-bold dark:text-white">{formatValue(entry.value)}</span>
              </div>
            ))}
            {categoryData.length === 0 && <p className="text-gray-400 text-sm">Nessuna spesa da mostrare.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
