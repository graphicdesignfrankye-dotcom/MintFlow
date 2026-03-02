
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
import { Plus, Loader2, ShieldAlert, Mail, X, LogOut, ShieldCheck } from 'lucide-react';
import { db, auth, supabase } from './services/supabase';
import { format, isSameMonth } from 'date-fns';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // STATO SICUREZZA (null = in controllo, true = bannato, false = attivo)
  const [isBanned, setIsBanned] = useState<boolean | null>(null);
  
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

  // Carica le impostazioni dal Cloud quando la sessione è pronta
  useEffect(() => {
    const loadCloudSettings = async () => {
      if (session?.user?.id) {
        try {
          console.log("Carico impostazioni dal cloud (profiles)...");
          const profile = await db.getProfile(session.user.id);
          if (profile?.settings) {
            console.log("Impostazioni cloud trovate:", profile.settings);
            setUserSettings(prev => ({ ...prev, ...profile.settings }));
          }
        } catch (err) {
          console.error("Errore caricamento settings dal profilo:", err);
        }
      }
    };
    loadCloudSettings();
  }, [session?.user?.id]);

  // Sincronizzazione Realtime delle Impostazioni
  useEffect(() => {
    if (!session?.user?.id) return;

    // Ascolta i cambiamenti delle impostazioni dagli altri dispositivi tramite la tabella profiles
    const settingsChannel = supabase.channel(`settings_sync_${session.user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${session.user.id}` 
      }, (payload) => {
        if (payload.new.settings) {
          console.log("Rilevato cambio impostazioni (realtime profiles)!", payload.new.settings);
          setUserSettings(prev => {
            // Evita aggiornamenti se i dati sono identici (prevenzione loop)
            const isSame = JSON.stringify(prev) === JSON.stringify(payload.new.settings);
            if (isSame) return prev;
            
            setSuccessToast("Impostazioni sincronizzate!");
            setTimeout(() => setSuccessToast(null), 2000);
            return { ...prev, ...payload.new.settings };
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(settingsChannel); };
  }, [session?.user?.id]);

  // Salva le impostazioni nel Cloud quando cambiano (con debounce)
  useEffect(() => {
    localStorage.setItem('mintflow_user_settings', JSON.stringify(userSettings));
    
    if (session?.user?.id) {
      const timeoutId = setTimeout(async () => {
        console.log("Salvataggio impostazioni in cloud (profiles)...");
        try {
          await db.updateProfileSettings(session.user.id, userSettings);
        } catch (err) {
          console.error("Errore salvataggio settings nel profilo:", err);
        }
      }, 3000); // 3 secondi di debounce per evitare troppe scritture

      return () => clearTimeout(timeoutId);
    }
  }, [userSettings, session]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'list' | 'ricariche' | 'ai' | 'settings' | 'subscriptions' | 'extra'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [prefill, setPrefill] = useState<Partial<Expense> | null>(null);

  // --- LOGICA DI SICUREZZA INFALLIBILE ---
  useEffect(() => {
    let channel: any;

    const checkStatus = async (userId: string) => {
      console.log("[Security] Controllo stato per utente:", userId);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error("[Security] Errore database:", error.message);
          setIsBanned(false);
          return false;
        }

        console.log("[Security] Stato ricevuto dal DB:", data.status);
        const banned = data.status === 'disabled';
        setIsBanned(banned);
        return banned;
      } catch (e) {
        console.error("[Security] Errore critico:", e);
        setIsBanned(false);
        return false;
      }
    };

    const initSecurity = async () => {
      // Timeout di sicurezza per evitare caricamento infinito
      const timeout = setTimeout(() => {
        if (isInitialLoading) {
          console.warn("[Security] Inizializzazione in timeout, forzo avvio...");
          setIsInitialLoading(false);
          setIsBanned(false);
        }
      }, 8000);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log("[Security] Sessione iniziale recuperata:", currentSession ? "Presente" : "Null");
      setSession(currentSession);
      
      if (currentSession?.user) {
        // ...
        const banned = await checkStatus(currentSession.user.id);
        
        if (!banned) {
          const metadata = currentSession.user.user_metadata;
          const displayName = metadata.full_name || metadata.display_name || metadata.name || currentSession.user.email?.split('@')[0] || 'Utente';
          setUserSettings(prev => ({ ...prev, name: displayName }));
          await db.upsertProfile(currentSession.user.id, currentSession.user.email || '', displayName);
        }

        if (channel) supabase.removeChannel(channel);
        channel = supabase
          .channel(`security-${currentSession.user.id}`)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${currentSession.user.id}` 
          }, (payload) => {
            console.log("[Security] Realtime change rilevato:", payload.new.status);
            setIsBanned(payload.new.status === 'disabled');
          })
          .subscribe();
      } else {
        setIsBanned(false);
      }
      clearTimeout(timeout);
      setIsInitialLoading(false);
    };

    initSecurity();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("[Auth] Evento AuthChange:", event, currentSession ? "Sessione presente" : "Sessione nulla");
      setSession(currentSession);
      if (currentSession?.user) {
        // Ad ogni cambio sessione, riverifica
        const banned = await checkStatus(currentSession.user.id);
        if (!banned && event === 'SIGNED_IN') {
           const metadata = currentSession.user.user_metadata;
           const displayName = metadata.full_name || metadata.display_name || metadata.name || currentSession.user.email?.split('@')[0] || 'Utente';
           await db.upsertProfile(currentSession.user.id, currentSession.user.email || '', displayName);
        }
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

  const fetchExpenses = useCallback(async (silent = false) => {
    if (!session?.user?.id || isBanned) return;
    try {
      if (!silent) setIsLoading(true);
      
      // 1. Prova a caricare dal server con timeout (aumentato a 60s)
      const fetchPromise = db.getExpenses(session.user.id);
      const timeoutPromise = new Promise<Expense[]>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout caricamento dati (60s)")), 60000)
      );
      
      let data = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Sincronizza spese locali non salvate (offline sync)
      const cachedDataStr = localStorage.getItem('mintflow_cache_v2');
      if (cachedDataStr) {
        try {
          const cachedData: Expense[] = JSON.parse(cachedDataStr);
          const localUnsynced = cachedData.filter(e => e._isLocal);
          
          if (localUnsynced.length > 0) {
            let syncCount = 0;
            for (const exp of localUnsynced) {
              try {
                const { id, _isLocal, ...expenseData } = exp;
                if (id.startsWith('temp-')) {
                  // Nuova spesa
                  await db.addExpense(expenseData, session.user.id);
                } else {
                  // Modifica spesa esistente
                  await db.updateExpense(id, expenseData);
                }
                syncCount++;
              } catch (e) {
                console.error("Errore sync spesa locale:", e);
              }
            }
            if (syncCount > 0) {
              // Ricarica dal server se abbiamo sincronizzato qualcosa
              data = await db.getExpenses(session.user.id);
              setSuccessToast(`Sincronizzate ${syncCount} spese offline!`);
              setTimeout(() => setSuccessToast(null), 3000);
            }
          }
        } catch (e) {
          console.error("Errore lettura cache per sync:", e);
        }
      }

      // 2. Salva nella cache locale aggiornata
      localStorage.setItem('mintflow_cache_v2', JSON.stringify(data));
      
      setAllExpenses(data);
      
      // Controlla se ci sono dati locali da migrare (vecchia versione)
      const localData = localStorage.getItem('mintflow_expenses');
      if (localData) {
        try {
          const expensesToMigrate: Expense[] = JSON.parse(localData);
          if (expensesToMigrate.length > 0) {
            setIsSyncing(true);
            setSuccessToast(`Recupero di ${expensesToMigrate.length} vecchie spese in corso...`);
            
            // Carica le spese una ad una
            for (const exp of expensesToMigrate.reverse()) {
              const { id, ...expenseData } = exp;
              await db.addExpense({ ...expenseData, profile: 'personal' }, session.user.id);
            }
            
            // Ricarica le spese aggiornate dal server
            const updatedData = await db.getExpenses(session.user.id);
            setAllExpenses(updatedData);
            localStorage.setItem('mintflow_cache_v2', JSON.stringify(updatedData));
            
            setSuccessToast("Dati recuperati e salvati in cloud con successo!");
            setTimeout(() => setSuccessToast(null), 4000);
          }
          // Rimuovi i dati locali per non migrarli di nuovo
          localStorage.removeItem('mintflow_expenses');
        } catch (migrationErr) {
          console.error("Errore durante la migrazione:", migrationErr);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (err: any) {
      console.error("Errore caricamento:", err);
      setSuccessToast("Errore caricamento dati!");
      setTimeout(() => setSuccessToast(null), 3000);
      
      // FALLBACK: Carica dalla cache locale se il server fallisce
      const cachedData = localStorage.getItem('mintflow_cache_v2');
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData);
          setAllExpenses(parsedCache);
          setSuccessToast("Modalità Offline: Dati dalla cache");
          if (!silent) alert("Impossibile connettersi al server. Mostro i dati salvati localmente.");
        } catch (e) {
          console.error("Cache corrotta");
        }
      } else {
        if (!silent) alert(`Impossibile caricare le spese: ${err.message || "Errore di connessione"}`);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [session, isBanned]);

  useEffect(() => { 
    if (session?.user?.id) {
      // Carica subito dalla cache per velocità, poi aggiorna dal server
      const cachedData = localStorage.getItem('mintflow_cache_v2');
      if (cachedData) {
        try {
          setAllExpenses(JSON.parse(cachedData));
        } catch (e) {}
      }

      fetchExpenses(); 
      
      // Sottoscrizione realtime per mantenere sincronizzati i dispositivi
      const expensesChannel = supabase
        .channel(`public:expenses:user_id=eq.${session.user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'expenses',
          filter: `user_id=eq.${session.user.id}`
        }, () => {
          console.log("Cambiamento rilevato nel database, aggiorno le spese...");
          fetchExpenses(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(expensesChannel);
      };
    }
  }, [session, fetchExpenses]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleForcedLogout = async () => {
    console.log("[Logout] Logout forzato avviato...");
    setIsLoggingOut(true);
    
    // 1. Pulizia immediata della memoria locale
    try {
      console.log("[Logout] Inizio pulizia storage...");
      localStorage.clear();
      sessionStorage.clear();
      console.log("[Logout] Storage locale pulito con successo.");
    } catch (e: any) {
      console.error("[Logout] Errore durante la pulizia dello storage:", e.message);
    }

    try {
      // 2. Tentativo di logout tecnico con timeout
      console.log("[Logout] Chiamata a supabase.auth.signOut()...");
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout signOut")), 3000)
      );
      
      const result = await Promise.race([signOutPromise, timeoutPromise]);
      console.log("[Logout] Risultato signOut:", result);
      console.log("[Logout] Logout tecnico completato.");
    } catch (err: any) {
      console.warn("[Logout] Logout tecnico fallito o in timeout, procedo comunque col reload:", err.message);
    }
    
    // 3. Reindirizzamento forzato alla home con cache busting
    const targetUrl = window.location.origin + "?logout=" + Date.now();
    console.log("[Logout] Reindirizzamento finale a:", targetUrl);
    
    // Piccola pausa per permettere ai log di essere inviati e all'utente di vedere l'overlay
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 500);
  };

  const handleUpdateWallets = async (newWallets: WalletConfig[]) => {
    const newSettings = { ...userSettings, wallets: newWallets };
    setUserSettings(newSettings);
    
    // Immediate sync to cloud
    if (session?.user?.id) {
      try {
        await db.updateProfileSettings(session.user.id, newSettings);
        setSuccessToast("Portafogli sincronizzati!");
        setTimeout(() => setSuccessToast(null), 2000);
      } catch (e) {
        console.error("Error syncing wallets:", e);
      }
    }
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!session?.user?.id) {
      setSuccessToast("Errore: Non sei connesso!");
      setTimeout(() => setSuccessToast(null), 3000);
      return;
    }

    // 1. UI Optimistic Update
    const tempId = 'temp-' + Date.now();
    const optimisticExpense: Expense = {
      id: prefill?.id || tempId,
      ...expenseData,
      profile: 'personal' as ProfileType,
      _isLocal: true // Segna come locale finché non confermato
    };

    // Aggiorna subito la UI e la CACHE
    setAllExpenses(prev => {
      const newState = prefill?.id 
        ? prev.map(e => e.id === optimisticExpense.id ? optimisticExpense : e) 
        : [optimisticExpense, ...prev];
      localStorage.setItem('mintflow_cache_v2', JSON.stringify(newState));
      return newState;
    });
    
    setShowForm(false);
    setPrefill(null);
    setSuccessToast("Salvataggio in corso...");

    // 2. Background Sync con Timeout
    try {
      const dataToSave = { ...expenseData, profile: 'personal' as ProfileType };
      
      const savePromise = prefill?.id 
        ? db.updateExpense(prefill.id, dataToSave)
        : db.addExpense(dataToSave, session.user.id);

      // Timeout di 60 secondi per evitare blocchi (aumentato per connessioni lente)
      const timeoutPromise = new Promise<Expense>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Il server non risponde in tempo (60s)")), 60000)
      );

      const saved = await Promise.race([savePromise, timeoutPromise]);
      
      // Sostituisci l'ID temporaneo con quello reale se era un nuovo inserimento
      setAllExpenses(prev => {
        const newState = prev.map(e => e.id === (prefill?.id || tempId) ? { ...saved, _isLocal: false } : e);
        localStorage.setItem('mintflow_cache_v2', JSON.stringify(newState));
        return newState;
      });
      
      setSuccessToast("Salvato!");
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (err: any) { 
      // Rollback in caso di errore
      console.error("Errore salvataggio:", err);
      setSuccessToast("Errore salvataggio!");
      setTimeout(() => setSuccessToast(null), 3000);
      
      // Mostra un messaggio più dettagliato
      const errorMsg = err.message || "Errore sconosciuto";
      alert(`Impossibile salvare la spesa sul server: ${errorMsg}. La spesa rimarrà salvata localmente.`);
      
      // NON RIMUOVERE LA SPESA, lasciala come locale (_isLocal=true)
      // Così l'utente non perde i dati.
      // In futuro potremmo aggiungere un meccanismo di retry.
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      setIsSyncing(true);
      await db.deleteExpense(id);
      setAllExpenses(prev => prev.filter(e => e.id !== id));
      setSuccessToast("Spesa eliminata!");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Errore durante l'eliminazione: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncSubscriptions = async () => {
    if (!session?.user?.id || allExpenses.length === 0) return;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // 1. Trova TUTTE le spese che sono segnate come abbonamento (indipendentemente dalla categoria)
    //    Questo è fondamentale per trovare la catena di abbonamenti attiva.
    const allSubs = allExpenses.filter(e => e.isSubscription);
    
    // 2. Trova gli abbonamenti che sono già presenti nel mese corrente
    const currentMonthSubs = allSubs.filter(e => {
      const [y, m] = e.date.split('-').map(Number);
      return `${y}-${String(m).padStart(2, '0')}` === currentMonthStr;
    });

    // 3. Trova gli abbonamenti dei mesi passati che NON hanno ancora un corrispettivo nel mese corrente
    const subsToDuplicate = allSubs.filter(oldSub => {
      const [y, m] = oldSub.date.split('-').map(Number);
      const expenseMonthStr = `${y}-${String(m).padStart(2, '0')}`;
      
      // Se è già del mese corrente, ignoralo
      if (expenseMonthStr === currentMonthStr) return false;
      
      // Controlla se esiste già un abbonamento con la stessa descrizione nel mese corrente
      const alreadyExistsInCurrentMonth = currentMonthSubs.some(
        newSub => newSub.description.toLowerCase().trim() === oldSub.description.toLowerCase().trim()
      );
      
      return !alreadyExistsInCurrentMonth;
    });

    // 4. Filtra per mantenere solo l'istanza più recente di ogni abbonamento da duplicare
    const uniqueSubsToDuplicate = Array.from(
      new Map(subsToDuplicate.map(sub => [sub.description.toLowerCase().trim(), sub])).values()
    );

    if (uniqueSubsToDuplicate.length === 0) {
      setSuccessToast("Tutti gli abbonamenti sono già aggiornati!");
      setTimeout(() => setSuccessToast(null), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const operations = uniqueSubsToDuplicate.map(async (sub: Expense) => {
        const [,, dStr] = sub.date.split('-');
        const d = parseInt(dStr, 10);
        const lastDayOfCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
        const safeDay = Math.min(d, lastDayOfCurrentMonth);
        const newDate = `${currentMonthStr}-${String(safeDay).padStart(2, '0')}`;
        
        const newExpenseData = {
          description: sub.description,
          amount: sub.amount,
          category: sub.category,
          paymentMethod: sub.paymentMethod,
          date: newDate,
          isSubscription: true, // Il nuovo è un abbonamento attivo
          profile: sub.profile,
          isExtra: sub.isExtra,
          extraType: sub.extraType
        };
        
        // Aggiungi la nuova spesa per il mese corrente
        const newExpense = await db.addExpense(newExpenseData, session.user.id);

        // Aggiorna la vecchia spesa: NON è più un abbonamento attivo, ma una semplice spesa storica
        await db.updateExpense(sub.id, { isSubscription: false });

        return { newExpense, oldId: sub.id };
      });

      const results = await Promise.all(operations);
      
      // Aggiorna lo stato locale: aggiungi i nuovi e aggiorna i vecchi
      setAllExpenses(prev => {
        let updated = [...prev];
        
        results.forEach(({ newExpense, oldId }) => {
          // Aggiungi nuovo
          updated = [newExpense, ...updated];
          
          // Aggiorna vecchio (isSubscription: false)
          const oldIndex = updated.findIndex(e => e.id === oldId);
          if (oldIndex !== -1) {
            updated[oldIndex] = { ...updated[oldIndex], isSubscription: false };
          }
        });
        
        return updated;
      });

      setSuccessToast(`${results.length} abbonamenti rinnovati per il mese corrente!`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      alert(`Errore durante l'aggiornamento: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm("Vuoi resettare tutte le impostazioni locali? I dati sul server rimarranno intatti.")) {
      localStorage.removeItem('mintflow_user_settings');
      window.location.reload();
    }
  };

  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-black mb-2">Disconnessione in corso...</h2>
        <p className="text-gray-500 dark:text-gray-400">Stiamo chiudendo la tua sessione in modo sicuro.</p>
      </div>
    );
  }

  if (isInitialLoading || isBanned === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-mint-50 dark:bg-gray-900 p-6">
        <Loader2 className="animate-spin text-emerald-500 mb-6" size={48} />
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse text-center">Inizializzazione MintFlow...</p>
        
        {/* Pulsante di emergenza se il caricamento dura troppo */}
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <button 
            onClick={() => window.location.reload()} 
            className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-widest hover:text-emerald-600 transition-colors"
          >
            Problemi di caricamento? Clicca qui per ricaricare
          </button>
        </div>
      </div>
    );
  }

  // BLOCCO TOTALE (Realtime)
  if (isBanned === true) {
    return (
      <div className="fixed inset-0 z-[999999] bg-white dark:bg-gray-950 flex items-center justify-center p-6 touch-none overflow-hidden">
        <div className="absolute inset-0 bg-mint-50/50 dark:bg-emerald-950/10 backdrop-blur-3xl" />
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-[3.5rem] p-12 text-center shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-emerald-100 dark:border-gray-700 relative z-10 animate-in zoom-in-95 duration-300">
          <div className="relative w-24 h-24 mx-auto mb-10">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
            <div className="relative w-full h-full bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-inner">
              <ShieldAlert className="text-red-500" size={48} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Accesso Sospeso</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed px-2">
            Il tuo account MintFlow è stato disabilitato. Contatta il supporto per riattivare l'accesso ai tuoi dati.
          </p>
          <div className="space-y-4">
            <a href="mailto:supporto@mintflow.com" className="flex items-center justify-center gap-2 w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95">
              <Mail size={20} /> Contatta Supporto
            </a>
            <button onClick={handleForcedLogout} className="flex items-center justify-center gap-2 w-full py-5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 rounded-[2rem] font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95">
              <LogOut size={20} /> Esci dall'account
            </button>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 opacity-50">
            <ShieldCheck size={14} className="text-emerald-500" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">MintFlow Security Shield</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return <Auth onSuccess={() => setIsBanned(false)} />;
  if (session.user.email === 'admin@mintflow.com') return <AdminDashboard onLogout={handleForcedLogout} />;

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      lang={userSettings.language}
      currentProfile={userSettings.currentProfile}
      onRefresh={() => fetchExpenses(false)}
    >
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 relative">
        {successToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4">{successToast}</div>}
        {activeTab === 'dashboard' && <Dashboard expenses={expenses} budget={currentBudget} userName={userSettings.name} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} lang={userSettings.language} userSettings={userSettings} onUpdateSettings={setUserSettings} />}
        {activeTab === 'list' && (
          <div className="space-y-6">
            <button onClick={() => { setPrefill(null); setShowForm(true); }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg transition-transform active:scale-95"><Plus size={20} /> Aggiungi Spesa</button>
            <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onEdit={ex => { setPrefill(ex); setShowForm(true); }} currency={userSettings.currency} wallets={userSettings.wallets} categories={userSettings.categories} />
          </div>
        )}
        {activeTab === 'ricariche' && <RicaricheView onRefill={w => { setPrefill({ description: `Ricarica ${w.name}`, category: 'Altro', paymentMethod: PaymentMethod.Bancomat, date: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }} onSaveExpense={handleSaveExpense} onUpdateWallets={handleUpdateWallets} expenses={expenses} currency={userSettings.currency} wallets={userSettings.wallets} />}
        {activeTab === 'ai' && <AiInsights expenses={expenses} />}
        {activeTab === 'settings' && <SettingsView settings={userSettings} onUpdate={setUserSettings} onClearData={handleClearData} expenses={expenses} email={session.user.email} userId={session.user.id} onLogout={handleForcedLogout} />}
        {activeTab === 'subscriptions' && <SubscriptionsView expenses={expenses} onAddSub={() => { setPrefill({ isSubscription: true }); setShowForm(true); }} onEdit={ex => { setPrefill(ex); setShowForm(true); }} onDelete={handleDeleteExpense} currency={userSettings.currency} onSyncAll={handleSyncSubscriptions} />}
        {activeTab === 'extra' && <ExtraView expenses={extraExpenses} onAdd={handleSaveExpense} onDelete={handleDeleteExpense} currency={userSettings.currency} />}
        
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
  );
};

export default App;
