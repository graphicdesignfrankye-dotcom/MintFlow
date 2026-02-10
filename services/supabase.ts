
import { createClient } from '@supabase/supabase-js';
import { Expense, PaymentMethod } from '../types';

const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qdb7pW6R-6vvGaoeuGE5fw_xuPgZweE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const getRedirectUrl = () => window.location.origin;

// Delimitatore unico per impacchettare i dati nella descrizione
const PACK_SEP = ' |#| ';

/**
 * Utility per impacchettare i dati in una stringa compatibile col DB
 */
const packDescription = (desc: string, pm: PaymentMethod, isSub: boolean) => {
  return `${desc}${PACK_SEP}${pm}${PACK_SEP}${isSub}`;
};

/**
 * Utility per spacchettare i dati dal DB alla UI
 */
const unpackDescription = (packedStr: string) => {
  if (!packedStr || !packedStr.includes(PACK_SEP)) {
    return { desc: packedStr, pm: PaymentMethod.Contanti, isSub: false };
  }
  const parts = packedStr.split(PACK_SEP);
  return {
    desc: parts[0],
    pm: (parts[1] as PaymentMethod) || PaymentMethod.Contanti,
    isSub: parts[2] === 'true'
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
      await db.clearAll(user.id);
      await this.signOut();
    }
  }
};

export const db = {
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
        isSubscription: unpacked.isSub
      };
    });
  },

  async addExpense(expense: Omit<Expense, 'id'>, userId: string): Promise<Expense> {
    // Impacchettiamo descrizione, metodo e abbonamento in un'unica stringa
    const packedDesc = packDescription(
      expense.description, 
      expense.paymentMethod, 
      !!expense.isSubscription
    );

    const insertData: any = {
      description: packedDesc,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      user_id: userId
    };

    // Inviamo solo le colonne che sappiamo esistere con certezza
    const { data, error } = await supabase.from('expenses').insert([insertData]).select().single();
    if (error) throw error;
    
    return {
      id: data.id,
      description: expense.description,
      amount: data.amount,
      category: data.category,
      paymentMethod: expense.paymentMethod,
      date: data.date,
      isSubscription: expense.isSubscription
    };
  },

  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<Expense> {
    // Per l'aggiornamento dobbiamo prima recuperare lo stato attuale se mancano pezzi
    const { data: current } = await supabase.from('expenses').select('description').eq('id', id).single();
    const currentUnpacked = unpackDescription(current?.description || '');

    const newDesc = expense.description !== undefined ? expense.description : currentUnpacked.desc;
    const newPM = expense.paymentMethod !== undefined ? expense.paymentMethod : currentUnpacked.pm;
    const newIsSub = expense.isSubscription !== undefined ? expense.isSubscription : currentUnpacked.isSub;

    const updateData: any = {
      description: packDescription(newDesc, newPM, newIsSub)
    };

    if (expense.amount !== undefined) updateData.amount = expense.amount;
    if (expense.category !== undefined) updateData.category = expense.category;
    if (expense.date !== undefined) updateData.date = expense.date;

    const { data, error } = await supabase.from('expenses').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    
    return {
      id: data.id,
      amount: data.amount,
      category: data.category,
      date: data.date,
      description: newDesc,
      paymentMethod: newPM,
      isSubscription: newIsSub
    };
  },

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  async clearAll(userId: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('user_id', userId);
    if (error) throw error;
  }
};
