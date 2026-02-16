
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
import { Plus, Loader2, Ban, Target } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { format, isSameMonth } from 'date-fns';

interface BudgetPromptModalProps {
  onConfirm: (amount: number) => void;
  initialValue: number;
  currency: string;
  isNewUser: boolean;
}

const BudgetPromptModal: React.FC<BudgetPromptModalProps> = ({ onConfirm, initialValue, currency, isNewUser }) => {
  const [value, setValue] = useState(initialValue.toString());

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl text-center animate-in zoom-in-95 border-4 border-emerald-500 relative">
        <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
          <Target size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
          {isNewUser ? 'Benvenuto!' : 'Budget Mensile'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {isNewUser 
            ? 'Per iniziare, imposta il tuo budget mensile per tenere traccia delle tue finanze.' 
            : 'È un nuovo mese! Confermi o modifichi il tuo budget?'}
        </p>
        
        <div className="relative mb-6">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">{currency}</span>
          <input 
            type="number" 
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-emerald-500 outline-none font-black text-3xl dark:text-white text-center shadow-inner"
          />
        </div>

        <button 
          onClick={() => onConfirm(parseFloat(value) || 0)}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-transform active:scale-95 shadow-lg shadow-emerald-200 dark:shadow-none"
        >
          Inizia a Risparmiare
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
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

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const displayName = metadata.full_name || metadata.display_name || metadata.name || session.user.email?.split('@')[0] || 'Utente';
        setUserSettings(prev => ({ ...prev, name: displayName }));
        db.upsertProfile(session.user.id, session.user.email || '', displayName);
      }
      setIsInitialLoading(false);
    };
    initSession();

    // IL BUTTAFUORI DI SICUREZZA
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        // Ogni volta che un utente è loggato, controlliamo il suo profilo nel DB
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Errore controllo sicurezza:", error.message);
          return;
        }

        // IL BLOCCO: Se lo stato è 'disabled', forziamo il logout
        if (profile && profile.status === 'disabled') {
          await supabase.auth.signOut();
          setIsDisabled(true);
          alert("⛔ ACCOUNT DISABILITATO\n\nIl tuo accesso è stato revocato dall'amministratore.");
          window.location.href = '/'; 
          return;
        }

        if (event === 'SIGNED_IN') {
          const metadata = session.user.user_metadata;
          const displayName = metadata.full_name || metadata.display_name || metadata.name || session.user.email?.split('@')[0] || 'Utente';
          await db.upsertProfile(session.user.id, session.user.email || '', displayName);
        }
      }
    });
    return () => subscription.unsubscribe();
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
    // Nota: l'admin deve loggare con email reale per essere riconosciuto dal DB
    // Questo è solo un placeholder se l'utente clicca il tasto rapido, ma l'ID deve essere UUID valido
    auth.signIn('admin@mintflow.com', 'admin123').then(() => {
        window.location.reload();
    }).catch(() => {
        alert("Credenziali admin errate o non configurate.");
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
  if (isDisabled) return (
    <div className="fixed inset-0 bg-red-50 dark:bg-gray-900 z-[9999] flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-red-100 text-red-600 p-6 rounded-full mb-6"><Ban size={48} /></div>
      <h1 className="text-3xl font-black mb-2">Account Disabilitato</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Contatta admin@mintflow.com per assistenza.</p>
      <button onClick={() => window.location.reload()} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold">Riprova</button>
    </div>
  );

  if (!session) return <Auth onSuccess={() => setIsDisabled(false)} onAdminLogin={handleAdminLogin} />;
  if (session.user.email === 'admin@mintflow.com') return <AdminDashboard onLogout={() => setSession(null)} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} lang={userSettings.language}>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {successToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4">{successToast}</div>}
        {activeTab === 'dashboard' && <Dashboard expenses={expenses} budget={currentBudget} userName={userSettings.name} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} lang={userSettings.language} userSettings={userSettings} onUpdateSettings={setUserSettings} />}
        {activeTab === 'list' && (
          <div className="space-y-6">
            <button onClick={() => { setPrefill(null); setShowForm(true); }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg"><Plus size={20} /> Aggiungi Spesa</button>
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
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-md p-8 shadow-2xl relative">
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400">✕</button>
              <h2 className="text-2xl font-bold mb-6">{prefill?.id ? 'Modifica' : 'Nuova Spesa'}</h2>
              <ExpenseForm onSubmit={handleSaveExpense} onCancel={() => setShowForm(false)} initialData={prefill || undefined} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} expenses={expenses} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;
