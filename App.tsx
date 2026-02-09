
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { AiInsights } from './components/AiInsights';
import { ReceiptScanner } from './components/ReceiptScanner';
import { SettingsView } from './components/SettingsView';
import { Auth } from './components/Auth';
import { Expense, Category, UserSettings } from './types';
import { Plus, ScanLine, Cloud, Loader2, CreditCard } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('mintflow_user_settings');
    return saved ? JSON.parse(saved) : {
      name: 'Utente',
      monthlyBudget: 1000,
      currency: '€',
      isDarkMode: false
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'ai' | 'settings'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Expense> | null>(null);

  // Gestione Sessione Supabase
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        setUserSettings(prev => ({ 
          ...prev, 
          name: session.user.user_metadata.display_name || prev.name 
        }));
      }
      setIsInitialLoading(false);
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Caricamento dati basato sulla sessione
  useEffect(() => {
    if (session?.user?.id) {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const data = await db.getExpenses(session.user.id);
          setExpenses(data);
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
        <div className="bg-emerald-500 p-5 rounded-3xl text-white shadow-2xl animate-bounce">
          <CreditCard size={48} />
        </div>
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
          <Loader2 size={20} className="animate-spin" />
          <span>Caricamento sessione...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />;
  }

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      const newExpense = await db.addExpense(expenseData, session.user.id);
      setExpenses(prev => [newExpense, ...prev]);
      setShowForm(false);
      setPrefill(null);
    } catch (err) {
      alert("Errore nel salvataggio cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      setIsSyncing(true);
      await db.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert("Errore nell'eliminazione cloud.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (confirm('Sei sicuro? Questo cancellerà TUTTE le tue spese dal cloud.')) {
      try {
        setIsSyncing(true);
        await db.clearAll(session.user.id);
        setExpenses([]);
      } catch (err) {
        alert("Errore nella pulizia del database.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleReceiptDetected = (data: { description: string; amount: number; category: Category }) => {
    setPrefill({
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: new Date().toISOString().split('T')[0]
    });
    setShowScanner(false);
    setShowForm(true);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="flex justify-end mb-4 px-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {isSyncing ? (
              <>
                <Loader2 size={12} className="animate-spin text-emerald-500" />
                <span className="text-emerald-500">Sincronizzazione...</span>
              </>
            ) : (
              <>
                <Cloud size={12} className="text-emerald-400" />
                <span>Account Cloud Attivo</span>
              </>
            )}
          </div>
        </div>

        {activeTab !== 'dashboard' && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">
               {activeTab === 'list' ? 'Le tue Spese' : 
                activeTab === 'ai' ? 'AI Insights' : 'Impostazioni'}
            </h1>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <Loader2 size={48} className="text-emerald-500 animate-spin" />
             <p className="text-gray-400 font-medium">Sincronizzazione cloud...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard 
                expenses={expenses} 
                budget={userSettings.monthlyBudget} 
                userName={userSettings.name}
                currency={userSettings.currency}
              />
            )}
            
            {activeTab === 'list' && (
              <div className="space-y-6">
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setPrefill(null); setShowForm(true); }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                  >
                    <Plus size={20} />
                    <span className="font-bold">Aggiungi</span>
                  </button>
                  <button 
                    onClick={() => setShowScanner(true)}
                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-gray-700 text-emerald-600 dark:text-emerald-400 px-4 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-emerald-50 dark:hover:bg-gray-700 shadow-sm"
                  >
                    <ScanLine size={20} />
                    <span className="font-bold">Scansiona</span>
                  </button>
                </div>
                <ExpenseList expenses={expenses} onDelete={deleteExpense} currency={userSettings.currency} />
              </div>
            )}

            {activeTab === 'ai' && <AiInsights expenses={expenses} />}

            {activeTab === 'settings' && (
              <SettingsView 
                settings={userSettings} 
                onUpdate={setUserSettings}
                onClearData={handleClearData}
                expenseCount={expenses.length}
                email={session.user.email}
              />
            )}
          </>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative my-auto animate-in zoom-in-95 duration-200 transition-colors">
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">✕</button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Dettagli Spesa</h2>
              <ExpenseForm 
                onSubmit={addExpense} 
                onCancel={() => setShowForm(false)} 
                initialData={prefill || undefined}
                currency={userSettings.currency}
              />
            </div>
          </div>
        )}

        {showScanner && (
          <ReceiptScanner 
            onDetected={handleReceiptDetected} 
            onClose={() => setShowScanner(false)} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
