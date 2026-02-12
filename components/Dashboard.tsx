
import React, { useMemo } from 'react';
import { Expense, PaymentMethod, WalletConfig, CategoryConfig } from '../types';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Wallet, Calendar, Target, Zap, Fuel, CreditCard, Clock, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
// Import date-fns functions directly from their modules to fix named export errors
import format from 'date-fns/format';
import startOfMonth from 'date-fns/startOfMonth';
import endOfMonth from 'date-fns/endOfMonth';
import isWithinInterval from 'date-fns/isWithinInterval';
import subMonths from 'date-fns/subMonths';
import isAfter from 'date-fns/isAfter';
import startOfToday from 'date-fns/startOfToday';
import isBefore from 'date-fns/isBefore';
import parseISO from 'date-fns/parseISO';
// Import locales directly from their modules for date-fns v2 compatibility
import it from 'date-fns/locale/it';
import enUS from 'date-fns/locale/en-US';
import { translations } from '../utils/i18n';

interface DashboardProps {
  expenses: Expense[];
  budget: number;
  userName?: string;
  currency?: string;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  lang?: 'it' | 'en';
}

export const Dashboard: React.FC<DashboardProps> = ({ expenses, budget, userName = 'Utente', currency = '€', wallets, categories, lang = 'it' }) => {
  const t = translations[lang].dashboard;
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  const today = startOfToday();

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => 
      isWithinInterval(new Date(e.date), { start: currentMonthStart, end: currentMonthEnd })
    );
  }, [expenses, currentMonthStart, currentMonthEnd]);

  // FUNZIONE HELPER PER FILTRARE SPESE REALI PER IL BUDGET
  const filterBudgetExpenses = (expenseList: Expense[]) => {
    return expenseList.filter(e => {
      const desc = e.description.toLowerCase();
      const isAdjustment = desc.includes('aggiustamento');
      return !isAdjustment && (e.paymentMethod === PaymentMethod.Contanti || e.paymentMethod === PaymentMethod.Bancomat);
    });
  };

  const totalCurrentMonth = useMemo(() => {
    return filterBudgetExpenses(currentMonthExpenses).reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const totalLastMonth = useMemo(() => {
    const lastMonthStart = startOfMonth(subMonths(currentMonth, 1));
    const lastMonthEnd = endOfMonth(subMonths(currentMonth, 1));
    const lastMonthExpenses = expenses.filter(e => 
      isWithinInterval(new Date(e.date), { start: lastMonthStart, end: lastMonthEnd })
    );
    return filterBudgetExpenses(lastMonthExpenses).reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const diff = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100 : 0;
  const budgetProgress = Math.min((totalCurrentMonth / budget) * 100, 100);

  // LOGICA SALDI UNIFICATA (Ignora spese passate per i wallet)
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
          // Applichiamo la stessa regola: se la data è passata, non scali il saldo residuo
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

  const categoryData = useMemo(() => {
    const realSpending = currentMonthExpenses.filter(e => {
      const desc = e.description.toLowerCase();
      const isInternal = desc.includes('aggiustamento') || 
                        wallets.some(w => desc === `ricarica ${w.name.toLowerCase()}`);
      return !isInternal;
    });

    const data: Record<string, number> = {};
    realSpending.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses, wallets]);

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
            <div>
              <p className="text-emerald-50 text-xs font-bold uppercase tracking-wider mb-1">{t.spentThisMonth}</p>
              <h2 className="text-4xl font-black">{formatValue(totalCurrentMonth)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"><CreditCard size={24} /></div>
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
              <p className="font-black text-lg dark:text-white capitalize">{format(currentMonth, "MMMM", { locale: dateLocale })}</p>
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
          <h3 className="text-lg font-bold dark:text-white mb-6">Analisi Categorie</h3>
          <div className="w-full h-[250px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">Nessuna spesa rilevante</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-6">Spese Maggiori</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};
