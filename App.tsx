
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseForm } from './components/ExpenseForm';
import { AiInsights } from './components/AiInsights';
import { ReceiptScanner } from './components/ReceiptScanner';
import { SettingsView } from './components/SettingsView';
import { RicaricheView } from './components/RicaricheView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { ExtraView } from './components/ExtraView';
import { Auth } from './components/Auth';
import { Expense, UserSettings, PaymentMethod, WalletConfig, CategoryConfig, ProfileType } from './types';
import { Plus, ScanLine, Cloud, Loader2, PiggyBank, PartyPopper, History, CheckCircle2, Trash2, AlertTriangle, Target, ArrowRight } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { format, isSameMonth } from 'date-fns';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); // Tutte le spese
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showBudgetPrompt, setShowBudgetPrompt] = useState(false);
  
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
      jointBudget: 1500, // Default per cointestato
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
      const merged = { 
        ...defaultSettings, 
        ...parsed,
        currentProfile: 'personal',
        jointBudget: parsed.jointBudget || defaultSettings.jointBudget
      };
      
      if (!merged.wallets.some(w => w.method === PaymentMethod.Contanti)) {
          merged.wallets = [defaultWallets[0], ...merged.wallets];
      }
      
      // LOGICA RESET MENSILE OFFSET
      const now = new Date();
      const lastOffsetDate = merged.lastOffsetDate ? new Date(merged.lastOffsetDate) : null;
      
      // Se non c'è una data o se la data è di un mese diverso da oggi, resetta l'offset a 0
      if (!lastOffsetDate || !isSameMonth(lastOffsetDate, now)) {
        merged.monthlyOffset = 0;
        merged.lastOffsetDate = now.toISOString();
      }

      return merged;
    } catch {
      return defaultSettings;
    }
  });

  // Gestione Dark Mode (DOM side)
  useEffect(() => {
    if (userSettings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userSettings.isDarkMode]);

  // Filtra spese in base al profilo attivo (ora solo personal) E RIMUOVE GLI EXTRA dalla Dashboard
  const expenses = useMemo(() => {
    return allExpenses.filter(e => (e.profile || 'personal') === 'personal' && !e.isExtra);
  }, [allExpenses]);

  // Filtra SOLO le spese EXTRA
  const extraExpenses = useMemo(() => {
    return allExpenses.filter(e => (e.profile || 'personal') === 'personal' && e.isExtra);
  }, [allExpenses]);

  // Budget attuale (solo personale)
  const currentBudget = userSettings.monthlyBudget;

  // Salva le impostazioni ogni volta che cambiano
  useEffect(() => {
    localStorage.setItem('mintflow_user_settings', JSON.stringify(userSettings));
  }, [userSettings]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'ricariche' | 'ai' | 'settings' | 'subscriptions' | 'extra'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Expense> | null>(null);

  // Controllo budget mensile o nuovo utente
  useEffect(() => {
    if (session && !isInitialLoading) {
      const today = new Date();
      const lastUpdateStr = userSettings.lastBudgetUpdate;
      // Replaced parseISO with new Date
      const lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : null;
      
      if (!lastUpdate || !isSameMonth(lastUpdate, today)) {
        setShowBudgetPrompt(true);
      }
    }
  }, [session, isInitialLoading, userSettings.lastBudgetUpdate]);

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

  useEffect(() => {
    if (session?.user?.id) {
      fetchExpenses();
    }
  }, [session, fetchExpenses]);

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      setIsSyncing(true);
      const dataToSave = {
        ...expenseData,
        profile: 'personal' as ProfileType
      };

      let savedExpense: Expense | null = null;
      
      if (prefill?.id) {
        savedExpense = await db.updateExpense(prefill.id, dataToSave);
        if (savedExpense) {
            setAllExpenses(prev => prev.map(e => e.id === savedExpense!.id ? savedExpense! : e));
        }
      } else {
        savedExpense = await db.addExpense(dataToSave, session.user.id);
        if (savedExpense) {
            setAllExpenses(prev => [savedExpense!, ...prev]);
        }
      }
      setShowForm(false);
      setPrefill(null);
      setSuccessToast("Operazione completata!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Errore Cloud: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSetMonthlyBudget = (amount: number) => {
    const now = new Date().toISOString();
    
    setUserSettings(prev => ({
        ...prev,
        monthlyBudget: amount,
        lastBudgetUpdate: now
    }));
    
    setShowBudgetPrompt(false);
    setSuccessToast("Budget impostato con successo!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeleteAdjustments = async () => {
    if (!session?.user?.id) return;
    if (!window.confirm("Sei sicuro? Questo eliminerà definitivamente tutte le spese che contengono 'Aggiustamento' nel nome.")) return;
    
    try {
      setIsSyncing(true);
      const adjustments = allExpenses.filter(e => e.description.toLowerCase().includes('aggiustamento'));
      
      for (const adj of adjustments) {
        await db.deleteExpense(adj.id);
      }
      
      setAllExpenses(prev => prev.filter(e => !e.description.toLowerCase().includes('aggiustamento')));
      setSuccessToast("Aggiustamenti eliminati!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportCSV = async (file: File): Promise<{ imported: number, skipped: number, errors: string[], debugInfo: string }> => {
    if (!session?.user?.id) throw new Error("Utente non autenticato.");

    setIsSyncing(true);
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 1) throw new Error("File vuoto");

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].toLowerCase().split(separator).map(h => h.trim());
      
      const dateIdx = headers.findIndex(h => h.includes('dat') || h.includes('giorno'));
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('causale') || h.includes('testo'));
      const amountIdx = headers.findIndex(h => h.includes('importo') || h.includes('euro') || h.includes('valore') || h.includes('amount'));
      const catIdx = headers.findIndex(h => h.includes('cat'));

      const startLine = (dateIdx === -1 && amountIdx === -1) ? 0 : 1;

      for (let i = startLine; i < lines.length; i++) {
        const parts = lines[i].split(separator).map(p => p.trim().replace(/^"|"$/g, ''));
        
        try {
          const rawDate = parts[dateIdx === -1 ? 0 : dateIdx];
          const rawDesc = parts[descIdx === -1 ? 1 : descIdx];
          const rawAmount = parts[amountIdx === -1 ? 2 : amountIdx];
          const category = catIdx > -1 ? parts[catIdx] : 'Altro';

          if (!rawDate || !rawAmount) continue;

          let date = "";
          const dateMatch = rawDate.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
          if (dateMatch) {
            let [_, d, m, y] = dateMatch;
            if (y.length === 2) y = "20" + y;
            date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          } else if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = rawDate;
          }

          const amount = parseFloat(rawAmount.replace(',', '.').replace(/[^0-9.-]/g, ''));

          if (!date || isNaN(amount)) {
            errors.push(`Riga ${i+1}: Dati non validi (Data: ${rawDate}, Importo: ${rawAmount})`);
            continue;
          }

          const isDuplicate = allExpenses.some(e => e.date === date && Math.abs(e.amount - amount) < 0.01 && e.description === rawDesc);
          if (isDuplicate) {
            skippedCount++;
            continue;
          }

          await db.addExpense({
            date,
            description: rawDesc || "Importato",
            amount,
            category: category,
            paymentMethod: PaymentMethod.Contanti,
            isSubscription: false,
            profile: 'personal'
          }, session.user.id);
          
          importedCount++;
        } catch (e: any) {
          errors.push(`Riga ${i+1}: ${e.message}`);
        }
      }

      if (importedCount > 0) await fetchExpenses();
      return { imported: importedCount, skipped: skippedCount, errors, debugInfo: `Sep: ${separator}` };
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Descrizione", "Importo", "Categoria", "Metodo"];
    const rows = expenses.map(e => [e.date, e.description, e.amount, e.category, e.paymentMethod]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spese_personali_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
  };

  const handleUpdateWallets = (newWallets: WalletConfig[]) => {
    setUserSettings(prev => ({ ...prev, wallets: newWallets }));
  };

  if (isInitialLoading) return <div className="min-h-screen flex items-center justify-center bg-mint-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  if (!session) return <Auth onSuccess={() => {}} />;

  return (
    <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        lang={userSettings.language}
        currentProfile={userSettings.currentProfile}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {successToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4">{successToast}</div>}
        
        {activeTab === 'dashboard' && (
          <Dashboard 
            expenses={expenses} 
            budget={currentBudget} 
            userName={userSettings.name} 
            currency={userSettings.currency} 
            wallets={userSettings.wallets} 
            categories={userSettings.categories} 
            lang={userSettings.language}
            userSettings={userSettings}
            onUpdateSettings={setUserSettings}
          />
        )}
        {activeTab === 'list' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <button onClick={() => { setPrefill(null); setShowForm(true); }} className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg"><Plus size={20} /> Aggiungi</button>
            </div>
            <ExpenseList expenses={expenses} onDelete={id => setExpenseToDelete(id)} onEdit={ex => { setPrefill(ex); setShowForm(true); }} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} />
          </div>
        )}
        {activeTab === 'ricariche' && (
          <RicaricheView 
            onRefill={w => { 
                const sourceMethod = w.method === PaymentMethod.Contanti ? PaymentMethod.Bancomat : PaymentMethod.Contanti;
                setPrefill({ description: `Ricarica ${w.name}`, category: 'Altro', paymentMethod: sourceMethod, date: format(new Date(), 'yyyy-MM-dd') }); 
                setShowForm(true); 
            }} 
            onSaveExpense={handleSaveExpense} 
            onUpdateWallets={handleUpdateWallets}
            expenses={expenses} 
            currency={userSettings.currency} 
            wallets={userSettings.wallets} 
          />
        )}
        {activeTab === 'ai' && <AiInsights expenses={expenses} />}
        {activeTab === 'settings' && <SettingsView settings={userSettings} onUpdate={setUserSettings} onClearData={() => {}} onDeleteAdjustments={handleDeleteAdjustments} onImport={handleImportCSV} onExport={handleExportCSV} expenses={expenses} email={session.user.email} />}
        {activeTab === 'subscriptions' && <SubscriptionsView expenses={expenses} onAddSub={() => { setPrefill({ isSubscription: true }); setShowForm(true); }} onDelete={id => setExpenseToDelete(id)} currency={userSettings.currency} />}
        {activeTab === 'extra' && <ExtraView expenses={extraExpenses} onAdd={handleSaveExpense} onDelete={id => setExpenseToDelete(id)} currency={userSettings.currency} />}

        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-md p-8 shadow-2xl relative">
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">✕</button>
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{prefill?.id ? 'Modifica' : 'Nuova Spesa'}</h2>
              <ExpenseForm onSubmit={handleSaveExpense} onCancel={() => setShowForm(false)} initialData={prefill || undefined} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} expenses={expenses} />
            </div>
          </div>
        )}

        {showBudgetPrompt && (
          <BudgetPromptModal 
            onConfirm={handleSetMonthlyBudget} 
            initialValue={currentBudget} 
            currency={userSettings.currency}
            isNewUser={!userSettings.lastBudgetUpdate}
          />
        )}

        {expenseToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-xs p-8 shadow-2xl text-center">
              <div className="bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold mb-2">Elimina?</h3>
              <div className="flex flex-col gap-3 mt-6">
                <button onClick={async () => { await db.deleteExpense(expenseToDelete); setAllExpenses(prev => prev.filter(e => e.id !== expenseToDelete)); setExpenseToDelete(null); }} className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold">Elimina</button>
                <button onClick={() => setExpenseToDelete(null)} className="w-full py-3 text-gray-400 font-bold">Annulla</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Componente Modale per il Prompt del Budget
const BudgetPromptModal: React.FC<{ 
  onConfirm: (amount: number) => void; 
  initialValue: number;
  currency: string;
  isNewUser: boolean;
}> = ({ onConfirm, initialValue, currency, isNewUser }) => {
  const [value, setValue] = useState(initialValue.toString());

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-[3rem] w-full max-w-md p-10 shadow-2xl border-4 border-emerald-500 animate-in zoom-in-95 duration-500">
        <div className="bg-emerald-100 dark:bg-emerald-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-inner">
          <Target size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-2">
          {isNewUser ? 'Benvenuto!' : 'Nuovo Mese!'}
        </h2>
        
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 font-medium">
          {isNewUser 
            ? `Imposta il budget personale di partenza.` 
            : 'Pianifica le tue finanze per questo mese.'}
        </p>

        <div className="mb-8">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2 text-center">Budget Target</label>
          <div className="relative">
             <input 
              autoFocus
              type="number" 
              value={value} 
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-emerald-50 dark:bg-gray-700 text-gray-900 dark:text-white text-4xl font-black py-6 rounded-3xl text-center outline-none border-2 border-transparent focus:border-emerald-500 transition-all shadow-inner"
            />
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 text-2xl font-bold pointer-events-none opacity-50">
              {currency}
            </span>
          </div>
        </div>

        <button 
          onClick={() => onConfirm(parseFloat(value) || 0)}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-200 dark:shadow-none text-lg active:scale-95"
        >
          Imposta Budget <ArrowRight size={20} />
        </button>
        
        {!isNewUser && (
          <button 
            onClick={() => onConfirm(initialValue)}
            className="w-full mt-4 py-2 text-gray-400 dark:text-gray-500 font-bold hover:text-gray-600 transition-colors text-sm"
          >
            Mantieni quello del mese scorso
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
