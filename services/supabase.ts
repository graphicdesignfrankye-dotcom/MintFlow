
import { createClient } from '@supabase/supabase-js';
import { Expense, PaymentMethod, ProfileType } from '../types';

const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qdb7pW6R-6vvGaoeuGE5fw_xuPgZweE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const getRedirectUrl = () => window.location.origin;

// Delimitatore unico per impacchettare i dati nella descrizione
const PACK_SEP = ' |#| ';

/**
 * Utility per impacchettare i dati in una stringa compatibile col DB
 * Format: Desc |#| Method |#| IsSub |#| Profile |#| IsExtra |#| ExtraType
 */
const packDescription = (desc: string, pm: PaymentMethod, isSub: boolean, profile: ProfileType, isExtra: boolean, extraType: string) => {
  return `${desc}${PACK_SEP}${pm}${PACK_SEP}${isSub}${PACK_SEP}${profile}${PACK_SEP}${isExtra}${PACK_SEP}${extraType}`;
};

/**
 * Utility per spacchettare i dati dal DB alla UI
 */
const unpackDescription = (packedStr: string) => {
  if (!packedStr || !packedStr.includes(PACK_SEP)) {
    return { 
      desc: packedStr, 
      pm: PaymentMethod.Contanti, 
      isSub: false, 
      profile: 'personal' as ProfileType,
      isExtra: false,
      extraType: 'given' as 'given' | 'received'
    };
  }
  const parts = packedStr.split(PACK_SEP);
  return {
    desc: parts[0],
    pm: (parts[1] as PaymentMethod) || PaymentMethod.Contanti,
    isSub: parts[2] === 'true',
    profile: (parts[3] as ProfileType) || 'personal',
    isExtra: parts[4] === 'true',
    extraType: (parts[5] as 'given' | 'received') || 'given'
  };
};

export const auth = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: username }, emailRedirectTo: getRedirectUrl() }
    });
    if (error) throw error;
    
    // AUTOMAZIONE: Crea subito il profilo nel DB pubblico
    if (data.user) {
        try {
            await db.upsertProfile(data.user.id, email, username);
        } catch (e) {
            console.error("Errore creazione profilo iniziale (verrà riprovato al login):", e);
        }
    }
    return data;
  },
  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: getRedirectUrl() } });
    if (error) throw error;
  },
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async updateProfile(name: string) {
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: name } });
    if (error) throw error;
    
    // Sync anche sulla tabella profili
    if (data.user) {
        await db.upsertProfile(data.user.id, data.user.email || '', name);
    }
    return data;
  },
  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: getRedirectUrl() });
    if (error) throw error;
    return data;
  },
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },
  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Cancelliamo i dati applicativi
      await db.clearAll(user.id);
      
      // Tentiamo di cancellare il profilo dalla tabella pubblica
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
      } catch (e) {
        console.error("Errore cancellazione profilo", e);
      }
      
      await this.signOut();
    }
  }
};

