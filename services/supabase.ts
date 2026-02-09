
import { createClient } from '@supabase/supabase-js';
import { Expense } from '../types';

// Credenziali fornite dall'utente
const SUPABASE_URL = 'https://jpcweqcqysxgzycftzyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qdb7pW6R-6vvGaoeuGE5fw_xuPgZweE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper per ottenere l'URL di redirect corretto
const getRedirectUrl = () => window.location.origin;

export const auth = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: username },
        emailRedirectTo: getRedirectUrl(),
      }
    });
    if (error) throw error;
    return data;
  },

  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: { emailRedirectTo: getRedirectUrl() }
    });
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
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: name }
    });
    if (error) throw error;
    return data;
  },

  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail
    }, {
      emailRedirectTo: getRedirectUrl()
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });
    if (error) throw error;
    return data;
  },

  async deleteAccount() {
    // Nota: L'eliminazione completa dell'utente lato auth richiede permessi admin (Edge Function)
    // Per questa demo, puliamo i dati e disconnettiamo l'utente.
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
    return data || [];
  },

  async addExpense(expense: Omit<Expense, 'id'>, userId: string): Promise<Expense> {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateExpense(id: string, expense: Partial<Omit<Expense, 'id'>>): Promise<Expense> {
    // Escludiamo campi protetti o superflui
    const updateData: any = {};
    if (expense.description !== undefined) updateData.description = expense.description;
    if (expense.amount !== undefined) updateData.amount = expense.amount;
    if (expense.category !== undefined) updateData.category = expense.category;
    if (expense.paymentMethod !== undefined) updateData.paymentMethod = expense.paymentMethod;
    if (expense.date !== undefined) updateData.date = expense.date;

    const { data, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
