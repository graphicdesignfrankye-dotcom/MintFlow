
import React, { useState, useEffect } from 'react';
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
import { Expense, Category, UserSettings, PaymentMethod, WalletConfig } from './types';
import { Plus, ScanLine, Cloud, Loader2, CreditCard, PartyPopper, History } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { startOfMonth, format } from 'date-fns';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNewMonthToast, setShowNewMonthToast] = useState(false);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mintflow_user_settings');
    const defaultWallets: WalletConfig[] = [
      { id: 'w1', name: 'Prepagata Flash', method: PaymentMethod.Flash, icon: 'zap' },
      { id: 'w2', name: 'Prepagata Revolut', method: PaymentMethod.Revolut, icon: 'wallet' },
      { id: 'w3', name: 'App Q8', method: PaymentMethod.AppQ8, icon: 'fuel' }
    ];

    const defaultSettings: UserSettings = {
      name: 'Utente',
      monthlyBudget: 1000,
      currency: '€',
      isDarkMode: false,
      wallets: defaultWallets
    };

    if (!saved) return defaultSettings;
    
    try {
      const parsed = JSON.parse(saved);
      // Migrazione dai vecchi labels ai nuovi wallets se necessario
      if (parsed.rechargeLabels && !parsed.wallets) {
        parsed.wallets = [
          { id: 'w1', name: parsed.rechargeLabels.flash || 'Prepagata Flash', method: PaymentMethod.Flash, icon: 'zap' },
          { id: 'w2', name: parsed.rechargeLabels.revolut || 'Prepagata Revolut', method: PaymentMethod.Revolut, icon: 'wallet' },
          { id: 'w3', name: parsed.rechargeLabels.q8 || 'App Q8', method: PaymentMethod.AppQ8, icon: 'fuel' }
        ];
        delete parsed.rechargeLabels;
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

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-mint-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-2xl animate-pulse">
          <CreditCard size={48} />
        </div>
        <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <Loader2 size={20} className="animate-spin" />
          <span>MintFlow Sync...</span>
        </div>
      </div>
    );
  }

  if (!session) return <Auth onSuccess={() => {}} />;

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      if (prefill?.id) {
        const updated = await db.updateExpense(prefill.id, expenseData);
        if (updated) setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const newExpense = await db.addExpense(expenseData, session.user.id);
        if (newExpense) setExpenses(prev => [newExpense, ...prev]);
      }
      setShowForm(false);
      setPrefill(null);
    } catch (err: any) {
      alert(`Errore Cloud: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Eliminare questa spesa?")) return;
    try {
      setIsSyncing(true);
      await db.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Resettare tutte le spese dal cloud?')) {
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

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
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
               {activeTab === 'list' ? 'Le tue Spese' : 
                activeTab === 'ai' ? 'AI Insights' : 
                activeTab === 'ricariche' ? 'Portafogli' : 
                activeTab === 'subscriptions' ? 'Abbonamenti' : 'Impostazioni'}
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
                expenses={expenses} budget={userSettings.monthlyBudget} userName={userSettings.name} currency={userSettings.currency} wallets={userSettings.wallets}
              />
            )}
            
            {activeTab === 'list' && (
              <div className="space-y-6">
                <div className="flex gap-3">
                  <button onClick={() => { setPrefill(null); setShowForm(true); }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"><Plus size={20} /> <span className="font-bold">Aggiungi</span></button>
                  <button onClick={() => setShowScanner(true)} className="flex-1 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm"><ScanLine size={20} /> <span className="font-bold">Scan</span></button>
                </div>
                <ExpenseList expenses={expenses} onDelete={deleteExpense} onEdit={(ex) => {setPrefill(ex); setShowForm(true);}} currency={userSettings.currency} wallets={userSettings.wallets} />
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionsView expenses={expenses} onAddSub={() => { setPrefill({ isSubscription: true, category: Category.Abbonamenti }); setShowForm(true); }} onDelete={deleteExpense} currency={userSettings.currency} />
            )}

            {activeTab === 'ricariche' && (
              <RicaricheView onRefill={(wallet) => {
                setPrefill({ 
                  description: `Ricarica ${wallet.name}`, 
                  category: Category.Altro, 
                  paymentMethod: PaymentMethod.Bancomat, 
                  date: format(new Date(), 'yyyy-MM-dd') 
                });
                setShowForm(true);
              }} expenses={expenses} currency={userSettings.currency} wallets={userSettings.wallets} />
            )}

            {activeTab === 'ai' && <AiInsights expenses={expenses} />}
            {activeTab === 'settings' && <SettingsView settings={userSettings} onUpdate={setUserSettings} onClearData={handleClearData} expenses={expenses} email={session.user.email} />}
          </>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => { setShowForm(false); setPrefill(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">✕</button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{prefill?.id ? 'Modifica' : 'Nuova Spesa'}</h2>
              <ExpenseForm onSubmit={handleSaveExpense} onCancel={() => { setShowForm(false); setPrefill(null); }} initialData={prefill || undefined} currency={userSettings.currency} wallets={userSettings.wallets} />
            </div>
          </div>
        )}

        {showScanner && <ReceiptScanner onDetected={(res) => { setPrefill({...res, date: format(new Date(), 'yyyy-MM-dd')}); setShowScanner(false); setShowForm(true); }} onClose={() => setShowScanner(false)} />}
      </div>
    </Layout>
  );
};

export default App;