export const db = {
  // PROFILES MANAGEMENT (Per Admin Dashboard)
  async upsertProfile(userId: string, email: string, name: string) {
    try {
        // Determina ruolo: admin se l'email corrisponde, altrimenti user
        const role = email === 'admin@mintflow.com' ? 'admin' : 'user';

        const { error } = await supabase.from('profiles').upsert({
            id: userId,
            email: email,
            display_name: name,
            last_login: new Date().toISOString(),
            status: 'active', // Default attivo
            role: role        // Ruolo calcolato
        }, { onConflict: 'id' });
        
        if (error) {
            console.warn("Sync Profilo: Impossibile aggiornare (RLS o tabella mancante):", error.message);
        }
    } catch (e) {
        console.warn("Errore upsertProfile:", e);
    }
  },

  async getAllProfiles() {
    // Questa chiamata richiede che l'utente attuale abbia permessi di lettura sulla tabella profiles
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('last_login', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Se non trova il profilo (es. primo login di utente vecchio), non bloccare l'app
    if (error) return null;
    return data;
  },

  async updateUserStatus(id: string, status: 'active' | 'disabled') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: status }) // Aggiorna la colonna 'status'
      .eq('id', id);              // Dove l'id corrisponde a quello dell'utente

    if (error) {
      console.error("Errore Supabase:", error.message);
      throw error;
    }
    return data;
  },

  async sendNotification(userId: string, message: string) {
      // Scrive nella colonna 'notification' del profilo utente
      const { error } = await supabase.from('profiles').update({ notification: message }).eq('id', userId);
      if (error) throw error;
  },

  async clearNotification(userId: string) {
      const { error } = await supabase.from('profiles').update({ notification: null }).eq('id', userId);
      if (error) throw error;
  },

  async deleteProfile(userId: string) {
      // Cancella prima le spese
      await this.clearAll(userId);
      // Poi il profilo pubblico
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
  },

  // EXPENSES MANAGEMENT
  async getExpenses(userId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((e: any) => {
      const unpacked = unpackDescription(e.description);
      return {
        id: e.id,
        amount: e.amount,
        category: e.category,
        date: e.date,
        description: unpacked.desc,
        paymentMethod: unpacked.pm,
        isSubscription: unpacked.isSub,
        profile: unpacked.profile,
        isExtra: unpacked.isExtra,
        extraType: unpacked.extraType
      };
    });
  },

  async addExpense(expense: Omit<Expense, 'id'>, userId: string): Promise<Expense> {
    console.log("Tentativo salvataggio su Supabase:", expense);

    // Impacchettiamo descrizione, metodo, abbonamento, profilo ed extra
    const packedDesc = packDescription(
      expense.description, 
      expense.paymentMethod, 
      !!expense.isSubscription,
      expense.profile || 'personal',
      !!expense.isExtra,
      expense.extraType || 'given'
    );

    const insertData: any = {
      description: packedDesc,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      user_id: userId
    };

    const { data, error } = await supabase.from('expenses').insert([insertData]).select().single();
    
    if (error) {
      console.error("Errore Supabase durante insert:", error);
      throw error;
    }
    
    return {
      id: data.id,
      description: expense.description,
      amount: data.amount,
      category: data.category,
      paymentMethod: expense.paymentMethod,
      date: data.date,
      isSubscription: expense.isSubscription,
      profile: expense.profile || 'personal',
      isExtra: expense.isExtra,
      extraType: expense.extraType
    };
  },

  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<Expense> {
    const { data: current } = await supabase.from('expenses').select('description').eq('id', id).single();
    const currentUnpacked = unpackDescription(current?.description || '');

    const newDesc = expense.description !== undefined ? expense.description : currentUnpacked.desc;
    const newPM = expense.paymentMethod !== undefined ? expense.paymentMethod : currentUnpacked.pm;
    const newIsSub = expense.isSubscription !== undefined ? expense.isSubscription : currentUnpacked.isSub;
    const newProfile = expense.profile !== undefined ? expense.profile : currentUnpacked.profile;
    const newIsExtra = expense.isExtra !== undefined ? expense.isExtra : currentUnpacked.isExtra;
    const newExtraType = expense.extraType !== undefined ? expense.extraType : currentUnpacked.extraType;

    const updateData: any = {
      description: packDescription(newDesc, newPM, newIsSub, newProfile, newIsExtra, newExtraType)
    };

    if (expense.amount !== undefined) updateData.amount = expense.amount;
    if (expense.category !== undefined) updateData.category = expense.category;
    if (expense.date !== undefined) updateData.date = expense.date;

    const { data, error } = await supabase.from('expenses').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    
    const unpacked = unpackDescription(data.description);

    return {
      id: data.id,
      amount: data.amount,
      category: data.category,
      date: data.date,
      description: unpacked.desc,
      paymentMethod: unpacked.pm,
      isSubscription: unpacked.isSub,
      profile: unpacked.profile,
      isExtra: unpacked.isExtra,
      extraType: unpacked.extraType
    };
  },

  async deleteExpense(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async clearAll(userId: string) {
    const { error } = await supabase.from('expenses').delete().eq('user_id', userId);
    if (error) throw error;
  }
};
