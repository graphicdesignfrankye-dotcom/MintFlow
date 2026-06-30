import React, { useMemo, useState } from "react";
import {
  Expense,
  PaymentMethod,
  WalletConfig,
  CategoryConfig,
  UserSettings,
} from "../types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  Calendar,
  Target,
  Zap,
  Fuel,
  CreditCard,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  Edit2,
  X,
  Check,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { format, isSameMonth, isFuture } from "date-fns";
import { it } from "date-fns/locale/it";
import { enUS } from "date-fns/locale/en-US";
import { translations } from "../utils/i18n";

// Helper functions to replace date-fns missing exports
const subMonths = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - amount);
  return d;
};

const addMonths = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
};

const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const eachMonthOfInterval = ({
  start,
  end,
}: {
  start: Date;
  end: Date;
}): Date[] => {
  const months = [];
  const current = new Date(start);
  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};

interface DashboardProps {
  expenses: Expense[];
  allExpenses?: Expense[];
  budget: number;
  userName?: string;
  currency?: string;
  wallets: WalletConfig[];
  categories: CategoryConfig[];
  lang?: "it" | "en";
  userSettings?: UserSettings;
  onUpdateSettings?: (settings: UserSettings) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  expenses,
  allExpenses = [],
  budget,
  userName = "Utente",
  currency = "€",
  wallets,
  categories,
  lang = "it",
  userSettings,
  onUpdateSettings,
}) => {
  const t = translations[lang].dashboard;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentMonthDate = new Date();

  // Stato per la navigazione del grafico storico (data di riferimento finale visualizzata)
  const [chartDate, setChartDate] = useState(new Date());

  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState("");

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");

  const parseDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const dateLocale = lang === "en" ? enUS : it;

  // Filtro spese del mese corrente
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expenseDate = parseDate(e.date);
      return isSameMonth(expenseDate, currentMonthDate);
    });
  }, [expenses, currentMonthDate]);

  // CALCOLO TOTALE "SPESO QUESTO MESE" (Per la card principale)
  const calculatedTotal = useMemo(() => {
    return currentMonthExpenses
      .filter((e) => {
        // Escludi date future
        if (isFuture(parseDate(e.date))) return false;

        // Escludi ricariche e aggiustamenti tecnici
        let isRefill = e.description.toLowerCase().includes("ricarica");
        if (
          isRefill &&
          e.paymentMethod === PaymentMethod.Revolut &&
          e.category === "Benzina"
        )
          isRefill = false;

        const isAdjustment =
          e.description.toLowerCase().includes("aggiustamento") ||
          e.description.toLowerCase().includes("modifica");

        const isBenzinaAppQ8 =
          e.category === "Benzina" &&
          (e.paymentMethod === PaymentMethod.AppQ8 ||
            e.paymentMethod === ("App Club Q8" as any));

        return !isRefill && !isAdjustment && !isBenzinaAppQ8;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  const totalBancomat = useMemo(() => {
    return currentMonthExpenses
      .filter((e) => {
        if (isFuture(parseDate(e.date))) return false;
        return e.paymentMethod === PaymentMethod.Bancomat;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthExpenses]);

  // LOGICA OFFSET TOTALE
  const validOffset = useMemo(() => {
    if (!userSettings?.monthlyOffset) return 0;
    const lastDate = userSettings.lastOffsetDate
      ? new Date(userSettings.lastOffsetDate)
      : null;
    if (!lastDate || !isSameMonth(lastDate, currentMonthDate)) return 0;
    return userSettings.monthlyOffset;
  }, [userSettings, currentMonthDate]);

  // Totale Visualizzato = Calcolato + Offset Manuale Valido
  const totalCurrentMonth = Math.max(0, calculatedTotal + validOffset);

  // Totale mese scorso
  const totalLastMonth = useMemo(() => {
    const lastMonthDate = new Date(
      currentMonthDate.getFullYear(),
      currentMonthDate.getMonth() - 1,
      1,
    );

    const lastMonthExpenses = expenses.filter((e) =>
      isSameMonth(parseDate(e.date), lastMonthDate),
    );
    return lastMonthExpenses
      .filter((e) => {
        let isRefill = e.description.toLowerCase().includes("ricarica");
        if (
          isRefill &&
          e.paymentMethod === PaymentMethod.Revolut &&
          e.category === "Benzina"
        )
          isRefill = false;

        const isAdjustment =
          e.description.toLowerCase().includes("aggiustamento") ||
          e.description.toLowerCase().includes("modifica");
        const isBenzinaAppQ8 =
          e.category === "Benzina" &&
          (e.paymentMethod === PaymentMethod.AppQ8 ||
            e.paymentMethod === ("App Club Q8" as any));

        return (
          !isRefill &&
          !isAdjustment &&
          !isBenzinaAppQ8 &&
          !isFuture(parseDate(e.date))
        );
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonthDate]);

  const diff =
    totalLastMonth > 0
      ? ((totalCurrentMonth - totalLastMonth) / totalLastMonth) * 100
      : 0;

  // LOGICA SALDI WALLET - STORICO COMPLETO (CUMULATIVO)
  const balances = useMemo(() => {
    const sourceExpenses = allExpenses.length > 0 ? allExpenses : expenses;

    return wallets.map((w) => {
      const name = w.name.toLowerCase();

      const totalIn = sourceExpenses
        .filter((e) => {
          const desc = e.description.toLowerCase();
          const isInflow =
            desc.includes(`ricarica ${name}`) ||
            desc.includes(`aggiustamento ${name}`) ||
            desc.includes(`modifica saldo ${name}`) ||
            desc.includes(`modifica ${name}`);
          const isExtraReceived =
            e.isExtra &&
            e.extraType === "received" &&
            e.paymentMethod === w.method;

          return (isInflow && e.paymentMethod !== w.method) || isExtraReceived;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const totalOut = sourceExpenses
        .filter((e) => {
          const desc = e.description.toLowerCase();
          const isWalletMethod = e.paymentMethod === w.method;
          const isInflowOfThisWallet =
            desc.includes(`ricarica ${name}`) ||
            desc.includes(`aggiustamento ${name}`) ||
            desc.includes(`modifica saldo ${name}`) ||
            desc.includes(`modifica ${name}`);
          const isExtraReceived = e.isExtra && e.extraType === "received";
          const d = parseDate(e.date);

          return (
            isWalletMethod &&
            !isInflowOfThisWallet &&
            !isExtraReceived &&
            !isFuture(d)
          );
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const calculatedBalance = totalIn - totalOut;

      return {
        ...w,
        value: Math.max(0, calculatedBalance + (w.balanceOffset || 0)),
        icon:
          w.icon === "zap" ? (
            <Zap size={14} />
          ) : w.icon === "fuel" ? (
            <Fuel size={14} />
          ) : (
            <CreditCard size={14} />
          ),
        color: w.icon === "zap" ? "text-emerald-500" : "text-blue-500",
      };
    });
  }, [expenses, wallets]);

  // DATI GRAFICO CATEGORIE
  const categoryData = useMemo(() => {
    const realSpending = currentMonthExpenses.filter((e) => {
      let isRefill = e.description.toLowerCase().includes("ricarica");
      if (
        isRefill &&
        e.paymentMethod === PaymentMethod.Revolut &&
        e.category === "Benzina"
      )
        isRefill = false;

      const isAdjustment =
        e.description.toLowerCase().includes("aggiustamento") ||
        e.description.toLowerCase().includes("modifica");
      const isBenzinaAppQ8 =
        e.category === "Benzina" &&
        (e.paymentMethod === PaymentMethod.AppQ8 ||
          e.paymentMethod === ("App Club Q8" as any));

      return !isRefill && !isAdjustment && !isBenzinaAppQ8;
    });

    const data: Record<string, number> = {};
    realSpending.forEach((e) => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  // DATI GRAFICO STORICO (BAR CHART)
  const historyData = useMemo(() => {
    // Visualizziamo 6 mesi fino alla chartDate selezionata
    const end = endOfMonth(chartDate);
    const start = startOfMonth(subMonths(chartDate, 5));
    const monthsRange = eachMonthOfInterval({ start, end });

    return monthsRange.map((month) => {
      // 1. Calcolo somma "reale" basata sulle spese
      const monthlySum = expenses
        .filter((e) => {
          const d = parseDate(e.date);
          if (!isSameMonth(d, month)) return false;
          if (isFuture(d)) return false;

          // Stessa logica di "Calculated Total"
          let isRefill = e.description.toLowerCase().includes("ricarica");
          if (
            isRefill &&
            e.paymentMethod === PaymentMethod.Revolut &&
            e.category === "Benzina"
          )
            isRefill = false;

          const isAdjustment =
            e.description.toLowerCase().includes("aggiustamento") ||
            e.description.toLowerCase().includes("modifica");
          const isBenzinaAppQ8 =
            e.category === "Benzina" &&
            (e.paymentMethod === PaymentMethod.AppQ8 ||
              e.paymentMethod === ("App Club Q8" as any));

          return !isRefill && !isAdjustment && !isBenzinaAppQ8;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      // 2. Controllo se esiste un offset manuale per QUESTO mese specifico nelle impostazioni
      let displayedValue = monthlySum;

      if (userSettings?.lastOffsetDate && userSettings?.monthlyOffset) {
        const offsetDate = new Date(userSettings.lastOffsetDate);
        // Se il mese del grafico coincide con il mese in cui è stato salvato l'ultimo offset
        if (isSameMonth(month, offsetDate)) {
          // Aggiungi l'offset al totale
          displayedValue += userSettings.monthlyOffset;
        }
      }

      return {
        label: format(month, "MMM", { locale: dateLocale }),
        fullLabel: format(month, "MMMM yyyy", { locale: dateLocale }),
        value: Math.max(0, displayedValue), // Evitiamo valori negativi nel grafico
      };
    });
  }, [expenses, chartDate, dateLocale, userSettings]); // Aggiunto userSettings alle dipendenze

  const getCategoryColor = (catName: string) =>
    categories.find((c) => c.name === catName)?.color || "#9ca3af";
  const formatValue = (val: number) =>
    `${currency}${val.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;

  const handleEditTotalClick = () => {
    setTempTotal(totalCurrentMonth.toFixed(2));
    setIsEditingTotal(true);
  };

  const handleSaveTotal = () => {
    if (!userSettings || !onUpdateSettings) return;

    const target = parseFloat(tempTotal.replace(",", "."));
    if (isNaN(target) || target < 0) {
      alert("Inserisci un importo valido");
      return;
    }

    const newOffset = target - calculatedTotal;

    onUpdateSettings({
      ...userSettings,
      monthlyOffset: newOffset,
      lastOffsetDate: new Date().toISOString(),
    });

    setIsEditingTotal(false);
  };

  const handleSaveBudget = () => {
    if (!userSettings || !onUpdateSettings) return;

    const target = parseFloat(tempBudget.replace(",", "."));
    if (isNaN(target) || target < 0) {
      alert("Inserisci un importo valido");
      return;
    }

    onUpdateSettings({
      ...userSettings,
      monthlyBudget: target,
      lastBudgetUpdate: new Date().toISOString(),
    });

    setIsEditingBudget(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-2 flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t.hello}, {userName}! 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t.subtitle}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-2 shrink-0">
          <Calendar
            size={16}
            className="text-emerald-600 dark:text-emerald-400"
          />
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 capitalize">
            {format(new Date(), "MMMM yyyy", { locale: it })}
          </span>
        </div>
      </div>

      {/* Alert Budget */}
      {budget > 0 && totalCurrentMonth >= budget * 0.8 && (
        <div
          className={`${totalCurrentMonth >= budget ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"} border p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2`}
        >
          <div
            className={`${totalCurrentMonth >= budget ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" : "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"} p-2 rounded-xl shrink-0`}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3
              className={`${totalCurrentMonth >= budget ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"} font-bold text-sm`}
            >
              {totalCurrentMonth >= budget
                ? "Budget Superato!"
                : "Attenzione al Budget!"}
            </h3>
            <p
              className={`${totalCurrentMonth >= budget ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"} text-xs mt-1 font-medium`}
            >
              {totalCurrentMonth >= budget
                ? `Hai superato il tuo budget mensile. Hai speso ${formatValue(totalCurrentMonth)} su ${formatValue(budget)}.`
                : `Hai superato l'80% del tuo budget mensile. Hai speso ${formatValue(totalCurrentMonth)} su ${formatValue(budget)}.`}
            </p>
          </div>
        </div>
      )}

      {/* --- CARTE PRINCIPALI --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-emerald-500 p-6 md:p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="text-emerald-50 text-xs font-bold uppercase tracking-wider mb-1">
                {t.spentThisMonth}
              </p>
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black">
                  {formatValue(totalCurrentMonth)}
                </h2>
                <button
                  onClick={handleEditTotalClick}
                  className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm opacity-50 hover:opacity-100"
                  title="Modifica Totale Manualmente"
                >
                  <Edit2 size={16} className="text-white" />
                </button>
              </div>
              <p className="text-emerald-100 text-[10px] mt-1 font-medium">
                (Tutte le spese effettuate)
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
              <CreditCard size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-emerald-50 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></div>
            <span>Aggiornato in tempo reale</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex flex-col gap-1 shadow-sm relative group">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl">
                  <Target size={16} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  Budget
                </p>
              </div>
              <button
                onClick={() => {
                  setTempBudget(budget.toString());
                  setIsEditingBudget(true);
                }}
                className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Edit2 size={12} className="text-gray-500" />
              </button>
            </div>
            <div className="mt-1">
              <p className="font-black text-xl dark:text-white">
                {formatValue(budget - totalBancomat)}
              </p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                Budget iniziale: {formatValue(budget)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-emerald-100 dark:border-gray-700 flex items-center gap-4 shadow-sm">
            <div
              className={`p-3 rounded-2xl ${diff <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
            >
              {diff <= 0 ? (
                <TrendingDown size={20} />
              ) : (
                <TrendingUp size={20} />
              )}
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                {t.vsLastMonth}
              </p>
              <p
                className={`font-black text-lg ${diff <= 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {diff > 0 ? "+" : ""}
                {diff.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- SALDI PORTAFOGLI --- */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm overflow-x-auto">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">
          Saldi Portafogli (Cumulativi)
        </h3>
        <div className="flex gap-4 px-2">
          {balances.map((wallet) => (
            <div
              key={wallet.name}
              className="flex-shrink-0 w-40 p-4 rounded-2xl bg-emerald-50/50 dark:bg-gray-700/50 border border-emerald-100/50 dark:border-gray-600"
            >
              <div className="flex justify-between items-center mb-2">
                <div className={wallet.color}>{wallet.icon}</div>
                <span className="text-[8px] font-bold text-gray-400 uppercase">
                  {wallet.name}
                </span>
              </div>
              <p className="font-bold dark:text-white">
                {currency}
                {wallet.value.toLocaleString("it-IT", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- ANALISI E TOP SPESE (Mostra TUTTE le categorie) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold dark:text-white">
              Analisi Categorie
            </h3>
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">
              Consumo Reale
            </span>
          </div>
          <div className="w-full h-[250px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getCategoryColor(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number, name: string) => [
                      `${currency}${value.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Nessuna spesa rilevante
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold dark:text-white mb-6">
            Tutte le Spese per Categoria
          </h3>
          <div className="space-y-4 max-h-[250px] overflow-y-auto no-scrollbar pr-2">
            {categoryData.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(entry.name) }}
                  ></div>
                  <span className="text-sm dark:text-gray-300 truncate">
                    {entry.name}
                  </span>
                </div>
                <span className="text-sm font-bold dark:text-white shrink-0">
                  {formatValue(entry.value)}
                </span>
              </div>
            ))}
            {categoryData.length === 0 && (
              <p className="text-gray-400 text-sm">
                Nessuna spesa da mostrare.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --- GRAFICO STORICO SPESE --- */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500" /> Andamento
            Spese
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartDate(subMonths(chartDate, 6))}
              className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-500 hover:text-emerald-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[120px] text-center">
              {format(subMonths(chartDate, 5), "MMM yyyy", {
                locale: dateLocale,
              })}{" "}
              - {format(chartDate, "MMM yyyy", { locale: dateLocale })}
            </span>
            <button
              onClick={() => setChartDate(addMonths(chartDate, 6))}
              className="p-2 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-gray-500 hover:text-emerald-500 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={historyData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E5E7EB"
                opacity={0.5}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9CA3AF", fontSize: 10 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                cursor={{ fill: "#10b981", opacity: 0.1 }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [
                  `${currency}${value.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`,
                  "Speso",
                ]}
                labelFormatter={(label) => {
                  const item = historyData.find((h) => h.label === label);
                  return item ? item.fullLabel : label;
                }}
              />
              <Bar
                dataKey="value"
                fill="#10b981"
                radius={[8, 8, 8, 8]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- MODALE EDIT BUDGET --- */}
      {isEditingBudget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm p-6 md:p-8 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] border-2 border-emerald-500/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                Modifica Budget Iniziale
              </h3>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Nuovo Budget
              </label>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={tempBudget}
                onChange={(e) => setTempBudget(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-black text-2xl"
              />
              <p className="text-[10px] text-gray-400 mt-2 ml-1">
                *Questo è il budget di partenza del mese.
              </p>
            </div>

            <button
              onClick={handleSaveBudget}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-emerald-600 transition-colors"
            >
              <Check size={20} /> Salva Modifica
            </button>
          </div>
        </div>
      )}

      {/* --- MODALE EDIT TOTALE --- */}
      {isEditingTotal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm p-6 md:p-8 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] border-2 border-emerald-500/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                Modifica Totale Mese
              </h3>
              <button
                onClick={() => setIsEditingTotal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                Nuovo Totale Visualizzato
              </label>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                value={tempTotal}
                onChange={(e) => setTempTotal(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-black text-2xl"
              />
              <p className="text-[10px] text-gray-400 mt-2 ml-1">
                *Questo modificherà solo il valore visualizzato per questo mese.
              </p>
            </div>

            <button
              onClick={handleSaveTotal}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:bg-emerald-600 transition-colors"
            >
              <Check size={20} /> Salva Modifica
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
