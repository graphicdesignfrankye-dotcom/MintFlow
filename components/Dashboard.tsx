
import React, { useMemo } from 'react';
import { Expense, Category, PaymentMethod, WalletConfig } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { Wallet, Calendar, Target, Zap, Fuel, CreditCard, Info } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
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
      
      const colorMap = {
        zap: 'text-emerald-500',
        wallet: 'text-blue-500',
        fuel: 'text-orange-500',
        'credit-card': 'text-purple-500'
      };

      const iconMap = {
        zap: <Zap size={14} />,
        wallet: <Wallet size={14} />,
        fuel: <Fuel size={14} />,
        'credit-card': <CreditCard size={14} />
      };

      return {
        name: w.name,
        value: Math.max(0, totalRecharged - totalSpent),
        icon: iconMap[w.icon] || <Wallet size={14} />,
        color: colorMap[w.icon] || 'text-emerald-500'
      };
    });
  }, [expenses, wallets]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [currentMonthExpenses]);

  const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857', '#065f46', '#064e3b'];
  const formatValue = (val: number) => `${currency}${val.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ciao, {userName}! 👋</h2>
        <p className="text-gray-500 dark:text-gray-400">Ecco lo stato delle tue finanze per questo mese.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-emerald-500 dark:bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-200/50 dark:shadow-none relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-emerald-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                Budget Mensile 
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] lowercase font-medium">Contanti & Bancomat</span>
              </p>
              <h2 className="text-4xl font-black mt-1">{formatValue(totalCurrentMonth)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <CreditCard size={24} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-emerald-50">
              <span>Target: {currency}{budget.toLocaleString('it-IT')}</span>
              <span>{Math.round(budgetProgress)}% utilizzato</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${totalCurrentMonth > budget ? 'bg-red-300' : 'bg-white'}`}
                style={{ width: `${budgetProgress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-emerald-100/70 italic mt-2">Le ricariche e le spese con portafogli non intaccano questo budget primario.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm transition-colors">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl">
              <Target size={20} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Rispetto a Mese Scorso</p>
              <p className={`font-bold ${diff <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {diff <= 0 ? '-' : '+'}{Math.abs(diff).toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm transition-colors">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Periodo</p>
              <p className="font-bold text-gray-800 dark:text-white capitalize">{format(currentMonth, "MMMM yyyy", { locale: it })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors overflow-x-auto">
        <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
          <Wallet size={16} className="text-emerald-500" />
          I tuoi Saldi Portafoglio
        </h3>
        <div className="flex flex-nowrap gap-4 pb-2">
          {balances.map((wallet) => (
            <div key={wallet.name} className="flex-shrink-0 w-44 flex flex-col gap-1 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${wallet.color}`}>
                  {wallet.icon}
                </div>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[80px]">{wallet.name}</span>
              </div>
              <p className={`text-lg font-black ${wallet.value > 0 ? 'text-gray-800 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                {currency}{wallet.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 px-2">Analisi Totale (Tutti i Metodi)</h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      backgroundColor: isDark ? '#1f2937' : '#ffffff', color: isDark ? '#ffffff' : '#000000'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nessuna spesa</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
           <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 px-2">Top Categorie</h3>
           <div className="space-y-3">
             {categoryData.sort((a,b) => b.value - a.value).slice(0, 5).map((entry, index) => (
               <div key={entry.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                   <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.name}</span>
                 </div>
                 <span className="text-sm font-bold text-gray-900 dark:text-white">{formatValue(entry.value)}</span>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
