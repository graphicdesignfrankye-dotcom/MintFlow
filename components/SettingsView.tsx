
import React, { useState } from 'react';
import { UserSettings, Expense, WalletConfig, CategoryConfig, PaymentMethod } from '../types';
import { User, DollarSign, Trash2, Download, Moon, Sun, LogOut, FileDown, History, CheckCircle2, ShieldCheck, Edit3, X, Mail, Globe, Lock, Wallet, Tag, ChevronRight, Plus, ChevronLeft, Save } from 'lucide-react';
import { auth } from '../services/supabase';
import { format } from 'date-fns';
import { HistoryView } from './HistoryView';
import { translations } from '../utils/i18n';

const SettingsRow = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button type="button" onClick={onClick} className="w-full flex items-center justify-between px-8 py-6 hover:bg-emerald-50 dark:hover:bg-gray-700/50 transition-all group">
    <div className="flex items-center gap-4">{icon}<span className="font-bold text-gray-700 dark:text-gray-200">{label}</span></div>
    <ChevronRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={20} />
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

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
  const [view, setView] = useState<'main' | 'history' | 'wallets' | 'categories'>('main');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [tempName, setTempName] = useState(settings.name);
  const [tempEmail, setTempEmail] = useState(email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const lang = settings.language || 'it';
  const t = translations[lang].settings;
  const tNav = translations[lang].nav;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      if (tempName !== settings.name) {
        await auth.updateProfile(tempName);
        onUpdate({ ...settings, name: tempName });
      }
      if (tempEmail !== email) {
        await auth.updateEmail(tempEmail);
        showFeedback("Email inviata!");
      } else {
        showFeedback("Profilo aggiornato!");
      }
      setShowProfileModal(false);
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) return alert("Minimo 6 caratteri");
    setIsUpdating(true);
    try {
      await auth.updatePassword(newPassword);
      showFeedback("Password aggiornata!");
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Vuoi eliminare DEFINITIVAMENTE l'account?")) {
      try {
        setIsUpdating(true);
        await auth.deleteAccount();
      } catch (err: any) {
        await auth.signOut();
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleAddItem = (type: 'wallet' | 'category') => {
    if (!newItemName.trim()) return;
    
    if (type === 'wallet') {
      const newWallet: WalletConfig = {
        id: 'w' + Date.now(),
        name: newItemName.trim(),
        method: newItemName.trim() as PaymentMethod,
        icon: 'credit-card'
      };
      onUpdate({ ...settings, wallets: [...settings.wallets, newWallet] });
    } else {
      const newCat: CategoryConfig = {
        id: 'c' + Date.now(),
        name: newItemName.trim()
      };
      onUpdate({ ...settings, categories: [...settings.categories, newCat] });
    }
    
    setNewItemName('');
    setIsAdding(false);
    showFeedback("Aggiunto con successo!");
  };

  if (view === 'history') return <HistoryView expenses={expenses} onClose={() => setView('main')} currency={settings.currency} />;
  
  if (view === 'wallets') return (
    <div className="animate-in slide-in-from-right duration-300 min-h-screen bg-white dark:bg-gray-900 -mt-8 -mx-4 px-4 pt-8">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <button type="button" onClick={() => { setView('main'); setIsAdding(false); }} className="flex items-center gap-2 text-emerald-600 font-bold mb-6"><ChevronLeft /> {tNav.settings}</button>
        <h2 className="text-3xl font-bold dark:text-white">{t.manageWallets}</h2>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm space-y-4">
          {settings.wallets.map(w => (
            <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl relative">
              <div className="flex items-center gap-3 font-bold dark:text-white"><Wallet className="text-emerald-500" /> {w.name}</div>
              <button 
                type="button"
                onClick={() => {
                  onUpdate({ ...settings, wallets: settings.wallets.filter(x => x.id !== w.id) });
                }} 
                className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center relative z-30"
              >
                <Trash2 size={18} className="pointer-events-none" />
              </button>
            </div>
          ))}

          {isAdding ? (
            <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-500 animate-in zoom-in-95 duration-200">
              <input 
                autoFocus
                type="text" 
                value={newItemName} 
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nome portafoglio..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border-none outline-none dark:text-white font-bold"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => handleAddItem('wallet')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Salva</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-3 bg-white dark:bg-gray-600 text-gray-400 rounded-xl font-bold text-sm">Annulla</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setIsAdding(true)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 mt-4 transition-transform active:scale-95"><Plus size={20} /> Aggiungi</button>
          )}
        </div>
      </div>
    </div>
  );

  if (view === 'categories') return (
    <div className="animate-in slide-in-from-right duration-300 min-h-screen bg-white dark:bg-gray-900 -mt-8 -mx-4 px-4 pt-8">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <button type="button" onClick={() => { setView('main'); setIsAdding(false); }} className="flex items-center gap-2 text-emerald-600 font-bold mb-6"><ChevronLeft /> {tNav.settings}</button>
        <h2 className="text-3xl font-bold dark:text-white">{t.manageCategories}</h2>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm space-y-4">
          {settings.categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl relative">
              <div className="flex items-center gap-3 font-bold dark:text-white"><Tag className="text-emerald-500" /> {c.name}</div>
              {!c.isSubscriptionDefault && (
                <button 
                  type="button"
                  onClick={() => {
                    onUpdate({ ...settings, categories: settings.categories.filter(x => x.id !== c.id) });
                  }} 
                  className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center relative z-30"
                >
                  <Trash2 size={18} className="pointer-events-none" />
                </button>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-500 animate-in zoom-in-95 duration-200">
              <input 
                autoFocus
                type="text" 
                value={newItemName} 
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Nome categoria..."
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 border-none outline-none dark:text-white font-bold"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => handleAddItem('category')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm">Salva</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-3 bg-white dark:bg-gray-600 text-gray-400 rounded-xl font-bold text-sm">Annulla</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setIsAdding(true)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 mt-4 transition-transform active:scale-95"><Plus size={20} /> Aggiungi</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 size={16} />
          <span className="font-bold text-xs uppercase tracking-wider">{feedback}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-4 rounded-3xl text-white">
              <User size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t.profile}</h3>
              <p className="text-gray-400 text-sm">{email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all">
              <Edit3 size={14} /> {t.edit}
            </button>
            <button 
              type="button" 
              onClick={() => onUpdate({ ...settings, language: lang === 'it' ? 'en' : 'it' })} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all"
            >
              <Globe size={14} /> {lang === 'it' ? 'ITA' : 'ENG'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">{t.displayName}</label>
          <div className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 dark:text-white font-bold text-lg">{settings.name}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <SettingsRow icon={<Lock className="text-emerald-500" size={20} />} label={t.changePassword} onClick={() => setShowPasswordModal(true)} />
        <div className="h-[1px] bg-emerald-50 dark:bg-gray-700 mx-6"></div>
        <SettingsRow icon={<Wallet className="text-emerald-500" size={20} />} label={t.manageWallets} onClick={() => setView('wallets')} />
        <div className="h-[1px] bg-emerald-50 dark:bg-gray-700 mx-6"></div>
        <SettingsRow icon={<Tag className="text-emerald-500" size={20} />} label={t.manageCategories} onClick={() => setView('categories')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><DollarSign className="text-emerald-500" size={20} /> {t.monthlyBudget}</h3>
          <div className="space-y-4">
            <input type="number" value={settings.monthlyBudget} onChange={(e) => onUpdate({ ...settings, monthlyBudget: Number(e.target.value) })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-black text-2xl" />
            <select value={settings.currency} onChange={(e) => onUpdate({ ...settings, currency: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white px-4 py-3 rounded-2xl font-bold text-sm outline-none border-none">
              <option value="€">Euro (€)</option>
              <option value="$">Dollaro ($)</option>
              <option value="£">Sterlina (£)</option>
            </select>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">{settings.isDarkMode ? <Moon className="text-emerald-500" size={20} /> : <Sun className="text-emerald-500" size={20} />} {t.appearance}</h3>
          <div className="flex items-center justify-between p-6 rounded-2xl bg-gray-50 dark:bg-gray-700">
            <span className="font-bold text-gray-600 dark:text-gray-300">{settings.isDarkMode ? t.darkMode : t.lightMode}</span>
            <button type="button" onClick={() => onUpdate({ ...settings, isDarkMode: !settings.isDarkMode })} className={`w-14 h-8 rounded-full relative transition-colors p-1 ${settings.isDarkMode ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-all ${settings.isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><FileDown className="text-emerald-500" size={20} /> {t.dataArchive}</h3>
        <div className="grid grid-cols-2 gap-4">
          <button type="button" onClick={() => setView('history')} className="flex items-center justify-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 transition-all"><History size={20} /> {t.history}</button>
          <button type="button" onClick={() => alert("Funzione esportazione CSV pronta")} className="flex items-center justify-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 transition-all"><Download size={20} /> {t.export}</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-red-50 dark:border-red-900/10 shadow-sm">
        <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2"><ShieldCheck size={20} /> {t.security}</h3>
        <div className="space-y-4">
          <button type="button" onClick={() => auth.signOut()} className="w-full flex items-center justify-center gap-3 p-5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"><LogOut size={20} /> {t.logout}</button>
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={handleDeleteAccount} className="w-full py-3 text-red-400 text-xs font-bold hover:text-red-600 transition-all flex items-center justify-center gap-2"><Trash2 size={14} /> {t.deleteAccount}</button>
            <button type="button" onClick={onClearData} className="w-full flex items-center justify-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:text-red-500 transition-all"><Trash2 size={10} /> {t.clearData}</button>
          </div>
        </div>
      </div>

      <div className="text-center pt-4"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">MintFlow v2.5 • AI Powered</p></div>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Modifica Profilo">
        <div className="space-y-4">
          <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white" placeholder="Nome" />
          <input type="email" value={tempEmail} onChange={(e) => setTempEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white" placeholder="Email" />
          <button type="button" onClick={handleUpdateProfile} disabled={isUpdating} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg mt-2">{isUpdating ? "..." : "Salva"}</button>
        </div>
      </Modal>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambia Password">
        <div className="space-y-4">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white" placeholder="Minimo 6 caratteri" />
          <button type="button" onClick={handleUpdatePassword} disabled={isUpdating} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg mt-2">{isUpdating ? "..." : "Aggiorna"}</button>
        </div>
      </Modal>
    </div>
  );
};
