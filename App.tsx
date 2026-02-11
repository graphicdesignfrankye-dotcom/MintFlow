import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { AiInsights } from './components/AiInsights';
import { SettingsView } from './components/SettingsView';
import { RicaricheView } from './components/RicaricheView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { Auth } from './components/Auth';
import { Expense, UserSettings, PaymentMethod, WalletConfig, CategoryConfig } from './types';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { db, supabase } from './services/supabase';
import { format } from 'date-fns';

const App: React.FC = () => {

  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // -----------------------------
  // USER SETTINGS + DARK MODE
  // -----------------------------
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mintflow_user_settings');

    const defaultWallets: WalletConfig[] = [
      { id: 'w1', name: 'Prepagata Flash', method: PaymentMethod.Flash, icon: 'zap' },
      { id: 'w2', name: 'Prepagata Revolut', method: PaymentMethod.Revolut, icon: 'wallet' },
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

    const defaults: UserSettings = {
      name: 'Utente',
      monthlyBudget: 1000,
      currency: '€',
      isDarkMode: false,
      wallets: defaultWallets,
      categories: defaultCategories,
      language: 'it'
    };

    if (!saved) return defaults;
    try { return { ...defaults, ...JSON.parse(saved) }; }
    catch { return defaults; }
  });

  // -----------------------------
  // INIZIALIZZA SESSIONE
  // -----------------------------
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsInitialLoading(false);
    }
    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // -----------------------------
  // FETCH SPESE
  // -----------------------------
  const fetchExpenses = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setIsLoading(true);
      const data = await db.getExpenses(session.user.id);
      setExpenses(data);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) fetchExpenses();
  }, [session, fetchExpenses]);

  // -----------------------------
  // SALVA SPESA
  // -----------------------------
  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      let saved: Expense | null;

      saved = await db.addExpense(expenseData, session.user.id);

      if (saved) {
        setExpenses(prev => [saved!, ...prev]);
        setSuccessToast("Operazione completata!");
        setTimeout(() => setSuccessToast(null), 2500);
      }

    } finally {
      setIsSyncing(false);
    }
  };

  if (isInitialLoading)
    return <div className="min-h-screen flex items-center justify-center bg-mint-50">
      <Loader2 className="animate-spin text-emerald-500" size={48} />
    </div>;

  if (!session)
    return <Auth onSuccess={() => { }} />;

  // -----------------------------
  //  ⭐  QUI LA MODIFICA IMPORTANTE
  // -----------------------------
  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      lang={userSettings.language}
      isDark={userSettings.isDarkMode}      // ⭐ SENZA QUESTA RIGA, DARK MODE NON FUNZIONA
    >
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">

        {successToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl">
            {successToast}
          </div>
        )}

        {activeTab === 'dashboard' &&
          <Dashboard
            expenses={expenses}
            budget={userSettings.monthlyBudget}
            userName={userSettings.name}
            currency={userSettings.currency}
            wallets={userSettings.wallets}
            categories={userSettings.categories}
            lang={userSettings.language}
          />
        }

        {activeTab === 'list' &&
          <ExpenseList
            expenses={expenses}
            onDelete={id => setExpenseToDelete(id)}
            onEdit={ex => { }}
            currency={userSettings.currency}
            wallets={userSettings.wallets}
            categories={userSettings.categories}
          />
        }

        {activeTab === 'ricariche' &&
          <RicaricheView
            onRefill={() => { }}
            onSaveExpense={handleSaveExpense}
            expenses={expenses}
            currency={userSettings.currency}
            wallets={userSettings.wallets}
          />
        }

        {activeTab === 'ai' &&
          <AiInsights expenses={expenses} />
        }

        {activeTab === 'settings' &&
          <SettingsView
            settings={userSettings}
            onUpdate={setUserSettings}
            onClearData={() => { }}
            onImport={() => { }}
            onExport={() => { }}
            expenses={expenses}
            email={session.user.email}
          />
        }

        {activeTab === 'subscriptions' &&
          <SubscriptionsView
            expenses={expenses}
            onAddSub={() => { }}
            onDelete={() => { }}
            currency={userSettings.currency}
          />
        }

      </div>
    </Layout>
  );
};

export default App;
