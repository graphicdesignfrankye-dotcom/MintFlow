
import React, { useMemo } from 'react';
import { Expense, Category } from '../types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { TrendingDown, TrendingUp, Wallet, Calendar, Target } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

interface DashboardProps {
  expenses: Expense[];
  budget: number;
  userName?: string;
  currency?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ expenses, budget, userName = 'Utente', currency = '€' }) => {
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => 
      isWithinInterval(new Date(e.date), { start: currentMonthStart, end: currentMonthEnd })
    );
  }, [expenses]);

  const totalCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const lastMonthStart = startOfMonth(subMonths(currentMonth, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentMonth, 1));
  const totalLastMonth = expenses
    .filter(e => isWithinInterval(new Date(e.date), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((sum, e) => sum + e.amount, 0);

  const diff = totalLastMonth > 0 ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100 : 0;
  const budgetProgress = Math.min((totalCurrentMonth / budget) * 100, 100);

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
              <p className="text-emerald-50 text-sm font-medium uppercase tracking-wider">Totale Mensile</p>
              <h2 className="text-4xl font-bold mt-1">{formatValue(totalCurrentMonth)}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Wallet size={24} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-emerald-50">
              <span>Budget: {currency}{budget.toLocaleString('it-IT')}</span>
              <span>{Math.round(budgetProgress)}% utilizzato</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${totalCurrentMonth > budget ? 'bg-red-300' : 'bg-white'}`}
                style={{ width: `${budgetProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm transition-colors">
            <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl">
              <Target size={20} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Variazione</p>
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
              <p className="text-gray-500 dark:text-gray-400 text-xs">Oggi</p>
              <p className="font-bold text-gray-800 dark:text-white">{format(currentMonth, "d MMM", { locale: it })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 px-2">Categorie</h3>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Nessun dato</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
           <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 px-2">Dettaglio Categorie</h3>
           <div className="space-y-3">
             {categoryData.sort((a,b) => b.value - a.value).map((entry, index) => (
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
