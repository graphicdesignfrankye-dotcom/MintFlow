import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Edit2, Info, Loader2, Plus, Trash2, X, Check } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, isAfter, parseISO, startOfToday } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Expense, PaymentMethod } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface ContoCorrenteViewProps {
  movements: Expense[]; // tutti i movimenti con metodo Bancomat del profilo corrente
  currency: string;
  balanceOffset: number;
  onSetBalanceOffset: (offset: number) => void;
  onSaveIncome: (data: Omit<Expense, 'id'>, editId: string | null) => Promise<void>;
  onEditExpense: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const PAGE_SIZE = 50;
const QUICK_DESCRIPTIONS = ['Stipendio', 'Rimborso', 'Regalo'];

// Entrata = movimento aggiunto da qui (extraType 'income') o un "Ho ricevuto" incassato sul Bancomat
const isIncome = (e: Expense) => !!e.isExtra && (e.extraType === 'income' || e.extraType === 'received');
const signedAmount = (e: Expense) => (isIncome(e) ? e.amount : -e.amount);

// Accetta "1.500,50" (formato italiano), "2.000" (migliaia), "1500.50" e "1500,50"
const parseAmount = (value: string) => {
  const v = value.trim().replace(/\s/g, '');
  if (v.includes(',')) return parseFloat(v.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) return parseFloat(v.replace(/\./g, ''));
  return parseFloat(v);
};

const formatMoney = (n: number, currency: string) =>
  `${currency}${Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ContoCorrenteView: React.FC<ContoCorrenteViewProps> = ({
  movements, currency, balanceOffset, onSetBalanceOffset, onSaveIncome, onEditExpense, onDelete
}) => {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [incomeModal, setIncomeModal] = useState<{ editing: Expense | null } | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balanceModal, setBalanceModal] = useState(false);
  const [newBalance, setNewBalance] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Expense | null>(null);
  const [view, setView] = useState<'movimenti' | 'mesi'>('movimenti');
  const [metric, setMetric] = useState<'saldo' | 'entrate' | 'uscite'>('saldo');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const sorted = useMemo(() => [...movements].sort((a, b) => b.date.localeCompare(a.date)), [movements]);

  // Il saldo conta solo i movimenti fino a oggi: quelli con data futura risultano "in programma"
  const { calculated, monthIn, monthOut } = useMemo(() => {
    const today = startOfToday();
    const monthKey = format(new Date(), 'yyyy-MM');
    let calculated = 0, monthIn = 0, monthOut = 0;
    for (const e of movements) {
      if (isAfter(parseISO(e.date), today)) continue;
      const value = signedAmount(e);
      calculated += value;
      if (e.date.startsWith(monthKey)) {
        if (value > 0) monthIn += value; else monthOut -= value;
      }
    }
    return { calculated, monthIn, monthOut };
  }, [movements]);

  const balance = calculated + balanceOffset;

  // Riepilogo per mese (come l'andamento di Revolut): entrate, uscite e saldo a fine mese,
  // dal primo mese con movimenti fino a oggi. Coerente con il saldo mostrato in alto.
  const monthly = useMemo(() => {
    const today = startOfToday();
    const nowKey = format(today, 'yyyy-MM');
    const past = movements.filter(e => !isAfter(parseISO(e.date), today));
    if (past.length === 0) return [];

    const firstKey = past.reduce((min, e) => (e.date.slice(0, 7) < min ? e.date.slice(0, 7) : min), nowKey);
    const byMonth: Record<string, { in: number; out: number }> = {};
    for (const e of past) {
      const bucket = (byMonth[e.date.slice(0, 7)] ||= { in: 0, out: 0 });
      const value = signedAmount(e);
      if (value > 0) bucket.in += value; else bucket.out -= value;
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    const result: { key: string; label: string; fullLabel: string; entrate: number; uscite: number; saldo: number }[] = [];
    let running = balanceOffset;
    let [y, m] = firstKey.split('-').map(Number);
    const [ny, nm] = nowKey.split('-').map(Number);
    while (y < ny || (y === ny && m <= nm)) {
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const bucket = byMonth[key] || { in: 0, out: 0 };
      running += bucket.in - bucket.out;
      const first = parseISO(`${key}-01`);
      result.push({
        key,
        label: format(first, 'MMM', { locale: it }),
        fullLabel: format(first, 'MMMM yyyy', { locale: it }),
        entrate: round(bucket.in),
        uscite: round(bucket.out),
        saldo: round(running)
      });
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return result;
  }, [movements, balanceOffset]);

  const foundIdx = monthly.findIndex(mo => mo.key === selectedMonth);
  const selectedIdx = foundIdx >= 0 ? foundIdx : monthly.length - 1;
  const current = selectedIdx >= 0 ? monthly[selectedIdx] : null;
  const isCurrentMonth = current?.key === format(new Date(), 'yyyy-MM');

  // Finestra di 6 mesi che contiene il mese selezionato, per il grafico
  const chartEnd = Math.min(monthly.length, Math.max(selectedIdx + 3, 6));
  const chartData = monthly.slice(Math.max(0, chartEnd - 6), chartEnd);
  const monthMovements = current ? sorted.filter(e => e.date.startsWith(current.key)) : [];

  const barColor = (d: { saldo: number }, selected: boolean) => {
    const negative = metric === 'uscite' || (metric === 'saldo' && d.saldo < 0);
    if (negative) return selected ? '#ef4444' : '#fecaca';
    return selected ? '#10b981' : '#a7f3d0';
  };
  const METRIC_LABELS = { saldo: 'Saldo', entrate: 'Entrate', uscite: 'Uscite' } as const;
  const compact = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${v}`);

  const openAdd = () => {
    setDescription('');
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIncomeModal({ editing: null });
  };

  const openEditIncome = (e: Expense) => {
    setDescription(e.description);
    setAmount(e.amount.toString());
    setDate(e.date);
    setIncomeModal({ editing: e });
  };

  const submitIncome = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = parseAmount(amount);
    if (!description.trim() || !isFinite(parsed) || parsed <= 0) {
      alert('Inserisci una descrizione e un importo valido');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveIncome({
        description: description.trim(),
        amount: parsed,
        category: 'Entrata',
        paymentMethod: PaymentMethod.Bancomat,
        date,
        isExtra: true,
        extraType: 'income'
      }, incomeModal?.editing?.id ?? null);
      setIncomeModal(null);
    } catch {
      alert('Errore nel salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBalanceModal = () => {
    setNewBalance(balance.toFixed(2));
    setBalanceModal(true);
  };

  const submitBalance = () => {
    const target = parseAmount(newBalance);
    if (!isFinite(target)) {
      alert('Inserisci un importo valido');
      return;
    }
    onSetBalanceOffset(target - calculated);
    setBalanceModal(false);
  };

  const today = startOfToday();
  const visible = sorted.slice(0, shown);
  let lastMonth = '';

  const renderRow = (e: Expense) => {
    const income = isIncome(e);
    const future = isAfter(parseISO(e.date), today);
    const isExtraOther = !!e.isExtra && e.extraType !== 'income';
    const canEdit = e.extraType === 'income' || !e.isExtra;

    return (
      <div key={e.id} className="p-4 flex items-center justify-between gap-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
            income ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'
          }`}>
            {income ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{e.description}</h4>
            <p className="text-[10px] text-gray-400 uppercase font-medium">
              {format(parseISO(e.date), 'dd MMM yyyy', { locale: it })} · {e.category}
              {future && <span className="ml-2 text-amber-500 font-bold">In programma</span>}
              {isExtraOther && <span className="ml-2 text-gray-400 font-bold">Extra</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-bold ${income ? 'text-emerald-500' : 'text-red-500'}`}>
            {income ? '+' : '-'}{formatMoney(e.amount, currency)}
          </span>
          {canEdit && (
            <button
              onClick={() => (e.extraType === 'income' ? openEditIncome(e) : onEditExpense(e))}
              className="text-gray-300 hover:text-emerald-500 transition-colors"
              title="Modifica"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button onClick={() => setItemToDelete(e)} className="text-gray-300 hover:text-red-500 transition-colors" title="Elimina">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-500 p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200/50 dark:shadow-none">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-50 text-xs font-bold uppercase tracking-widest mb-1">Contocorrente · Saldo attuale</p>
            <h2 className="text-4xl font-black">{balance < 0 ? '-' : ''}{formatMoney(balance, currency)}</h2>
          </div>
          <button
            onClick={openBalanceModal}
            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            title="Modifica saldo manualmente"
          >
            <Edit2 size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-xs font-medium opacity-90">
          <span className="bg-white/20 px-2 py-1 rounded-lg">Entrate del mese: +{formatMoney(monthIn, currency)}</span>
          <span className="bg-white/20 px-2 py-1 rounded-lg">Uscite del mese: -{formatMoney(monthOut, currency)}</span>
        </div>
      </div>

      <button
        onClick={openAdd}
        className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all active:scale-95"
      >
        <Plus size={20} /> Aggiungi entrata
      </button>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
        {([['movimenti', 'Movimenti'], ['mesi', 'Mesi']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === id
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'movimenti' ? (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-4">Movimenti Bancomat</h3>
          {sorted.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              {visible.map((e) => {
                const month = e.date.slice(0, 7);
                const showHeader = month !== lastMonth;
                lastMonth = month;
                return (
                  <React.Fragment key={e.id}>
                    {showHeader && (
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/40 text-[10px] font-bold text-gray-400 uppercase tracking-widest capitalize">
                        {format(parseISO(e.date), 'MMMM yyyy', { locale: it })}
                      </div>
                    )}
                    {renderRow(e)}
                  </React.Fragment>
                );
              })}
              {sorted.length > shown && (
                <button
                  onClick={() => setShown(s => s + PAGE_SIZE)}
                  className="w-full p-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  Mostra altri movimenti
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Info className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-400 font-medium text-sm">Nessun movimento sul conto.</p>
              <p className="text-gray-400 text-xs mt-1 px-6">Qui compaiono le spese pagate con Bancomat e le entrate che aggiungi.</p>
            </div>
          )}
          <p className="text-[11px] text-gray-400 px-4 leading-relaxed">
            Il saldo è cumulativo: entrate meno spese pagate con Bancomat, più l'eventuale saldo di partenza che imposti con la matita. I movimenti con data futura non sono ancora sottratti.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {current ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-5 md:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedMonth(monthly[selectedIdx - 1].key)}
                    disabled={selectedIdx <= 0}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-emerald-500 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                    title="Mese precedente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="font-bold text-gray-800 dark:text-white capitalize">{current.fullLabel}</h3>
                  <button
                    onClick={() => setSelectedMonth(monthly[selectedIdx + 1].key)}
                    disabled={selectedIdx >= monthly.length - 1}
                    className="p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-emerald-500 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                    title="Mese successivo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {isCurrentMonth ? 'Saldo ad oggi' : 'Saldo a fine mese'}
                  </p>
                  <p className={`text-3xl font-black ${current.saldo < 0 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                    {current.saldo < 0 ? '-' : ''}{formatMoney(current.saldo, currency)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3">
                    <p className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">Entrate</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">+{formatMoney(current.entrate, currency)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3">
                    <p className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest">Uscite</p>
                    <p className="text-sm font-black text-red-500 mt-1">-{formatMoney(current.uscite, currency)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-3">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Netto</p>
                    <p className={`text-sm font-black mt-1 ${current.entrate - current.uscite < 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      {current.entrate - current.uscite < 0 ? '-' : '+'}{formatMoney(current.entrate - current.uscite, currency)}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map(k => (
                    <button
                      key={k}
                      onClick={() => setMetric(k)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        metric === k
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                      }`}
                    >
                      {METRIC_LABELS[k]}
                    </button>
                  ))}
                </div>

                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickFormatter={compact}
                        width={42}
                      />
                      <Tooltip
                        cursor={{ fill: '#10b981', opacity: 0.1 }}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [
                          `${currency}${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
                          METRIC_LABELS[metric]
                        ]}
                        labelFormatter={(label) => chartData.find(d => d.label === label)?.fullLabel ?? label}
                      />
                      <Bar
                        dataKey={metric}
                        radius={[8, 8, 8, 8]}
                        maxBarSize={32}
                        cursor="pointer"
                        onClick={(d: any) => {
                          const key = d?.payload?.key ?? d?.key;
                          if (key) setSelectedMonth(key);
                        }}
                      >
                        {chartData.map(d => (
                          <Cell key={d.key} fill={barColor(d, d.key === current.key)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-gray-400 text-center">Tocca una barra per vedere quel mese.</p>
              </div>

              <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-4">
                Movimenti di {current.fullLabel}
              </h3>
              {monthMovements.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  {monthMovements.map(renderRow)}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-6">Nessun movimento in questo mese.</p>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Info className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-400 font-medium text-sm">Ancora nessun mese da mostrare.</p>
              <p className="text-gray-400 text-xs mt-1 px-6">Compariranno quando ci saranno movimenti sul conto.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal entrata */}
      {incomeModal && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={submitIncome} className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl relative space-y-4">
            <button type="button" onClick={() => setIncomeModal(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X size={22} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
              {incomeModal.editing ? 'Modifica entrata' : 'Nuova entrata'}
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Descrizione</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Es. Stipendio"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-white outline-none font-medium"
                required
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_DESCRIPTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setDescription(q)}
                    className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Importo</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`0.00 ${currency}`}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-white outline-none font-medium text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIncomeModal(null)} className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Annulla
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Salva
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal saldo */}
      {balanceModal && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm p-6 sm:p-8 shadow-2xl relative space-y-4">
            <button onClick={() => setBalanceModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X size={22} />
            </button>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Modifica saldo</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Inserisci il saldo reale del conto. Cambia solo il valore mostrato e non crea movimenti.
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:text-emerald-400 outline-none font-bold text-lg"
              autoFocus
            />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setBalanceModal(false)} className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-400 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Annulla
              </button>
              <button onClick={submitBalance} className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-100 dark:shadow-none active:scale-95 transition-all">
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Elimina movimento"
        message={itemToDelete ? `Eliminare "${itemToDelete.description}" (${formatMoney(itemToDelete.amount, currency)})? L'azione è irreversibile.` : ''}
        onConfirm={() => { if (itemToDelete) onDelete(itemToDelete.id); setItemToDelete(null); }}
        onCancel={() => setItemToDelete(null)}
        confirmText="Elimina"
        type="danger"
      />
    </div>
  );
};
