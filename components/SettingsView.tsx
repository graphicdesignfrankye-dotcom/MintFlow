
import React, { useState } from 'react';
import { UserSettings, Expense } from '../types';
import { User, Wallet, DollarSign, Trash2, Download, Info, Moon, Sun, LogOut, FileDown, Edit3, Save, CheckCircle2, Key, Mail, ShieldCheck, ChevronRight, History } from 'lucide-react';
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

  if (showHistory) {
    return <HistoryView expenses={expenses} onClose={() => setShowHistory(false)} currency={settings.currency} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Feedbacks */}
      {feedback && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
          feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
          <span className="font-bold text-xs uppercase tracking-wider">{feedback.msg}</span>
        </div>
      )}

      {/* Identità Account */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="text-emerald-500" size={20} />
            Identità Account
          </h3>
          <div className="flex gap-2">
            {!isEditingProfile ? (
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <Edit3 size={14} /> Modifica
              </button>
            ) : (
              <button 
                onClick={handleProfileUpdate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {loading ? <CheckCircle2 className="animate-pulse" size={14} /> : <Save size={14} />}
                Salva
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Email Registrata</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                disabled={!isEditingProfile}
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                className={`w-full pl-12 pr-5 py-3 rounded-2xl transition-all outline-none font-medium border-2 ${
                  isEditingProfile 
                    ? 'bg-white dark:bg-gray-700 border-emerald-500 text-gray-800 dark:text-white' 
                    : 'bg-gray-50 dark:bg-gray-700/50 border-transparent text-gray-400'
                }`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Nome Visualizzato</label>
            <input
              type="text"
              disabled={!isEditingProfile}
              value={localSettings.name}
              onChange={(e) => setLocalSettings({ ...localSettings, name: e.target.value })}
              className={`w-full px-5 py-3 rounded-2xl transition-all outline-none font-medium border-2 ${
                isEditingProfile 
                  ? 'bg-white dark:bg-gray-700 border-emerald-500 text-gray-800 dark:text-white' 
                  : 'bg-gray-50 dark:bg-gray-700/50 border-transparent text-gray-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Sicurezza */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={20} />
          Sicurezza e Password
        </h3>
        {!isChangingPassword ? (
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all group"
          >
            <div className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-200">
              <Key className="text-emerald-500" size={20} />
              Aggiorna la tua Password
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-emerald-500 transition-colors" size={20} />
          </button>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-top-2">
            <input
              type="password"
              placeholder="Inserisci nuova password (min. 6 car.)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-5 py-3 rounded-2xl bg-white dark:bg-gray-700 border-2 border-emerald-500 outline-none dark:text-white font-medium shadow-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={handlePasswordUpdate}
                disabled={loading}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 transition-colors"
              >
                Salva Password
              </button>
              <button 
                onClick={() => {setIsChangingPassword(false); setNewPassword('');}}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-400 font-bold rounded-xl text-sm"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preferenze Finanziarie */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Wallet className="text-emerald-500" size={20} />
          Preferenze Finanziarie
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Valuta</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={settings.currency}
                onChange={(e) => onUpdate({ ...settings, currency: e.target.value })}
                className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-bold appearance-none cursor-pointer"
              >
                <option value="€">Euro (€)</option>
                <option value="$">Dollaro ($)</option>
                <option value="£">Sterlina (£)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Budget Mensile Target</label>
            <input
              type="number"
              value={settings.monthlyBudget}
              onChange={(e) => onUpdate({ ...settings, monthlyBudget: Number(e.target.value) })}
              className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-bold"
            />
          </div>
        </div>
      </div>

      {/* Visualizzazione e Altro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            {settings.isDarkMode ? <Moon size={20} className="text-emerald-500" /> : <Sun size={20} className="text-emerald-500" />}
            Aspetto
          </h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Dark Mode</span>
            <button 
              onClick={toggleAppearance}
              className={`w-14 h-8 rounded-full transition-all relative ${settings.isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settings.isDarkMode ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm transition-colors">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Download className="text-emerald-500" size={20} />
            Gestione Dati
          </h3>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setShowHistory(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-100 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all rounded-2xl font-bold"
            >
              <History size={20} /> Visualizza Storico
            </button>
            <button 
              onClick={handleExportCSV}
              className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all rounded-2xl font-bold border border-emerald-100 dark:border-emerald-900/30"
            >
              <FileDown size={20} /> Esporta in CSV
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border-2 border-red-50 dark:border-red-900/10 shadow-sm transition-colors">
        <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2">
          <ShieldCheck size={20} /> Azioni Pericolose
        </h3>
        <div className="flex flex-col md:flex-row gap-3">
          <button 
            onClick={() => auth.signOut()}
            className="flex-1 flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 transition-all rounded-2xl font-bold"
          >
            <LogOut size={20} /> Disconnetti
          </button>
          <button 
            onClick={handleDeleteAccount}
            className="flex-1 flex items-center justify-center gap-2 p-4 text-red-500 bg-red-50 dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-all rounded-2xl font-bold"
          >
            <Trash2 size={20} /> Elimina Account
          </button>
        </div>
      </div>

      <div className="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] py-4">
        MintFlow v1.6.0 • Sincronizzazione Attiva
      </div>
    </div>
  );
};
