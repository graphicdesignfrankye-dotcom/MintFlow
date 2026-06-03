
import React, { useState, useRef } from 'react';
import { UserSettings, Expense, WalletConfig, CategoryConfig, PaymentMethod } from '../types';
import { User, DollarSign, Trash2, Download, Moon, Sun, LogOut, FileDown, History, CheckCircle2, ShieldCheck, Edit3, X, Mail, Globe, Lock, Wallet, Tag, ChevronRight, Plus, ChevronLeft, Save, Check, Upload, Loader2, Eraser, RefreshCw } from 'lucide-react';
import { auth, db } from '../services/supabase';
import { format } from 'date-fns';
import { HistoryView } from './HistoryView';
import { translations } from '../utils/i18n';

const SettingsRow = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button type="button" onClick={onClick} className="w-full flex items-center justify-between px-6 py-5 md:px-8 md:py-6 hover:bg-emerald-50 dark:hover:bg-gray-700/50 transition-all group">
    <div className="flex items-center gap-4">{icon}<span className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">{label}</span></div>
    <ChevronRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={20} />
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-6 md:p-8 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] border-2 border-emerald-500/20 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{title}</h2>
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
  onDeleteAdjustments?: () => void;
  onImport?: (file: File) => Promise<{ imported: number; skipped: number; errors: string[], debugInfo: string }>;
  onExport?: () => void;
  expenses: Expense[];
  email?: string;
  userId?: string;
  onLogout: () => void;
  onDeleteExpense?: (id: string) => Promise<void>;
  onDeleteMultipleExpenses?: (ids: string[]) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  onUpdate, 
  onClearData,
  onDeleteAdjustments,
  onImport,
  onExport,
  expenses,
  email,
  userId,
  onLogout,
  onDeleteExpense,
  onDeleteMultipleExpenses
}) => {
  const [view, setView] = useState<'main' | 'history' | 'wallets' | 'categories'>('main');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  // States for adding new items
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemColor, setNewItemColor] = useState('#10b981');

  // States for editing existing items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const [tempName, setTempName] = useState(settings.name);
  const [tempEmail, setTempEmail] = useState(email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local states for budget to allow explicit saving
  const [localBudget, setLocalBudget] = useState(settings.monthlyBudget);
  const [localCurrency, setLocalCurrency] = useState(settings.currency);

  const lang = settings.language || 'it';
  const t = translations[lang].settings;
  const tNav = translations[lang].nav;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const saveToCloud = async (updatedSettings: UserSettings) => {
    if (!userId) return;
    setIsSavingSettings(true);
    try {
      await db.updateProfileSettings(userId, updatedSettings);
      showFeedback("Sincronizzato con il Cloud!");
    } catch (err) {
      console.error("Errore salvataggio cloud:", err);
      showFeedback("Errore salvataggio Cloud");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveBudget = async () => {
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const newHistory = { ...(settings.budgetHistory || {}) };
    
    // Aggiorna lo storico per il mese corrente
    newHistory[currentMonthKey] = {
      ...newHistory[currentMonthKey],
      personal: localBudget
    };

    const updated = { 
      ...settings, 
      monthlyBudget: localBudget, 
      currency: localCurrency,
      budgetHistory: newHistory
    };
    onUpdate(updated);
    await saveToCloud(updated);
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

  const handleAddItem = async (type: 'wallet' | 'category') => {
    if (!newItemName.trim()) return;
    
    let updatedSettings: UserSettings;
    if (type === 'wallet') {
      const newWallet: WalletConfig = {
        id: 'w' + Date.now(),
        name: newItemName.trim(),
        method: newItemName.trim() as PaymentMethod,
        icon: 'credit-card'
      };
      updatedSettings = { ...settings, wallets: [...settings.wallets, newWallet] };
    } else {
      const newCat: CategoryConfig = {
        id: 'c' + Date.now(),
        name: newItemName.trim(),
        color: newItemColor
      };
      updatedSettings = { ...settings, categories: [...settings.categories, newCat] };
    }
    
    onUpdate(updatedSettings);
    await saveToCloud(updatedSettings);
    
    setNewItemName('');
    setIsAdding(false);
  };

  const startEditing = (item: CategoryConfig) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditColor(item.color || '#10b981');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const newCats = settings.categories.map(c => 
      c.id === editingId ? { ...c, name: editName, color: editColor } : c
    );
    const updated = { ...settings, categories: newCats };
    onUpdate(updated);
    await saveToCloud(updated);
    setEditingId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }

    if (!onImport) {
      alert("Funzione di importazione non disponibile. Ricarica la pagina.");
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert(`Il file "${file.name}" non sembra essere un CSV. Per favore seleziona un file con estensione .csv`);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const { imported, skipped, errors, debugInfo } = await onImport(file);
      
      let msg = '';
      if (imported > 0) msg += `✅ IMPORTAZIONE COMPLETATA: ${imported} spese salvate.\n\n`;
      if (skipped > 0) msg += `⚠️ ${skipped} duplicati saltati.\n\n`;
      
      if (errors.length > 0) {
          msg += `❌ ERRORI (${errors.length} righe ignorate):\n`;
          msg += errors.slice(0, 5).join('\n');
          if (errors.length > 5) msg += `\n...e altri ${errors.length - 5}.`;
          msg += `\n\nInfo Debug: ${debugInfo}`;
      } else if (imported === 0 && skipped === 0) {
          msg += `⚠️ Nessun dato importato.\nInfo Debug: ${debugInfo}`;
      }

      alert(msg || "Operazione completata.");

    } catch (err: any) {
      console.error(err);
      alert("ERRORE FATALE durante l'importazione: " + err.message);
    } finally {
      setIsImporting(false);
      // Reset input manuale alla fine per permettere di ricaricare lo stesso file se necessario
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualRecovery = () => {
    const localData = localStorage.getItem('mintflow_expenses');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.length > 0) {
          showFeedback(`Trovate ${parsed.length} spese. Avvio recupero...`);
          setTimeout(() => window.location.reload(), 2000);
        } else {
          showFeedback("Nessun dato trovato nella memoria locale di questo dispositivo.");
        }
      } catch (e) {
        showFeedback("Errore nella lettura dei dati locali.");
      }
    } else {
      showFeedback("Nessun dato trovato nella memoria locale di questo dispositivo.");
    }
  };

  // ... Resto del componente (view wallets, view categories, etc) rimane uguale, mostro solo la parte renderizzata finale

  if (view === 'history') return (
    <HistoryView 
      expenses={expenses} 
      onClose={() => setView('main')} 
      currency={settings.currency} 
      settings={settings} 
      onDeleteExpense={onDeleteExpense}
      onDeleteMultipleExpenses={onDeleteMultipleExpenses}
    />
  );
  
  if (view === 'wallets') return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[80] overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <button type="button" onClick={() => { setView('main'); setIsAdding(false); }} className="flex items-center gap-2 text-emerald-600 font-bold mb-6"><ChevronLeft /> {tNav.settings}</button>
        <h2 className="text-2xl md:text-3xl font-bold dark:text-white mb-6">{t.manageWallets}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm space-y-4">
          {settings.wallets.map(w => (
            <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl relative">
              <div className="flex items-center gap-3 font-bold dark:text-white"><Wallet className="text-emerald-500" /> {w.name}</div>
              <button 
                type="button"
                onClick={async () => {
                  const updated = { ...settings, wallets: settings.wallets.filter(x => x.id !== w.id) };
                  onUpdate(updated);
                  await saveToCloud(updated);
                }} 
                className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center relative z-30"
              >
                <Trash2 size={18} className="pointer-events-none" />
              </button>
            </div>
          ))}
          {/* ... Add Wallet Logic ... */}
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
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[80] overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        <button type="button" onClick={() => { setView('main'); setIsAdding(false); }} className="flex items-center gap-2 text-emerald-600 font-bold mb-6"><ChevronLeft /> {tNav.settings}</button>
        <h2 className="text-2xl md:text-3xl font-bold dark:text-white mb-6">{t.manageCategories}</h2>
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm space-y-4">
          {settings.categories.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl relative group min-h-[72px]">
              {editingId === c.id ? (
                <div className="flex-1 flex items-center gap-3 animate-in fade-in duration-200 w-full overflow-hidden">
                  <input 
                    type="color" 
                    value={editColor} 
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-full shrink-0"
                  />
                  <input 
                    autoFocus
                    type="text" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-gray-600 rounded-xl border-none outline-none dark:text-white font-bold"
                  />
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={saveEdit} className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600"><Check size={18} /></button>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-500 rounded-full hover:bg-gray-300"><X size={18} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 font-bold dark:text-white">
                    <div 
                      className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                      style={{ backgroundColor: c.color || '#10b981' }}
                    ></div>
                    <span>{c.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => startEditing(c)} 
                      className="p-2.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all flex items-center justify-center"
                    >
                      <Edit3 size={18} />
                    </button>

                    {!c.isSubscriptionDefault && (
                      <button 
                        type="button"
                        onClick={async () => {
                          const updated = { ...settings, categories: settings.categories.filter(x => x.id !== c.id) };
                          onUpdate(updated);
                          await saveToCloud(updated);
                        }} 
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {/* ... Add Category Logic ... */}
          {isAdding ? (
            <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-500 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 bg-white dark:bg-gray-700 rounded-xl px-2">
                <input 
                  type="color" 
                  value={newItemColor} 
                  onChange={(e) => setNewItemColor(e.target.value)}
                  className="w-10 h-10 border-none bg-transparent cursor-pointer rounded-full shrink-0"
                />
                <input 
                  autoFocus
                  type="text" 
                  value={newItemName} 
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nome categoria..."
                  className="flex-1 px-2 py-3 bg-transparent border-none outline-none dark:text-white font-bold min-w-0"
                />
              </div>
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

      {/* ... Profile Section ... */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="bg-emerald-500 p-3 md:p-4 rounded-3xl text-white shrink-0">
              <User className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white truncate">{t.profile}</h3>
              <p className="text-gray-400 text-xs md:text-sm truncate">{email}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 self-start sm:self-auto ml-12 sm:ml-0">
            <button type="button" onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-[10px] md:text-xs hover:bg-emerald-100 transition-all whitespace-nowrap">
              <Edit3 size={14} /> {t.edit}
            </button>
            <button 
              type="button" 
              onClick={() => onUpdate({ ...settings, language: lang === 'it' ? 'en' : 'it' })} 
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-bold text-[10px] md:text-xs hover:bg-blue-100 transition-all whitespace-nowrap"
            >
              <Globe size={14} /> {lang === 'it' ? 'ITA' : 'ENG'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 md:mb-3 ml-1">{t.displayName}</label>
          <div className="w-full px-5 py-3 md:px-6 md:py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 dark:text-white font-bold text-base md:text-lg truncate">{settings.name}</div>
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><DollarSign className="text-emerald-500" size={20} /> {t.monthlyBudget}</h3>
            <button 
              onClick={handleSaveBudget}
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salva
            </button>
          </div>
          <div className="space-y-4">
            <input 
              type="number" 
              value={localBudget} 
              onChange={(e) => setLocalBudget(Number(e.target.value))} 
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none dark:text-white font-black text-2xl" 
            />
            <select 
              value={localCurrency} 
              onChange={(e) => setLocalCurrency(e.target.value)} 
              className="w-full bg-gray-50 dark:bg-gray-700 dark:text-white px-4 py-3 rounded-2xl font-bold text-sm outline-none border-none"
            >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <button type="button" onClick={() => setView('history')} className="flex items-center justify-center gap-3 p-4 md:p-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 transition-all border border-transparent hover:border-emerald-200"><History size={20} /> <span className="text-[11px] md:text-sm">{t.history}</span></button>
          <button type="button" onClick={onExport} className="flex items-center justify-center gap-3 p-4 md:p-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 transition-all border border-transparent hover:border-emerald-200"><Download size={20} /> <span className="text-[11px] md:text-sm">{t.export}</span></button>
          
          {/* Import CSV Button */}
          <button 
            type="button" 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }} 
            disabled={isImporting}
            className="flex items-center justify-center gap-3 p-4 md:p-5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 transition-all relative overflow-hidden border border-transparent hover:border-emerald-200"
          >
            {isImporting ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />} 
            <span className="text-[11px] md:text-sm">{t.import}</span>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden" 
            />
          </button>
        </div>
        
        {onDeleteAdjustments && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button 
              type="button" 
              onClick={onDeleteAdjustments} 
              className="w-full flex items-center justify-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider hover:text-red-600 transition-all p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Eraser size={16} /> Elimina vecchi "Aggiustamenti"
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-2">Usa questo per rimuovere i vecchi dati prima del cambio nome in "Modifica".</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
          <button 
            type="button" 
            onClick={handleManualRecovery} 
            className="w-full flex items-center justify-center gap-2 text-blue-500 text-xs font-bold uppercase tracking-wider hover:text-blue-600 transition-all p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <RefreshCw size={16} /> Recupera Dati Locali
          </button>
          <p className="text-[10px] text-center text-gray-400 mt-2">Se non vedi le tue vecchie spese, clicca qui per caricarle sul cloud.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-red-50 dark:border-red-900/10 shadow-sm mb-20">
        <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2"><ShieldCheck size={20} /> {t.security}</h3>
        <div className="space-y-4">
          <button 
            type="button" 
            onClick={() => {
              console.log("Logout button clicked in SettingsView (v2)");
              if (onLogout) {
                onLogout();
              } else {
                console.error("onLogout prop is missing in SettingsView!");
                alert("Errore tecnico: funzione di logout non trovata.");
              }
            }} 
            className="w-full flex items-center justify-center gap-3 p-4 md:p-5 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 shadow-lg shadow-red-100 dark:shadow-none transition-all active:scale-95"
          >
            <LogOut size={20} /> {t.logout || 'Disconnetti'}
          </button>
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={handleDeleteAccount} className="w-full py-3 text-red-400 text-[10px] md:text-xs font-bold hover:text-red-600 transition-all flex items-center justify-center gap-2"><Trash2 size={14} /> {t.deleteAccount}</button>
            <button type="button" onClick={onClearData} className="w-full flex items-center justify-center gap-2 text-gray-400 text-[9px] md:text-[10px] font-bold uppercase tracking-wider hover:text-red-500 transition-all"><Trash2 size={10} /> {t.clearData}</button>
            <button 
              type="button" 
              onClick={async () => {
                try {
                  const isConnected = await db.checkConnection();
                  if (isConnected) {
                    showFeedback("Connessione DB OK!");
                  } else {
                    showFeedback("Errore Connessione DB");
                  }
                } catch (e) {
                  showFeedback("Errore Test Connessione");
                }
              }} 
              className="w-full flex items-center justify-center gap-2 text-emerald-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider hover:text-emerald-600 transition-all pt-2"
            >
              <RefreshCw size={10} /> Test Connessione DB
            </button>
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
