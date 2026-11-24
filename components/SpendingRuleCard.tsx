import React from 'react';
import { Layers } from 'lucide-react';
import { PaymentMethod, SpendingRule, UserSettings } from '../types';
import { resolveSpendingRule } from '../utils/spendingRule';

interface SpendingRuleCardProps {
  settings: UserSettings;
  onUpdate: (settings: UserSettings) => void;
}

interface Option { value: string; label: string }

const Select: React.FC<{ label: string; value: string; options: Option[]; onChange: (value: string) => void }> = ({ label, value, options, onChange }) => {
  // Se il valore salvato non è più tra le opzioni (es. portafoglio rinominato o eliminato) lo mostro comunque
  const all = options.some(o => o.value === value) || !value ? options : [...options, { value, label: value }];
  return (
    <label className="block">
      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white px-4 py-3 rounded-2xl font-bold text-sm outline-none border-none"
      >
        {all.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
};

export const SpendingRuleCard: React.FC<SpendingRuleCardProps> = ({ settings, onUpdate }) => {
  const rule = resolveSpendingRule(settings);

  const walletOptions: Option[] = settings.wallets.map(w => ({ value: w.method as string, label: w.name }));
  const refillOptions: Option[] = [{ value: PaymentMethod.Bancomat, label: 'Bancomat' }, ...walletOptions];
  const categoryOptions: Option[] = settings.categories.map(c => ({ value: c.name, label: c.name }));

  const update = (patch: Partial<SpendingRule>) => onUpdate({ ...settings, spendingRule: { ...rule, ...patch } });

  const toggle = () => {
    if (rule.enabled) {
      update({ enabled: false });
      return;
    }
    // Prima attivazione: propongo valori di partenza se la regola è ancora vuota
    update({
      enabled: true,
      category: rule.category || settings.categories[0]?.name || '',
      walletMethods: rule.walletMethods.length
        ? rule.walletMethods
        : walletOptions.filter(o => o.value !== PaymentMethod.Contanti).slice(0, 1).map(o => o.value),
      refillMethods: rule.refillMethods.length ? rule.refillMethods : [PaymentMethod.Bancomat]
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Layers className="text-emerald-500" size={20} /> Spese già contate alla ricarica
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            Se ricarichi un portafoglio (per esempio una carta carburante) e conti la spesa nel momento della ricarica,
            attiva questa regola per non contarla due volte nei totali.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          role="switch"
          aria-checked={rule.enabled}
          title={rule.enabled ? 'Disattiva la regola' : 'Attiva la regola'}
          className={`shrink-0 w-14 h-8 rounded-full relative transition-colors p-1 ${rule.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${rule.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
      </div>

      {rule.enabled && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Categoria" value={rule.category} options={categoryOptions} onChange={(v) => update({ category: v })} />
            <Select label="Non contare le spese pagate con" value={rule.walletMethods[0] || ''} options={walletOptions} onChange={(v) => update({ walletMethods: [v] })} />
            <Select label="Conta come spesa la ricarica pagata con" value={rule.refillMethods[0] || ''} options={refillOptions} onChange={(v) => update({ refillMethods: [v] })} />
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Esempio: categoria Carburante, portafoglio App carburante, ricarica pagata con Bancomat. Le spese di Carburante fatte con
            App carburante non vengono contate; la ricarica fatta con Bancomat, invece, sì.
          </p>
        </div>
      )}
    </div>
  );
};
