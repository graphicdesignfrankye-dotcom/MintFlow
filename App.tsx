
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { AiInsights } from './components/AiInsights';
import { SettingsView } from './components/SettingsView';
import { RicaricheView } from './components/RicaricheView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { ExtraView } from './components/ExtraView';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { Expense, UserSettings, PaymentMethod, WalletConfig, CategoryConfig, ProfileType } from './types';
import { Plus, Loader2, ShieldAlert, Target, Mail, X } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { format, isSameMonth } from 'date-fns';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // STATO LOCK SCREEN: null = in controllo, true = bloccato, false = libero
  const [isBanned, setIsBanned] = useState<boolean | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mintflow_user_settings');
    const defaultWallets: WalletConfig[] = [
      { id: 'w0', name: 'Contanti', method: PaymentMethod.Contanti, icon: 'wallet' },
      { id: 'w1', name: 'Prepagata Flash', method: PaymentMethod.Flash, icon: 'zap' },
      { id: 'w2', name: 'Prepagata Revolut', method: PaymentMethod.Revolut, icon: 'credit-card' },
      { id: 'w3', name: 'App Q8', method: PaymentMethod.AppQ8, icon: 'fuel' }
    ];

    const defaultCategories: CategoryConfig[] = [
      { id: 'c1', name: 'Sigarette', color: '#ef4444' },
      { id: 'c2', name: 'Benzina', color: '#f97316' },
      { id: 'c3', name: 'Autostrada', color: '#eab308' },
      { id: 'c4', name: 'Ricarica Chiavetta', color: '#84cc16' },
      { id: 'c5', name: 'Svago', color: '#06b6d4' },
      { id: 'c6', name: 'Salute', color: '#ec4899' },
      { id: 'c7', name: 'Abbonamenti', isSubscriptionDefault: true, color: '#8b5cf6' },
      { id: 'c8', name: 'Altro', color: '#64748b' }
    ];

    const defaultSettings: UserSettings = {
      name: 'Utente',
      monthlyBudget: 1000,
      currency: '€',
      isDarkMode: false,
      wallets: defaultWallets,
      categories: defaultCategories,
      language: 'it',
      currentProfile: 'personal',
      monthlyOffset: 0,
      lastOffsetDate: new Date().toISOString()
    };

    if (!saved) return defaultSettings;
    try {
      const parsed = JSON.parse(saved);
      const merged = { ...defaultSettings, ...parsed, currentProfile: 'personal' };
      const now = new Date();
      const lastOffsetDate = merged.lastOffsetDate ? new Date(merged.lastOffsetDate) : null;
      if (!lastOffsetDate || !isSameMonth(lastOffsetDate, now)) {
        merged.monthlyOffset = 0;
        merged.lastOffsetDate = now.toISOString();
      }
      return merged;
    } catch { return defaultSettings; }
  });

  useEffect(() => {
    if (userSettings.isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [userSettings.isDarkMode]);

  const expenses = useMemo(() => allExpenses.filter(e => (e.profile || 'personal') === 'personal' && !e.isExtra), [allExpenses]);
  const extraExpenses = useMemo(() => allExpenses.filter(e => (e.profile || 'personal') === 'personal' && e.isExtra), [allExpenses]);
  const currentBudget = userSettings.monthlyBudget;

  useEffect(() => {
    localStorage.setItem('mintflow_user_settings', JSON.stringify(userSettings));
  }, [userSettings]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'ricariche' | 'ai' | 'settings' | 'subscriptions' | 'extra'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Expense> | null>(null);

  // --- LOGICA DI SICUREZZA E REALTIME ---
  useEffect(() => {
    let channel: any;

    const checkStatus = async (userId: string) => {
      console.log("[Security] Controllo stato per:", userId);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error("[Security] Errore DB:", error.message);
          setIsBanned(false);
          return;
        }

        console.log("[Security] Stato ricevuto:", data.status);
        // Verifica esatta: 'disabled' minuscolo
        setIsBanned(data.status === 'disabled');
      } catch (err) {
        console.error("[Security] Errore critico:", err);
        setIsBanned(false);
      }
    };

    // 1. Controllo iniziale immediato
    const initCheck = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        const metadata = currentSession.user.user_metadata;
        const displayName = metadata.full_name || metadata.display_name || metadata.name || currentSession.user.email?.split('@')[0] || 'Utente';
        setUserSettings(prev => ({ ...prev, name: displayName }));
        await db.upsertProfile(currentSession.user.id, currentSession.user.email || '', displayName);
        await checkStatus(currentSession.user.id);
      } else {
        setIsBanned(false);
      }
      setIsInitialLoading(false);
    };
    initCheck();

    // 2. Monitoraggio sessione e Realtime
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await checkStatus(session.user.id);

        if (channel) supabase.removeChannel(channel);
        
        channel = supabase
          .channel(`status-check-${session.user.id}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${session.user.id}` 
          }, (payload) => {
            console.log("[Security] Realtime update:", payload.new.status);
            setIsBanned(payload.new.status === 'disabled');
          })
          .subscribe();
      } else {
        setIsBanned(false);
        if (channel) supabase.removeChannel(channel);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchExpenses = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setIsLoading(true);
      const data = await db.getExpenses(session.user.id);
      setAllExpenses(data);
    } catch (err) {
      console.error("Errore caricamento:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => { if (session?.user?.id) fetchExpenses(); }, [session, fetchExpenses]);

  const handleAdminLogin = () => {
    auth.signIn('admin@mintflow.com', 'admin123').then(() => {
        window.location.reload();
    }).catch(() => {
        alert("Credenziali admin errate.");
    });
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      const dataToSave = { ...expenseData, profile: 'personal' as ProfileType };
      let saved: Expense;
      if (prefill?.id) saved = await db.updateExpense(prefill.id, dataToSave);
      else saved = await db.addExpense(dataToSave, session.user.id);
      setAllExpenses(prev => prefill?.id ? prev.map(e => e.id === saved.id ? saved : e) : [saved, ...prev]);
      setShowForm(false);
      setPrefill(null);
      setSuccessToast("Operazione completata!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) { alert(`Errore: ${err.message}`); }
    finally { setIsSyncing(false); }
  };

  if (isInitialLoading) return <div className="min-h-screen flex items-center justify-center bg-mint-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  if (!session) return <Auth onSuccess={() => setIsBanned(false)} onAdminLogin={handleAdminLogin} />;
  if (session.user.email === 'admin@mintflow.com') return <AdminDashboard onLogout={() => setSession(null)} />;

  return (
    <div className="relative">
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} lang={userSettings.language}>
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24 relative">
          {successToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4">{successToast}</div>}
          {activeTab === 'dashboard' && <Dashboard expenses={expenses} budget={currentBudget} userName={userSettings.name} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} lang={userSettings.language} userSettings={userSettings} onUpdateSettings={setUserSettings} />}
          {activeTab === 'list' && (
            <div className="space-y-6">
              <button onClick={() => { setPrefill(null); setShowForm(true); }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg transition-transform active:scale-95"><Plus size={20} /> Aggiungi Spesa</button>
              <ExpenseList expenses={expenses} onDelete={id => setExpenseToDelete(id)} onEdit={ex => { setPrefill(ex); setShowForm(true); }} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} />
            </div>
          )}
          {activeTab === 'ricariche' && <RicaricheView onRefill={w => { setPrefill({ description: `Ricarica ${w.name}`, category: 'Altro', paymentMethod: PaymentMethod.Bancomat, date: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }} onSaveExpense={handleSaveExpense} onUpdateWallets={w => setUserSettings(prev => ({ ...prev, wallets: w }))} expenses={expenses} currency={userSettings.currency} wallets={userSettings.wallets} />}
          {activeTab === 'ai' && <AiInsights expenses={expenses} />}
          {activeTab === 'settings' && <SettingsView settings={userSettings} onUpdate={setUserSettings} onClearData={() => {}} expenses={expenses} email={session.user.email} />}
          {activeTab === 'subscriptions' && <SubscriptionsView expenses={expenses} onAddSub={() => { setPrefill({ isSubscription: true }); setShowForm(true); }} onDelete={id => setExpenseToDelete(id)} currency={userSettings.currency} />}
          {activeTab === 'extra' && <ExtraView expenses={extraExpenses} onAdd={handleSaveExpense} onDelete={id => setExpenseToDelete(id)} currency={userSettings.currency} />}
          
          {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><X size={24} /></button>
                <h2 className="text-2xl font-bold mb-6 dark:text-white">{prefill?.id ? 'Modifica Spesa' : 'Nuova Spesa'}</h2>
                <ExpenseForm onSubmit={handleSaveExpense} onCancel={() => setShowForm(false)} initialData={prefill || undefined} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} expenses={expenses} />
              </div>
            </div>
          )}
        </div>
      </Layout>

      {/* --- OVERLAY LOCK SCREEN (PRIORITÀ MASSIMA) --- */}
      {isBanned === true && (
        <div 
          className="fixed inset-0 z-[999999] bg-white dark:bg-gray-900 flex items-center justify-center p-6 touch-none overflow-hidden animate-in fade-in duration-300"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl" />
          
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-[3.5rem] p-12 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.3)] border border-white dark:border-gray-700 text-center animate-in zoom-in-95 duration-300 relative z-10">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="relative w-full h-full bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-inner">
                <ShieldAlert className="text-red-500" size={48} />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              Accesso Sospeso
            </h2>
            
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed px-2">
              Il tuo account è momentaneamente limitato. Per motivi di sicurezza o amministrativi, non puoi accedere ai tuoi dati finanziari in questo momento.
            </p>

            <div className="grid gap-3">
              <a 
                href="mailto:assistenza@mintflow.com" 
                className="flex items-center justify-center gap-2 w-full py-5 bg-emerald-500 text-white rounded-3xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95"
              >
                <Mail size={20} />
                Contatta l'Amministratore
              </a>
              
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-3xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
              >
                Verifica Stato Account
              </button>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                MintFlow Protection Service
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
