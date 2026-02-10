
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { AiInsights } from './components/AiInsights';
import { ReceiptScanner } from './components/ReceiptScanner';
import { SettingsView } from './components/SettingsView';
import { RicaricheView } from './components/RicaricheView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { Auth } from './components/Auth';
import { Expense, UserSettings, PaymentMethod, WalletConfig, CategoryConfig } from './types';
import { Plus, ScanLine, Cloud, Loader2, PiggyBank, PartyPopper, History, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { startOfMonth, format, isSameMonth, parseISO, isAfter, endOfMonth } from 'date-fns';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNewMonthToast, setShowNewMonthToast] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Stato per gestire l'eliminazione
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mintflow_user_settings');
    const defaultWallets: WalletConfig[] = [
      { id: 'w1', name: 'Prepagata Flash', method: PaymentMethod.Flash, icon: 'zap' },
      { id: 'w2', name: 'Prepagata Revolut', method: PaymentMethod.Revolut, icon: 'wallet' },
      { id: 'w3', name: 'App Q8', method: PaymentMethod.AppQ8, icon: 'fuel' }
    ];

    const defaultCategories: CategoryConfig[] = [
      { id: 'c1', name: 'Sigarette', color: '#ef4444' }, // Rosso
      { id: 'c2', name: 'Benzina', color: '#f97316' }, // Arancione
      { id: 'c3', name: 'Autostrada', color: '#eab308' }, // Giallo scuro
      { id: 'c4', name: 'Ricarica Chiavetta', color: '#84cc16' }, // Lime
      { id: 'c5', name: 'Svago', color: '#06b6d4' }, // Ciano
      { id: 'c6', name: 'Salute', color: '#ec4899' }, // Rosa
      { id: 'c7', name: 'Abbonamenti', isSubscriptionDefault: true, color: '#8b5cf6' }, // Viola
      { id: 'c8', name: 'Altro', color: '#64748b' } // Grigio
    ];

    const defaultSettings: UserSettings = {
      name: 'Utente',
      monthlyBudget: 1000,
      currency: '€',
      isDarkMode: false,
      wallets: defaultWallets,
      categories: defaultCategories,
      language: 'it'
    };

    if (!saved) return defaultSettings;
    
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.categories) {
        parsed.categories = defaultCategories;
      } else {
        // Migration: assegna colori se mancano
        parsed.categories = parsed.categories.map((c: any, idx: number) => ({
          ...c,
          color: c.color || defaultCategories[idx % defaultCategories.length]?.color || '#10b981'
        }));
      }
      if (!parsed.language) {
        parsed.language = 'it';
      }
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'ricariche' | 'ai' | 'settings' | 'subscriptions'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Expense> | null>(null);

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const displayName = metadata.full_name || metadata.display_name || metadata.name || session.user.email?.split('@')[0] || 'Utente';
        setUserSettings(prev => ({ ...prev, name: displayName }));
      }
      setIsInitialLoading(false);
    };
    initSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const data = await db.getExpenses(session.user.id);
          setExpenses(data);
          const today = new Date();
          const currentMonthKey = format(startOfMonth(today), 'yyyy-MM');
          const lastArchivedMonth = localStorage.getItem('mintflow_last_archived');
          if (today.getDate() === 1 && lastArchivedMonth !== currentMonthKey) {
            setShowNewMonthToast(true);
            localStorage.setItem('mintflow_last_archived', currentMonthKey);
            setTimeout(() => setShowNewMonthToast(false), 8000);
          }
        } catch (err) {
          console.error("Errore caricamento:", err);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [session]);

  useEffect(() => {
    localStorage.setItem('mintflow_user_settings', JSON.stringify(userSettings));
    if (userSettings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userSettings]);

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      const expenseDate = parseISO(expenseData.date);
      const today = new Date();
      const isPast = !isSameMonth(expenseDate, today) && expenseDate < startOfMonth(today);
      const isFutureDate = isAfter(expenseDate, endOfMonth(today));
      
      let savedExpense: Expense | null = null;
      if (prefill?.id) {
        savedExpense = await db.updateExpense(prefill.id, expenseData);
        if (savedExpense) setExpenses(prev => prev.map(e => e.id === savedExpense!.id ? savedExpense! : e));
        setSuccessToast("Modifica salvata!");
      } else {
        savedExpense = await db.addExpense(expenseData, session.user.id);
        if (savedExpense) setExpenses(prev => [savedExpense!, ...prev]);
        setSuccessToast(isPast ? "Spesa salvata nello storico!" : isFutureDate ? "Spesa futura programmata!" : "Spesa aggiunta!");
      }
      
      setShowForm(false);
      setPrefill(null);

      // Se la spesa non è del mese corrente, portiamo l'utente sulla lista per fargliela vedere
      if (isPast || isFutureDate) {
        setActiveTab('list');
      }

      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Errore Cloud: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const requestDeleteExpense = useCallback((id: string) => {
    setExpenseToDelete(id);
  }, []);

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    try {
      setIsSyncing(true);
      await db.deleteExpense(expenseToDelete);
      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete));
      setSuccessToast("Spesa eliminata.");
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setIsSyncing(false);
      setExpenseToDelete(null);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Resettare tutte le spese dal cloud?')) {
      try {
        setIsSyncing(true);
        await db.clearAll(session.user.id);
        setExpenses([]);
      } catch (err: any) {
        alert("Errore: " + err.message);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-2xl animate-pulse">
          <PiggyBank size={48} />
        </div>
        <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <Loader2 size={20} className="animate-spin" />
          <span>MintFlow Sync...</span>
        </div>
      </div>
    );
  }

  if (!session) return <Auth onSuccess={() => {}} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} lang={userSettings.language}>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Success Toast */}
        {successToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={18} />
            <span className="font-bold text-sm">{successToast}</span>
          </div>
        )}

        {showNewMonthToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm bg-emerald-500 text-white p-6 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0"><PartyPopper size={24} /></div>
            <div>
              <p className="font-bold text-sm">Nuovo mese iniziato! 🚀</p>
              <p className="text-[10px] opacity-90 uppercase font-bold tracking-widest mt-1 flex items-center gap-1"><History size={10} /> Dati archiviati</p>
            </div>
            <button onClick={() => setShowNewMonthToast(false)} className="ml-auto opacity-50">✕</button>
          </div>
        )}

        <div className="flex justify-end items-center mb-4 px-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {isSyncing ? <><Loader2 size={12} className="animate-spin text-emerald-500" /> <span className="text-emerald-500">Cloud Sync...</span></> : <><Cloud size={12} className="text-emerald-400" /> <span>Sincronizzato</span></>}
          </div>
        </div>

        {activeTab !== 'dashboard' && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
               {activeTab === 'list' ? (userSettings.language === 'en' ? 'Your Expenses' : 'Le tue Spese') : 
                activeTab === 'ai' ? 'AI Insights' : 
                activeTab === 'ricariche' ? (userSettings.language === 'en' ? 'Wallets' : 'Portafogli') : 
                activeTab === 'subscriptions' ? (userSettings.language === 'en' ? 'Subscriptions' : 'Abbonamenti') : 
                (userSettings.language === 'en' ? 'Settings' : 'Impostazioni')}
            </h1>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 size={48} className="text-emerald-500 animate-spin" />
             <p className="text-gray-400 font-medium">Caricamento...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                expenses={expenses} 
                budget={userSettings.monthlyBudget} 
                userName={userSettings.name} 
                currency={userSettings.currency} 
                wallets={userSettings.wallets}
                categories={userSettings.categories}
                lang={userSettings.language}
              />
            )}
            
            {activeTab === 'list' && (
              <div className="space-y-6">
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setPrefill(null); setShowForm(true); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"><Plus size={20} /> <span className="font-bold">{userSettings.language === 'en' ? 'Add' : 'Aggiungi'}</span></button>
                  <button type="button" onClick={() => setShowScanner(true)} className="flex-1 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"><ScanLine size={20} /> <span className="font-bold">Scan</span></button>
                </div>
                <ExpenseList expenses={expenses} onDelete={requestDeleteExpense} onEdit={(ex) => {setPrefill(ex); setShowForm(true);}} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} />
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionsView expenses={expenses} onAddSub={() => { 
                const subCat = userSettings.categories.find(c => c.isSubscriptionDefault)?.name || 'Abbonamenti';
                setPrefill({ isSubscription: true, category: subCat }); 
                setShowForm(true); 
              }} onDelete={requestDeleteExpense} currency={userSettings.currency} />
            )}

            {activeTab === 'ricariche' && (
              <RicaricheView 
                onRefill={(wallet) => {
                  setPrefill({ 
                    description: `Ricarica ${wallet.name}`, 
                    category: 'Altro', 
                    paymentMethod: PaymentMethod.Bancomat, 
                    date: format(new Date(), 'yyyy-MM-dd') 
                  });
                  setShowForm(true);
                }} 
                onSaveExpense={handleSaveExpense}
                expenses={expenses} 
                currency={userSettings.currency} 
                wallets={userSettings.wallets} 
              />
            )}

            {activeTab === 'ai' && <AiInsights expenses={expenses} />}
            {activeTab === 'settings' && <SettingsView settings={userSettings} onUpdate={setUserSettings} onClearData={handleClearData} expenses={expenses} email={session.user.email} />}
          </>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button type="button" onClick={() => { setShowForm(false); setPrefill(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2">✕</button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{prefill?.id ? 'Modifica' : 'Nuova Spesa'}</h2>
              <ExpenseForm 
                onSubmit={handleSaveExpense} 
                onCancel={() => { setShowForm(false); setPrefill(null); }} 
                initialData={prefill || undefined} 
                currency={userSettings.currency} 
                wallets={userSettings.wallets} 
                categories={userSettings.categories} 
                expenses={expenses}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {expenseToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-red-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300 border-4 border-red-100 dark:border-red-900/30">
              <div className="bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Elimina Spesa?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Questa azione è irreversibile. Sei sicuro di voler procedere?
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteExpense}
                  disabled={isSyncing}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-colors"
                >
                  {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />} Elimina
                </button>
                <button 
                  onClick={() => setExpenseToDelete(null)}
                  className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {showScanner && <ReceiptScanner onDetected={(res) => { setPrefill({...res, date: format(new Date(), 'yyyy-MM-dd')}); setShowScanner(false); setShowForm(true); }} onClose={() => setShowScanner(false)} />}
      </div>
    </Layout>
  );
};

export default App;
