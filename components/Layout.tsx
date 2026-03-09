
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List, BrainCircuit, PiggyBank, Settings, Zap, Repeat, ArrowRightLeft, Bell, X, Trash2, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { translations } from '../utils/i18n';
import { ProfileType, AppNotification } from '../types';
import { supabase, db } from '../services/supabase';
import { ConfirmModal } from './ConfirmModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'list' | 'ai' | 'settings' | 'ricariche' | 'subscriptions' | 'extra';
  setActiveTab: (tab: 'dashboard' | 'list' | 'ai' | 'settings' | 'ricariche' | 'subscriptions' | 'extra') => void;
  lang?: 'it' | 'en';
  currentProfile?: ProfileType;
  onRefresh?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, lang = 'it', currentProfile = 'personal', onRefresh }) => {
  const t = translations[lang].nav;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifListOpen, setIsNotifListOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Stato per il modal di conferma eliminazione
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, id: string | null}>({ isOpen: false, id: null });

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await supabase.auth.refreshSession();
        await onRefresh();
      } catch (e) {}
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await db.getNotifications(user.id);
      setNotifications(data);

      const channel = supabase
        .channel(`user-notifs-${user.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, 
          (payload) => {
            setNotifications(prev => [payload.new as AppNotification, ...prev]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    fetchAndSubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleOpenNotif = async (n: AppNotification) => {
    setSelectedNotif(n);
    setIsNotifListOpen(false);
    if (!n.is_read) {
      await db.markNotificationRead(n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
    }
  };

  const requestDeleteNotif = (id: string) => {
    setConfirmDelete({ isOpen: true, id });
  };

  const executeDeleteNotif = async () => {
    if (confirmDelete.id) {
      try {
        await db.deleteNotification(confirmDelete.id);
        setNotifications(prev => prev.filter(n => n.id !== confirmDelete.id));
        showToast("Messaggio eliminato definitivamente", 'success');
        setSelectedNotif(null);
      } catch (err: any) {
        showToast("Errore eliminazione: " + err.message, 'error');
      } finally {
        setConfirmDelete({ isOpen: false, id: null });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* Header Desktop */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                <PiggyBank className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                MintFlow
              </span>
            </div>

            {/* Notification Bell */}
            <div className="flex items-center gap-2">
              {onRefresh && (
                <button 
                  onClick={handleRefresh}
                  className={`p-2 rounded-xl transition-all text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`}
                  title="Aggiorna dati"
                >
                  <Repeat size={20} />
                </button>
              )}
              
              <div className="relative">
                <button 
                  onClick={() => setIsNotifListOpen(!isNotifListOpen)}
                className={`p-2 rounded-xl transition-all relative ${isNotifListOpen ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-800'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotifListOpen && (
                <div className="absolute left-0 mt-3 w-72 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-sm">Notifiche</h3>
                    <button onClick={() => setIsNotifListOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-gray-400 text-xs">Nessun messaggio.</p>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleOpenNotif(n)}
                          className={`p-4 border-b border-gray-50 dark:border-gray-700 cursor-pointer hover:bg-emerald-50/30 transition-colors ${!n.is_read ? 'bg-emerald-50/20' : ''}`}
                        >
                          <div className="flex gap-3">
                            <Mail size={14} className={!n.is_read ? 'text-emerald-500' : 'text-gray-300'} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{n.title}</p>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="hidden md:flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-emerald-50 dark:border-gray-700">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label={t.dashboard} />
            <NavButton active={activeTab === 'list'} onClick={() => setActiveTab('list')} icon={<List size={18} />} label={t.expenses} />
            <NavButton active={activeTab === 'extra'} onClick={() => setActiveTab('extra')} icon={<ArrowRightLeft size={18} />} label={t.extra} />
            <NavButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} icon={<Repeat size={18} />} label={t.subscriptions} />
            <NavButton active={activeTab === 'ricariche'} onClick={() => setActiveTab('ricariche')} icon={<Zap size={18} />} label={t.wallets} />
            <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<BrainCircuit size={18} />} label={t.ai} />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label={t.settings} />
          </div>
        </div>
      </header>

      {/* Popup Messaggio Notifica */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 border border-emerald-100 dark:border-gray-700 overflow-hidden relative">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 text-emerald-500">
              <Mail size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-4 leading-tight">{selectedNotif.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-10 font-medium">
              {selectedNotif.message}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedNotif(null)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
              >
                Chiudi
              </button>
              <button 
                onClick={() => requestDeleteNotif(selectedNotif.id)}
                className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95"
              >
                <Trash2 size={18} /> Cancella
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Eliminazione */}
      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        title="Elimina Notifica"
        message="Sei sicuro di voler eliminare questo messaggio? L'azione è irreversibile."
        onConfirm={executeDeleteNotif}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
        confirmText="Elimina"
        type="danger"
      />

      <main>{children}</main>

      {/* Bottom Nav Scorrevole per Mobile (Mostra tutte le sezioni) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-emerald-100 dark:border-gray-800 h-20 px-2 flex items-center overflow-x-auto no-scrollbar gap-4 pb-4 transition-colors z-50">
        <MobileNavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard />}
          label="Home"
        />
        <MobileNavButton 
          active={activeTab === 'list'} 
          onClick={() => setActiveTab('list')}
          icon={<List />}
          label={t.expenses}
        />
        <MobileNavButton 
          active={activeTab === 'extra'} 
          onClick={() => setActiveTab('extra')}
          icon={<ArrowRightLeft />}
          label={t.extra}
        />
        <MobileNavButton 
          active={activeTab === 'subscriptions'} 
          onClick={() => setActiveTab('subscriptions')}
          icon={<Repeat />}
          label="Subs"
        />
        <MobileNavButton 
          active={activeTab === 'ricariche'} 
          onClick={() => setActiveTab('ricariche')}
          icon={<Zap />}
          label="Wallets"
        />
        <MobileNavButton 
          active={activeTab === 'ai'} 
          onClick={() => setActiveTab('ai')}
          icon={<BrainCircuit />}
          label="AI"
        />
        <MobileNavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={<Settings />}
          label="Set."
        />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
      active 
        ? 'bg-emerald-500 text-white shadow-md font-semibold' 
        : 'text-emerald-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-700/50'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all min-w-[50px] shrink-0 ${
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
    }`}
  >
    {React.cloneElement(icon, { size: 20, strokeWidth: active ? 2.5 : 2 })}
    <span className="text-[9px] font-bold uppercase tracking-tighter truncate">{label}</span>
  </button>
);
