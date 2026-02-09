
import React from 'react';
import { UserSettings } from '../types';
import { User, Wallet, DollarSign, Trash2, Download, Info, Moon, Sun, LogOut } from 'lucide-react';
import { auth } from '../services/supabase';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdate: (settings: UserSettings) => void;
  onClearData: () => void;
  expenseCount: number;
  email?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  onUpdate, 
  onClearData,
  expenseCount,
  email
}) => {
  const handleChange = (field: keyof UserSettings, value: string | number | boolean) => {
    onUpdate({ ...settings, [field]: value });
  };

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await auth.signOut();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Account Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="text-emerald-500" size={20} />
            Account Cloud
          </h3>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 ml-1">Email Collegata</label>
            <p className="px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">{email}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Il tuo Nome Visualizzato</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Finance Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Wallet className="text-emerald-500" size={20} />
          Preferenze Finanziarie
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Budget Mensile</label>
            <div className="relative">
              <input
                type="number"
                value={settings.monthlyBudget}
                onChange={(e) => handleChange('monthlyBudget', Number(e.target.value))}
                className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-bold"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {settings.currency}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 ml-1">Valuta</label>
            <div className="relative">
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full pl-12 pr-5 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white transition-all outline-none font-bold appearance-none"
              >
                <option value="€">Euro (€)</option>
                <option value="$">Dollaro ($)</option>
                <option value="£">Sterlina (£)</option>
                <option value="CHF">Franco Svizzero (CHF)</option>
              </select>
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          {settings.isDarkMode ? <Moon className="text-emerald-500" size={20} /> : <Sun className="text-emerald-500" size={20} />}
          Aspetto
        </h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Modalità Scura</span>
          <button 
            onClick={() => handleChange('isDarkMode', !settings.isDarkMode)}
            className={`w-14 h-8 rounded-full transition-all relative ${settings.isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settings.isDarkMode ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Download className="text-emerald-500" size={20} />
          Dati Cloud
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
            <div className="flex items-center gap-3">
              <Info className="text-emerald-500" size={20} />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Database Spese</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">{expenseCount} transazioni sincronizzate</p>
              </div>
            </div>
          </div>

          <button 
            onClick={onClearData}
            className="w-full flex items-center justify-center gap-2 p-4 text-red-500 border-2 border-red-50 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all rounded-2xl font-bold"
          >
            <Trash2 size={20} />
            Elimina Tutte le Spese dal Cloud
          </button>
        </div>
      </div>

      <div className="text-center text-gray-400 text-xs py-4">
        MintFlow v1.1.0 • Multi-Device Cloud Sinc
      </div>
    </div>
  );
};
