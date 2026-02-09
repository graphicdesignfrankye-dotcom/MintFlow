
import React, { useState } from 'react';
import { UserSettings, Expense, WalletConfig, PaymentMethod } from '../types';
import { User, Wallet, DollarSign, Trash2, Download, Info, Moon, Sun, LogOut, FileDown, Edit3, Save, CheckCircle2, Key, Mail, ShieldCheck, ChevronRight, History, Plus, Zap, Fuel, CreditCard } from 'lucide-react';
import { auth } from '../services/supabase';
import { format } from 'date-fns';
import { HistoryView } from './HistoryView';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdate: (settings: UserSettings) => void;
  onClearData: () => void;
  expenses: Expense[];
  email?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  onUpdate, 
  onClearData,
  expenses,
  email
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [localEmail, setLocalEmail] = useState(email || '');
  const [newPassword, setNewPassword] = useState('');
  
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState(false);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      if (localSettings.name !== settings.name) {
        await auth.updateProfile(localSettings.name);
      }
      if (localEmail !== email) {
        await auth.updateEmail(localEmail);
        showFeedback("Email inviata per confermare il nuovo indirizzo.");
      }
      onUpdate(localSettings);
      setIsEditingProfile(false);
      showFeedback("Profilo aggiornato!");
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword.length < 6) {
      showFeedback("Password troppo corta (min 6 car.)", "error");
      return;
    }
    setLoading(true);
    try {
      await auth.updatePassword(newPassword);
      setNewPassword('');
      setIsChangingPassword(false);
      showFeedback("Password modificata correttamente.");
    } catch (err: any) {
      showFeedback(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("ATTENZIONE: Questa azione eliminerà definitivamente tutte le tue spese e chiuderà la sessione. Sei sicuro?")) {
      try {
        setLoading(true);
        await auth.deleteAccount();
        window.location.reload();
      } catch (err: any) {
        showFeedback(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAppearance = () => {
    const updated = { ...settings, isDarkMode: !settings.isDarkMode };
    onUpdate(updated);
    setLocalSettings(updated);
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) return;
    const headers = ["Data", "Descrizione", "Categoria", "Metodo", "Importo"];
    const rows = expenses.map(e => [e.date, e.description, e.category, e.paymentMethod, e.amount.toString()]);
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mintflow_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.click();
  };

  const updateWalletName = (id: string, name: string) => {
    const updatedWallets = localSettings.wallets.map(w => w.id === id ? { ...w, name } : w);
    const updated = { ...localSettings, wallets: updatedWallets };
    setLocalSettings(updated);
    onUpdate(updated);
  };

  const addExtraWallet = () => {
    const extraMethods = [PaymentMethod.Wallet4, PaymentMethod.Wallet5, PaymentMethod.Wallet6];
    const usedMethods = localSettings.wallets.map(w => w.method);
    const availableMethod = extraMethods.find(m => !usedMethods.includes(m));

    if (!availableMethod) {
      showFeedback("Limite portafogli raggiunto (max 6)", "error");
      return;
    }

    const newWallet: WalletConfig = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Nuovo Portafoglio`,
      method: availableMethod,
      icon: 'credit-card'
    };

    const updated = { ...localSettings, wallets: [...localSettings.wallets, newWallet] };
    setLocalSettings(updated);
    onUpdate(updated);
    showFeedback("Nuovo portafoglio aggiunto!");
  };

  const removeWallet = (id: string) => {
    if (localSettings.wallets.length <= 1) {
      showFeedback("Devi avere almeno un portafoglio", "error");
      return;
    }
    if (confirm("Rimuovere questo portafoglio dalle impostazioni? (I dati storici rimarranno)")) {
      const updated = { ...localSettings, wallets: localSettings.wallets.filter(w => w.id !== id) };
      setLocalSettings(updated);
      onUpdate(updated);
    }
  };

  if (showHistory) {
    return <HistoryView expenses={expenses} onClose={() => setShowHistory(false)} currency={settings.currency} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {feedback && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
          feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
          <span className="font-bold text-xs uppercase tracking-wider">{feedback.msg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="text-emerald-500" size={20} />
            Identità Account
          </h3>
          <div className="flex gap-2">
            {!isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 transition-colors"><Edit3 size={14} /> Modifica</button>
            ) : (
              <button onClick={handleProfileUpdate} disabled={loading} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50">{loading ? <CheckCircle2 className="animate-pulse" size={14} /> : <Save size={14} />} Salva</button>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Email Registrata</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="email" disabled={!isEditingProfile} value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} className={`w-full pl-12 pr-5 py-3 rounded-2xl transition-all outline-none font-medium border-2 ${isEditingProfile ? 'bg-white dark:bg-gray-700 border-emerald-500 text-gray-800 dark:text-white' : 'bg-gray-50 dark:bg-gray-700/50 border-transparent text-gray-400'}`} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Nome Visualizzato</label>
            <input type="text" disabled={!isEditingProfile} value={localSettings.name} onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })} className={`w-full px-5 py-3 rounded-2xl transition-all outline-none font-medium border-2 ${isEditingProfile ? 'bg-white dark:bg-gray-700 border-emerald-500 text-gray-800 dark:text-white' : 'bg-gray-50 dark:bg-gray-700/50 border-transparent text-gray-400'}`} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Wallet className="text-emerald-500" size={20} />
          Gestione Portafogli
        </h3>
        <div className="space-y-4">
          {localSettings.wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl group">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-xl text-emerald-500 shadow-sm">
                {wallet.icon === 'zap' && <Zap size={18} />}
                {wallet.icon === 'wallet' && <Wallet size={18} />}
                {wallet.icon === 'fuel' && <Fuel size={18} />}
                {wallet.icon === 'credit-card' && <CreditCard size={18} />}
              </div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-tighter block ml-1 mb-0.5">Nome Label</label>
                <input 
                  type="text" 
                  value={wallet.name} 
                  onChange={(e) => updateWalletName(wallet.id, e.target.value)}
                  placeholder="Nome portafoglio..."
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-300"
                />
              </div>
              <button 
                onClick={() => removeWallet(wallet.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button 
            onClick={addExtraWallet}
            className="w-full py-3 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 rounded-2xl font-bold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
          >
            <Plus size={16} /> Aggiungi Altro Portafoglio
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <DollarSign className="text-emerald-500" size={20} />
          Preferenze Finanziarie
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Valuta</label>
            <select value={settings.currency} onChange={(e) => onUpdate({ ...settings, currency: e.target.value })} className="w-full pl-5 pr-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-bold appearance-none cursor-pointer">
              <option value="€">Euro (€)</option>
              <option value="$">Dollaro ($)</option>
              <option value="£">Sterlina (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Budget Mensile Target</label>
            <input type="number" value={settings.monthlyBudget} onChange={(e) => onUpdate({ ...settings, monthlyBudget: Number(e.target.value) })} className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-bold" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            {settings.isDarkMode ? <Moon size={20} className="text-emerald-500" /> : <Sun size={20} className="text-emerald-500" />}
            Aspetto
          </h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Dark Mode</span>
            <button onClick={toggleAppearance} className={`w-14 h-8 rounded-full transition-all relative ${settings.isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settings.isDarkMode ? 'left-7' : 'left-1'}`}></div></button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Download className="text-emerald-500" size={20} /> Gestione Dati</h3>
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowHistory(true)} className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-100 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all rounded-2xl font-bold"><History size={20} /> Visualizza Storico</button>
            <button onClick={handleExportCSV} className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all rounded-2xl font-bold border border-emerald-100 dark:border-emerald-900/30"><FileDown size={20} /> Esporta in CSV</button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/10 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2"><ShieldCheck size={20} /> Azioni Pericolose</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={() => auth.signOut()} className="flex-1 flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-all rounded-2xl font-bold"><LogOut size={20} /> Disconnetti</button>
          <button onClick={handleDeleteAccount} className="flex-1 flex items-center justify-center gap-2 p-4 text-red-500 bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-all rounded-2xl font-bold"><Trash2 size={20} /> Elimina Account</button>
        </div>
      </div>
    </div>
  );
};
