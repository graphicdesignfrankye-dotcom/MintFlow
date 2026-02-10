
import React, { useMemo } from 'react';
import { Expense, PaymentMethod, WalletConfig } from '../types';
import { 
  PieChart, Pie, Cell, Tooltip 
} from 'recharts';
import { Wallet, Calendar, Target, Zap, Fuel, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

interface DashboardProps {
  expenses: Expense[];
  budget: number;
  userName?: string;
  currency?: string;
  wallets: WalletConfig[];
}

export const Dashboard: React.FC<DashboardProps> = ({ expenses, budget, userName = 'Utente', currency = '€', wallets }) => {
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => 
      isWithinInterval(new Date(e.date), { start: currentMonthStart, end: currentMonthEnd })
    );
  }, [expenses]);

  const futureExpenses = useMemo(() => {
    return expenses.filter(e => isAfter(new Date(e.date), currentMonthEnd));
  }, [expenses, currentMonthEnd]);

  const budgetExpenses = useMemo(() => {
    return currentMonthExpenses.filter(e => 
      e.paymentMethod === PaymentMethod.Contanti || e.paymentMethod === PaymentMethod.Bancomat
    );
  }, [currentMonthExpenses]);

  const totalCurrentMonth = budgetExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lastMonthStart = startOfMonth(subMonths(currentMonth, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentMonth, 1));
  const totalLastMonth = expenses
    .filter(e => 
      isWithinInterval(new Date(e.date), { start: lastMonthStart, end: lastMonthEnd }) &&
      (e.paymentMethod === PaymentMethod.Contanti || e.paymentMethod === PaymentMethod.Bancomat)
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const diff = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100 : 0;
  const budgetProgress = Math.min((totalCurrentMonth / budget) * 100, 100);

  const balances = useMemo(() => {
    return wallets.map(w => {
      const totalRecharged = expenses
        .filter(e => e.description.toLowerCase().includes(`ricarica ${w.name.toLowerCase()}`))
        .reduce((sum, e) => sum + e.amount, 0);
      
      const totalSpent = expenses
        .filter(e => e.paymentMethod === w.method && !e.description.toLowerCase().includes('ricarica'))
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        ...w,
        value: Math.max(0, totalRecharged - totalSpent),
        icon: w.icon === 'zap' ? <Zap size={14} /> : w.icon === 'fuel' ? <Fuel size={14} /> : <CreditCard size={14} />,
        color: w.icon === 'zap' ? 'text-emerald-500' : 'text-blue-500'
      };
    });
  }, [expenses, wallets]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [currentMonthExpenses]);

  const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
  const formatValue = (val: number) => `${currency}${val.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ciao, {userName}! 👋</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Ecco lo stato delle finanze di questo mese</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-emerald-500 dark:bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-200/50 dark:shadow-none relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-emerald-50 text-xs font-bold uppercase tracking-wider mb-1">Speso questo mese</p>
              <h2 className="text-4xl font-black">{formatValue(totalCurrentMonth)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <CreditCard size={24} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-emerald-50">
              <span>Target: {currency}{budget.toLocaleString('it-IT')}</span>
              <span>{Math.round(budgetProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-1000" style={{ width: `${budgetProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl"><Target size={20} /></div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">Rispetto a Mese Scorso</p>
              <p className={`font-bold ${diff <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{diff <= 0 ? '-' : '+'}{Math.abs(diff).toFixed(1)}%</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl"><Calendar size={20} /></div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">Mese</p>
              <p className="font-bold dark:text-white capitalize">{format(currentMonth, "MMMM yyyy", { locale: it })}</p>
            </div>
          </div>
        </div>
      </div>

      {futureExpenses.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-[2rem] border border-emerald-200 dark:border-emerald-800 flex items-center justify-between group cursor-default">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl text-white">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Spese Programmate</p>
              <p className="text-[10px] text-emerald-500/70 dark:text-emerald-500/50 font-bold uppercase tracking-wider">Hai {futureExpenses.length} {futureExpenses.length === 1 ? 'spesa' : 'spese'} nei prossimi mesi</p>
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {currency}{futureExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm overflow-x-auto">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Saldi Wallet</h3>
        <div className="flex gap-4 px-2">
          {balances.map((wallet) => (
            <div key={wallet.name} className="flex-shrink-0 w-40 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex justify-between items-center mb-2">
                <div className={wallet.color}>{wallet.icon}</div>
                <span className="text-[8px] font-bold text-gray-400 uppercase">{wallet.name}</span>
              </div>
              <p className="font-bold dark:text-white">{currency}{wallet.value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold dark:text-white mb-6 self-start">Distribuzione Spese</h3>
          <div className="w-full flex justify-center py-4" style={{ height: '300px' }}>
            {categoryData.length > 0 ? (
              <PieChart width={280} height={280}>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', border: 'none', 
                    backgroundColor: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#ffffff' : '#000000'
                  }} 
                />
              </PieChart>
            ) : <div className="h-full flex items-center text-gray-400">Nessun dato questo mese</div>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-6">Top Categorie</h3>
          <div className="space-y-4">
            {categoryData.length > 0 ? (
              categoryData.sort((a,b) => b.value - a.value).slice(0, 5).map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm dark:text-gray-300">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold dark:text-white">{formatValue(entry.value)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">Nessuna spesa registrata a {format(currentMonth, 'MMMM', { locale: it })}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
