
import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, Expense, WalletConfig, CategoryConfig, PaymentMethod, AppNotification } from '../types';
import { User, DollarSign, Trash2, Download, Moon, Sun, LogOut, FileDown, History, CheckCircle2, ShieldCheck, Edit3, X, Globe, Lock, Wallet, Tag, ChevronRight, Plus, ChevronLeft, Save, Check, Upload, Loader2, Eraser, Bell } from 'lucide-react';
// Added supabase to imports
import { auth, db, supabase } from '../services/supabase';
import { HistoryView } from './HistoryView';
import { translations } from '../utils/i18n';

const SettingsRow = ({ icon, label, onClick, badge }: { icon: React.ReactNode, label: string, onClick: () => void, badge?: number }) => (
  <button type="button" onClick={onClick} className="w-full flex items-center justify-between px-6 py-5 md:px-8 md:py-6 hover:bg-emerald-50 dark:hover:bg-gray-700/50 transition-all group">
    <div className="flex items-center gap-4">
      <div className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-bounce shadow-sm">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">{label}</span>
    </div>
    <ChevronRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={20} />
  </button>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdate, onClearData, expenses, email }) => {
  const [view, setView] = useState<'main' | 'history' | 'wallets' | 'categories' | 'notifications'>('main');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [tempName, setTempName] = useState(settings.name);
  const [tempEmail, setTempEmail] = useState(email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const lang = settings.language || 'it';
  const t = translations[lang].settings;

  useEffect(() => {
    const fetchNotifs = async () => {
      // Fixed: Removed auth prefix as supabase is imported directly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await db.getNotifications(user.id);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };
    fetchNotifs();
  }, [view]);

  const markRead = async (id: string) => {
    await db.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

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
      showFeedback("Profilo aggiornato!");
      setShowProfileModal(false);
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (view === 'history') return <HistoryView expenses={expenses} onClose={() => setView('main')} currency={settings.currency} />;
  
  if (view === 'notifications') return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[80] overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <button type="button" onClick={() => setView('main')} className="flex items-center gap-2 text-emerald-600 font-bold mb-6"><ChevronLeft /> Impostazioni</button>
        <h2 className="text-3xl font-bold dark:text-white mb-6">Centro Notifiche</h2>
        <div className="space-y-4">
          {notifications.length > 0 ? notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => !n.is_read && markRead(n.id)}
              className={`p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                n.is_read 
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-70' 
                  : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 border-l-8 border-l-emerald-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold dark:text-white">{n.title}</h4>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(n.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{n.message}</p>
              {!n.is_read && (
                <div className="mt-3 flex justify-end">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Check size={12} /> Segna come letto
                  </span>
                </div>
              )}
            </div>
          )) : (
            <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
              <Bell size={48} className="opacity-20" />
              <p>Nessun messaggio in arrivo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-emerald-500 text-white rounded-2xl shadow-2xl flex items-center gap-2 animate-in zoom-in duration-300">
          <CheckCircle2 size={16} /> <span className="font-bold text-xs uppercase tracking-wider">{feedback}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-3 rounded-3xl text-white"><User className="w-6 h-6" /></div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">{t.profile}</h3>
              <p className="text-gray-400 text-xs truncate">{email}</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowProfileModal(true)} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs">Modifica</button>
        </div>
        <div className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 dark:text-white font-bold">{settings.name}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <SettingsRow icon={<Bell className="text-emerald-500" size={20} />} label="Centro Notifiche" onClick={() => setView('notifications')} badge={unreadCount} />
        <div className="h-[1px] bg-emerald-50 dark:bg-gray-700 mx-6"></div>
        <SettingsRow icon={<Lock className="text-emerald-500" size={20} />} label={t.changePassword} onClick={() => setShowPasswordModal(true)} />
        <div className="h-[1px] bg-emerald-50 dark:bg-gray-700 mx-6"></div>
        <SettingsRow icon={<Wallet className="text-emerald-500" size={20} />} label="Gestisci Portafogli" onClick={() => setView('wallets')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><DollarSign className="text-emerald-500" size={20} /> Budget Mensile</h3>
          <input type="number" value={settings.monthlyBudget} onChange={(e) => onUpdate({ ...settings, monthlyBudget: Number(e.target.value) })} className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 dark:text-white font-black text-2xl" />
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">{settings.isDarkMode ? <Moon size={20} /> : <Sun size={20} />} Aspetto</h3>
          <button type="button" onClick={() => onUpdate({ ...settings, isDarkMode: !settings.isDarkMode })} className={`w-full py-4 rounded-2xl font-bold transition-all ${settings.isDarkMode ? 'bg-gray-900 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
            {settings.isDarkMode ? 'Tema Scuro' : 'Tema Chiaro'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-emerald-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><FileDown size={20} /> Archivio</h3>
        <button type="button" onClick={() => setView('history')} className="w-full py-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-2xl font-bold">Storico Mesi</button>
      </div>

      <div className="p-4 text-center">
        <button onClick={() => auth.signOut()} className="text-red-500 font-bold flex items-center gap-2 mx-auto"><LogOut size={18} /> Disconnetti</button>
      </div>

      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Profilo">
        <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4" placeholder="Nome" />
        <button onClick={handleUpdateProfile} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg">Salva</button>
      </Modal>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambia Password">
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4" placeholder="Nuova password" />
        <button onClick={() => auth.updatePassword(newPassword).then(() => setShowPasswordModal(false))} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold shadow-lg">Aggiorna</button>
      </Modal>
    </div>
  );
};
